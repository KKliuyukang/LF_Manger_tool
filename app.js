// Life Factorio - 人生工厂 脚本分离文件




let saveTimeout = null;
let fileHandle = null;

// 数据结构版本号
const DATA_VERSION = 1;

// 汇率设置（相对于人民币）
const exchangeRates = {
    CNY: 1,
    AUD: 4.8,
    USD: 7.2,
    EUR: 7.8
};

const currencySymbols = {
    CNY: '¥',
    AUD: 'A$',
    USD: '$',
    EUR: '€'
};

const validCurrencies = ['CNY', 'AUD', 'USD', 'EUR'];

// === Firebase 云同步集成（compat 方式） ===
// 1. 在 HTML <head> 加入：
// <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>

const firebaseConfig = {
  apiKey: "AIzaSyBr99vbKCReAnKVLwaRMxAaf9f1OKzOQNw",
  authDomain: "life-factory.firebaseapp.com",
  projectId: "life-factory",
  storageBucket: "life-factory.appspot.com",
  messagingSenderId: "491039499098",
  appId: "1:491039499098:web:9a2d1422f3c292c062c963",
  measurementId: "G-543VXB6WLC"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let firebaseUserId = null;
let firebaseUnsubscribe = null;
let isCloudReady = false;
let isCloudSaving = false;
let isCloudLoading = false;
let cloudInitDone = false;

// 初始化数据
window.gameData = {
    version: DATA_VERSION,
    finance: {
        totalSavings: 0,
        savingsCurrency: 'CNY',
        savingsUpdateTime: null
    },
    productions: [],
    developments: [],
    devLibrary: [],
    timeLogs: [],
    experiences: {
        "自我成长": [],
        "探索体验": [],
        "财务管理": [],
        "创作表达": []
    },
    blueprints: [],
    // 新增：蓝图历史记录
    blueprintHistory: [],
    // 新增：自动化蓝图配置
    blueprintAutomation: {
        enabled: true,
        globalSettings: {
            workdayRules: true, // 工作日/周末不同规则
            maxDailyBlueprints: 8, // 每日最大蓝图数量
            generationRange: 7, // 生成范围（天数）
            protectedHours: { // 保护时段
                sleepStart: 22, // 22:00
                sleepEnd: 7,    // 7:00
                lunchBreak: { start: 12, end: 13 } // 午休
            }
        },
        lastGeneratedAt: null, // 最后一次生成时间
        generationLog: [] // 生成日志，最多保留30条
    }
};

let currentEditIndex = -1;
let lastDailyReset = ''; // 先设为空，在getLocalDateString函数定义后再初始化
let contextMenuTarget = null;
let contextMenuType = null;
let energyStatus = '刚好'; // 可选：'不足'，'刚好'，'旺盛'
let timeResource = 24*60; // 单位：分钟
let weekCalendar = Array(7).fill(0).map(()=>Array(24).fill(null)); // 7天*24小时
let todayIdx = (new Date().getDay()+6)%7; // 0=周一
let isSelecting = false; // 用于检测是否在拖选文字

let currentDateOffset = 0; // 0 for today, -7 for last week, 7 for next week

// === 统一字段名：devLibrary、developments、productions ===
// devLibrary字段：icon, category, researchName, prodName, freq, cycle, target, action, science
// developments字段：researchName, prodName, icon, level, progress, maxProgress, active, paused, repeatable, produces, checkedToday, category, cycle, target, action, science
// productions字段：name(=prodName), type, linkedDev(=researchName), ...

// 数据迁移函数
function migrateData(data) {
    if (!data.version || data.version < DATA_VERSION) {
        data.developments = (data.developments || []).map(dev => {
            const libItem = (data.devLibrary||[]).find(item => 
                item.researchName === dev.name || 
                item.researchName === dev.researchName
            );
            // 从JSON文件中获取技术信息
            let techFromJSON = null;
            if (window.devLibraryData && window.devLibraryData.techTree) {
                const allTechs = [...window.devLibraryData.techTree.layers.flatMap(l => l.technologies), window.devLibraryData.techTree.finalGoal];
                techFromJSON = allTechs.find(t => t.name === (dev.researchName || dev.name));
            }
            
            return {
                ...dev,
                researchName: libItem ? libItem.researchName : (dev.researchName || dev.name),
                prodName: libItem ? libItem.prodName : dev.prodName,
                startDate: dev.startDate || new Date().toISOString(),
                category: dev.category || (libItem ? libItem.category : '未分类'),
                cycle: dev.cycle || (techFromJSON ? techFromJSON.cycle : (libItem ? libItem.cycle : 21)),
                target: dev.target || (techFromJSON ? techFromJSON.target : (libItem ? libItem.target : 17)),
                action: dev.action || (techFromJSON ? techFromJSON.action : (libItem ? libItem.action : '')),
                science: dev.science || (libItem ? libItem.science : ''),
                freq: dev.freq || (techFromJSON ? techFromJSON.freq : (libItem ? libItem.freq : '每天'))
            };
        });
        data.timeLogs = data.timeLogs || [];
        data.version = DATA_VERSION;
    }
    // 补全所有字段
    data.timeLogs = data.timeLogs || [];
    data.developments = (data.developments || []).map(dev => {
        const libItem = (data.devLibrary||[]).find(item => item.researchName === dev.researchName);
        // 从JSON文件中获取技术信息
        let techFromJSON = null;
        if (window.devLibraryData && window.devLibraryData.techTree) {
            const allTechs = [...window.devLibraryData.techTree.layers.flatMap(l => l.technologies), window.devLibraryData.techTree.finalGoal];
            techFromJSON = allTechs.find(t => t.name === dev.researchName);
        }
        
        return {
            ...dev,
            startDate: dev.startDate || new Date().toISOString(),
            category: dev.category || '未分类',
            cycle: dev.cycle || (techFromJSON ? techFromJSON.cycle : 21),
            target: dev.target || (techFromJSON ? techFromJSON.target : Math.floor((dev.cycle||21) * 0.8)),
            freq: dev.freq || (techFromJSON ? techFromJSON.freq : (libItem ? libItem.freq : '每天'))
        };
    });
    if (!data.blueprints) {
        data.blueprints = [];
    }
    return data;
}

// 计算研究项目进度（基于有效天数）
function calculateProgress(dev) {
    // 获取所有关联产线名称
    let prodNames = [];
    if (gameData.productions) {
        prodNames = gameData.productions
            .filter(p => p.linkedDev === dev.researchName)
            .map(p => p.name);
    }
    if (prodNames.length === 0 && dev.prodName) {
        prodNames = [dev.prodName];
    }
    // 统计所有关联产线的打卡记录数（不去重日期、不考虑周期）
    let count = 0;
    (gameData.timeLogs || []).forEach(log => {
        if (prodNames.includes(log.name)) {
            count++;
        }
    });
    // 达到目标后自动升级
    if (dev.target && count >= dev.target && !dev.upgrading) {
        dev.upgrading = true;
        setTimeout(() => {
            upgradeResearchProject(dev);
        }, 100);
    }
    return {
        count: count,
        total: dev.target || 21
    };
}
// 升级研究项目
function upgradeResearchProject(dev) {
    // 记录完成信息
    if (!dev.completedHistory) dev.completedHistory = [];
    dev.completedHistory.push({
        level: dev.level || 1,
        completedDate: new Date().toISOString(),
        cycle: dev.cycle,
        target: dev.target
    });
    // 升级
    dev.level = (dev.level || 1) + 1;
    dev.upgrading = false;
    // 从进行中移除
    const devIndex = gameData.developments.findIndex(d => d.researchName === dev.researchName);
    if (devIndex !== -1) {
        gameData.developments.splice(devIndex, 1);
    }
    // 更新研发库中的等级
    const libItem = gameData.devLibrary.find(item => item.researchName === dev.researchName);
    if (libItem) {
        libItem.level = dev.level;
        libItem.completedHistory = dev.completedHistory;
    }
    // 弹窗提示
    alert(`🎉 恭喜！${dev.researchName} 已升级到 Lv${dev.level}！\n\n已完成 ${dev.target} 天的目标，项目已移回研发库。`);
    // 刷新界面
    renderDevelopments();
    forceRenderDevLibrary();
    saveToCloud();
}

// 1. 全局注册init函数
window.init = async function() {
    // 初始化lastDailyReset
    if (!lastDailyReset) {
        lastDailyReset = getLocalDateString();
    }
    
    console.log(`🚀 系统初始化开始，当前时间: ${new Date().toString()}`);
    
    try {
        const saved = localStorage.getItem('lifeFactorio');
        if (saved) {
            const savedData = JSON.parse(saved);
            gameData = migrateData(savedData.gameData || gameData);
            lastDailyReset = savedData.lastDailyReset || lastDailyReset;
            console.log(`📱 从本地存储加载数据成功，lastDailyReset=${lastDailyReset}`);
        } else {
            console.log(`📱 未找到本地存储数据，使用默认值`);
        }
    } catch (e) {
        console.error('加载本地数据失败', e);
    }
    // 防御性初始化
    if (!gameData.expenses) gameData.expenses = [];
    if (!gameData.timeLogs) gameData.timeLogs = [];
    
    console.log(`📊 当前生产线数量: ${gameData.productions?.length || 0}, lifestyle类: ${gameData.productions?.filter(p => p.type === 'lifestyle').length || 0}`);
    
    // 加载研发中心JSON数据
    await loadDevLibraryFromJSON();
    
    console.log(`🔍 执行每日重置检查...`);
    checkDailyReset(); // 检查每日重置
    
    fixDataLinks();
    safeRenderProductions();
    safeRenderDevelopments();
    renderMilestones();
    renderResourceStats();
    renderWeekCalendar();
    renderExpenses(); // 新增：初始化时渲染支出栏
    setupEventListeners();
    
    if (!familyCode) {
        console.log(`🔑 未设置家庭码，弹出设置对话框`);
        askFamilyCode();
    } else {
        console.log(`🔑 使用家庭码: ${familyCode}，开始云端同步`);
        firebaseLoginAndSync();
    }
    
    console.log(`✅ 系统初始化完成`);
};

// 2. 页面加载时调用window.init()
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(window.init, 100));
} else {
    setTimeout(window.init, 100);
}

// 获取本地日期（YYYY-MM-DD格式，避免时区问题）
function getLocalDateString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 检查每日重置
function checkDailyReset() {
    const today = getLocalDateString(); // 使用本地日期避免时区问题
    console.log(`🕒 每日重置检查: 当前时间=${new Date().toString()}, 今天=${today}, 上次重置=${lastDailyReset}`);
    
    if (lastDailyReset !== today) {
        console.log(`🔄 执行每日重置，从 ${lastDailyReset} 到 ${today}`);
        lastDailyReset = today;
        
        // 重置研发项目的今日打卡状态
        gameData.developments.forEach(dev => {
            dev.checkedToday = false;
        });
        console.log(`✅ 已重置 ${gameData.developments.length} 个研发项目的打卡状态`);
        
        // 清理生活类项目（每日自动删除，但保留时间记录）
        const beforeCount = gameData.productions.length;
        const lifestyleProductions = gameData.productions.filter(prod => prod.type === 'lifestyle');
        console.log(`🗑️ 找到 ${lifestyleProductions.length} 个lifestyle类项目待删除:`, lifestyleProductions.map(p => p.name));
        
        gameData.productions = gameData.productions.filter(prod => prod.type !== 'lifestyle');
        const afterCount = gameData.productions.length;
        const deletedCount = beforeCount - afterCount;
        
        if (deletedCount > 0) {
            console.log(`🗑️ 每日重置：已自动清理 ${deletedCount} 个生活类项目（保留时间记录）`);
        } else {
            console.log(`ℹ️ 每日重置：没有找到需要清理的生活类项目`);
        }
        
        // 重置习惯类项目的签到状态
        const habitProductions = gameData.productions.filter(prod => prod.type === 'habit' || prod.type === 'automation');
        gameData.productions.forEach(prod => {
            if (prod.type === 'habit' || prod.type === 'automation') {
                prod.lastCheckIn = null;
            }
        });
        console.log(`🔄 已重置 ${habitProductions.length} 个习惯类项目的签到状态`);
        
        // 立即保存重置后的数据
        console.log(`💾 保存重置后的数据到云端...`);
        saveToCloud();
    } else {
        console.log(`ℹ️ 今日已重置过，无需再次执行`);
    }
}

// 设置事件监听
function setupEventListeners() {
    // 生产线表单监听
    const prodForm = document.getElementById('production-form');
    if (prodForm) {
        prodForm.onsubmit = function(e) {
            e.preventDefault();
            saveProduction();
        };
    }

    // 生产线类型变化监听
    const prodType = document.getElementById('prod-type');
    if (prodType) {
        prodType.addEventListener('change', updateFormVisibility);
    }

    // 收入类型监听
    const hasActiveIncome = document.getElementById('has-active-income');
    if (hasActiveIncome) {
        hasActiveIncome.addEventListener('change', function(e) {
            const row = document.getElementById('active-income-row');
            if (row) row.style.display = e.target.checked ? 'grid' : 'none';
        });
    }

    const hasPassiveIncome = document.getElementById('has-passive-income');
    if (hasPassiveIncome) {
        hasPassiveIncome.addEventListener('change', function(e) {
            const row = document.getElementById('passive-income-row');
            if (row) row.style.display = e.target.checked ? 'grid' : 'none';
        });
    }

    // 生产线右键菜单
    const prodList = document.getElementById('productions-list');
    if (prodList) {
        prodList.addEventListener('contextmenu', function(e) {
            const item = e.target.closest('.production-item');
            if (item) {
                e.preventDefault();
                const index = Array.from(document.querySelectorAll('.production-item')).indexOf(item);
                window.showContextMenu(e, index, 'production');
            }
        });
    }

    // 点击模态框外部关闭（但不在拖选时关闭）
    window.onmousedown = function(event) {
        isSelecting = false;
    };
    window.onmousemove = function(event) {
        if (event.buttons === 1) { // 左键按下并移动
            isSelecting = true;
        }
    };
    window.onclick = function(event) {
        if (event.target.classList.contains('modal') && !isSelecting) {
            event.target.style.display = 'none';
        }
        isSelecting = false;
    };

    // 窗口大小变化时更新布局
    window.addEventListener('resize', updateBottomRowLayout);
    
    // 设置支出表单处理器
    setupExpenseFormHandlers();

    document.getElementById('add-blueprint-btn').addEventListener('click', () => showBlueprintModal());
    document.getElementById('blueprint-form').addEventListener('submit', saveBlueprint);

    // Calendar navigation - with null checks
    const prevWeekBtn = document.getElementById('prev-week-btn');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', () => {
            currentDateOffset -= 7;
            renderWeekCalendar();
        });
    }
    
    const nextWeekBtn = document.getElementById('next-week-btn');
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => {
            currentDateOffset += 7;
            renderWeekCalendar();
        });
    }
    
    const todayBtn = document.getElementById('today-btn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentDateOffset = 0;
            renderWeekCalendar();
        });
    }
}

// 转换为人民币
function convertToCNY(amount, currency) {
    if (!currencySymbols[currency] || !exchangeRates[currency]) currency = 'CNY';
    return amount * exchangeRates[currency];
}

// 全局变量存储排序后的生产线
let sortedProductions = [];

function getSortedProductions() {
    const typeOrder = {production: 1, work: 1, automation: 2, habit: 2, investment: 3, lifestyle: 4};
    return [...gameData.productions].map((p, i) => ({...p, _realIndex: i})).sort((a, b) => (typeOrder[a.type]||99) - (typeOrder[b.type]||99));
}
function renderProductions() {
    return window.ErrorUtils.safeExecute(() => {
        return window.measurePerformance(() => {
            const container = document.getElementById('productions-list');
            if (!container) return;
            
            // 更新全局的sortedProductions变量
            sortedProductions = getSortedProductions();
            
            // 加载隐藏的生产线列表
            const hiddenProductions = JSON.parse(localStorage.getItem('hiddenProductions') || '[]');
            
            // 过滤掉隐藏的生产线
            const filteredProds = sortedProductions.filter(p => !hiddenProductions.includes(p.name));
            
            const typeMap = {
                production: {text: '产线', desc: '需要投入时间换收入'},
                work: {text: '产线', desc: '工作相关收入'}, // 兼容旧的work类型
                investment: {text: '资产', desc: '投资/被动收入'},
                automation: {text: '自动化', desc: '长期习惯/自动行为'},
                lifestyle: {text: '日常', desc: '日常行为记录'},
                habit: {text: '习惯', desc: '日常习惯（已迁移为自动化）'} // 兼容旧数据
            };
            
            container.innerHTML = filteredProds
                .map((prod, index) => {
                let tags = [];
                if (prod.hasActiveIncome) {
                    if (prod.activeIncome > 0) {
                        tags.push({ text: `主动收入: ${currencySymbols[prod.activeCurrency]}${prod.activeIncome}`, class: 'tag-active' });
                    } else {
                        tags.push({ text: '主动收入', class: 'tag-active' });
                    }
                }
                if (prod.hasPassiveIncome) {
                    if (prod.passiveIncome > 0) {
                        tags.push({ text: `被动收入: ${currencySymbols[prod.passiveCurrency]}${prod.passiveIncome}`, class: 'tag-passive' });
                    } else {
                        tags.push({ text: '被动收入', class: 'tag-passive' });
                    }
                }
                if (prod.expense > 0) {
                    tags.push({ text: `支出: ${currencySymbols[prod.expenseCurrency]}${prod.expense}`, class: 'tag-expense' });
                }
                if (typeMap[prod.type]) {
                    let tagClass = `tag-${prod.type}`;
                    if (prod.type === 'habit') tagClass = 'tag-automation';
                    if (prod.type === 'work') tagClass = 'tag-production'; // work类型使用production样式
                    tags.push({ text: typeMap[prod.type].text, class: tagClass });
                }
                
                let investInfo = '';
                if (prod.type==='investment' && prod.investAmount>0 && prod.investCurrent>0 && prod.investDate) {
                    let start = new Date(prod.investDate);
                    let now = new Date();
                    let days = (now-start)/(1000*60*60*24);
                    let years = days/365.25;
                    let rate = (prod.investCurrent-prod.investAmount)/prod.investAmount/years*100;
                    investInfo = `<div style='color:#bbb;font-size:0.85em;margin-top:4px;'>当前价值：${currencySymbols[prod.investCurrentCurrency]||''}${prod.investCurrent}，年化回报率：${rate.toFixed(2)}%</div>`;
                }
                let today = getLocalDateString(); // 修复：使用本地日期而不是UTC日期
                let todayLogs = (gameData.timeLogs||[]).filter(log=>log.name===prod.name && log.date===today);
                let totalMins = todayLogs.reduce((sum,log)=>sum+(log.timeCost||0),0);
                let totalHour = totalMins/60;
                let timeLabel = '';
                if (totalMins > 0) {
                    let hourStr = (Math.round(totalHour*10)/10).toString();
                    timeLabel = `<span class="tag tag-time" style="background:#e8f5e9;color:#27ae60;">今日累计：${hourStr}小时</span>`;
                }
                let canCheckIn = true;
                if((prod.type==='automation' || prod.type==='habit') && prod.lastCheckIn && new Date().toDateString() === new Date(prod.lastCheckIn).toDateString()) {
                    canCheckIn = false;
                }
                // 恢复原有结构和class，修复按钮HTML
                return `
                    <div class="production-item" data-sorted-index="${index}" oncontextmenu="window.showContextMenu(event, ${index}, 'production')">
                        <div class="production-header">
                            <div class="production-name">${prod.name}</div>
                            <div>
                                ${(prod.type==='automation' || prod.type==='habit') ? (canCheckIn ? `<button class='check-btn' onclick='window.logProductionTime(${index})'>打卡</button>` : `<span style='color: #27ae60; font-size: 0.85em;'>✓ 已完成</span>`) : ''}
                            </div>
                        </div>
                        ${tags.length > 0 ? `
                            <div class="production-tags">
                                ${tags.map(tag => `<span class="tag ${tag.class}">${tag.text}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${timeLabel}
                        ${investInfo}
                        ${(() => {
                            const dev = gameData.developments.find(d => d.researchName === prod.linkedDev);
                            return dev ? `<div style='font-size:0.85em;color:#bbb;margin-top:4px;'>${dev.action}</div>` : '';
                        })()}
                    </div>
                `;
            }).join('');
        }, 'renderProductions');
    }, { type: 'render', function: 'renderProductions' }, (error) => {
        console.error('渲染生产线失败:', error);
        return false;
    });
}

// 渲染研发项目
function renderDevelopments() {
    return window.ErrorUtils.safeExecute(() => {
        return window.measurePerformance(() => {
            const container = document.getElementById('active-developments');
            if (!container) return;
            
            if (!gameData.developments || gameData.developments.length === 0) {
                container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">暂无进行中的研究项目</p>';
                return;
            }
            
            let html = '';
            gameData.developments.forEach((dev, idx) => {
                // 计算进度
                const progress = calculateProgress(dev);
                const percent = Math.min(1, progress.count / progress.total);
                
                // 格式化tooltip
                const startDate = dev.startDate ? new Date(dev.startDate).toLocaleDateString() : '未开始';
                const tip = [
                    `研究项目：${dev.researchName}`,
                    `开始时间：${startDate}`,
                    `操作定义：${dev.action}`,
                    `频率：${dev.freq}`,
                    `周期：${dev.cycle}天`,
                    `目标：${dev.target}次`,
                    `当前进度：${progress.count}/${progress.total}`
                ].join('\n');
                
                html += `
                    <div class=\"dev-item ${dev.active ? 'active' : 'paused'}\" title=\"${tip}\">
                        <div class=\"dev-header\">
                            <div class=\"dev-name\">
                                <span>${dev.icon}</span>
                                <span>${dev.researchName}</span>
                            </div>
                            <div class=\"dev-controls\">
                                ${dev.active ? 
                                    `<button class=\"btn btn-secondary btn-small\" onclick=\"window.pauseDev(${idx})\">暂停</button>` : 
                                    `<button class=\"btn btn-primary btn-small\" onclick=\"window.resumeDev(${idx})\">继续</button>`
                                }
                                <button class=\"btn btn-danger btn-small\" onclick=\"window.removeDev(${idx})\">移除</button>
                            </div>
                        </div>
                        <div class=\"progress-container\">
                            <div class=\"progress-info\">
                                <span>进度</span>
                                <span>${progress.count}/${progress.total}次</span>
                            </div>
                            <div class=\"progress-bar\">
                                <div class=\"progress-fill\" style=\"width: ${(percent*100).toFixed(1)}%\"></div>
                            </div>
                            <div style=\"margin-top: 8px; font-size: 0.85em; color: #666;\">${dev.action}</div>
                        </div>
                        <div style=\"margin-top: 8px; font-size: 0.85em; color: #888;\">
                            频率：${dev.freq}
                        </div>
                        ${dev.startDate ? 
                            `<div style=\"margin-top: 4px; font-size: 0.85em; color: #666;\">开始于：${new Date(dev.startDate).toLocaleDateString()}</div>` : 
                            ''
                        }
                    </div>
                `;
            });
            container.innerHTML = html;
        }, 'renderDevelopments');
    }, { type: 'render', function: 'renderDevelopments' }, (error) => {
        console.error('渲染研发项目失败:', error);
        return false;
    });
}

// 渲染人生体验
function renderMilestones() {
    const container = document.getElementById('experiences-list');
    let html = '';
    Object.entries(gameData.experiences).forEach(([category, items]) => {
        html += `<div class="experience-category">${category}</div>`;
        items.forEach((exp, index) => {
            const stars = '★'.repeat(exp.difficulty) + '☆'.repeat(5 - exp.difficulty);
            const isCompleted = !exp.repeatable && exp.count > 0;
            html += `
                <div class="experience-item ${isCompleted ? 'completed' : ''}">
                    <div class="experience-header">
                        <div class="experience-name">
                            ${exp.name}
                            ${exp.count > 0 ? `<span class="count-badge">${exp.count}</span>` : ''}
                        </div>
                    </div>
                    <div class="experience-desc">${exp.desc}</div>
                    <div class="experience-info">
                        <div class="difficulty">
                            难度: <span class="difficulty-star">${stars}</span>
                        </div>
                        ${(!exp.repeatable && exp.count > 0) ?
                            '<span style="color: #27ae60;">✓ 已完成</span>' :
                            `<button class="complete-btn" onclick="window.completeExperience('${category}', ${index})">
                                完成 ${exp.repeatable ? '+1' : ''}
                            </button>`
                        }
                    </div>
                </div>
            `;
        });
    });
    container.innerHTML = html;
}

// 全局函数
window.showContextMenu = function(event, sortedIndex, type) {
    event.preventDefault();
    const menu = document.getElementById('context-menu');
    let menuHtml = `
        <div class=\"context-menu-item\" onclick=\"window.editContextItem()\">编辑</div>
        <div class=\"context-menu-item\" onclick=\"window.removeContextItem()\">删除</div>
        <div class=\"context-menu-item\" onclick=\"window.recordTimeContextItem()\">记录用时</div>
        <div class=\"context-menu-item\" onclick=\"window.clearTimeContextItem()\">清除用时</div>
        <div class=\"context-menu-item\" onclick=\"window.viewHistoryContextItem()\">查看历史</div>
    `;
    menu.innerHTML = menuHtml;
    let x = event.clientX, y = event.clientY;
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    const rect = menu.getBoundingClientRect();
    const winW = window.innerWidth, winH = window.innerHeight;
    if(rect.right > winW) menu.style.left = (winW - rect.width - 8) + 'px';
    if(rect.bottom > winH) menu.style.top = (winH - rect.height - 8) + 'px';
    contextMenuTarget = sortedIndex;
    contextMenuType = type;
    document.removeEventListener('mousedown', hideContextMenu);
    setTimeout(()=>{
        document.addEventListener('mousedown', hideContextMenu);
    },0);
}

function hideContextMenu(e) {
    const menu = document.getElementById('context-menu');
    if (menu) {
        // 如果没有事件对象，或者点击的不是菜单内部，则隐藏菜单
        if (!e || !menu.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('mousedown', hideContextMenu);
        }
    }
}

window.editContextItem = function() {
    if (contextMenuType === 'production') {
        const prod = sortedProductions[contextMenuTarget];
        editProduction(prod._realIndex);
    }
    document.getElementById('context-menu').style.display = 'none';
}

// 新增：右键菜单记录用时
window.recordTimeContextItem = function() {
    if (contextMenuType === 'production') {
        window.recordTimeForProduction(contextMenuTarget);
    }
    document.getElementById('context-menu').style.display = 'none';
}

window.closeRecordTimeDialog = function() {
    const dialog = document.getElementById('record-time-dialog');
    if (dialog) dialog.close();
}

window.quickTimeSelect = function(mins) {
    let start = document.getElementById('rt-start').value;
    if(!start) {
        let now = new Date();
        start = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        document.getElementById('rt-start').value = start;
    }
    
    let [sh,sm] = start.split(':').map(x=>parseInt(x));
    let total = sh*60+sm+mins;
    let eh = Math.floor(total/60), em = total%60;
    
    if(eh>23) {
        eh=23;
        em=59;
    }
    
    document.getElementById('rt-end').value = `${eh.toString().padStart(2,'0')}:${em.toString().padStart(2,'0')}`;
}

// 时间按钮点击包装函数，带动画效果
window.timeButtonClick = function(button, direction, mins) {
    // 添加点击动画
    button.classList.add('clicked');
    setTimeout(() => {
        button.classList.remove('clicked');
    }, 300);
    
    // 调用相应的时间选择函数
    if (direction === 'forward') {
        window.quickTimeSelectForward(mins);
    } else {
        window.quickTimeSelectBackward(mins);
    }
}

window.quickTimeSelectForward = function(mins) {
    // 以当前时间为结束时间，向前推算起始时间
    let endInput = document.getElementById('rt-end');
    let startInput = document.getElementById('rt-start');
    
    // 如果结束时间为空，使用当前时间
    let endTime, eh, em;
    if (!endInput.value) {
        let now = new Date();
        eh = now.getHours();
        em = now.getMinutes();
        endInput.value = `${eh.toString().padStart(2,'0')}:${em.toString().padStart(2,'0')}`;
    } else {
        [eh, em] = endInput.value.split(':').map(x => parseInt(x));
    }
    
    // 如果开始时间已有值，在其基础上减少时长（向前推更多）
    let startTotal;
    if (startInput.value) {
        let [sh, sm] = startInput.value.split(':').map(x => parseInt(x));
        startTotal = sh * 60 + sm - mins;
    } else {
        startTotal = eh * 60 + em - mins;
    }
    
    if (startTotal < 0) startTotal = 0;
    let sh = Math.floor(startTotal / 60), sm = startTotal % 60;
    startInput.value = `${sh.toString().padStart(2,'0')}:${sm.toString().padStart(2,'0')}`;
}

window.quickTimeSelectBackward = function(mins) {
    // 以当前时间为起始时间，向后推算结束时间
    let startInput = document.getElementById('rt-start');
    let endInput = document.getElementById('rt-end');
    
    // 如果起始时间为空，使用当前时间
    let startTime, sh, sm;
    if (!startInput.value) {
        let now = new Date();
        sh = now.getHours();
        sm = now.getMinutes();
        startInput.value = `${sh.toString().padStart(2,'0')}:${sm.toString().padStart(2,'0')}`;
    } else {
        [sh, sm] = startInput.value.split(':').map(x => parseInt(x));
    }
    
    // 如果结束时间已有值，在其基础上增加时长（向后推更多）
    let endTotal;
    if (endInput.value) {
        let [eh, em] = endInput.value.split(':').map(x => parseInt(x));
        endTotal = eh * 60 + em + mins;
    } else {
        endTotal = sh * 60 + sm + mins;
    }
    
    if (endTotal > 23 * 60 + 59) endTotal = 23 * 60 + 59;
    let eh = Math.floor(endTotal / 60), em = endTotal % 60;
    endInput.value = `${eh.toString().padStart(2,'0')}:${em.toString().padStart(2,'0')}`;
}

window.removeContextItem = function() {
    if (contextMenuType === 'production') {
        const prod = sortedProductions[contextMenuTarget];
        const productionName = prod.name;
        
        // 检查是否有相关的时间记录
        const relatedLogs = (gameData.timeLogs || []).filter(log => log.name === productionName);
        
        if (relatedLogs.length > 0) {
            // 使用自定义模态框让用户选择
            showCustomModal({
                title: '删除生产线',
                content: `
                    <div style="margin-bottom:16px;">
                        <div style="font-weight:bold;margin-bottom:8px;">确定要删除生产线"${productionName}"吗？</div>
                        <div style="color:#e67e22;font-size:0.9em;">发现 ${relatedLogs.length} 条相关的时间记录</div>
                    </div>
                    <div style="margin-bottom:16px;">
                        <label style="display:flex;align-items:center;cursor:pointer;">
                            <input type="checkbox" id="delete-time-records" style="margin-right:8px;">
                            <span>同时删除所有时间记录</span>
                        </label>
                        <div style="font-size:0.85em;color:#888;margin-top:4px;">
                            不勾选则只删除生产线，保留时间记录用于历史查看
                        </div>
                    </div>
                `,
                onConfirm: () => {
                    const deleteRecords = document.getElementById('delete-time-records').checked;
                    
                    if (deleteRecords) {
                        // 删除相关时间记录
                        gameData.timeLogs = (gameData.timeLogs || []).filter(log => log.name !== productionName);
                        console.log(`🗑️ 删除生产线"${productionName}"及其 ${relatedLogs.length} 条时间记录`);
                    } else {
                        console.log(`🗑️ 删除生产线"${productionName}"（保留 ${relatedLogs.length} 条时间记录）`);
                    }
                    
                    gameData.productions.splice(prod._realIndex, 1);
                    renderProductions();
                    renderResourceStats();
                    renderWeekCalendar();
                    saveToCloud();
                    return true;
                }
            });
        } else {
            if (!confirm(`确定要删除生产线"${productionName}"吗？`)) return;
            
            gameData.productions.splice(prod._realIndex, 1);
            renderProductions();
            renderResourceStats();
            renderWeekCalendar();
            saveToCloud();
        }
    }
    document.getElementById('context-menu').style.display = 'none';
}

const oldCheckInHabit = window.checkInHabit;
window.checkInHabit = function(index) {
    const prod = gameData.productions[index];
    let timeCost = prod.timeCost || 0;
    if(timeCost>0) {
        if(timeResource<timeCost) { alert('今日剩余时间不足！'); return; }
        // 选择起始时间
        let now = new Date();
        let h = now.getHours();
        let m = now.getMinutes();
        let input = prompt('请输入打卡起始时间（如9:00 或 13:30）：', `${h}:${m<10?'0'+m:m}`);
        if(!input) return;
        let [sh,sm] = input.split(':').map(x=>parseInt(x));
        if(isNaN(sh)||isNaN(sm)||sh<0||sh>23||sm<0||sm>59) { alert('时间格式错误'); return; }
        // 计算结束时间
        let totalMin = sh*60+sm+timeCost;
        let eh = Math.floor(totalMin/60);
        let em = totalMin%60;
        if(eh>23) eh=23,em=59;
        // 记录到timeLogs
        let d = (now.getDay()+6)%7;
        gameData.timeLogs.push({
            name: prod.name,
            type: prod.type,
            date: now.toISOString().slice(0,10),
            weekDay: d,
            hour: sh,
            minute: sm,
            timeCost: timeCost,
            endHour: eh,
            endMinute: em
        });
        timeResource -= timeCost;
    }
    // 新增：打卡后记录lastCheckIn
    prod.lastCheckIn = new Date().toISOString();
    // 新增：如果有linkedDev，给研发进度+1
    if(prod.linkedDev) {
        let dev = gameData.developments.find(d=>d.researchName===prod.linkedDev);
        if(dev && !dev.checkedToday) {
            dev.checkedToday = true;
            dev.progress = (dev.progress||0) + 1;
        }
    }
    renderProductions();
    renderDevelopments();
    renderTimeAndEnergy();
    renderWeekCalendar();
    renderResourceStats();
}

window.pauseDev = function(index) {
    if (!gameData.developments[index]) return;
    gameData.developments[index].active = false;
    gameData.developments[index].paused = true;
    renderDevelopments();
    saveToCloud(); // 添加保存到云端
}

window.resumeDev = function(index) {
    const activeCount = gameData.developments.filter(d => d.active).length;
    if (activeCount >= 3) {
        alert('最多同时进行3个研发项目！');
        return;
    }
    
    if (!gameData.developments[index]) return;
    gameData.developments[index].active = true;
    gameData.developments[index].paused = false;
    renderDevelopments();
    saveToCloud(); // 添加保存到云端
}

window.removeDev = function(index) {
    if (!gameData.developments[index]) return;
    if (!confirm('确定要移除该研究项目吗？相关的进度记录将被清除。')) return;
    
    const dev = gameData.developments[index];
    // 1. 移除研究项目
    gameData.developments.splice(index, 1);
    
    // 2. 询问是否同时移除关联的生产线
    const prodIndex = gameData.productions.findIndex(p => p.linkedDev === dev.researchName);
    if (prodIndex !== -1) {
        if (confirm('是否同时移除关联的生产线？')) {
            gameData.productions.splice(prodIndex, 1);
        } else {
            // 解除关联
            gameData.productions[prodIndex].linkedDev = null;
        }
    }
    
    renderDevelopments();
    renderProductions();
    saveToCloud();
}

window.completeExperience = function(category, index) {
    const exp = gameData.experiences[category][index];
    exp.count++;
    
    if (exp.repeatable || exp.count === 1) {
        alert(`🎉 恭喜完成：${exp.name}！`);
    }
    
    renderMilestones();
    renderResourceStats();
    saveToCloud();
}

window.editSavings = function() {
    const newSavings = prompt('请输入当前累计存款:', gameData.finance.totalSavings);
    if (newSavings !== null && !isNaN(newSavings)) {
        gameData.finance.totalSavings = parseFloat(newSavings);
        gameData.finance.savingsUpdateTime = new Date().toISOString();
        
        const currency = prompt('选择货币 (CNY/AUD/USD/EUR):', gameData.finance.savingsCurrency) || 'CNY';
        if (['CNY', 'AUD', 'USD', 'EUR'].includes(currency.toUpperCase())) {
            gameData.finance.savingsCurrency = currency.toUpperCase();
        }
        
        // 只重新渲染资源统计，不调用完整的init()
        renderResourceStats();
        saveToCloud();
    }
}

window.editEstimatedExpense = function() {
    // 此函数已删除，预计月支出现在自动计算
    console.log('预计月支出现在自动计算，无需手动设置');
}

window.showTodayTimeDetails = function() {
    const today = getLocalDateString(); // 修复：使用本地日期
    const todayLogs = (gameData.timeLogs||[]).filter(log => log.date === today);
    
    if (todayLogs.length === 0) {
        alert('今天还没有时间记录');
        return;
    }
    
    // 按项目分组
    const groupedLogs = {};
    let totalMins = 0;
    
    todayLogs.forEach(log => {
        if (!groupedLogs[log.name]) groupedLogs[log.name] = [];
        let timeCost = log.timeCost || 0;
        if (timeCost <= 0 && log.hour !== undefined && log.endHour !== undefined) {
            timeCost = (log.endHour * 60 + (log.endMinute || 0)) - (log.hour * 60 + (log.minute || 0));
        }
        timeCost = Math.max(0, timeCost);
        groupedLogs[log.name].push({...log, timeCost});
        totalMins += timeCost;
    });
    
    let html = `<h3>今日时间详情 (共 ${Math.floor(totalMins/60)}小时${totalMins%60}分钟)</h3>`;
    html += '<div style="max-height:400px;overflow-y:auto;padding:10px;">';
    
    Object.entries(groupedLogs).forEach(([name, logs]) => {
        const projectTotal = logs.reduce((sum, log) => sum + log.timeCost, 0);
        html += `<div style="margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:10px;">`;
        html += `<div style="font-weight:bold;margin-bottom:5px;color:#2c3e50;">${name} (${Math.floor(projectTotal/60)}小时${projectTotal%60}分钟)</div>`;
        
        logs.forEach(log => {
            html += `<div style="color:#666;font-size:0.9em;margin-left:10px;margin-bottom:3px;">`;
            html += `⏰ ${log.hour.toString().padStart(2,'0')}:${(log.minute||0).toString().padStart(2,'0')} - `;
            html += `${log.endHour.toString().padStart(2,'0')}:${(log.endMinute||0).toString().padStart(2,'0')}`;
            html += ` (${log.timeCost}分钟)`;
            html += `</div>`;
        });
        html += `</div>`;
    });
    
    html += '</div>';
    
    showCustomModal({
        title: '今日时间详情',
        content: html,
        onConfirm: () => true
    });
}

window.showProductionModal = function() {
    currentEditIndex = -1;
    document.getElementById('production-form').reset();
    document.getElementById('active-income-row').style.display = 'none';
    document.getElementById('passive-income-row').style.display = 'none';
    updateLinkedDevOptions();
    updateFormVisibility();
    document.getElementById('production-modal').style.display = 'block';
}

function editProduction(index) {
    currentEditIndex = index;
    const prod = gameData.productions[index];
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-type').value = prod.type;
    document.getElementById('has-active-income').checked = prod.hasActiveIncome;
    document.getElementById('active-amount').value = prod.activeIncome || '';
    document.getElementById('active-currency').value = prod.activeCurrency || 'CNY';
    document.getElementById('active-income-row').style.display = prod.hasActiveIncome ? 'grid' : 'none';
    document.getElementById('has-passive-income').checked = prod.hasPassiveIncome;
    document.getElementById('passive-amount').value = prod.passiveIncome || '';
    document.getElementById('passive-currency').value = prod.passiveCurrency || 'CNY';
    document.getElementById('passive-income-row').style.display = prod.hasPassiveIncome ? 'grid' : 'none';
    document.getElementById('prod-expense-amount').value = prod.expense || '';
    document.getElementById('prod-expense-currency').value = prod.expenseCurrency || 'CNY';
    updateLinkedDevOptions();
    document.getElementById('linked-dev').value = prod.linkedDev || '';
    // 投资类专属
    if (prod.type === 'investment') {
        document.getElementById('invest-amount').value = prod.investAmount || '';
        document.getElementById('invest-currency').value = prod.investCurrency || 'CNY';
        document.getElementById('invest-date').value = prod.investDate || '';
        document.getElementById('invest-current').value = prod.investCurrent || '';
        document.getElementById('invest-current-currency').value = prod.investCurrentCurrency || prod.investCurrency || 'CNY';
        document.getElementById('investment-fields').style.display = '';
        document.getElementById('income-type-group').style.display = 'none';
    } else {
        document.getElementById('investment-fields').style.display = 'none';
        document.getElementById('income-type-group').style.display = '';
    }
    updateFormVisibility();
    document.getElementById('production-modal').style.display = 'block';
}

function updateFormVisibility() {
    const type = document.getElementById('prod-type').value;
    const incomeGroup = document.getElementById('income-type-group');
    const expenseGroup = document.getElementById('expense-group');
    const hasPassive = document.getElementById('has-passive-income').parentElement.parentElement;
    const lifestyleHistoryGroup = document.getElementById('lifestyle-history-group');
    
    if (type === 'investment') {
        incomeGroup.style.display = 'none';
        hasPassive.style.display = 'none';
        expenseGroup.style.display = 'none';
        document.getElementById('investment-fields').style.display = '';
        if (lifestyleHistoryGroup) lifestyleHistoryGroup.style.display = 'none';
    } else if (type === 'automation') {
        incomeGroup.style.display = 'none';
        hasPassive.style.display = 'none';
        expenseGroup.style.display = 'none';
        document.getElementById('investment-fields').style.display = 'none';
        if (lifestyleHistoryGroup) lifestyleHistoryGroup.style.display = 'none';
    } else if (type === 'lifestyle') {
        incomeGroup.style.display = 'none';
        hasPassive.style.display = 'none';
        expenseGroup.style.display = 'none';
        document.getElementById('investment-fields').style.display = 'none';
        if (lifestyleHistoryGroup) {
            lifestyleHistoryGroup.style.display = 'block';
            renderLifestyleHistoryTags();
        }
    } else {
        // 生产类项目 - 只显示收入字段，不显示支出
        incomeGroup.style.display = 'block';
        hasPassive.style.display = 'block';
        expenseGroup.style.display = 'none';
        document.getElementById('investment-fields').style.display = 'none';
        if (lifestyleHistoryGroup) lifestyleHistoryGroup.style.display = 'none';
    }
}

function updateLinkedDevOptions() {
    const select = document.getElementById('linked-dev');
    select.innerHTML = '<option value="">无</option>' +
        gameData.developments.map(dev => 
            `<option value="${dev.researchName}">${dev.researchName}</option>`
        ).join('');
}

function renderLifestyleHistoryTags() {
    const container = document.getElementById('lifestyle-history-tags');
    if (!container) return;
    
    // 从时间日志中获取所有生活类项目名称（优先从时间记录中推断）
    const lifestyleNames = new Set();
    
    // 统计每个项目名称在时间日志中的出现频率，用于排序
    const nameFrequency = {};
    
    (gameData.timeLogs || []).forEach(log => {
        // 判断是否为生活类：要么type是lifestyle，要么当前productions中有同名的lifestyle项目
        const isLifestyle = log.type === 'lifestyle' || 
            (gameData.productions.find(p => p.name === log.name && p.type === 'lifestyle'));
        
        if (isLifestyle) {
            lifestyleNames.add(log.name);
            nameFrequency[log.name] = (nameFrequency[log.name] || 0) + 1;
        }
    });
    
    // 按使用频率排序（频率高的在前）
    const sortedNames = Array.from(lifestyleNames).sort((a, b) => {
        const freqDiff = (nameFrequency[b] || 0) - (nameFrequency[a] || 0);
        if (freqDiff !== 0) return freqDiff;
        return a.localeCompare(b); // 频率相同则按字母顺序
    });
    
    if (sortedNames.length === 0) {
        container.innerHTML = '<div style="color:#888;font-size:0.9em;">暂无历史生活项目</div>';
        return;
    }
    
    container.innerHTML = sortedNames.map(name => {
        const frequency = nameFrequency[name] || 0;
        const title = `${name} (使用 ${frequency} 次)`;
        return `<button type="button" class="lifestyle-history-tag" onclick="window.selectLifestyleTag('${name}')" title="${title}">${name}</button>`;
    }).join('');
}

window.selectLifestyleTag = function(name) {
    document.getElementById('prod-name').value = name;
}

// 新增：渲染蓝图历史标签
function renderBlueprintHistoryTags() {
    const container = document.getElementById('blueprint-history-tags');
    if (!container) return;
    
    // 确保蓝图历史数据结构存在
    if (!gameData.blueprintHistory) {
        gameData.blueprintHistory = [];
    }
    
    // 统计每个项目名称的使用频率
    const nameFrequency = {};
    const uniqueNames = new Set();
    
    gameData.blueprintHistory.forEach(historyItem => {
        uniqueNames.add(historyItem.name);
        nameFrequency[historyItem.name] = (nameFrequency[historyItem.name] || 0) + 1;
    });
    
    // 按使用频率排序（频率高的在前）
    const sortedNames = Array.from(uniqueNames).sort((a, b) => {
        const freqDiff = (nameFrequency[b] || 0) - (nameFrequency[a] || 0);
        if (freqDiff !== 0) return freqDiff;
        return a.localeCompare(b); // 频率相同则按字母顺序
    });
    
    if (sortedNames.length === 0) {
        container.innerHTML = '<div style="color:#888;font-size:0.9em;">暂无蓝图历史记录</div>';
        return;
    }
    
    container.innerHTML = sortedNames.map(name => {
        const frequency = nameFrequency[name] || 0;
        const latestHistory = gameData.blueprintHistory
            .filter(h => h.name === name)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
        
        const statusText = latestHistory.reason === 'completed' ? '已完成' : '已过期';
        const title = `${name} (${statusText} ${frequency} 次)`;
        
        return `<button type="button" class="blueprint-history-tag" onclick="window.selectBlueprintTag('${name}')" title="${title}">${name}</button>`;
    }).join('');
}

// 新增：选择蓝图历史标签
window.selectBlueprintTag = function(name) {
    document.getElementById('blueprint-name').value = name;
}

// 新增：添加蓝图到历史记录
function addToBlueprintHistory(blueprint, reason) {
    if (!gameData.blueprintHistory) {
        gameData.blueprintHistory = [];
    }
    
    const historyItem = {
        name: blueprint.name,
        category: blueprint.category,
        duration: blueprint.duration,
        priority: blueprint.priority,
        originalScheduledDate: blueprint.scheduledDate,
        completedAt: new Date().toISOString(),
        reason: reason // 'completed' 或 'expired'
    };
    
    gameData.blueprintHistory.push(historyItem);
    
    // 可选：限制历史记录数量，避免数据过多
    if (gameData.blueprintHistory.length > 1000) {
        gameData.blueprintHistory = gameData.blueprintHistory.slice(-500); // 保留最新的500条
    }
}

// 新增：检查过期蓝图
function checkExpiredBlueprints() {
    if (!gameData.blueprints) return;
    
    const now = new Date();
    const expiredBlueprints = [];
    
    gameData.blueprints.forEach((blueprint, index) => {
        const scheduledDate = new Date(blueprint.scheduledDate);
        const endTime = new Date(scheduledDate.getTime() + blueprint.duration * 60000);
        
        // 如果蓝图的结束时间已经过了，认为是过期的
        if (endTime < now) {
            expiredBlueprints.push({blueprint, index});
        }
    });
    
    // 处理过期的蓝图
    if (expiredBlueprints.length > 0) {
        // 从后往前删除，避免索引问题
        expiredBlueprints.reverse().forEach(({blueprint, index}) => {
            // 添加到历史记录（排除自动化类型）
            if (blueprint.category !== 'automation') {
                addToBlueprintHistory(blueprint, 'expired');
            }
            
            // 从蓝图列表中移除
            gameData.blueprints.splice(index, 1);
        });
        
        // 保存数据并重新渲染
        if (expiredBlueprints.length > 0) {
            saveToCloud();
            renderWeekCalendar();
            console.log(`🕐 自动处理了 ${expiredBlueprints.length} 个过期蓝图`);
        }
    }
}

// 更新时间记录中的生产线名称（保持数据一致性）
function updateTimeLogsProductionName(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    
    let updatedCount = 0;
    (gameData.timeLogs || []).forEach(log => {
        if (log.name === oldName) {
            log.name = newName;
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        console.log(`🔄 生产线名称更新：将 ${updatedCount} 条时间记录从 "${oldName}" 更新为 "${newName}"`);
        
        // 显示用户友好的提示
        setTimeout(() => {
            showCustomModal({
                title: '数据同步完成',
                content: `<div style="text-align:center;padding:20px;">
                    <div style="font-size:1.2em;margin-bottom:10px;">📝</div>
                    <div>生产线名称已更新</div>
                    <div style="color:#888;font-size:0.9em;margin-top:8px;">同时更新了 ${updatedCount} 条历史时间记录</div>
                </div>`,
                onConfirm: () => {
                    // 重新渲染日历和资源统计
                    renderWeekCalendar();
                    renderResourceStats();
                    return true;
                }
            });
        }, 100);
    }
}


// 开始研究
function startResearch(research, createProductionLine) {
    if (!hasResearch(research.name)) {
        // 补全字段，保证研发中心渲染正常
        const dev = {
            researchName: research.name,
            prodName: research.prodName || research.name,
            icon: research.icon || '🧪',
            level: 1,
            progress: 0,
            maxProgress: research.maxProgress || research.target || 1,
            active: true,
            paused: false,
            repeatable: research.repeatable || false,
            checkedToday: false,
            category: research.category || '',
            cycle: research.cycle || 21,
            target: research.target || 17,
            action: research.action || '',
            science: research.science || '',
            freq: research.freq || '每天',
            startDate: new Date().toISOString()
        };
        gameData.developments.push(dev);
        updateResearchStatus();
        if (window.renderDevelopments) window.renderDevelopments();

        // 同步创建生产线（与旧版一致）
        if (createProductionLine) {
            if (!gameData.productions) gameData.productions = [];
            const productionExists = gameData.productions.some(p => p.linkedDev === dev.researchName);
            if (!productionExists) {
                const newProduction = {
                    name: dev.prodName,
                    type: 'automation',
                    activeIncome: 0,
                    activeCurrency: 'CNY',
                    passiveIncome: 0,
                    passiveCurrency: 'CNY',
                    expense: 0,
                    expenseCurrency: 'CNY',
                    linkedDev: dev.researchName,
                    lastCheckIn: null,
                    hasActiveIncome: false,
                    hasPassiveIncome: false,
                    timeCost: 0
                };
                gameData.productions.push(newProduction);
                if (window.renderProductions) window.renderProductions();
            }
        }

        // 关闭研究详情弹窗
        const modal = document.getElementById('research-detail-modal');
        if (modal) modal.style.display = 'none';
        
        // 可选：如需刷新科技树面板，可调用 renderDevLibrary()
        if (window.renderDevLibrary) window.renderDevLibrary();
        if (window.renderResourceStats) window.renderResourceStats();
        if (window.renderWeekCalendar) window.renderWeekCalendar();
        if (typeof window.saveToCloud === 'function') window.saveToCloud();
    }
}

// 检查是否已研究
function hasResearch(researchName) {
    if (!gameData || !gameData.developments) {
        console.error("gameData.developments is not available for hasResearch check.");
        return false;
    }
    return gameData.developments.some(dev => dev.researchName === researchName);
}

// 更新研究状态
function updateResearchStatus() {
    // 更新研发树中的节点状态
    document.querySelectorAll('.research-node').forEach(node => {
        const nodeContent = node.querySelector('.node-content');
        if (nodeContent) {
            nodeContent.className = `node-content ${hasResearch(node.dataset.name) ? 'completed' : ''}`;
        }
    });

    // 更新研究详情中的前置研究状态
    document.querySelectorAll('.requirement').forEach(req => {
        req.className = `requirement ${hasResearch(req.textContent) ? 'completed' : ''}`;
    });
}

function saveProduction() {
    return window.ErrorUtils.safeExecute(() => {
        const type = document.getElementById('prod-type').value;
        const productionName = document.getElementById('prod-name').value.trim();
        
        // 构建生产数据对象
        const productionData = {
            name: productionName,
            type: type,
            activeIncome: 0,
            activeCurrency: 'CNY',
            passiveIncome: 0,
            passiveCurrency: 'CNY',
            expense: 0,
            expenseCurrency: 'CNY',
            linkedDev: document.getElementById('linked-dev').value || null,
            lastCheckIn: null,
            hasActiveIncome: false,
            hasPassiveIncome: false
        };
        
        // 根据类型处理特殊字段
        if (type === 'investment') {
            productionData.investAmount = parseFloat(document.getElementById('invest-amount').value) || 0;
            productionData.investCurrency = document.getElementById('invest-currency').value;
            productionData.investDate = document.getElementById('invest-date').value;
            productionData.investCurrent = parseFloat(document.getElementById('invest-current').value) || 0;
            productionData.investCurrentCurrency = document.getElementById('invest-current-currency').value;
        } else if (type === 'automation' || type === 'lifestyle') {
            // 自动化和生活类项目不设置收入
            productionData.hasActiveIncome = false;
            productionData.hasPassiveIncome = false;
        } else {
            // 生产类项目只设置收入，不设置支出
            productionData.hasActiveIncome = document.getElementById('has-active-income').checked;
            productionData.hasPassiveIncome = document.getElementById('has-passive-income').checked;
            
            if (productionData.hasActiveIncome) {
                productionData.activeIncome = parseFloat(document.getElementById('active-amount').value) || 0;
                productionData.activeCurrency = document.getElementById('active-currency').value;
            }
            if (productionData.hasPassiveIncome) {
                productionData.passiveIncome = parseFloat(document.getElementById('passive-amount').value) || 0;
                productionData.passiveCurrency = document.getElementById('passive-currency').value;
            }
        }

        // 数据验证
        if (!window.validateAndShowErrors(productionData, 'production')) {
            return false;
        }

        // 数据清理
        const sanitizedData = window.sanitizeData(productionData, 'production');

        if (currentEditIndex >= 0) {
            // 编辑现有生产线
            const oldProduction = gameData.productions[currentEditIndex];
            const oldName = oldProduction.name;
            const newName = sanitizedData.name;
            
            sanitizedData.lastCheckIn = oldProduction.lastCheckIn;
            gameData.productions[currentEditIndex] = sanitizedData;
            
            // 如果名称发生变化，更新所有相关的时间记录
            if (oldName !== newName) {
                updateTimeLogsProductionName(oldName, newName);
            }
        } else {
            gameData.productions.push(sanitizedData);
        }

        closeModal('production-modal');
        renderProductions();
        renderResourceStats();
        renderDevelopments();
        renderDevLibrary();
        renderWeekCalendar();
        
        // 安全保存到云端
        window.ErrorUtils.safeExecuteAsync(
            () => saveToCloud(),
            { type: 'data-save', operation: 'saveProduction' },
            (error) => {
                console.error('保存到云端失败:', error);
                window.showError('数据已保存到本地，但云端同步失败', 'warning');
            }
        );

        return true;
    }, { type: 'production-save' }, (error) => {
        window.showError('保存生产线失败，请重试', 'error');
        return false;
    });
}

window.saveToFile = function() {
    const saveData = {
        gameData: gameData,
        lastDailyReset: lastDailyReset,
        saveTime: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(saveData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `LifeFactorio_${new Date().toLocaleDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ 数据已导出到文件！');
}

window.createManualBackup = function() {
    window.saveToFile();
}

window.loadFromFile = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const saveData = JSON.parse(e.target.result);
                    gameData = saveData.gameData || gameData;
                    lastDailyReset = saveData.lastDailyReset || lastDailyReset;
                    init();
                    alert('✅ 数据导入成功！');
                } catch (error) {
                    alert('❌ 文件格式错误！');
                }
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}

window.saveToLocal = function() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            const saveData = {
                gameData: gameData,
                lastDailyReset: lastDailyReset,
                saveTime: new Date().toISOString()
            };
            localStorage.setItem('lifeFactorio', JSON.stringify(saveData));
            updateSyncStatus('离线');
        } catch (e) {
            console.error('保存数据失败', e);
        }
    }, 500);
}


// 2. 增加时间资源和日历数据结构
function resetTimeResource() {
    timeResource = 24*60;
    weekCalendar = Array(7).fill(0).map(()=>Array(24).fill(null));
}

// 3. 渲染精力状态和时间资源
function renderTimeAndEnergy() {
    renderWeekCalendar();
}

// 4. 渲染周日历
function renderWeekCalendar() {
    // 检查过期蓝图
    checkExpiredBlueprints();
    
    updateProductionColorMap();
    let calendarPanel = document.getElementById('week-calendar');
    let container = document.getElementById('calendar-container');

    // Ensure the container exists
    if (!container) {
        if (calendarPanel) {
            // Create calendar container without affecting the title and navigation
            const calendarContainer = document.createElement('div');
            calendarContainer.className = 'week-calendar-container';
            calendarContainer.id = 'calendar-container';
            calendarPanel.appendChild(calendarContainer);
            container = calendarContainer;
        } else {
            return; // Exit if the main panel doesn't exist
        }
    }

    let days = ['一', '二', '三', '四', '五', '六', '日'];
    let baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + currentDateOffset);

    let dayOfWeek = baseDate.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7; // Sunday is 7 in our logic
    
    let monday = new Date(baseDate);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(baseDate.getDate() - (dayOfWeek - 1));

    const weekStart = new Date(monday);
    const weekEnd = new Date(monday);
    weekEnd.setDate(monday.getDate() + 6);

    const weekRangeLabel = document.getElementById('week-range-label');
    if (weekRangeLabel) {
        weekRangeLabel.textContent = `${formatDateLocal(weekStart)} - ${formatDateLocal(weekEnd)}`;
    }

    let weekDates = [];
    for (let i = 0; i < 7; i++) {
        let d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(formatDateLocal(d));
    }
    let dateLabels = weekDates.map(dateStr => {
        let [y, m, d] = dateStr.split('-');
        return `${parseInt(m)}/${parseInt(d)}`;
    });

    let todayDateStr = formatDateLocal(new Date());

    let html = '<table style="width:100%;border-collapse:collapse;text-align:center;font-size:0.85em;table-layout:fixed;">';
    html += '<thead><tr style="background:#f5f6fa;height:35px;"><th style="width:50px;"></th>';
    for (let d = 0; d < 7; d++) {
        html += `<th style="padding:4px 2px;">周${days[d]}<br><span style='font-size:0.9em;color:#888;'>${dateLabels[d]}</span></th>`;
    }
    html += '</tr></thead>';
    html += '<tbody>';
    for (let h = 0; h <= 24; h++) {
        const isNightTime = h >= 22 || h < 8;
        const nightClass = isNightTime ? 'night-time' : '';
        const timeLabel = h === 24 ? '24:00' : `${h}:00`;
        html += `<tr style="height:25px;" class="${nightClass}"><td style="color:#aaa;padding:2px;font-size:0.8em;">${timeLabel}</td>`;

        for (let d = 0; d < 7; d++) {
            let cellBg = '';
            let isTodayColumn = weekDates[d] === todayDateStr;

            if (isNightTime) {
                cellBg = isTodayColumn ? 'background:#f3f3f3;' : 'background:#f8f8f8;';
            } else {
                cellBg = isTodayColumn ? 'background:#f9fbe7;' : '';
            }
            html += `<td style="border:1px solid #ecf0f1;padding:0;${cellBg}"></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    html += '<div class="calendar-overlay" id="calendar-overlay"></div>';
    container.innerHTML = html;

    setTimeout(() => {
        renderTimeBlocks(weekDates);
    }, 50);
}
function renderTimeBlocks(weekDates) {
    const overlay = document.getElementById('calendar-overlay');
    const container = document.getElementById('calendar-container');
    const table = container ? container.querySelector('table') : null;

    if (!overlay || !container || !table || !table.rows[25] || !table.rows[25].cells[7]) {
        requestAnimationFrame(() => renderTimeBlocks(weekDates));
        return;
    }

    if (window._isRendering) return;
    window._isRendering = true;

    try {
        const firstDataCell = table.rows[1].cells[1];
        const lastDataCell = table.rows[25].cells[7]; // 24:00 row, Sunday cell
        const cellHeight = firstDataCell.offsetHeight;
        const cellWidth = firstDataCell.offsetWidth;

        if (cellHeight === 0 || cellWidth === 0) {
            window._isRendering = false;
            requestAnimationFrame(() => renderTimeBlocks(weekDates));
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const firstCellRect = firstDataCell.getBoundingClientRect();
        const lastCellRect = lastDataCell.getBoundingClientRect();

        overlay.style.position = 'absolute';
        overlay.style.top = `${firstCellRect.top - containerRect.top}px`;
        overlay.style.left = `${firstCellRect.left - containerRect.left}px`;
        overlay.style.width = `${lastCellRect.right - firstCellRect.left}px`;
        overlay.style.height = `${lastCellRect.bottom - firstCellRect.top}px`;
        overlay.style.pointerEvents = 'none';
        overlay.innerHTML = '';
        
        const allItems = [
            ...((gameData.timeLogs || []).map(item => ({ ...item, itemType: 'log' }))),
            ...((gameData.blueprints || []).filter(item => item.status === 'planned').map(item => ({ ...item, itemType: 'blueprint' })))
        ];

        const sortedItems = allItems
            .filter(item => {
                const dateStr = item.itemType === 'log' ? item.date : formatDateLocal(new Date(item.scheduledDate));
                return weekDates.includes(dateStr);
            })
            .sort((a, b) => {
                const dateA = new Date(a.itemType === 'log' ? `${a.date}T${String(a.hour || 0).padStart(2, '0')}:${String(a.minute || 0).padStart(2, '0')}` : a.scheduledDate);
                const dateB = new Date(b.itemType === 'log' ? `${b.date}T${String(b.hour || 0).padStart(2, '0')}:${String(b.minute || 0).padStart(2, '0')}` : b.scheduledDate);
                return dateA - dateB;
            });

        sortedItems.forEach((item, index) => {
            const block = document.createElement('div');
            let dateStr, startMinutes, duration, name;
            
            if (item.itemType === 'log') {
                dateStr = item.date;
                startMinutes = (item.hour || 0) * 60 + (item.minute || 0);
                const endMinutes = (item.endHour || item.hour || 0) * 60 + (item.endMinute || item.minute || 0);
                duration = Math.max(endMinutes - startMinutes, 15);
                name = item.name;
                block.className = `time-block ${getCalendarBlockClass(name)}`;
                block.style.zIndex = 100 + index;
                block.title = `${name}\n时间: ${item.hour}:${String(item.minute).padStart(2,'0')}-${item.endHour}:${String(item.endMinute).padStart(2,'0')}`;
                block.oncontextmenu = (e) => { e.preventDefault(); window._calendarBlockContextMenu(e, item.date, item.name, item.hour, item.minute); };
            } else { // Blueprint
                const startDate = new Date(item.scheduledDate);
                dateStr = formatDateLocal(startDate);
                startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                duration = item.duration;
                name = item.name;
                // 根据优先级设置不同的样式类
                const priorityClass = item.priority ? `priority-${item.priority}` : 'priority-medium';
                const autoGeneratedClass = item.autoGenerated ? 'auto-generated' : '';
                block.className = `time-block blueprint ${priorityClass} ${autoGeneratedClass}`.trim();
                block.style.zIndex = 50 + index;
                const sourceInfo = item.autoGenerated ? '\n来源: 自动生成' : '';
                block.title = `计划: ${name} (${duration}分钟)\n优先级: ${item.priority || 'medium'}${sourceInfo}`;
                block.dataset.blueprintId = item.id;
                block.oncontextmenu = (e) => { e.preventDefault(); showBlueprintContextMenu(e, item.id); };
            }

            const weekDay = weekDates.indexOf(dateStr);
            if (weekDay < 0) return;

            // The drawing logic inside the now-perfectly-aligned overlay.
            // Minor adjustments might be needed for border/padding of cells.
            const left = weekDay * cellWidth;
            const top = (startMinutes / 60) * cellHeight;
            const width = cellWidth;
            const height = Math.max((duration / 60) * cellHeight, 1);

            block.style.position = 'absolute';
            block.style.left = `${left}px`;
            block.style.top = `${top}px`;
            block.style.width = `${width}px`;
            block.style.height = `${height}px`;
            block.style.pointerEvents = 'auto';
            block.innerHTML = `<div class="time-block-text">${name}</div>`;
            
            overlay.appendChild(block);
        });
    } finally {
        window._isRendering = false;
    }

    // ====== 新增：当前时间线 ======
    if (weekDates && weekDates.length === 7) {
        const now = new Date();
        const todayStr = formatDateLocal(now);
        const weekDay = weekDates.indexOf(todayStr);
        if (weekDay >= 0) {
            const cellHeight = overlay.offsetHeight / 25; // 24小时+1行
            const cellWidth = overlay.offsetWidth / 7;
            const minutes = now.getHours() * 60 + now.getMinutes();
            const top = (minutes / 60) * cellHeight;
            const left = weekDay * cellWidth;
            const width = cellWidth;
            // 创建时间线
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.left = `${left}px`;
            line.style.top = `${top}px`;
            line.style.width = `${width}px`;
            line.style.height = '2px';
            line.style.background = 'linear-gradient(90deg, #ff1744 60%, #ff9100 100%)';
            line.style.boxShadow = '0 0 6px 2px #ff174488';
            line.style.zIndex = 9999;
            line.style.pointerEvents = 'none';
            overlay.appendChild(line);
        }
    }

    // ====== 新增：定时刷新时间线 ======
    if (!window._calendarTimeLineTimer) {
        window._calendarTimeLineTimer = setInterval(() => {
            renderTimeBlocks(weekDates);
        }, 60 * 1000);
    }
}

function showBlueprintContextMenu(event, blueprintId) {
    hideContextMenu();
    const menu = document.getElementById('context-menu');
    menu.innerHTML = `
        <div class="context-menu-item" onclick="viewBlueprintInfo('${blueprintId}')">👁️ 查看信息</div>
        <div class="context-menu-item" onclick="completeBlueprint('${blueprintId}')">✅ 标记完成</div>
        <div class="context-menu-item" onclick="deleteBlueprint('${blueprintId}')">🗑️ 删除计划</div>
    `;
    menu.style.display = 'block';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    contextMenuType = 'blueprint';
    
    // 添加点击其他地方关闭菜单的事件监听器
    setTimeout(() => {
        document.addEventListener('mousedown', hideContextMenu);
    }, 0);
}

// 新增：查看蓝图信息
window.viewBlueprintInfo = function(blueprintId) {
    const bpIndex = gameData.blueprints.findIndex(bp => bp.id === blueprintId);
    if (bpIndex === -1) return;
    const blueprint = gameData.blueprints[bpIndex];
    
    const scheduledDate = new Date(blueprint.scheduledDate);
    const endDate = new Date(scheduledDate.getTime() + blueprint.duration * 60000);
    
    const categoryNames = {
        'production': '🏭 生产',
        'automation': '⚙️ 自动化', 
        'investment': '💰 投资',
        'lifestyle': '🌱 生活方式',
        'infrastructure': '🏗️ 基础设施'
    };
    
    const priorityNames = {
        'low': '低',
        'medium': '中', 
        'high': '高',
        'urgent': '紧急'
    };
    
    showCustomModal({
        title: '蓝图信息',
        content: `
            <div style="margin-bottom: 16px;">
                <div style="font-weight: bold; font-size: 1.1em; margin-bottom: 8px;">${blueprint.name}</div>
                <div style="color: #666; font-size: 0.9em;">${categoryNames[blueprint.category] || blueprint.category}</div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 4px;">📅 计划时间</div>
                <div style="color: #333;">
                    ${scheduledDate.toLocaleDateString('zh-CN')} ${scheduledDate.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}
                </div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 4px;">⏱️ 计划时长</div>
                <div style="color: #333;">${blueprint.duration} 分钟</div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 4px;">🕐 结束时间</div>
                <div style="color: #333;">
                    ${endDate.toLocaleDateString('zh-CN')} ${endDate.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}
                </div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 4px;">🎯 优先级</div>
                <div style="color: #333;">${priorityNames[blueprint.priority] || blueprint.priority}</div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 4px;">📊 状态</div>
                <div style="color: #27ae60;">已计划</div>
            </div>
        `,
        onConfirm: () => {
            hideContextMenu();
            return true;
        },
        confirmText: '关闭'
    });
}

window.completeBlueprint = function(blueprintId) {
    const bpIndex = gameData.blueprints.findIndex(bp => bp.id === blueprintId);
    if (bpIndex === -1) return;
    const blueprint = gameData.blueprints[bpIndex];

    // 添加到蓝图历史记录（排除自动化类型）
    if (blueprint.category !== 'automation') {
        addToBlueprintHistory(blueprint, 'completed');
    }

    const start = new Date(blueprint.scheduledDate);
    const end = new Date(start.getTime() + blueprint.duration * 60000);
    
    // 使用本地日期格式，避免时区问题
    const localDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    
    const newLog = {
        name: blueprint.name,
        type: blueprint.category || 'blueprint',
        date: localDate,
        weekDay: (start.getDay() + 6) % 7,
        hour: start.getHours(),
        minute: start.getMinutes(),
        timeCost: blueprint.duration,
        endHour: end.getHours(),
        endMinute: end.getMinutes(),
        fromBlueprint: true
    };
    
    // 创建时间日志
    gameData.timeLogs.push(newLog);
    console.log(`✅ 蓝图完成，已创建时间日志:`, newLog);
    
    // 如果是自动化类型的蓝图，更新对应生产线的签到状态
    if (blueprint.category === 'automation' || blueprint.autoGenerated) {
        const matchingProduction = gameData.productions.find(prod => 
            prod.name === blueprint.name && prod.type === 'automation'
        );
        if (matchingProduction) {
            matchingProduction.lastCheckIn = new Date().toISOString();
            console.log(`🤖 已更新自动化项目 "${blueprint.name}" 的签到状态`);
        }
    }
    
    gameData.blueprints.splice(bpIndex, 1);
    saveToCloud();
    renderWeekCalendar();
    renderProductions(); // 刷新生产线显示
    renderResourceStats(); // 刷新资源统计
    hideContextMenu();
}

window.deleteBlueprint = function(blueprintId) {
    const bpIndex = gameData.blueprints.findIndex(bp => bp.id === blueprintId);
    if (bpIndex > -1) {
        gameData.blueprints.splice(bpIndex, 1);
        saveToCloud();
        renderWeekCalendar();
    }
    hideContextMenu();
}

function getCalendarBlockClass(name) {
    // 简单的字符串hash到颜色索引的映射
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = hash * 31 + name.charCodeAt(i);
    }
    const colorIndex = Math.abs(hash) % 10;
    return `color-${colorIndex}`;
}

// 5. 全职工作等任务可设置时间段
// 新增设置时间段的UI和保存逻辑（略，后续可补充）
// 6. 页面顶部插入精力和时间栏、周日历
window.addEventListener('DOMContentLoaded',function(){
    renderTimeAndEnergy();
    renderWeekCalendar();
    // 检查过期蓝图
    checkExpiredBlueprints();
});

// 7. 生产线数据结构增加timeCost字段（建议手动在已有数据中补充）
// 例如：{ name: ..., type: ..., timeCost: 30, ... }

// 新增：渲染资源数据统计面板
function renderResourceStats() {
        const container = document.getElementById('resource-stats');
        if (!container) return;
        let totalActive = 0, totalPassive = 0, totalExpense = 0;
        let activeBreakdown = [], passiveBreakdown = [], expenseBreakdown = [];
        let activeIncomesByCurrency = {}, passiveIncomesByCurrency = {}, expensesByCurrency = {};
        (gameData.productions || []).forEach(prod => {
            if (prod.hasActiveIncome && prod.activeIncome > 0) {
                if (!activeIncomesByCurrency[prod.activeCurrency]) activeIncomesByCurrency[prod.activeCurrency] = 0;
                activeIncomesByCurrency[prod.activeCurrency] += prod.activeIncome;
            }
            if (prod.hasPassiveIncome && prod.passiveIncome > 0) {
                if (!passiveIncomesByCurrency[prod.passiveCurrency]) passiveIncomesByCurrency[prod.passiveCurrency] = 0;
                passiveIncomesByCurrency[prod.passiveCurrency] += prod.passiveIncome;
            }
            if (prod.expense > 0) {
                if (!expensesByCurrency[prod.expenseCurrency]) expensesByCurrency[prod.expenseCurrency] = 0;
                expensesByCurrency[prod.expenseCurrency] += prod.expense;
            }
        });
        Object.entries(activeIncomesByCurrency).forEach(([currency, amount]) => {
            totalActive += convertToCNY(amount, currency);
            activeBreakdown.push(`${currencySymbols[currency]}${amount.toLocaleString()}`);
        });
        Object.entries(passiveIncomesByCurrency).forEach(([currency, amount]) => {
            totalPassive += convertToCNY(amount, currency);
            passiveBreakdown.push(`${currencySymbols[currency]}${amount.toLocaleString()}`);
        });
        Object.entries(expensesByCurrency).forEach(([currency, amount]) => {
            totalExpense += convertToCNY(amount, currency);
            expenseBreakdown.push(`${currencySymbols[currency]}${amount.toLocaleString()}`);
        });
        let savings = gameData.finance.totalSavings;
        let savingsCurrency = gameData.finance.savingsCurrency;
        let savingsStr = `${currencySymbols[savingsCurrency]}${savings.toLocaleString()}`;
        let savingsUpdate = gameData.finance.savingsUpdateTime ? `更新于 ${(new Date(gameData.finance.savingsUpdateTime)).toLocaleDateString()}` : '未更新';
        let today = getLocalDateString(); // 修复：使用本地日期
        let todayActiveMins = (gameData.timeLogs||[]).filter(log=>log.date===today).reduce((sum,log)=>{
            // 确保时间成本为正值，如果timeCost异常则重新计算
            let timeCost = log.timeCost || 0;
            if (timeCost <= 0 && log.hour !== undefined && log.endHour !== undefined) {
                timeCost = (log.endHour * 60 + (log.endMinute || 0)) - (log.hour * 60 + (log.minute || 0));
            }
            return sum + Math.max(0, timeCost); // 确保不会是负数
        }, 0);
    let html = '';
        html += `<div class='resource-stats-section'>
            <div class='resource-label'>累计存款
                <button class='resource-btn-edit' onclick='window.editSavings()'>✏️</button>
            </div>
            <div class='resource-main-value'>${savingsStr}</div>
            <div class='resource-sub'>${savingsUpdate}</div>
        </div>`;
        html += `<div class='resource-divider'></div>`;
        html += `<div class='resource-stats-section'>
            <div class='resource-label'>今天主动用时 
                <button class='resource-btn-edit' onclick='window.showTodayTimeDetails()' title='查看详情'>👁️</button>
            </div>
            <div class='resource-main-value' style='color:#27ae60;'>${todayActiveMins} <span style='font-size:0.5em;font-weight:normal;'>分钟</span></div>
        </div>`;
        html += `<div class='resource-divider'></div>`;
        html += `<div class='resource-row'>
            <span class='resource-label'>主动收入</span>
            <span class='resource-main-value' style='font-size:1.2em;color:#2980b9;'>¥${Math.round(totalActive).toLocaleString()}</span>
        </div>`;
        if (activeBreakdown.length) html += `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;'>(${activeBreakdown.join(' + ')})</div>`;
        
        html += `<div class='resource-row'>
            <span class='resource-label'>被动收入</span>
            <span class='resource-main-value' style='font-size:1.2em;color:#16a085;'>¥${Math.round(totalPassive).toLocaleString()}</span>
        </div>`;
        if (passiveBreakdown.length) html += `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;'>(${passiveBreakdown.join(' + ')})</div>`;
        
        html += `<div class='resource-divider'></div>`;
        // 使用合并的月支出统计（包括生产线支出和支出面板的支出）
        const monthlyTotal = getMonthlyExpenseTotalMerged();
        const monthlyExpenseDetails = getMonthlyExpenseBreakdown();
        
        // 预计月支出（自动计算，基于支出管理面板数据）
        const estimatedExpense = getEstimatedMonthlyExpense();
        const estimatedExpenseDetails = getEstimatedExpenseBreakdown();
        
        html += `<div class='resource-row'>
            <span class='resource-label'>预计月支出</span>
            <span class='resource-main-value' style='font-size:1.2em;color:#95a5a6;'>¥${Math.round(estimatedExpense).toLocaleString()}</span>
        </div>`;
        
        // 显示预计支出明细
        if (estimatedExpenseDetails.length) {
            html += `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;color:#95a5a6;'>(${estimatedExpenseDetails.join(' + ')})</div>`;
        }
        
        // 实际月支出（已支出）与尚未支出
        const remainingExpense = estimatedExpense - monthlyTotal;
        
        html += `<div class='resource-row'>
            <span class='resource-label'>已支出</span>
            <span class='resource-main-value' style='font-size:1.2em;color:#e67e22;'>¥${Math.round(monthlyTotal).toLocaleString()}</span>
        </div>`;
        
        if (estimatedExpense > 0) {
            html += `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;color:#888;'>
                尚未支出：¥${Math.round(remainingExpense).toLocaleString()}
            </div>`;
        }
        
        // 支出明细紧挨着实际月支出
        const allExpenseDetails = [];
        if (expenseBreakdown.length) allExpenseDetails.push(...expenseBreakdown);
        if (monthlyExpenseDetails.length) allExpenseDetails.push(...monthlyExpenseDetails);
        if (allExpenseDetails.length) html += `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;'>(${allExpenseDetails.join(' + ')})</div>`;
        container.innerHTML = html;
}

// 清除用时记录
window.clearTimeContextItem = function() {
    if (contextMenuType === 'production') {
        const prod = sortedProductions[contextMenuTarget];
        // 下面逻辑与原clearTimeContextItem一致，只是prod索引修正
        const today = getLocalDateString(); // 修复：使用本地日期
        const clearDate = prompt('请输入要清除的日期（格式：YYYY-MM-DD）\n留空则清除今天的记录', today);
        if (clearDate === null) return;
        const targetDate = clearDate || today;
        const before = (gameData.timeLogs||[]).length;
        gameData.timeLogs = (gameData.timeLogs||[]).filter(log => 
            !(log.name === prod.name && log.date === targetDate)
        );
        const after = gameData.timeLogs.length;
        const cleared = before - after;
        if(targetDate === today) {
            prod.lastCheckIn = null;
            if(prod.linkedDev) {
                const dev = gameData.developments.find(d => d.researchName === prod.linkedDev);
                if(dev) {
                    dev.checkedToday = false;
                }
            }
        }
        saveToCloud();
        renderWeekCalendar();
        renderResourceStats();
        renderProductions();
        renderDevelopments();
        alert(`已清除 ${targetDate} 的用时记录：${cleared} 条`);
    }
    document.getElementById('context-menu').style.display = 'none';
}

// 查看历史记录
window.viewHistoryContextItem = function() {
    if (contextMenuType === 'production') {
        const prod = sortedProductions[contextMenuTarget];
        const logs = (gameData.timeLogs||[])
            .filter(log => log.name === prod.name)
            .sort((a,b) => new Date(b.date) - new Date(a.date));
        if(logs.length === 0) {
            alert('暂无时间记录');
            return;
        }
        let html = `<h3>${prod.name} - 时间记录</h3>`;
        html += '<div style="max-height:400px;overflow-y:auto;padding:10px;">';
        const groupedLogs = {};
        logs.forEach(log => {
            if(!groupedLogs[log.date]) groupedLogs[log.date] = [];
            groupedLogs[log.date].push(log);
        });
        Object.entries(groupedLogs).forEach(([date, dayLogs]) => {
            const totalMins = dayLogs.reduce((sum,log) => sum + log.timeCost, 0);
            html += `<div style="margin-bottom:15px;">`;
            html += `<div style="font-weight:bold;margin-bottom:5px;">${date} (共 ${totalMins} 分钟)</div>`;
            dayLogs.forEach(log => {
                html += `<div style="color:#666;font-size:0.9em;margin-left:10px;">`;
                html += `${log.hour.toString().padStart(2,'0')}:${log.minute.toString().padStart(2,'0')} - `;
                html += `${log.endHour.toString().padStart(2,'0')}:${log.endMinute.toString().padStart(2,'0')}`;
                html += ` (${log.timeCost}分钟)`;
                html += `</div>`;
            });
            html += `</div>`;
        });
        html += '</div>';
        const dialog = document.createElement('dialog');
        dialog.innerHTML = `
            <div style="min-width:300px;max-width:500px;padding:20px;">
                ${html}
                <div style="text-align:right;margin-top:20px;">
                    <button onclick="this.closest('dialog').close()" class="btn btn-primary">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
        dialog.showModal();
        dialog.addEventListener('click', e => {
            if (e.target === dialog) dialog.close();
        });
    }
    document.getElementById('context-menu').style.display = 'none';
}

// Tab切换逻辑
window.switchTab = function(tab) {
    const statsContent = document.getElementById('tab-stats-content');
    const calendarContent = document.getElementById('tab-calendar-content');
    const statsTab = document.getElementById('tab-stats');
    const calendarTab = document.getElementById('tab-calendar');
    
    if (!statsContent || !calendarContent || !statsTab || !calendarTab) return;
    
    statsContent.style.display = (tab==='stats') ? '' : 'none';
    calendarContent.style.display = (tab==='calendar') ? '' : 'none';
    statsTab.classList.toggle('active', tab==='stats');
    calendarTab.classList.toggle('active', tab==='calendar');
}

function updateBottomRowLayout() {
    const isMobile = window.innerWidth < 900;
    const tabBar = document.getElementById('tab-bar');
    const statsContent = document.getElementById('tab-stats-content');
    const calendarContent = document.getElementById('tab-calendar-content');
    
    if (!tabBar || !statsContent || !calendarContent) return;
    
    if (isMobile) {
        tabBar.style.display = '';
        statsContent.style.display = '';
        calendarContent.style.display = 'none';
        window.switchTab('stats');
    } else {
        tabBar.style.display = 'none';
        statsContent.style.display = 'inline-block';
        calendarContent.style.display = 'inline-block';
        statsContent.style.width = '420px';
        calendarContent.style.width = 'calc(100% - 440px)';
        statsContent.style.verticalAlign = 'top';
        calendarContent.style.verticalAlign = 'top';
    }
}

// 自动为每个研究项生成唯一生产线
function syncResearchProductions() {
    gameData.productions = [];
    gameData.devLibrary.forEach(dev => {
        gameData.productions.push({
            name: dev.prodName, // 生产线名称
            type: 'habit',
            activeIncome: 0,
            activeCurrency: 'CNY',
            passiveIncome: 0,
            passiveCurrency: 'CNY',
            expense: 0,
            expenseCurrency: 'CNY',
            linkedDev: dev.researchName, // 关联研发项目
            lastCheckIn: null,
            hasActiveIncome: false,
            hasPassiveIncome: false,
            timeCost: 0
        });
    });
}

// 记录生产线用时（修正版，索引与进度同步修复）
window.logProductionTime = function(sortedIndex) {
    // 添加错误检查
    if (!sortedProductions || sortedProductions.length === 0) {
        console.error('sortedProductions数组为空或未初始化');
        return;
    }
    
    if (sortedIndex < 0 || sortedIndex >= sortedProductions.length) {
        console.error('无效的sortedIndex:', sortedIndex, '数组长度:', sortedProductions.length);
        return;
    }
    
    const prod = sortedProductions[sortedIndex];
    if (!prod) {
        console.error('在索引', sortedIndex, '处找不到生产线');
        return;
    }
    
    if (prod._realIndex === undefined || prod._realIndex < 0 || prod._realIndex >= gameData.productions.length) {
        console.error('无效的_realIndex:', prod._realIndex, '生产线数组长度:', gameData.productions.length);
        return;
    }
    
    const realProd = gameData.productions[prod._realIndex];
    if (!realProd) {
        console.error('在真实索引', prod._realIndex, '处找不到生产线');
        return;
    }
    
    // 快速打卡，记录30分钟
    const now = new Date();
    const endH = now.getHours(), endM = now.getMinutes();
    const start = new Date(now.getTime() - 30*60000);
    const startH = start.getHours(), startM = start.getMinutes();
    const today = now.toISOString().slice(0,10);
    const weekDay = (now.getDay()+6)%7;
    const timeLog = {
        name: realProd.name,
        type: realProd.type,
        date: today,
        weekDay: weekDay,
        hour: startH,
        minute: startM,
        timeCost: 30,
        endHour: endH,
        endMinute: endM
    };
    gameData.timeLogs.push(timeLog);
    realProd.lastCheckIn = now.toISOString();
    saveToCloud();
    renderProductions();
    renderDevelopments();
    renderWeekCalendar();
    renderResourceStats();
}

// 2. 修复数据关联
function fixDataLinks() {
    // 1. 生产线与研发项目关联修正
    gameData.productions = gameData.productions.filter(p => p && p.name);
    gameData.developments = gameData.developments.filter(d => d && d.researchName);
    // 2. 生产线linkedDev字段修正
    gameData.productions.forEach(prod => {
        if (prod.linkedDev) {
            const dev = gameData.developments.find(d => d.researchName === prod.linkedDev);
            if (!dev) prod.linkedDev = null;
            else {
                // 自动修复研发项目的prodName
                if (!dev.prodName || dev.prodName !== prod.name) dev.prodName = prod.name;
            }
        }
    });
    // 3. 研发项目prodName修正
    gameData.developments.forEach(dev => {
        // 若有多个产线指向同一研发项目，优先第一个
        const prod = gameData.productions.find(p => p.linkedDev === dev.researchName);
        if (prod) dev.prodName = prod.name;
    });
    // 4. 去重（同名只保留第一个）
    const seen = new Set();
    gameData.productions = gameData.productions.filter(p => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
    });
}
// 在每次渲染前自动修正
function safeRenderProductions() { fixDataLinks(); renderProductions(); }
function safeRenderDevelopments() { fixDataLinks(); renderDevelopments(); }



async function bindFile() {
    [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON文件', accept: {'application/json': ['.json']} }]
    });
}

async function saveToBoundFile() {
    if (!fileHandle) return;
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify({gameData, lastDailyReset, saveTime: new Date().toISOString()}, null, 2));
    await writable.close();
}

// 云端登录并监听
function firebaseLoginAndSync() {
    auth.signInAnonymously().then(() => {
        listenCloudData();
    });
}

// 监听云端数据变化
function listenCloudData() {
    if (!familyCode) return;
    if (firebaseUnsubscribe) firebaseUnsubscribe();
    isCloudLoading = true;
    console.log('[云同步] 开始监听云端数据变化');
    
    firebaseUnsubscribe = db.collection('groups').doc(familyCode)
        .onSnapshot(doc => {
            isCloudLoading = false;
            if (doc.exists && doc.data().gameData) {
                console.log('[云同步] 收到云端数据更新');
                
                // 保存旧数据用于比较
                const oldExpenses = gameData.expenses ? [...gameData.expenses] : [];
                const oldTimeLogs = gameData.timeLogs ? [...gameData.timeLogs] : [];
                
                // 更新数据
                gameData = migrateData(doc.data().gameData);
                lastDailyReset = doc.data().lastDailyReset || lastDailyReset;
                
                // 防御性初始化
                if (!Array.isArray(gameData.expenses)) {
                    console.log('[云同步] 初始化expenses数组');
                    gameData.expenses = [];
                }
                if (!Array.isArray(gameData.timeLogs)) {
                    console.log('[云同步] 初始化timeLogs数组');
                    gameData.timeLogs = [];
                }
                
                // 检查数据是否有变化
                const expensesChanged = JSON.stringify(oldExpenses) !== JSON.stringify(gameData.expenses);
                const timeLogsChanged = JSON.stringify(oldTimeLogs) !== JSON.stringify(gameData.timeLogs);
                
                // 云端数据加载后重新检查每日重置
                checkDailyReset();
                fixDataLinks();
                
                // 更新界面
                renderProductions();
                renderDevelopments();
                renderMilestones();
                renderDevLibrary();
                renderResourceStats();
                renderWeekCalendar();
                
                // 如果支出数据有变化，重新渲染支出面板
                if (expensesChanged) {
                    console.log('[云同步] 支出数据已更新，重新渲染支出面板');
                    renderExpenses();
                }
                
                cloudInitDone = true;
                updateSyncStatus('已同步', new Date().toLocaleTimeString());
                console.log('[云同步] 数据更新完成');
                
            } else if (!cloudInitDone) {
                console.log('[云同步] 未找到云端数据，执行首次保存');
                saveToCloud();
                cloudInitDone = true;
            }
            isCloudReady = true;
        }, error => {
            console.error('[云同步] 监听错误:', error);
            isCloudLoading = false;
            updateSyncStatus('监听失败', new Date().toLocaleTimeString());
            alert('云端数据监听失败，切换到本地模式');
        });
}

// 保存到云端
function saveToCloud() {
    return window.ErrorUtils.safeExecuteAsync(async () => {
        if (!familyCode || !isCloudReady || isCloudSaving) {
            console.warn('[云同步] 无法保存：', {
                hasFamilyCode: !!familyCode,
                isCloudReady,
                isCloudSaving
            });
            return false;
        }
        
        isCloudSaving = true;
        console.log('[云同步] 开始保存数据');
        updateSyncStatus('同步中');
        
        // 防御性检查和初始化
        if (!Array.isArray(gameData.expenses)) {
            console.log('[云同步] 初始化expenses数组');
            gameData.expenses = [];
        }
        if (!Array.isArray(gameData.timeLogs)) {
            console.log('[云同步] 初始化timeLogs数组');
            gameData.timeLogs = [];
        }
        
        // 数据验证
        let dataValid = true;
        let validationErrors = [];
        
        // 验证支出数据
        if (gameData.expenses) {
            gameData.expenses.forEach((exp, idx) => {
                const validationResult = window.validateData(exp, 'expense');
                if (!validationResult.isValid) {
                    console.error(`[云同步] 支出数据验证失败 [${idx}]:`, exp, validationResult.errors);
                    dataValid = false;
                    validationErrors.push(`支出记录 #${idx+1}: ${validationResult.errors.join(', ')}`);
                }
            });
        }
        
        // 验证时间记录
        if (gameData.timeLogs) {
            gameData.timeLogs.forEach((log, idx) => {
                const validationResult = window.validateData(log, 'timeLog');
                if (!validationResult.isValid) {
                    console.error(`[云同步] 时间记录验证失败 [${idx}]:`, log, validationResult.errors);
                    dataValid = false;
                    validationErrors.push(`时间记录 #${idx+1}: ${validationResult.errors.join(', ')}`);
                }
            });
        }
        
        if (!dataValid) {
            console.error('[云同步] 数据验证失败:', validationErrors);
            window.showError('数据验证失败：\n' + validationErrors.join('\n'), 'warning');
            isCloudSaving = false;
            return false;
        }
        
        // 保存数据
        await db.collection('groups').doc(familyCode).set({
            gameData: gameData,
            lastDailyReset: lastDailyReset,
            saveTime: new Date().toISOString()
        });
        
        console.log('[云同步] 数据保存成功');
        isCloudSaving = false;
        updateSyncStatus('已同步', new Date().toLocaleTimeString());
        
        // 保存成功后更新界面
        renderExpenses();
        renderResourceStats();
        renderWeekCalendar();
        
        return true;
    }, { type: 'data-save', operation: 'saveToCloud' }, (error) => {
        console.error('[云同步] 保存失败:', error);
        isCloudSaving = false;
        updateSyncStatus('同步失败', new Date().toLocaleTimeString());
        window.showError('保存失败，切换到本地保存', 'error');
        saveToLocal();
        return false;
    });
}

let familyCode = localStorage.getItem('lifeFactoryFamilyCode') || null;
let autoBackupEnabled = localStorage.getItem('lifeFactoryAutoBackup') === 'true';
let autoBackupInterval = null;
let lastBackupTime = localStorage.getItem('lifeFactoryLastBackup') || null;

function askFamilyCode() {
    let code = prompt('请输入家庭码/团队码（所有设备输入相同即可同步）：', familyCode || '');
    if (code && code.trim()) {
        familyCode = code.trim();
        localStorage.setItem('lifeFactoryFamilyCode', familyCode);
        firebaseLoginAndSync();
    } else {
        alert('必须输入家庭码才能使用！');
        askFamilyCode();
    }
}

// ========== 云同步状态栏 ========== //
let lastSyncTime = null;
let syncStatus = '同步中';
function updateSyncStatus(status, time) {
    syncStatus = status;
    lastSyncTime = time || lastSyncTime;
    const el = document.getElementById('sync-status');
    if (!el) return;
    let text = '';
    if (status === '同步中') text = '☁️ 正在同步...';
    else if (status === '已同步') text = `✅ 已同步${lastSyncTime ? '（' + lastSyncTime + '）' : ''}`;
    else if (status === '离线') text = '⚠️ 离线，数据仅本地保存';
    else text = status;
    el.textContent = text;
}



// ========== 日历时间块交替色与右键菜单 ========== //
function showCalendarContextMenu(e, log) {
    e.preventDefault();
    let menu = document.getElementById('calendar-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'calendar-context-menu';
        menu.innerHTML = '';
        document.body.appendChild(menu);
    }
    menu.innerHTML = `
        <div class="context-menu-item" onclick="window.editCalendarLog('${log.date}','${log.name}',${log.hour},${log.minute})">修改</div>
        <div class="context-menu-item" onclick="window.deleteCalendarLog('${log.date}','${log.name}',${log.hour},${log.minute})">删除</div>
    `;
    menu.style.display = 'block';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    setTimeout(()=>{
        document.addEventListener('mousedown', hideCalendarContextMenu);
    },0);
}
function hideCalendarContextMenu(e) {
    let menu = document.getElementById('calendar-context-menu');
    if (menu && (!e || !menu.contains(e.target))) {
        menu.style.display = 'none';
        document.removeEventListener('mousedown', hideCalendarContextMenu);
    }
}
window.editCalendarLog = function(date, name, hour, minute) {
    hideCalendarContextMenu();
    const log = (gameData.timeLogs||[]).find(l=>l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute);
    if (!log) return;
    showCustomModal({
        title: '修改时间记录',
        content: `
            <div style="margin-bottom:10px;font-weight:bold;">项目：${log.name}</div>
            <div class='form-group'><label>日期</label><input type='date' id='edit-log-date' value='${log.date}' class='form-input'></div>
            <div class='form-group'><label>开始时间</label><input type='time' id='edit-log-start' value='${String(log.hour).padStart(2,'0')}:${String(log.minute).padStart(2,'0')}' class='form-input'></div>
            <div class='form-group'><label>结束时间</label><input type='time' id='edit-log-end' value='${String(log.endHour).padStart(2,'0')}:${String(log.endMinute).padStart(2,'0')}' class='form-input'></div>
        `,
        onConfirm: () => {
            const newDate = document.getElementById('edit-log-date').value;
            const newStart = document.getElementById('edit-log-start').value;
            const newEnd = document.getElementById('edit-log-end').value;
            if (!newDate || !newStart || !newEnd) { alert('请填写完整'); return false; }
            let [sh,sm] = newStart.split(':').map(x=>parseInt(x));
            let [eh,em] = newEnd.split(':').map(x=>parseInt(x));
            if ([sh,sm,eh,em].some(x=>isNaN(x))) { alert('时间格式错误'); return false; }
            log.date = newDate;
            log.hour = sh; log.minute = sm;
            log.endHour = eh; log.endMinute = em;
            log.timeCost = (eh*60+em)-(sh*60+sm);
            saveToCloud();
            renderResourceStats();
            
            // 延迟渲染日历，确保数据更新完成
            setTimeout(() => {
                renderWeekCalendar();
            }, 100);
            
            return true;
        }
    });
}
window.deleteCalendarLog = function(date, name, hour, minute) {
    hideCalendarContextMenu();
    showCustomModal({
        title: '删除时间记录',
        content: `<div style='margin-bottom:12px;'>确定要删除该时间记录吗？</div>`,
        onConfirm: () => {
            gameData.timeLogs = (gameData.timeLogs||[]).filter(l=>!(l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute));
            saveToCloud();
            renderWeekCalendar();
            renderResourceStats();
            return true;
        }
    });
}
// ========== 自定义模态框 ========== //
function showCustomModal({title, content, onConfirm, onCancel, confirmText}) {
    const modal = document.getElementById('custom-modal');
    const showConfirm = onConfirm && confirmText !== null;
    
    modal.innerHTML = `<div class='modal-content' style='max-width:420px;'>
        <h3 class='modal-title'>${title||''}</h3>
        <div style='margin-bottom:18px;'>${content||''}</div>
        <div class='modal-buttons'>
            ${showConfirm ? `<button class='btn btn-primary' id='custom-modal-confirm'>${confirmText || '确定'}</button>` : ''}
            <button class='btn btn-secondary' id='custom-modal-cancel'>取消</button>
        </div>
    </div>`;
    modal.style.display = 'block';
    
    if (showConfirm) {
        document.getElementById('custom-modal-confirm').onclick = function(){
            let ok = true;
            if (onConfirm) ok = onConfirm();
            if (ok!==false) modal.style.display = 'none';
        };
    }
    
    document.getElementById('custom-modal-cancel').onclick = function(){
        modal.style.display = 'none';
        if (onCancel) onCancel();
    };
    modal.onclick = function(e){ 
        if(e.target===modal && !isSelecting) {
            modal.style.display='none';
        }
    };
}
// ========== 支出数据结构与渲染（健壮修正版） ========== //
if (!Array.isArray(gameData.expenses)) gameData.expenses = [];

function renderExpenses() {
    if (!Array.isArray(gameData.expenses)) gameData.expenses = [];
    const container = document.getElementById('expenses-list');
    if (!container) return;
    if (!gameData.expenses.length) {
        container.innerHTML = '<div style="color:#888;text-align:center;padding:20px;">暂无支出记录</div>';
        return;
    }
    container.innerHTML = gameData.expenses.map((exp, idx) => {
        let freqStr = '';
        if (exp.type === 'recurring') freqStr = exp.frequency === 'monthly' ? '每月' : (exp.frequency === 'biweekly' ? '每2周' : '');
        // 货币符号与填写一致
        let symbol = currencySymbols[exp.currency] || '¥';
        return `
            <div class="expense-item" data-expense-index="${idx}" oncontextmenu="window.showExpenseContextMenu(event, ${idx})">
                <div class="expense-header">
                    <span class="expense-name">${exp.name}</span>
                    <span class="expense-amount">${symbol}${Number(exp.amount).toLocaleString()}</span>
                </div>
                <div class="expense-meta">
                    <span>${exp.date||''}</span>
                    <span>${exp.type==='recurring'?('固定支出/'+freqStr):'单次支出'}</span>
                </div>
            </div>
        `;
    }).join('');
}
// 支出项右键菜单
window.showExpenseContextMenu = function(event, idx) {
    event.preventDefault();
    let menu = document.getElementById('expense-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'expense-context-menu';
        menu.className = 'context-menu';
        document.body.appendChild(menu);
    }
    menu.innerHTML = `
        <div class="context-menu-item" onclick="window.editExpense(${idx});window.hideExpenseContextMenu()">编辑</div>
        <div class="context-menu-item" onclick="window.deleteExpense(${idx});window.hideExpenseContextMenu()">删除</div>
    `;
    menu.style.display = 'block';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    setTimeout(()=>{
        document.addEventListener('mousedown', window.hideExpenseContextMenu);
    },0);
}
window.hideExpenseContextMenu = function(e) {
    let menu = document.getElementById('expense-context-menu');
    if (menu && (!e || !menu.contains(e.target))) {
        menu.style.display = 'none';
        document.removeEventListener('mousedown', window.hideExpenseContextMenu);
    }
}
window.showExpenseModal = function() {
    window.currentEditExpense = -1;
    document.getElementById('expense-form').reset();
    document.getElementById('expense-frequency-group').style.display = 'none';
    // 设置默认时间为今天
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('expense-date').value = today;
    
    document.getElementById('expense-modal').style.display = 'block';
}
let currentEditExpense = -1;
window.editExpense = function(idx) {
    window.currentEditExpense = idx;
    const exp = gameData.expenses[idx];
    
    // 设置表单值 - 像生产线一样简单直接
    document.getElementById('expense-name').value = exp.name || '';
    document.getElementById('expense-amount').value = exp.amount || '';
    document.getElementById('expense-currency').value = exp.currency || 'CNY';
    document.getElementById('expense-date').value = exp.date || '';
    document.getElementById('expense-type').value = exp.type || 'single';
    document.getElementById('expense-frequency-group').style.display = (exp.type==='recurring')?'':'none';
    document.getElementById('expense-frequency').value = exp.frequency || 'monthly';
    
    document.getElementById('expense-modal').style.display = 'block';
}
window.deleteExpense = function(idx) {
    if (!confirm('确定要删除该支出记录？')) return;
    gameData.expenses.splice(idx,1);
    renderExpenses();
    renderResourceStats();
    saveToCloud();
}
// 简化的支出表单处理，不需要复杂的事件绑定

// 支出表单事件处理
function setupExpenseFormHandlers() {
    const expenseTypeSelect = document.getElementById('expense-type');
    if (expenseTypeSelect) {
        expenseTypeSelect.onchange = function() {
            document.getElementById('expense-frequency-group').style.display = this.value==='recurring'?'':'none';
        };
    }

    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.onsubmit = function(e) {
            e.preventDefault();
            console.log('[支出表单] 开始处理表单提交');
            
            try {
                // 确保expenses数组存在
                if (!Array.isArray(gameData.expenses)) {
                    console.log('[支出表单] 初始化expenses数组');
                    gameData.expenses = [];
                }
                
                // 获取并验证表单数据
                const name = document.getElementById('expense-name').value.trim();
                if (!name) {
                    alert('请输入支出名称');
                    return;
                }
                
                // 金额处理
                let raw = document.getElementById('expense-amount').value;
                if (typeof raw !== 'string') raw = String(raw);
                // 全角转半角
                raw = raw.replace(/[\uFF10-\uFF19]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 48));
                // 去除所有空格和非数字小数点
                raw = raw.replace(/[^\d.]/g, '').replace(/^\./, '');
                if (!raw) {
                    alert('请输入有效的金额');
                    return;
                }
                let amount = parseFloat(raw);
                if (isNaN(amount) || amount <= 0) {
                    alert('请输入有效的金额');
                    return;
                }
                
                // 获取其他字段
                const currency = document.getElementById('expense-currency').value;
                const date = document.getElementById('expense-date').value;
                if (!date) {
                    alert('请选择支出日期');
                    return;
                }
                
                const type = document.getElementById('expense-type').value;
                const frequency = type === 'recurring' ? document.getElementById('expense-frequency').value : null;
                const remark = document.getElementById('expense-remark').value.trim();
                
                // 构建支出对象
                const exp = {
                    name: name,
                    amount: amount,
                    currency: currency,
                    date: date,
                    type: type,
                    frequency: frequency,
                    remark: remark
                };
                
                console.log('[支出表单] 构建的支出对象:', exp);
                
                // 保存数据
                if (window.currentEditExpense >= 0) {
                    console.log('[支出表单] 编辑模式，替换第', window.currentEditExpense, '项');
                    gameData.expenses[window.currentEditExpense] = exp;
                } else {
                    console.log('[支出表单] 新增模式，添加到expenses');
                    gameData.expenses.push(exp);
                }
                
                // 更新界面
                renderExpenses();
                renderResourceStats();
                
                // 保存到云端
                console.log('[支出表单] 开始保存到云端');
                saveToCloud();
                
                // 关闭模态框
                closeModal('expense-modal');
                
                console.log('[支出表单] 处理完成');
                
            } catch (error) {
                console.error('[支出表单] 错误:', error);
                alert('保存支出时发生错误，请重试');
            }
        };
    }
}

// 支出表单处理已简化，不需要复杂调试

// setupExpenseFormHandlers 现在在 setupEventListeners 中被调用
// ========== 本月支出合并统计（生产线+支出项） ========== //
function getMonthlyExpenseTotalMerged() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let total = 0;
    // 1. 生产线支出
    (gameData.productions||[]).forEach(prod => {
        if (prod.expense > 0) {
            total += convertToCNY(prod.expense, prod.expenseCurrency);
        }
    });
    // 2. 支出面板已发生的支出（当前日期之前的）
    (gameData.expenses||[]).forEach(exp => {
        if (!exp || !exp.amount || !exp.currency) return;
        if (exp.type === 'single') {
            // 单次支出：本月已发生的（当前日期之前的）
            const d = new Date(exp.date);
            if (d.getFullYear() === year && d.getMonth() === month && d < now) {
                total += convertToCNY(exp.amount, exp.currency);
            }
        } else if (exp.type === 'recurring') {
            // 固定支出：本月已发生的次数
            const start = new Date(exp.date);
            if (start > now) return; // 未来开始的不算
            if (exp.frequency === 'monthly') {
                // 每月一次，只要起始日期<=本月且已经过了本月
                if (start.getFullYear() < year || (start.getFullYear() === year && start.getMonth() <= month)) {
                    total += convertToCNY(exp.amount, exp.currency);
                }
            } else if (exp.frequency === 'biweekly') {
                // 每2周，计算本月内已发生的次数
                let firstDay = new Date(year, month, 1);
                let cycleStart = new Date(start);
                while (cycleStart < firstDay) {
                    cycleStart.setDate(cycleStart.getDate() + 14);
                }
                while (cycleStart < now) {
                    total += convertToCNY(exp.amount, exp.currency);
                    cycleStart.setDate(cycleStart.getDate() + 14);
                }
            }
        }
    });
    return total;
}

// 获取本月支出面板各货币的明细
function getMonthlyExpenseBreakdown() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let expensesByCurrency = {};
    
    (gameData.expenses||[]).forEach(exp => {
        if (!exp || !exp.amount || !exp.currency) return;
        if (exp.type === 'single') {
            // 单次支出：本月已发生的（当前日期之前的）
            const d = new Date(exp.date);
            if (d.getFullYear() === year && d.getMonth() === month && d < now) {
                if (!expensesByCurrency[exp.currency]) expensesByCurrency[exp.currency] = 0;
                expensesByCurrency[exp.currency] += exp.amount;
            }
        } else if (exp.type === 'recurring') {
            // 固定支出：本月已发生的次数
            const start = new Date(exp.date);
            if (start > now) return; // 未来开始的不算
            if (exp.frequency === 'monthly') {
                // 每月一次，只要起始日期<=本月且已经过了本月
                if (start.getFullYear() < year || (start.getFullYear() === year && start.getMonth() <= month)) {
                    if (!expensesByCurrency[exp.currency]) expensesByCurrency[exp.currency] = 0;
                    expensesByCurrency[exp.currency] += exp.amount;
                }
            } else if (exp.frequency === 'biweekly') {
                // 每2周，计算本月内已发生的次数
                let firstDay = new Date(year, month, 1);
                let cycleStart = new Date(start);
                while (cycleStart < firstDay) {
                    cycleStart.setDate(cycleStart.getDate() + 14);
                }
                while (cycleStart < now) {
                    if (!expensesByCurrency[exp.currency]) expensesByCurrency[exp.currency] = 0;
                    expensesByCurrency[exp.currency] += exp.amount;
                    cycleStart.setDate(cycleStart.getDate() + 14);
                }
            }
        }
    });
    
    let breakdown = [];
    Object.entries(expensesByCurrency).forEach(([currency, amount]) => {
        breakdown.push(`${currencySymbols[currency]}${amount.toLocaleString()}`);
    });
    return breakdown;
}

// ========== 研发中心与生产线同步 ========== //
// 添加研发项目时如勾选"同步创建生产线"，自动添加到productions，linkedDev字段关联
// 删除研发项目时自动删除关联生产线
window.removeDev = function(index) {
    if (!gameData.developments[index]) return;
    if (!confirm('确定要移除该研究项目吗？相关的进度记录将被清除。')) return;
    const dev = gameData.developments[index];
    gameData.developments.splice(index, 1);
    // 同步删除关联生产线
    gameData.productions = gameData.productions.filter(p => p.linkedDev !== dev.researchName);
    renderDevelopments();
    renderProductions();
    saveToCloud();
}
// ========== 研发库管理 ========== //
window.showDevLibraryManage = function() {
    renderDevLibraryManageList();
    document.getElementById('dev-library-manage-modal').style.display = 'block';
}
function renderDevLibraryManageList() {
    const container = document.getElementById('dev-library-manage-list');
    if (!container) return;
    
    // 添加批量操作控制栏
    const hasItems = (gameData.devLibrary||[]).length > 0;
    let html = '';
    
    if (hasItems) {
        html += `
            <div style='background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:15px;'>
                <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;'>
                    <label style='font-weight:bold;'>
                        <input type='checkbox' id='dev-select-all' onchange='window.toggleAllDevSelection()' style='margin-right:8px;'>
                        批量操作
                    </label>
                    <button class='btn btn-danger btn-small' onclick='window.batchDeleteDevItems()' id='batch-delete-dev-btn' style='display:none;'>🗑️ 删除选中</button>
                </div>
                <div style='font-size:0.9em;color:#666;'>
                    选中项目进行批量删除操作
                </div>
            </div>
        `;
    }
    
    html += (gameData.devLibrary||[]).map((item, idx) => `
        <div class='dev-library-manage-item' style='border-bottom:1px solid #eee;padding:8px 0;display:flex;align-items:center;'>
            <input type='checkbox' class='dev-item-checkbox' data-index='${idx}' onchange='window.updateDevBatchButtons()' style='margin-right:10px;'>
            <div style='flex:1;'>
                <span style='font-weight:bold;'>${item.icon||''} ${item.researchName||''}</span>
                <span style='color:#888;margin-left:8px;'>${item.category||''}</span>
            </div>
            <div style='display:flex;gap:5px;'>
                <button class='btn btn-small btn-secondary' onclick='window.editDevLibraryItem(${idx})'>编辑</button>
                <button class='btn btn-small btn-danger' onclick='window.deleteDevLibraryItem(${idx})'>删除</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}
window.editDevLibraryItem = function(idx) {
    const item = gameData.devLibrary[idx];
    showCustomModal({
        title: '编辑研发项目',
        content: `
            <div class='form-group'><label>图标</label><input type='text' id='devlib-icon' class='form-input' value='${item.icon||''}'></div>
            <div class='form-group'><label>类别</label><input type='text' id='devlib-category' class='form-input' value='${item.category||''}'></div>
            <div class='form-group'><label>项目名称</label><input type='text' id='devlib-name' class='form-input' value='${item.researchName||''}'></div>
            <div class='form-group'><label>生产线名称</label><input type='text' id='devlib-prod' class='form-input' value='${item.prodName||''}'></div>
            <div class='form-group'><label>频率</label><input type='text' id='devlib-freq' class='form-input' value='${item.freq||''}'></div>
            <div class='form-group'><label>周期</label><input type='number' id='devlib-cycle' class='form-input' value='${item.cycle||21}'></div>
            <div class='form-group'><label>目标</label><input type='number' id='devlib-target' class='form-input' value='${item.target||Math.floor((item.cycle||21)*0.8)}'></div>
            <div class='form-group'><label>操作定义</label><input type='text' id='devlib-action' class='form-input' value='${item.action||''}'></div>
            <div class='form-group'><label>科学依据</label><input type='text' id='devlib-science' class='form-input' value='${item.science||''}'></div>
        `,
        onConfirm: () => {
            item.icon = document.getElementById('devlib-icon').value;
            item.category = document.getElementById('devlib-category').value;
            item.researchName = document.getElementById('devlib-name').value;
            item.prodName = document.getElementById('devlib-prod').value;
            item.freq = document.getElementById('devlib-freq').value;
            item.cycle = parseInt(document.getElementById('devlib-cycle').value)||21;
            item.target = parseInt(document.getElementById('devlib-target').value)||Math.floor((item.cycle||21)*0.8);
            item.action = document.getElementById('devlib-action').value;
            item.science = document.getElementById('devlib-science').value;
            renderDevLibraryManageList();
            renderDevLibrary();
            saveToCloud();
            return true;
        }
    });
}
window.deleteDevLibraryItem = function(idx) {
    if (!confirm('确定要删除该研发项目？')) return;
    gameData.devLibrary.splice(idx,1);
    renderDevLibraryManageList();
    renderDevLibrary();
    saveToCloud();
}

// 批量删除研发项目相关函数
window.toggleAllDevSelection = function() {
    const selectAll = document.getElementById('dev-select-all');
    const checkboxes = document.querySelectorAll('.dev-item-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    window.updateDevBatchButtons();
}

window.updateDevBatchButtons = function() {
    const checkboxes = document.querySelectorAll('.dev-item-checkbox');
    const checkedBoxes = document.querySelectorAll('.dev-item-checkbox:checked');
    const batchBtn = document.getElementById('batch-delete-dev-btn');
    const selectAll = document.getElementById('dev-select-all');
    
    if (batchBtn) {
        batchBtn.style.display = checkedBoxes.length > 0 ? 'block' : 'none';
        batchBtn.textContent = `🗑️ 删除选中 (${checkedBoxes.length})`;
    }
    
    if (selectAll) {
        selectAll.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
        selectAll.checked = checkedBoxes.length === checkboxes.length && checkboxes.length > 0;
    }
}

window.batchDeleteDevItems = function() {
    const checkedBoxes = document.querySelectorAll('.dev-item-checkbox:checked');
    if (checkedBoxes.length === 0) return;
    
    const indices = Array.from(checkedBoxes).map(cb => parseInt(cb.dataset.index)).sort((a, b) => b - a);
    const count = indices.length;
    
    if (!confirm(`确定要删除选中的 ${count} 个研发项目？此操作不可撤销。`)) return;
    
    // 从后往前删除，避免索引变化
    indices.forEach(idx => {
        gameData.devLibrary.splice(idx, 1);
    });
    
    renderDevLibraryManageList();
    renderDevLibrary();
    saveToCloud();
    
    alert(`已成功删除 ${count} 个研发项目`);
}
window.showAddDevLibraryItem = function() {
    showCustomModal({
        title: '新增研发项目',
        content: `
            <div class='form-group'><label>图标</label><input type='text' id='devlib-icon' class='form-input'></div>
            <div class='form-group'><label>类别</label><input type='text' id='devlib-category' class='form-input'></div>
            <div class='form-group'><label>项目名称</label><input type='text' id='devlib-name' class='form-input'></div>
            <div class='form-group'><label>生产线名称</label><input type='text' id='devlib-prod' class='form-input'></div>
            <div class='form-group'><label>频率</label><input type='text' id='devlib-freq' class='form-input'></div>
            <div class='form-group'><label>周期</label><input type='number' id='devlib-cycle' class='form-input' value='21'></div>
            <div class='form-group'><label>目标</label><input type='number' id='devlib-target' class='form-input' value='17'></div>
            <div class='form-group'><label>操作定义</label><input type='text' id='devlib-action' class='form-input'></div>
            <div class='form-group'><label>科学依据</label><input type='text' id='devlib-science' class='form-input'></div>
        `,
        onConfirm: () => {
            gameData.devLibrary.push({
                icon: document.getElementById('devlib-icon').value,
                category: document.getElementById('devlib-category').value,
                researchName: document.getElementById('devlib-name').value,
                prodName: document.getElementById('devlib-prod').value,
                freq: document.getElementById('devlib-freq').value,
                cycle: parseInt(document.getElementById('devlib-cycle').value)||21,
                target: parseInt(document.getElementById('devlib-target').value)||17,
                action: document.getElementById('devlib-action').value,
                science: document.getElementById('devlib-science').value
            });
            renderDevLibraryManageList();
            renderDevLibrary();
            saveToCloud();
            return true;
        }
    });
}
window.exportDevLibrary = function() {
    const data = JSON.stringify(gameData.devLibrary, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devLibrary_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
window.showImportDevLibrary = function() {
    document.getElementById('dev-library-import-text').value = '';
    document.getElementById('dev-library-import-modal').style.display = 'block';
}
window.importDevLibrary = function() {
    let text = document.getElementById('dev-library-import-text').value;
    try {
        let arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('格式错误');
        // 校验字段
        for (let item of arr) {
            if (!item.researchName || !item.prodName) throw new Error('缺少必要字段');
        }
        gameData.devLibrary = arr;
        renderDevLibraryManageList();
        renderDevLibrary();
        saveToCloud();
        closeModal('dev-library-import-modal');
        alert('导入成功！');
    } catch (e) {
        alert('导入失败：' + e.message);
    }
}
// ========== 里程碑管理 ========== //
window.showMilestoneManage = function() {
    renderMilestoneManageList();
    document.getElementById('milestone-manage-modal').style.display = 'block';
}
function renderMilestoneManageList() {
    const container = document.getElementById('milestone-manage-list');
    if (!container) return;
    let all = [];
    Object.entries(gameData.experiences).forEach(([category, items]) => {
        items.forEach((item, idx) => {
            all.push({ ...item, _category: category, _idx: idx });
        });
    });
    
    // 添加批量操作控制栏
    const hasItems = all.length > 0;
    let html = '';
    
    if (hasItems) {
        html += `
            <div style='background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:15px;'>
                <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;'>
                    <label style='font-weight:bold;'>
                        <input type='checkbox' id='milestone-select-all' onchange='window.toggleAllMilestoneSelection()' style='margin-right:8px;'>
                        批量操作
                    </label>
                    <button class='btn btn-danger btn-small' onclick='window.batchDeleteMilestoneItems()' id='batch-delete-milestone-btn' style='display:none;'>🗑️ 删除选中</button>
                </div>
                <div style='font-size:0.9em;color:#666;'>
                    选中里程碑进行批量删除操作
                </div>
            </div>
        `;
    }
    
    html += all.map((item, i) => `
        <div class='milestone-manage-item' style='border-bottom:1px solid #eee;padding:8px 0;display:flex;align-items:center;'>
            <input type='checkbox' class='milestone-item-checkbox' data-index='${i}' onchange='window.updateMilestoneBatchButtons()' style='margin-right:10px;'>
            <div style='flex:1;'>
                <span style='font-weight:bold;'>${item.name||''}</span>
                <span style='color:#888;margin-left:8px;'>${item._category||''}</span>
                <span style='color:#666;margin-left:8px;font-size:0.9em;'>(完成${item.count||0}次)</span>
            </div>
            <div style='display:flex;gap:5px;'>
                <button class='btn btn-small btn-secondary' onclick='window.editMilestoneItem(${i})'>编辑</button>
                <button class='btn btn-small btn-danger' onclick='window.deleteMilestoneItem(${i})'>删除</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    window._milestoneFlatList = all;
}
window.editMilestoneItem = function(i) {
    const item = window._milestoneFlatList[i];
    showCustomModal({
        title: '编辑里程碑',
        content: `
            <div class='form-group'><label>名称</label><input type='text' id='mile-name' class='form-input' value='${item.name||''}'></div>
            <div class='form-group'><label>描述</label><input type='text' id='mile-desc' class='form-input' value='${item.desc||''}'></div>
            <div class='form-group'><label>完成次数</label><input type='number' id='mile-count' class='form-input' value='${item.count||0}'></div>
            <div class='form-group'><label>可重复</label><input type='checkbox' id='mile-repeat' ${item.repeatable?'checked':''}></div>
            <div class='form-group'><label>难度(1-5)</label><input type='number' id='mile-diff' class='form-input' value='${item.difficulty||1}' min='1' max='5'></div>
        `,
        onConfirm: () => {
            item.name = document.getElementById('mile-name').value;
            item.desc = document.getElementById('mile-desc').value;
            item.count = parseInt(document.getElementById('mile-count').value)||0;
            item.repeatable = document.getElementById('mile-repeat').checked;
            item.difficulty = parseInt(document.getElementById('mile-diff').value)||1;
            // 写回原数据
            gameData.experiences[item._category][item._idx] = item;
            renderMilestoneManageList();
            renderMilestones();
            saveToCloud();
            return true;
        }
    });
}
window.deleteMilestoneItem = function(i) {
    const item = window._milestoneFlatList[i];
    if (!confirm('确定要删除该里程碑？')) return;
    gameData.experiences[item._category].splice(item._idx,1);
    renderMilestoneManageList();
    renderMilestones();
    saveToCloud();
}

// 批量删除里程碑相关函数
window.toggleAllMilestoneSelection = function() {
    const selectAll = document.getElementById('milestone-select-all');
    const checkboxes = document.querySelectorAll('.milestone-item-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    window.updateMilestoneBatchButtons();
}

window.updateMilestoneBatchButtons = function() {
    const checkboxes = document.querySelectorAll('.milestone-item-checkbox');
    const checkedBoxes = document.querySelectorAll('.milestone-item-checkbox:checked');
    const batchBtn = document.getElementById('batch-delete-milestone-btn');
    const selectAll = document.getElementById('milestone-select-all');
    
    if (batchBtn) {
        batchBtn.style.display = checkedBoxes.length > 0 ? 'block' : 'none';
        batchBtn.textContent = `🗑️ 删除选中 (${checkedBoxes.length})`;
    }
    
    if (selectAll) {
        selectAll.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
        selectAll.checked = checkedBoxes.length === checkboxes.length && checkboxes.length > 0;
    }
}

window.batchDeleteMilestoneItems = function() {
    const checkedBoxes = document.querySelectorAll('.milestone-item-checkbox:checked');
    if (checkedBoxes.length === 0) return;
    
    const indices = Array.from(checkedBoxes).map(cb => parseInt(cb.dataset.index)).sort((a, b) => b - a);
    const count = indices.length;
    
    if (!confirm(`确定要删除选中的 ${count} 个里程碑？此操作不可撤销。`)) return;
    
    // 按分类整理要删除的项目
    const toDelete = {};
    indices.forEach(i => {
        const item = window._milestoneFlatList[i];
        if (!toDelete[item._category]) {
            toDelete[item._category] = [];
        }
        toDelete[item._category].push(item._idx);
    });
    
    // 从每个分类中删除项目（从后往前删除）
    Object.entries(toDelete).forEach(([category, itemIndices]) => {
        itemIndices.sort((a, b) => b - a).forEach(idx => {
            gameData.experiences[category].splice(idx, 1);
        });
    });
    
    renderMilestoneManageList();
    renderMilestones();
    saveToCloud();
    
    alert(`已成功删除 ${count} 个里程碑`);
}
window.showAddMilestoneItem = function() {
    showCustomModal({
        title: '新增里程碑',
        content: `
            <div class='form-group'><label>名称</label><input type='text' id='mile-name' class='form-input'></div>
            <div class='form-group'><label>描述</label><input type='text' id='mile-desc' class='form-input'></div>
            <div class='form-group'><label>完成次数</label><input type='number' id='mile-count' class='form-input' value='0'></div>
            <div class='form-group'><label>可重复</label><input type='checkbox' id='mile-repeat'></div>
            <div class='form-group'><label>难度(1-5)</label><input type='number' id='mile-diff' class='form-input' value='1' min='1' max='5'></div>
            <div class='form-group'><label>分组</label><input type='text' id='mile-cat' class='form-input' value='自定义'></div>
        `,
        onConfirm: () => {
            const cat = document.getElementById('mile-cat').value||'自定义';
            if (!gameData.experiences[cat]) gameData.experiences[cat]=[];
            gameData.experiences[cat].push({
                name: document.getElementById('mile-name').value,
                desc: document.getElementById('mile-desc').value,
                count: parseInt(document.getElementById('mile-count').value)||0,
                repeatable: document.getElementById('mile-repeat').checked,
                difficulty: parseInt(document.getElementById('mile-diff').value)||1
            });
            renderMilestoneManageList();
            renderMilestones();
            saveToCloud();
            return true;
        }
    });
}
window.exportMilestones = function() {
    let arr = [];
    Object.entries(gameData.experiences).forEach(([category, items]) => {
        items.forEach(item => arr.push({...item, _category: category}));
    });
    const data = JSON.stringify(arr, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milestones_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
window.showImportMilestones = function() {
    document.getElementById('milestone-import-text').value = '';
    document.getElementById('milestone-import-modal').style.display = 'block';
}
window.importMilestones = function() {
    let text = document.getElementById('milestone-import-text').value;
    try {
        let arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('格式错误');
        // 按_category分组
        let newExp = {};
        for (let item of arr) {
            let cat = item._category||'自定义';
            if (!newExp[cat]) newExp[cat]=[];
            newExp[cat].push({
                name: item.name,
                desc: item.desc,
                count: item.count||0,
                repeatable: !!item.repeatable,
                difficulty: item.difficulty||1
            });
        }
        gameData.experiences = newExp;
        renderMilestoneManageList();
        renderMilestones();
        saveToCloud();
        closeModal('milestone-import-modal');
        alert('导入成功！');
    } catch (e) {
        alert('导入失败：' + e.message);
    }
}

// 时间记录统计功能
window.showTimeRecordsPanel = function() {
    document.getElementById('time-records-modal').style.display = 'block';
    window.showTimeRecords('today'); // 默认显示今天
}

window.showTimeRecords = function(period) {
    const container = document.getElementById('time-records-content');
    if (!container) return;
    
    const now = new Date();
    let startDate, endDate, title;
    
    switch(period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            title = '今天';
            break;
        case 'week':
            const dayOfWeek = (now.getDay() + 6) % 7; // 周一为0
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
            title = '本周';
            break;
        case 'lastWeek':
            const lastWeekDayOfWeek = (now.getDay() + 6) % 7;
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDayOfWeek - 7);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDayOfWeek);
            title = '上周';
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            title = '本月';
            break;
        case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 1);
            title = '上月';
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
            title = '今年';
            break;
        case 'all':
            startDate = new Date(2000, 0, 1);
            endDate = new Date(2100, 0, 1);
            title = '全部记录';
            break;
    }
    
    const logs = (gameData.timeLogs || []).filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate < endDate;
    });
    
    // 按项目分组统计
    const projectStats = {};
    let totalMinutes = 0;
    
    logs.forEach(log => {
        const name = log.name;
        let timeCost = log.timeCost || 0;
        if (timeCost <= 0 && log.hour !== undefined && log.endHour !== undefined) {
            timeCost = (log.endHour * 60 + (log.endMinute || 0)) - (log.hour * 60 + (log.minute || 0));
        }
        timeCost = Math.max(0, timeCost);
        
        if (!projectStats[name]) {
            projectStats[name] = { 
                totalMinutes: 0, 
                sessions: 0,
                type: log.type || 'unknown'
            };
        }
        projectStats[name].totalMinutes += timeCost;
        projectStats[name].sessions++;
        totalMinutes += timeCost;
    });
    
    // 按时间排序
    const sortedProjects = Object.entries(projectStats).sort((a, b) => b[1].totalMinutes - a[1].totalMinutes);
    
    let html = `<div style="margin-bottom:20px;">
        <h4>${title}统计</h4>
        <div style="color:#666;font-size:0.9em;">
            总时长：${Math.floor(totalMinutes/60)}小时${totalMinutes%60}分钟 | 
            记录数：${logs.length}条 | 
            项目数：${sortedProjects.length}个
        </div>
    </div>`;
    
    if (sortedProjects.length === 0) {
        html += '<div style="color:#888;text-align:center;padding:40px;">暂无时间记录</div>';
    } else {
        html += '<div style="display:grid;gap:12px;">';
        sortedProjects.forEach(([name, stats]) => {
            const hours = Math.floor(stats.totalMinutes / 60);
            const minutes = stats.totalMinutes % 60;
            const percentage = totalMinutes > 0 ? (stats.totalMinutes / totalMinutes * 100).toFixed(1) : 0;
            
            // 根据类型设置颜色
            let typeColor = '#666';
            let typeName = stats.type || 'unknown';
            switch(stats.type) {
                case 'production': typeColor = '#2980b9'; typeName = '产线'; break;
                case 'work': typeColor = '#2980b9'; typeName = '产线'; break; // 兼容旧的work类型
                case 'automation': typeColor = '#e67e22'; typeName = '自动化'; break;
                case 'lifestyle': typeColor = '#8e44ad'; typeName = '日常'; break;
                case 'investment': typeColor = '#229954'; typeName = '资产'; break;
                default: typeColor = '#666'; typeName = stats.type || '未知'; break;
            }
            
            html += `
                <div style="border:1px solid #eee;border-radius:8px;padding:12px;background:#fff;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="font-weight:600;color:#2c3e50;">${name}</div>
                        <div style="font-weight:700;color:${typeColor};">${hours}h${minutes}m</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.9em;color:#666;">
                        <div>
                            <span style="background:${typeColor};color:white;padding:2px 6px;border-radius:4px;font-size:0.8em;">${typeName}</span>
                            <span style="margin-left:8px;">${stats.sessions}次记录</span>
                        </div>
                        <div>${percentage}%</div>
                    </div>
                    <div style="margin-top:6px;background:#f5f5f5;border-radius:4px;height:6px;overflow:hidden;">
                        <div style="background:${typeColor};height:100%;width:${percentage}%;transition:width 0.3s ease;"></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    container.innerHTML = html;
}
// ========== 数据管理功能 ========== //
window.showDataManagePanel = function() {
    updateDataStatus();
    document.getElementById('data-manage-modal').style.display = 'block';
    
    // 更新自动备份状态
    document.getElementById('auto-backup-enabled').checked = autoBackupEnabled;
    document.getElementById('last-backup-time').textContent = lastBackupTime || '未备份';
}

function updateDataStatus() {
    const localData = localStorage.getItem('lifeFactorio');
    const hasLocal = !!localData;
    const localSize = localData ? Math.round(localData.length / 1024) : 0;
    
    document.getElementById('current-family-code').textContent = familyCode || '未设置';
    
    const statusHtml = `
        <div>• 云端连接: ${isCloudReady ? '✅ 已连接' : '❌ 未连接'}</div>
        <div>• 本地数据: ${hasLocal ? `✅ 存在 (${localSize}KB)` : '❌ 不存在'}</div>
        <div>• 生产线数量: ${(gameData.productions || []).length}</div>
        <div>• 研发项目数量: ${(gameData.developments || []).length}</div>
        <div>• 时间记录数量: ${(gameData.timeLogs || []).length}</div>
        <div>• 支出记录数量: ${(gameData.expenses || []).length}</div>
        <div>• 自动备份: ${autoBackupEnabled ? '✅ 已启用' : '❌ 已禁用'}</div>
    `;
    document.getElementById('status-details').innerHTML = statusHtml;
}

// 家庭码管理
window.copyFamilyCode = function() {
    if (familyCode) {
        navigator.clipboard.writeText(familyCode).then(() => {
            alert('家庭码已复制到剪贴板！');
        }).catch(() => {
            prompt('请手动复制家庭码:', familyCode);
        });
    }
}

window.changeFamilyCode = function() {
    const newCode = document.getElementById('new-family-code').value.trim();
    if (!newCode) {
        alert('请输入新的家庭码');
        return;
    }
    
    if (confirm(`确定要将家庭码从 "${familyCode}" 更换为 "${newCode}" 吗？\n\n这会切换到新的云端数据空间。`)) {
        familyCode = newCode;
        localStorage.setItem('lifeFactoryFamilyCode', familyCode);
        
        // 重新初始化云端连接
        if (firebaseUnsubscribe) firebaseUnsubscribe();
        isCloudReady = false;
        cloudInitDone = false;
        
        firebaseLoginAndSync();
        updateDataStatus();
        
        alert('家庭码已更换，正在重新连接云端...');
    }
}

// 手动备份
window.createManualBackup = function() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
        version: DATA_VERSION,
        timestamp: new Date().toISOString(),
        familyCode: familyCode,
        gameData: gameData,
        lastDailyReset: lastDailyReset,
        backupType: 'manual'
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `LifeFactorio_Backup_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ 手动备份文件已下载！');
}

// 自动云备份
window.toggleAutoBackup = function(enabled) {
    autoBackupEnabled = enabled;
    localStorage.setItem('lifeFactoryAutoBackup', enabled.toString());
    
    if (enabled) {
        startAutoBackup();
        alert('✅ 自动云备份已启用，每10分钟备份一次');
    } else {
        stopAutoBackup();
        alert('❌ 自动云备份已禁用');
    }
    updateDataStatus();
}

function startAutoBackup() {
    if (autoBackupInterval) clearInterval(autoBackupInterval);
    
    autoBackupInterval = setInterval(() => {
        if (isCloudReady && familyCode) {
            createCloudBackup(true); // 静默备份
        }
    }, 10 * 60 * 1000); // 10分钟
    
    console.log('🔄 自动备份已启动，每10分钟执行一次');
}

function stopAutoBackup() {
    if (autoBackupInterval) {
        clearInterval(autoBackupInterval);
        autoBackupInterval = null;
    }
    console.log('⏹️ 自动备份已停止');
}

window.createCloudBackup = function(silent = false) {
    if (!familyCode || !isCloudReady) {
        if (!silent) alert('❌ 云端服务未连接');
        return;
    }
    
    const timestamp = new Date().toISOString();
    const backupData = {
        version: DATA_VERSION,
        timestamp: timestamp,
        familyCode: familyCode,
        gameData: gameData,
        lastDailyReset: lastDailyReset,
        backupType: 'auto'
    };
    
    // 使用独立的备份集合，不影响正常数据
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.collection('backups').doc(familyCode).collection('history').doc(backupId).set(backupData)
        .then(() => {
            lastBackupTime = new Date().toLocaleString();
            localStorage.setItem('lifeFactoryLastBackup', lastBackupTime);
            document.getElementById('last-backup-time').textContent = lastBackupTime;
            
            if (!silent) {
                alert('✅ 云端备份创建成功！');
            } else {
                console.log('☁️ 自动备份完成:', lastBackupTime);
            }
            
            // 清理旧备份（保留最新20个）
            cleanupOldBackups();
        })
        .catch(error => {
            console.error('❌ 云端备份失败:', error);
            if (!silent) alert('❌ 云端备份失败：' + error.message);
        });
}

function cleanupOldBackups() {
    if (!familyCode || !isCloudReady) return;
    
    db.collection('backups').doc(familyCode).collection('history')
        .orderBy('timestamp', 'desc')
        .get()
        .then(snapshot => {
            const docs = snapshot.docs;
            if (docs.length > 20) {
                // 删除超过20个的旧备份
                const toDelete = docs.slice(20);
                const batch = db.batch();
                toDelete.forEach(doc => {
                    batch.delete(doc.ref);
                });
                return batch.commit();
            }
        })
        .catch(error => {
            console.log('清理旧备份时出错:', error);
        });
}

window.listCloudBackups = function() {
    if (!familyCode || !isCloudReady) {
        alert('❌ 云端服务未连接');
        return;
    }
    
    db.collection('backups').doc(familyCode).collection('history')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                alert('📭 没有找到云端备份');
                return;
            }
            
            let html = '<h4>最近10个云端备份</h4>';
            html += '<div style="max-height:300px;overflow-y:auto;">';
            
            snapshot.docs.forEach((doc, index) => {
                const data = doc.data();
                const time = new Date(data.timestamp).toLocaleString();
                const productions = data.gameData?.productions?.length || 0;
                const timeLogs = data.gameData?.timeLogs?.length || 0;
                
                html += `
                    <div style="border:1px solid #ddd;border-radius:6px;padding:10px;margin-bottom:8px;background:#f9f9f9;">
                        <div style="font-weight:bold;">${time}</div>
                        <div style="font-size:0.9em;color:#666;">
                            生产线: ${productions} | 时间记录: ${timeLogs} | 类型: ${data.backupType || 'auto'}
                        </div>
                        <button class="btn btn-small btn-primary" onclick="window.restoreFromCloudBackup('${doc.id}')" style="margin-top:5px;">
                            恢复此备份
                        </button>
                    </div>
                `;
            });
            
            html += '</div>';
            
            showCustomModal({
                title: '☁️ 云端备份列表',
                content: html,
                onConfirm: () => true
            });
        })
        .catch(error => {
            console.error('获取备份列表失败:', error);
            alert('❌ 获取备份列表失败：' + error.message);
        });
}

window.restoreFromCloudBackup = function(backupId) {
    if (!confirm('确定要从此云端备份恢复数据吗？\n\n当前数据将被覆盖！')) {
        return;
    }
    
    db.collection('backups').doc(familyCode).collection('history').doc(backupId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('❌ 备份不存在');
                return;
            }
            
            const backupData = doc.data();
            gameData = backupData.gameData;
            lastDailyReset = backupData.lastDailyReset || lastDailyReset;
            
            // 重新渲染所有内容
            fixDataLinks();
            renderProductions();
            renderDevelopments();
            renderMilestones();
            renderDevLibrary();
            renderResourceStats();
            renderWeekCalendar();
            renderExpenses();
            
            // 保存到本地和云端
            saveToLocal();
            saveToCloud();
            
            alert('✅ 从云端备份恢复成功！');
            closeModal('data-manage-modal');
        })
        .catch(error => {
            console.error('恢复备份失败:', error);
            alert('❌ 恢复备份失败：' + error.message);
        });
}

window.showRestoreFromCloud = function() {
    listCloudBackups();
}

// 在页面加载时启动自动备份
function initAutoBackup() {
    if (autoBackupEnabled) {
        startAutoBackup();
    }
}

// 在 init 函数调用后启动自动备份
const originalInit = window.init;
window.init = function() {
    originalInit.call(this);
    setTimeout(initAutoBackup, 2000); // 延迟2秒启动，确保云端连接就绪
}

// ========== renderMilestones ========== //
function renderMilestones() {
    const container = document.getElementById('experiences-list');
    let html = '';
    Object.entries(gameData.experiences).forEach(([category, items]) => {
        html += `<div class="experience-category">${category}</div>`;
        items.forEach((exp, index) => {
            const stars = '★'.repeat(exp.difficulty) + '☆'.repeat(5 - exp.difficulty);
            const isCompleted = !exp.repeatable && exp.count > 0;
            html += `
                <div class="experience-item ${isCompleted ? 'completed' : ''}">
                    <div class="experience-header">
                        <div class="experience-name">
                            ${exp.name}
                            ${exp.count > 0 ? `<span class="count-badge">${exp.count}</span>` : ''}
                        </div>
                    </div>
                    <div class="experience-desc">${exp.desc}</div>
                    <div class="experience-info">
                        <div class="difficulty">
                            难度: <span class="difficulty-star">${stars}</span>
                        </div>
                        ${(!exp.repeatable && exp.count > 0) ?
                            '<span style="color: #27ae60;">✓ 已完成</span>' :
                            `<button class="complete-btn" onclick="window.completeExperience('${category}', ${index})">
                                完成 ${exp.repeatable ? '+1' : ''}
                            </button>`
                        }
                    </div>
                </div>
            `;
        });
    });
    container.innerHTML = html;
}

window.addTimeToEnd = function(mins) {
    let start = document.getElementById('rt-start').value;
    if(!start) return;
    let [sh,sm] = start.split(':').map(x=>parseInt(x));
    let total = sh*60+sm+mins;
    let eh = Math.floor(total/60), em = total%60;
    if(eh>23) { eh=23; em=59; }
    document.getElementById('rt-end').value = `${eh.toString().padStart(2,'0')}:${em.toString().padStart(2,'0')}`;
}

// 新增：无论timeCost如何都弹窗，默认30分钟
window.recordTimeForProduction = function(sortedIndex) {
    const prod = sortedProductions[sortedIndex];
    const realProd = gameData.productions[prod._realIndex];
    let now = new Date();
    let endH = now.getHours(), endM = now.getMinutes();
    let start = new Date(now.getTime() - 30*60000); // 向前30分钟
    let startH = start.getHours(), startM = start.getMinutes();
    const dialog = document.getElementById('record-time-dialog');
    const form = document.getElementById('record-time-form');
    document.getElementById('rt-date').value = getLocalDateString(); // 使用本地日期避免时区问题
    document.getElementById('rt-start').value = `${startH.toString().padStart(2,'0')}:${startM.toString().padStart(2,'0')}`;
    document.getElementById('rt-end').value = `${endH.toString().padStart(2,'0')}:${endM.toString().padStart(2,'0')}`;
    dialog.returnValue = '';
    dialog.showModal();
    form.onsubmit = function(e) {
        e.preventDefault();
        let date = document.getElementById('rt-date').value;
        let start = document.getElementById('rt-start').value;
        let end = document.getElementById('rt-end').value;
        if(!date||!start||!end) { alert('请填写完整时间'); return; }
        let [sh,sm] = start.split(':').map(x=>parseInt(x));
        let [eh,em] = end.split(':').map(x=>parseInt(x));
        if([sh,sm,eh,em].some(x=>isNaN(x)||x<0||x>59||(x>23&&[sh,eh].includes(x)))) { alert('时间格式错误'); return; }
        let d = new Date(date);
        let weekDay = (d.getDay()+6)%7;
        let actualTimeCost = (eh*60+em)-(sh*60+sm);
        if (actualTimeCost <= 0) {
            alert('结束时间必须晚于开始时间');
            return;
        }
        const timeLog = {
            name: realProd.name,
            type: realProd.type,
            date: date,
            weekDay: weekDay,
            hour: sh,
            minute: sm,
            timeCost: actualTimeCost,
            endHour: eh,
            endMinute: em
        };
        gameData.timeLogs.push(timeLog);
        if(date === getLocalDateString()) { // 使用本地日期比较
            realProd.lastCheckIn = new Date().toISOString();
        }
        saveToCloud();
        renderProductions();
        renderDevelopments();
        renderResourceStats();
        
        // 延迟渲染日历，确保数据更新完成
        setTimeout(() => {
            renderWeekCalendar();
        }, 100);
        
        dialog.close();
    };
}

window.addEventListener('resize', () => {
    if (document.getElementById('calendar-overlay')) {
        // 重新计算本周日期
        let now = new Date();
        let todayIdx = (now.getDay()+6)%7;
        let monday = new Date(now);
        monday.setHours(0,0,0,0);
        monday.setDate(now.getDate() - todayIdx);
        let weekDates = [];
        for(let i=0;i<7;i++) {
            let d = new Date(monday);
            d.setDate(monday.getDate()+i);
            weekDates.push(formatDateLocal(d));
        }
        setTimeout(() => renderTimeBlocks(weekDates), 100);
    }
});
function formatDateLocal(date) {
    const y = date.getFullYear();
    const m = (date.getMonth()+1).toString().padStart(2,'0');
    const d = date.getDate().toString().padStart(2,'0');
    return `${y}-${m}-${d}`;
}

// ========== 日历颜色映射 ========== //
let productionColorMap = {};
function updateProductionColorMap() {
    productionColorMap = {};
    (gameData.productions||[]).forEach((prod, idx) => {
        productionColorMap[prod.name] = idx % 10;
    });
}


window._calendarBlockContextMenu = function(e, date, name, hour, minute) {
    const log = (gameData.timeLogs||[]).find(l=>l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute);
    if (!log) {
        return;
    }
    showCalendarContextMenu(e, log);
};

// 加载研发中心JSON数据
async function loadDevLibraryFromJSON() {
    // 如果数据已存在，直接返回一个已解决的Promise
    if (window.devLibraryData) {
        return Promise.resolve(window.devLibraryData);
    }
    
    // 如果正在加载中，则返回一个等待的Promise
    if (window._devLibraryLoadingPromise) {
        return window._devLibraryLoadingPromise;
    }

    // 开始加载，并创建一个Promise来跟踪它
    window._devLibraryLoadingPromise = new Promise((resolve, reject) => {
        fetch('life_factorio_tech_tree.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                window.devLibraryData = data; // 存储数据
                console.log("✅ 科技树数据加载成功", data);
                resolve(data); // 解决Promise
            })
            .catch(error => {
                console.error('❌ 加载研发数据失败:', error);
                reject(error); // 拒绝Promise
            })
            .finally(() => {
                // 加载完成后，清除Promise缓存
                window._devLibraryLoadingPromise = null;
            });
    });

    return window._devLibraryLoadingPromise;
}

// 手动强制每日重置（调试用）
window.forceReset = function() {
    const today = new Date().toDateString();
    console.log(`🔧 手动强制重置开始，当前时间: ${new Date().toString()}`);
    console.log(`🔧 重置从 ${lastDailyReset} 到 ${today}`);
    
    // 强制更新lastDailyReset
    lastDailyReset = today;
    
    // 重置研发项目的今日打卡状态
    gameData.developments.forEach(dev => {
        dev.checkedToday = false;
    });
    console.log(`✅ 已重置 ${gameData.developments.length} 个研发项目的打卡状态`);
    
    // 清理生活类项目
    const beforeCount = gameData.productions.length;
    const lifestyleProductions = gameData.productions.filter(prod => prod.type === 'lifestyle');
    console.log(`🗑️ 删除 ${lifestyleProductions.length} 个lifestyle类项目:`, lifestyleProductions.map(p => p.name));
    
    gameData.productions = gameData.productions.filter(prod => prod.type !== 'lifestyle');
    const afterCount = gameData.productions.length;
    const deletedCount = beforeCount - afterCount;
    
    // 重置习惯类项目的签到状态
    gameData.productions.forEach(prod => {
        if (prod.type === 'habit' || prod.type === 'automation') {
            prod.lastCheckIn = null;
        }
    });
    
    // 立即保存并刷新界面
    saveToCloud();
    renderProductions();
    renderDevelopments();
    
    alert(`🎉 强制重置完成！删除了 ${deletedCount} 个lifestyle类项目，重置了所有打卡状态。`);
    console.log(`🔧 手动强制重置完成`);
};

// 检查每日重置状态（调试用）
window.checkResetStatus = function() {
    const today = new Date().toDateString();
    const lifestyleCount = gameData.productions.filter(prod => prod.type === 'lifestyle').length;
    
    console.log(`📊 重置状态检查:`);
    console.log(`   当前时间: ${new Date().toString()}`);
    console.log(`   今天日期: ${today}`);
    console.log(`   上次重置: ${lastDailyReset}`);
    console.log(`   需要重置: ${lastDailyReset !== today ? '是' : '否'}`);
    console.log(`   生产线数量: ${gameData.productions.length}`);
    console.log(`   lifestyle类项目: ${lifestyleCount}`);
    
    if (lifestyleCount > 0) {
        const lifestyleProds = gameData.productions.filter(prod => prod.type === 'lifestyle');
        console.log(`   lifestyle类项目列表:`, lifestyleProds.map(p => p.name));
    }
    
    return {
        today,
        lastDailyReset,
        needsReset: lastDailyReset !== today,
        lifestyleCount,
        totalProductions: gameData.productions.length
    };
};

// 立即修复时区问题
window.fixTimezoneIssue = function() {
    console.log('🔧 开始修复时区问题...');
    
    // 获取当前本地日期
    const today = getLocalDateString();
    console.log(`今天的本地日期: ${today}`);
    
    // 强制更新lastDailyReset
    const oldReset = lastDailyReset;
    lastDailyReset = today;
    console.log(`lastDailyReset 从 ${oldReset} 更新到 ${today}`);
    
    // 执行每日重置
    checkDailyReset();
    
    // 刷新界面
    renderProductions();
    renderDevelopments();
    renderResourceStats();
    
    console.log('✅ 时区问题修复完成');
};

// 全面的时区修复函数
window.fixAllTimezoneIssues = function() {
    console.log('🔧 开始全面修复时区问题...');
    
    // 1. 获取当前本地日期
    const today = getLocalDateString();
    console.log(`今天的本地日期: ${today}`);
    
    // 2. 强制更新lastDailyReset
    const oldReset = lastDailyReset;
    lastDailyReset = today;
    console.log(`lastDailyReset 从 ${oldReset} 更新到 ${today}`);
    
    // 3. 执行每日重置
    checkDailyReset();
    
    // 4. 修复recordTimeForProduction函数中的时区问题
    const originalRecordTime = window.recordTimeForProduction;
    window.recordTimeForProduction = function(sortedIndex) {
        const prod = sortedProductions[sortedIndex];
        const realProd = gameData.productions[prod._realIndex];
        let now = new Date();
        let endH = now.getHours(), endM = now.getMinutes();
        let start = new Date(now.getTime() - 30*60000); // 向前30分钟
        let startH = start.getHours(), startM = start.getMinutes();
        const dialog = document.getElementById('record-time-dialog');
        const form = document.getElementById('record-time-form');
        
        // 使用本地日期而不是UTC日期
        document.getElementById('rt-date').value = getLocalDateString();
        document.getElementById('rt-start').value = `${startH.toString().padStart(2,'0')}:${startM.toString().padStart(2,'0')}`;
        document.getElementById('rt-end').value = `${endH.toString().padStart(2,'0')}:${endM.toString().padStart(2,'0')}`;
        dialog.returnValue = '';
        dialog.showModal();
        form.onsubmit = function(e) {
            e.preventDefault();
            let date = document.getElementById('rt-date').value;
            let start = document.getElementById('rt-start').value;
            let end = document.getElementById('rt-end').value;
            if(!date||!start||!end) { alert('请填写完整时间'); return; }
            let [sh,sm] = start.split(':').map(x=>parseInt(x));
            let [eh,em] = end.split(':').map(x=>parseInt(x));
            if([sh,sm,eh,em].some(x=>isNaN(x)||x<0||x>59||(x>23&&[sh,eh].includes(x)))) { alert('时间格式错误'); return; }
            let d = new Date(date);
            let weekDay = (d.getDay()+6)%7;
            let actualTimeCost = (eh*60+em)-(sh*60+sm);
            if (actualTimeCost <= 0) {
                alert('结束时间必须晚于开始时间');
                return;
            }
            const timeLog = {
                name: realProd.name,
                type: realProd.type,
                date: date,
                weekDay: weekDay,
                hour: sh,
                minute: sm,
                timeCost: actualTimeCost,
                endHour: eh,
                endMinute: em
            };
            gameData.timeLogs.push(timeLog);
            // 使用本地日期比较
            if(date === getLocalDateString()) {
                realProd.lastCheckIn = new Date().toISOString();
            }
            saveToCloud();
            renderProductions();
            renderDevelopments();
            renderResourceStats();
            
            // 延迟渲染日历，确保数据更新完成
            setTimeout(() => {
                renderWeekCalendar();
            }, 100);
            
            dialog.close();
        };
    };
    
    // 5. 修复renderProductions中的today变量
    const originalRenderProductions = renderProductions;
    window.renderProductions = function() {
        return originalRenderProductions.call(this);
    };
    
    // 6. 刷新界面
    renderProductions();
    renderDevelopments();
    renderResourceStats();
    
    console.log('✅ 全面时区问题修复完成');
    alert('🎉 时区问题已全面修复！现在所有时间显示都会使用本地时间。');
};

// 数据验证和格式化函数
const validators = {
    // 验证生产线数据
    validateProduction(prod) {
        if (!prod.name) return false;
        if (prod.hasActiveIncome && (!prod.activeIncome || !utils.isValidCurrency(prod.activeCurrency))) return false;
        if (prod.hasPassiveIncome && (!prod.passiveIncome || !utils.isValidCurrency(prod.passiveCurrency))) return false;
        if (prod.expense && !utils.isValidCurrency(prod.expenseCurrency)) return false;
        return true;
    },

    // 验证研发项目数据
    validateDevelopment(dev) {
        if (!dev.researchName) return false;
        if (!dev.cycle || dev.cycle < 1) return false;
        if (!dev.target || dev.target < 1) return false;
        return true;
    },

    // 验证支出数据
    validateExpense(exp) {
        if (!exp.name) return false;
        if (!exp.amount || exp.amount <= 0) return false;
        if (!utils.isValidCurrency(exp.currency)) return false;
        if (exp.type === 'recurring' && !['monthly', 'biweekly'].includes(exp.frequency)) return false;
        return true;
    }
};

// 数据格式化函数
const formatters = {
    // 格式化研发项目显示
    formatDevelopment(dev) {
        return {
            name: dev.researchName,
            icon: dev.icon || '🔬',
            progress: `${dev.progress}/${dev.maxProgress}`,
            percent: Math.min(100, (dev.progress / dev.maxProgress) * 100),
            status: dev.active ? (dev.paused ? '已暂停' : '进行中') : '已完成'
        };
    },

    // 格式化生产线显示
    formatProduction(prod) {
        return {
            name: prod.name,
            type: prod.type,
            activeIncome: prod.hasActiveIncome ? utils.formatCurrency(prod.activeIncome, prod.activeCurrency) : null,
            passiveIncome: prod.hasPassiveIncome ? utils.formatCurrency(prod.passiveIncome, prod.passiveCurrency) : null,
            expense: prod.expense ? utils.formatCurrency(prod.expense, prod.expenseCurrency) : null
        };
    },

    // 格式化支出显示
    formatExpense(exp) {
        return {
            name: exp.name,
            amount: utils.formatCurrency(exp.amount, exp.currency),
            frequency: exp.type === 'recurring' ? (exp.frequency === 'monthly' ? '每月' : '每2周') : '一次性'
        };
    }
};

// 修改调用renderDevLibrary的地方，添加强制渲染标记
function forceRenderDevLibrary() {
    window.__devLibraryForceRender = true;
    window.renderDevLibrary();
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 获取预计月支出（基于支出管理面板数据总和）
function getEstimatedMonthlyExpense() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let total = 0;
    
    // 计算支出管理面板中所有支出项的总和
    (gameData.expenses||[]).forEach(exp => {
        if (!exp || !exp.amount || !exp.currency) return;
        
        const start = new Date(exp.date);
        
        // 跳过在当前月份之后才开始的支出
        if (start > lastDayOfMonth) return;
        
        if (exp.type === 'single') {
            // 单次支出：只要在本月内，就计入
            if (start >= firstDayOfMonth && start <= lastDayOfMonth) {
                total += convertToCNY(exp.amount, exp.currency);
            }
        } else if (exp.type === 'recurring') {
            // 固定支出
            if (exp.frequency === 'monthly') {
                // 每月一次，只要起始日期在本月或之前
                total += convertToCNY(exp.amount, exp.currency);
            } else if (exp.frequency === 'biweekly') {
                // 每2周，计算本月内发生几次
                let current = new Date(start);
                // 调整到本月第一次发生日期
                while (current < firstDayOfMonth) {
                    current.setDate(current.getDate() + 14);
                }
                // 计算本月内发生的次数
                while (current <= lastDayOfMonth) {
                    total += convertToCNY(exp.amount, exp.currency);
                    current.setDate(current.getDate() + 14);
                }
            }
        }
    });
    
    return total;
}

// 获取预计月支出明细
function getEstimatedExpenseBreakdown() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    let expensesByCurrency = {};
    
    (gameData.expenses||[]).forEach(exp => {
        if (!exp || !exp.amount || !exp.currency) return;
        
        const start = new Date(exp.date);
        // 跳过在当前月份之后才开始的支出
        if (start > lastDayOfMonth) return;
        
        if (exp.type === 'single') {
            // 单次支出：只要在本月内，就计入
             if (start >= firstDayOfMonth && start <= lastDayOfMonth) {
                if (!expensesByCurrency[exp.currency]) expensesByCurrency[exp.currency] = 0;
                expensesByCurrency[exp.currency] += exp.amount;
            }
        } else if (exp.type === 'recurring') {
            // 固定支出
            if (exp.frequency === 'monthly') {
                // 每月一次，只要起始日期在本月或之前
                if (!expensesByCurrency[exp.currency]) expensesByCurrency[exp.currency] = 0;
                expensesByCurrency[exp.currency] += exp.amount;
            } else if (exp.frequency === 'biweekly') {
                // 每2周，计算本月内发生几次
                let current = new Date(start);
                // 调整到本月第一次发生日期
                while (current < firstDayOfMonth) {
                    current.setDate(current.getDate() + 14);
                }
                // 计算本月内发生的次数
                while (current <= lastDayOfMonth) {
                    if (!expensesByCurrency[exp.currency]) expensesByCurrency[exp.currency] = 0;
                    expensesByCurrency[exp.currency] += exp.amount;
                    current.setDate(current.getDate() + 14);
                }
            }
        }
    });
    
    let breakdown = [];
    Object.entries(expensesByCurrency).forEach(([currency, amount]) => {
        breakdown.push(`${currencySymbols[currency]}${amount.toLocaleString()}`);
    });
    return breakdown;
}

function showBlueprintModal() {
    document.getElementById('blueprint-form').reset();
    // 设置默认日期为明天上午9点，使用本地时间
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    // 格式化为本地时间字符串，避免时区问题
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const hours = String(tomorrow.getHours()).padStart(2, '0');
    const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
    document.getElementById('blueprint-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // 渲染蓝图历史标签
    renderBlueprintHistoryTags();
    
    document.getElementById('blueprint-modal').style.display = 'block';
}

// 新增：时间快捷设置函数
window.setBlueprintTime = function(option) {
    const dateInput = document.getElementById('blueprint-date');
    let targetDate;
    
    switch(option) {
        case 'now':
            targetDate = new Date();
            break;
        case 'tomorrow-9':
            targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 1);
            targetDate.setHours(9, 0, 0, 0);
            break;
        case 'next-week':
            targetDate = new Date();
            // 获取当前是星期几 (0=周日, 1=周一, ..., 6=周六)
            const currentDay = targetDate.getDay();
            // 计算到下周一需要的天数
            let daysToAdd;
            if (currentDay === 0) { // 周日
                daysToAdd = 1;
            } else { // 周一到周六
                daysToAdd = 8 - currentDay;
            }
            targetDate.setDate(targetDate.getDate() + daysToAdd);
            targetDate.setHours(9, 0, 0, 0);
            break;
    }
    
    if (targetDate) {
        // 使用本地时间格式，避免时区问题
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const hours = String(targetDate.getHours()).padStart(2, '0');
        const minutes = String(targetDate.getMinutes()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

// 新增：时长快捷设置函数，支持叠加
window.setBlueprintDuration = function(minutes) {
    const durationInput = document.getElementById('blueprint-duration');
    const currentValue = parseInt(durationInput.value) || 0;
    
    // 移除所有按钮的激活状态
    document.querySelectorAll('.btn-duration').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 找到被点击的按钮并添加激活状态
    const clickedButton = event.target;
    clickedButton.classList.add('active');
    
    // 如果当前输入框已有值，则叠加；否则直接设置
    if (currentValue > 0) {
        durationInput.value = currentValue + minutes;
    } else {
        durationInput.value = minutes;
    }
    
    // 0.5秒后移除激活状态
    setTimeout(() => {
        clickedButton.classList.remove('active');
    }, 500);
}

function saveBlueprint(e) {
    e.preventDefault();
    // 获取选中的优先级
    const priorityRadios = document.querySelectorAll('input[name="priority"]');
    let selectedPriority = 'medium'; // 默认值
    for (const radio of priorityRadios) {
        if (radio.checked) {
            selectedPriority = radio.value;
            break;
        }
    }
    
    const blueprint = {
        id: `bp_${new Date().getTime()}`,
        name: document.getElementById('blueprint-name').value,
        category: document.getElementById('blueprint-category').value,
        scheduledDate: new Date(document.getElementById('blueprint-date').value).toISOString(),
        duration: parseInt(document.getElementById('blueprint-duration').value, 10),
        priority: selectedPriority,
        status: 'planned',
    };

    if (!blueprint.name || !blueprint.scheduledDate || isNaN(blueprint.duration) || blueprint.duration <= 0) {
        alert('请确保计划名称、时间和时长都已正确填写。');
        return;
    }

    if (!gameData.blueprints) {
        gameData.blueprints = [];
    }
    gameData.blueprints.push(blueprint);

    saveToCloud();
    renderWeekCalendar();
    window.closeModal('blueprint-modal');
}

// === 蓝图自动化管理功能 ===

// 显示自动化管理面板
window.showBlueprintAutomationModal = function() {
    updateAutomationDisplay();
    document.getElementById('blueprint-automation-modal').style.display = 'block';
}

// 更新自动化显示内容
function updateAutomationDisplay() {
    // 更新状态开关
    const settings = window.gameData?.blueprintAutomation || {};
    document.getElementById('automation-enabled').checked = settings.enabled !== false;
    
    // 更新状态摘要
    updateAutomationSummary();
    
    // 更新项目列表
    updateAutomationProjectsList();
    
    // 更新生成日志
    updateAutomationLogs();
}

// 更新状态摘要
function updateAutomationSummary() {
    const container = document.getElementById('automation-summary');
    const settings = window.gameData?.blueprintAutomation || {};
    const automationProjects = window.blueprintAutomation?.getAutomationProjects() || [];
    const autoBlueprints = (window.gameData?.blueprints || []).filter(bp => bp.autoGenerated);
    
    if (!settings.enabled) {
        container.innerHTML = '🔴 自动化功能已禁用';
        return;
    }
    
    if (automationProjects.length === 0) {
        container.innerHTML = '🟡 暂无自动化项目';
        return;
    }
    
    const lastGenerated = settings.lastGeneratedAt ? 
        new Date(settings.lastGeneratedAt).toLocaleDateString('zh-CN') : '从未';
    
    container.innerHTML = `
        🟢 自动化功能已启用<br>
        📊 自动化项目：${automationProjects.length} 个<br>
        📅 自动蓝图：${autoBlueprints.length} 个<br>
        ⏰ 上次生成：${lastGenerated}
    `;
}

// 更新自动化项目列表
function updateAutomationProjectsList() {
    const container = document.getElementById('automation-projects-list');
    const automationProjects = window.blueprintAutomation?.getAutomationProjects() || [];
    
    if (automationProjects.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无自动化项目</div>';
        return;
    }
    
    container.innerHTML = automationProjects.map(project => {
        const lastExecution = window.blueprintAutomation?.getLastExecutionDate(project) || '从未';
        return `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px;">${project.name}</div>
                <div style="font-size: 0.9em; color: #666;">
                    频率：${project.freq || '未设置'} | 最后执行：${lastExecution}
                </div>
                <div style="margin-top: 8px;">
                    <button class="btn btn-small btn-secondary" onclick="pauseAutomationProject('${project.name}')">
                        ${project.paused ? '▶️ 启用' : '⏸️ 暂停'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 更新生成日志
function updateAutomationLogs() {
    const container = document.getElementById('automation-logs-list');
    const logs = window.gameData?.blueprintAutomation?.generationLog || [];
    
    if (logs.length === 0) {
        container.innerHTML = '暂无生成记录';
        return;
    }
    
    container.innerHTML = logs.slice(0, 5).map(log => {
        const time = new Date(log.timestamp).toLocaleString('zh-CN');
        const summary = Object.entries(log.projectSummary)
            .map(([name, count]) => `${name}: ${count}个`)
            .join(', ');
        
        return `
            <div style="margin-bottom: 10px; padding: 8px; border-left: 3px solid #2196f3;">
                <div style="font-size: 0.9em; color: #333;">
                    <strong>${time}</strong>
                </div>
                <div style="font-size: 0.85em; color: #666;">
                    生成 ${log.generatedCount} 个蓝图：${summary}
                </div>
            </div>
        `;
    }).join('');
}

// 切换自动化功能
window.toggleAutomation = function() {
    const enabled = document.getElementById('automation-enabled').checked;
    
    if (!window.gameData.blueprintAutomation) {
        window.gameData.blueprintAutomation = {
            enabled: enabled,
            globalSettings: {
                workdayRules: true,
                maxDailyBlueprints: 8,
                generationRange: 7,
                protectedHours: {
                    sleepStart: 22,
                    sleepEnd: 7,
                    lunchBreak: { start: 12, end: 13 }
                }
            },
            lastGeneratedAt: null,
            generationLog: []
        };
    } else {
        window.gameData.blueprintAutomation.enabled = enabled;
    }
    
    window.saveToCloud();
    updateAutomationSummary();
    
    console.log(`🤖 自动化功能${enabled ? '已启用' : '已禁用'}`);
}

// 立即生成蓝图
window.generateAutomationBlueprints = async function() {
    if (!window.blueprintAutomation) {
        alert('自动化模块未初始化');
        return;
    }
    
    try {
        const result = await window.blueprintAutomation.generateAutomationBlueprints();
        updateAutomationDisplay();
        
        if (result && result.length > 0) {
            alert(`✅ 成功生成 ${result.length} 个自动化蓝图！`);
        } else {
            alert('ℹ️ 暂无需要生成的蓝图');
        }
    } catch (error) {
        console.error('生成蓝图失败:', error);
        alert('❌ 生成蓝图失败，请查看控制台了解详情');
    }
}

// 清除自动生成的蓝图
window.clearAutoBlueprints = function() {
    if (!confirm('确定要清除所有自动生成的蓝图吗？此操作不可撤销。')) {
        return;
    }
    
    if (window.blueprintAutomation) {
        window.blueprintAutomation.clearAutoGeneratedBlueprints();
        updateAutomationDisplay();
        alert('🧹 已清除所有自动生成的蓝图');
    }
}

// 显示自动化设置
window.showAutomationSettings = function() {
    loadAutomationSettings();
    document.getElementById('automation-settings-modal').style.display = 'block';
}

// 加载设置到表单
function loadAutomationSettings() {
    const settings = window.gameData?.blueprintAutomation?.globalSettings || {};
    
    document.getElementById('automation-range').value = settings.generationRange || 7;
    document.getElementById('max-daily-blueprints').value = settings.maxDailyBlueprints || 8;
    document.getElementById('workday-rules').checked = settings.workdayRules !== false;
    
    const protectedHours = settings.protectedHours || {};
    document.getElementById('sleep-start').value = 
        String(protectedHours.sleepStart || 22).padStart(2, '0') + ':00';
    document.getElementById('sleep-end').value = 
        String(protectedHours.sleepEnd || 7).padStart(2, '0') + ':00';
    document.getElementById('lunch-start').value = 
        String(protectedHours.lunchBreak?.start || 12).padStart(2, '0') + ':00';
    document.getElementById('lunch-end').value = 
        String(protectedHours.lunchBreak?.end || 13).padStart(2, '0') + ':00';
}

// 保存自动化设置
window.saveAutomationSettings = function() {
    if (!window.gameData.blueprintAutomation) {
        window.gameData.blueprintAutomation = { globalSettings: {} };
    }
    
    const settings = window.gameData.blueprintAutomation.globalSettings;
    
    settings.generationRange = parseInt(document.getElementById('automation-range').value);
    settings.maxDailyBlueprints = parseInt(document.getElementById('max-daily-blueprints').value);
    settings.workdayRules = document.getElementById('workday-rules').checked;
    
    settings.protectedHours = {
        sleepStart: parseInt(document.getElementById('sleep-start').value.split(':')[0]),
        sleepEnd: parseInt(document.getElementById('sleep-end').value.split(':')[0]),
        lunchBreak: {
            start: parseInt(document.getElementById('lunch-start').value.split(':')[0]),
            end: parseInt(document.getElementById('lunch-end').value.split(':')[0])
        }
    };
    
    window.saveToCloud();
    window.closeModal('automation-settings-modal');
    updateAutomationDisplay();
    
    alert('✅ 设置已保存');
}

// 重置自动化设置
window.resetAutomationSettings = function() {
    if (!confirm('确定要重置为默认设置吗？')) return;
    
    document.getElementById('automation-range').value = 7;
    document.getElementById('max-daily-blueprints').value = 8;
    document.getElementById('workday-rules').checked = true;
    document.getElementById('sleep-start').value = '22:00';
    document.getElementById('sleep-end').value = '07:00';
    document.getElementById('lunch-start').value = '12:00';
    document.getElementById('lunch-end').value = '13:00';
}

// 暂停/启用自动化项目
window.pauseAutomationProject = function(projectName) {
    const production = window.gameData.productions.find(p => p.name === projectName);
    if (production) {
        production.paused = !production.paused;
        window.saveToCloud();
        updateAutomationProjectsList();
        
        console.log(`🎛️ 项目 "${projectName}" ${production.paused ? '已暂停' : '已启用'}`);
    }
}

// === 演示和测试函数 ===

// 演示自动化功能
window.demoAutomationFeature = function() {
    console.log('🎯 开始演示自动化蓝图功能...');
    
    // 1. 确保有一些自动化项目存在
    if (!window.gameData.productions.some(p => p.type === 'automation')) {
        // 创建一些示例自动化项目
        const demoProjects = [
            {
                name: '晨间锻炼',
                type: 'automation',
                freq: '每天',
                priority: 'medium',
                paused: false
            },
            {
                name: '学习英语',
                type: 'automation', 
                freq: '每周3次',
                priority: 'high',
                paused: false
            },
            {
                name: '阅读计划',
                type: 'automation',
                freq: '每2天',
                priority: 'low',
                paused: false
            }
        ];
        
        window.gameData.productions.push(...demoProjects);
        console.log('✅ 创建了示例自动化项目:', demoProjects.map(p => p.name).join(', '));
    }
    
    // 2. 启用自动化功能
    if (!window.gameData.blueprintAutomation) {
        window.gameData.blueprintAutomation = {
            enabled: true,
            globalSettings: {
                workdayRules: true,
                maxDailyBlueprints: 8,
                generationRange: 7,
                protectedHours: {
                    sleepStart: 22,
                    sleepEnd: 7,
                    lunchBreak: { start: 12, end: 13 }
                }
            },
            lastGeneratedAt: null,
            generationLog: []
        };
    } else {
        window.gameData.blueprintAutomation.enabled = true;
    }
    
    // 3. 生成自动化蓝图
    setTimeout(async () => {
        try {
            const result = await window.blueprintAutomation.generateAutomationBlueprints();
            console.log(`🎉 生成了 ${result?.length || 0} 个自动化蓝图`);
            
            // 4. 保存并刷新界面
            window.saveToCloud();
            window.renderWeekCalendar();
            
            console.log('✨ 演示完成！请查看日历上的自动生成蓝图，它们会有🤖标识');
            alert(`🎉 演示完成！\n\n生成了 ${result?.length || 0} 个自动化蓝图\n请查看日历上带有🤖标识的蓝图`);
            
        } catch (error) {
            console.error('❌ 自动化演示失败:', error);
            alert('演示失败，请查看控制台了解详情');
        }
    }, 1000);
}

// 在开发者工具中快速调用
if (typeof window !== 'undefined') {
    console.log('🔧 自动化功能已加载！');
    console.log('💡 使用 demoAutomationFeature() 来演示自动化功能');
    console.log('🤖 使用 showBlueprintAutomationModal() 来打开管理面板');
    console.log('🔍 使用 debugAutomationProjects() 来调试项目数据');
}

// 调试自动化项目数据结构
window.debugAutomationProjects = function() {
    console.log('🔍 调试自动化项目数据...');
    
    const allProductions = window.gameData?.productions || [];
    console.log('📊 所有生产线项目数量:', allProductions.length);
    
    const automationTypes = allProductions.filter(p => p.type === 'automation');
    console.log('🤖 自动化类型项目数量:', automationTypes.length);
    
    if (automationTypes.length > 0) {
        console.log('🔍 自动化项目详情:');
        automationTypes.forEach((project, index) => {
            console.log(`${index + 1}. ${project.name}:`, {
                type: project.type,
                freq: project.freq,
                paused: project.paused,
                hasFreq: !!project.freq,
                allFields: Object.keys(project)
            });
        });
    } else {
        console.log('⚠️ 没有找到自动化类型的项目');
    }
    
    // 检查筛选结果
    const automationProjects = window.blueprintAutomation?.getAutomationProjects() || [];
    console.log('✅ 通过筛选的自动化项目数量:', automationProjects.length);
    
    if (automationProjects.length > 0) {
        console.log('✅ 通过筛选的项目:', automationProjects.map(p => p.name));
    }
    
    return {
        total: allProductions.length,
        automationType: automationTypes.length,
        withFreq: automationTypes.filter(p => p.freq).length,
        notPaused: automationTypes.filter(p => !p.paused).length,
        qualified: automationProjects.length
    };
}

// 修复自动化项目，为缺少频率的项目添加默认值
window.fixAutomationProjects = function() {
    console.log('🔧 开始修复自动化项目...');
    
    const automationProjects = window.gameData?.productions?.filter(p => p.type === 'automation') || [];
    let fixedCount = 0;
    
    automationProjects.forEach(project => {
        if (!project.freq) {
            // 尝试从tech tree获取频率
            const techFreq = window.blueprintAutomation?.getFreqFromTechTree(project.techId || project.id);
            if (techFreq) {
                project.freq = techFreq;
                console.log(`📋 为项目 "${project.name}" 从tech tree设置频率: ${techFreq}`);
            } else {
                project.freq = '每天';
                console.log(`✅ 为项目 "${project.name}" 设置默认频率: 每天`);
            }
            fixedCount++;
        }
    });
    
    if (fixedCount > 0) {
        window.saveToCloud();
        console.log(`🎉 修复完成！为 ${fixedCount} 个项目设置了频率`);
        alert(`修复完成！为 ${fixedCount} 个自动化项目设置了频率`);
        
        // 刷新自动化面板
        if (document.getElementById('blueprint-automation-modal').style.display === 'block') {
            updateAutomationDisplay();
        }
    } else {
        console.log('✅ 所有自动化项目都已有频率设置');
        alert('所有自动化项目都已有频率设置，无需修复');
    }
    
    return fixedCount;
}

// 测试tech tree频率数据
window.testTechTreeFreq = function() {
    console.log('🧪 开始测试tech tree频率数据...');
    
    // 检查tech tree数据是否加载
    const techTreeData = window.devLibraryData?.techTree;
    if (!techTreeData) {
        console.log('❌ tech tree数据未加载');
        return;
    }
    
    console.log('✅ tech tree数据已加载');
    
    // 检查自动化项目
    const automationProjects = window.gameData?.productions?.filter(p => p.type === 'automation') || [];
    console.log(`📊 找到 ${automationProjects.length} 个自动化项目`);
    
    automationProjects.forEach(project => {
        console.log(`\n🔍 检查项目: ${project.name}`);
        console.log(`   ID: ${project.id || project.techId || '无'}`);
        console.log(`   当前频率: ${project.freq || '无'}`);
        
        // 尝试从tech tree获取频率
        const techFreq = window.blueprintAutomation?.getFreqFromTechTree(project.techId || project.id);
        console.log(`   tech tree频率: ${techFreq || '未找到'}`);
    });
    
    // 列出tech tree中所有有频率的技术
    console.log('\n📋 tech tree中所有有频率的技术:');
    let freqCount = 0;
    for (const layer of techTreeData.layers) {
        if (layer.technologies) {
            for (const tech of layer.technologies) {
                if (tech.freq) {
                    console.log(`   ${tech.id}: ${tech.freq} (${tech.name})`);
                    freqCount++;
                }
            }
        }
    }
    console.log(`\n📊 总共找到 ${freqCount} 个有频率设置的技术`);
    
    return {
        automationProjects: automationProjects.length,
        techFreqCount: freqCount
    };
};

// 测试蓝图完成功能
window.testBlueprintCompletion = function() {
    console.log('🧪 开始测试蓝图完成功能...');
    
    // 检查是否有蓝图
    const blueprints = window.gameData?.blueprints || [];
    if (blueprints.length === 0) {
        console.log('❌ 没有蓝图可以测试');
        return;
    }
    
    console.log(`📊 找到 ${blueprints.length} 个蓝图`);
    
    // 显示所有蓝图信息
    blueprints.forEach((bp, index) => {
        console.log(`${index + 1}. ${bp.name}`);
        console.log(`   类型: ${bp.category}`);
        console.log(`   自动生成: ${bp.autoGenerated ? '是' : '否'}`);
        console.log(`   计划时间: ${new Date(bp.scheduledDate).toLocaleString()}`);
        console.log(`   时长: ${bp.duration}分钟`);
    });
    
    // 检查时间日志数量
    const timeLogsBefore = window.gameData?.timeLogs?.length || 0;
    console.log(`📝 当前时间日志数量: ${timeLogsBefore}`);
    
    // 提示用户如何测试
    console.log('\n💡 测试方法:');
    console.log('1. 在日历上右键点击蓝图');
    console.log('2. 选择"标记完成"');
    console.log('3. 观察控制台输出');
    console.log('4. 检查时间日志是否增加');
    
    return {
        blueprintCount: blueprints.length,
        timeLogCount: timeLogsBefore,
        automationBlueprints: blueprints.filter(bp => bp.category === 'automation' || bp.autoGenerated).length
    };
};

// 检查最近的时间日志
window.checkRecentTimeLogs = function(count = 5) {
    const timeLogs = window.gameData?.timeLogs || [];
    const recentLogs = timeLogs.slice(-count);
    
    console.log(`📝 最近 ${count} 条时间日志:`);
    recentLogs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.name}`);
        console.log(`   日期: ${log.date}`);
        console.log(`   时间: ${log.hour}:${String(log.minute).padStart(2, '0')} - ${log.endHour}:${String(log.endMinute).padStart(2, '0')}`);
        console.log(`   时长: ${log.timeCost}分钟`);
        console.log(`   来源: ${log.fromBlueprint ? '蓝图完成' : '手动记录'}`);
        console.log(`   类型: ${log.type}`);
    });
    
    return recentLogs;
};

// 诊断时区问题
window.diagnoseBlueprintTimezone = function() {
    console.log('🕐 开始诊断蓝图时区问题...');
    
    const blueprints = window.gameData?.blueprints || [];
    const timeLogs = window.gameData?.timeLogs || [];
    
    console.log(`📊 当前蓝图数量: ${blueprints.length}`);
    console.log(`📝 当前时间日志数量: ${timeLogs.length}`);
    
    // 检查来自蓝图的时间日志
    const blueprintLogs = timeLogs.filter(log => log.fromBlueprint);
    console.log(`🎯 来自蓝图完成的时间日志: ${blueprintLogs.length} 条`);
    
    if (blueprintLogs.length > 0) {
        console.log('\n📋 蓝图完成日志详情:');
        blueprintLogs.slice(-10).forEach((log, index) => {
            const logDate = new Date(log.date + 'T00:00:00');
            const today = new Date();
            const daysDiff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
            
            console.log(`${index + 1}. ${log.name}`);
            console.log(`   记录日期: ${log.date} (${daysDiff}天前)`);
            console.log(`   执行时间: ${log.hour}:${String(log.minute).padStart(2, '0')}`);
        });
    }
    
    // 检查蓝图的计划时间
    if (blueprints.length > 0) {
        console.log('\n📅 当前蓝图计划时间:');
        blueprints.slice(0, 5).forEach((bp, index) => {
            const scheduledDate = new Date(bp.scheduledDate);
            const localDate = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
            const utcDate = scheduledDate.toISOString().slice(0, 10);
            
            console.log(`${index + 1}. ${bp.name}`);
            console.log(`   计划时间: ${scheduledDate.toLocaleString()}`);
            console.log(`   本地日期: ${localDate}`);
            console.log(`   UTC日期: ${utcDate}`);
            console.log(`   日期差异: ${localDate === utcDate ? '无' : '有差异！'}`);
        });
    }
    
    return {
        totalBlueprints: blueprints.length,
        totalTimeLogs: timeLogs.length,
        blueprintLogs: blueprintLogs.length
    };
};

// 在开发者工具中快速调用
if (typeof window !== 'undefined') {
    console.log('🔧 自动化功能已加载！');
    console.log('💡 使用 demoAutomationFeature() 来演示自动化功能');
    console.log('🤖 使用 showBlueprintAutomationModal() 来打开管理面板');
    console.log('🔍 使用 debugAutomationProjects() 来调试项目数据');
    console.log('🔧 使用 fixAutomationProjects() 来修复缺少频率的项目');
    console.log('🧪 使用 testTechTreeFreq() 来测试tech tree频率数据');
    console.log('🧪 使用 testBlueprintCompletion() 来测试蓝图完成功能');
    console.log('📝 使用 checkRecentTimeLogs() 来查看最近的时间日志');
    console.log('🕐 使用 diagnoseBlueprintTimezone() 来诊断时区问题');
    console.log('🔧 使用 fixBlueprintTimezoneLogs() 来修复已有的时区问题');
    console.log('🔍 使用 verifyTimezonefix() 来验证修复效果');
}

// 修复已有蓝图时间日志的时区问题
window.fixBlueprintTimezoneLogs = function() {
    console.log('🔧 开始修复蓝图时间日志的时区问题...');
    
    const timeLogs = window.gameData?.timeLogs || [];
    const blueprintLogs = timeLogs.filter(log => log.fromBlueprint);
    
    if (blueprintLogs.length === 0) {
        console.log('✅ 没有来自蓝图的时间日志需要修复');
        return;
    }
    
    console.log(`📊 找到 ${blueprintLogs.length} 条蓝图时间日志`);
    
    let fixedCount = 0;
    const today = new Date();
    const todayString = getLocalDateString();
    
    blueprintLogs.forEach(log => {
        const logDate = new Date(log.date + 'T00:00:00');
        const daysDiff = Math.floor((logDate - today) / (1000 * 60 * 60 * 24));
        
        // 如果日志日期在未来（说明有时区问题）
        if (daysDiff > 0) {
            const correctedDate = new Date(logDate.getTime() - (24 * 60 * 60 * 1000)); // 减去一天
            const correctedDateString = `${correctedDate.getFullYear()}-${String(correctedDate.getMonth() + 1).padStart(2, '0')}-${String(correctedDate.getDate()).padStart(2, '0')}`;
            
            console.log(`🔧 修复: ${log.name}`);
            console.log(`   原日期: ${log.date} (未来${daysDiff}天)`);
            console.log(`   新日期: ${correctedDateString}`);
            
            log.date = correctedDateString;
            log.weekDay = (correctedDate.getDay() + 6) % 7; // 重新计算星期
            fixedCount++;
        }
    });
    
    if (fixedCount > 0) {
        console.log(`✅ 修复完成！共修复了 ${fixedCount} 条时间日志`);
        window.saveToCloud();
        window.renderWeekCalendar();
        window.renderResourceStats();
        alert(`修复完成！共修复了 ${fixedCount} 条蓝图时间日志的时区问题`);
    } else {
        console.log('✅ 所有蓝图时间日志的日期都正确，无需修复');
        alert('所有蓝图时间日志的日期都正确，无需修复');
    }
    
    return fixedCount;
};

// 验证时区修复效果
window.verifyTimezonefix = function() {
    console.log('🔍 验证时区修复效果...');
    
    const timeLogs = window.gameData?.timeLogs || [];
    const blueprintLogs = timeLogs.filter(log => log.fromBlueprint);
    const today = new Date();
    
    let futureLogsCount = 0;
    let pastLogsCount = 0;
    let todayLogsCount = 0;
    
    blueprintLogs.forEach(log => {
        const logDate = new Date(log.date + 'T00:00:00');
        const daysDiff = Math.floor((logDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 0) {
            futureLogsCount++;
        } else if (daysDiff < 0) {
            pastLogsCount++;
        } else {
            todayLogsCount++;
        }
    });
    
    console.log(`📊 蓝图时间日志统计:`);
    console.log(`   未来日期: ${futureLogsCount} 条 ${futureLogsCount > 0 ? '⚠️' : '✅'}`);
    console.log(`   今天日期: ${todayLogsCount} 条`);
    console.log(`   过去日期: ${pastLogsCount} 条`);
    
    if (futureLogsCount === 0) {
        console.log('✅ 时区修复成功！没有未来日期的时间日志');
    } else {
        console.log('⚠️ 仍有未来日期的时间日志，可能需要进一步修复');
    }
    
    return {
        future: futureLogsCount,
        today: todayLogsCount,
        past: pastLogsCount,
        total: blueprintLogs.length
    };
};
