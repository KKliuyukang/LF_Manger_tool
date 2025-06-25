/**
 * 账户管理模块
 * 负责财务账户的增删改查和配置管理
 */

window.AccountManager = {
    
    // 预设账户类型
    accountTypes: {
        'bank_debit': { name: '银行储蓄卡', icon: '💳', color: '#3498db' },
        'bank_credit': { name: '信用卡', icon: '💰', color: '#e74c3c' },
        'alipay': { name: '支付宝', icon: '📱', color: '#1677ff' },
        'wechat': { name: '微信支付', icon: '💬', color: '#07c160' },
        'investment': { name: '投资账户', icon: '📈', color: '#f39c12' },
        'cash': { name: '现金', icon: '💵', color: '#95a5a6' },
        'other': { name: '其他', icon: '🏦', color: '#9b59b6' }
    },
    
    // 创建账户
    createAccount: function(config) {
        if (!config.name) {
            throw new Error('账户名称不能为空');
        }
        
        const accountId = 'account_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const accountType = this.accountTypes[config.type] || this.accountTypes['other'];
        
        const account = {
            id: accountId,
            name: config.name,
            type: config.type || 'other',
            currency: config.currency || 'CNY',
            icon: config.icon || accountType.icon,
            color: config.color || accountType.color,
            enabled: config.enabled !== false,
            description: config.description || '',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // 存储账户信息
        if (!gameData.financeData) {
            window.FinanceModule.initDataStructure();
        }
        
        gameData.financeData.accounts[accountId] = account;
        gameData.financeData.accountData[accountId] = {};
        
        // 保存数据
        if (window.saveToCloud) {
            window.saveToCloud();
        }
        
        console.log('账户创建成功:', account);
        return accountId;
    },
    
    // 更新账户
    updateAccount: function(accountId, updates) {
        if (!gameData.financeData?.accounts[accountId]) {
            throw new Error('账户不存在');
        }
        
        const account = gameData.financeData.accounts[accountId];
        
        // 更新字段
        Object.keys(updates).forEach(key => {
            if (key !== 'id' && key !== 'createdAt') {
                account[key] = updates[key];
            }
        });
        
        account.lastUpdated = new Date().toISOString();
        
        // 保存数据
        if (window.saveToCloud) {
            window.saveToCloud();
        }
        
        console.log('账户更新成功:', account);
        return account;
    },
    
    // 删除账户
    deleteAccount: function(accountId) {
        if (!gameData.financeData?.accounts[accountId]) {
            throw new Error('账户不存在');
        }
        
        // 检查是否有数据
        const hasData = gameData.financeData.accountData[accountId] && 
                       Object.keys(gameData.financeData.accountData[accountId]).length > 0;
        
        if (hasData) {
            const confirmed = confirm('该账户包含历史数据，删除后将无法恢复。确定要删除吗？');
            if (!confirmed) {
                return false;
            }
        }
        
        // 删除账户和数据
        delete gameData.financeData.accounts[accountId];
        delete gameData.financeData.accountData[accountId];
        
        // 保存数据
        if (window.saveToCloud) {
            window.saveToCloud();
        }
        
        console.log('账户删除成功:', accountId);
        return true;
    },
    
    // 获取账户列表
    getAccountList: function() {
        if (!gameData.financeData?.accounts) {
            return [];
        }
        
        return Object.values(gameData.financeData.accounts)
            .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    },
    
    // 获取启用的账户列表
    getEnabledAccounts: function() {
        return this.getAccountList().filter(account => account.enabled);
    },
    
    // 根据ID获取账户
    getAccountById: function(accountId) {
        return gameData.financeData?.accounts[accountId] || null;
    },
    
    // 根据类型获取账户
    getAccountsByType: function(type) {
        return this.getAccountList().filter(account => account.type === type);
    },
    
    // 切换账户启用状态
    toggleAccountStatus: function(accountId) {
        const account = this.getAccountById(accountId);
        if (!account) {
            throw new Error('账户不存在');
        }
        
        account.enabled = !account.enabled;
        account.lastUpdated = new Date().toISOString();
        
        // 保存数据
        if (window.saveToCloud) {
            window.saveToCloud();
        }
        
        return account.enabled;
    },
    
    // 获取账户统计信息
    getAccountStats: function(accountId) {
        const accountData = gameData.financeData?.accountData[accountId];
        if (!accountData) {
            return { months: 0, totalIncome: 0, totalExpense: 0 };
        }
        
        let months = 0;
        let totalIncome = 0;
        let totalExpense = 0;
        
        Object.values(accountData).forEach(monthData => {
            if (monthData) {
                months++;
                totalIncome += monthData.income || 0;
                if (monthData.expenses) {
                    totalExpense += monthData.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                }
            }
        });
        
        return { months, totalIncome, totalExpense };
    },
    
    // 渲染账户管理界面
    renderAccountManagement: function() {
        const accounts = this.getAccountList();
        
        let html = `
            <div class="account-management">
                <div class="account-management-header">
                    <h4>我的财务账户</h4>
                    <button class="btn btn-primary btn-sm" onclick="AccountManager.showCreateAccountModal()">
                        ➕ 添加账户
                    </button>
                </div>
                
                <div class="account-list">
        `;
        
        if (accounts.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">🏦</div>
                    <div class="empty-text">还没有添加任何账户</div>
                    <div class="empty-hint">点击"添加账户"开始管理您的财务账户</div>
                </div>
            `;
        } else {
            accounts.forEach(account => {
                const stats = this.getAccountStats(account.id);
                const statusClass = account.enabled ? 'enabled' : 'disabled';
                const statusText = account.enabled ? '启用' : '禁用';
                
                html += `
                    <div class="account-item ${statusClass}">
                        <div class="account-icon" style="color: ${account.color}">
                            ${account.icon}
                        </div>
                        <div class="account-info">
                            <div class="account-name">${account.name}</div>
                            <div class="account-meta">
                                ${this.accountTypes[account.type]?.name || '其他'} • ${account.currency}
                                ${stats.months > 0 ? ` • ${stats.months}个月数据` : ' • 暂无数据'}
                            </div>
                        </div>
                        <div class="account-status ${statusClass}">
                            ${statusText}
                        </div>
                        <div class="account-actions">
                            <button class="btn btn-sm" onclick="AccountManager.showEditAccountModal('${account.id}')">
                                ✏️
                            </button>
                            <button class="btn btn-sm" onclick="AccountManager.toggleAccountStatus('${account.id}'); AccountManager.renderAccountManagement();">
                                ${account.enabled ? '🔇' : '🔊'}
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    },
    
    // 显示创建账户模态框
    showCreateAccountModal: function() {
        // 这里暂时用简单的prompt，后续可以改为完整的模态框
        const name = prompt('请输入账户名称:');
        if (!name) return;
        
        const type = prompt('请选择账户类型 (bank_debit/alipay/wechat/other):', 'other');
        const currency = prompt('请选择货币 (CNY/AUD/USD):', 'CNY');
        
        try {
            const accountId = this.createAccount({
                name: name,
                type: type || 'other',
                currency: currency || 'CNY'
            });
            
            alert('账户创建成功！');
            
            // 重新渲染界面
            if (window.switchResourceTab) {
                window.switchResourceTab('accounts');
            }
        } catch (error) {
            alert('创建失败: ' + error.message);
        }
    },
    
    // 显示编辑账户模态框
    showEditAccountModal: function(accountId) {
        const account = this.getAccountById(accountId);
        if (!account) {
            alert('账户不存在');
            return;
        }
        
        const newName = prompt('请输入新的账户名称:', account.name);
        if (newName && newName !== account.name) {
            try {
                this.updateAccount(accountId, { name: newName });
                alert('账户更新成功！');
                
                // 重新渲染界面
                if (window.switchResourceTab) {
                    window.switchResourceTab('accounts');
                }
            } catch (error) {
                alert('更新失败: ' + error.message);
            }
        }
    }
}; 