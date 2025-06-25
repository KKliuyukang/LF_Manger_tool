/**
 * 财务模块主控制器
 * 负责财务模块的初始化和对外API接口
 */

// 财务模块命名空间
window.FinanceModule = {
    // 模块状态
    initialized: false,
    
    // 初始化财务模块
    init: function() {
        if (this.initialized) return;
        
        console.log('财务模块初始化中...');
        
        // 初始化数据结构
        this.initDataStructure();
        
        // 初始化事件监听
        this.initEventListeners();
        
        this.initialized = true;
        console.log('财务模块初始化完成');
    },
    
    // 初始化数据结构
    initDataStructure: function() {
        // 确保financeData结构存在
        if (!gameData.financeData) {
            gameData.financeData = {
                accounts: {},
                accountData: {},
                aggregatedData: gameData.billsData || {}, // 保持兼容性
                settings: {
                    primaryCurrency: gameData.displayCurrency || 'AUD',
                    exchangeRates: { 'AUD': 1, 'CNY': 0.21, 'USD': 0.67 },
                    lastAggregation: new Date().toISOString()
                }
            };
        }
        
        // 保持现有billsData的引用，确保兼容性
        if (gameData.billsData && !gameData.financeData.aggregatedData) {
            gameData.financeData.aggregatedData = gameData.billsData;
        }
    },
    
    // 初始化事件监听
    initEventListeners: function() {
        // 监听数据更新事件
        document.addEventListener('financeDataUpdated', (event) => {
            console.log('财务数据已更新:', event.detail);
            this.onDataUpdated(event.detail);
        });
    },
    
    // 数据更新回调
    onDataUpdated: function(data) {
        // 触发相关面板更新
        if (window.renderResourceOverview) {
            window.renderResourceOverview();
        }
        if (window.renderBillsSummary) {
            window.renderBillsSummary();
        }
        if (window.renderResourceStats) {
            window.renderResourceStats();
        }
    },
    
    // 对外API接口
    api: {
        // 获取汇总数据
        getAggregatedData: function(dateRange) {
            return gameData.financeData?.aggregatedData || {};
        },
        
        // 获取账户列表
        getAccounts: function() {
            return gameData.financeData?.accounts || {};
        },
        
        // 导入账单数据（保持现有接口兼容）
        importBillsData: function(data) {
            if (!gameData.financeData) {
                window.FinanceModule.initDataStructure();
            }
            
            // 更新汇总数据
            Object.assign(gameData.financeData.aggregatedData, data);
            
            // 保持现有billsData的同步
            gameData.billsData = gameData.financeData.aggregatedData;
            
            // 触发更新事件
            document.dispatchEvent(new CustomEvent('financeDataUpdated', {
                detail: { type: 'bills_import', data: data }
            }));
            
            return true;
        },
        
        // 创建账户
        createAccount: function(config) {
            const accountId = 'account_' + Date.now();
            gameData.financeData.accounts[accountId] = {
                id: accountId,
                name: config.name,
                type: config.type || 'other',
                currency: config.currency || 'CNY',
                icon: config.icon || '💳',
                enabled: true,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            
            // 初始化账户数据
            gameData.financeData.accountData[accountId] = {};
            
            return accountId;
        }
    }
};

// 模块自动初始化
document.addEventListener('DOMContentLoaded', function() {
    if (window.FinanceModule && !window.FinanceModule.initialized) {
        window.FinanceModule.init();
    }
});

// 兼容性：保持现有全局函数的引用
window.FinanceAPI = window.FinanceModule.api; 