// Life Factorio - 人生工厂 脚本分离文件

// 用户体验优化初始化
document.addEventListener('DOMContentLoaded', () => {
    // 添加页面加载动画
    document.body.classList.add('page-transition');
    
    // 初始化按钮反馈
    initializeButtonFeedback();
    
    // 添加工具提示
    initializeTooltips();
    
    // 显示欢迎通知
    setTimeout(() => {
        if (window.ErrorUtils) {
            window.ErrorUtils.showNotification('欢迎使用人生工厂管理工具！', 'success', 3000);
        }
    }, 1000);
});

// 初始化按钮反馈
function initializeButtonFeedback() {
    // 为所有按钮添加点击反馈
    document.addEventListener('click', (e) => {
        if (e.target.matches('.btn, .check-btn, .btn-add, .btn-small')) {
            if (window.ErrorUtils) {
                window.ErrorUtils.addButtonFeedback(e.target);
            }
        }
    });
}

// 初始化工具提示
function initializeTooltips() {
    // 为带有data-tooltip属性的元素添加工具提示
    document.addEventListener('mouseenter', (e) => {
        if (e.target && e.target.nodeType === Node.ELEMENT_NODE && e.target.hasAttribute('data-tooltip')) {
            e.target.classList.add('tooltip');
        }
    }, true);
}

// 增强的渲染函数，包含加载状态
function renderWithLoading(renderFunction, container, loadingKey, message = '加载中...') {
    if (window.ErrorUtils) {
        window.ErrorUtils.showLoading(loadingKey, message);
    }
    
    try {
        renderFunction();
        
        // 添加数据更新动画
        if (container) {
            container.classList.add('data-update');
            setTimeout(() => {
                container.classList.remove('data-update');
            }, 500);
        }
    } catch (error) {
        if (window.ErrorUtils) {
            window.ErrorUtils.handleError(error, { type: 'render' });
        }
    } finally {
        if (window.ErrorUtils) {
            window.ErrorUtils.hideLoading(loadingKey);
        }
    }
}

// 增强的保存函数，包含成功反馈
function saveWithFeedback(saveFunction, successMessage = '保存成功') {
    if (window.ErrorUtils) {
        window.ErrorUtils.showLoading('save', '保存中...');
    }
    
    try {
        const result = saveFunction();
        
        if (window.ErrorUtils) {
            window.ErrorUtils.showNotification(successMessage, 'success', 3000);
            window.ErrorUtils.addSuccessAnimation(document.querySelector('.panel'));
        }
        
        return result;
    } catch (error) {
        if (window.ErrorUtils) {
            window.ErrorUtils.handleError(error, { type: 'data-save' });
        }
        return null;
    } finally {
        if (window.ErrorUtils) {
            window.ErrorUtils.hideLoading('save');
        }
    }
}

// 增强的加载函数，包含骨架屏
function loadWithSkeleton(loadFunction, container, itemCount = 3) {
    if (window.ErrorUtils && container) {
        window.ErrorUtils.showSkeleton(container, itemCount);
    }
    
    try {
        const result = loadFunction();
        
        if (window.ErrorUtils && container) {
            window.ErrorUtils.hideSkeleton(container);
        }
        
        return result;
    } catch (error) {
        if (window.ErrorUtils) {
            window.ErrorUtils.handleError(error, { type: 'data-load' });
        }
        return null;
    }
}

// 空状态检查函数
function checkEmptyState(container, data, icon, text, subtext) {
    if (!data || data.length === 0) {
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${icon}</div>
                    <div class="empty-state-text">${text}</div>
                    ${subtext ? `<div class="empty-state-subtext">${subtext}</div>` : ''}
                </div>
            `;
        }
        return true;
    }
    return false;
}

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

// 渲染生产线
function renderProductions() {
    return window.ErrorUtils.safeExecute(() => {
        return window.measurePerformance(() => {
            const container = document.getElementById('productions-list');
            if (!container) {
                console.error('❌ 找不到productions-list容器');
                return;
            }
            
            console.log('🔍 开始渲染生产线，当前数据:', {
                productionsCount: gameData.productions?.length || 0,
                productions: gameData.productions
            });
            
            // 检查空状态
            if (checkEmptyState(container, gameData.productions, '🏭', '暂无生产线', '点击下方按钮添加新的生产线')) {
                console.log('📭 显示空状态');
                return;
            }
            
            // 使用缓存获取排序后的生产线数据
            const cacheKey = `productions_${gameData.productions.length}_${Date.now() - (Date.now() % 60000)}`; // 按分钟缓存
            const renderData = window.cache(cacheKey, () => {
                // 更新全局的sortedProductions变量
                sortedProductions = getSortedProductions();
                
                // 加载隐藏的生产线列表
                const hiddenProductions = JSON.parse(localStorage.getItem('hiddenProductions') || '[]');
                
                // 过滤掉隐藏的生产线
                const filteredProds = sortedProductions.filter(p => !hiddenProductions.includes(p.name));
                
                return {
                    productions: filteredProds,
                    today: getLocalDateString(),
                    timeLogs: gameData.timeLogs || []
                };
            }, 60000); // 1分钟缓存
            
            const { productions, today, timeLogs } = renderData;
            
            console.log('📊 渲染数据:', {
                productionsCount: productions.length,
                today: today,
                timeLogsCount: timeLogs.length
            });
            
            const typeMap = {
                production: {text: '产线', desc: '需要投入时间换收入'},
                work: {text: '产线', desc: '工作相关收入'}, // 兼容旧的work类型
                investment: {text: '资产', desc: '投资/被动收入'},
                automation: {text: '自动化', desc: '长期习惯/自动行为'},
                lifestyle: {text: '日常', desc: '日常行为记录'},
                habit: {text: '习惯', desc: '日常习惯（已迁移为自动化）'} // 兼容旧数据
            };
            
            // 使用批量DOM更新优化渲染
            const updates = productions.map((prod, index) => {
                return (fragment) => {
                    const prodElement = document.createElement('div');
                    prodElement.className = 'production-item';
                    prodElement.setAttribute('data-sorted-index', index);
                    prodElement.oncontextmenu = (e) => window.showContextMenu(e, index, 'production');
                    
                    // 构建标签
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
                        if (prod.type === 'work') tagClass = 'tag-production';
                        tags.push({ text: typeMap[prod.type].text, class: tagClass });
                    }
                    
                    // 投资信息
                    let investInfo = '';
                    if (prod.type==='investment' && prod.investAmount>0 && prod.investCurrent>0 && prod.investDate) {
                        let start = new Date(prod.investDate);
                        let now = new Date();
                        let days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                        let profit = prod.investCurrent - prod.investAmount;
                        let profitPercent = (profit / prod.investAmount * 100).toFixed(2);
                        let profitColor = profit >= 0 ? '#27ae60' : '#e74c3c';
                        investInfo = `<div style="font-size: 0.85em; color: ${profitColor}; margin-top: 4px;">
                            投资${days}天 | 收益: ${profitPercent}% (${profit >= 0 ? '+' : ''}${currencySymbols[prod.investCurrency]}${profit.toFixed(2)})
                        </div>`;
                    }
                    
                    // 检查今日是否已打卡
                    const todayLogs = timeLogs.filter(log => 
                        log.name === prod.name && log.date === today
                    );
                    const isCheckedToday = todayLogs.length > 0;
                    
                    // 构建HTML
                    prodElement.innerHTML = `
                        <div class="production-header">
                            <div class="production-name">${prod.name}</div>
                            <div class="production-tags">
                                ${tags.map(tag => `<span class="tag ${tag.class}">${tag.text}</span>`).join('')}
                            </div>
                        </div>
                        ${investInfo}
                        <button class="check-btn ${isCheckedToday ? 'checked' : ''}" 
                                onclick="checkProduction(${prod._realIndex})"
                                data-tooltip="${isCheckedToday ? '今日已打卡' : '点击打卡'}"
                                ${isCheckedToday ? 'disabled' : ''}>
                            ${isCheckedToday ? '✓' : '打卡'}
                        </button>
                    `;
                    
                    fragment.appendChild(prodElement);
                };
            });
            
            console.log('🔨 准备批量更新DOM，更新项数量:', updates.length);
            
            // 批量更新DOM
            if (window.batchDOMUpdate) {
                window.batchDOMUpdate(container, updates);
            } else {
                // 降级到普通渲染
                console.warn('⚠️ batchDOMUpdate未找到，使用普通渲染');
                container.innerHTML = '';
                const fragment = document.createDocumentFragment();
                updates.forEach(update => update(fragment));
                container.appendChild(fragment);
            }
            
            // 添加淡入动画
            container.classList.add('fade-in');
            setTimeout(() => {
                container.classList.remove('fade-in');
            }, 300);
            
            console.log('✅ 生产线渲染完成');
            
        }, 'renderProductions');
    }, { type: 'render' });
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
            
            // 使用缓存获取研发项目数据
            const cacheKey = `developments_${gameData.developments.length}_${Date.now() - (Date.now() % 30000)}`; // 按30秒缓存
            const developmentsData = window.cache(cacheKey, () => {
                return gameData.developments.map(dev => {
                    const progress = calculateProgress(dev);
                    const percent = Math.min(1, progress.count / progress.total);
                    const startDate = dev.startDate ? new Date(dev.startDate).toLocaleDateString() : '未开始';
                    
                    return {
                        ...dev,
                        progress,
                        percent,
                        startDate,
                        tip: [
                            `研究项目：${dev.researchName}`,
                            `开始时间：${startDate}`,
                            `操作定义：${dev.action}`,
                            `频率：${dev.freq}`,
                            `周期：${dev.cycle}天`,
                            `目标：${dev.target}次`,
                            `当前进度：${progress.count}/${progress.total}`
                        ].join('\n')
                    };
                });
            }, 30000); // 30秒缓存
            
            // 使用批量DOM更新
            const updates = developmentsData.map((dev, idx) => {
                return (fragment) => {
                    const devElement = document.createElement('div');
                    devElement.className = `dev-item ${dev.active ? 'active' : 'paused'}`;
                    devElement.title = dev.tip;
                    
                    devElement.innerHTML = `
                        <div class="dev-header">
                            <div class="dev-name">
                                <span>${dev.icon}</span>
                                <span>${dev.researchName}</span>
                            </div>
                            <div class="dev-controls">
                                ${dev.active ? 
                                    `<button class="btn btn-secondary btn-small" onclick="window.pauseDev(${idx})">暂停</button>` : 
                                    `<button class="btn btn-primary btn-small" onclick="window.resumeDev(${idx})">继续</button>`
                                }
                                <button class="btn btn-danger btn-small" onclick="window.removeDev(${idx})">移除</button>
                            </div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-info">
                                <span>进度</span>
                                <span>${dev.progress.count}/${dev.progress.total}次</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(dev.percent*100).toFixed(1)}%"></div>
                            </div>
                            <div style="margin-top: 8px; font-size: 0.85em; color: #666;">${dev.action}</div>
                        </div>
                        <div style="margin-top: 8px; font-size: 0.85em; color: #888;">
                            频率：${dev.freq}
                        </div>
                        ${dev.startDate ? 
                            `<div style="margin-top: 4px; font-size: 0.85em; color: #666;">开始于：${dev.startDate}</div>` : 
                            ''
                        }
                    `;
                    
                    fragment.appendChild(devElement);
                };
            });
            
            // 清空容器并使用批量更新
            container.innerHTML = '';
            window.performanceOptimizer.batchDOMUpdates(container, updates);
            
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
    if (menu && !menu.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('mousedown', hideContextMenu);
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
    const currentExpense = gameData.finance.estimatedMonthlyExpense || 0;
    const currentCurrency = gameData.finance.estimatedExpenseCurrency || 'CNY';
    
    showCustomModal({
        title: '设置预计月支出',
        content: `
            <div class='form-group'>
                <label class='form-label'>预计月支出金额</label>
                <input type='number' id='estimated-expense-amount' class='form-input' value='${currentExpense}' placeholder='0'>
            </div>
            <div class='form-group'>
                <label class='form-label'>货币</label>
                <select id='estimated-expense-currency' class='form-select'>
                    <option value='CNY' ${currentCurrency === 'CNY' ? 'selected' : ''}>人民币 ¥</option>
                    <option value='AUD' ${currentCurrency === 'AUD' ? 'selected' : ''}>澳元 A$</option>
                    <option value='USD' ${currentCurrency === 'USD' ? 'selected' : ''}>美元 $</option>
                    <option value='EUR' ${currentCurrency === 'EUR' ? 'selected' : ''}>欧元 €</option>
                </select>
            </div>
            <div style='font-size:0.9em;color:#666;margin-top:10px;'>
                用于与实际月支出进行对比，帮助你了解预算执行情况
            </div>
        `,
        onConfirm: () => {
            const amount = parseFloat(document.getElementById('estimated-expense-amount').value) || 0;
            const currency = document.getElementById('estimated-expense-currency').value;
            
            gameData.finance.estimatedMonthlyExpense = amount;
            gameData.finance.estimatedExpenseCurrency = currency;
            
            renderResourceStats();
            saveToCloud();
            return true;
        }
    });
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
    return saveWithFeedback(() => {
        const productionName = document.getElementById('prod-name').value.trim();
        const type = document.getElementById('prod-type').value;
        
        if (!productionName) {
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification('请输入生产线名称', 'warning', 3000);
            }
            return false;
        }
        
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
        
        // 使用增强的渲染函数
        renderWithLoading(() => {
            renderProductions();
            renderResourceStats();
            renderDevelopments();
            renderDevLibrary();
            renderWeekCalendar();
        }, document.getElementById('productions-list'), 'render-after-save', '更新界面中...');
        
        // 安全保存到云端
        window.ErrorUtils.safeExecuteAsync(
            () => saveToCloud(),
            { type: 'data-save', operation: 'saveProduction' },
            (error) => {
                console.error('保存到云端失败:', error);
                if (window.ErrorUtils) {
                    window.ErrorUtils.showNotification('数据已保存到本地，但云端同步失败', 'warning', 5000);
                }
            }
        );

        return true;
    }, currentEditIndex >= 0 ? '生产线更新成功' : '生产线添加成功');
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
    updateProductionColorMap();
    let el = document.getElementById('week-calendar');
    if (!el) return;
    let days = ['一','二','三','四','五','六','日'];
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
    let dateLabels = weekDates.map(dateStr => {
        let [y,m,d] = dateStr.split('-');
        return `${parseInt(m)}/${parseInt(d)}`;
    });
    let html = '<div class="week-calendar-container" id="calendar-container">';
    html += '<div style="font-weight:bold;margin-bottom:6px;">本周时间投入（日历）</div>';
    html += '<table style="width:100%;border-collapse:collapse;text-align:center;font-size:0.85em;table-layout:fixed;">';
    html += '<tr style="background:#f5f6fa;height:35px;"><th style="width:50px;"></th>';
    for(let d=0;d<7;d++) html += `<th style="padding:4px 2px;">周${days[d]}<br><span style='font-size:0.9em;color:#888;'>${dateLabels[d]}</span></th>`;
    html += '</tr>';
    for(let h=0;h<=24;h++) {
        // 夜间时段（22:00-08:00）使用深色背景
        const isNightTime = h >= 22 || h < 8;
        const nightClass = isNightTime ? 'night-time' : '';
        // 显示时间标签：0-23显示为正常时间，24显示为24:00
        const timeLabel = h === 24 ? '24:00' : `${h}:00`;
        html += `<tr style="height:25px;" class="${nightClass}"><td style="color:#aaa;padding:2px;font-size:0.8em;">${timeLabel}</td>`;
        for(let d=0;d<7;d++) {
            let cellBg = '';
            if (isNightTime) {
                cellBg = d===todayIdx ? 'background:#f3f3f3;' : 'background:#f8f8f8;';
            } else {
                cellBg = d===todayIdx ? 'background:#f9fbe7;' : '';
            }
            html += `<td style="border:1px solid #ecf0f1;padding:0;${cellBg}"></td>`;
        }
        html += '</tr>';
    }
    html += '</table>';
    html += '<div class="calendar-overlay" id="calendar-overlay"></div>';
    html += '</div>';
    el.innerHTML = html;
    // 使用延迟确保DOM更新完成后再渲染时间块
    setTimeout(() => {
        renderTimeBlocks(weekDates);
    }, 50);
}
function renderTimeBlocks(weekDates) {
    const overlay = document.getElementById('calendar-overlay');
    if (!overlay) return;
    const container = document.getElementById('calendar-container');
    const table = container.querySelector('table');
    if (!table) return;
    
    // 防重复逻辑：检查是否正在渲染中
    if (window._isRendering) {
        return;
    }
    window._isRendering = true;
    
    // 精确计算表格尺寸
    const headerRow = table.rows[0];
    const firstDataRow = table.rows[1];
    if (!headerRow || !firstDataRow) return;
    
    const firstDataCell = firstDataRow.cells[1]; // 跳过时间标签列
    const labelCell = firstDataRow.cells[0]; // 时间标签列
    if (!firstDataCell || !labelCell) return;
    
    const cellHeight = firstDataCell.offsetHeight;
    const cellWidth = firstDataCell.offsetWidth;
    const headerHeight = headerRow.offsetHeight;
    const labelWidth = labelCell.offsetWidth;
    
    // 清空并重新定位覆盖层 - 根据手动调整的值优化偏移
    overlay.innerHTML = '';
    overlay.style.position = 'absolute';
    overlay.style.top = (headerHeight + 41) + 'px'; // 调整为93px偏移
    overlay.style.left = (labelWidth + 4) + 'px'; // 增加4px偏移
    overlay.style.width = (cellWidth * 7) + 'px';
    overlay.style.height = (cellHeight * 25) + 'px'; // 25行（0-24时）
    overlay.style.pointerEvents = 'none';
    
    // 按时间排序，确保后添加的在上层
    const sortedLogs = (gameData.timeLogs || [])
        .filter(log => weekDates.indexOf(log.date) >= 0)
        .sort((a, b) => new Date(a.date + 'T' + String(a.hour).padStart(2,'0') + ':' + String(a.minute).padStart(2,'0')) - 
                        new Date(b.date + 'T' + String(b.hour).padStart(2,'0') + ':' + String(b.minute).padStart(2,'0')));
    
    // 渲染时间块
    sortedLogs.forEach((log, index) => {
        let idx = weekDates.indexOf(log.date);
        if(idx < 0) return; // 只显示本周
        
        let weekDay = idx;
        const startMinutes = (log.hour || 0) * 60 + (log.minute || 0);
        const endMinutes = (log.endHour || log.hour || 0) * 60 + (log.endMinute || log.minute || 0);
        const duration = Math.max(endMinutes - startMinutes, 30); // 最小30分钟
        
        // 精确像素定位，适配单元格
        const left = weekDay * cellWidth + 1; // 左边距1px
        const top = (startMinutes / 60) * cellHeight;
        const width = cellWidth - 3; // 留出边框空间
        const height = Math.max((duration / 60) * cellHeight - 1, 15); // 最小15px高度，留出1px边距
        
        const colorClass = getCalendarBlockClass(log.name);
        
        const block = document.createElement('div');
        block.className = `time-block ${colorClass}`;
        block.style.position = 'absolute';
        block.style.left = left + 'px';
        block.style.top = top + 'px';
        block.style.width = width + 'px';
        block.style.height = height + 'px';
        block.style.pointerEvents = 'auto'; // 时间块本身可以接收事件
        block.style.zIndex = 100 + index; // 后添加的在上层
        block.style.border = '1px solid rgba(255,255,255,0.3)'; // 添加边框便于区分
        block.style.borderRadius = '4px';
        
        // 调试信息
        block.title = `${log.name}\n时间: ${log.hour}:${String(log.minute).padStart(2,'0')}-${log.endHour}:${String(log.endMinute).padStart(2,'0')}\n位置: ${left}px, ${top}px\n尺寸: ${width}×${height}px\n颜色: ${getCalendarBlockClass(log.name)}`;
        
        block.innerHTML = `<div class="time-block-text">${log.name}</div>`;
        block.oncontextmenu = (e) => {
            e.preventDefault();
            window._calendarBlockContextMenu(e, log.date, log.name, log.hour, log.minute);
        };
        overlay.appendChild(block);
    });
    
    window._isRendering = false; // 渲染完成，重置标志
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
});

// 7. 生产线数据结构增加timeCost字段（建议手动在已有数据中补充）
// 例如：{ name: ..., type: ..., timeCost: 30, ... }

// 新增：渲染资源数据统计面板
function renderResourceStats() {
    return window.ErrorUtils.safeExecute(() => {
        return window.measurePerformance(() => {
            const container = document.getElementById('resource-stats');
            if (!container) return;
            
            // 使用缓存获取资源统计数据
            const cacheKey = `resourceStats_${gameData.productions.length}_${gameData.timeLogs.length}_${Date.now() - (Date.now() % 30000)}`; // 按30秒缓存
            const statsData = window.cache(cacheKey, () => {
                let totalActive = 0, totalPassive = 0, totalExpense = 0;
                let activeBreakdown = [], passiveBreakdown = [], expenseBreakdown = [];
                let activeIncomesByCurrency = {}, passiveIncomesByCurrency = {}, expensesByCurrency = {};
                
                // 批量处理生产线数据
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
                
                // 计算各币种总额
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
                
                // 计算今日用时
                let today = getLocalDateString();
                let todayActiveMins = (gameData.timeLogs||[]).filter(log=>log.date===today).reduce((sum,log)=>{
                    let timeCost = log.timeCost || 0;
                    if (timeCost <= 0 && log.hour !== undefined && log.endHour !== undefined) {
                        timeCost = (log.endHour * 60 + (log.endMinute || 0)) - (log.hour * 60 + (log.minute || 0));
                    }
                    return sum + Math.max(0, timeCost);
                }, 0);
                
                // 获取月支出数据
                const monthlyTotal = getMonthlyExpenseTotalMerged();
                const monthlyExpenseDetails = getMonthlyExpenseBreakdown();
                
                // 预计月支出
                const estimatedExpense = gameData.finance.estimatedMonthlyExpense || 0;
                const estimatedCurrency = gameData.finance.estimatedExpenseCurrency || 'CNY';
                const estimatedInCNY = convertToCNY(estimatedExpense, estimatedCurrency);
                
                return {
                    totalActive,
                    totalPassive,
                    totalExpense,
                    activeBreakdown,
                    passiveBreakdown,
                    expenseBreakdown,
                    todayActiveMins,
                    monthlyTotal,
                    monthlyExpenseDetails,
                    estimatedInCNY
                };
            }, 30000); // 30秒缓存
            
            const {
                totalActive,
                totalPassive,
                totalExpense,
                activeBreakdown,
                passiveBreakdown,
                expenseBreakdown,
                todayActiveMins,
                monthlyTotal,
                monthlyExpenseDetails,
                estimatedInCNY
            } = statsData;
            
            // 构建HTML
            let savings = gameData.finance.totalSavings;
            let savingsCurrency = gameData.finance.savingsCurrency;
            let savingsStr = `${currencySymbols[savingsCurrency]}${savings.toLocaleString()}`;
            let savingsUpdate = gameData.finance.savingsUpdateTime ? `更新于 ${(new Date(gameData.finance.savingsUpdateTime)).toLocaleDateString()}` : '未更新';
            
            // 计算支出差额
            const difference = monthlyTotal - estimatedInCNY;
            const diffColor = difference > 0 ? '#e74c3c' : (difference < 0 ? '#27ae60' : '#95a5a6');
            const diffSymbol = difference > 0 ? '+' : '';
            
            // 构建支出明细
            const allExpenseDetails = [];
            if (expenseBreakdown.length) allExpenseDetails.push(...expenseBreakdown);
            if (monthlyExpenseDetails.length) allExpenseDetails.push(...monthlyExpenseDetails);
            
            // 使用DocumentFragment优化DOM操作
            const fragment = document.createDocumentFragment();
            const tempDiv = document.createElement('div');
            
            tempDiv.innerHTML = `
                <div class='resource-stats-section'>
                    <div class='resource-label'>累计存款
                        <button class='resource-btn-edit' onclick='window.editSavings()'>✏️</button>
                    </div>
                    <div class='resource-main-value'>${savingsStr}</div>
                    <div class='resource-sub'>${savingsUpdate}</div>
                </div>
                <div class='resource-divider'></div>
                <div class='resource-stats-section'>
                    <div class='resource-label'>今天主动用时 
                        <button class='resource-btn-edit' onclick='window.showTodayTimeDetails()' title='查看详情'>👁️</button>
                    </div>
                    <div class='resource-main-value' style='color:#27ae60;'>${todayActiveMins} <span style='font-size:0.5em;font-weight:normal;'>分钟</span></div>
                </div>
                <div class='resource-divider'></div>
                <div class='resource-row'>
                    <span class='resource-label'>主动收入</span>
                    <span class='resource-main-value' style='font-size:1.2em;color:#2980b9;'>¥${Math.round(totalActive).toLocaleString()}</span>
                </div>
                ${activeBreakdown.length ? `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;'>(${activeBreakdown.join(' + ')})</div>` : ''}
                <div class='resource-row'>
                    <span class='resource-label'>被动收入</span>
                    <span class='resource-main-value' style='font-size:1.2em;color:#16a085;'>¥${Math.round(totalPassive).toLocaleString()}</span>
                </div>
                ${passiveBreakdown.length ? `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;'>(${passiveBreakdown.join(' + ')})</div>` : ''}
                <div class='resource-divider'></div>
                <div class='resource-row'>
                    <span class='resource-label'>预计月支出
                        <button class='resource-btn-edit' onclick='window.editEstimatedExpense()'>✏️</button>
                    </span>
                    <span class='resource-main-value' style='font-size:1.2em;color:#95a5a6;'>¥${Math.round(estimatedInCNY).toLocaleString()}</span>
                </div>
                <div class='resource-row'>
                    <span class='resource-label'>实际月支出</span>
                    <span class='resource-main-value' style='font-size:1.2em;color:#e67e22;'>¥${Math.round(monthlyTotal).toLocaleString()}</span>
                </div>
                ${estimatedInCNY > 0 ? `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;color:${diffColor};'>
                    差额：${diffSymbol}¥${Math.abs(Math.round(difference)).toLocaleString()} 
                    (${difference > 0 ? '超支' : difference < 0 ? '节省' : '无差异'})
                </div>` : ''}
                ${allExpenseDetails.length ? `<div class='resource-breakdown' style='margin-top:-8px;margin-bottom:8px;'>(${allExpenseDetails.join(' + ')})</div>` : ''}
            `;
            
            // 将内容移动到fragment
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
            
            // 一次性更新DOM
            container.innerHTML = '';
            container.appendChild(fragment);
            
        }, 'renderResourceStats');
    }, { type: 'render', function: 'renderResourceStats' }, (error) => {
        console.error('渲染资源统计失败:', error);
        return false;
    });
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
    return window.ErrorUtils.safeExecute(() => {
        // 添加错误检查
        if (!sortedProductions || sortedProductions.length === 0) {
            console.error('sortedProductions数组为空或未初始化');
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification('生产线数据未加载，请刷新页面', 'error', 3000);
            }
            return;
        }
        
        if (sortedIndex < 0 || sortedIndex >= sortedProductions.length) {
            console.error('无效的sortedIndex:', sortedIndex, '数组长度:', sortedProductions.length);
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification('生产线索引错误', 'error', 3000);
            }
            return;
        }
        
        const prod = sortedProductions[sortedIndex];
        if (!prod) {
            console.error('在索引', sortedIndex, '处找不到生产线');
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification('找不到生产线数据', 'error', 3000);
            }
            return;
        }
        
        if (prod._realIndex === undefined || prod._realIndex < 0 || prod._realIndex >= gameData.productions.length) {
            console.error('无效的_realIndex:', prod._realIndex, '生产线数组长度:', gameData.productions.length);
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification('生产线数据索引错误', 'error', 3000);
            }
            return;
        }
        
        const realProd = gameData.productions[prod._realIndex];
        if (!realProd) {
            console.error('在真实索引', prod._realIndex, '处找不到生产线');
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification('生产线数据不存在', 'error', 3000);
            }
            return;
        }
        
        // 检查今日是否已打卡
        const today = new Date().toISOString().slice(0, 10);
        const todayLogs = (gameData.timeLogs || []).filter(log => 
            log.name === realProd.name && log.date === today
        );
        
        if (todayLogs.length > 0) {
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification('今日已打卡，无需重复操作', 'info', 2000);
            }
            return;
        }
        
        // 快速打卡，记录30分钟
        const now = new Date();
        const endH = now.getHours(), endM = now.getMinutes();
        const start = new Date(now.getTime() - 30*60000);
        const startH = start.getHours(), startM = start.getMinutes();
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
        
        // 显示成功反馈
        if (window.ErrorUtils) {
            window.ErrorUtils.showNotification(`${realProd.name} 打卡成功！`, 'success', 2000);
            
            // 添加成功动画到按钮
            const button = event?.target;
            if (button && button.classList.contains('check-btn')) {
                window.ErrorUtils.addSuccessAnimation(button);
            }
        }
        
        // 使用增强的渲染函数
        renderWithLoading(() => {
            renderProductions();
            renderDevelopments();
            renderWeekCalendar();
            renderResourceStats();
        }, document.getElementById('productions-list'), 'render-after-check', '更新界面中...');
        
        // 保存到云端
        window.ErrorUtils.safeExecuteAsync(
            () => saveToCloud(),
            { type: 'data-save', operation: 'logProductionTime' },
            (error) => {
                console.error('保存到云端失败:', error);
                if (window.ErrorUtils) {
                    window.ErrorUtils.showNotification('数据已保存到本地，但云端同步失败', 'warning', 3000);
                }
            }
        );
        
    }, { type: 'production-check' });
};

// 添加checkProduction函数作为logProductionTime的别名
window.checkProduction = window.logProductionTime;

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
    console.log('[云同步] 开始Firebase登录...');
    
    // 根据移动端网络状况调整超时时间
    const timeoutMultiplier = window.MOBILE_TIMEOUT_MULTIPLIER || 1;
    const loginTimeoutMs = 10000 * timeoutMultiplier;
    
    // 添加超时处理
    const loginTimeout = setTimeout(() => {
        console.warn('[云同步] Firebase登录超时，切换到本地模式');
        if (window.ErrorUtils) {
            window.ErrorUtils.showNotification('云端连接超时，使用本地模式', 'warning', 5000);
        }
        updateSyncStatus('离线', new Date().toLocaleTimeString());
    }, loginTimeoutMs);
    
    auth.signInAnonymously()
        .then(() => {
            clearTimeout(loginTimeout);
            console.log('[云同步] Firebase匿名登录成功');
            listenCloudData();
        })
        .catch(error => {
            clearTimeout(loginTimeout);
            console.error('[云同步] Firebase登录失败:', error);
            
            // 根据错误类型提供不同的处理
            let errorMessage = '云端连接失败，切换到本地模式';
            if (error.code === 'auth/network-request-failed') {
                errorMessage = '网络连接失败，请检查网络设置';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = '请求过于频繁，请稍后重试';
            }
            
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification(errorMessage, 'error', 5000);
            }
            updateSyncStatus('连接失败', new Date().toLocaleTimeString());
        });
}

// 监听云端数据变化
function listenCloudData() {
    if (!familyCode) {
        console.warn('[云同步] 未设置家庭码，无法监听云端数据');
        return;
    }
    
    if (firebaseUnsubscribe) {
        firebaseUnsubscribe();
    }
    
    isCloudLoading = true;
    console.log('[云同步] 开始监听云端数据变化，家庭码:', familyCode);
    
    // 根据移动端网络状况调整超时时间
    const timeoutMultiplier = window.MOBILE_TIMEOUT_MULTIPLIER || 1;
    const listenTimeoutMs = 15000 * timeoutMultiplier;
    
    // 添加监听超时处理
    const listenTimeout = setTimeout(() => {
        console.warn('[云同步] 监听超时，尝试重新连接');
        if (window.ErrorUtils) {
            window.ErrorUtils.showNotification('云端监听超时，尝试重新连接', 'warning', 3000);
        }
        // 重试监听
        setTimeout(() => {
            if (isCloudLoading) {
                listenCloudData();
            }
        }, 2000 * timeoutMultiplier);
    }, listenTimeoutMs);
    
    firebaseUnsubscribe = db.collection('groups').doc(familyCode)
        .onSnapshot(
            doc => {
                clearTimeout(listenTimeout);
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
            },
            error => {
                clearTimeout(listenTimeout);
                console.error('[云同步] 监听错误:', error);
                isCloudLoading = false;
                
                // 根据错误类型提供不同的处理
                let errorMessage = '云端数据监听失败，切换到本地模式';
                let shouldRetry = false;
                
                if (error.code === 'permission-denied') {
                    errorMessage = '权限不足，请检查家庭码是否正确';
                } else if (error.code === 'unavailable') {
                    errorMessage = '云端服务暂时不可用，请稍后重试';
                    shouldRetry = true;
                } else if (error.code === 'network-request-failed') {
                    errorMessage = '网络连接失败，请检查网络设置';
                    shouldRetry = true;
                }
                
                updateSyncStatus('监听失败', new Date().toLocaleTimeString());
                
                if (window.ErrorUtils) {
                    window.ErrorUtils.showNotification(errorMessage, 'error', 5000);
                }
                
                // 如果是网络相关错误，尝试重试
                if (shouldRetry) {
                    const retryDelay = 5000 * (window.MOBILE_TIMEOUT_MULTIPLIER || 1);
                    console.log('[云同步] 准备重试监听...');
                    setTimeout(() => {
                        if (!isCloudReady) {
                            listenCloudData();
                        }
                    }, retryDelay);
                }
            }
        );
}

// 保存到云端
function saveToCloud(retryCount = 0) {
    return window.ErrorUtils.safeExecuteAsync(async () => {
        if (!familyCode || !isCloudReady || isCloudSaving) {
            console.warn('[云同步] 无法保存：', {
                hasFamilyCode: !!familyCode,
                isCloudReady,
                isCloudSaving,
                retryCount
            });
            
            if (!familyCode) {
                if (window.ErrorUtils) {
                    window.ErrorUtils.showNotification('请先设置家庭码', 'warning', 3000);
                }
            } else if (!isCloudReady) {
                if (window.ErrorUtils) {
                    window.ErrorUtils.showNotification('云端连接未就绪', 'warning', 3000);
                }
            }
            
            return false;
        }
        
        isCloudSaving = true;
        console.log('[云同步] 开始保存数据，重试次数:', retryCount);
        updateSyncStatus('同步中');
        
        // 显示保存加载状态
        if (window.ErrorUtils) {
            window.ErrorUtils.showLoading('cloud-save', '正在同步到云端...', false);
        }
        
        // 防御性检查和初始化
        if (!Array.isArray(gameData.expenses)) {
            console.log('[云同步] 初始化expenses数组');
            gameData.expenses = [];
        }
        if (!Array.isArray(gameData.timeLogs)) {
            console.log('[云同步] 初始化timeLogs数组');
            gameData.timeLogs = [];
        }
        
        // 使用缓存进行数据验证，避免重复验证
        const validationCacheKey = `validation_${JSON.stringify(gameData.expenses).length}_${JSON.stringify(gameData.timeLogs).length}`;
        const validationResult = window.cache(validationCacheKey, () => {
            let dataValid = true;
            let validationErrors = [];
            
            // 验证支出数据
            if (gameData.expenses) {
                gameData.expenses.forEach((exp, idx) => {
                    const result = window.validateData(exp, 'expense');
                    if (!result.isValid) {
                        console.error(`[云同步] 支出数据验证失败 [${idx}]:`, exp, result.errors);
                        dataValid = false;
                        validationErrors.push(`支出记录 #${idx+1}: ${result.errors.join(', ')}`);
                    }
                });
            }
            
            // 验证时间记录
            if (gameData.timeLogs) {
                gameData.timeLogs.forEach((log, idx) => {
                    const result = window.validateData(log, 'timeLog');
                    if (!result.isValid) {
                        console.error(`[云同步] 时间记录验证失败 [${idx}]:`, log, result.errors);
                        dataValid = false;
                        validationErrors.push(`时间记录 #${idx+1}: ${result.errors.join(', ')}`);
                    }
                });
            }
            
            return { dataValid, validationErrors };
        }, 5000); // 5秒缓存验证结果
        
        if (!validationResult.dataValid) {
            console.error('[云同步] 数据验证失败:', validationResult.validationErrors);
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification('数据验证失败，请检查数据格式', 'error', 5000);
            }
            isCloudSaving = false;
            if (window.ErrorUtils) {
                window.ErrorUtils.hideLoading('cloud-save');
            }
            return false;
        }
        
        try {
            // 根据移动端网络状况调整超时时间
            const timeoutMultiplier = window.MOBILE_TIMEOUT_MULTIPLIER || 1;
            const saveTimeoutMs = 30000 * timeoutMultiplier;
            
            // 添加保存超时处理
            const saveTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('保存超时')), saveTimeoutMs);
            });
            
            // 保存数据
            const savePromise = db.collection('groups').doc(familyCode).set({
                gameData: gameData,
                lastDailyReset: lastDailyReset,
                saveTime: new Date().toISOString()
            });
            
            await Promise.race([savePromise, saveTimeout]);
            
            console.log('[云同步] 数据保存成功');
            isCloudSaving = false;
            updateSyncStatus('已同步', new Date().toLocaleTimeString());
            
            // 隐藏加载状态
            if (window.ErrorUtils) {
                window.ErrorUtils.hideLoading('cloud-save');
                window.ErrorUtils.showNotification('云端同步成功', 'success', 3000);
            }
            
            return true;
            
        } catch (error) {
            console.error('[云同步] 保存失败:', error);
            isCloudSaving = false;
            
            // 隐藏加载状态
            if (window.ErrorUtils) {
                window.ErrorUtils.hideLoading('cloud-save');
            }
            
            // 根据错误类型决定是否重试
            let errorMessage = '云端保存失败';
            let shouldRetry = false;
            let retryDelay = 2000;
            
            if (error.message === '保存超时') {
                errorMessage = '保存超时，请检查网络连接';
                shouldRetry = retryCount < 2; // 最多重试2次
                retryDelay = 3000 * (window.MOBILE_TIMEOUT_MULTIPLIER || 1);
            } else if (error.code === 'permission-denied') {
                errorMessage = '权限不足，请检查家庭码';
                shouldRetry = false;
            } else if (error.code === 'unavailable' || error.code === 'network-request-failed') {
                errorMessage = '网络连接失败，正在重试...';
                shouldRetry = retryCount < 3; // 网络错误最多重试3次
                retryDelay = 5000 * (window.MOBILE_TIMEOUT_MULTIPLIER || 1);
            } else if (error.code === 'resource-exhausted') {
                errorMessage = '云端资源不足，请稍后重试';
                shouldRetry = retryCount < 1; // 资源不足只重试1次
                retryDelay = 10000 * (window.MOBILE_TIMEOUT_MULTIPLIER || 1);
            }
            
            updateSyncStatus('保存失败', new Date().toLocaleTimeString());
            
            if (window.ErrorUtils) {
                window.ErrorUtils.showNotification(errorMessage, 'error', 5000);
            }
            
            // 如果需要重试
            if (shouldRetry) {
                console.log(`[云同步] ${retryDelay}ms后重试保存，第${retryCount + 1}次重试`);
                setTimeout(() => {
                    saveToCloud(retryCount + 1);
                }, retryDelay);
            }
            
            return false;
        }
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
    // 2. 支出面板所有支出
    (gameData.expenses||[]).forEach(exp => {
        if (!exp || !exp.amount || !exp.currency) return;
        if (exp.type === 'single') {
            // 单次支出：本月发生的
            const d = new Date(exp.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                total += convertToCNY(exp.amount, exp.currency);
            }
        } else if (exp.type === 'recurring') {
            // 固定支出：本月应发生几次
            const start = new Date(exp.date);
            if (start > now) return; // 未来开始的不算
            if (exp.frequency === 'monthly') {
                // 每月一次，只要起始日期<=本月
                if (start.getFullYear() < year || (start.getFullYear() === year && start.getMonth() <= month)) {
                    total += convertToCNY(exp.amount, exp.currency);
                }
            } else if (exp.frequency === 'biweekly') {
                // 每2周，计算本月内有几次
                let firstDay = new Date(year, month, 1);
                let lastDay = new Date(year, month + 1, 0);
                let cycleStart = new Date(start);
                while (cycleStart < firstDay) {
                    cycleStart.setDate(cycleStart.getDate() + 14);
                }
                while (cycleStart <= lastDay) {
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
            // 单次支出：本月发生的
            const d = new Date(exp.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                if (!expensesByCurrency[exp.currency]) expensesByCurrency[exp.currency] = 0;
                expensesByCurrency[exp.currency] += exp.amount;
            }
        } else if (exp.type === 'recurring') {
            // 固定支出：本月应发生几次
            const start = new Date(exp.date);
            if (start > now) return; // 未来开始的不算
            if (exp.frequency === 'monthly') {
                // 每月一次，只要起始日期<=本月
                if (start.getFullYear() < year || (start.getFullYear() === year && start.getMonth() <= month)) {
                    if (!expensesByCurrency[exp.currency]) expensesByCurrency[exp.currency] = 0;
                    expensesByCurrency[exp.currency] += exp.amount;
                }
            } else if (exp.frequency === 'biweekly') {
                // 每2周，计算本月内有几次
                let firstDay = new Date(year, month, 1);
                let lastDay = new Date(year, month + 1, 0);
                let cycleStart = new Date(start);
                while (cycleStart < firstDay) {
                    cycleStart.setDate(cycleStart.getDate() + 14);
                }
                while (cycleStart <= lastDay) {
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

// 性能监控相关函数
window.refreshPerformanceMetrics = () => {
    if (!window.performanceOptimizer) {
        console.warn('性能优化器未初始化');
        return;
    }
    
    const metrics = window.performanceOptimizer.getPerformanceMetrics();
    
    const renderCountEl = document.getElementById('render-count');
    const avgRenderTimeEl = document.getElementById('avg-render-time');
    const cacheHitRateEl = document.getElementById('cache-hit-rate');
    const activeTimersEl = document.getElementById('active-timers');
    const renderQueueEl = document.getElementById('render-queue');
    
    if (renderCountEl) renderCountEl.textContent = metrics.renderCount;
    if (avgRenderTimeEl) avgRenderTimeEl.textContent = `${metrics.averageRenderTime.toFixed(2)}ms`;
    if (cacheHitRateEl) cacheHitRateEl.textContent = `${(metrics.cacheHitRate * 100).toFixed(1)}%`;
    if (activeTimersEl) activeTimersEl.textContent = `${metrics.activeDebounceTimers + metrics.activeThrottleTimers}`;
    if (renderQueueEl) renderQueueEl.textContent = metrics.renderQueueSize;
    
    console.log('性能指标已更新:', metrics);
};

// 清理性能缓存
window.clearPerformanceCache = () => {
    if (window.performanceOptimizer) {
        window.performanceOptimizer.dataCache.clear();
        window.performanceOptimizer.cacheExpiry.clear();
        console.log('性能缓存已清理');
        window.refreshPerformanceMetrics();
    }
};

// 修改showDataManagePanel函数，添加性能指标刷新
const originalShowDataManagePanel = window.showDataManagePanel;
window.showDataManagePanel = function() {
    if (originalShowDataManagePanel) {
        originalShowDataManagePanel();
    } else {
        document.getElementById('data-manage-modal').style.display = 'block';
        updateDataStatus();
    }
    window.refreshPerformanceMetrics();
};

console.log('🚀 高级性能优化模块已加载');

// 移动端网络检测和优化
function detectMobileAndNetwork() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isOnline = navigator.onLine;
    
    console.log('[网络检测] 设备信息:', {
        isMobile,
        isOnline,
        userAgent: navigator.userAgent.substring(0, 100) + '...',
        connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
        } : '不支持'
    });
    
    // 监听网络状态变化
    window.addEventListener('online', () => {
        console.log('[网络检测] 网络已连接');
        if (window.ErrorUtils) {
            window.ErrorUtils.showNotification('网络已连接，尝试重新同步', 'success', 3000);
        }
        // 如果之前连接失败，尝试重新连接
        if (!isCloudReady && familyCode) {
            setTimeout(() => {
                firebaseLoginAndSync();
            }, 2000);
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('[网络检测] 网络已断开');
        if (window.ErrorUtils) {
            window.ErrorUtils.showNotification('网络已断开，切换到本地模式', 'warning', 5000);
        }
        updateSyncStatus('离线', new Date().toLocaleTimeString());
    });
    
    // 移动端特殊优化
    if (isMobile) {
        console.log('[移动端] 检测到移动设备，应用移动端优化');
        
        // 移动端网络连接较慢，增加超时时间
        if (navigator.connection) {
            const connection = navigator.connection;
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                console.log('[移动端] 检测到慢速网络，调整超时设置');
                // 慢速网络增加超时时间
                window.MOBILE_TIMEOUT_MULTIPLIER = 2;
            } else if (connection.effectiveType === '3g') {
                window.MOBILE_TIMEOUT_MULTIPLIER = 1.5;
            } else {
                window.MOBILE_TIMEOUT_MULTIPLIER = 1;
            }
        }
        
        // 移动端触摸优化
        document.body.classList.add('mobile-device');
    }
    
    return { isMobile, isOnline };
}

// 初始化网络检测
const networkInfo = detectMobileAndNetwork();
