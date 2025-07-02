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
            // currency: config.currency || 'AUD', // 移除账户级别的货币设置，完全依赖账单数据
            icon: config.icon || accountType.icon,
            color: config.color || accountType.color,
            enabled: config.enabled !== false,
            description: config.description || '',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            note: '账户货币由导入的账单数据决定，支持多货币混合'
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
                
                // 计算收入：优先使用 incomeDetails，回退到 income 字段
                if (Array.isArray(monthData.incomeDetails) && monthData.incomeDetails.length > 0) {
                    monthData.incomeDetails.forEach(item => {
                        totalIncome += item.amount || 0;
                    });
                } else if (monthData.income) {
                    totalIncome += monthData.income || 0;
                }
                
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
                    <div class="account-management-actions">
                        <button class="btn btn-primary btn-sm" onclick="AccountManager.showCreateAccountModal()">
                            ➕ 添加账户
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="AccountManager.showAggregationStatus()">
                            📊 汇总状态
                        </button>
                    </div>
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
                                ${this.accountTypes[account.type]?.name || '其他'} • 多货币支持
                                ${stats.months > 0 ? ` • ${stats.months}个月数据` : ' • 暂无数据'}
                            </div>
                        </div>
                        <div class="account-status ${statusClass}">
                            ${statusText}
                        </div>
                        <div class="account-actions">
                            <button class="btn btn-sm" onclick="AccountManager.showEditAccountModal('${account.id}')" title="编辑账户">
                                ✏️
                            </button>
                            <button class="btn btn-sm" onclick="AccountManager.toggleAccountStatus('${account.id}'); if(window.renderAccountsManagement) window.renderAccountsManagement();" title="${account.enabled ? '点击禁用账户' : '点击启用账户'}">
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
        // 填充账户类型选项
        const typeSelect = document.getElementById('account-create-type');
        typeSelect.innerHTML = '';
        
        Object.entries(this.accountTypes).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${value.icon} ${value.name}`;
            if (key === 'bank_debit') {
                option.selected = true; // 默认选择银行储蓄卡
            }
            typeSelect.appendChild(option);
        });
        
        // 重置表单
        document.getElementById('account-create-name').value = '';
        // document.getElementById('account-create-currency').value = 'AUD'; // 移除货币选择
        
        // 显示模态框
        document.getElementById('account-create-modal').classList.add('show');
        
        // 设置表单提交处理
        const form = document.getElementById('account-create-form');
        form.onsubmit = (e) => this.handleCreateFormSubmit(e);
        
        // 聚焦到名称输入框
        setTimeout(() => {
            document.getElementById('account-create-name').focus();
        }, 100);
    },
    
    // 处理创建表单提交
    handleCreateFormSubmit: function(event) {
        event.preventDefault();
        
        const name = document.getElementById('account-create-name').value.trim();
        const type = document.getElementById('account-create-type').value;
        // const currency = document.getElementById('account-create-currency').value; // 移除货币选择
        
        if (!name) {
            alert('❌ 账户名称不能为空');
            return;
        }
        
        try {
            const accountId = this.createAccount({
                name: name,
                type: type
                // currency: currency // 移除货币设置
            });
            
            // 关闭模态框
            window.closeModal('account-create-modal');
            
            // 重新渲染界面
            if (window.renderAccountsManagement) {
                window.renderAccountsManagement();
            }
            
            alert('✅ 账户创建成功！');
            
            return accountId;
        } catch (error) {
            alert('❌ 创建失败: ' + error.message);
        }
    },
    
    // 当前正在编辑的账户ID
    currentEditingAccountId: null,
    
    // 显示编辑账户模态框
    showEditAccountModal: function(accountId) {
        const account = this.getAccountById(accountId);
        if (!account) {
            alert('❌ 账户不存在');
            return;
        }
        
        // 记录当前编辑的账户ID
        this.currentEditingAccountId = accountId;
        
        // 填充表单数据
        document.getElementById('account-edit-name').value = account.name;
        // document.getElementById('account-edit-currency').value = account.currency; // 移除货币编辑
        
        // 填充账户类型选项
        const typeSelect = document.getElementById('account-edit-type');
        typeSelect.innerHTML = '';
        
        Object.entries(this.accountTypes).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${value.icon} ${value.name}`;
            if (key === account.type) {
                option.selected = true;
            }
            typeSelect.appendChild(option);
        });
        
        // 显示模态框
        document.getElementById('account-edit-modal').classList.add('show');
        
        // 设置表单提交处理
        const form = document.getElementById('account-edit-form');
        form.onsubmit = (e) => this.handleEditFormSubmit(e);
    },
    
    // 处理编辑表单提交
    handleEditFormSubmit: function(event) {
        event.preventDefault();
        
        if (!this.currentEditingAccountId) {
            alert('❌ 未找到要编辑的账户');
            return;
        }
        
        const name = document.getElementById('account-edit-name').value.trim();
        const type = document.getElementById('account-edit-type').value;
        // const currency = document.getElementById('account-edit-currency').value; // 移除货币编辑
        
        if (!name) {
            alert('❌ 账户名称不能为空');
            return;
        }
        
        try {
            this.updateAccount(this.currentEditingAccountId, {
                name: name,
                type: type
                // currency: currency // 移除货币更新
            });
            
            // 关闭模态框
            window.closeModal('account-edit-modal');
            
            // 重新渲染界面
            if (window.renderAccountsManagement) {
                window.renderAccountsManagement();
            }
            
            // 显示成功消息
            alert('✅ 账户更新成功！');
            
        } catch (error) {
            alert('❌ 更新失败: ' + error.message);
        }
    },
    
    // 从模态框删除账户
    deleteAccountFromModal: function() {
        if (!this.currentEditingAccountId) {
            alert('❌ 未找到要删除的账户');
            return;
        }
        
        const account = this.getAccountById(this.currentEditingAccountId);
        if (!account) {
            alert('❌ 账户不存在');
            return;
        }
        
        const confirmDelete = confirm(`确定要删除账户"${account.name}"吗？\n\n此操作无法撤销！`);
        if (confirmDelete) {
            try {
                const deleted = this.deleteAccount(this.currentEditingAccountId);
                if (deleted) {
                    // 关闭模态框
                    window.closeModal('account-edit-modal');
                    
                    // 重新渲染界面
                    if (window.renderAccountsManagement) {
                        window.renderAccountsManagement();
                    }
                    
                    alert('✅ 账户删除成功！');
                }
            } catch (error) {
                alert('❌ 删除失败: ' + error.message);
            }
        }
    },
    
    // 显示汇总状态
    showAggregationStatus: function() {
        if (!window.DataAggregator) {
            alert('数据汇总模块未加载');
            return;
        }
        
        const stats = window.DataAggregator.getAggregationStats();
        const conflicts = window.DataAggregator.detectDataConflicts();
        
        let statusMessage = `📊 数据汇总状态报告\n\n`;
        statusMessage += `• 账户总数: ${stats.totalAccounts}\n`;
        statusMessage += `• 启用账户: ${stats.enabledAccounts}\n`;
        statusMessage += `• 汇总月份: ${stats.totalMonths}\n`;
        statusMessage += `• 最后汇总: ${stats.lastAggregation ? new Date(stats.lastAggregation).toLocaleString() : '未汇总'}\n`;
        
        if (conflicts.length > 0) {
            statusMessage += `\n⚠️ 发现 ${conflicts.length} 个潜在冲突\n`;
            conflicts.forEach((conflict, index) => {
                statusMessage += `${index + 1}. ${conflict.month}: ${conflict.items.length} 个重复项\n`;
            });
        } else {
            statusMessage += `\n✅ 无数据冲突`;
        }
        
        statusMessage += `\n\n是否重新汇总数据？`;
        
        if (confirm(statusMessage)) {
            try {
                window.DataAggregator.forceReaggregation();
                alert('✅ 数据重新汇总完成！');
                
                // 刷新相关显示
                if (window.renderResourceOverview) window.renderResourceOverview();
                if (window.renderBillsSummary) window.renderBillsSummary();
                if (window.renderAccountsManagement) window.renderAccountsManagement();
                
            } catch (error) {
                alert('❌ 汇总失败: ' + error.message);
            }
        }
    },

    // 清理指定账户的所有数据
    clearAccountData: function(accountId) {
        if (!accountId) {
            throw new Error('账户ID不能为空');
        }

        const account = this.getAccountById(accountId);
        if (!account) {
            throw new Error('账户不存在');
        }

        const confirmMessage = `⚠️ 确定要清除账户"${account.name}"的所有数据吗？\n\n此操作将删除该账户的所有历史财务数据，但保留账户本身。\n\n⚠️ 此操作无法撤销！`;
        
        if (!confirm(confirmMessage)) {
            return false;
        }

        try {
            // 清空账户数据
            if (gameData.financeData && gameData.financeData.accountData) {
                gameData.financeData.accountData[accountId] = {};
            }

            // 更新账户时间戳
            account.lastUpdated = new Date().toISOString();

            // 重新汇总数据
            if (window.DataAggregator) {
                window.DataAggregator.aggregateAllAccounts();
            }

            // 保存到云端
            if (window.saveToCloud) {
                window.saveToCloud();
            }

            console.log(`账户 ${account.name} 的数据已清除`);
            return true;

        } catch (error) {
            console.error('清除账户数据失败:', error);
            throw error;
        }
    },

    // 清理所有财务数据（包括旧数据和新数据）
    clearAllFinanceData: function() {
        const confirmMessage = `🚨 危险操作确认\n\n您即将清除所有财务数据，包括：\n• 所有账户的历史数据\n• 旧版本的账单数据\n• 汇总数据和统计信息\n• 生产线收入数据\n• 支出记录\n• 分析预测数据\n\n账户本身会保留，但所有交易记录将被清空。\n\n⚠️ 此操作无法撤销！\n\n请输入"确认清除"来继续：`;
        
        const userInput = prompt(confirmMessage);
        if (userInput !== '确认清除') {
            alert('操作已取消');
            return false;
        }

        try {
            // 清空所有账户数据
            if (gameData.financeData && gameData.financeData.accountData) {
                Object.keys(gameData.financeData.accountData).forEach(accountId => {
                    gameData.financeData.accountData[accountId] = {};
                });
            }

            // 清空汇总数据
            if (gameData.financeData) {
                gameData.financeData.aggregatedData = {};
            }

            // 清空旧版本数据（向后兼容）
            if (gameData.billsData) {
                gameData.billsData = {};
            }

            // 清空生产线的收入数据（保留生产线本身）
            if (gameData.productions) {
                gameData.productions.forEach(prod => {
                    prod.hasActiveIncome = false;
                    prod.activeIncome = 0;
                    prod.activeCurrency = 'AUD';
                    prod.hasPassiveIncome = false;
                    prod.passiveIncome = 0;
                    prod.passiveCurrency = 'AUD';
                });
            }

            // 清空支出记录
            if (gameData.expenses) {
                gameData.expenses = [];
            }

            // 清空资源分析数据
            if (gameData.resourceAnalysis) {
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

            // 清空累计存款（除非用户不想清空）
            const clearSavings = confirm('是否同时清空累计存款数据？\n（点击"确定"清空，点击"取消"保留）');
            if (clearSavings && gameData.finance) {
                gameData.finance.totalSavings = 0;
                gameData.finance.savingsUpdateTime = null;
            }

            // 更新所有账户的时间戳
            if (gameData.financeData && gameData.financeData.accounts) {
                Object.values(gameData.financeData.accounts).forEach(account => {
                    account.lastUpdated = new Date().toISOString();
                });
            }

            // 更新设置
            if (gameData.financeData && gameData.financeData.settings) {
                gameData.financeData.settings.lastAggregation = new Date().toISOString();
            }

            // 保存到云端
            if (window.saveToCloud) {
                window.saveToCloud();
            }

            console.log('所有财务数据已清除');
            return true;

        } catch (error) {
            console.error('清除所有数据失败:', error);
            throw error;
        }
    },

    // 显示数据清理选项模态框
    showDataCleanupModal: function() {
        const accounts = this.getAccountList();
        
        let modalHtml = `
            <div class="modal-content">
                <h3 class="modal-title">🧹 数据清理工具</h3>
                <div class="modal-body">
                    <div class="cleanup-warning">
                        <div class="warning-icon">⚠️</div>
                        <div class="warning-text">
                            <strong>注意：</strong>数据清理操作无法撤销，请谨慎操作！<br>
                            建议在清理前先备份重要数据。
                        </div>
                    </div>

                    <div class="cleanup-section">
                        <h4>🏦 清理指定账户数据</h4>
                        <p>选择要清理数据的账户（保留账户本身，仅清空财务数据）：</p>
                        <div class="account-cleanup-list">
        `;

        if (accounts.length === 0) {
            modalHtml += `
                            <div class="empty-state-small">暂无账户</div>
            `;
        } else {
            accounts.forEach(account => {
                const stats = this.getAccountStats(account.id);
                const hasData = stats.months > 0;
                
                modalHtml += `
                            <div class="account-cleanup-item ${hasData ? 'has-data' : 'no-data'}">
                                <div class="account-info">
                                    <span class="account-icon">${account.icon}</span>
                                    <span class="account-name">${account.name}</span>
                                    <span class="account-stats">${hasData ? `${stats.months}个月数据` : '无数据'}</span>
                                </div>
                                <button class="btn btn-danger btn-sm" 
                                        onclick="AccountManager.clearAccountDataFromModal('${account.id}')"
                                        ${!hasData ? 'disabled' : ''}>
                                    🗑️ 清空数据
                                </button>
                            </div>
                `;
            });
        }

        modalHtml += `
                        </div>
                    </div>

                    <div class="cleanup-section dangerous">
                        <h4>🚨 清理所有财务数据</h4>
                        <p>清除所有账户的财务数据和相关数据，重新开始：</p>
                        <ul style="text-align: left; margin: 10px 0; padding-left: 20px; font-size: 0.9em;">
                            <li>所有账户的历史财务数据</li>
                            <li>账单记录和汇总数据</li>
                            <li>生产线的收入设置</li>
                            <li>支出记录</li>
                            <li>分析预测数据</li>
                            <li>可选择是否清空累计存款</li>
                        </ul>
                        <button class="btn btn-danger" onclick="AccountManager.clearAllFinanceDataFromModal()">
                            💀 清除所有数据
                        </button>
                        <div class="cleanup-note">
                            <small>此操作会清除所有财务相关数据，但保留账户配置和生产线配置</small>
                        </div>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button type="button" class="btn btn-secondary" onclick="window.closeModal('data-cleanup-modal')">关闭</button>
                </div>
            </div>
        `;

        // 创建或更新模态框
        let modal = document.getElementById('data-cleanup-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'data-cleanup-modal';
            modal.className = 'modal modal-medium';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = modalHtml;
        modal.classList.add('show');
    },

    // 从模态框清理指定账户数据
    clearAccountDataFromModal: function(accountId) {
        try {
            const success = this.clearAccountData(accountId);
            if (success) {
                alert('✅ 账户数据清除成功！');
                
                // 刷新模态框内容
                this.showDataCleanupModal();
                
                // 刷新相关显示
                if (window.renderResourceOverview) window.renderResourceOverview();
                if (window.renderBillsSummary) window.renderBillsSummary();
                if (window.renderAccountsManagement) window.renderAccountsManagement();
            }
        } catch (error) {
            alert('❌ 清除失败: ' + error.message);
        }
    },

    // 从模态框清理所有数据
    clearAllFinanceDataFromModal: function() {
        try {
            const success = this.clearAllFinanceData();
            if (success) {
                alert('✅ 所有财务数据清除成功！系统将重新开始。');
                
                // 关闭模态框
                window.closeModal('data-cleanup-modal');
                
                // 刷新所有相关显示
                if (window.renderResourceOverview) window.renderResourceOverview();
                if (window.renderBillsSummary) window.renderBillsSummary();
                if (window.renderAccountsManagement) window.renderAccountsManagement();
                if (window.renderFinanceMainPanel) window.renderFinanceMainPanel();
                if (window.renderProductions) window.renderProductions();
                if (window.renderExpenses) window.renderExpenses();
            }
        } catch (error) {
            alert('❌ 清除失败: ' + error.message);
        }
    }
}; 