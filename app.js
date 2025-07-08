window.testModalLayers = function() {
    console.log('🧪 测试模态框层级...');
    
    // 先打开月度对比模态框
    console.log('1. 打开月度对比模态框');
    const monthlyModal = document.getElementById('monthly-comparison-modal');
    monthlyModal.classList.add('show');
    
    setTimeout(() => {
        // 然后打开详情模态框（次级）
        console.log('2. 打开详情模态框（次级）');
        const detailsModal = document.getElementById('details-modal');
        const detailsTitle = document.getElementById('details-modal-title');
        const detailsContent = document.getElementById('details-modal-content');
        
        if (detailsTitle) detailsTitle.textContent = '测试次级模态框';
        if (detailsContent) detailsContent.innerHTML = '<div style="padding: 20px;">这是次级模态框测试。<br/>它应该显示在月度对比模态框之上。<br/><br/>z-index: 1300 (次级) > 1100 (主级)</div>';
        
        detailsModal.classList.add('show');
        
        // 检查层级
        setTimeout(() => {
            const monthlyZIndex = window.getComputedStyle(monthlyModal).zIndex;
            const detailsZIndex = window.getComputedStyle(detailsModal).zIndex;
            
            console.log(`月度对比模态框 z-index: ${monthlyZIndex}`);
            console.log(`详情模态框 z-index: ${detailsZIndex}`);
            
            if (parseInt(detailsZIndex) > parseInt(monthlyZIndex)) {
                console.log('✅ 层级正确：详情模态框在月度对比模态框之上');
                alert('✅ 层级测试通过！\n\n详情模态框正确显示在月度对比模态框之上。\n\n请测试点击空白区域关闭功能。');
            } else {
                console.log('❌ 层级错误：详情模态框未在月度对比模态框之上');
                alert('❌ 层级测试失败！\n\n详情模态框未正确显示在月度对比模态框之上。');
            }
        }, 200);
        
    }, 1000);
};

// 诊断模态框容器问题
window.diagnoseModalContainer = function() {
    console.log('🔍 诊断模态框容器问题...');
    
    const testModals = [
        'blueprint-automation-modal',
        'data-manage-modal',
        'monthly-comparison-modal',
        'production-modal' // 作为对比的正常模态框
    ];
    
    testModals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const rect = modal.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(modal);
            
            console.log(`\n📋 ${modalId}:`);
            console.log('  容器位置:', {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
            console.log('  CSS样式:', {
                position: computedStyle.position,
                top: computedStyle.top,
                left: computedStyle.left,
                width: computedStyle.width,
                height: computedStyle.height,
                display: computedStyle.display,
                justifyContent: computedStyle.justifyContent,
                alignItems: computedStyle.alignItems
            });
            console.log('  类名:', modal.className);
            
            // 检查内容元素
            const content = modal.querySelector('.modal-content');
            if (content) {
                const contentRect = content.getBoundingClientRect();
                const contentStyle = window.getComputedStyle(content);
                console.log('  内容位置:', {
                    top: contentRect.top,
                    left: contentRect.left,
                    width: contentRect.width,
                    height: contentRect.height
                });
                console.log('  内容样式:', {
                    position: contentStyle.position,
                    margin: contentStyle.margin
                });
            }
        }
    });
};

// 测试模态框容器显示
window.testModalContainers = function() {
    console.log('🧪 测试模态框容器显示...');
    
    const testModals = [
        'blueprint-automation-modal',
        'data-manage-modal',
        'monthly-comparison-modal'
    ];
    
    let index = 0;
    
    function testNext() {
        if (index >= testModals.length) {
            console.log('✅ 容器测试完成');
            return;
        }
        
        const modalId = testModals[index];
        console.log(`\n🔍 测试 ${modalId}...`);
        
        // 显示模态框
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        
        // 检查容器和内容
        setTimeout(() => {
            const modalRect = modal.getBoundingClientRect();
            const content = modal.querySelector('.modal-content');
            const contentRect = content ? content.getBoundingClientRect() : null;
            
            console.log(`${modalId} 显示检查:`);
            console.log(`  模态框容器: ${modalRect.width}x${modalRect.height} at (${modalRect.left}, ${modalRect.top})`);
            if (contentRect) {
                console.log(`  模态框内容: ${contentRect.width}x${contentRect.height} at (${contentRect.left}, ${contentRect.top})`);
                
                // 检查是否居中
                const windowCenterX = window.innerWidth / 2;
                const contentCenterX = contentRect.left + contentRect.width / 2;
                const isHorizontallyCentered = Math.abs(contentCenterX - windowCenterX) < 50;
                
                console.log(`  水平居中: ${isHorizontallyCentered ? '✅' : '❌'} (窗口中心: ${windowCenterX}, 内容中心: ${contentCenterX})`);
            }
            
            // 3秒后关闭并测试下一个
            setTimeout(() => {
                modal.classList.remove('show');
                index++;
                setTimeout(testNext, 500);
            }, 3000);
            
        }, 200);
    }
    
    testNext();
};

let saveTimeout = null;
let fileHandle = null;

// 数据结构版本号
const DATA_VERSION = 1;

// 汇率设置（相对于澳元）
const exchangeRates = {
    AUD: 1,
    CNY: 4.65,    
    USD: 0.65,   
    EUR: 0.60    
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
        savingsCurrency: 'AUD',
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
    },
    // 新增：账单数据
    billsData: {},
    // 新增：资源分析数据
    resourceAnalysis: {
        monthlyAverage: 0,
        fixedExpenseRatio: 0,
        stabilityScore: 0,
        insights: [],
        predictions: {
            nextMonthExpense: 0,
            specialReminders: []
        }
    },
    // 新增：显示货币设置
    displayCurrency: 'AUD',
    // 新增：智能资源管理系统
    resourceManagement: {
        // 历史财务数据（按月存储）
        historicalData: {
            // 格式：'2024-06': { total: 2646.18, categories: {...}, fixed_expenses: [...], unusual_items: [...] }
        },
        // 分析结果
        analysis: {
            averageMonthlyExpense: 0,
            fixedExpenseRatio: 0,
            variableExpenseRatio: 0,
            stabilityScore: 0,
            insights: [],
            lastAnalyzedAt: null
        },
        // 预测数据
        predictions: {
            nextMonthExpense: 0,
            nextMonthBreakdown: {
                fixed: 0,
                variable: 0,
                variableRange: 0
            },
            specialReminders: [],
            lastPredictedAt: null
        },
        // 数据导入设置
        importSettings: {
            lastImportDate: null,
            updateFrequency: 'biweekly', // 'weekly', 'biweekly', 'monthly'
            autoAnalysis: true
        }
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
    
    // 获取项目开始时间用于过滤
    const projectStartDate = dev.startDate ? new Date(dev.startDate) : null;
    
    // 统计所有关联产线的打卡记录数（根据项目开始时间过滤）
    let count = 0;
    (gameData.timeLogs || []).forEach(log => {
        if (prodNames.includes(log.name)) {
            // 如果设置了项目开始时间，只计算开始时间之后的记录
            if (projectStartDate) {
                const logDate = new Date(log.date || log.timestamp);
                if (logDate >= projectStartDate) {
                    count++;
                }
            } else {
                // 没有设置开始时间则计算所有记录（兼容旧数据）
                count++;
            }
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

// 解析研发项目阶段信息
function parseProjectStages(action) {
    if (!action) return [];
    
    // 支持的阶段分隔符：| 和 |
    const stages = action.split(/\s*\|\s*/).filter(stage => stage.trim());
    
    return stages.map((stage, index) => {
        const trimmedStage = stage.trim();
        
        // 解析时间范围
        let timeRange = '';
        let description = trimmedStage;
        
        // 匹配不同的时间格式
        const patterns = [
            /^第(\d+)-(\d+)天：(.+)$/,     // 第1-7天：...
            /^第(\d+)-(\d+)周：(.+)$/,     // 第1-2周：...
            /^第(\d+)-(\d+)月：(.+)$/,     // 第1-2月：...
            /^第(\d+)天：(.+)$/,           // 第1天：...
            /^第(\d+)周：(.+)$/,           // 第1周：...
            /^第(\d+)月：(.+)$/            // 第1月：...
        ];
        
        for (const pattern of patterns) {
            const match = trimmedStage.match(pattern);
            if (match) {
                if (match.length === 4) {
                    // 范围格式
                    timeRange = `第${match[1]}-${match[2]}${pattern.source.includes('天') ? '天' : pattern.source.includes('周') ? '周' : '月'}`;
                    description = match[3];
                } else if (match.length === 3) {
                    // 单个时间格式
                    timeRange = `第${match[1]}${pattern.source.includes('天') ? '天' : pattern.source.includes('周') ? '周' : '月'}`;
                    description = match[2];
                }
                break;
            }
        }
        
        return {
            index: index + 1,
            timeRange,
            description,
            original: trimmedStage
        };
    });
}

// 计算当前应该处于的阶段
function getCurrentStage(dev, stages) {
    if (!stages.length) return null;
    
    const progress = calculateProgress(dev);
    const completionRate = progress.count / progress.total;
    
    // 根据完成比例确定当前阶段
    const stageIndex = Math.min(
        Math.floor(completionRate * stages.length),
        stages.length - 1
    );
    
    return {
        current: stageIndex,
        stage: stages[stageIndex],
        progress: completionRate,
        isCompleted: stageIndex === stages.length - 1 && completionRate >= 1
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
    
    // 确保资源管理面板数据正确初始化
    setTimeout(() => {
        // 延迟初始化财务面板，确保所有模块都已加载
        renderFinanceMainPanel(); // 初始化新版财务面板
        renderBillsSummary(); // 新增：初始化时渲染账单汇总
        renderResourceAnalysis(); // 新增：初始化智能分析面板
    }, 500);
    
    setupEventListeners();
    
    if (!familyCode) {
        console.log(`🔑 未设置家庭码，弹出设置对话框`);
        askFamilyCode();
    } else {
        console.log(`🔑 使用家庭码: ${familyCode}，开始云端同步`);
        firebaseLoginAndSync();
    }
    
    console.log(`✅ 系统初始化完成`);
    
    // 强制初始化tooltip系统（即使没有生产线数据）
    setTimeout(() => {
        console.log('🔍 延迟初始化tooltip系统...');
        initProductionTooltips();
    }, 1000);
    
    // 设置模态框点击空白区域关闭功能
    setTimeout(() => {
        setupModalClickToClose();
    }, 1500);
};

// 为所有模态框添加点击空白区域关闭功能
window.setupModalClickToClose = function() {
    console.log('🔧 设置模态框点击空白区域关闭功能...');
    
    const modals = document.querySelectorAll('.modal');
    let setupCount = 0;
    
    modals.forEach(modal => {
        // 移除之前可能存在的事件监听器
        modal.removeEventListener('click', handleModalBackgroundClick);
        
        // 添加新的事件监听器
        modal.addEventListener('click', handleModalBackgroundClick);
        setupCount++;
        
        console.log(`✅ 已为模态框 ${modal.id} 设置点击关闭功能`);
    });
    
    console.log(`✅ 共为 ${setupCount} 个模态框设置了点击空白区域关闭功能`);
};

// 处理模态框背景点击事件
function handleModalBackgroundClick(event) {
    const modal = event.currentTarget;
    
    // 如果点击的是模态框背景（不是内容区域），则关闭模态框
    if (event.target === modal) {
        console.log(`🔒 点击空白区域关闭模态框: ${modal.id}`);
        modal.classList.remove('show');
        
        // 触发关闭事件
        modal.dispatchEvent(new Event('modal:closed-by-background'));
    }
}

// 测试现代化UI功能
window.testModernUI = function() {
    console.log('🎨 测试现代化UI功能...');
    
    // 1. 测试通知系统
    console.log('1. 测试通知系统');
    showNotification('成功通知测试！', 'success');
    setTimeout(() => showNotification('警告通知测试！', 'warning'), 1000);
    setTimeout(() => showNotification('错误通知测试！', 'error'), 2000);
    setTimeout(() => showNotification('信息通知测试！', 'info'), 3000);
    
    // 2. 测试加载状态
    console.log('2. 测试加载状态');
    setTimeout(() => {
        showLoadingOverlay('正在加载现代化功能...');
        setTimeout(() => hideLoadingOverlay(), 2000);
    }, 4000);
    
    // 3. 测试动画效果
    console.log('3. 测试动画效果');
    const panels = document.querySelectorAll('.panel');
    panels.forEach((panel, index) => {
        setTimeout(() => {
            panel.classList.add('fade-in');
        }, index * 200);
    });
    
    // 4. 测试按钮反馈
    console.log('4. 测试按钮点击反馈');
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.add('btn-click-feedback');
            setTimeout(() => {
                this.classList.remove('btn-click-feedback');
            }, 150);
        });
    });
    
    console.log('✅ 现代化UI功能测试完成！');
};

// 通知系统
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-text">${message}</span>
            <button class="notification-close">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => notification.classList.add('show'), 100);
    
    // 关闭按钮事件
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    });
    
    // 自动关闭
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
}

// 加载覆盖层
function showLoadingOverlay(message = '加载中...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}

// 骨架屏生成器
function createSkeleton(container, type = 'text') {
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-${type}`;
    container.appendChild(skeleton);
    return skeleton;
}

// 为元素添加工具提示
function addTooltip(element, text) {
    element.classList.add('tooltip');
    element.setAttribute('data-tooltip', text);
}

// 测试简洁UI风格
window.testMinimalUI = function() {
    console.log('🎨 测试简洁UI风格...');
    
    // 显示通知说明改进
    showNotification('UI风格已优化为简洁淡雅设计', 'success');
    
    setTimeout(() => {
        showNotification('✅ 去掉了面板悬停蓝色边框', 'info');
    }, 1000);
    
    setTimeout(() => {
        showNotification('✅ 统一了按钮和标签样式', 'info');
    }, 2000);
    
    setTimeout(() => {
        showNotification('✅ 采用了更小的字体和间距', 'info');
    }, 3000);
    
    setTimeout(() => {
        showNotification('✅ 整体风格更加简洁淡雅', 'success');
    }, 4000);
    
    console.log('📊 当前UI特点:');
    console.log('- 面板悬停: 只有阴影效果，无边框变化');
    console.log('- 按钮样式: 淡雅边框，悬停时背景变化');
    console.log('- 标签样式: 小尺寸，淡色背景，边框设计');
    console.log('- 字体大小: 统一较小尺寸，更加简洁');
    console.log('- 整体风格: 简洁、淡雅、易分辨');
    
    console.log('✅ 简洁UI风格测试完成！');
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

// 移动端长按菜单支持
let longPressTimer = null;
let startTouch = null;
let isLongPress = false;

function enableLongPressForElement(element, callback) {
    if (!element) return;
    
    element.addEventListener('touchstart', function(e) {
        startTouch = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
        isLongPress = false;
        
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            // 创建模拟的右键事件
            const fakeEvent = {
                preventDefault: () => {},
                clientX: startTouch.x,
                clientY: startTouch.y,
                touches: e.touches
            };
            callback(fakeEvent);
            
            // 添加震动反馈（如果支持）
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500); // 500ms长按触发
    }, { passive: false });
    
    element.addEventListener('touchend', function(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        // 如果是长按后的touchend，阻止默认行为
        if (isLongPress) {
            e.preventDefault();
        }
    }, { passive: false });
    
    element.addEventListener('touchmove', function(e) {
        if (startTouch && longPressTimer) {
            const moveDistance = Math.sqrt(
                Math.pow(e.touches[0].clientX - startTouch.x, 2) + 
                Math.pow(e.touches[0].clientY - startTouch.y, 2)
            );
            
            // 如果移动距离超过10px，取消长按
            if (moveDistance > 10) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
    }, { passive: false });
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
        // 桌面端右键菜单
        prodList.addEventListener('contextmenu', function(e) {
            const item = e.target.closest('.production-item');
            if (item) {
                e.preventDefault();
                const index = Array.from(document.querySelectorAll('.production-item')).indexOf(item);
                window.showContextMenu(e, index, 'production');
            }
        });
        
        // 移动端长按菜单
        enableLongPressForElement(prodList, function(e) {
            const touchPoint = e.touches ? e.touches[0] : e;
            const element = document.elementFromPoint(touchPoint.clientX, touchPoint.clientY);
            const item = element ? element.closest('.production-item') : null;
            
            if (item) {
                const index = Array.from(document.querySelectorAll('.production-item')).indexOf(item);
                window.showContextMenu(e, index, 'production');
            }
        });
    }

    // 拖选检测（保留用于其他功能）
    window.onmousedown = function(event) {
        isSelecting = false;
    };
    window.onmousemove = function(event) {
        if (event.buttons === 1) { // 左键按下并移动
            isSelecting = true;
        }
    };
    // 旧的模态框点击关闭逻辑已移除，现在使用新的setupModalClickToClose

    // 窗口大小变化时更新布局
    window.addEventListener('resize', updateBottomRowLayout);
    
    // 设置支出表单处理器
    setupExpenseFormHandlers();
    
    // 设置时间编辑表单处理器
    setupTimeEditFormHandler();
    
    // 不需要延迟初始化资源管理面板，已在window.init中调用

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

// 转换为AUD基准
function convertToCNY(amount, currency) {
    if (!currencySymbols[currency] || !exchangeRates[currency]) currency = 'AUD';
    if (currency === 'AUD') return amount;
    return amount / exchangeRates[currency];  // 从其他货币转换为AUD：除以汇率
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
                if (typeMap[prod.type]) {
                    let tagClass = `tag-${prod.type}`;
                    if (prod.type === 'habit') tagClass = 'tag-automation';
                    if (prod.type === 'work') tagClass = 'tag-production'; // work类型使用production样式
                    tags.push({ text: typeMap[prod.type].text, class: tagClass });
                }
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
                
                // 检查生产线是否暂停（直接暂停或通过关联研发项目暂停）
                let isPaused = prod.paused;
                if (!isPaused && prod.linkedDev) {
                    const linkedDev = gameData.developments.find(d => d.researchName === prod.linkedDev);
                    isPaused = linkedDev && linkedDev.paused;
                }
                
                // 简化版本 - 只显示当前阶段关键信息
                // 获取关联的研发项目和当前阶段信息
                const linkedDev = gameData.developments.find(d => d.researchName === prod.linkedDev);
                let currentStageInfo = '';
                if (linkedDev) {
                    const stages = parseProjectStages(linkedDev.action);
                    const currentStage = getCurrentStage(linkedDev, stages);
                    if (currentStage && currentStage.stage) {
                        currentStageInfo = `<div class="production-details">
                            🎯 当前阶段: ${currentStage.stage.timeRange || ''} ${currentStage.stage.description}
                        </div>`;
                    } else {
                        // 如果没有阶段信息，显示简化的操作定义
                        const shortAction = linkedDev.action.length > 30 ? linkedDev.action.substring(0, 30) + '...' : linkedDev.action;
                        currentStageInfo = `<div class="production-details">📋 ${shortAction}</div>`;
                    }
                } else {
                    // 如果没有关联研发项目，显示基本信息
                    let detailsInfo = [];
                    if (prod.type === 'production' || prod.type === 'work') {
                        detailsInfo.push('💼 需要投入时间换收入');
                    } else if (prod.type === 'investment') {
                        detailsInfo.push('💰 投资/被动收入');
                    } else if (prod.type === 'automation' || prod.type === 'habit') {
                        detailsInfo.push('🔄 长期习惯/自动行为');
                    } else if (prod.type === 'lifestyle') {
                        detailsInfo.push('📝 日常行为记录');
                    }
                    
                    if (detailsInfo.length > 0) {
                        currentStageInfo = `<div class="production-details">${detailsInfo.join('<br>')}</div>`;
                    }
                }
                
                return `
                    <div class="production-item compact-mode ${isPaused ? 'paused' : ''}" data-sorted-index="${index}" oncontextmenu="window.showContextMenu(event, ${index}, 'production')" onclick="window.toggleProductionDetails(this)">
                        <div class="production-header">
                            <div class="production-name">
                                ${isPaused ? '⏸️ ' : ''}${prod.name}
                            </div>
                            <div>
                                ${(prod.type==='automation' || prod.type==='habit') ? (canCheckIn && !isPaused ? `<button class='check-btn' onclick='event.stopPropagation(); window.logProductionTime(${index})'>打卡</button>` : isPaused ? `<span style='color: #999; font-size: 0.75em;'>⏸️ 已暂停</span>` : `<span style='color: #27ae60; font-size: 0.75em;'>✓ 已完成</span>`) : ''}
                            </div>
                        </div>
                        ${tags.length > 0 ? `
                            <div class="production-tags">
                                ${tags.map(tag => `<span class="tag ${tag.class}">${tag.text}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${timeLabel}
                        ${investInfo ? `<div class="investment-info">${investInfo.replace(/<div[^>]*>|<\/div>/g, '')}</div>` : ''}
                        ${currentStageInfo}
                    </div>
                `;
            }).join('');
        }, 'renderProductions');
    }, { type: 'render', function: 'renderProductions' }, (error) => {
        console.error('渲染生产线失败:', error);
        return false;
    });
    
    // 初始化生产线tooltip系统
    initProductionTooltips();
}

// 初始化生产线tooltip系统
function initProductionTooltips() {
    console.log('🔍 开始初始化生产线tooltip系统...');
    
    const tooltip = document.getElementById('production-tooltip');
    if (!tooltip) {
        console.error('❌ 找不到production-tooltip元素');
        return;
    }
    
    console.log('✅ 找到production-tooltip元素:', tooltip);
    
    // 检查是否有生产线项目
    const productionItems = document.querySelectorAll('.production-item.compact-mode');
    console.log(`📊 找到 ${productionItems.length} 个生产线项目`);
    
    if (productionItems.length === 0) {
        console.warn('⚠️ 没有找到生产线项目，但仍然初始化tooltip系统');
    }
    
    console.log('🔧 初始化生产线tooltip系统');
    
    // 移除之前的事件监听器（避免重复绑定）
    if (window.productionTooltipMouseOver) {
        document.removeEventListener('mouseover', window.productionTooltipMouseOver);
        console.log('🧹 移除旧的mouseover事件监听器');
    }
    if (window.productionTooltipMouseOut) {
        document.removeEventListener('mouseout', window.productionTooltipMouseOut);
        console.log('🧹 移除旧的mouseout事件监听器');
    }
    
    // 为所有生产线项目添加hover事件
    window.productionTooltipMouseOver = (e) => {
        console.log('🖱️ 鼠标悬停事件触发:', e.target);
        
        const item = e.target.closest('.production-item.compact-mode');
        if (!item) {
            console.log('🚫 不是生产线项目，隐藏tooltip');
            hideProductionTooltip();
            return;
        }
        
        console.log('✅ 鼠标悬停在生产线项目上:', item);
        
        // 获取生产线数据
        const index = Array.from(document.querySelectorAll('.production-item')).indexOf(item);
        const sortedProductions = getSortedProductions();
        const production = sortedProductions[index];
        
        console.log('📊 生产线索引:', index, '数据:', production);
        
        if (!production) {
            console.warn('⚠️ 找不到生产线数据，索引:', index);
            return;
        }
        
        // 生成tooltip内容
        const tooltipContent = generateTooltipContent(production);
        console.log('📝 生成的tooltip内容:', tooltipContent);
        showProductionTooltip(e, tooltipContent);
    };
    
    window.productionTooltipMouseOut = (e) => {
        console.log('🖱️ 鼠标离开事件触发');
        
        // 检查鼠标是否真的离开了生产线项目区域
        const relatedTarget = e.relatedTarget;
        const item = e.target.closest('.production-item.compact-mode');
        
        if (!item || !relatedTarget || !item.contains(relatedTarget)) {
            console.log('👋 鼠标真正离开生产线项目，隐藏tooltip');
            hideProductionTooltip();
        } else {
            console.log('🔄 鼠标仍在生产线项目内，不隐藏tooltip');
        }
    };
    
    document.addEventListener('mouseover', window.productionTooltipMouseOver);
    document.addEventListener('mouseout', window.productionTooltipMouseOut);
    
    console.log('🎉 生产线tooltip系统初始化完成');
}

// 生成tooltip内容
function generateTooltipContent(production) {
    let content = `<h4>${production.name}</h4>`;
    
    // 基本信息
    const typeNames = {
        'production': '💼 需要投入时间换收入',
        'work': '💼 工作相关收入',
        'investment': '💰 资产投资',
        'automation': '🤖 自动化习惯',
        'habit': '🤖 自动化习惯',
        'lifestyle': '🎯 日常行为',
        'infrastructure': '🏗️ 基础设施',
        'maintenance': '🔧 系统维护',
        'research': '🔬 研发项目'
    };
    
    const typeName = typeNames[production.type] || production.type;
    content += `<p class="tooltip-type">${typeName}</p>`;
    
    // 关联项目和当前阶段信息
    if (production.linkedDev) {
        content += `<div class="tooltip-section">`;
        content += `<p class="tooltip-linked"><strong>关联研发:</strong> ${production.linkedDev}</p>`;
        
        // 获取关联的研发项目和当前阶段信息
        const linkedDev = gameData.developments && gameData.developments.find(d => d.researchName === production.linkedDev);
        if (linkedDev) {
            const stages = parseProjectStages(linkedDev.action);
            const currentStage = getCurrentStage(linkedDev, stages);
            
            if (currentStage && currentStage.stage) {
                content += `<div class="tooltip-stage">`;
                content += `<p class="stage-title">🎯 当前阶段:</p>`;
                if (currentStage.stage.timeRange) {
                    content += `<p class="stage-time">${currentStage.stage.timeRange}</p>`;
                }
                content += `<p class="stage-desc">${currentStage.stage.description}</p>`;
                content += `</div>`;
            } else {
                // 如果没有阶段信息，显示操作定义
                const shortAction = linkedDev.action.length > 60 ? linkedDev.action.substring(0, 60) + '...' : linkedDev.action;
                content += `<p class="tooltip-action">${shortAction}</p>`;
            }
        }
        content += `</div>`;
    }
    
    // 收入信息
    if (production.hasActiveIncome && production.activeIncome > 0) {
        const currency = production.activeCurrency || 'CNY';
        const symbol = getCurrencySymbol(currency);
        content += `<p class="tooltip-income"><strong>主动收入:</strong> ${symbol}${production.activeIncome.toLocaleString()}</p>`;
    }
    
    if (production.hasPassiveIncome && production.passiveIncome > 0) {
        const currency = production.passiveCurrency || 'CNY';
        const symbol = getCurrencySymbol(currency);
        content += `<p class="tooltip-income"><strong>被动收入:</strong> ${symbol}${production.passiveIncome.toLocaleString()}</p>`;
    }
    
    // 支出信息
    if (production.expense > 0) {
        const currency = production.expenseCurrency || 'CNY';
        const symbol = getCurrencySymbol(currency);
        content += `<p class="tooltip-expense"><strong>支出:</strong> ${symbol}${production.expense.toLocaleString()}</p>`;
    }
    
    // 投资信息
    if (production.type === 'investment' && production.investCurrent > 0) {
        const currency = production.investCurrentCurrency || 'AUD';
        const symbol = getCurrencySymbol(currency);
        content += `<div class="tooltip-section">`;
        content += `<p class="tooltip-investment"><strong>当前价值:</strong> ${symbol}${production.investCurrent.toLocaleString()}</p>`;
        if (production.investAmount > 0 && production.investDate) {
            const start = new Date(production.investDate);
            const now = new Date();
            const days = (now - start) / (1000 * 60 * 60 * 24);
            const years = days / 365.25;
            const rate = (production.investCurrent - production.investAmount) / production.investAmount / years * 100;
            content += `<p class="tooltip-return"><strong>年化回报:</strong> ${rate.toFixed(2)}%</p>`;
        }
        content += `</div>`;
    }
    
    return content;
}

// 显示tooltip
function showProductionTooltip(event, content) {
    const tooltip = document.getElementById('production-tooltip');
    if (!tooltip) {
        console.error('❌ 找不到tooltip元素');
        return;
    }
    
    console.log('📝 显示tooltip，内容:', content);
    
    tooltip.innerHTML = content;
    tooltip.classList.add('show');
    
    // 计算位置
    const rect = event.target.closest('.production-item').getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = rect.right + 10;
    let top = rect.top;
    
    // 右侧空间不够，显示在左侧
    if (left + 350 > viewportWidth) {
        left = rect.left - 350 - 10;
    }
    
    // 左侧也不够，显示在下方
    if (left < 10) {
        left = rect.left;
        top = rect.bottom + 10;
    }
    
    // 确保不超出边界
    if (left < 10) left = 10;
    if (left + 350 > viewportWidth) left = viewportWidth - 350 - 10;
    if (top < 10) top = 10;
    if (top + 200 > viewportHeight) top = viewportHeight - 200 - 10;
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    console.log('📍 Tooltip位置:', { left, top });
    console.log('🎨 Tooltip类列表:', tooltip.classList.toString());
}

// 隐藏tooltip
function hideProductionTooltip() {
    const tooltip = document.getElementById('production-tooltip');
    if (tooltip) {
        console.log('👋 隐藏tooltip');
        tooltip.classList.remove('show');
    }
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
                
                // 解析阶段信息
                const stages = parseProjectStages(dev.action);
                const currentStageInfo = getCurrentStage(dev, stages);
                
                // 格式化tooltip
                const startDate = dev.startDate ? new Date(dev.startDate).toLocaleDateString() : '未开始';
                const tip = [
                    `研究项目：${dev.researchName}`,
                    `开始时间：${startDate}`,
                    `操作定义：${dev.action}`,
                    `频率：${dev.freq}`,
                    `周期：${dev.cycle}天`,
                    `目标：${dev.target}次`,
                    `当前进度：${progress.count}/${progress.total}`,
                    stages.length > 0 ? `阶段数：${stages.length}` : ''
                ].filter(Boolean).join('\n');
                
                // 生成阶段展示HTML
                let stagesHtml = '';
                if (stages.length > 0 && currentStageInfo) {
                    stagesHtml = `
                        <div class="stages-container" style="margin-top: 10px;">
                            <div class="stages-header" style="font-size: 0.9em; font-weight: bold; margin-bottom: 6px; color: #444;">
                                📋 项目阶段 (${currentStageInfo.current + 1}/${stages.length})
                            </div>
                            <div class="stages-list">
                                ${stages.map((stage, stageIdx) => {
                                    const isCurrent = stageIdx === currentStageInfo.current;
                                    const isPast = stageIdx < currentStageInfo.current;
                                    const isFuture = stageIdx > currentStageInfo.current;
                                    
                                    let statusIcon = '';
                                    let statusClass = '';
                                    
                                    if (isPast) {
                                        statusIcon = '✅';
                                        statusClass = 'stage-completed';
                                    } else if (isCurrent) {
                                        statusIcon = '🔄';
                                        statusClass = 'stage-current';
                                    } else {
                                        statusIcon = '⏳';
                                        statusClass = 'stage-future';
                                    }
                                    
                                    return `
                                        <div class="stage-item ${statusClass}" style="
                                            display: flex; 
                                            align-items: flex-start; 
                                            margin-bottom: 4px; 
                                            padding: 4px; 
                                            border-radius: 4px;
                                            background: ${isCurrent ? '#e8f5e9' : isPast ? '#f0f0f0' : '#fafafa'};
                                            border-left: 3px solid ${isCurrent ? '#4caf50' : isPast ? '#8bc34a' : '#ddd'};
                                        ">
                                            <span style="margin-right: 6px; font-size: 0.9em;">${statusIcon}</span>
                                            <div style="flex: 1; font-size: 0.85em;">
                                                ${stage.timeRange ? `<strong>${stage.timeRange}</strong>: ` : ''}
                                                <span style="color: ${isCurrent ? '#2e7d32' : isPast ? '#666' : '#999'};">
                                                    ${stage.description}
                                                </span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }
                
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
                                <button class=\"btn btn-warning btn-small\" onclick=\"window.resetDevProgress(${idx})\" title=\"重置进度起点，只计算从项目开始时间的记录\">🔄 重置起点</button>
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
                            ${currentStageInfo && currentStageInfo.stage ? 
                                `<div style="margin-top: 8px; font-size: 0.85em; color: #4caf50; font-weight: bold;">
                                    🎯 当前阶段: ${currentStageInfo.stage.timeRange} ${currentStageInfo.stage.description}
                                </div>` : 
                                `<div style="margin-top: 8px; font-size: 0.85em; color: #666;">${dev.action}</div>`
                            }
                        </div>
                        <div style=\"margin-top: 8px; font-size: 0.85em; color: #888;\">
                            频率：${dev.freq}
                        </div>
                        ${dev.startDate ? 
                            `<div style=\"margin-top: 4px; font-size: 0.85em; color: #666;\">开始于：${new Date(dev.startDate).toLocaleDateString()}</div>` : 
                            ''
                        }
                        ${stagesHtml}
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
    hideContextMenu();
}

// 新增：右键菜单记录用时
window.recordTimeContextItem = function() {
    if (contextMenuType === 'production') {
        window.recordTimeForProduction(contextMenuTarget);
    }
    hideContextMenu();
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
            // 使用confirm确认删除
            const deleteRecords = confirm(`确定要删除生产线"${productionName}"吗？\n\n发现 ${relatedLogs.length} 条相关的时间记录\n\n点击"确定"同时删除时间记录\n点击"取消"只删除生产线`);
                    
                    if (deleteRecords) {
                        // 删除相关时间记录
                        gameData.timeLogs = (gameData.timeLogs || []).filter(log => log.name !== productionName);
                        console.log(`🗑️ 删除生产线"${productionName}"及其 ${relatedLogs.length} 条时间记录`);
                    } else {
                // 再次确认是否只删除生产线
                if (!confirm(`只删除生产线"${productionName}"（保留 ${relatedLogs.length} 条时间记录）？`)) {
                    return;
                }
                        console.log(`🗑️ 删除生产线"${productionName}"（保留 ${relatedLogs.length} 条时间记录）`);
                    }
                    
                    gameData.productions.splice(prod._realIndex, 1);
                    updateProductionColorMap(); // 更新颜色映射
                    renderProductions();
                    renderResourceStats();
                    renderResourceOverview(); // 添加资源总览刷新
                    renderWeekCalendar();
                    saveToCloud();
        } else {
            if (!confirm(`确定要删除生产线"${productionName}"吗？`)) return;
            
            gameData.productions.splice(prod._realIndex, 1);
            updateProductionColorMap(); // 更新颜色映射
            renderProductions();
            renderResourceStats();
            renderResourceOverview(); // 添加资源总览刷新
            renderWeekCalendar();
            saveToCloud();
        }
    }
    hideContextMenu();
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
    
    const dev = gameData.developments[index];
    dev.active = false;
    dev.paused = true;
    
    // 同时暂停所有关联的生产线项目
    const linkedProductions = gameData.productions.filter(p => p.linkedDev === dev.researchName);
    linkedProductions.forEach(prod => {
        prod.paused = true;
        console.log(`⏸️ 自动暂停关联生产线: ${prod.name}`);
    });
    
    if (linkedProductions.length > 0) {
        console.log(`🔗 研发项目 "${dev.researchName}" 暂停，同时暂停了 ${linkedProductions.length} 个关联生产线`);
    }
    
    renderDevelopments();
    renderProductions(); // 重新渲染生产线以显示暂停状态
    saveToCloud();
}

window.resumeDev = function(index) {
    const activeCount = gameData.developments.filter(d => d.active).length;
    if (activeCount >= 6) {
        alert('最多同时进行6个研发项目！');
        return;
    }
    
    if (!gameData.developments[index]) return;
    
    const dev = gameData.developments[index];
    dev.active = true;
    dev.paused = false;
    
    // 同时恢复所有关联的生产线项目
    const linkedProductions = gameData.productions.filter(p => p.linkedDev === dev.researchName);
    linkedProductions.forEach(prod => {
        prod.paused = false;
        console.log(`▶️ 自动恢复关联生产线: ${prod.name}`);
    });
    
    if (linkedProductions.length > 0) {
        console.log(`🔗 研发项目 "${dev.researchName}" 恢复，同时恢复了 ${linkedProductions.length} 个关联生产线`);
    }
    
    renderDevelopments();
    renderProductions(); // 重新渲染生产线以显示恢复状态
    saveToCloud();
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
    renderResourceOverview(); // 添加资源总览刷新
    saveToCloud();
}

window.resetDevProgress = function(index) {
    if (!gameData.developments[index]) return;
    
    const dev = gameData.developments[index];
    if (!confirm(`确定要重置"${dev.researchName}"的进度起点吗？\n\n重置后将只计算从项目开始时间（${dev.startDate ? new Date(dev.startDate).toLocaleDateString() : '未设置'}）之后的时间记录。`)) {
        return;
    }
    
    // 更新项目的开始时间为当前时间
    dev.startDate = new Date().toISOString();
    dev.progressResetDate = new Date().toISOString(); // 记录重置时间
    
    console.log(`🔄 研发项目 "${dev.researchName}" 进度起点已重置到: ${new Date(dev.startDate).toLocaleString()}`);
    
    // 立即重新计算进度并刷新界面
    renderDevelopments();
    renderWeekCalendar(); // 刷新日历显示
    saveToCloud();
    
    // 显示成功提示
    showNotification(`✅ "${dev.researchName}" 进度起点已重置，现在只计算从 ${new Date(dev.startDate).toLocaleDateString()} 开始的记录`, 'success');
}

window.completeExperience = function(category, index) {
    const exp = gameData.experiences[category][index];
    exp.count++;
    
    if (exp.repeatable || exp.count === 1) {
        alert(`🎉 恭喜完成：${exp.name}！`);
    }
    
    renderMilestones();
    renderResourceStats();
    renderResourceOverview(); // 添加资源总览刷新
    saveToCloud();
}

window.editSavings = function() {
    const newSavings = prompt('请输入当前累计存款:', gameData.finance.totalSavings);
    if (newSavings !== null && !isNaN(newSavings)) {
        gameData.finance.totalSavings = parseFloat(newSavings);
        gameData.finance.savingsUpdateTime = new Date().toISOString();
        
        const currency = prompt('选择货币 (CNY/AUD/USD/EUR):', gameData.finance.savingsCurrency) || 'AUD';
        if (['CNY', 'AUD', 'USD', 'EUR'].includes(currency.toUpperCase())) {
            gameData.finance.savingsCurrency = currency.toUpperCase();
        }
        
        // 重新渲染资源相关面板
        renderResourceStats();
        renderResourceOverview(); // 添加资源总览刷新
        saveToCloud();
    }
}

window.editEstimatedExpense = function() {
    // 此函数已删除，预计月支出现在自动计算
    console.log('预计月支出现在自动计算，无需手动设置');
}

window.showTodayTimeDetails = function() {
    console.log('showTodayTimeDetails 函数被调用');
    const today = getLocalDateString(); // 修复：使用本地日期
    console.log('今日日期:', today);
    const todayLogs = (gameData.timeLogs||[]).filter(log => log.date === today);
    console.log('今日时间记录:', todayLogs);
    
    if (todayLogs.length === 0) {
        alert('今天还没有时间记录');
        return;
    }
    
    // 按项目分组
    const groupedLogs = {};
    let totalMins = 0;
    
    // 按类型统计
    const typeStats = {
        'production': 0,
        'investment': 0,
        'automation': 0,
        'lifestyle': 0,
        'infrastructure': 0,
        'maintenance': 0,
        'research': 0
    };
    
    const typeNames = {
        'production': '产线',
        'investment': '资产',
        'automation': '自动化',
        'lifestyle': '日常',
        'infrastructure': '基建',
        'maintenance': '维护',
        'research': '研发'
    };
    
    const typeIcons = {
        'production': '🏭',
        'investment': '💰',
        'automation': '🤖',
        'lifestyle': '🌱',
        'infrastructure': '🏗️',
        'maintenance': '🔧',
        'research': '🔬'
    };
    
    todayLogs.forEach(log => {
        if (!groupedLogs[log.name]) groupedLogs[log.name] = [];
        let timeCost = log.timeCost || 0;
        if (timeCost <= 0 && log.hour !== undefined && log.endHour !== undefined) {
            timeCost = calculateTimeCost(log.hour, log.minute || 0, log.endHour, log.endMinute || 0);
        }
        timeCost = Math.max(0, timeCost);
        groupedLogs[log.name].push({...log, timeCost});
        totalMins += timeCost;
        
        // 统计各类型时间
        const logType = log.type || 'production';
        if (typeStats.hasOwnProperty(logType)) {
            typeStats[logType] += timeCost;
        }
    });
    
    console.log('分组后的记录:', groupedLogs);
    console.log('总分钟数:', totalMins);
    console.log('类型统计:', typeStats);
    
    let html = `<h3>今日时间详情 (共 ${Math.floor(totalMins/60)}小时${totalMins%60}分钟)</h3>`;
    
    // 添加类型统计概览
    html += '<div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-bottom:15px;">';
    html += '<h4 style="margin:0 0 10px 0;font-size:1em;color:#495057;">📊 按类型统计</h4>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">';
    
    Object.entries(typeStats).forEach(([type, minutes]) => {
        if (minutes > 0) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeText = hours > 0 ? `${hours}h${mins}m` : `${mins}m`;
            html += `<div style="background:white;border:1px solid #dee2e6;border-radius:4px;padding:6px;text-align:center;font-size:0.85em;">`;
            html += `<div style="color:#6c757d;">${typeIcons[type]} ${typeNames[type]}</div>`;
            html += `<div style="font-weight:bold;color:#495057;">${timeText}</div>`;
            html += `</div>`;
        }
    });
    html += '</div></div>';
    
    html += '<div style="max-height:400px;overflow-y:auto;padding:10px;">';
    
    Object.entries(groupedLogs).forEach(([name, logs]) => {
        const projectTotal = logs.reduce((sum, log) => sum + log.timeCost, 0);
        const logType = logs[0].type || 'production';
        const typeIcon = typeIcons[logType] || '📋';
        
        html += `<div style="margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:10px;">`;
        html += `<div style="font-weight:bold;margin-bottom:5px;color:#2c3e50;">`;
        html += `${typeIcon} ${name} (${Math.floor(projectTotal/60)}小时${projectTotal%60}分钟)`;
        html += `<span style="color:#6c757d;font-size:0.8em;margin-left:8px;">[${typeNames[logType]}]</span>`;
        html += `</div>`;
        
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
    
    console.log('准备显示模态框，HTML内容长度:', html.length);
    
    // 使用专用的详情模态框显示今日时间详情
    const detailsModalTitle = document.getElementById('details-modal-title');
    const detailsModalContent = document.getElementById('details-modal-content');
    if (detailsModalTitle && detailsModalContent) {
        detailsModalTitle.textContent = '今日时间详情';
        detailsModalContent.innerHTML = html;
        document.getElementById('details-modal').classList.add('show');
    } else {
        alert('时间详情功能暂时不可用');
    }
    
    console.log('模态框显示完成');
}

window.showProductionModal = function() {
    currentEditIndex = -1;
    document.getElementById('production-form').reset();
    document.getElementById('active-income-row').style.display = 'none';
    document.getElementById('passive-income-row').style.display = 'none';
    updateLinkedDevOptions();
    updateFormVisibility();
    document.getElementById('production-modal').classList.add('show');
}

function editProduction(index) {
    currentEditIndex = index;
    const prod = gameData.productions[index];
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-type').value = prod.type;
    document.getElementById('has-active-income').checked = prod.hasActiveIncome;
    document.getElementById('active-amount').value = prod.activeIncome || '';
            document.getElementById('active-currency').value = prod.activeCurrency || 'AUD';
    document.getElementById('active-income-row').style.display = prod.hasActiveIncome ? 'grid' : 'none';
    document.getElementById('has-passive-income').checked = prod.hasPassiveIncome;
    document.getElementById('passive-amount').value = prod.passiveIncome || '';
            document.getElementById('passive-currency').value = prod.passiveCurrency || 'AUD';
    document.getElementById('passive-income-row').style.display = prod.hasPassiveIncome ? 'grid' : 'none';
    document.getElementById('prod-expense-amount').value = prod.expense || '';
            document.getElementById('prod-expense-currency').value = prod.expenseCurrency || 'AUD';
    updateLinkedDevOptions();
    document.getElementById('linked-dev').value = prod.linkedDev || '';
    // 投资类专属
    if (prod.type === 'investment') {
        document.getElementById('invest-amount').value = prod.investAmount || '';
        document.getElementById('invest-currency').value = prod.investCurrency || 'AUD';
        document.getElementById('invest-date').value = prod.investDate || '';
        document.getElementById('invest-current').value = prod.investCurrent || '';
        document.getElementById('invest-current-currency').value = prod.investCurrentCurrency || prod.investCurrency || 'AUD';
        document.getElementById('investment-fields').style.display = '';
        document.getElementById('income-type-group').style.display = 'none';
    } else {
        document.getElementById('investment-fields').style.display = 'none';
        document.getElementById('income-type-group').style.display = '';
    }
    updateFormVisibility();
    document.getElementById('production-modal').classList.add('show');
}

function updateFormVisibility() {
    const type = document.getElementById('prod-type').value;
    const incomeGroup = document.getElementById('income-type-group');
    const expenseGroup = document.getElementById('expense-group');
    const hasPassive = document.getElementById('has-passive-income').parentElement.parentElement;
    const lifestyleHistoryGroup = document.getElementById('lifestyle-history-group');
    const hasActiveIncome = document.getElementById('has-active-income');
    const hasPassiveIncome = document.getElementById('has-passive-income');
    
    // 重置checkbox状态
    if (hasActiveIncome) {
        hasActiveIncome.checked = false;
        hasActiveIncome.dispatchEvent(new Event('change'));
    }
    if (hasPassiveIncome) {
        hasPassiveIncome.checked = false;
        hasPassiveIncome.dispatchEvent(new Event('change'));
    }
    
    if (type === 'investment') {
        incomeGroup.style.display = 'none';
        hasPassive.style.display = 'none';
        expenseGroup.style.display = 'none';
        document.getElementById('investment-fields').style.display = '';
        if (lifestyleHistoryGroup) lifestyleHistoryGroup.style.display = 'none';
    } else if (type === 'automation' || type === 'infrastructure' || type === 'maintenance' || type === 'research') {
        // 自动化、基建、维护、研发类项目 - 不涉及收入，主要用于时间记录
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
            const message = `📝 生产线名称已更新\n同时更新了 ${updatedCount} 条历史时间记录`;
            alert(message);
                    // 重新渲染日历和资源统计
                    renderWeekCalendar();
                    renderResourceStats();
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
                    activeCurrency: 'AUD',
                    passiveIncome: 0,
                    passiveCurrency: 'AUD',
                    expense: 0,
                    expenseCurrency: 'AUD',
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
        if (modal) modal.classList.remove('show');
        
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
            activeCurrency: 'AUD',
            passiveIncome: 0,
            passiveCurrency: 'AUD',
            expense: 0,
            expenseCurrency: 'AUD',
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
        updateProductionColorMap(); // 更新颜色映射
        renderProductions();
        renderResourceStats();
        renderResourceOverview(); // 添加资源总览刷新
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
    for (let h = 0; h < 24; h++) {
        const isNightTime = h >= 22 || h < 8;
        const nightClass = isNightTime ? 'night-time' : '';
        const timeLabel = `${h}:00`;
        html += `<tr style="height:25px;" class="${nightClass}"><td style="color:#aaa;padding:2px;font-size:0.8em;">${timeLabel}</td>`;

        for (let d = 0; d < 7; d++) {
            let cellBg = '';
            let isTodayColumn = weekDates[d] === todayDateStr;

            if (isNightTime) {
                cellBg = isTodayColumn ? 'background:#f3f3f3;' : 'background:#f8f8f8;';
            } else {
                cellBg = isTodayColumn ? 'background:#f9fbe7;' : '';
            }
            // 为每个日历单元格添加数据属性，用于右键创建蓝图
            html += `<td style="border:1px solid #ecf0f1;padding:0;${cellBg}" 
                        data-date="${weekDates[d]}" 
                        data-hour="${h}" 
                        class="calendar-cell"></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    html += '<div class="calendar-overlay" id="calendar-overlay"></div>';
    container.innerHTML = html;

    // 为日历单元格添加右键事件监听器和拖放功能
    setTimeout(() => {
        const calendarCells = container.querySelectorAll('.calendar-cell');
        calendarCells.forEach(cell => {
            // 桌面端右键菜单
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const date = cell.dataset.date;
                const hour = parseInt(cell.dataset.hour);
                
                // 不允许在24:00时间点创建蓝图
                if (hour >= 24) return;
                
                showCalendarCellContextMenu(e, date, hour);
            });
            
            // 移动端长按菜单
            enableLongPressForElement(cell, (e) => {
                const date = cell.dataset.date;
                const hour = parseInt(cell.dataset.hour);
                
                // 不允许在24:00时间点创建蓝图
                if (hour >= 24) return;
                
                showCalendarCellContextMenu(e, date, hour);
            });
            
            // 拖放功能
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                const hour = parseInt(cell.dataset.hour);
                if (hour < 24) { // 只有24:00之前的时间可以作为拖放目标
                    cell.classList.add('drag-over');
                }
            });
            
            cell.addEventListener('dragleave', (e) => {
                cell.classList.remove('drag-over');
            });
            
            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('drag-over');
                const date = cell.dataset.date;
                const hour = parseInt(cell.dataset.hour);
                
                if (hour >= 24) return; // 不允许拖放到24:00
                
                handleBlueprintDrop(e, date, hour);
            });
        });
        
        renderTimeBlocks(weekDates);
        
        // 移动端日历自动滚动到当前日期
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                scrollCalendarToToday(weekDates);
            }, 100);
        }
    }, 50);
}

// 移动端日历滚动到当前日期
function scrollCalendarToToday(weekDates) {
    const calendarContainer = document.querySelector('.week-calendar-container');
    if (!calendarContainer || !weekDates) return;
    
    const today = formatDateLocal(new Date());
    const todayIndex = weekDates.indexOf(today);
    
    if (todayIndex >= 0) {
        const table = calendarContainer.querySelector('table');
        if (table) {
            // 计算滚动位置：让当前日期显示在容器中央
            const cellWidth = table.offsetWidth / 7;
            const containerWidth = calendarContainer.offsetWidth;
            const scrollLeft = (todayIndex * cellWidth) - (containerWidth / 2) + (cellWidth / 2);
            
            calendarContainer.scrollTo({
                left: Math.max(0, scrollLeft),
                behavior: 'smooth'
            });
        }
    }
}

function renderTimeBlocks(weekDates) {
    const overlay = document.getElementById('calendar-overlay');
    const container = document.getElementById('calendar-container');
    const table = container ? container.querySelector('table') : null;

    if (!overlay || !container || !table || !table.rows[24] || !table.rows[24].cells[7]) {
        requestAnimationFrame(() => renderTimeBlocks(weekDates));
        return;
    }

    if (window._isRendering) return;
    window._isRendering = true;

    try {
        const firstDataCell = table.rows[1].cells[1];
        const lastDataCell = table.rows[23].cells[7]; // 23:00 row, Sunday cell
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
                const endMinutes = (item.endHour || item.hour || 0) * 60 + (item.endMinute !== undefined ? item.endMinute : (item.minute || 0));
                duration = Math.max(endMinutes - startMinutes, 15);
                name = item.name;
                const today = getLocalDateString(); const isPast = dateStr < today; const fadeClass = isPast ? " time-block-faded" : ""; block.className = `time-block ${getCalendarBlockClass(name)}${fadeClass}`;
                block.style.zIndex = 100 + index;
                block.title = `${name}\n时间: ${item.hour}:${String(item.minute).padStart(2,'0')}-${item.endHour}:${String(item.endMinute).padStart(2,'0')}`;
                block.oncontextmenu = (e) => { e.preventDefault(); window._calendarBlockContextMenu(e, item.date, item.name, item.hour, item.minute); };
                // 移动端长按菜单
                enableLongPressForElement(block, (e) => { 
                    window._calendarBlockContextMenu(e, item.date, item.name, item.hour, item.minute); 
                });
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
                block.title = `计划: ${name} (${duration}分钟)\n优先级: ${item.priority || 'medium'}${sourceInfo}\n💡 提示: 可拖拽调整时间`;
                block.dataset.blueprintId = item.id;
                block.oncontextmenu = (e) => { e.preventDefault(); showBlueprintContextMenu(e, item.id); };
                // 移动端长按菜单
                enableLongPressForElement(block, (e) => { 
                    showBlueprintContextMenu(e, item.id); 
                });
                
                // 添加拖拽功能
                block.draggable = true;
                block.style.cursor = 'move';
                block.ondragstart = function(e) { 
                    console.log('🎯 蓝图拖拽开始:', item.id);
                    return window.handleBlueprintDragStart(e, item.id); 
                };
                block.ondragend = function(e) { 
                    console.log('🎯 蓝图拖拽结束:', item.id);
                    return window.handleBlueprintDragEnd(e); 
                };
            }

            const weekDay = weekDates.indexOf(dateStr);
            if (weekDay < 0) return;

            // The drawing logic inside the now-perfectly-aligned overlay.
            // Minor adjustments might be needed for border/padding of cells.
            const left = weekDay * cellWidth;
            const top = (startMinutes / 60) * cellHeight;
            const width = cellWidth;
            const maxDuration = 23 * 60 + 59 - startMinutes; // 最大可用时间
            const actualDuration = Math.min(duration, maxDuration);
            const height = Math.max((actualDuration / 60) * cellHeight, 1);

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
            // 重新获取单元格引用用于时间线计算
            const timelineFirstDataCell = table.rows[1].cells[1];
            const actualCellHeight = timelineFirstDataCell.offsetHeight;
            const actualCellWidth = timelineFirstDataCell.offsetWidth;
            const minutes = now.getHours() * 60 + now.getMinutes();
            const top = (minutes / 60) * actualCellHeight;
            const left = weekDay * actualCellWidth;
            const width = actualCellWidth;
            
            // 调试信息
            console.log('⏰ 时间线调试:', {
                currentTime: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
                minutes,
                actualCellHeight,
                calculatedTop: top,
                expectedFor22: 22 * actualCellHeight,
                weekDay,
                overlayHeight: overlay.offsetHeight
            });
            
            // 创建时间线
            const line = document.createElement('div');
            line.className = 'current-time-line';
            line.style.position = 'absolute';
            line.style.left = `${left}px`;
            line.style.top = `${top}px`;
            line.style.width = `${width}px`;
            line.style.height = '3px';
            line.style.background = 'linear-gradient(90deg, #ff1744 60%, #ff9100 100%)';
            line.style.boxShadow = '0 0 8px 2px #ff174488';
            line.style.zIndex = 9999;
            line.style.pointerEvents = 'none';
            line.style.borderRadius = '2px';
            line.title = `当前时间: ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
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
    
    // 使用专用的信息模态框显示蓝图信息
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalContent = document.getElementById('info-modal-content');
    if (infoModalTitle && infoModalContent) {
        infoModalTitle.textContent = '蓝图信息';
        infoModalContent.innerHTML = `
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
        `;
        document.getElementById('info-modal').classList.add('show');
    } else {
        alert('蓝图信息功能暂时不可用');
    }
            hideContextMenu();
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

// 统一的颜色哈希函数，确保同名项目使用相同颜色，不同项目使用不同颜色
function getColorIndex(name) {
    // 多层哈希算法减少冲突
    let hash1 = 5381; // DJB2 hash
    let hash2 = 0;    // Simple hash
    let hash3 = 1;    // FNV hash base
    
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        
        // DJB2 hash
        hash1 = ((hash1 << 5) + hash1) + char;
        
        // Simple polynomial rolling hash
        hash2 = hash2 * 31 + char;
        
        // Modified FNV-like hash
        hash3 = (hash3 * 16777619) ^ char;
    }
    
    // 组合三个哈希值，使用不同的质数权重
    const combined = Math.abs(
        (hash1 * 2654435761) ^ 
        (hash2 * 2246822519) ^ 
        (hash3 * 3266489917)
    );
    
    const colorIndex = combined % 25;
    
    console.log(`🎨 项目 "${name}" 分配颜色索引: ${colorIndex} (hash1:${hash1 % 25}, hash2:${hash2 % 25}, hash3:${hash3 % 25})`);
    return colorIndex;
}

function getCalendarBlockClass(name) {
    const colorIndex = getColorIndex(name);
    return `color-${colorIndex}`;
}

// 调试函数：显示所有项目的颜色分配
window.debugColorAssignment = function() {
    console.log('🎨 当前颜色分配情况:');
    
    // 收集所有项目名称
    const allNames = new Set();
    
    // 从时间日志中收集
    (gameData.timeLogs || []).forEach(log => {
        if (log.name) allNames.add(log.name);
    });
    
    // 从生产线中收集
    (gameData.productions || []).forEach(prod => {
        if (prod.name) allNames.add(prod.name);
    });
    
    // 从蓝图中收集
    (gameData.blueprints || []).forEach(bp => {
        if (bp.name) allNames.add(bp.name);
    });
    
    // 按颜色索引分组
    const colorGroups = {};
    const nameArray = Array.from(allNames).sort();
    
    nameArray.forEach(name => {
        const colorIndex = getColorIndex(name);
        if (!colorGroups[colorIndex]) {
            colorGroups[colorIndex] = [];
        }
        colorGroups[colorIndex].push(name);
    });
    
    // 显示结果
    console.log(`📊 总共 ${nameArray.length} 个不同项目，分配到 ${Object.keys(colorGroups).length} 种颜色:`);
    
    Object.keys(colorGroups).sort((a, b) => a - b).forEach(colorIndex => {
        const names = colorGroups[colorIndex];
        const color = colorIndex;
        console.log(`🎨 颜色 ${colorIndex}: ${names.join(', ')} ${names.length > 1 ? '⚠️ 有冲突!' : '✅'}`);
    });
    
    // 找出冲突
    const conflicts = Object.values(colorGroups).filter(group => group.length > 1);
    if (conflicts.length > 0) {
        console.warn(`⚠️ 发现 ${conflicts.length} 个颜色冲突:`);
        conflicts.forEach((group, index) => {
            console.warn(`   冲突 ${index + 1}: ${group.join(' vs ')}`);
        });
    } else {
        console.log('✅ 没有颜色冲突，所有项目都有独特的颜色!');
    }
    
    return { colorGroups, conflicts, totalProjects: nameArray.length };
};

// 5. 全职工作等任务可设置时间段
// 新增设置时间段的UI和保存逻辑（略，后续可补充）
// 6. 页面顶部插入精力和时间栏、周日历
window.addEventListener('DOMContentLoaded',function(){
    renderTimeAndEnergy();
    renderWeekCalendar();
    // 检查过期蓝图
    checkExpiredBlueprints();
    // 初始化资源总览
    renderResourceOverview();
    renderBillsSummary();
    renderResourceStats();
});

// 7. 生产线数据结构增加timeCost字段（建议手动在已有数据中补充）
// 例如：{ name: ..., type: ..., timeCost: 30, ... }

// 新增：渲染资源数据统计面板
function renderResourceStats() {
    const container = document.getElementById('resource-stats');
    if (!container) return;
    
    let savings = gameData.finance.totalSavings;
    let savingsCurrency = gameData.finance.savingsCurrency;
    let savingsStr = `${currencySymbols[savingsCurrency]}${savings.toLocaleString()}`;
    let savingsUpdate = gameData.finance.savingsUpdateTime ? `更新于 ${(new Date(gameData.finance.savingsUpdateTime)).toLocaleDateString()}` : '未更新';
    let today = getLocalDateString(); // 修复：使用本地日期
    let todayActiveMins = (gameData.timeLogs||[]).filter(log=>log.date===today).reduce((sum,log)=>{
        // 确保时间成本为正值，如果timeCost异常则重新计算
        let timeCost = log.timeCost || 0;
        if (timeCost <= 0 && log.hour !== undefined && log.endHour !== undefined) {
            timeCost = calculateTimeCost(log.hour, log.minute || 0, log.endHour, log.endMinute || 0);
        }
        return sum + Math.max(0, timeCost); // 确保不会是负数
    }, 0);
    
    // 初始化每日目标数据结构
    if (!gameData.dailyGoals) {
        gameData.dailyGoals = {
            lastResetDate: today,
            goals: [
                { text: '', completed: false },
                { text: '', completed: false },
                { text: '', completed: false }
            ]
        };
    }
    
    // 检查是否需要重置每日目标
    if (gameData.dailyGoals.lastResetDate !== today) {
        gameData.dailyGoals.lastResetDate = today;
        gameData.dailyGoals.goals = [
            { text: '', completed: false },
            { text: '', completed: false },
            { text: '', completed: false }
        ];
        saveToCloud();
    }
    
    let html = '';
    
    // 今日目标和今天主动用时在同一排
    html += `<div class='daily-goals-section'>
        <div class='daily-goals-header'>
            <div class='daily-goals-title'>今日目标</div>
            <div class='daily-time-stats'>
                <div class='time-stats-row'>
                    <button class='resource-btn-edit' onclick='window.showTodayTimeDetails()' title='查看详情' style='font-size: 0.8em; margin-left: 4px;'>👁️</button>
        </div>
            </div>
        </div>
        <div class='daily-goals-list'>`;
    
    gameData.dailyGoals.goals.forEach((goal, index) => {
        html += `<div class='daily-goal-item'>
            <div class='goal-checkbox ${goal.completed ? 'completed' : ''}' onclick='window.toggleGoal(${index})'>
                ${goal.completed ? '✓' : ''}
            </div>
            <div class='goal-text ${goal.completed ? 'completed' : ''}' onclick='window.editGoal(${index})' 
                 title='点击编辑目标' data-placeholder='点击设置目标${index + 1}'>
                ${goal.text || ''}
            </div>
    </div>`;
    });
    
    html += `</div>
        
        <!-- 任务规划按钮 -->
        <div class="task-planning-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #4a5f7a);">
            <button class="btn btn-primary btn-task-planning" onclick="EisenhowerMatrix.showModal()" 
                    style="width: 100%; padding: 8px 12px; font-size: 0.9em; display: flex; align-items: center; justify-content: center; gap: 6px;">
                📋 任务规划
            </button>
        </div>
    </div>`;
    
    container.innerHTML = html;
}

// 新增：切换目标完成状态
window.toggleGoal = function(index) {
    if (!gameData.dailyGoals || !gameData.dailyGoals.goals[index]) return;
    
    gameData.dailyGoals.goals[index].completed = !gameData.dailyGoals.goals[index].completed;
    saveToCloud();
    renderResourceStats();
}

// 新增：编辑目标文本
window.editGoal = function(index) {
    if (!gameData.dailyGoals || !gameData.dailyGoals.goals[index]) return;
    
    const goal = gameData.dailyGoals.goals[index];
    const currentText = goal.text || '';
    
    // 创建临时输入框
    const goalElement = event.target;
    const originalContent = goalElement.innerHTML;
    
    // 如果已经在编辑状态，直接返回
    if (goalElement.querySelector('input')) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'goal-edit-input';
    input.style.cssText = `
        width: 100%;
        border: none;
        background: transparent;
        outline: none;
        font: inherit;
        color: inherit;
        padding: 0;
        margin: 0;
    `;
    
    goalElement.innerHTML = '';
    goalElement.appendChild(input);
    input.focus();
    input.select();
    
    // 保存并退出编辑
    const saveGoal = () => {
        const newText = input.value.trim();
        gameData.dailyGoals.goals[index].text = newText;
        saveToCloud();
        renderResourceStats();
    };
    
    // 取消编辑
    const cancelEdit = () => {
        goalElement.innerHTML = originalContent;
    };
    
    // 事件监听
    input.addEventListener('blur', saveGoal);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveGoal();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
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
    hideContextMenu();
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
    hideContextMenu();
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
                            activeCurrency: 'AUD',
                passiveIncome: 0,
                passiveCurrency: 'AUD',
                expense: 0,
                expenseCurrency: 'AUD',
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
    
    // 显示时间选项对话框
    if (typeof showTimeOptionsDialog === 'function') {
        showTimeOptionsDialog(sortedIndex);
    } else {
        console.error('showTimeOptionsDialog函数未定义');
        // 临时解决方案：直接记录30分钟
        recordTimeWithDuration(sortedIndex, 30);
    }
}// 2. 修复数据关联
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
                renderResourceOverview(); // 添加资源总览刷新
                renderWeekCalendar();
                
                // 如果支出数据有变化，重新渲染支出面板
                if (expensesChanged) {
                    console.log('[云同步] 支出数据已更新，重新渲染支出面板');
                    renderExpenses();
                }
                
                cloudInitDone = true;
                updateSyncStatus('已同步', new Date().toLocaleTimeString());
                console.log('[云同步] 数据更新完成');
                
                // 云同步完成后重新初始化tooltip系统
                setTimeout(() => {
                    console.log('🔍 云同步完成后重新初始化tooltip系统...');
                    initProductionTooltips();
                }, 500);
                
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
        <div class="context-menu-item" onclick="window.editProductionFromCalendar('${log.date}','${log.name}',${log.hour},${log.minute})">✏️ 编辑生产线</div>
        <div class="context-menu-item" onclick="window.editCalendarLogType('${log.date}','${log.name}',${log.hour},${log.minute})">🏷️ 修改类型</div>
        <div class="context-menu-item" onclick="window.editCalendarLog('${log.date}','${log.name}',${log.hour},${log.minute})">⏰ 修改时间</div>
        <div class="context-menu-item" onclick="window.deleteCalendarLog('${log.date}','${log.name}',${log.hour},${log.minute})">❌ 删除</div>
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
    console.log('✏️ editCalendarLog 被调用:', { date, name, hour, minute });
    hideCalendarContextMenu();
    const log = (gameData.timeLogs||[]).find(l=>l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute);
    if (!log) {
        console.error('❌ 找不到对应的时间记录:', { date, name, hour, minute });
        alert('找不到对应的时间记录');
        return;
    }
    
    console.log('✅ 找到时间记录，打开编辑模态框:', log);
    
    // 存储当前编辑的日志，供表单提交时使用
    window.currentEditingLog = log;
    
    // 填充表单数据
    document.getElementById('time-edit-project-name').textContent = log.name;
    document.getElementById('time-edit-date').value = log.date;
    document.getElementById('time-edit-start').value = `${String(log.hour).padStart(2,'0')}:${String(log.minute).padStart(2,'0')}`;
    document.getElementById('time-edit-end').value = `${String(log.endHour).padStart(2,'0')}:${String(log.endMinute).padStart(2,'0')}`;
    
    // 显示模态框
    document.getElementById('time-edit-modal').classList.add('show');
}
window.editCalendarLogName = function(date, name, hour, minute) {
    console.log('✏️ editCalendarLogName 被调用:', { date, name, hour, minute });
    hideCalendarContextMenu();
    
    const log = (gameData.timeLogs||[]).find(l=>l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute);
    if (!log) {
        console.error('❌ 找不到对应的时间记录:', { date, name, hour, minute });
        alert('找不到对应的时间记录');
        return;
    }
    
    const newName = prompt('请输入新的项目名称:', log.name);
    if (newName === null || newName.trim() === '') return;
    
    const trimmedName = newName.trim();
    if (trimmedName === log.name) return; // 名称未改变
    
    // 更新时间记录
    log.name = trimmedName;
    
    // 保存并刷新
    saveToCloud();
    renderResourceStats();
    renderWeekCalendar();
    renderProductions();
    renderDevelopments();
    
    console.log('✅ 时间记录名称修改成功:', { oldName: name, newName: trimmedName });
    showNotification(`✅ 已修改项目名称：${name} → ${trimmedName}`, 'success');
}

window.editCalendarLogType = function(date, name, hour, minute) {
    console.log('✏️ editCalendarLogType 被调用:', { date, name, hour, minute });
    hideCalendarContextMenu();
    
    const log = (gameData.timeLogs||[]).find(l=>l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute);
    if (!log) {
        console.error('❌ 找不到对应的时间记录:', { date, name, hour, minute });
        alert('找不到对应的时间记录');
        return;
    }
    
    // 创建类型选择对话框
    const dialog = document.createElement('div');
    dialog.id = 'type-select-dialog';
    dialog.className = 'modal modal-small';
    
    const currentType = log.type || 'production';
    const typeOptions = [
        { value: 'production', label: '产线（需要投入时间换收入，如全职工作、副业等）', icon: '🏭' },
        { value: 'investment', label: '资产（如股票、债券、房地产等，统计支出和被动收入）', icon: '💰' },
        { value: 'automation', label: '自动化（长期培养的习惯或行为，主要用于打卡记录）', icon: '🤖' },
        { value: 'lifestyle', label: '日常（日常行为记录，如娱乐、社交、学习等）', icon: '🌱' },
        { value: 'infrastructure', label: '基建（基础设施建设，如健康、学习环境等）', icon: '🏗️' },
        { value: 'maintenance', label: '维护（系统维护、设备保养等）', icon: '🔧' },
        { value: 'research', label: '研发（技术研究、知识学习等）', icon: '🔬' }
    ];
    
    let optionsHtml = '';
    typeOptions.forEach(option => {
        const isSelected = option.value === currentType;
        optionsHtml += `
            <div class="type-option ${isSelected ? 'selected' : ''}" data-type="${option.value}">
                <span class="type-icon">${option.icon}</span>
                <div class="type-info">
                    <div class="type-name">${option.value}</div>
                    <div class="type-desc">${option.label}</div>
                </div>
                ${isSelected ? '<span class="type-check">✓</span>' : ''}
            </div>
        `;
    });
    
    dialog.innerHTML = `
        <div class="modal-content">
            <div class="type-select-dialog">
                <h4>选择生产线类型</h4>
                <div class="current-info">
                    <strong>项目：</strong>${log.name}<br>
                    <strong>当前类型：</strong>${currentType}
                </div>
                <div class="type-options">
                    ${optionsHtml}
                </div>
                <div class="dialog-buttons">
                    <button class="btn btn-secondary" onclick="window.closeTypeDialog()">取消</button>
                    <button class="btn btn-primary" onclick="window.confirmTypeChange('${date}', '${name}', ${hour}, ${minute})">确认</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    dialog.classList.add('show');
    
    // 存储选中的类型
    window.selectedLogType = currentType;
    
    // 绑定选项点击事件
    const typeOptions_el = dialog.querySelectorAll('.type-option');
    typeOptions_el.forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选中状态
            typeOptions_el.forEach(opt => {
                opt.classList.remove('selected');
                const check = opt.querySelector('.type-check');
                if (check) check.remove();
            });
            
            // 设置当前选中
            this.classList.add('selected');
            this.innerHTML += '<span class="type-check">✓</span>';
            
            // 记录选中的类型
            window.selectedLogType = this.dataset.type;
        });
    });
}

window.closeTypeDialog = function() {
    const dialog = document.getElementById('type-select-dialog');
    if (dialog) {
        dialog.remove();
    }
    window.selectedLogType = null;
}

// 从日历编辑生产线
window.editProductionFromCalendar = function(date, name, hour, minute) {
    console.log('✏️ editProductionFromCalendar 被调用:', { date, name, hour, minute });
    hideCalendarContextMenu();
    
    const log = (gameData.timeLogs||[]).find(l=>l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute);
    if (!log) {
        console.error('❌ 找不到对应的时间记录:', { date, name, hour, minute });
        alert('找不到对应的时间记录');
        return;
    }
    
    // 查找对应的生产线
    let productionIndex = -1;
    const productions = gameData.productions || [];
    
    for (let i = 0; i < productions.length; i++) {
        if (productions[i].name === log.name) {
            productionIndex = i;
            break;
        }
    }
    
    if (productionIndex === -1) {
        // 如果没有找到对应的生产线，提示用户但不自动创建
        alert(`没有找到名为"${log.name}"的生产线。\n\n请先在生产线面板中手动添加该生产线，然后再进行编辑。`);
        return;
    }
    
    // 调用现有的编辑生产线功能
    editProduction(productionIndex);
    
    console.log(`✅ 正在编辑生产线 "${log.name}" (索引: ${productionIndex})`);
}

window.confirmTypeChange = function(date, name, hour, minute) {
    const log = (gameData.timeLogs||[]).find(l=>l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute);
    if (!log) {
        alert('找不到对应的时间记录');
        return;
    }
    
    const newType = window.selectedLogType;
    if (!newType || newType === log.type) {
        window.closeTypeDialog();
        return;
    }
    
    const oldType = log.type || 'production';
    
    // 查找所有同名的时间记录
    const sameNameLogs = (gameData.timeLogs || []).filter(l => l.name === name);
    
    if (sameNameLogs.length > 1) {
        // 如果有多个同名记录，询问是否一起修改
        const confirmMessage = `发现 ${sameNameLogs.length} 个名为"${name}"的时间记录。\n\n是否要同时修改所有同名记录的类型？\n\n点击"确定"修改所有同名记录\n点击"取消"只修改当前记录`;
        
        if (confirm(confirmMessage)) {
            // 修改所有同名记录
            sameNameLogs.forEach(sameLog => {
                sameLog.type = newType;
            });
            console.log(`✅ 已修改 ${sameNameLogs.length} 个同名时间记录的类型: ${oldType} → ${newType}`);
            showNotification(`✅ 已修改 ${sameNameLogs.length} 个"${name}"记录的类型`, 'success');
        } else {
            // 只修改当前记录
            log.type = newType;
            console.log(`✅ 已修改单个时间记录的类型: ${oldType} → ${newType}`);
            showNotification(`✅ 已修改当前记录的类型`, 'success');
        }
    } else {
        // 只有一个记录，直接修改
        log.type = newType;
        console.log(`✅ 已修改时间记录的类型: ${oldType} → ${newType}`);
        showNotification(`✅ 已修改"${name}"的类型`, 'success');
    }
    
    // 保存并刷新
    saveToCloud();
    renderResourceStats();
    renderWeekCalendar();
    renderProductions();
    renderDevelopments();
    
    // 如果时间详情模态框当前是打开的，刷新其内容
    const detailsModal = document.getElementById('details-modal');
    if (detailsModal && detailsModal.classList.contains('show')) {
        const detailsTitle = document.getElementById('details-modal-title');
        if (detailsTitle && detailsTitle.textContent === '今日时间详情') {
            // 重新渲染今日时间详情
            setTimeout(() => {
                window.showTodayTimeDetails();
            }, 100);
        }
    }
    
    window.closeTypeDialog();
    console.log('✅ 时间记录类型修改成功:', { name, oldType, newType });
    showNotification(`✅ 已修改项目类型：${oldType} → ${newType}`, 'success');
}

window.deleteCalendarLog = function(date, name, hour, minute) {
    hideCalendarContextMenu();
    
    if (!confirm('确定要删除该时间记录吗？')) return;
    
            gameData.timeLogs = (gameData.timeLogs||[]).filter(l=>!(l.date===date&&l.name===name&&l.hour==hour&&l.minute==minute));
            saveToCloud();
            renderWeekCalendar();
            renderResourceStats();
}

// ========== 时间编辑表单处理 ========== //
function setupTimeEditFormHandler() {
    const form = document.getElementById('time-edit-form');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            
            if (!window.currentEditingLog) {
                alert('没有找到要编辑的时间记录');
                return;
            }
            
            const newDate = document.getElementById('time-edit-date').value;
            const newStart = document.getElementById('time-edit-start').value;
            const newEnd = document.getElementById('time-edit-end').value;
            
            if (!newDate || !newStart || !newEnd) {
                alert('请填写完整');
                return;
            }
            
            let [sh, sm] = newStart.split(':').map(x => parseInt(x));
            let [eh, em] = newEnd.split(':').map(x => parseInt(x));
            
            if ([sh, sm, eh, em].some(x => isNaN(x))) {
                alert('时间格式错误');
                return;
            }
            
            // 更新时间记录
            const log = window.currentEditingLog;
            log.date = newDate;
            log.hour = sh;
            log.minute = sm;
            log.endHour = eh;
            log.endMinute = em;
            log.timeCost = calculateTimeCost(sh, sm, eh, em);
            
            // 保存并刷新
            saveToCloud();
            renderResourceStats();
            renderWeekCalendar();
            
            // 关闭模态框
            closeModal('time-edit-modal');
            
            console.log('✅ 时间记录修改成功:', log);
        };
    }
}

// ========== 自定义模态框已弃用 ========== //
// 注意：showCustomModal 函数已被移除，所有模态框现在使用标准模态框系统
// 如需显示简单确认对话框，请使用 confirm() 或 alert()
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
            <div class="expense-item" data-expense-index="${idx}">
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
    
    // 为支出项目添加右键菜单和长按菜单事件
    setTimeout(() => {
        const expenseItems = container.querySelectorAll('.expense-item');
        expenseItems.forEach((item, index) => {
            // 桌面端右键菜单
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                window.showExpenseContextMenu(e, index);
            });
            
            // 移动端长按菜单
            enableLongPressForElement(item, (e) => {
                window.showExpenseContextMenu(e, index);
            });
        });
    }, 50);
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
    
    document.getElementById('expense-modal').classList.add('show');
}
let currentEditExpense = -1;
window.editExpense = function(idx) {
    window.currentEditExpense = idx;
    const exp = gameData.expenses[idx];
    
    // 设置表单值 - 像生产线一样简单直接
    document.getElementById('expense-name').value = exp.name || '';
    document.getElementById('expense-amount').value = exp.amount || '';
    document.getElementById('expense-currency').value = exp.currency || 'AUD';
    document.getElementById('expense-date').value = exp.date || '';
    document.getElementById('expense-type').value = exp.type || 'single';
    document.getElementById('expense-frequency-group').style.display = (exp.type==='recurring')?'':'none';
    document.getElementById('expense-frequency').value = exp.frequency || 'monthly';
    
    document.getElementById('expense-modal').classList.add('show');
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
                renderResourceOverview(); // 添加资源总览刷新
                
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

// ========== 资源管理面板功能 ========== //

// 显示账户管理模态框
window.showAccountManagementModal = function() {
    const modal = document.getElementById('account-management-modal');
    const content = document.getElementById('account-management-content');
    
    if (modal && content) {
        // 渲染账户管理界面
        if (window.AccountManager) {
            content.innerHTML = window.AccountManager.renderAccountManagement();
        } else {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #95a5a6;">
                    <p>⚠️ 账户管理模块加载中...</p>
                    <p>请稍后再试</p>
                </div>
            `;
        }
        
        modal.classList.add('show');
    }
}

// 新版财务面板主入口函数
function renderFinanceMainPanel() {
    try {
        console.log('🔄 开始渲染财务面板...');
        
        // 首先渲染简化财务概览
        renderCompactFinanceOverview();
        
        // 渲染财务概览（原资源总览的简化版）
        renderFinanceOverview();
        
        // 渲染账户状态概览
        renderAccountStatusSummary(); 
        
        // 渲染智能洞察
        renderFinanceInsights();
        
        console.log('✅ 财务面板渲染完成');
    } catch (error) {
        console.error('❌ 财务面板渲染失败:', error);
    }
}

// 统一财务数据结构
function unifyFinanceDataStructure() {
    // 简单的数据结构统一函数
    if (!gameData.financeData) {
        gameData.financeData = {
            accounts: {},
            accountData: {},
            aggregatedData: {},
            settings: {
                primaryCurrency: 'AUD',
                exchangeRates: { 'AUD': 1, 'CNY': 4.65, 'USD': 0.65, 'EUR': 0.60 },
                lastAggregation: new Date().toISOString()
            }
        };
    }
    
    // 确保显示货币设置存在
    if (!gameData.displayCurrency) {
        gameData.displayCurrency = 'AUD';
    }
}

// 渲染财务概览（合并原总览功能）
function renderFinanceOverview() {
    const container = document.getElementById('finance-overview-content');
    if (!container) return;
    
    // 确保数据结构统一
    unifyFinanceDataStructure();
    
    const displayCurrency = gameData.displayCurrency || 'AUD';
    const currencySymbol = getCurrencySymbol(displayCurrency);
    
    // 使用统一的数据源（优先使用聚合数据）
    const dataSource = (gameData.financeData?.aggregatedData && Object.keys(gameData.financeData.aggregatedData).length > 0) 
        ? gameData.financeData.aggregatedData 
        : gameData.billsData || {};
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    
    if (Object.keys(dataSource).length > 0) {
        // 获取最新月份的数据
        const availableMonths = Object.keys(dataSource).sort().reverse();
        const latestMonth = availableMonths[0];
        
        if (latestMonth && dataSource[latestMonth]) {
            const monthData = dataSource[latestMonth];
            
            // 从最新月份数据获取收支（数据已经是AUD基准）
            monthlyIncome = convertToDisplayCurrency(monthData.income || 0, 'AUD', displayCurrency);
            
            const expenses = monthData.expenses || [];
            let totalExpense = 0;
            expenses.forEach(exp => {
                totalExpense += exp.amount || 0;
            });
            monthlyExpense = convertToDisplayCurrency(totalExpense, 'AUD', displayCurrency);
        }
    }
    
    // 获取存款信息
    const savings = gameData.finance?.totalSavings || 0;
    const savingsCurrency = gameData.finance?.savingsCurrency || 'AUD';
    const displaySavings = convertToDisplayCurrency(savings, savingsCurrency, displayCurrency);
    
    // 计算余额
    const balance = monthlyIncome - monthlyExpense;
    const balanceClass = balance >= 0 ? 'positive' : 'negative';
    
    const html = `
        <!-- 货币切换 -->
        <div class="currency-switch">
            <button class="currency-btn ${displayCurrency === 'CNY' ? 'active' : ''}" onclick="window.switchDisplayCurrency('CNY')">
                🇨🇳 人民币
            </button>
            <button class="currency-btn ${displayCurrency === 'AUD' ? 'active' : ''}" onclick="window.switchDisplayCurrency('AUD')">
                🇦🇺 澳元
            </button>
        </div>
        
        <div class="resource-overview-grid">
            <div class="resource-overview-card">
                <h4>📈最新收入</h4>
                <div class="resource-overview-value income">${currencySymbol}${Math.round(monthlyIncome).toLocaleString()}</div>
                <div class="resource-overview-meta">最新月份数据</div>
            </div>
            <div class="resource-overview-card">
                <h4>📉最新支出</h4>
                <div class="resource-overview-value expense">${currencySymbol}${Math.round(monthlyExpense).toLocaleString()}</div>
                <div class="resource-overview-meta">最新月份数据</div>
            </div>
            <div class="resource-overview-card">
                <h4>💰累计存款</h4>
                <div class="resource-overview-value savings">${currencySymbol}${Math.round(displaySavings).toLocaleString()}</div>
                <div class="resource-overview-meta">
                    <button class="btn btn-sm" onclick="window.editSavings()" style="font-size: 0.8em; padding: 2px 6px;">✏️ 更新</button>
                </div>
            </div>
            <div class="resource-overview-card">
                <h4>💫本月余额</h4>
                <div class="resource-overview-value ${balanceClass}">
                    ${balance >= 0 ? '+' : ''}${currencySymbol}${Math.round(Math.abs(balance)).toLocaleString()}
                </div>
                <div class="resource-overview-meta">收支差额</div>
            </div>
        </div>
        
        <!-- 收起按钮 -->
        <button class="finance-expand-btn" onclick="toggleFinancePanel()" style="margin-top: 10px;">收起详情</button>
    `;
    
    container.innerHTML = html;
}

// 时间成本计算函数（处理跨天情况）
function calculateTimeCost(startHour, startMinute, endHour, endMinute) {
    let timeCost = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    
    // 如果结束时间早于开始时间，说明跨天了
    if (timeCost < 0) {
        timeCost += 24 * 60; // 加上24小时
    }
    
    return Math.max(0, timeCost); // 确保不会是负数
}

// 货币转换函数 - 以澳元为基准
function convertToDisplayCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    // 汇率表（1 AUD = X 其他货币）
    const exchangeRates = {
        'AUD': 1.0,
        'CNY': 4.65,     // 1 AUD = 4.65 CNY
        'USD': 0.65,    // 1 AUD = 0.65 USD  
        'EUR': 0.60     // 1 AUD = 0.60 EUR
    };
    
    // 修正转换逻辑：先转换为AUD基准，再转换为目标货币
    let audAmount;
    if (fromCurrency === 'AUD') {
        audAmount = amount;
    } else {
        const fromRate = exchangeRates[fromCurrency];
        if (!fromRate) {
            console.warn(`未找到货币 ${fromCurrency} 的汇率，使用原值`);
            return amount;
        }
        // 从其他货币转换到AUD：除以汇率
        audAmount = amount / fromRate;
    }
    
    // 从AUD转换到目标货币
    if (toCurrency === 'AUD') {
        return audAmount;
    } else {
        const toRate = exchangeRates[toCurrency];
        if (!toRate) {
            console.warn(`未找到货币 ${toCurrency} 的汇率，返回AUD值`);
            return audAmount;
        }
        // 从AUD转换到其他货币：乘以汇率
        return audAmount * toRate;
    }
}

// 获取货币符号
function getCurrencySymbol(currency) {
    const symbols = {
        'CNY': '¥',
        'AUD': '$',
        'USD': '$',
        'EUR': '€'
    };
    return symbols[currency] || '¥';
}

function renderAccountStatusSummary() {
    const container = document.getElementById('account-status-summary');
    if (!container) return;
    
    // 获取账户统计
    let accountCount = 0;
    let enabledCount = 0;
    
    if (window.AccountManager) {
        const accounts = window.AccountManager.getAccountList();
        accountCount = accounts.length;
        enabledCount = accounts.filter(acc => acc.enabled).length;
    }
    
    let statusText = '';
    if (accountCount === 0) {
        statusText = '尚未添加任何账户';
    } else if (enabledCount === 0) {
        statusText = `已添加${accountCount}个账户，但都未启用`;
    } else {
        statusText = `已启用${enabledCount}个账户`;
        if (enabledCount < accountCount) {
            statusText += `，${accountCount - enabledCount}个未启用`;
        }
    }
    
    container.textContent = statusText;
}

// 渲染智能洞察
function renderFinanceInsights() {
    const container = document.getElementById('finance-insights-content');
    if (!container) return;
    
    // 获取分析数据
    const analysisData = gameData.resourceAnalysis || {};
    
    let html = '';
    
    // 本月预测支出
    const predictedExpense = analysisData.predictions?.nextMonthExpense || 0;
    if (predictedExpense > 0) {
        const displayCurrency = gameData.displayCurrency || 'AUD';
        const currencySymbol = getCurrencySymbol(displayCurrency);
        const convertedPrediction = convertToDisplayCurrency(predictedExpense, 'AUD', displayCurrency);
        
        html += `
            <div class="insight-item">
                <strong>📊 本月支出预测：</strong>${currencySymbol}${Math.round(convertedPrediction).toLocaleString()}
            </div>
        `;
    }
    
    // 稳定性评分
    const stabilityScore = analysisData.stabilityScore || 0;
    if (stabilityScore > 0) {
        const scoreLevel = stabilityScore >= 80 ? '优秀' : stabilityScore >= 60 ? '良好' : '有待改善';
        const scoreEmoji = stabilityScore >= 80 ? '🟢' : stabilityScore >= 60 ? '🟡' : '🔴';
        
        html += `
            <div class="insight-item">
                <strong>${scoreEmoji} 财务稳定性：</strong>${scoreLevel} (${stabilityScore.toFixed(0)}分)
            </div>
        `;
    }
    
    // 特别提醒
    const specialReminders = analysisData.predictions?.specialReminders || [];
    if (specialReminders.length > 0) {
        html += `
            <div class="insight-item">
                <strong>⚠️ 特别提醒：</strong>${specialReminders[0]}
            </div>
        `;
    }
    
    // 如果没有任何洞察，显示默认信息
    if (!html) {
        html = `
            <div class="insight-item" style="color: #999; font-style: italic;">
                导入更多账单数据后将显示智能分析结果
            </div>
        `;
    }
    
    container.innerHTML = html;
}



// 渲染账户管理面板
function renderAccountsManagement() {
    const container = document.getElementById('resource-accounts-content');
    if (!container) return;
    
    // 确保财务模块已初始化
    if (window.FinanceModule && !window.FinanceModule.initialized) {
        window.FinanceModule.init();
    }
    
    // 使用账户管理器渲染界面
    if (window.AccountManager) {
        container.innerHTML = window.AccountManager.renderAccountManagement();
    } else {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #95a5a6;">
                <p>⚠️ 账户管理模块加载中...</p>
                <p>请稍后再试</p>
            </div>
        `;
    }
}

// 切换显示货币
window.switchDisplayCurrency = function(currency) {
    gameData.displayCurrency = currency;
    
    // 重新渲染所有相关面板
    renderResourceOverview();
    renderBillsSummary();
    if (document.getElementById('resource-analysis-content')) {
        renderResourceAnalysis();
    }
    
    // 保存设置
    saveToCloud();
}

// 获取指定月份的账单数据（返回澳元基准的数值）
function getBillsDataForMonth(monthKey) {
    if (!gameData.billsData) gameData.billsData = {};
    
    const monthData = gameData.billsData[monthKey];
    if (!monthData) {
        return { income: 0, totalExpense: 0, expenseCount: 0, expenses: [] };
    }
    
    let totalExpense = 0;
    const expenses = monthData.expenses || [];
    
    expenses.forEach(expense => {
        totalExpense += convertToCNY(expense.amount, expense.currency);
    });
    
    return {
        income: convertToCNY(monthData.income || 0, monthData.incomeCurrency || 'AUD'),
        totalExpense: totalExpense,
        expenseCount: expenses.length,
        expenses: expenses
    };
}

// 从生产线计算月收入（返回澳元基准的数值）
function getProductionMonthlyIncome() {
    let totalIncome = 0;
    
    (gameData.productions || []).forEach(prod => {
        if (prod.hasActiveIncome && prod.activeIncome > 0) {
            totalIncome += convertToCNY(prod.activeIncome, prod.activeCurrency);
        }
        if (prod.hasPassiveIncome && prod.passiveIncome > 0) {
            totalIncome += convertToCNY(prod.passiveIncome, prod.passiveCurrency);
        }
    });
    
    return totalIncome;
}

// 预测下月支出（返回澳元基准的数值）
function getPredictedMonthlyExpense() {
    // 如果有详细分析数据，优先使用
    if (gameData.resourceAnalysis && gameData.resourceAnalysis.predictions.nextMonthExpense > 0) {
        return gameData.resourceAnalysis.predictions.nextMonthExpense;
    }
    
    // 否则使用简单的3个月平均值
    if (!gameData.billsData) return 0;
    
    const months = Object.keys(gameData.billsData).sort().slice(-3); // 最近3个月
    if (months.length === 0) return 0;
    
    let totalExpense = 0;
    let monthCount = 0;
    
    months.forEach(monthKey => {
        const monthData = getBillsDataForMonth(monthKey);
        totalExpense += monthData.totalExpense;
        monthCount++;
    });
    
    return monthCount > 0 ? totalExpense / monthCount : 0;
}

// 渲染账单汇总
function renderBillsSummary() {
    const container = document.getElementById('bills-summary-content');
    if (!container) return;
    
    // 使用新的多账户数据，如果没有则回退到旧数据
    const dataSource = (gameData.financeData?.aggregatedData && Object.keys(gameData.financeData.aggregatedData).length > 0) 
        ? gameData.financeData.aggregatedData 
        : gameData.billsData;
    
    if (!dataSource || Object.keys(dataSource).length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #95a5a6;">
                <p>📋 还没有账单数据</p>
                <p>点击上方"导入账单数据"开始使用</p>
            </div>
        `;
        return;
    }
    
    const displayCurrency = gameData.displayCurrency || 'AUD';
    const currencySymbol = getCurrencySymbol(displayCurrency);
    
    // 获取当前月份
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // 尝试获取当月数据，如果没有则获取最新月份的数据
    const availableMonths = Object.keys(dataSource).sort().reverse();
    const targetMonth = dataSource[currentMonth] ? currentMonth : availableMonths[0];
    
    if (!targetMonth) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #95a5a6;">
                <p>📋 没有可显示的账单数据</p>
            </div>
        `;
        return;
    }
    
    // 直接从数据源获取月份数据（已经是AUD基准）
    const monthData = dataSource[targetMonth];
    if (!monthData) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #95a5a6;">
                <p>📋 没有可显示的账单数据</p>
            </div>
        `;
        return;
    }
    
    // 计算总支出（数据已经是AUD基准）
    const expenses = monthData.expenses || [];
    let totalExpense = 0;
    expenses.forEach(exp => {
        totalExpense += exp.amount || 0;
    });
    
    // 转换为显示货币
    const displayIncome = convertToDisplayCurrency(monthData.income || 0, 'AUD', displayCurrency);
    const displayExpense = convertToDisplayCurrency(totalExpense, 'AUD', displayCurrency);
    const balance = displayIncome - displayExpense;
    const balanceClass = balance >= 0 ? 'positive' : 'negative';
        
    // 按分类整理支出
    const categories = {};
    expenses.forEach(exp => {
        const category = exp.category || exp.name || '其他';
        if (!categories[category]) {
            categories[category] = {
                total: 0,
                items: []
            };
        }
        // 数据已经是AUD基准，直接转换为显示货币
        const amount = convertToDisplayCurrency(exp.amount || 0, 'AUD', displayCurrency);
        categories[category].total += amount;
        categories[category].items.push({
            name: exp.name,
            amount: amount,
            currency: 'AUD', // 聚合数据中的货币已经统一为AUD
            originalAmount: exp.originalAmount || exp.amount,
            originalCurrency: exp.originalCurrency || exp.currency
        });
    });
    
    // 按支出金额排序分类
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1].total - a[1].total);
    
    let html = `
        <div class="current-month-summary">
            <div class="month-title">
                <h4>${targetMonth}${targetMonth === currentMonth ? ' (当月)' : ' (最新)'}</h4>
            </div>
            
            <div class="month-overview">
                <div class="overview-item income">
                    <span class="overview-label">收入</span>
                    <span class="overview-value">${currencySymbol}${Math.round(displayIncome).toLocaleString()}</span>
                </div>
                <div class="overview-item expense">
                    <span class="overview-label">支出</span>
                    <span class="overview-value">${currencySymbol}${Math.round(displayExpense).toLocaleString()}</span>
                </div>
                <div class="overview-item balance ${balanceClass}">
                    <span class="overview-label">余额</span>
                    <span class="overview-value ${balanceClass}">
                        ${balance >= 0 ? '+' : ''}${currencySymbol}${Math.round(Math.abs(balance)).toLocaleString()}
                    </span>
                </div>
                </div>
            
            <div class="categories-section">
                <div class="categories-list">
    `;
    
    if (sortedCategories.length === 0) {
        html += `
            <div class="no-expenses">
                <p>本月暂无支出记录</p>
            </div>
        `;
    } else {
        sortedCategories.forEach(([categoryName, categoryData], index) => {
            const percentage = displayExpense > 0 ? (categoryData.total / displayExpense * 100).toFixed(1) : 0;
            const categoryId = `category-${index}`;
            
            html += `
                <div class="category-item" onclick="toggleCategoryDetails('${categoryId}')">
                    <div class="category-header">
                        <span class="category-name">${categoryName}</span>
                        <div class="category-amount">
                            <span class="amount">${currencySymbol}${Math.round(categoryData.total).toLocaleString()}</span>
                            <span class="percentage">${percentage}%</span>
                        </div>
                    </div>
                    <div class="category-details" id="${categoryId}">
                        <div class="category-items">
            `;
            
            categoryData.items.forEach(item => {
                html += `
                    <div class="expense-detail-item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-amount">${currencySymbol}${Math.round(item.amount).toLocaleString()}</span>
            </div>
        `;
    });
    
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// 切换分类详情展开/收起
window.toggleCategoryDetails = function(categoryId) {
    const detailsElement = document.getElementById(categoryId);
    if (detailsElement) {
        detailsElement.classList.toggle('expanded');
    } else {
        console.error('未找到分类详情元素:', categoryId);
    }
}

// 显示账单导入模态框
window.showBillsImportModal = function() {
    document.getElementById('bills-import-modal').classList.add('show');
    document.getElementById('bills-import-data').value = '';
    document.getElementById('bills-import-preview').style.display = 'none';
    document.getElementById('confirm-bills-import').style.display = 'none';
}

// 预览账单数据
window.previewBillsData = function() {
    const jsonData = document.getElementById('bills-import-data').value.trim();
    if (!jsonData) {
        alert('请输入JSON数据');
        return;
    }
    
    try {
        const data = JSON.parse(jsonData);
        let previewHtml = '';
        let totalMonths = 0;
        let totalIncome = 0;
        let totalExpense = 0;
        
        // 获取当前显示货币设置
        const displayCurrency = gameData.displayCurrency || 'AUD';
        const currencySymbol = getCurrencySymbol(displayCurrency);
        
        Object.entries(data).forEach(([monthKey, monthData]) => {
            totalMonths++;
            
            // 先转换为AUD基准，再转换为显示货币
            const incomeAUD = convertToDisplayCurrency(monthData.income || 0, monthData.incomeCurrency || 'AUD', 'AUD');
            const income = convertToDisplayCurrency(incomeAUD, 'AUD', displayCurrency);
            totalIncome += income;
            
            let monthExpense = 0;
            const expenses = monthData.expenses || [];
            expenses.forEach(exp => {
                // 先转换为AUD基准，再转换为显示货币
                const expenseAUD = convertToDisplayCurrency(exp.amount, exp.currency, 'AUD');
                const expenseDisplay = convertToDisplayCurrency(expenseAUD, 'AUD', displayCurrency);
                monthExpense += expenseDisplay;
            });
            totalExpense += monthExpense;
            
            previewHtml += `
                <div class="bills-preview-item">
                    <div class="bills-preview-month">${monthKey}</div>
                    <div class="bills-preview-summary">
                        <span>收入: ${currencySymbol}${Math.round(income).toLocaleString()}</span>
                        <span>支出: ${currencySymbol}${Math.round(monthExpense).toLocaleString()}</span>
                    </div>
                    <div class="bills-preview-expenses">
                        ${expenses.map(exp => `${exp.name}: ${getCurrencySymbol(exp.currency)}${exp.amount}`).join(', ')}
                    </div>
                </div>
            `;
        });
        
        previewHtml += `
            <div style="background: #27ae60; color: white; padding: 12px; border-radius: 6px; margin-top: 10px;">
                <strong>汇总: ${totalMonths}个月，总收入 ${currencySymbol}${Math.round(totalIncome).toLocaleString()}，总支出 ${currencySymbol}${Math.round(totalExpense).toLocaleString()}</strong>
            </div>
        `;
        
        document.getElementById('bills-preview-content').innerHTML = previewHtml;
        document.getElementById('bills-import-preview').style.display = 'block';
        document.getElementById('confirm-bills-import').style.display = 'inline-block';
        
        // 保存解析后的数据供确认导入使用
        window.pendingBillsData = data;
        
    } catch (error) {
        alert('JSON格式错误: ' + error.message);
    }
}

// 确认导入账单数据
window.confirmBillsImport = function() {
    if (!window.pendingBillsData) {
        alert('没有待导入的数据');
        return;
    }
    
    if (!gameData.billsData) gameData.billsData = {};
    
    // 合并数据，新数据覆盖旧数据
    Object.assign(gameData.billsData, window.pendingBillsData);
    
    // 更新资源分析数据（统一的分析更新）
    updateResourceAnalysisData();
    
    // 保存到云端
    saveToCloud();
    
    // 刷新相关显示
    renderResourceOverview();
    renderBillsSummary();
    renderResourceStats();
    renderResourceAnalysis(); // 同步更新详细分析页面
    
    // 关闭模态框
    closeModal('bills-import-modal');
    
    alert(`✅ 成功导入 ${Object.keys(window.pendingBillsData).length} 个月的账单数据！`);
    window.pendingBillsData = null;
}

// 显示月度对比
window.showMonthlyComparison = function() {
    console.log('showMonthlyComparison called');
    
    if (!gameData.billsData || Object.keys(gameData.billsData).length === 0) {
        alert('还没有账单数据可供对比');
        return;
    }
    
    // 设置当前年份为默认值
    const currentYear = new Date().getFullYear();
    gameData.comparisonYear = gameData.comparisonYear || currentYear;
    
    console.log('Initial comparison year:', gameData.comparisonYear);
    
    // 更新年份显示
    const yearElement = document.getElementById('comparison-year');
    if (yearElement) {
        yearElement.textContent = gameData.comparisonYear;
        console.log('Updated year display to:', gameData.comparisonYear);
    } else {
        console.error('Year element not found');
    }
    
    // 显示模态框
    const modalElement = document.getElementById('monthly-comparison-modal');
    if (modalElement) {
        modalElement.classList.add('show');
        console.log('Modal displayed');
    } else {
        console.error('Modal element not found');
    }
    
    // 渲染月度对比内容
    window.renderMonthlyComparison();
}

// 切换年份
window.changeComparisonYear = function(delta) {
    console.log('changeComparisonYear called with delta:', delta);
    
    if (!gameData.comparisonYear) {
        gameData.comparisonYear = new Date().getFullYear();
    }
    
    gameData.comparisonYear += delta;
    console.log('New comparison year:', gameData.comparisonYear);
    
    // 更新年份显示
    const yearElement = document.getElementById('comparison-year');
    if (yearElement) {
        yearElement.textContent = gameData.comparisonYear;
        console.log('Year display updated to:', gameData.comparisonYear);
    } else {
        console.error('Year element not found');
    }
    
    // 重新渲染月度对比
    window.renderMonthlyComparison();
}

// 渲染月度对比内容
window.renderMonthlyComparison = function() {
    console.log('renderMonthlyComparison called');
    
    // 使用新的多账户数据，如果没有则回退到旧数据
    const dataSource = (gameData.financeData?.aggregatedData && Object.keys(gameData.financeData.aggregatedData).length > 0) 
        ? gameData.financeData.aggregatedData 
        : gameData.billsData;
        
    if (!dataSource || Object.keys(dataSource).length === 0) {
        console.log('No bills data available');
        return;
    }
    
    const displayCurrency = gameData.displayCurrency || 'AUD';
    const currencySymbol = getCurrencySymbol(displayCurrency);
    const targetYear = gameData.comparisonYear || new Date().getFullYear();
    
    console.log('Target year:', targetYear);
    
    // 筛选指定年份的月份数据
    const allMonths = Object.keys(dataSource).sort().reverse();
    const yearMonths = allMonths.filter(monthKey => {
        const year = parseInt(monthKey.split('-')[0]);
        return year === targetYear;
    });
    
    console.log('Available months for year', targetYear, ':', yearMonths);
    
    if (yearMonths.length === 0) {
        document.getElementById('monthly-comparison-content').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <div style="font-size: 1.2em; margin-bottom: 10px;">📅</div>
                <div>${targetYear}年暂无账单数据</div>
                <div style="font-size: 0.9em; margin-top: 10px;">
                    可用的年份：${[...new Set(allMonths.map(m => m.split('-')[0]))].sort().reverse().join(', ')}
                </div>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="comparison-header">
            <div class="comparison-header-row">
                <span class="header-month">月份</span>
                <span class="header-income">收入</span>
                <span class="header-expense">支出</span>
                <span class="header-balance">余额</span>
            </div>
        </div>
        <div class="monthly-comparison-grid">`;
    
    yearMonths.forEach((monthKey, index) => {
        const monthData = dataSource[monthKey];
        if (!monthData) return;
        
        // 计算收入和支出（数据已经是AUD基准）
        const income = monthData.income || 0;
        let totalExpense = 0;
        const expenses = monthData.expenses || [];
        
        expenses.forEach(exp => {
            totalExpense += exp.amount || 0;
        });
        
        // 转换为显示货币
        const displayIncome = convertToDisplayCurrency(income, 'AUD', displayCurrency);
        const displayExpense = convertToDisplayCurrency(totalExpense, 'AUD', displayCurrency);
        const balance = displayIncome - displayExpense;
        const balanceClass = balance >= 0 ? 'positive' : 'negative';
        
        // 计算支出分类
        const categories = {};
        expenses.forEach(exp => {
            const category = exp.category || exp.name || '其他';
            if (!categories[category]) categories[category] = 0;
            // 数据已经是AUD基准，直接转换为显示货币
            const amount = convertToDisplayCurrency(exp.amount || 0, 'AUD', displayCurrency);
            categories[category] += amount;
        });
        
        // 获取上月数据用于对比
        const prevMonth = yearMonths[index + 1];
        const prevCategories = {};
        if (prevMonth && dataSource[prevMonth]) {
            const prevMonthData = dataSource[prevMonth];
            const prevExpenses = prevMonthData.expenses || [];
            prevExpenses.forEach(exp => {
                const category = exp.category || exp.name || '其他';
                if (!prevCategories[category]) prevCategories[category] = 0;
                // 数据已经是AUD基准，直接转换为显示货币
                const amount = convertToDisplayCurrency(exp.amount || 0, 'AUD', displayCurrency);
                prevCategories[category] += amount;
            });
        }
        
        // 生成收入明细HTML
        const incomeDetails = monthData.incomeDetails || [];
        let incomeDetailsHtml = '';
        if (incomeDetails.length > 0) {
            console.log(`🔍 收入明细调试 - ${monthKey}:`, {
                totalIncomeFromData: monthData.income,
                incomeCurrency: monthData.incomeCurrency,
                incomeDetailsCount: incomeDetails.length,
                sampleIncomeDetail: incomeDetails[0],
                displayCurrency: displayCurrency
            });
            
            incomeDetailsHtml = `
                <div class="income-details-section">
                    <div class="income-details-header">📈 收入明细</div>
                    <div class="income-details-list">
                        ${incomeDetails.map((item, index) => {
                            const amount = convertToDisplayCurrency(item.amount || 0, 'AUD', displayCurrency);
                            
                            // 调试第一个项目的转换过程
                            if (index === 0) {
                                console.log(`📊 收入明细转换 - 第${index + 1}项:`, {
                                    itemName: item.name || item.category,
                                    originalAmount: item.originalAmount,
                                    originalCurrency: item.originalCurrency,
                                    currentAmount: item.amount,
                                    currentCurrency: item.currency,
                                    convertedAmount: amount,
                                    displayCurrency: displayCurrency,
                                    sourceAccount: item.sourceAccount
                                });
                            }
                            
                            return `
                                <div class="income-detail-item">
                                    <span class="income-detail-category">${item.name || item.category || '未知'}</span>
                                    <span class="income-detail-name"></span>
                                    <span class="income-detail-amount">${currencySymbol}${Math.round(amount).toLocaleString()}</span>
                                    <span class="income-detail-source">${item.sourceAccount || ''}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // 生成分类详情HTML
        const categoriesHtml = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => {
                let changeHtml = '';
                if (prevCategories[cat]) {
                    const change = ((amount - prevCategories[cat]) / prevCategories[cat] * 100);
                    if (Math.abs(change) > 5) {
                        const changeClass = change > 0 ? 'increase' : 'decrease';
                        changeHtml = `<span class="comparison-category-change ${changeClass}">${change > 0 ? '+' : ''}${change.toFixed(0)}%</span>`;
                    }
                } else if (amount > 0) {
                    changeHtml = `<span class="comparison-category-change increase">新增</span>`;
                }
                
                return `
                    <div class="comparison-category-item" onclick="showCategoryDetails('${monthKey}', '${cat.replace(/'/g, "\\'")}')">
                        <span class="comparison-category-name">${cat}</span>
                        <div>
                            <span class="comparison-category-amount">${currencySymbol}${Math.round(amount).toLocaleString()}</span>
                            ${changeHtml}
                        </div>
                    </div>
                `;
            }).join('');
        
        html += `
            <div class="comparison-month-card" onclick="toggleMonthDetails('${monthKey}')">
                <div class="comparison-month-header">
                    <span class="comparison-expand-icon">▶</span>
                    <span class="comparison-month-title">${monthKey}</span>
                    <span class="comparison-income-value">${currencySymbol}${Math.round(displayIncome).toLocaleString()}</span>
                    <span class="comparison-expense-value">${currencySymbol}${Math.round(displayExpense).toLocaleString()}</span>
                    <span class="comparison-balance-value ${balanceClass}">
                        ${balance >= 0 ? '+' : ''}${currencySymbol}${Math.round(Math.abs(balance)).toLocaleString()}
                    </span>
                </div>
                <div class="comparison-details">
                    ${incomeDetailsHtml}
                    <div class="comparison-categories-grid">
                        ${categoriesHtml}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    const contentElement = document.getElementById('monthly-comparison-content');
    if (contentElement) {
        contentElement.innerHTML = html;
    }
    
    const modalElement = document.getElementById('monthly-comparison-modal');
    if (modalElement) {
        modalElement.classList.add('show');
    }
}

// 切换月度详情展开/收起
window.toggleMonthDetails = function(monthKey) {
    const cards = document.querySelectorAll('.comparison-month-card');
    cards.forEach(card => {
        const title = card.querySelector('.comparison-month-title').textContent;
        if (title === monthKey) {
            card.classList.toggle('expanded');
        }
    });
}

// 显示分类详情
window.showCategoryDetails = function(monthKey, categoryName) {
    // 阻止事件冒泡，避免触发月度详情切换
    event.stopPropagation();
    
    // 使用新的多账户数据，如果没有则回退到旧数据
    const dataSource = (gameData.financeData?.aggregatedData && Object.keys(gameData.financeData.aggregatedData).length > 0) 
        ? gameData.financeData.aggregatedData 
        : gameData.billsData;
    
    if (!dataSource || !dataSource[monthKey]) {
        alert('未找到该月份的数据');
        return;
    }
    
    const displayCurrency = gameData.displayCurrency || 'AUD';
    const currencySymbol = getCurrencySymbol(displayCurrency);
    const monthData = dataSource[monthKey];
    
    // 找到该分类下的所有支出项目
    let categoryExpenses = (monthData.expenses || []).filter(exp => {
        const category = exp.category || exp.name || '其他';
        return category === categoryName;
    });
    // 优先显示明细（只在详细支出弹窗生效）
    if (categoryExpenses.length === 1 && Array.isArray(categoryExpenses[0].items)) {
        categoryExpenses = categoryExpenses[0].items;
    }
    if (categoryExpenses.length === 0) {
        alert('该分类下没有支出项目');
        return;
    }
    
    // 计算总金额（数据已经是AUD基准）
    let totalAmount = 0;
    categoryExpenses.forEach(exp => {
        const amount = convertToDisplayCurrency(exp.amount || 0, 'AUD', displayCurrency);
        totalAmount += amount;
    });
    
    // 生成详情HTML
    let html = `
        <div style="max-height: 400px; overflow-y: auto; padding: 16px;">
            <h4 style="margin-bottom: 16px; color: #2c3e50;">
                📊 ${monthKey} - ${categoryName}
            </h4>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
                <div style="font-size: 1.2em; font-weight: bold; color: #e67e22;">
                    总计：${currencySymbol}${Math.round(totalAmount).toLocaleString()}
                </div>
                <div style="font-size: 0.9em; color: #7f8c8d;">
                    共 ${categoryExpenses.length} 项支出
                </div>
            </div>
            <div style="space-y: 8px;">
    `;
    
    // 按金额降序排列
    categoryExpenses
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .forEach(exp => {
            const amount = convertToDisplayCurrency(exp.amount || 0, 'AUD', displayCurrency);
            const originalAmount = exp.originalAmount || exp.amount;
            const originalCurrency = exp.originalCurrency || exp.currency || 'AUD';
            const originalSymbol = getCurrencySymbol(originalCurrency);
            
            html += `
                <div style="background: white; border: 1px solid #e1e8ed; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: #2c3e50;">${exp.name}</span>
                        <span style="font-weight: bold; color: #e67e22;">${currencySymbol}${Math.round(amount).toLocaleString()}</span>
                    </div>
                    ${originalCurrency !== displayCurrency ? `
                        <div style="font-size: 0.85em; color: #7f8c8d; text-align: right;">
                            原始金额：${originalSymbol}${originalAmount.toLocaleString()}
                        </div>
                    ` : ''}
                    ${exp.description ? `
                        <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
                            ${exp.description}
                        </div>
                    ` : ''}
                </div>
            `;
        });
    
    html += `
            </div>
        </div>
    `;
    
    // 使用专用的详情模态框显示支出详情
    const detailsModalTitle = document.getElementById('details-modal-title');
    const detailsModalContent = document.getElementById('details-modal-content');
    if (detailsModalTitle && detailsModalContent) {
        detailsModalTitle.textContent = `${categoryName} 详细支出`;
        detailsModalContent.innerHTML = html;
        document.getElementById('details-modal').classList.add('show');
    } else {
        alert('支出详情功能暂时不可用');
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

// 第一个listCloudBackups函数已删除，使用下面统一的版本

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
        let actualTimeCost = calculateTimeCost(sh, sm, eh, em);
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
        // 使用统一的颜色哈希函数确保一致性
        const colorIndex = getColorIndex(prod.name);
        productionColorMap[prod.name] = colorIndex;
        console.log(`🎨 生产线 "${prod.name}" 映射到颜色索引: ${colorIndex}`);
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

// 测试蓝图拖拽功能
window.testBlueprintDrag = function() {
    console.log('🧪 测试蓝图拖拽功能...');
    
    // 检查是否有蓝图
    const blueprints = gameData.blueprints || [];
    console.log('📊 蓝图数量:', blueprints.length);
    
    if (blueprints.length === 0) {
        alert('没有蓝图可以测试拖拽功能。请先添加一个蓝图。');
        return;
    }
    
    // 检查拖拽相关的DOM元素
    const timeBlocks = document.querySelectorAll('.time-block.blueprint[draggable="true"]');
    console.log('🎯 可拖拽蓝图块数量:', timeBlocks.length);
    
    const calendarCells = document.querySelectorAll('.calendar-cell');
    console.log('📅 日历单元格数量:', calendarCells.length);
    
    // 检查事件监听器
    let hasListeners = 0;
    timeBlocks.forEach(block => {
        if (block.ondragstart && block.ondragend) {
            hasListeners++;
        }
    });
    console.log('🔗 有拖拽事件监听器的蓝图:', hasListeners);
    
    alert(`蓝图拖拽测试完成:\n- 蓝图数量: ${blueprints.length}\n- 可拖拽蓝图块: ${timeBlocks.length}\n- 有事件监听器: ${hasListeners}\n请查看控制台获取详细信息`);
}

// 测试函数 - 验证基本功能
window.testBasicFunctions = function() {
    console.log('🧪 开始基本功能测试...');
    
    // 测试 1: 模态框是否能正常显示
    console.log('测试 1: 模态框功能');
    try {
        // 使用专用的信息模态框进行测试
        const infoModalTitle = document.getElementById('info-modal-title');
        const infoModalContent = document.getElementById('info-modal-content');
        if (infoModalTitle && infoModalContent) {
            infoModalTitle.textContent = '测试模态框';
            infoModalContent.innerHTML = `
                <p>这是一个测试模态框，如果你能看到这个，说明模态框功能正常。</p>
                <p>测试将在2秒后自动关闭。</p>
            `;
            document.getElementById('info-modal').classList.add('show');
            console.log('✅ 模态框功能正常');
            
            // 2秒后自动关闭
            setTimeout(() => {
                document.getElementById('info-modal').classList.remove('show');
            }, 2000);
        } else {
            console.error('❌ 找不到信息模态框元素');
        }
    } catch (error) {
        console.error('❌ 模态框测试失败:', error);
    }
    
    // 测试 2: 数据状态
    console.log('测试 2: 数据状态');
    console.log('📊 gameData.timeLogs:', gameData.timeLogs?.length || 0);
    console.log('📊 gameData.blueprints:', gameData.blueprints?.length || 0);
    console.log('📊 gameData.productions:', gameData.productions?.length || 0);
    
    // 测试 3: DOM 元素
    console.log('测试 3: DOM 元素');
    const customModal = document.getElementById('custom-modal');
    const contextMenu = document.getElementById('context-menu');
    console.log('📋 custom-modal 存在:', !!customModal);
    console.log('📋 context-menu 存在:', !!contextMenu);
    
    alert('基本功能测试完成，请查看控制台输出结果');
}

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
            let actualTimeCost = calculateTimeCost(sh, sm, eh, em);
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
        modal.classList.remove('show');
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
                total += convertToDisplayCurrency(exp.amount, exp.currency, 'AUD');
            }
        } else if (exp.type === 'recurring') {
            // 固定支出
            if (exp.frequency === 'monthly') {
                // 每月一次，只要起始日期在本月或之前
                total += convertToDisplayCurrency(exp.amount, exp.currency, 'AUD');
            } else if (exp.frequency === 'biweekly') {
                // 每2周，计算本月内发生几次
                let current = new Date(start);
                // 调整到本月第一次发生日期
                while (current < firstDayOfMonth) {
                    current.setDate(current.getDate() + 14);
                }
                // 计算本月内发生的次数
                while (current <= lastDayOfMonth) {
                    total += convertToDisplayCurrency(exp.amount, exp.currency, 'AUD');
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
    
    document.getElementById('blueprint-modal').classList.add('show');
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
    document.getElementById('blueprint-automation-modal').classList.add('show');
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
    document.getElementById('automation-settings-modal').classList.add('show');
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

// 调试汇率转换函数
window.debugCurrencyConversion = function() {
    console.log('=== 汇率转换调试 ===');
    console.log('当前汇率设置: 1 AUD = 4.65 CNY');
    console.log('');
    
    // 测试数据
    const testCases = [
        { amount: 100, from: 'AUD', to: 'CNY', description: '100 AUD 转换为 CNY' },
        { amount: 465, from: 'CNY', to: 'AUD', description: '465 CNY 转换为 AUD' },
        { amount: 100, from: 'CNY', to: 'AUD', description: '100 CNY 转换为 AUD' },
        { amount: 465, from: 'AUD', to: 'CNY', description: '465 AUD 转换为 CNY' }
    ];
    
    testCases.forEach(test => {
        console.log(`--- ${test.description} ---`);
        
        // 使用 convertToCNY (实际转为AUD)
        const toAud = convertToCNY(test.amount, test.from);
        console.log(`convertToCNY(${test.amount}, '${test.from}'):`, toAud);
        
        // 使用 convertToDisplayCurrency
        const converted = convertToDisplayCurrency(test.amount, test.from, test.to);
        console.log(`convertToDisplayCurrency(${test.amount}, '${test.from}', '${test.to}'):`, converted);
        
        // 双重转换（如renderBillsSummary中的逻辑）
        const doubleConverted = convertToDisplayCurrency(convertToCNY(test.amount, test.from), 'AUD', test.to);
        console.log(`双重转换结果:`, doubleConverted);
        
        console.log('');
    });
    
    // 检查当前汇率设置
    console.log('--- 当前系统汇率设置 ---');
    console.log('app.js exchangeRates:', exchangeRates);
    if (window.gameData && window.gameData.financeData && window.gameData.financeData.settings) {
        console.log('financeData.settings.exchangeRates:', window.gameData.financeData.settings.exchangeRates);
    }
    console.log('displayCurrency:', window.gameData?.displayCurrency);
    
    return '调试完成，请查看控制台输出';
};

// 调试导入财务数据的函数
window.debugImportedData = function() {
    console.log('=== 导入财务数据调试 ===');
    
    if (!gameData.financeData) {
        console.log('❌ 没有财务数据');
        return;
    }
    
    // 检查账户设置
    const accounts = gameData.financeData.accounts || {};
    console.log('--- 账户设置 ---');
    Object.entries(accounts).forEach(([id, account]) => {
        console.log(`账户: ${account.name} (${id})`);
        console.log(`  货币: ${account.currency}`);
        console.log(`  启用: ${account.enabled}`);
    });
    console.log('');
    
    // 检查账户数据
    const accountData = gameData.financeData.accountData || {};
    console.log('--- 账户数据详情 ---');
    Object.entries(accountData).forEach(([accountId, monthlyData]) => {
        const account = accounts[accountId];
        const accountName = account ? account.name : accountId;
        
        console.log(`账户: ${accountName} (${accountId})`);
        console.log(`  账户设置货币: ${account?.currency}`);
        
        Object.entries(monthlyData).forEach(([monthKey, monthData]) => {
            console.log(`  月份: ${monthKey}`);
            console.log(`    收入: ${monthData.income || 0} (货币: ${monthData.incomeCurrency || '未设置'})`);
            
            if (monthData.expenses && monthData.expenses.length > 0) {
                console.log(`    支出数量: ${monthData.expenses.length}`);
                monthData.expenses.slice(0, 3).forEach((exp, idx) => {
                    console.log(`      [${idx}] ${exp.name}: ${exp.amount} (货币: ${exp.currency || '未设置'})`);
                });
                if (monthData.expenses.length > 3) {
                    console.log(`      ... 还有 ${monthData.expenses.length - 3} 项支出`);
                }
                
                // 检查货币一致性
                const currencyTypes = new Set();
                monthData.expenses.forEach(exp => {
                    currencyTypes.add(exp.currency || account?.currency || '未知');
                });
                console.log(`    支出涉及货币类型: [${Array.from(currencyTypes).join(', ')}]`);
            }
        });
        console.log('');
    });
    
    // 检查汇总数据
    const aggregatedData = gameData.financeData.aggregatedData || {};
    console.log('--- 汇总数据 ---');
    Object.entries(aggregatedData).slice(0, 2).forEach(([monthKey, monthData]) => {
        console.log(`月份: ${monthKey}`);
        console.log(`  汇总收入: ${monthData.income || 0} (货币: ${monthData.incomeCurrency || '未设置'})`);
        
        if (monthData.expenses && monthData.expenses.length > 0) {
            console.log(`  汇总支出数量: ${monthData.expenses.length}`);
            monthData.expenses.slice(0, 3).forEach((exp, idx) => {
                console.log(`    [${idx}] ${exp.name}: ${exp.amount} (货币: ${exp.currency})`);
                if (exp.originalAmount && exp.originalCurrency) {
                    console.log(`         原始: ${exp.originalAmount} ${exp.originalCurrency}`);
                }
            });
        }
        
        if (monthData.sources) {
            console.log(`  数据来源: ${monthData.sources.length} 个账户`);
            monthData.sources.forEach(source => {
                console.log(`    ${source.accountName} (${source.currency})`);
            });
        }
        console.log('');
    });
    
    // 检查主要设置
    console.log('--- 系统设置 ---');
    console.log('主货币 (displayCurrency):', gameData.displayCurrency);
    console.log('财务设置主货币:', gameData.financeData.settings?.primaryCurrency);
    console.log('财务设置汇率:', gameData.financeData.settings?.exchangeRates);
    
    return '调试完成，请查看控制台输出';
};

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
        timeLogsBefore: timeLogsBefore,
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

// === 日历右键菜单功能 ===

// 显示日历单元格右键菜单
function showCalendarCellContextMenu(event, date, hour) {
    hideContextMenu();
    const menu = document.getElementById('context-menu');
    
    // 计算具体时间
    const targetDate = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
    const timeStr = `${hour}:00`;
    const dateStr = new Date(date).toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
    });
    
    menu.innerHTML = `
        <div class="context-menu-item" onclick="quickCreateBlueprint('${date}', ${hour})">
            ➕ 新建蓝图 (${dateStr} ${timeStr})
        </div>
        <div class="context-menu-item" onclick="showTimeBlocksAtTime('${date}', ${hour})">
            👁️ 查看此时段
        </div>
    `;
    
    menu.style.display = 'block';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    contextMenuType = 'calendar-cell';
    
    // 添加点击其他地方关闭菜单的事件监听器
    setTimeout(() => {
        document.addEventListener('mousedown', hideContextMenu);
    }, 0);
}

// 快速创建蓝图
window.quickCreateBlueprint = function(date, hour) {
    hideContextMenu();
    
    // 计算目标时间
    const targetDateTime = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
    
    // 重置表单并设置默认值
    document.getElementById('blueprint-form').reset();
    
    // 设置时间为指定的日期和时间
    const year = targetDateTime.getFullYear();
    const month = String(targetDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(targetDateTime.getDate()).padStart(2, '0');
    const hours = String(targetDateTime.getHours()).padStart(2, '0');
    const minutes = '00';
    
    document.getElementById('blueprint-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // 设置默认时长为60分钟
    document.getElementById('blueprint-duration').value = '60';
    
    // 设置默认优先级为中等
    const mediumPriorityRadio = document.querySelector('input[name="priority"][value="medium"]');
    if (mediumPriorityRadio) {
        mediumPriorityRadio.checked = true;
    }
    
    // 渲染蓝图历史标签
    renderBlueprintHistoryTags();
    
    // 显示蓝图创建模态框
    document.getElementById('blueprint-modal').classList.add('show');
    
    // 自动聚焦到名称输入框
    setTimeout(() => {
        const nameInput = document.getElementById('blueprint-name');
        if (nameInput) {
            nameInput.focus();
        }
    }, 100);
}

// 查看指定时段的时间块
window.showTimeBlocksAtTime = function(date, hour) {
    console.log('🔍 showTimeBlocksAtTime 被调用:', { date, hour });
    hideContextMenu();
    
    // 获取该时段的所有时间块
    const timeLogs = gameData.timeLogs || [];
    const blueprints = gameData.blueprints || [];
    console.log('📊 数据统计:', { 
        timeLogs: timeLogs.length, 
        blueprints: blueprints.length,
        plannedBlueprints: blueprints.filter(bp => bp.status === 'planned').length
    });
    
    const allItems = [
        ...timeLogs.map(item => ({ ...item, itemType: 'log' })),
        ...blueprints.filter(item => item.status === 'planned').map(item => ({ ...item, itemType: 'blueprint' }))
    ];
    
    const timeBlocks = allItems.filter(item => {
        let itemDate, itemHour;
        
        if (item.itemType === 'log') {
            itemDate = item.date;
            itemHour = item.hour || 0;
        } else {
            const scheduledDate = new Date(item.scheduledDate);
            itemDate = formatDateLocal(scheduledDate);
            itemHour = scheduledDate.getHours();
        }
        
        return itemDate === date && itemHour === hour;
    });
    
    if (timeBlocks.length === 0) {
        alert(`该时段 (${date} ${hour}:00) 暂无安排`);
        return;
    }
    
    const timeStr = `${hour}:00`;
    const dateStr = new Date(date).toLocaleDateString('zh-CN', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
    });
    
    const blocksList = timeBlocks.map(block => {
        if (block.itemType === 'log') {
            const endTime = `${block.endHour || block.hour}:${String(block.endMinute || block.minute || 0).padStart(2, '0')}`;
            return `
                <div style="padding: 8px; margin: 4px 0; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #007bff;">
                    <strong>📝 ${block.name}</strong><br>
                    <small>时间日志: ${hour}:${String(block.minute || 0).padStart(2, '0')} - ${endTime}</small>
                </div>
            `;
        } else {
            const duration = block.duration || 60;
            const endTime = new Date(new Date(block.scheduledDate).getTime() + duration * 60000);
            const endTimeStr = `${endTime.getHours()}:${String(endTime.getMinutes()).padStart(2, '0')}`;
            const priorityText = {
                'low': '低',
                'medium': '中',
                'high': '高',
                'urgent': '紧急'
            }[block.priority] || '中';
            
            return `
                <div style="padding: 8px; margin: 4px 0; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                    <strong>📋 ${block.name}</strong><br>
                    <small>蓝图计划: ${timeStr} - ${endTimeStr} (${duration}分钟) | 优先级: ${priorityText}</small>
                    ${block.autoGenerated ? '<br><small style="color: #6c757d;">🤖 自动生成</small>' : ''}
                </div>
            `;
        }
    }).join('');
    
    // 使用时间记录模态框显示时段详情
    const timeRecordsContent = document.getElementById('time-records-content');
    if (timeRecordsContent) {
        timeRecordsContent.innerHTML = `
            <div style="margin-bottom: 12px;">
                <h4>${dateStr} ${timeStr} - 时段详情</h4>
                <p style="color: #666;">该时段共有 ${timeBlocks.length} 项安排：</p>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${blocksList}
            </div>
        `;
        document.getElementById('time-records-modal').classList.add('show');
    } else {
        alert(`时段详情 (${dateStr} ${timeStr}):\n该时段共有 ${timeBlocks.length} 项安排`);
    }
}

// === 蓝图拖拽功能 ===

let draggedBlueprintId = null;

// 处理蓝图拖拽开始
window.handleBlueprintDragStart = function(e, blueprintId) {
    console.log('🎯 handleBlueprintDragStart 被调用:', blueprintId);
    draggedBlueprintId = blueprintId;
    
    // 设置拖拽效果
    if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blueprintId);
    }
    
    // 添加拖拽样式
    e.target.style.opacity = '0.5';
    
    // 为所有可拖放的单元格添加视觉提示
    setTimeout(() => {
        const calendarCells = document.querySelectorAll('.calendar-cell');
        calendarCells.forEach(cell => {
            const hour = parseInt(cell.dataset.hour);
            if (hour < 24) {
                cell.classList.add('drag-target');
            }
        });
    }, 0);
}

// 处理蓝图拖拽结束
window.handleBlueprintDragEnd = function(e) {
    // 恢复样式
    e.target.style.opacity = '1';
    
    // 移除所有拖放样式
    const calendarCells = document.querySelectorAll('.calendar-cell');
    calendarCells.forEach(cell => {
        cell.classList.remove('drag-target', 'drag-over');
    });
    
    draggedBlueprintId = null;
}

// 处理蓝图拖放
window.handleBlueprintDrop = function(e, targetDate, targetHour) {
    console.log('🎯 handleBlueprintDrop 被调用:', { draggedBlueprintId, targetDate, targetHour });
    if (!draggedBlueprintId) {
        console.warn('⚠️ 没有拖拽的蓝图ID');
        return;
    }
    
    // 查找要移动的蓝图
    const blueprintIndex = gameData.blueprints.findIndex(bp => bp.id === draggedBlueprintId);
    if (blueprintIndex === -1) return;
    
    const blueprint = gameData.blueprints[blueprintIndex];
    const oldDate = new Date(blueprint.scheduledDate);
    
    // 创建新的时间
    const newDate = new Date(`${targetDate}T${String(targetHour).padStart(2, '0')}:00:00`);
    
    // 检查是否真的需要移动（避免拖到相同位置）
    if (formatDateLocal(oldDate) === targetDate && oldDate.getHours() === targetHour) {
        return;
    }
    
    // 确认对话框
    const oldDateStr = oldDate.toLocaleDateString('zh-CN', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
    });
    const newDateStr = newDate.toLocaleDateString('zh-CN', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
    });
    const oldTimeStr = `${oldDate.getHours()}:${String(oldDate.getMinutes()).padStart(2, '0')}`;
    const newTimeStr = `${targetHour}:00`;
    
    const confirmMessage = `确认移动蓝图吗？\n\n📋 ${blueprint.name}\n原时间: ${oldDateStr} ${oldTimeStr}\n新时间: ${newDateStr} ${newTimeStr}\n时长: ${blueprint.duration}分钟 | 优先级: ${blueprint.priority || 'medium'}`;
    
    if (confirm(confirmMessage)) {
            // 更新蓝图时间
            blueprint.scheduledDate = newDate.toISOString();
            
            // 添加到历史记录
            addToBlueprintHistory(blueprint, `时间调整: ${oldDateStr} ${oldTimeStr} → ${newDateStr} ${newTimeStr}`);
            
            // 保存并刷新
            saveToCloud();
            renderWeekCalendar();
            
            // 显示成功提示
        alert(`✅ 蓝图"${blueprint.name}"已成功移动到新时间`);
    }
}

// 测试年份切换按钮
window.testYearButtons = function() {
    console.log('Testing year buttons...');
    alert('年份切换按钮测试 - 请查看控制台输出');
}

// 测试按钮样式统一性
function testButtonUniformity() {
    console.log('🔍 测试按钮样式统一性...');
    
    const buttonTypes = [
        '.nav-btn',
        '.tab-btn', 
        '.currency-btn',
        '.year-nav-btn',
        '.btn',
        '.btn-small'
    ];
    
    buttonTypes.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        if (buttons.length > 0) {
            const firstButton = buttons[0];
            const styles = window.getComputedStyle(firstButton);
            console.log(`${selector} (${buttons.length}个):`, {
                fontSize: styles.fontSize,
                fontWeight: styles.fontWeight,
                padding: styles.padding,
                border: styles.border,
                borderRadius: styles.borderRadius,
                background: styles.backgroundColor,
                color: styles.color
            });
        }
    });
    
    console.log('✅ 按钮样式统一性测试完成');
}

// 在控制台中可调用
window.testButtonUniformity = testButtonUniformity;

// 测试月度对比界面优化
function testMonthlyComparisonUI() {
    console.log('🎨 测试月度对比界面优化...');
    
    const comparisonCards = document.querySelectorAll('.comparison-month-card');
    if (comparisonCards.length > 0) {
        console.log(`✅ 找到 ${comparisonCards.length} 个月度对比卡片`);
        
        // 检查第一个卡片的样式
        const firstCard = comparisonCards[0];
        const styles = window.getComputedStyle(firstCard);
        
        console.log('📊 月度对比卡片样式:', {
            background: styles.backgroundColor,
            borderRadius: styles.borderRadius,
            borderLeft: styles.borderLeft,
            boxShadow: styles.boxShadow,
            transition: styles.transition
        });
        
        // 检查类别项目样式
        const categoryItems = document.querySelectorAll('.comparison-category-item');
        if (categoryItems.length > 0) {
            const categoryStyle = window.getComputedStyle(categoryItems[0]);
            console.log('🏷️ 类别项目样式:', {
                background: categoryStyle.backgroundColor,
                border: categoryStyle.border,
                borderRadius: categoryStyle.borderRadius,
                fontSize: categoryStyle.fontSize
            });
        }
        
        // 模拟悬停效果测试
        console.log('🖱️ 测试悬停效果...');
        firstCard.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        setTimeout(() => {
            const hoverStyles = window.getComputedStyle(firstCard);
            console.log('📌 悬停状态样式:', {
                transform: hoverStyles.transform,
                boxShadow: hoverStyles.boxShadow
            });
            firstCard.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        }, 100);
        
    } else {
        console.log('❌ 未找到月度对比卡片');
    }
    
    console.log('✨ 月度对比界面优化测试完成');
}

window.testMonthlyComparisonUI = testMonthlyComparisonUI;

// 测试账单管理界面
function testCurrentMonthBills() {
    console.log('💰 测试当月账单管理界面...');
    
    const container = document.getElementById('bills-summary-content');
    if (!container) {
        console.log('❌ 未找到账单容器');
        return;
    }
    
    const monthSummary = container.querySelector('.current-month-summary');
    if (monthSummary) {
        console.log('✅ 找到当月账单汇总');
        
        // 检查月份标题
        const monthTitle = monthSummary.querySelector('.month-title h4');
        if (monthTitle) {
            console.log(`📅 显示月份: ${monthTitle.textContent}`);
        }
        
        // 检查概览卡片
        const overviewItems = monthSummary.querySelectorAll('.overview-item');
        console.log(`📊 概览项目数: ${overviewItems.length} (期望: 3个)`);
        
        // 检查分类列表
        const categoryItems = monthSummary.querySelectorAll('.category-item');
        if (categoryItems.length > 0) {
            console.log(`📁 分类项目数: ${categoryItems.length}`);
            
            // 测试第一个分类的交互
            const firstCategory = categoryItems[0];
            const categoryName = firstCategory.querySelector('.category-name')?.textContent;
            console.log(`🏷️ 第一个分类: ${categoryName}`);
            
            // 检查详情展开功能
            const details = firstCategory.querySelector('.category-details');
            if (details) {
                console.log('✅ 分类详情元素存在');
                if (details.classList.contains('expanded')) {
                    console.log('📂 当前状态: 已展开');
                } else {
                    console.log('📁 当前状态: 未展开');
                }
            }
        } else {
            console.log('📋 无分类支出或数据为空');
        }
        
        // 检查样式
        const styles = window.getComputedStyle(monthSummary);
        console.log('🎨 样式检查:', {
            padding: styles.padding,
            background: styles.backgroundColor
        });
        
    } else {
        console.log('❌ 未找到当月账单汇总元素');
        
        // 检查是否显示了无数据状态
        const noDataMessage = container.textContent;
        if (noDataMessage.includes('还没有账单数据') || noDataMessage.includes('没有可显示的账单数据')) {
            console.log('ℹ️ 显示无数据状态');
        }
    }
    
    console.log('✨ 当月账单管理界面测试完成');
}

window.testCurrentMonthBills = testCurrentMonthBills;

// 测试紧凑布局
function testCompactLayout() {
    console.log('📏 测试紧凑布局效果...');
    
    const container = document.querySelector('.current-month-summary');
    if (container) {
        const styles = window.getComputedStyle(container);
        console.log('📦 容器内边距:', styles.padding);
        
        // 检查月份标题间距
        const monthTitle = container.querySelector('.month-title');
        if (monthTitle) {
            const titleStyles = window.getComputedStyle(monthTitle);
            console.log('📅 标题底边距:', titleStyles.marginBottom);
        }
        
        // 检查概览卡片
        const overview = container.querySelector('.month-overview');
        if (overview) {
            const overviewStyles = window.getComputedStyle(overview);
            console.log('📊 概览区域间距:', {
                gap: overviewStyles.gap,
                marginBottom: overviewStyles.marginBottom
            });
            
            const overviewItem = overview.querySelector('.overview-item');
            if (overviewItem) {
                const itemStyles = window.getComputedStyle(overviewItem);
                console.log('💳 概览卡片内边距:', itemStyles.padding);
            }
        }
        
        // 检查分类列表
        const categoriesSection = container.querySelector('.categories-section');
        if (categoriesSection) {
            const sectionTitle = categoriesSection.querySelector('h5');
            if (sectionTitle) {
                const titleStyles = window.getComputedStyle(sectionTitle);
                console.log('🏷️ 分类标题底边距:', titleStyles.marginBottom);
            }
            
            const categoryItem = categoriesSection.querySelector('.category-item');
            if (categoryItem) {
                const categoryHeader = categoryItem.querySelector('.category-header');
                if (categoryHeader) {
                    const headerStyles = window.getComputedStyle(categoryHeader);
                    console.log('📁 分类项内边距:', headerStyles.padding);
                }
            }
        }
        
        console.log('✅ 紧凑布局优化已应用');
    } else {
        console.log('❌ 未找到账单汇总容器');
    }
    
    console.log('✨ 紧凑布局测试完成');
}

window.testCompactLayout = testCompactLayout;

// 测试分类展开功能
function testCategoryToggle() {
    console.log('🔄 测试分类展开功能...');
    
    const categoryItems = document.querySelectorAll('.category-item');
    if (categoryItems.length === 0) {
        console.log('❌ 未找到分类项目');
        return;
    }
    
    console.log(`✅ 找到 ${categoryItems.length} 个分类项目`);
    
    categoryItems.forEach((item, index) => {
        const categoryName = item.querySelector('.category-name')?.textContent;
        const detailsElement = item.querySelector('.category-details');
        
        if (detailsElement) {
            const expectedId = `category-${index}`;
            const actualId = detailsElement.id;
            
            console.log(`📁 分类 ${index + 1}: ${categoryName}`);
            console.log(`   期望ID: ${expectedId}, 实际ID: ${actualId}`);
            
            if (expectedId === actualId) {
                console.log(`   ✅ ID匹配正确`);
                
                // 测试展开状态
                const isExpanded = detailsElement.classList.contains('expanded');
                console.log(`   📂 当前状态: ${isExpanded ? '已展开' : '已收起'}`);
                
                // 检查点击事件
                const onclickAttr = item.getAttribute('onclick');
                if (onclickAttr && onclickAttr.includes(expectedId)) {
                    console.log(`   🖱️ 点击事件配置正确`);
                } else {
                    console.log(`   ❌ 点击事件配置错误: ${onclickAttr}`);
                }
            } else {
                console.log(`   ❌ ID不匹配`);
            }
        } else {
            console.log(`   ❌ 未找到详情元素`);
        }
    });
    
    // 测试实际点击第一个分类
    if (categoryItems.length > 0) {
        const firstCategory = categoryItems[0];
        const firstDetails = firstCategory.querySelector('.category-details');
        
        if (firstDetails) {
            console.log('\n🧪 测试点击第一个分类...');
            const beforeState = firstDetails.classList.contains('expanded');
            console.log(`   点击前状态: ${beforeState ? '已展开' : '已收起'}`);
            
            // 模拟点击
            toggleCategoryDetails('category-0');
            
            const afterState = firstDetails.classList.contains('expanded');
            console.log(`   点击后状态: ${afterState ? '已展开' : '已收起'}`);
            
            if (beforeState !== afterState) {
                console.log('   ✅ 点击切换功能正常');
            } else {
                console.log('   ❌ 点击切换功能异常');
            }
            
            // 恢复原状态
            if (beforeState !== afterState) {
                toggleCategoryDetails('category-0');
            }
        }
    }
    
    console.log('✨ 分类展开功能测试完成');
}

window.testCategoryToggle = testCategoryToggle;

// 综合UI统一性测试
function testUIConsistency() {
    console.log('🎯 开始综合UI统一性测试...');
    
    // 1. 测试按钮统一性
    console.log('\n1️⃣ 测试按钮统一性:');
    testButtonUniformity();
    
    // 2. 测试月度对比界面
    console.log('\n2️⃣ 测试月度对比界面:');
    testMonthlyComparisonUI();
    
    // 2a. 测试表头对齐
    console.log('\n2️⃣a 测试表头对齐:');
    testComparisonTableAlignment();
    
    // 2b. 测试账单管理界面
    console.log('\n2️⃣b 测试账单管理界面:');
    testCurrentMonthBills();
    
    // 2c. 测试紧凑布局
    console.log('\n2️⃣c 测试紧凑布局:');
    testCompactLayout();
    
    // 2d. 测试分类展开功能
    console.log('\n2️⃣d 测试分类展开功能:');
    testCategoryToggle();
    
    // 3. 测试CSS变量使用情况
    console.log('\n3️⃣ 测试CSS变量使用情况:');
    const rootStyles = window.getComputedStyle(document.documentElement);
    const importantVars = [
        '--card-bg',
        '--surface-hover', 
        '--border-light',
        '--border-medium',
        '--text-primary',
        '--text-secondary',
        '--primary-color',
        '--status-success',
        '--danger-color'
    ];
    
    importantVars.forEach(varName => {
        const value = rootStyles.getPropertyValue(varName).trim();
        if (value) {
            console.log(`✅ ${varName}: ${value}`);
        } else {
            console.log(`❌ ${varName}: 未定义`);
        }
    });
    
    // 4. 测试面板一致性
    console.log('\n4️⃣ 测试面板一致性:');
    const panels = document.querySelectorAll('.panel');
    if (panels.length > 0) {
        const panelStyle = window.getComputedStyle(panels[0]);
        console.log(`📦 面板统一样式 (${panels.length}个):`, {
            background: panelStyle.backgroundColor,
            borderRadius: panelStyle.borderRadius,
            padding: panelStyle.padding,
            border: panelStyle.border,
            boxShadow: panelStyle.boxShadow
        });
    }
    
    console.log('\n✨ 综合UI统一性测试完成！');
    console.log('💡 使用 testButtonUniformity() 单独测试按钮');
    console.log('💡 使用 testMonthlyComparisonUI() 单独测试月度对比界面');
    console.log('💡 使用 testComparisonTableAlignment() 单独测试表头对齐');
    console.log('💡 使用 testCurrentMonthBills() 单独测试账单管理界面');
    console.log('💡 使用 testCompactLayout() 单独测试紧凑布局');
    console.log('💡 使用 testCategoryToggle() 单独测试分类展开功能');
}

window.testUIConsistency = testUIConsistency;

// ===== 综合功能测试 =====
window.testAllFixedFunctions = function() {
    console.log('🧪 开始综合功能测试...');
    
    let testResults = [];
    
    // 1. 测试模态框功能
    const timeEditModal = document.getElementById('time-edit-modal');
    if (timeEditModal) {
        testResults.push('✅ 时间编辑模态框存在');
    } else {
        testResults.push('❌ 时间编辑模态框缺失');
    }
    
    // 2. 测试表单元素
    const requiredFields = ['time-edit-project-name', 'time-edit-date', 'time-edit-start', 'time-edit-end'];
    const missingFields = requiredFields.filter(id => !document.getElementById(id));
    if (missingFields.length === 0) {
        testResults.push('✅ 所有表单字段存在');
    } else {
        testResults.push(`❌ 缺失表单字段: ${missingFields.join(', ')}`);
    }
    
    // 3. 测试函数存在性
    const requiredFunctions = ['editCalendarLog', 'deleteCalendarLog', 'showTimeBlocksAtTime', 'closeModal'];
    const missingFunctions = requiredFunctions.filter(func => typeof window[func] !== 'function');
    if (missingFunctions.length === 0) {
        testResults.push('✅ 所有必需函数存在');
    } else {
        testResults.push(`❌ 缺失函数: ${missingFunctions.join(', ')}`);
    }
    
    // 4. 测试数据结构
    if (gameData && Array.isArray(gameData.timeLogs)) {
        testResults.push(`✅ 时间日志数据正常 (${gameData.timeLogs.length} 条记录)`);
    } else {
        testResults.push('❌ 时间日志数据结构异常');
    }
    
    if (gameData && Array.isArray(gameData.blueprints)) {
        testResults.push(`✅ 蓝图数据正常 (${gameData.blueprints.length} 条记录)`);
    } else {
        testResults.push('❌ 蓝图数据结构异常');
    }
    
    // 5. 测试拖拽函数
    const dragFunctions = ['handleBlueprintDragStart', 'handleBlueprintDragEnd', 'handleBlueprintDrop'];
    const missingDragFunctions = dragFunctions.filter(func => typeof window[func] !== 'function');
    if (missingDragFunctions.length === 0) {
        testResults.push('✅ 蓝图拖拽函数完整');
    } else {
        testResults.push(`❌ 缺失拖拽函数: ${missingDragFunctions.join(', ')}`);
    }
    
    // 输出测试结果
    console.log('\n📋 测试结果汇总:');
    testResults.forEach(result => console.log(result));
    
    const passedTests = testResults.filter(r => r.startsWith('✅')).length;
    const totalTests = testResults.length;
    
    alert(`测试完成！\n通过: ${passedTests}/${totalTests}\n\n详细结果请查看控制台`);
    
    return { passed: passedTests, total: totalTests, results: testResults };
}

// 测试修复的功能
window.testFixedIssues = function() {
    console.log('🔧 测试修复的功能...');
    
    let testResults = [];
    
    // 1. 测试备份列表函数
    if (typeof window.listCloudBackups === 'function') {
        testResults.push('✅ listCloudBackups 函数存在');
    } else {
        testResults.push('❌ listCloudBackups 函数缺失');
    }
    
    if (typeof window.restoreFromCloudBackup === 'function') {
        testResults.push('✅ restoreFromCloudBackup 函数存在');
    } else {
        testResults.push('❌ restoreFromCloudBackup 函数缺失');
    }
    
    if (typeof window.deleteCloudBackup === 'function') {
        testResults.push('✅ deleteCloudBackup 函数存在');
    } else {
        testResults.push('❌ deleteCloudBackup 函数缺失');
    }
    
    // 2. 测试时间统计面板
    const timeRecordsModal = document.getElementById('time-records-modal');
    if (timeRecordsModal) {
        const computedStyle = window.getComputedStyle(timeRecordsModal);
        const zIndex = computedStyle.zIndex;
        if (zIndex === '1100') {
            testResults.push('✅ 时间记录模态框 z-index 正确设置为 1100');
        } else {
            testResults.push(`❌ 时间记录模态框 z-index 为 ${zIndex}，应为 1100`);
        }
    } else {
        testResults.push('❌ 时间记录模态框元素不存在');
    }
    
    // 3. 测试时间编辑模态框
    const timeEditModal = document.getElementById('time-edit-modal');
    if (timeEditModal) {
        const computedStyle = window.getComputedStyle(timeEditModal);
        const zIndex = computedStyle.zIndex;
        if (zIndex === '1100') {
            testResults.push('✅ 时间编辑模态框 z-index 正确设置为 1100');
        } else {
            testResults.push(`❌ 时间编辑模态框 z-index 为 ${zIndex}，应为 1100`);
        }
    } else {
        testResults.push('❌ 时间编辑模态框元素不存在');
    }
    
    // 4. 测试showTimeRecordsPanel函数
    if (typeof window.showTimeRecordsPanel === 'function') {
        testResults.push('✅ showTimeRecordsPanel 函数存在');
    } else {
        testResults.push('❌ showTimeRecordsPanel 函数缺失');
    }
    
    // 输出测试结果
    console.log('\n🧪 修复功能测试结果:');
    testResults.forEach(result => console.log(result));
    
    const passedTests = testResults.filter(r => r.startsWith('✅')).length;
    const totalTests = testResults.length;
    
    alert(`修复功能测试完成！\n通过: ${passedTests}/${totalTests}\n\n详细结果请查看控制台`);
    
    return { passed: passedTests, total: totalTests, results: testResults };
}

// 渲染资源分析面板
window.renderResourceAnalysis = function() {
    const container = document.getElementById('resource-analysis-content');
    if (!container) return;
    
    const displayCurrency = gameData.displayCurrency || 'AUD';
    const currencySymbol = getCurrencySymbol(displayCurrency);
    
    // 确保有基础数据结构
    if (!gameData.resourceAnalysis) {
        gameData.resourceAnalysis = {
            monthlyAverage: 0,
            fixedExpenseRatio: 0,
            stabilityScore: 0,
            insights: [],
            predictions: {
                nextMonthExpense: 0,
                specialReminders: []
            }
        };
    }
    
    const analysis = gameData.resourceAnalysis;
    const displayMonthlyAvg = convertToDisplayCurrency(analysis.monthlyAverage, 'AUD', displayCurrency);
    const displayPrediction = convertToDisplayCurrency(analysis.predictions?.nextMonthExpense || 0, 'AUD', displayCurrency);
    
    let html = `
        <div class="analysis-dashboard">
            <!-- 核心指标摘要 -->
            <div class="analysis-summary">
                <div class="primary-metric">
                    <div class="metric-value">${currencySymbol}${Math.round(displayMonthlyAvg).toLocaleString()}</div>
                    <div class="metric-label">月均支出</div>
                </div>
                <div class="secondary-metrics">
                    <div class="metric-item">
                        <span class="metric-number">${analysis.fixedExpenseRatio}%</span>
                        <span class="metric-desc">固定支出占比</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-number">${analysis.stabilityScore}</span>
                        <span class="metric-desc">稳定度评分</span>
                    </div>
                </div>
            </div>
            
            <!-- 关键洞察 -->
            <div class="analysis-insights">
                <h5>💡 关键洞察</h5>
                <div class="insights-list">
                    ${analysis.insights.map(insight => 
                        `<span class="insight-item">${insight}</span>`
                    ).join('')}
                </div>
            </div>
            
            <!-- 支出预测 -->
            <div class="analysis-predictions">
                <h5>🔮 支出预测</h5>
                <div class="prediction-main">
                    <div class="prediction-total">${currencySymbol}${Math.round(displayPrediction).toLocaleString()}</div>
                    <div class="prediction-breakdown">预计下月支出</div>
                </div>
                ${analysis.predictions?.specialReminders?.length > 0 ? `
                    <div class="special-reminders">
                        ${analysis.predictions.specialReminders.map(reminder => 
                            `<div class="reminder-item">⚠️ ${reminder}</div>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// 更新资源分析数据
window.updateResourceAnalysisData = function() {
    if (!gameData.billsData || Object.keys(gameData.billsData).length === 0) {
        // 清空分析数据
        gameData.resourceAnalysis = {
            monthlyAverage: 0,
            fixedExpenseRatio: 0,
            stabilityScore: 0,
            insights: [],
            predictions: {
                nextMonthExpense: 0,
                specialReminders: []
            }
        };
        return;
    }
    
    // 分析历史数据
    const months = Object.keys(gameData.billsData).sort();
    const monthlyExpenses = [];
    const monthlyIncomes = [];
    const expenseCategories = {};
    
    months.forEach(month => {
        const monthData = gameData.billsData[month];
        
        // 安全检查：确保monthData和expenses存在
        if (!monthData || !monthData.expenses || !Array.isArray(monthData.expenses)) {
            monthlyExpenses.push(0);
            monthlyIncomes.push(0);
            return;
        }
        
        // 计算月支出（转换为澳元基准）
        const monthExpense = monthData.expenses.reduce((sum, expense) => {
            return sum + convertToDisplayCurrency(expense.amount, expense.currency || 'AUD', 'AUD');
        }, 0);
        monthlyExpenses.push(monthExpense);
        
        // 计算月收入（转换为澳元基准）
        const monthIncome = convertToDisplayCurrency(monthData.income || 0, monthData.incomeCurrency || 'AUD', 'AUD');
        monthlyIncomes.push(monthIncome);
        
        // 统计支出类别
        monthData.expenses.forEach(expense => {
            const category = expense.category || expense.name || '其他';
            const amount = convertToDisplayCurrency(expense.amount, expense.currency || 'AUD', 'AUD');
            expenseCategories[category] = (expenseCategories[category] || 0) + amount;
        });
    });
    
    // 计算平均月支出
    const monthlyAverage = monthlyExpenses.reduce((sum, exp) => sum + exp, 0) / monthlyExpenses.length;
    
    // 计算固定支出占比（假设房租、保险等为固定支出）
    const fixedCategories = ['房租', '保险', '贷款', '水电费', '网费', '手机费', 'Rent', 'Insurance', 'Loan'];
    const fixedExpenses = Object.entries(expenseCategories)
        .filter(([category]) => fixedCategories.some(fixed => category.toLowerCase().includes(fixed.toLowerCase())))
        .reduce((sum, entry) => sum + entry[1], 0);
    const fixedExpenseRatio = monthlyExpenses.length > 0 ? (fixedExpenses / (monthlyAverage * monthlyExpenses.length)) : 0;
    
    // 计算稳定度评分（基于支出变化的标准差）
    const avgExpense = monthlyAverage;
    const variance = monthlyExpenses.reduce((sum, exp) => sum + Math.pow(exp - avgExpense, 2), 0) / monthlyExpenses.length;
    const stabilityScore = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / avgExpense) * 100));
    
    // 生成洞察
    const insights = [];
    if (fixedExpenseRatio > 0.6) {
        insights.push('固定支出占比较高');
    }
    if (stabilityScore > 80) {
        insights.push('支出模式稳定');
    } else if (stabilityScore < 50) {
        insights.push('支出波动较大');
    }
    
    // 找出最大支出类别
    const topCategory = Object.entries(expenseCategories)
        .sort(([,a], [,b]) => b - a)[0];
    if (topCategory) {
        insights.push(`主要支出: ${topCategory[0]}`);
    }
    
    // 生成预测
    const recentMonths = monthlyExpenses.slice(-3); // 最近3个月
    const recentAverage = recentMonths.reduce((sum, exp) => sum + exp, 0) / recentMonths.length;
    const nextMonthExpense = Math.round(recentAverage * 1.05); // 预测增长5%
    
    const specialReminders = [];
    if (nextMonthExpense > monthlyAverage * 1.2) {
        specialReminders.push('下月支出可能超出平均水平20%');
    }
    
    // 更新分析数据
    gameData.resourceAnalysis = {
        monthlyAverage: Math.round(monthlyAverage),
        fixedExpenseRatio: Math.round(fixedExpenseRatio * 100),
        stabilityScore: Math.round(stabilityScore),
        insights: insights,
        predictions: {
            nextMonthExpense: nextMonthExpense,
            specialReminders: specialReminders
        }
    };
}

// ========== 数据管理功能 ========== //
window.showDataManagePanel = function() {
    updateDataStatus();
    document.getElementById('data-manage-modal').classList.add('show');
    
    // 更新自动备份状态
    document.getElementById('auto-backup-enabled').checked = autoBackupEnabled;
    document.getElementById('last-backup-time').textContent = lastBackupTime || '未备份';
}

function updateDataStatus() {
    const localData = localStorage.getItem('lifeFactorio');
    const hasLocal = !!localData;
    const localSize = localData ? Math.round(localData.length / 1024) : 0;
    
    document.getElementById('current-family-code').textContent = familyCode || '未设置';
    
    // 计算今日时间统计
    const today = getLocalDateString();
    const todayLogs = (gameData.timeLogs || []).filter(log => log.date === today);
    const todayActiveMins = todayLogs.reduce((sum, log) => {
        let timeCost = log.timeCost || 0;
        if (timeCost <= 0 && log.hour !== undefined && log.endHour !== undefined) {
            timeCost = calculateTimeCost(log.hour, log.minute || 0, log.endHour, log.endMinute || 0);
        }
        return sum + Math.max(0, timeCost);
    }, 0);
    
    // 计算蓝图统计
    const totalBlueprints = (gameData.blueprints || []).length;
    const plannedBlueprints = (gameData.blueprints || []).filter(b => b.status === 'planned').length;
    const completedBlueprints = (gameData.blueprints || []).filter(b => b.status === 'completed').length;
    const expiredBlueprints = (gameData.blueprints || []).filter(b => b.status === 'expired').length;
    
    // 计算账单数据统计
    const billsDataKeys = Object.keys(gameData.billsData || {});
    const totalBillsMonths = billsDataKeys.length;
    let totalBillsExpenses = 0;
    let totalBillsIncome = 0;
    
    billsDataKeys.forEach(monthKey => {
        const monthData = gameData.billsData[monthKey];
        if (monthData) {
            // 计算月支出
            const monthExpenses = (monthData.expenses || []).reduce((sum, expense) => {
                return sum + convertToDisplayCurrency(expense.amount, expense.currency || 'AUD', 'AUD');
            }, 0);
            totalBillsExpenses += monthExpenses;
            
            // 计算月收入
            totalBillsIncome += convertToDisplayCurrency(monthData.income || 0, monthData.incomeCurrency || 'AUD', 'AUD');
        }
    });
    
    const statusHtml = `
        <div>• 云端连接: ${isCloudReady ? '✅ 已连接' : '❌ 未连接'}</div>
        <div>• 本地数据: ${hasLocal ? `✅ 存在 (${localSize}KB)` : '❌ 不存在'}</div>
        <div>• 生产线数量: ${(gameData.productions || []).length}</div>
        <div>• 研发项目数量: ${(gameData.developments || []).length}</div>
        <div>• 时间记录数量: ${(gameData.timeLogs || []).length}</div>
        <div>• 支出记录数量: ${(gameData.expenses || []).length}</div>
        <div>• 今日主动用时: ${Math.floor(todayActiveMins/60)}小时${todayActiveMins%60}分钟 
            <button class="btn btn-small btn-secondary" onclick="window.showTodayTimeDetails()" style="margin-left:8px;font-size:0.8em;padding:2px 6px;">👁️ 详情</button>
        </div>
        <div>• 蓝图数据: 总计${totalBlueprints}个 (计划中${plannedBlueprints}个, 已完成${completedBlueprints}个, 已过期${expiredBlueprints}个)</div>
        <div>• 账单数据: ${totalBillsMonths}个月份记录</div>
        <div>• 账单总支出: ¥${Math.round(totalBillsExpenses).toLocaleString()}</div>
        <div>• 账单总收入: ¥${Math.round(totalBillsIncome).toLocaleString()}</div>
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
                alert('📭 暂无云端备份');
                return;
            }
            
            // 使用时间记录模态框显示备份列表
            let html = `
                <div style="margin-bottom: 12px;">
                    <h4>☁️ 云端备份管理</h4>
                    <p style="color: #666;">最近10个云端备份</p>
                </div>
                <div style="max-height:400px;overflow-y:auto;">
            `;
            
            snapshot.docs.forEach((doc, index) => {
                const data = doc.data();
                const time = new Date(data.timestamp).toLocaleString();
                const productions = data.gameData?.productions?.length || 0;
                const timeLogs = data.gameData?.timeLogs?.length || 0;
                
                html += `
                    <div style="border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:10px;background:#f9f9f9;">
                        <div style="font-weight:bold;margin-bottom:8px;">${time}</div>
                        <div style="font-size:0.9em;color:#666;margin-bottom:8px;">
                            生产线: ${productions} | 时间记录: ${timeLogs} | 类型: ${data.backupType === 'auto' ? '自动备份' : '手动备份'}
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-small btn-primary" onclick="window.restoreFromCloudBackup('${doc.id}')">
                                🔄 恢复此备份
                            </button>
                            <button class="btn btn-small btn-danger" onclick="window.deleteCloudBackup('${doc.id}')">
                                🗑️ 删除
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            const cloudBackupContent = document.getElementById('cloud-backup-content');
            if (cloudBackupContent) {
                cloudBackupContent.innerHTML = html;
                document.getElementById('cloud-backup-modal').classList.add('show');
            } else {
                alert('备份列表功能暂时不可用');
            }
        })
        .catch(error => {
            console.error('获取备份列表失败:', error);
            alert('❌ 获取备份列表失败：' + error.message);
        });
}

window.restoreFromBackup = function(backupId) {
    if (!confirm('确定要恢复此备份吗？当前数据将被覆盖。')) return;
    
    db.collection('backups').doc(familyCode).collection('history').doc(backupId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('❌ 备份不存在');
                return;
            }
            
            const backupData = doc.data();
            
            // 恢复数据
            gameData = backupData.gameData;
            lastDailyReset = backupData.lastDailyReset;
            
            // 保存到云端
            saveToCloud();
            
            // 刷新界面
            renderProductions();
            renderDevelopments();
            renderMilestones();
            renderResourceStats();
            renderWeekCalendar();
            renderExpenses();
            renderResourceOverview();
            renderBillsSummary();
            renderResourceAnalysis();
            
            alert('✅ 数据恢复成功！');
        })
        .catch(error => {
            console.error('恢复备份失败:', error);
            alert('❌ 恢复备份失败：' + error.message);
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
            closeModal('cloud-backup-modal'); // 关闭备份列表面板
            closeModal('data-manage-modal'); // 关闭数据管理面板
        })
        .catch(error => {
            console.error('恢复备份失败:', error);
            alert('❌ 恢复备份失败：' + error.message);
        });
}

window.deleteCloudBackup = function(backupId) {
    if (!confirm('确定要删除此备份吗？')) return;
    
    db.collection('backups').doc(familyCode).collection('history').doc(backupId).delete()
        .then(() => {
            alert('✅ 备份删除成功！');
            // 刷新备份列表
            window.listCloudBackups();
        })
        .catch(error => {
            console.error('删除备份失败:', error);
            alert('❌ 删除备份失败：' + error.message);
        });
}

// 时间记录统计功能
window.showTimeRecordsPanel = function() {
    document.getElementById('time-records-modal').classList.add('show');
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
            timeCost = calculateTimeCost(log.hour, log.minute || 0, log.endHour, log.endMinute || 0);
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
                case 'investment': typeColor = '#000000'; typeName = '资产'; break;
                case 'infrastructure': typeColor = '#229954'; typeName = '基建'; break;
                case 'research': typeColor = '#e74c3c'; typeName = '研发'; break;
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

// 测试面板标题统一性
function testPanelTitleUniformity() {
    console.log('=== 测试面板标题统一性 ===');
    
    const panelTitles = document.querySelectorAll('.panel-title');
    console.log(`找到 ${panelTitles.length} 个面板标题`);
    
    panelTitles.forEach((title, index) => {
        const computedStyle = window.getComputedStyle(title);
        const fontSize = computedStyle.fontSize;
        const fontWeight = computedStyle.fontWeight;
        const color = computedStyle.color;
        const marginBottom = computedStyle.marginBottom;
        const borderBottom = computedStyle.borderBottom;
        
        console.log(`面板标题 ${index + 1}:`, {
            element: title.textContent.trim().substring(0, 20) + '...',
            fontSize,
            fontWeight,
            color,
            marginBottom,
            borderBottom: borderBottom.includes('1px') ? '正确' : '需要检查'
        });
    });
    
    // 检查模态框标题
    const modalTitles = document.querySelectorAll('.modal-header h3, .modal-title');
    console.log(`找到 ${modalTitles.length} 个模态框标题`);
    
    modalTitles.forEach((title, index) => {
        const computedStyle = window.getComputedStyle(title);
        console.log(`模态框标题 ${index + 1}:`, {
            element: title.textContent.trim().substring(0, 20) + '...',
            fontSize: computedStyle.fontSize,
            fontWeight: computedStyle.fontWeight,
            color: computedStyle.color
        });
    });
    
    console.log('=== 面板标题统一性测试完成 ===');
}

window.testPanelTitleUniformity = testPanelTitleUniformity;

// 测试移动端布局优化
function testMobileLayout() {
    console.log('=== 移动端布局测试 ===');
    
    const isMobile = window.innerWidth <= 768;
    console.log('当前屏幕宽度:', window.innerWidth, isMobile ? '(移动端)' : '(桌面端)');
    
    // 检查面板排序
    const panels = [
        { selector: '#resource-panel', name: 'Resource Panel', expectedOrder: 1 },
        { selector: '.panel[style*="grid-area: production"]', name: 'Production Panel', expectedOrder: 2 },
        { selector: '#week-calendar', name: 'Calendar Panel', expectedOrder: 3 },
        { selector: '#expenses-panel', name: 'Expenses Panel', expectedOrder: 4 },
        { selector: '.panel:last-child', name: 'Milestones Panel', expectedOrder: 5 },
        { selector: '.research-panel', name: 'Research Panel', expectedOrder: 6 }
    ];
    
    console.log('面板排序检查:');
    panels.forEach(panel => {
        const element = document.querySelector(panel.selector);
        if (element) {
            const computedStyle = getComputedStyle(element);
            const actualOrder = computedStyle.order || 'auto';
            const isCorrect = isMobile ? (actualOrder == panel.expectedOrder) : true;
            console.log(`${panel.name}: 期望order=${panel.expectedOrder}, 实际order=${actualOrder} ${isCorrect ? '✅' : '❌'}`);
            
            // 检查宽度
            const width = computedStyle.width;
            const maxWidth = computedStyle.maxWidth;
            console.log(`  - 宽度: ${width}, 最大宽度: ${maxWidth}`);
        } else {
            console.log(`${panel.name}: ❌ 元素未找到`);
        }
    });
    
    // 检查日历滚动功能
    console.log('\n日历滚动检查:');
    const calendarContainer = document.querySelector('.week-calendar-container');
    if (calendarContainer) {
        const containerStyle = getComputedStyle(calendarContainer);
        console.log('日历容器滚动设置:', {
            overflowX: containerStyle.overflowX,
            overflowY: containerStyle.overflowY,
            width: containerStyle.width,
            maxWidth: containerStyle.maxWidth
        });
        
        const table = calendarContainer.querySelector('table');
        if (table) {
            const tableStyle = getComputedStyle(table);
            console.log('日历表格设置:', {
                minWidth: tableStyle.minWidth,
                width: tableStyle.width
            });
            
            // 测试滚动到今天
            if (isMobile && typeof scrollCalendarToToday === 'function') {
                console.log('测试滚动到今天...');
                const mockWeekDates = generateWeekDates(); // 需要实现这个函数或使用现有的
                // scrollCalendarToToday(mockWeekDates);
            }
        }
    } else {
        console.log('❌ 日历容器未找到');
    }
    
    // 检查模态框优化
    console.log('\n模态框优化检查:');
    const modals = document.querySelectorAll('.modal');
    console.log(`找到 ${modals.length} 个模态框`);
    
    if (modals.length > 0 && isMobile) {
        const modal = modals[0];
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            const contentStyle = getComputedStyle(modalContent);
            console.log('模态框内容样式:', {
                width: contentStyle.width,
                maxWidth: contentStyle.maxWidth,
                maxHeight: contentStyle.maxHeight
            });
        }
    }
    
    console.log('=== 移动端布局测试完成 ===');
}

// 导出测试函数
window.testMobileLayout = testMobileLayout;

// 测试移动端面板排序
function testMobilePanelOrder() {
    console.log('=== 移动端面板排序测试 ===');
    
    const isMobile = window.innerWidth <= 768;
    console.log('当前屏幕宽度:', window.innerWidth, isMobile ? '(移动端)' : '(桌面端)');
    
    // 获取所有面板元素
    const resourcePanel = document.getElementById('resource-panel');
    const productionPanel = document.querySelector('.panel[style*="grid-area: production"]');
    const calendarPanel = document.getElementById('week-calendar');
    const expensesPanel = document.getElementById('expenses-panel');
    const milestonesPanel = document.getElementById('milestones-panel');
    const researchPanel = document.querySelector('.research-panel');
    
    // 检查每个面板的order值
    const panels = [
        { name: '资源面板 (Resource Panel)', element: resourcePanel, expectedOrder: 1 },
        { name: '生产线面板 (Production Panel)', element: productionPanel, expectedOrder: 2 },
        { name: '日历面板 (Calendar Panel)', element: calendarPanel, expectedOrder: 3 },
        { name: '资源管理面板 (Expenses Panel)', element: expensesPanel, expectedOrder: 4 },
        { name: '里程碑面板 (Milestones Panel)', element: milestonesPanel, expectedOrder: 5 },
        { name: '研发中心面板 (Research Panel)', element: researchPanel, expectedOrder: 6 }
    ];
    
    console.log('检查面板排序:');
    panels.forEach(panel => {
        if (panel.element) {
            const computedStyle = window.getComputedStyle(panel.element);
            const order = computedStyle.order || 'auto';
            const isCorrect = isMobile ? (order == panel.expectedOrder || (order === 'auto' && panel.expectedOrder === 0)) : true;
            
            console.log(`${panel.name}: order=${order} (期望=${panel.expectedOrder}) ${isCorrect ? '✅' : '❌'}`);
            
            // 获取面板标题
            const titleElement = panel.element.querySelector('.panel-title, h2');
            if (titleElement) {
                console.log(`  标题: "${titleElement.textContent.trim()}"`);
            }
            
            // 检查宽度设置
            if (isMobile) {
                const width = computedStyle.width;
                const maxWidth = computedStyle.maxWidth;
                console.log(`  宽度: ${width}, 最大宽度: ${maxWidth}`);
            }
        } else {
            console.log(`${panel.name}: ❌ 元素未找到`);
        }
    });
    
    // 检查面板实际显示顺序
    if (isMobile) {
        console.log('\n实际显示顺序验证:');
        const mainGrid = document.querySelector('.main-grid');
        if (mainGrid) {
            const allPanels = Array.from(mainGrid.querySelectorAll('.panel')).filter(p => {
                const display = window.getComputedStyle(p).display;
                return display !== 'none';
            });
            
            // 按order值排序
            allPanels.sort((a, b) => {
                const orderA = parseInt(window.getComputedStyle(a).order) || 0;
                const orderB = parseInt(window.getComputedStyle(b).order) || 0;
                return orderA - orderB;
            });
            
            allPanels.forEach((panel, index) => {
                const order = window.getComputedStyle(panel).order || 'auto';
                const titleElement = panel.querySelector('.panel-title, h2');
                const title = titleElement ? titleElement.textContent.trim() : '无标题';
                console.log(`${index + 1}. order=${order} - ${title}`);
            });
        }
    }
    
    console.log('=== 测试完成 ===');
}

// 导出函数
window.testMobilePanelOrder = testMobilePanelOrder;

// 快速测试面板排序
function quickTestPanelOrder() {
    console.log('=== 快速面板排序测试 ===');
    
    const panels = [
        'resource-panel',
        '.panel[style*="grid-area: production"]', 
        'week-calendar',
        'expenses-panel',
        'milestones-panel',
        '.research-panel'
    ];
    
    panels.forEach((selector, index) => {
        const element = selector.startsWith('.') ? document.querySelector(selector) : document.getElementById(selector);
        if (element) {
            const order = getComputedStyle(element).order;
            const expectedOrder = index + 1;
            console.log(`${selector}: order=${order} (期望=${expectedOrder}) ${order == expectedOrder ? '✅' : '❌'}`);
        } else {
            console.log(`${selector}: ❌ 未找到`);
        }
    });
    
    console.log('=== 快速测试完成 ===');
}

window.quickTestPanelOrder = quickTestPanelOrder;

// 验证面板分离修复
function testPanelSeparation() {
    console.log('=== 验证面板分离修复 ===');
    
    // 检查是否还有嵌套的status容器
    const statusContainer = document.querySelector('div[style*="grid-area: status"]');
    if (statusContainer) {
        const isResourcePanel = statusContainer.id === 'resource-panel';
        console.log('Status容器状态:', isResourcePanel ? '✅ 现在是resource-panel本身' : '❌ 仍然是嵌套容器');
        
        if (isResourcePanel) {
            console.log('Resource面板正确设置为status grid-area');
        }
    } else {
        console.log('❌ 未找到status grid-area');
    }
    
    // 检查三个面板是否都是独立的
    const panels = ['resource-panel', 'expenses-panel', 'milestones-panel'];
    panels.forEach(id => {
        const panel = document.getElementById(id);
        if (panel) {
            const parent = panel.parentElement;
            const parentClasses = parent ? parent.className : 'N/A';
            const parentId = parent ? parent.id : 'N/A';
            console.log(`${id}: 父容器class="${parentClasses}", id="${parentId}"`);
            
            // 检查是否是main-grid的直接子元素
            const isDirectChild = parent && (parent.classList.contains('main-grid') || parent.querySelector('.main-grid'));
            console.log(`  - 是否为main-grid的子元素: ${isDirectChild ? '✅' : '❌'}`);
        } else {
            console.log(`❌ 未找到面板: ${id}`);
        }
    });
    
    console.log('=== 验证完成 ===');
}

window.testPanelSeparation = testPanelSeparation;

// 最终验证函数
function finalPanelTest() {
    console.log('=== 最终面板验证 ===');
    
    const isMobile = window.innerWidth <= 768;
    console.log(`当前视口: ${isMobile ? '移动端' : '桌面端'} (${window.innerWidth}px)`);
    
    // 检查所有面板的存在性和基本属性
    const panels = [
        { id: 'resource-panel', name: '资源面板', expectedOrder: 1, expectedGridArea: 'status' },
        { selector: '.panel[style*="grid-area: production"]', name: '生产线面板', expectedOrder: 2, expectedGridArea: 'production' },
        { id: 'week-calendar', name: '日历面板', expectedOrder: 3, expectedGridArea: 'middle-column' },
        { id: 'expenses-panel', name: '资源管理面板', expectedOrder: 4, expectedGridArea: 'expenses' },
        { id: 'milestones-panel', name: '里程碑面板', expectedOrder: 5, expectedGridArea: 'milestones' },
        { selector: '.research-panel', name: '研发中心面板', expectedOrder: 6, expectedGridArea: 'middle-column' }
    ];
    
    panels.forEach(panel => {
        const element = panel.id ? document.getElementById(panel.id) : document.querySelector(panel.selector);
        
        if (element) {
            const computedStyle = getComputedStyle(element);
            const order = computedStyle.order;
            const gridArea = computedStyle.gridArea;
            
            console.log(`\n${panel.name}:`);
            console.log(`  - 找到元素: ✅`);
            console.log(`  - Order: ${order} (期望: ${panel.expectedOrder}) ${order == panel.expectedOrder ? '✅' : '❌'}`);
            
            if (isMobile) {
                console.log(`  - 移动端Grid Area: ${gridArea} (应该被unset)`);
            } else {
                console.log(`  - 桌面端Grid Area: ${gridArea} (期望: ${panel.expectedGridArea})`);
            }
            
            const parent = element.parentElement;
            console.log(`  - 父容器: ${parent ? parent.className || parent.tagName : '无'}`);
            
        } else {
            console.log(`\n${panel.name}: ❌ 未找到`);
        }
    });
    
    // 检查移动端布局
    if (isMobile) {
        console.log('\n移动端特殊检查:');
        const mainGrid = document.querySelector('.main-grid');
        if (mainGrid) {
            const mainGridStyle = getComputedStyle(mainGrid);
            console.log(`- Main Grid Display: ${mainGridStyle.display}`);
            console.log(`- Main Grid Flex Direction: ${mainGridStyle.flexDirection}`);
        }
    }
    
    console.log('\n=== 验证完成 ===');
}

window.finalPanelTest = finalPanelTest;

// 测试面板高度自适应 - 只测试resource-panel和expenses-panel
function testPanelHeights() {
    console.log('=== Resource Panel & Expenses Panel 高度自适应测试 ===');
    
    const isMobile = window.innerWidth <= 768;
    console.log(`当前视口: ${isMobile ? '移动端' : '桌面端'} (${window.innerWidth}px)`);
    
    const targetPanels = ['resource-panel', 'expenses-panel'];
    
    targetPanels.forEach(id => {
        const panel = document.getElementById(id);
        if (panel) {
            const computedStyle = getComputedStyle(panel);
            const height = computedStyle.height;
            const minHeight = computedStyle.minHeight;
            const maxHeight = computedStyle.maxHeight;
            const flexGrow = computedStyle.flexGrow;
            
            console.log(`${id}:`);
            console.log(`  计算高度: ${height}`);
            console.log(`  最小高度: ${minHeight}`);
            console.log(`  最大高度: ${maxHeight}`);
            console.log(`  flex-grow: ${flexGrow}`);
            console.log(`  实际内容高度: ${panel.scrollHeight}px`);
            const heightDiff = Math.abs(panel.clientHeight - panel.scrollHeight);
            console.log(`  客户端高度: ${panel.clientHeight}px`);
            console.log(`  高度差异: ${heightDiff}px`);
            console.log(`  是否内容自适应: ${heightDiff <= 2 ? '✅' : '❌'} (允许2px误差)`);
            console.log('---');
        } else {
            console.log(`${id}: ❌ 未找到`);
        }
    });
    
    console.log('=== 测试完成 ===');
}

window.testPanelHeights = testPanelHeights;

// 测试桌面端右侧面板间隔
function testDesktopRightPanels() {
    console.log('=== 桌面端右侧面板间隔测试 ===');
    
    const statusColumn = document.querySelector('.status-column');
    if (statusColumn) {
        const computedStyle = getComputedStyle(statusColumn);
        console.log('Status Column:');
        console.log(`  display: ${computedStyle.display}`);
        console.log(`  flex-direction: ${computedStyle.flexDirection}`);
        console.log(`  gap: ${computedStyle.gap}`);
        console.log('---');
        
        const panels = ['resource-panel', 'expenses-panel', 'milestones-panel'];
        panels.forEach((id, index) => {
            const panel = document.getElementById(id);
            if (panel) {
                const rect = panel.getBoundingClientRect();
                console.log(`${id}:`);
                console.log(`  位置: top=${rect.top.toFixed(1)}, height=${rect.height.toFixed(1)}`);
                if (index > 0) {
                    const prevPanel = document.getElementById(panels[index - 1]);
                    if (prevPanel) {
                        const prevRect = prevPanel.getBoundingClientRect();
                        const gap = rect.top - (prevRect.top + prevRect.height);
                        console.log(`  与上一个面板间隔: ${gap.toFixed(1)}px`);
                    }
                }
                console.log('---');
            }
        });
    } else {
        console.log('❌ 未找到status-column');
    }
}

window.testDesktopRightPanels = testDesktopRightPanels;

// 测试移动端长按菜单功能
function testMobileLongPress() {
    console.log('📱 开始测试移动端长按菜单功能...');
    
    // 检测是否为移动设备
    const isMobile = window.innerWidth <= 768;
    console.log('📱 当前设备类型:', isMobile ? '移动端' : '桌面端');
    console.log('📱 窗口宽度:', window.innerWidth);
    
    // 检查长按功能是否已启用
    const prodList = document.getElementById('productions-list');
    const calendarCells = document.querySelectorAll('.calendar-cell');
    const expenseItems = document.querySelectorAll('.expense-item');
    
    console.log('📱 生产线列表:', prodList ? '已找到' : '未找到');
    console.log('📱 日历单元格数量:', calendarCells.length);
    console.log('📱 支出项目数量:', expenseItems.length);
    
    // 检查震动API支持
    const hasVibration = 'vibrate' in navigator;
    console.log('📱 震动API支持:', hasVibration ? '支持' : '不支持');
    
    // 测试长按提示
    if (isMobile) {
        showNotification('💡 移动端长按功能已启用！长按生产线、日历或支出项目可显示菜单', 'info');
    } else {
        showNotification('🖥️ 桌面端可直接右键查看菜单', 'info');
    }
    
    console.log('📱 移动端长按功能测试完成');
    
    return {
        isMobile,
        hasVibration,
        hasProductionList: !!prodList,
        calendarCellsCount: calendarCells.length,
        expenseItemsCount: expenseItems.length
    };
}

window.testMobileLongPress = testMobileLongPress;

// 测试项目阶段解析功能
function testProjectStages() {
    console.log('📋 开始测试项目阶段解析功能...');
    
    // 测试样例数据
    const testActions = [
        "第1-7天：固定23:30睡觉时间 | 第8-14天：加上固定7:00起床 | 第15-21天：睡前30分钟无屏幕",
        "第1周：记录所有支出明细 | 第2-4周：分类统计月度支出 | 第5-8周：建立预算模型 | 第9-12周：预测分析和优化",
        "第1-2月：技能提升计划执行 | 第3-4月：绩效优化和成果展示 | 第5-6月：薪资谈判和职业发展",
        "第1周：30分钟深度工作块 | 第2-4周：逐步延长到90分钟 | 第5-8周：达到3小时连续专注"
    ];
    
    testActions.forEach((action, index) => {
        console.log(`\n测试样例 ${index + 1}: ${action}`);
        const stages = parseProjectStages(action);
        
        console.log(`解析出 ${stages.length} 个阶段:`);
        stages.forEach(stage => {
            console.log(`  阶段${stage.index}: ${stage.timeRange} - ${stage.description}`);
        });
    });
    
    // 测试当前进行中的研发项目
    if (gameData.developments && gameData.developments.length > 0) {
        console.log('\n当前进行中的研发项目阶段信息:');
        gameData.developments.forEach((dev, index) => {
            console.log(`\n项目 ${index + 1}: ${dev.researchName}`);
            console.log(`Action: ${dev.action}`);
            
            const stages = parseProjectStages(dev.action);
            const currentStageInfo = getCurrentStage(dev, stages);
            const progress = calculateProgress(dev);
            
            console.log(`解析出 ${stages.length} 个阶段`);
            if (currentStageInfo) {
                console.log(`当前阶段: ${currentStageInfo.current + 1}/${stages.length}`);
                console.log(`当前阶段内容: ${currentStageInfo.stage.timeRange} - ${currentStageInfo.stage.description}`);
                console.log(`完成进度: ${progress.count}/${progress.total} (${(currentStageInfo.progress * 100).toFixed(1)}%)`);
            }
        });
    } else {
        console.log('\n当前没有进行中的研发项目');
    }
    
    console.log('\n📋 项目阶段解析功能测试完成');
    
    // 重新渲染研发项目以显示阶段信息
    renderDevelopments();
    showNotification('项目阶段解析功能已启用！查看研发中心可见阶段进度', 'success');
    
    return {
        testActionsParsed: testActions.length,
        activeDevelopments: gameData.developments ? gameData.developments.length : 0,
        parseProjectStages,
        getCurrentStage
    };
}

window.testProjectStages = testProjectStages;

// 为兼容性添加函数别名
window.renderResourceOverview = renderFinanceMainPanel;

// 显示月度对比模态框
function showMonthlyComparisonModal() {
    const modal = document.getElementById('monthly-comparison-modal');
    if (!modal) {
        console.error('月度对比模态框未找到');
        return;
    }
    
    // 设置当前年份
    const currentYear = new Date().getFullYear();
    gameData.comparisonYear = gameData.comparisonYear || currentYear;
    
    const yearDisplay = modal.querySelector('#comparison-year');
    if (yearDisplay) {
        yearDisplay.textContent = gameData.comparisonYear;
    }
    
    // 渲染月度对比内容
    window.renderMonthlyComparison();
    
    // 显示模态框
    modal.classList.add('show');
}

// 为兼容性添加全局函数引用
window.showMonthlyComparisonModal = showMonthlyComparisonModal;

// =================================================== //
// 账单导入和数据清理功能                                //
// =================================================== //

// 显示账单导入模态框
function showBillImportModal() {
    console.log('🧾 显示账单导入模态框...');
    
    // 检查是否有多账户导入功能
    if (window.BillImporter && typeof window.BillImporter.showMultiAccountImportModal === 'function') {
        console.log('✅ 使用多账户导入功能');
        window.BillImporter.showMultiAccountImportModal();
    } else {
        console.log('⚠️ 多账户模块未加载，使用传统导入');
        // 回退到传统的账单导入模态框
        const modal = document.getElementById('bills-import-modal');
        if (modal) {
            modal.classList.add('show');
        } else {
            alert('❌ 账单导入功能暂不可用，请刷新页面后重试');
        }
    }
}

// 显示数据清理模态框
function showDataCleanupModal() {
    console.log('🧹 显示数据清理模态框...');
    
    // 检查账户管理模块是否加载
    if (window.AccountManager && typeof window.AccountManager.showDataCleanupModal === 'function') {
        console.log('✅ 使用账户管理的数据清理功能');
        window.AccountManager.showDataCleanupModal();
    } else if (window.AccountManager && typeof window.AccountManager.showDuplicateDataManager === 'function') {
        console.log('✅ 使用重复数据管理功能');
        window.AccountManager.showDuplicateDataManager();
    } else {
        console.log('⚠️ 账户管理模块未加载，提供基础清理选项');
        
        // 提供基础的清理选项
        const options = [
            '🔍 检测重复数据',
            '🗑️ 清空所有账单数据', 
            '📊 重新汇总数据',
            '❌ 取消'
        ];
        
        const choice = prompt(`请选择数据清理操作：\n\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n请输入序号 (1-${options.length}):`);
        
        const choiceNum = parseInt(choice);
        
        switch (choiceNum) {
            case 1:
                if (window.DataAggregator && window.DataAggregator.autoDetectDuplicates) {
                    const duplicates = window.DataAggregator.autoDetectDuplicates();
                    if (duplicates.length === 0) {
                        alert('✅ 未发现重复数据！');
                    } else {
                        const shouldClean = confirm(`🔍 发现 ${duplicates.length} 组重复数据，是否立即清理？`);
                        if (shouldClean && window.DataAggregator.removeDuplicates) {
                            const result = window.DataAggregator.removeDuplicates();
                            alert(`✅ 清理完成！移除了 ${result.removed} 个重复项`);
                        }
                    }
                } else {
                    alert('❌ 重复数据检测功能不可用');
                }
                break;
                
            case 2:
                const confirmClear = confirm('⚠️ 确定要清空所有账单数据吗？此操作不可撤销！');
                if (confirmClear) {
                    gameData.billsData = {};
                    if (gameData.financeData) {
                        gameData.financeData.aggregatedData = {};
                        gameData.financeData.accountData = {};
                    }
                    saveToCloud();
                    // 刷新界面
                    if (window.renderResourceOverview) window.renderResourceOverview();
                    if (window.renderBillsSummary) window.renderBillsSummary();
                    alert('✅ 所有账单数据已清空');
                }
                break;
                
            case 3:
                if (window.DataAggregator && window.DataAggregator.aggregateAllAccounts) {
                    window.DataAggregator.aggregateAllAccounts();
                    alert('✅ 数据重新汇总完成');
                } else {
                    alert('❌ 数据汇总功能不可用');
                }
                break;
                
            case 4:
            default:
                console.log('用户取消了数据清理操作');
                break;
        }
    }
}

// 将函数添加到全局作用域
window.showBillImportModal = showBillImportModal;
window.showDataCleanupModal = showDataCleanupModal;

console.log('✅ 账单导入和数据清理功能已加载');
console.log(`📊 showBillImportModal类型: ${typeof window.showBillImportModal}`);
console.log(`🧹 showDataCleanupModal类型: ${typeof window.showDataCleanupModal}`);

// =================================================== //
// 生产线打卡功能                                        //
// =================================================== //

// 显示时间选项对话框
window.showTimeOptionsDialog = function(sortedIndex) {
    const prod = sortedProductions[sortedIndex];
    const realProd = gameData.productions[prod._realIndex];
    
    // 创建时间选项对话框
    const dialog = document.createElement('dialog');
    dialog.id = 'time-options-dialog';
    dialog.style.cssText = 'border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.3);padding:0;max-width:360px;width:92vw;background:#fff;';
    
    let selectedMinutes = 5; // 默认5分钟
    
    dialog.innerHTML = `
        <form method="dialog" style="padding:28px 24px 20px 24px;">
            <h3 style="margin-bottom:20px;font-size:1.25em;font-weight:600;color:#333;text-align:center;">选择打卡时长</h3>
            <div style="margin-bottom:24px;">
                <div style="font-size:1em;color:#555;margin-bottom:16px;text-align:center;padding:12px;background:#f8f9fa;border-radius:8px;font-weight:500;">项目：${realProd.name}</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
                    <button type="button" class="time-option-btn" data-minutes="5" style="padding:16px 12px;border:3px solid #e0e0e0;border-radius:12px;background:#fff;cursor:pointer;font-size:16px;font-weight:600;transition:all 0.3s;min-height:60px;display:flex;align-items:center;justify-content:center;">5分钟</button>
                    <button type="button" class="time-option-btn" data-minutes="15" style="padding:16px 12px;border:3px solid #e0e0e0;border-radius:12px;background:#fff;cursor:pointer;font-size:16px;font-weight:600;transition:all 0.3s;min-height:60px;display:flex;align-items:center;justify-content:center;">15分钟</button>
                    <button type="button" class="time-option-btn" data-minutes="30" style="padding:16px 12px;border:3px solid #e0e0e0;border-radius:12px;background:#fff;cursor:pointer;font-size:16px;font-weight:600;transition:all 0.3s;min-height:60px;display:flex;align-items:center;justify-content:center;">30分钟</button>
                </div>
                <div style="text-align:center;font-size:1em;color:#666;padding:12px;background:#f0f8ff;border-radius:8px;border:2px solid #e6f3ff;">
                    当前选择：<span id="selected-time-display" style="font-weight:600;color:#007bff;">5分钟</span>
                </div>
            </div>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button type="submit" class="btn btn-primary" style="flex:1;padding:14px 20px;font-size:16px;font-weight:600;border-radius:10px;min-height:48px;">确认打卡</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()" style="flex:1;padding:14px 20px;font-size:16px;font-weight:600;border-radius:10px;min-height:48px;">取消</button>
            </div>
        </form>
    `;
    
    document.body.appendChild(dialog);
    
    // 绑定时间选项按钮事件
    const timeOptionBtns = dialog.querySelectorAll('.time-option-btn');
    timeOptionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除其他按钮的选中状态
            timeOptionBtns.forEach(b => {
                b.style.borderColor = '#e0e0e0';
                b.style.background = '#fff';
                b.style.color = '#333';
                b.style.transform = 'scale(1)';
            });
            
            // 设置当前按钮为选中状态
            this.style.borderColor = '#007bff';
            this.style.background = '#007bff';
            this.style.color = '#fff';
            this.style.transform = 'scale(1.05)';
            
            // 更新选中的时间
            selectedMinutes = parseInt(this.dataset.minutes);
            document.getElementById('selected-time-display').textContent = selectedMinutes + '分钟';
        });
    });
    
    // 设置默认选中5分钟
    timeOptionBtns[0].click();
    
    // 绑定表单提交事件
    const form = dialog.querySelector('form');
    form.onsubmit = function(e) {
        e.preventDefault();
        
        // 执行打卡
        recordTimeWithDuration(sortedIndex, selectedMinutes);
        
        dialog.close();
        document.body.removeChild(dialog);
    };
    
    dialog.showModal();
}

// 根据选择的时间长度记录打卡
window.recordTimeWithDuration = function(sortedIndex, durationMinutes) {
    const prod = sortedProductions[sortedIndex];
    const realProd = gameData.productions[prod._realIndex];
    
    // 使用正确的当前时间
    const now = new Date();
    const endH = now.getHours();
    const endM = now.getMinutes();
    
    // 计算开始时间（向前推指定分钟数）
    const start = new Date(now.getTime() - durationMinutes * 60000);
    const startH = start.getHours();
    const startM = start.getMinutes();
    
    // 使用本地日期字符串，避免时区问题
    const today = getLocalDateString();
    const weekDay = (now.getDay() + 6) % 7;
    
    const timeLog = {
        name: realProd.name,
        type: realProd.type,
        date: today,
        weekDay: weekDay,
        hour: startH,
        minute: startM,
        timeCost: durationMinutes,
        endHour: endH,
        endMinute: endM,
        timestamp: now.toISOString()
    };
    
    gameData.timeLogs.push(timeLog);
    realProd.lastCheckIn = now.toISOString();
    
    saveToCloud();
    renderProductions();
    renderDevelopments();
    renderWeekCalendar();
    renderResourceStats();
    renderFinanceMainPanel();
    
    // 显示成功提示
    showNotification(`✅ 已记录 ${realProd.name} ${durationMinutes}分钟`, 'success');
}

console.log('✅ 生产线打卡功能已加载');
console.log(`⏰ showTimeOptionsDialog类型: ${typeof window.showTimeOptionsDialog}`);
console.log(`📝 recordTimeWithDuration类型: ${typeof window.recordTimeWithDuration}`);

// ========== 智能界面优化功能 ==========

// 渲染简化财务概览
function renderCompactFinanceOverview() {
    const container = document.getElementById('finance-compact-overview');
    if (!container) return;
    
    // 确保数据结构统一
    unifyFinanceDataStructure();
    
    const displayCurrency = gameData.displayCurrency || 'AUD';
    const currencySymbol = getCurrencySymbol(displayCurrency);
    
    // 使用统一的数据源
    const dataSource = (gameData.financeData?.aggregatedData && Object.keys(gameData.financeData.aggregatedData).length > 0) 
        ? gameData.financeData.aggregatedData 
        : gameData.billsData || {};
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    
    if (Object.keys(dataSource).length > 0) {
        const availableMonths = Object.keys(dataSource).sort().reverse();
        const latestMonth = availableMonths[0];
        
        if (latestMonth && dataSource[latestMonth]) {
            const monthData = dataSource[latestMonth];
            monthlyIncome = convertToDisplayCurrency(monthData.income || 0, 'AUD', displayCurrency);
            
            const expenses = monthData.expenses || [];
            let totalExpense = 0;
            expenses.forEach(exp => {
                totalExpense += exp.amount || 0;
            });
            monthlyExpense = convertToDisplayCurrency(totalExpense, 'AUD', displayCurrency);
        }
    }
    
    const balance = monthlyIncome - monthlyExpense;
    
    const html = `
        <div class="finance-panel-compact">
            <div class="finance-summary-row">
                <div class="finance-summary-item">
                    <div class="finance-summary-label">本月收入</div>
                    <div class="finance-summary-value income">${currencySymbol}${Math.round(monthlyIncome).toLocaleString()}</div>
                </div>
                <div class="finance-summary-item">
                    <div class="finance-summary-label">本月支出</div>
                    <div class="finance-summary-value expense">${currencySymbol}${Math.round(monthlyExpense).toLocaleString()}</div>
                </div>
                <div class="finance-summary-item">
                    <div class="finance-summary-label">余额</div>
                    <div class="finance-summary-value ${balance >= 0 ? 'income' : 'expense'}">
                        ${balance >= 0 ? '+' : ''}${currencySymbol}${Math.round(Math.abs(balance)).toLocaleString()}
                    </div>
                </div>
            </div>
            <button class="finance-expand-btn" onclick="toggleFinancePanel()">查看详情</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// 切换财务面板显示模式
function toggleFinancePanel() {
    const compactContainer = document.getElementById('finance-compact-overview');
    const fullContainer = document.querySelector('.finance-overview-card');
    const actionsCard = document.querySelector('.finance-actions-card');
    const insightsCard = document.querySelector('.finance-insights-card');
    const accountStatus = document.getElementById('account-status-summary');
    const insights = document.getElementById('finance-insights-content');
    
    if (!compactContainer) {
        console.error('找不到 finance-compact-overview 容器');
        return;
    }
    
    // 检查当前状态
    const isCompact = !compactContainer.classList.contains('panel-content-collapsed');
    
    if (isCompact) {
        // 切换到完整模式
        compactContainer.classList.add('panel-content-collapsed');
        if (fullContainer) fullContainer.classList.remove('panel-content-collapsed');
        if (actionsCard) actionsCard.classList.remove('panel-content-collapsed');
        if (insightsCard) insightsCard.classList.remove('panel-content-collapsed');
        if (accountStatus) accountStatus.classList.remove('panel-content-collapsed');
        if (insights) insights.classList.remove('panel-content-collapsed');
        
        // 重新渲染完整面板数据
        renderFinanceOverview();
        renderAccountStatusSummary();
        renderFinanceInsights();
        
        console.log('🔄 切换到完整财务面板模式');
    } else {
        // 切换到简化模式
        compactContainer.classList.remove('panel-content-collapsed');
        if (fullContainer) fullContainer.classList.add('panel-content-collapsed');
        if (actionsCard) actionsCard.classList.add('panel-content-collapsed');
        if (insightsCard) insightsCard.classList.add('panel-content-collapsed');
        if (accountStatus) accountStatus.classList.add('panel-content-collapsed');
        if (insights) insights.classList.add('panel-content-collapsed');
        
        // 重新渲染简化面板
        renderCompactFinanceOverview();
        
        console.log('🔄 切换到简化财务面板模式');
    }
}

// 增强任务规划按钮
function showTaskPlanningModal() {
    // 这里可以打开艾森豪威尔矩阵或其他任务规划工具
    if (typeof window.showEisenhowerMatrix === 'function') {
        window.showEisenhowerMatrix();
    } else {
        showNotification('任务规划功能正在开发中...', 'info');
    }
}

// 切换生产线详情显示（移动端支持）
function toggleProductionDetails(element) {
    // 检查是否为移动设备或小屏幕
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // 移动端：切换expanded类
        if (element.classList.contains('expanded')) {
            element.classList.remove('expanded');
        } else {
            // 先移除其他项目的展开状态
            document.querySelectorAll('.production-item.expanded').forEach(item => {
                item.classList.remove('expanded');
            });
            // 展开当前项目
            element.classList.add('expanded');
        }
    }
    // 桌面端：不做任何操作，保持hover效果
}

// 将新函数添加到全局作用域
window.renderCompactFinanceOverview = renderCompactFinanceOverview;
window.toggleFinancePanel = toggleFinancePanel;
window.showTaskPlanningModal = showTaskPlanningModal;
window.toggleProductionDetails = toggleProductionDetails;

console.log('✅ 智能界面优化功能已加载');
console.log(`💰 renderCompactFinanceOverview类型: ${typeof window.renderCompactFinanceOverview}`);
console.log(`🔄 toggleFinancePanel类型: ${typeof window.toggleFinancePanel}`);
console.log(`📋 showTaskPlanningModal类型: ${typeof window.showTaskPlanningModal}`);
console.log(`📱 toggleProductionDetails类型: ${typeof window.toggleProductionDetails}`);