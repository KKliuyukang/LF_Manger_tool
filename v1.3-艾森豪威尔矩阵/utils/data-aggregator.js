/**
 * 数据汇总模块
 * 负责将多账户数据按规则汇总为统一格式
 */

window.DataAggregator = {
    
    // 汇总配置
    config: {
        incomeAggregation: 'sum',                    // 收入相加
        expenseAggregation: 'merge_by_category',     // 按类别合并支出
        currencyConversion: 'to_primary',            // 换算为主货币
        duplicateHandling: 'latest_wins',            // 后导入覆盖先导入
        sourceTracking: true                         // 保留数据来源信息
    },
    
    // 汇总所有账户数据
    aggregateAllAccounts: function() {
        console.log('开始汇总所有账户数据...');
        
        // 强制标准化汇率配置，防止被污染
        if (!gameData.financeData) {
            window.FinanceModule.initDataStructure();
        }
        if (!gameData.financeData.settings) {
            gameData.financeData.settings = {};
        }
        gameData.financeData.settings.exchangeRates = { 'AUD': 1, 'CNY': 4.65, 'USD': 0.65, 'EUR': 0.60 };
        
        try {
            // 确保财务数据结构存在
            if (!gameData.financeData) {
                window.FinanceModule.initDataStructure();
            }
            
            const accounts = gameData.financeData.accounts || {};
            const accountData = gameData.financeData.accountData || {};
            const settings = gameData.financeData.settings || {};
            
            // 获取启用的账户
            const enabledAccounts = Object.values(accounts).filter(account => account.enabled);
            
            if (enabledAccounts.length === 0) {
                console.log('没有启用的账户，清空汇总数据');
                gameData.financeData.aggregatedData = {};
                gameData.billsData = {};
                return;
            }
            
            // 收集所有月份的数据
            const aggregatedData = {};
            const primaryCurrency = 'AUD'; // 强制设置为AUD，聚合数据始终以AUD为基准
            
            enabledAccounts.forEach(account => {
                const monthlyData = accountData[account.id] || {};
                
                Object.entries(monthlyData).forEach(([monthKey, monthData]) => {
                    if (!aggregatedData[monthKey]) {
                        aggregatedData[monthKey] = {
                            income: 0,
                            incomeCurrency: primaryCurrency,
                            expenses: [],
                            sources: [],  // 数据来源追踪
                            incomeDetails: []
                        };
                    }
                    
                    // 汇总收入 - 优先使用 incomeDetails，回退到 income 字段
                    let accountIncomeTotal = 0;
                    
                    // 首先处理收入明细（新格式）
                    if (Array.isArray(monthData.incomeDetails) && monthData.incomeDetails.length > 0) {
                        console.log(`💰 处理收入明细 - ${monthKey}, 账户: ${account.name}, 明细数量: ${monthData.incomeDetails.length}`);
                        
                        monthData.incomeDetails.forEach((incomeItem, index) => {
                            const sourceCurrency = incomeItem.currency || primaryCurrency;
                            let convertedAmount = sourceCurrency === primaryCurrency
                                ? incomeItem.amount
                                : this.convertToPrimaryCurrency(incomeItem.amount, sourceCurrency, primaryCurrency, settings.exchangeRates);
                            
                            accountIncomeTotal += convertedAmount;
                            console.log(`  明细${index + 1}: ${incomeItem.name} - ${incomeItem.amount} ${sourceCurrency} -> ${convertedAmount} ${primaryCurrency}`);
                        });
                    } else if (monthData.income) {
                        // 回退到旧格式（如果有 income 字段）
                        const originalIncome = monthData.income || 0;
                        const sourceCurrency = monthData.incomeCurrency || primaryCurrency;
                        
                        console.log(`💰 处理总收入(旧格式) - ${monthKey}:`, {
                            originalIncome,
                            sourceCurrency,
                            targetCurrency: primaryCurrency,
                            accountName: account.name
                        });
                        
                        if (sourceCurrency === primaryCurrency) {
                            accountIncomeTotal = originalIncome;
                            console.log(`✅ 同货币无需转换: ${originalIncome} ${sourceCurrency}`);
                        } else {
                            accountIncomeTotal = this.convertToPrimaryCurrency(
                                originalIncome, 
                                sourceCurrency,
                                primaryCurrency,
                                settings.exchangeRates
                            );
                            console.log(`🔄 货币转换: ${originalIncome} ${sourceCurrency} -> ${accountIncomeTotal} ${primaryCurrency}`);
                        }
                    } else {
                        console.log(`📝 无收入数据 - ${monthKey}, 账户: ${account.name}`);
                    }
                    
                    aggregatedData[monthKey].income += accountIncomeTotal;
                    
                    // 生成收入明细（统一处理）
                    if (!aggregatedData[monthKey].incomeDetails) aggregatedData[monthKey].incomeDetails = [];
                    
                    if (Array.isArray(monthData.incomeDetails) && monthData.incomeDetails.length > 0) {
                        // 新格式：有明细数组，直接使用（已在上面处理过转换）
                        console.log(`📋 添加收入明细到汇总 - ${monthKey}, 账户: ${account.name}, 明细数量: ${monthData.incomeDetails.length}`);
                        monthData.incomeDetails.forEach((incomeItem, index) => {
                            const sourceCurrency = incomeItem.currency || primaryCurrency;
                            let convertedAmount = sourceCurrency === primaryCurrency
                                ? incomeItem.amount
                                : this.convertToPrimaryCurrency(incomeItem.amount, sourceCurrency, primaryCurrency, settings.exchangeRates);
                            
                            aggregatedData[monthKey].incomeDetails.push({
                                ...incomeItem,
                                amount: convertedAmount,
                                currency: primaryCurrency,
                                originalAmount: incomeItem.amount,
                                originalCurrency: sourceCurrency,
                                sourceAccount: account.name,
                                sourceAccountId: account.id
                            });
                        });
                    } else if (monthData.income && accountIncomeTotal > 0) {
                        // 旧格式：只有总收入，创建兼容明细
                        console.log(`📋 创建兼容收入明细 - ${monthKey}, 账户: ${account.name}, 总收入: ${accountIncomeTotal} ${primaryCurrency}`);
                        aggregatedData[monthKey].incomeDetails.push({
                            name: '总收入',
                            category: '收入',
                            amount: accountIncomeTotal,
                            currency: primaryCurrency,
                            originalAmount: monthData.income,
                            originalCurrency: monthData.incomeCurrency || primaryCurrency,
                            sourceAccount: account.name,
                            sourceAccountId: account.id
                        });
                    }
                    
                    // 汇总支出 - 完全依赖账单数据中的货币信息
                    if (monthData.expenses && Array.isArray(monthData.expenses)) {
                        const convertedExpenses = monthData.expenses.map(expense => {
                            const originalAmount = expense.amount || 0;
                            const sourceCurrency = expense.currency || primaryCurrency; // 默认为主货币而不是账户货币
                            
                            // 如果没有货币信息，记录警告
                            if (!expense.currency) {
                                console.warn(`支出项目 "${expense.name || expense.category}" 缺少货币信息，使用主货币 ${primaryCurrency}`);
                            }
                            
                            let convertedAmount;
                            if (sourceCurrency === primaryCurrency) {
                                // 同货币，直接使用
                                convertedAmount = originalAmount;
                            } else {
                                // 不同货币，进行转换
                                convertedAmount = this.convertToPrimaryCurrency(
                                    originalAmount,
                                    sourceCurrency,
                                    primaryCurrency,
                                    settings.exchangeRates
                                );
                            }
                            
                            return {
                                ...expense,
                                amount: convertedAmount,
                                currency: primaryCurrency,
                                originalAmount: originalAmount,
                                originalCurrency: sourceCurrency,
                                sourceAccount: account.name,
                                sourceAccountId: account.id,
                                currencyFallbackUsed: !expense.currency // 标记是否使用了回退货币
                            };
                        });
                        
                        aggregatedData[monthKey].expenses.push(...convertedExpenses);
                    }
                    
                    // 记录数据来源
                    const monthCurrencies = new Set();
                    if (monthData.incomeCurrency) monthCurrencies.add(monthData.incomeCurrency);
                    if (monthData.expenses) {
                        monthData.expenses.forEach(exp => {
                            if (exp.currency) monthCurrencies.add(exp.currency);
                        });
                    }
                    
                    aggregatedData[monthKey].sources.push({
                        accountId: account.id,
                        accountName: account.name,
                        currencies: Array.from(monthCurrencies), // 记录该月该账户涉及的所有货币
                        hasIncome: !!(monthData.income),
                        expenseCount: (monthData.expenses || []).length
                    });
                });
            });
            
            // 合并同类别支出
            Object.keys(aggregatedData).forEach(monthKey => {
                const monthData = aggregatedData[monthKey];
                monthData.expenses = this.mergeExpensesByCategory(monthData.expenses);
            });
            
            // 验证并修正收入汇总
            Object.keys(aggregatedData).forEach(monthKey => {
                const monthData = aggregatedData[monthKey];
                
                // 计算明细收入的总和
                const detailsSum = (monthData.incomeDetails || []).reduce((sum, detail) => {
                    return sum + (detail.amount || 0);
                }, 0);
                
                // 如果总收入和明细总和不一致，以明细为准（更准确）
                if (Math.abs(monthData.income - detailsSum) > 0.01) {
                    console.warn(`⚠️ 收入不一致修正 - ${monthKey}: 总收入 ${monthData.income} -> 明细总和 ${detailsSum}`);
                    monthData.income = detailsSum;
                }
                
                console.log(`✅ 收入验证 - ${monthKey}: 总收入 ${monthData.income}, 明细 ${monthData.incomeDetails?.length || 0} 项, 明细总和 ${detailsSum}`);
            });
            
            // 更新汇总数据
            gameData.financeData.aggregatedData = aggregatedData;
            gameData.financeData.settings.lastAggregation = new Date().toISOString();
            
            // 保持现有billsData的同步（向后兼容）
            gameData.billsData = aggregatedData;
            
            console.log(`汇总完成，共处理 ${Object.keys(aggregatedData).length} 个月的数据`);
            
            // 触发更新事件
            document.dispatchEvent(new CustomEvent('financeDataUpdated', {
                detail: { type: 'aggregation_complete', data: aggregatedData }
            }));
            
            return aggregatedData;
            
        } catch (error) {
            console.error('数据汇总失败:', error);
            throw error;
        }
    },
    
    // 货币换算
    convertToPrimaryCurrency: function(amount, fromCurrency, toCurrency, exchangeRates) {
        if (!amount || fromCurrency === toCurrency) {
            return amount;
        }
        
        const rates = exchangeRates || { 'AUD': 1, 'CNY': 4.65, 'USD': 0.65, 'EUR': 0.60 };
        
        // 先换算到基准货币（AUD）
        let audAmount;
        if (fromCurrency === 'AUD') {
            audAmount = amount;
        } else {
            const fromRate = rates[fromCurrency];
            if (!fromRate) {
                console.warn(`未找到货币 ${fromCurrency} 的汇率，使用原值`);
                return amount;
            }
            audAmount = amount / fromRate;  // 从其他货币换算到AUD：除以汇率
        }
        
        // 再从基准货币换算到目标货币
        if (toCurrency === 'AUD') {
            return audAmount;
        } else {
            const toRate = rates[toCurrency];
            if (!toRate) {
                console.warn(`未找到货币 ${toCurrency} 的汇率，返回AUD值`);
                return audAmount;
            }
            return audAmount * toRate;  // 从AUD换算到其他货币：乘以汇率
        }
    },
    
    // 按类别合并支出
    mergeExpensesByCategory: function(expenses) {
        const categoryMap = new Map();
        expenses.forEach(expense => {
            const category = expense.category || expense.name || '其他';
            if (categoryMap.has(category)) {
                const existing = categoryMap.get(category);
                existing.amount += expense.amount || 0;
                existing.items = existing.items || [];
                existing.items.push(expense); // 保留明细
            } else {
                categoryMap.set(category, {
                    name: category,
                    category: category,
                    amount: expense.amount || 0,
                    items: [expense], // 新增
                });
            }
        });
        return Array.from(categoryMap.values());
    },
    
    // 获取汇总统计信息
    getAggregationStats: function() {
        if (!gameData.financeData?.aggregatedData) {
            return {
                totalMonths: 0,
                totalAccounts: 0,
                enabledAccounts: 0,
                lastAggregation: null
            };
        }
        
        const accounts = gameData.financeData.accounts || {};
        const enabledAccountsCount = Object.values(accounts).filter(acc => acc.enabled).length;
        
        return {
            totalMonths: Object.keys(gameData.financeData.aggregatedData).length,
            totalAccounts: Object.keys(accounts).length,
            enabledAccounts: enabledAccountsCount,
            lastAggregation: gameData.financeData.settings?.lastAggregation
        };
    },
    
    // 获取月度汇总详情
    getMonthlyAggregationDetails: function(monthKey) {
        const monthData = gameData.financeData?.aggregatedData?.[monthKey];
        if (!monthData) {
            return null;
        }
        
        const details = {
            month: monthKey,
            totalIncome: monthData.income || 0,
            totalExpense: monthData.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0,
            expenseCount: monthData.expenses?.length || 0,
            categoryCount: new Set(monthData.expenses?.map(exp => exp.category || exp.name)).size,
            sources: monthData.sources || [],
                                currency: monthData.incomeCurrency || primaryCurrency
        };
        
        details.balance = details.totalIncome - details.totalExpense;
        
        return details;
    },
    
    // 检测数据冲突
    detectDataConflicts: function() {
        const conflicts = [];
        
        if (!gameData.financeData?.accountData) {
            return conflicts;
        }
        
        const accountData = gameData.financeData.accountData;
        const monthlyConflicts = {};
        
        // 检查同一月份在多个账户中的重复交易
        Object.entries(accountData).forEach(([accountId, data]) => {
            Object.entries(data).forEach(([monthKey, monthData]) => {
                if (!monthlyConflicts[monthKey]) {
                    monthlyConflicts[monthKey] = [];
                }
                
                const expenses = monthData.expenses || [];
                expenses.forEach(expense => {
                    monthlyConflicts[monthKey].push({
                        accountId,
                        expense: expense
                    });
                });
            });
        });
        
        // 分析潜在冲突
        Object.entries(monthlyConflicts).forEach(([monthKey, monthExpenses]) => {
            const duplicates = this.findDuplicateExpenses(monthExpenses);
            if (duplicates.length > 0) {
                conflicts.push({
                    month: monthKey,
                    type: 'duplicate_expenses',
                    items: duplicates
                });
            }
        });
        
        return conflicts;
    },
    
    // 查找重复支出
    findDuplicateExpenses: function(monthExpenses) {
        const duplicates = [];
        const seen = new Map();
        
        monthExpenses.forEach(item => {
            const expense = item.expense;
            const key = `${expense.name}_${expense.amount}_${expense.currency}`;
            
            if (seen.has(key)) {
                duplicates.push({
                    original: seen.get(key),
                    duplicate: item,
                    similarity: this.calculateSimilarity(seen.get(key).expense, expense)
                });
            } else {
                seen.set(key, item);
            }
        });
        
        return duplicates.filter(dup => dup.similarity > 0.8);
    },
    
    // 计算交易相似度
    calculateSimilarity: function(expense1, expense2) {
        let score = 0;
        
        // 名称相似度
        if (expense1.name === expense2.name) score += 0.4;
        
        // 金额相似度
        if (Math.abs(expense1.amount - expense2.amount) < 0.01) score += 0.4;
        
        // 货币相似度
        if (expense1.currency === expense2.currency) score += 0.1;
        
        // 类别相似度
        if (expense1.category === expense2.category) score += 0.1;
        
        return score;
    },
    
    // 强制重新汇总
    forceReaggregation: function() {
        console.log('强制重新汇总所有数据...');
        
        // 清空现有汇总数据
        if (gameData.financeData) {
            gameData.financeData.aggregatedData = {};
        }
        gameData.billsData = {};
        
        // 重新汇总
        return this.aggregateAllAccounts();
    },
    
    // 导出汇总报告
    exportAggregationReport: function() {
        const stats = this.getAggregationStats();
        const conflicts = this.detectDataConflicts();
        
        const report = {
            timestamp: new Date().toISOString(),
            statistics: stats,
            conflicts: conflicts,
            monthlyDetails: {}
        };
        
        // 添加月度详情
        if (gameData.financeData?.aggregatedData) {
            Object.keys(gameData.financeData.aggregatedData).forEach(monthKey => {
                report.monthlyDetails[monthKey] = this.getMonthlyAggregationDetails(monthKey);
            });
        }
        
        return report;
    }
};

// 将模块添加到全局作用域
window.DataAggregator = DataAggregator; 