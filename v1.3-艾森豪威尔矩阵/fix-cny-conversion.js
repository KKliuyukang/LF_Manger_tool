// 修复CNY数据重复转换问题的专用脚本
console.log('🔧 开始修复CNY数据重复转换问题...');

function analyzeCNYConversionIssue() {
    console.log('=== CNY转换问题分析 ===');
    
    const accountData = gameData.financeData?.accountData || {};
    const aggregatedData = gameData.financeData?.aggregatedData || {};
    
    // 检查原始数据 vs 汇总数据的差异
    Object.entries(accountData).forEach(([accountId, data]) => {
        const account = gameData.financeData.accounts[accountId];
        console.log(`\n📊 账户: ${account?.name || accountId}`);
        
        Object.entries(data).forEach(([monthKey, monthData]) => {
            if (monthData.income && monthData.income > 0) {
                const originalIncome = monthData.income;
                const originalCurrency = monthData.incomeCurrency;
                
                // 检查汇总数据
                const aggregatedMonth = aggregatedData[monthKey];
                if (aggregatedMonth) {
                    const aggregatedIncome = aggregatedMonth.income;
                    
                    console.log(`  ${monthKey}:`);
                    console.log(`    原始: ${originalIncome} ${originalCurrency}`);
                    console.log(`    汇总: ${aggregatedIncome} AUD`);
                    
                    // 计算理论转换值
                    let expectedAUD;
                    if (originalCurrency === 'CNY') {
                        expectedAUD = originalIncome / 4.65; // CNY转AUD
                    } else if (originalCurrency === 'AUD') {
                        expectedAUD = originalIncome;
                    } else {
                        expectedAUD = originalIncome; // 其他货币暂时不处理
                    }
                    
                    const ratio = aggregatedIncome / expectedAUD;
                    console.log(`    期望: ${expectedAUD.toFixed(2)} AUD`);
                    console.log(`    比率: ${ratio.toFixed(2)} (${ratio > 4 ? '❌ 可能重复转换' : ratio < 0.5 ? '❌ 可能转换错误' : '✅ 正常'})`);
                }
            }
        });
    });
}

function fixCNYDuplicateConversion() {
    console.log('\n🔧 修复CNY重复转换问题...');
    
    const accountData = gameData.financeData?.accountData || {};
    let fixedCount = 0;
    
    // 清空并重新计算汇总数据
    gameData.financeData.aggregatedData = {};
    gameData.billsData = {};
    
    console.log('📝 重新汇总数据（避免重复转换）...');
    
    // 手动重新汇总，确保转换逻辑正确
    const aggregatedData = {};
    
    Object.entries(accountData).forEach(([accountId, data]) => {
        const account = gameData.financeData.accounts[accountId];
        console.log(`\n处理账户: ${account?.name || accountId}`);
        
        Object.entries(data).forEach(([monthKey, monthData]) => {
            if (!aggregatedData[monthKey]) {
                aggregatedData[monthKey] = {
                    income: 0,
                    incomeCurrency: 'AUD',
                    expenses: [],
                    sources: []
                };
            }
            
            // 处理收入
            if (monthData.income && monthData.income > 0) {
                const originalIncome = monthData.income;
                const sourceCurrency = monthData.incomeCurrency;
                
                let audIncome;
                if (sourceCurrency === 'CNY') {
                    audIncome = originalIncome / 4.65;
                    console.log(`  收入转换: ${originalIncome} CNY -> ${audIncome.toFixed(2)} AUD`);
                } else if (sourceCurrency === 'AUD') {
                    audIncome = originalIncome;
                    console.log(`  收入保持: ${originalIncome} AUD`);
                } else {
                    audIncome = originalIncome; // 其他货币暂时不转换
                    console.log(`  收入保持: ${originalIncome} ${sourceCurrency} (未转换)`);
                }
                
                aggregatedData[monthKey].income += audIncome;
                fixedCount++;
            }
            
            // 处理支出
            if (monthData.expenses && Array.isArray(monthData.expenses)) {
                monthData.expenses.forEach(expense => {
                    const originalAmount = expense.amount;
                    const sourceCurrency = expense.currency;
                    
                    let audAmount;
                    if (sourceCurrency === 'CNY') {
                        audAmount = originalAmount / 4.65;
                    } else if (sourceCurrency === 'AUD') {
                        audAmount = originalAmount;
                    } else {
                        audAmount = originalAmount; // 其他货币暂时不转换
                    }
                    
                    aggregatedData[monthKey].expenses.push({
                        ...expense,
                        amount: audAmount,
                        currency: 'AUD',
                        originalAmount: originalAmount,
                        originalCurrency: sourceCurrency,
                        sourceAccount: account?.name || accountId,
                        sourceAccountId: accountId
                    });
                });
            }
            
            // 记录数据来源
            aggregatedData[monthKey].sources.push({
                accountId: accountId,
                accountName: account?.name || accountId,
                currencies: [monthData.incomeCurrency, ...(monthData.expenses || []).map(e => e.currency)].filter(c => c),
                hasIncome: !!(monthData.income),
                expenseCount: (monthData.expenses || []).length
            });
        });
    });
    
    // 更新汇总数据
    gameData.financeData.aggregatedData = aggregatedData;
    gameData.billsData = aggregatedData;
    
    console.log(`✅ 修复完成，处理了 ${fixedCount} 个收入项目`);
    
    // 保存数据
    if (window.saveToLocal) {
        saveToLocal();
        console.log('💾 修复后的数据已保存');
    }
    
    // 重新渲染界面
    if (window.renderFinanceMainPanel) renderFinanceMainPanel();
    if (window.renderBillsSummary) renderBillsSummary();
    
    console.log('🎯 界面已刷新，请查看修复结果');
}

function testSpecificConversion() {
    console.log('\n=== 测试具体转换 ===');
    
    // 测试你的实际数据
    const testCases = [
        { amount: 25825.5, currency: 'CNY', expected_aud: 25825.5 / 4.65 },
        { amount: 9300, currency: 'CNY', expected_aud: 9300 / 4.65 },
        { amount: 35973.37, currency: 'CNY', expected_aud: 35973.37 / 4.65 }
    ];
    
    testCases.forEach(test => {
        console.log(`${test.amount} ${test.currency} -> ${test.expected_aud.toFixed(2)} AUD`);
        console.log(`  显示为CNY: ${(test.expected_aud * 4.65).toFixed(2)} CNY`);
    });
}

// 执行分析
analyzeCNYConversionIssue();
testSpecificConversion();

// 暴露修复函数
window.fixCNYDuplicateConversion = fixCNYDuplicateConversion;
window.analyzeCNYConversionIssue = analyzeCNYConversionIssue;

console.log('\n🎯 分析完成！');
console.log('💡 如果发现重复转换问题，运行 fixCNYDuplicateConversion() 进行修复'); 