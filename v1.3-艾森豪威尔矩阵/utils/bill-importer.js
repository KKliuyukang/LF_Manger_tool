/**
 * Multi-Account Data Import Module
 * Handles importing and validating data for various accounts
 */

console.log('🔄 BillImporter模块开始加载...');

window.BillImporter = {
    
    // Currently selected account ID
    selectedAccountId: null,
    
    // Pending import data
    pendingImportData: null,
    
    // Show multi-account import modal
    showMultiAccountImportModal: function() {
        // Ensure finance module is initialized
        if (window.FinanceModule && !window.FinanceModule.initialized) {
            window.FinanceModule.init();
        }
        
        // Create modal HTML
        const modalHtml = this.generateImportModalHtml();
        
        // If modal doesn't exist, create it
        let modal = document.getElementById('multi-account-import-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'multi-account-import-modal';
            modal.className = 'modal modal-large';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = modalHtml;
        
        // Populate account dropdown
        this.populateAccountSelect();
        
        // Show modal
        modal.classList.add('show');
        
        // Clear form
        this.resetImportForm();
    },
    
    // Generate import modal HTML
    generateImportModalHtml: function() {
        return `
            <div class="modal-content">
                <h3 class="modal-title">📥 多账户数据导入</h3>
                <div class="modal-body">
                    <div class="import-instructions">
                        <h4>💡 使用说明</h4>
                        <p>1. 选择要导入数据的目标账户</p>
                        <p>2. 粘贴该账户的JSON数据（保持现有格式）</p>
                        <p>3. 预览数据确认无误后导入</p>
                        <p>4. 系统会自动重新汇总所有账户数据</p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">选择目标账户</label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <select class="form-select" id="target-account-select" style="flex: 1;">
                                <option value="">请选择账户...</option>
                            </select>
                            <button type="button" class="btn btn-secondary" onclick="BillImporter.showCreateAccountForImport()">
                                ➕ 新建账户
                            </button>
                        </div>
                    </div>
                    
                    <div class="import-example">
                        <h4>📝 JSON格式示例</h4>
                        <pre>{
  "2024-06": {
    "income": 15000,
    "incomeCurrency": "CNY",
    "expenses": [
      {"name": "房租", "amount": 3000, "currency": "CNY", "category": "住房"},
      {"name": "生活费", "amount": 2000, "currency": "CNY", "category": "生活"}
    ]
  },
  "2024-07": {
    "income": 3200,
    "incomeCurrency": "AUD", 
    "expenses": [
      {"name": "澳洲生活费", "amount": 600, "currency": "AUD", "category": "生活"}
    ]
  }
}</pre>
                    </div>
                    
                    <div class="import-input">
                        <h4>📥 粘贴账户数据</h4>
                        <textarea id="account-import-data" placeholder="粘贴JSON数据..." rows="8" style="width: 100%; font-family: monospace;"></textarea>
                    </div>
                    
                    <div id="account-import-preview" style="display: none;">
                        <h4>📊 数据预览</h4>
                        <div id="account-preview-content"></div>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button type="button" class="btn btn-secondary" onclick="window.closeModal('multi-account-import-modal')">取消</button>
                    <button type="button" class="btn btn-primary" onclick="BillImporter.previewAccountData()">预览数据</button>
                    <button type="button" class="btn btn-success" onclick="BillImporter.confirmAccountImport()" id="confirm-account-import" style="display: none;">确认导入</button>
                </div>
            </div>
        `;
    },
    
    // Populate account dropdown
    populateAccountSelect: function() {
        const select = document.getElementById('target-account-select');
        if (!select) return;
        
        // Clear existing options (keep default option)
        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (defaultOption) {
            select.appendChild(defaultOption);
        }
        
        // Get account list
        const accounts = window.AccountManager ? window.AccountManager.getAccountList() : [];
        
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.icon} ${account.name} (${account.currency})`;
            select.appendChild(option);
        });
        
        // Add event listener
        select.onchange = () => {
            this.selectedAccountId = select.value;
        };
    },
    
    // Reset import form
    resetImportForm: function() {
        this.selectedAccountId = null;
        this.pendingImportData = null;
        
        const select = document.getElementById('target-account-select');
        const textarea = document.getElementById('account-import-data');
        const preview = document.getElementById('account-import-preview');
        const confirmBtn = document.getElementById('confirm-account-import');
        
        if (select) select.value = '';
        if (textarea) textarea.value = '';
        if (preview) preview.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';
    },
    
    // Show create account for import
    showCreateAccountForImport: function() {
        if (window.AccountManager) {
            window.AccountManager.showCreateAccountModal();
            
            // Listen for account creation completion
            const checkAccountCreation = setInterval(() => {
                if (!document.getElementById('account-create-modal').classList.contains('show')) {
                    clearInterval(checkAccountCreation);
                    // Refresh account list
                    setTimeout(() => {
                        this.populateAccountSelect();
                    }, 100);
                }
            }, 500);
        }
    },
    
    // Preview account data
    previewAccountData: function() {
        const accountSelect = document.getElementById('target-account-select');
        const dataTextarea = document.getElementById('account-import-data');
        
        if (!accountSelect.value) {
            alert('请先选择目标账户');
            return;
        }
        
        const jsonData = dataTextarea.value.trim();
        if (!jsonData) {
            alert('请输入JSON数据');
            return;
        }
        
        try {
            const data = JSON.parse(jsonData);
            const account = window.AccountManager.getAccountById(accountSelect.value);
            
            if (!account) {
                alert('选择的账户不存在');
                return;
            }
            
            // Validate data format
            const validation = this.validateImportData(data);
            if (!validation.valid) {
                alert('数据格式错误: ' + validation.errors.join(', '));
                return;
            }
            
            // Generate preview HTML
            const previewHtml = this.generatePreviewHtml(data, account);
            
            document.getElementById('account-preview-content').innerHTML = previewHtml;
            document.getElementById('account-import-preview').style.display = 'block';
            document.getElementById('confirm-account-import').style.display = 'inline-block';
            
            // Save data for import
            this.selectedAccountId = accountSelect.value;
            this.pendingImportData = data;
            
        } catch (error) {
            alert('JSON格式错误: ' + error.message);
        }
    },
    
    // Validate import data
    validateImportData: function(data) {
        const errors = [];
        
        if (typeof data !== 'object' || data === null) {
            errors.push('数据必须是JSON对象');
            return { valid: false, errors };
        }
        
        // Check month format
        Object.keys(data).forEach(monthKey => {
            if (!/^\d{4}-\d{2}$/.test(monthKey)) {
                errors.push(`月份格式错误: ${monthKey}，应为 YYYY-MM 格式`);
            }
            
            const monthData = data[monthKey];
            if (typeof monthData !== 'object') {
                errors.push(`${monthKey} 月份数据格式错误`);
                return;
            }
            
            // Check expenses array
            if (monthData.expenses && !Array.isArray(monthData.expenses)) {
                errors.push(`${monthKey} 的expenses必须是数组`);
            }
        });
        
        return { valid: errors.length === 0, errors };
    },
    
    // Generate preview HTML
    generatePreviewHtml: function(data, account) {
        let previewHtml = `
            <div class="account-import-summary">
                <div class="import-account-info">
                    <strong>目标账户：</strong> ${account.icon} ${account.name} (多货币支持)
                </div>
            </div>
        `;
        
        let totalMonths = 0;
        let totalIncome = 0;
        let totalExpense = 0;
        
        Object.entries(data).forEach(([monthKey, monthData]) => {
            totalMonths++;
            
            // 计算收入：优先使用 incomeDetails，回退到 income 字段
            let income = 0;
            let incomeSummary = '';
            
            if (Array.isArray(monthData.incomeDetails) && monthData.incomeDetails.length > 0) {
                // 新格式：使用 incomeDetails
                monthData.incomeDetails.forEach(item => {
                    income += item.amount || 0;
                });
                
                // 生成收入摘要
                const topIncomes = monthData.incomeDetails
                    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
                    .slice(0, 2);
                incomeSummary = topIncomes
                    .map(item => `${item.name}: ${this.formatCurrency(item.amount, item.currency)}`)
                    .join(', ');
                if (monthData.incomeDetails.length > 2) {
                    incomeSummary += ` 等${monthData.incomeDetails.length}项`;
                }
            } else if (monthData.income) {
                // 旧格式：使用 income 字段
                income = monthData.income || 0;
                incomeSummary = `总收入: ${this.formatCurrency(income, monthData.incomeCurrency || 'AUD')}`;
            }
            
            totalIncome += income;
            
            // 计算支出
            let monthExpense = 0;
            const expenses = monthData.expenses || [];
            expenses.forEach(exp => {
                monthExpense += exp.amount || 0;
            });
            totalExpense += monthExpense;
            
            const balance = income - monthExpense;
            const balanceClass = balance >= 0 ? 'positive' : 'negative';
            
            previewHtml += `
                <div class="bills-preview-item">
                    <div class="bills-preview-month">${monthKey}</div>
                    <div class="bills-preview-summary">
                        <span>收入: ${this.formatCurrency(income, 'AUD')}</span>
                        <span>支出: ${this.formatCurrency(monthExpense, 'AUD')}</span>
                        <span class="${balanceClass}">差额: ${this.formatCurrency(balance, 'AUD')}</span>
                    </div>
                    ${incomeSummary ? `<div class="bills-preview-income-details">${incomeSummary}</div>` : ''}
                    <div class="bills-preview-expenses">
                        ${expenses.slice(0, 3).map(exp => `${exp.name}: ${this.formatCurrency(exp.amount, exp.currency)}`).join(', ')}
                        ${expenses.length > 3 ? ` 等${expenses.length}项` : ''}
                    </div>
                </div>
            `;
        });
        
        const totalBalance = totalIncome - totalExpense;
        const totalBalanceClass = totalBalance >= 0 ? 'positive' : 'negative';
        
        previewHtml += `
            <div style="background: #3498db; color: white; padding: 12px; border-radius: 6px; margin-top: 10px;">
                <strong>汇总: ${totalMonths}个月数据</strong><br>
                总收入: ${this.formatCurrency(totalIncome, 'AUD')} | 
                总支出: ${this.formatCurrency(totalExpense, 'AUD')} | 
                <span class="${totalBalanceClass}">总差额: ${this.formatCurrency(totalBalance, 'AUD')}</span>
            </div>
        `;
        
        return previewHtml;
    },
    
    // Format currency display
    formatCurrency: function(amount, currency) {
        const symbols = {
            'CNY': '¥',
            'AUD': 'A$',
            'USD': '$',
            'EUR': '€'
        };
        
        const symbol = symbols[currency] || currency;
        return `${symbol}${Math.round(amount).toLocaleString()}`;
    },
    
    // Confirm account import
    confirmAccountImport: function() {
        if (!this.selectedAccountId || !this.pendingImportData) {
            alert('没有待导入的数据');
            return;
        }
        
        try {
            // Ensure finance data structure exists
            if (!gameData.financeData) {
                window.FinanceModule.initDataStructure();
            }
            
            // Import data to specified account
            if (!gameData.financeData.accountData[this.selectedAccountId]) {
                gameData.financeData.accountData[this.selectedAccountId] = {};
            }
            
            // Merge data, new data overwrites old data
            Object.assign(gameData.financeData.accountData[this.selectedAccountId], this.pendingImportData);
            
            // Update account last updated time
            const account = gameData.financeData.accounts[this.selectedAccountId];
            if (account) {
                account.lastUpdated = new Date().toISOString();
            }
            
            // Trigger data aggregation
            if (window.DataAggregator) {
                window.DataAggregator.aggregateAllAccounts();
            }
            
            // Save to cloud
            if (window.saveToCloud) {
                window.saveToCloud();
            }
            
            // Refresh related displays
            this.refreshFinanceDisplays();
            
            // Close modal
            window.closeModal('multi-account-import-modal');
            
            const accountInfo = window.AccountManager.getAccountById(this.selectedAccountId);
            const accountName = accountInfo ? accountInfo.name : '选中账户';
            const monthsCount = Object.keys(this.pendingImportData).length;
            
            alert(`✅ 成功导入 ${monthsCount} 个月的数据到 "${accountName}"！\n数据已自动汇总更新。`);
            
            // Clear temporary data
            this.resetImportForm();
            
        } catch (error) {
            alert('❌ 导入失败: ' + error.message);
            console.error('Import error:', error);
        }
    },
    
    // Refresh finance related displays
    refreshFinanceDisplays: function() {
        // Refresh resource panel
        if (window.renderResourceOverview) {
            window.renderResourceOverview();
        }
        if (window.renderBillsSummary) {
            window.renderBillsSummary();
        }
        if (window.renderResourceStats) {
            window.renderResourceStats();
        }
        if (window.renderResourceAnalysis) {
            window.renderResourceAnalysis();
        }
        if (window.renderAccountsManagement) {
            window.renderAccountsManagement();
        }
        
        // Trigger finance data update event
        document.dispatchEvent(new CustomEvent('financeDataUpdated', {
            detail: { 
                type: 'account_import', 
                accountId: this.selectedAccountId,
                data: this.pendingImportData 
            }
        }));
    }
};

console.log('✅ BillImporter模块加载完成，方法数量:', Object.keys(window.BillImporter).length);
console.log('✅ showMultiAccountImportModal方法类型:', typeof window.BillImporter.showMultiAccountImportModal);

// 模块已经通过 window.BillImporter 定义，无需重复声明 