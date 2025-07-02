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
                    primaryCurrency: 'AUD', // 主货币始终为AUD，与显示货币分离
                    exchangeRates: { 'AUD': 1, 'CNY': 4.65, 'USD': 0.65, 'EUR': 0.60 },
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
        console.log('处理财务数据更新:', data.type);
        
        // 如果是账户数据导入，触发自动汇总
        if (data.type === 'account_import' && window.DataAggregator) {
            try {
                window.DataAggregator.aggregateAllAccounts();
            } catch (error) {
                console.error('自动汇总失败:', error);
            }
        }
        
        // 触发相关面板更新
        setTimeout(() => {
            if (window.renderResourceOverview) {
                window.renderResourceOverview();
            }
            if (window.renderBillsSummary) {
                window.renderBillsSummary();
            }
            if (window.renderResourceStats) {
                window.renderResourceStats();
            }
            if (window.renderAccountsManagement) {
                window.renderAccountsManagement();
            }
        }, 100);
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
                currency: config.currency || 'AUD',
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
    // 延迟初始化，确保所有依赖模块都已加载
    setTimeout(() => {
        if (window.FinanceModule && !window.FinanceModule.initialized) {
            window.FinanceModule.init();
            console.log('✅ 财务模块系统初始化完成');
            
            // 检查依赖模块
            const modules = {
                'AccountManager': window.AccountManager,
                'BillImporter': window.BillImporter,
                'DataAggregator': window.DataAggregator
            };
            
            Object.entries(modules).forEach(([name, module]) => {
                if (module) {
                    console.log(`✅ ${name} 模块已加载`);
                    if (name === 'BillImporter' && module.showMultiAccountImportModal) {
                        console.log(`✅ ${name}.showMultiAccountImportModal 方法可用`);
                    }
                } else {
                    console.error(`❌ ${name} 模块未找到`);
                }
            });
        }
    }, 100);
});

// 兼容性：保持现有全局函数的引用
window.FinanceAPI = window.FinanceModule.api;

// 全局财务系统状态检查函数
window.checkFinanceModules = function() {
    const status = {
        FinanceModule: !!window.FinanceModule?.initialized,
        AccountManager: !!window.AccountManager,
        BillImporter: !!window.BillImporter,
        DataAggregator: !!window.DataAggregator
    };
    
    console.log('🔍 财务模块状态检查:', status);
    return status;
};

// 调试函数：强制重新汇总财务数据
window.debugReaggregateFinanceData = function() {
    console.log('🔄 开始强制重新汇总财务数据...');
    
    if (!window.DataAggregator) {
        console.error('❌ DataAggregator 模块未找到');
        return;
    }
    
    try {
        // 强制重新汇总
        const result = window.DataAggregator.forceReaggregation();
        
        console.log('✅ 重新汇总完成');
        
        // 刷新相关显示
        if (window.renderBillsSummary) {
            window.renderBillsSummary();
        }
        if (window.renderResourceOverview) {
            window.renderResourceOverview();
        }
        
        // 显示结果
        const stats = window.DataAggregator.getAggregationStats();
        console.log('📊 汇总统计:', stats);
        
        alert(`✅ 重新汇总完成！\n处理了 ${stats.totalMonths} 个月的数据\n启用账户: ${stats.enabledAccounts}/${stats.totalAccounts}`);
        
    } catch (error) {
        console.error('❌ 重新汇总失败:', error);
        alert('重新汇总失败: ' + error.message);
    }
}; 