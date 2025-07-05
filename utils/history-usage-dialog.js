/**
 * 历史记录使用确认对话框
 * 在开始研发项目时询问用户是否使用历史记录
 */

class HistoryUsageDialog {
    constructor() {
        this.currentProject = null;
        this.resolveCallback = null;
        this.createDialog();
    }

    /**
     * 创建对话框DOM
     */
    createDialog() {
        const dialogHtml = `
            <div id="history-usage-dialog" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">历史记录使用确认</h3>
                        <button class="modal-close" onclick="window.historyUsageDialog.close()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="history-info">
                            <div class="project-info">
                                <h4 id="project-name"></h4>
                                <p id="project-description"></p>
                            </div>
                            
                            <div class="history-summary">
                                <div class="summary-item">
                                    <span class="label">发现历史记录：</span>
                                    <span class="value" id="total-records">0 条</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">项目开始前：</span>
                                    <span class="value" id="pre-project-records">0 条</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">项目开始后：</span>
                                    <span class="value" id="post-project-records">0 条</span>
                                </div>
                            </div>

                            <div class="prediction-section">
                                <h5>使用历史记录的预测结果：</h5>
                                <div class="prediction-result" id="prediction-result">
                                    <!-- 预测结果将在这里显示 -->
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="button-group">
                            <button class="btn btn-primary" onclick="window.historyUsageDialog.confirm(true)">
                                使用历史记录
                            </button>
                            <button class="btn btn-secondary" onclick="window.historyUsageDialog.confirm(false)">
                                重新开始计算
                            </button>
                            <button class="btn btn-tertiary" onclick="window.historyUsageDialog.showAdvanced()">
                                高级选项
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 高级选项对话框 -->
            <div id="advanced-options-dialog" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">高级选项</h3>
                        <button class="modal-close" onclick="window.historyUsageDialog.closeAdvanced()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="advanced-options">
                            <div class="option-group">
                                <label>自定义开始时间：</label>
                                <input type="date" id="custom-start-date" class="form-control">
                                <small class="help-text">从指定日期开始计算进度</small>
                            </div>
                            
                            <div class="option-group">
                                <label>
                                    <input type="checkbox" id="exclude-weekends"> 
                                    排除周末记录
                                </label>
                            </div>
                            
                            <div class="option-group">
                                <label>
                                    <input type="checkbox" id="strict-time-matching"> 
                                    严格时间匹配
                                </label>
                                <small class="help-text">要求时间记录完全匹配等级要求</small>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="button-group">
                            <button class="btn btn-primary" onclick="window.historyUsageDialog.confirmAdvanced()">
                                应用设置
                            </button>
                            <button class="btn btn-secondary" onclick="window.historyUsageDialog.closeAdvanced()">
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 创建对话框容器
        const dialogContainer = document.createElement('div');
        dialogContainer.innerHTML = dialogHtml;
        document.body.appendChild(dialogContainer.firstElementChild);
        document.body.appendChild(dialogContainer.lastElementChild);

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 点击窗口外部关闭
        window.addEventListener('click', (e) => {
            const mainDialog = document.getElementById('history-usage-dialog');
            const advancedDialog = document.getElementById('advanced-options-dialog');
            
            if (e.target === mainDialog) {
                this.close();
            } else if (e.target === advancedDialog) {
                this.closeAdvanced();
            }
        });

        // 自定义开始时间变化
        const customDateInput = document.getElementById('custom-start-date');
        if (customDateInput) {
            customDateInput.addEventListener('change', () => {
                this.updatePredictionWithCustomDate();
            });
        }
    }

    /**
     * 显示对话框
     * @param {Object} project - 项目对象
     * @returns {Promise} 返回用户选择的结果
     */
    show(project) {
        this.currentProject = project;
        
        return new Promise((resolve) => {
            this.resolveCallback = resolve;
            this.updateDialogContent();
            
            const dialog = document.getElementById('history-usage-dialog');
            dialog.style.display = 'block';
        });
    }

    /**
     * 更新对话框内容
     */
    updateDialogContent() {
        if (!this.currentProject) return;

        const project = this.currentProject;
        const calculator = window.levelProgressCalculator;
        
        // 更新项目信息
        document.getElementById('project-name').textContent = project.researchName;
        document.getElementById('project-description').textContent = 
            project.description || '开始这个研发项目';

        // 获取历史记录统计
        const allLogs = calculator.getProjectLogs(project);
        const projectStartDate = new Date(project.startDate || new Date());
        
        const preProjectLogs = allLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate < projectStartDate;
        });
        
        const postProjectLogs = allLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= projectStartDate;
        });

        // 更新统计信息
        document.getElementById('total-records').textContent = `${allLogs.length} 条`;
        document.getElementById('pre-project-records').textContent = `${preProjectLogs.length} 条`;
        document.getElementById('post-project-records').textContent = `${postProjectLogs.length} 条`;

        // 更新预测结果
        this.updatePredictionResult();
    }

    /**
     * 更新预测结果
     */
    updatePredictionResult() {
        if (!this.currentProject) return;

        const calculator = window.levelProgressCalculator;
        const prediction = calculator.predictHistoryUsageResult(this.currentProject);
        
        const resultContainer = document.getElementById('prediction-result');
        
        let resultHtml = '';
        
        if (prediction.willComplete) {
            resultHtml = `
                <div class="prediction-warning">
                    <div class="warning-icon">⚠️</div>
                    <div class="warning-content">
                        <h6>项目将直接完成</h6>
                        <p>使用历史记录后，项目将直接达到第 ${prediction.completionLevel} 等级并完成。</p>
                        <p>总共发现 ${prediction.totalRecords} 条相关记录。</p>
                    </div>
                </div>
            `;
        } else {
            resultHtml = `
                <div class="prediction-info">
                    <div class="info-icon">ℹ️</div>
                    <div class="info-content">
                        <h6>项目将继续进行</h6>
                        <p>使用历史记录后，项目将从第 ${prediction.currentLevel} 等级开始。</p>
                        <p>已完成 ${prediction.completionLevel} 个等级。</p>
                    </div>
                </div>
            `;
        }
        
        resultContainer.innerHTML = resultHtml;
    }

    /**
     * 使用自定义日期更新预测
     */
    updatePredictionWithCustomDate() {
        const customDate = document.getElementById('custom-start-date').value;
        if (!customDate || !this.currentProject) return;

        const calculator = window.levelProgressCalculator;
        const options = {
            useHistoryRecords: true,
            startFromDate: customDate
        };
        
        const result = calculator.calculateLevelProgress(this.currentProject, options);
        
        // 更新预测显示
        const resultContainer = document.getElementById('prediction-result');
        resultContainer.innerHTML = `
            <div class="prediction-custom">
                <div class="custom-icon">📅</div>
                <div class="custom-content">
                    <h6>自定义时间预测</h6>
                    <p>从 ${customDate} 开始计算，项目将从第 ${result.currentLevel} 等级开始。</p>
                    <p>已完成 ${result.completedLevels} 个等级。</p>
                </div>
            </div>
        `;
    }

    /**
     * 确认选择
     */
    confirm(useHistory) {
        if (!this.resolveCallback) return;

        const result = {
            useHistoryRecords: useHistory,
            startFromDate: null,
            advancedOptions: null
        };

        this.resolveCallback(result);
        this.close();
    }

    /**
     * 显示高级选项
     */
    showAdvanced() {
        const advancedDialog = document.getElementById('advanced-options-dialog');
        advancedDialog.style.display = 'block';
    }

    /**
     * 关闭高级选项
     */
    closeAdvanced() {
        const advancedDialog = document.getElementById('advanced-options-dialog');
        advancedDialog.style.display = 'none';
    }

    /**
     * 确认高级选项
     */
    confirmAdvanced() {
        if (!this.resolveCallback) return;

        const customStartDate = document.getElementById('custom-start-date').value;
        const excludeWeekends = document.getElementById('exclude-weekends').checked;
        const strictTimeMatching = document.getElementById('strict-time-matching').checked;

        const result = {
            useHistoryRecords: true,
            startFromDate: customStartDate || null,
            advancedOptions: {
                excludeWeekends,
                strictTimeMatching
            }
        };

        this.resolveCallback(result);
        this.close();
        this.closeAdvanced();
    }

    /**
     * 关闭对话框
     */
    close() {
        const dialog = document.getElementById('history-usage-dialog');
        dialog.style.display = 'none';
        
        // 如果用户直接关闭，默认重新开始
        if (this.resolveCallback) {
            this.resolveCallback({
                useHistoryRecords: false,
                startFromDate: null,
                advancedOptions: null
            });
        }
        
        this.currentProject = null;
        this.resolveCallback = null;
    }
}

// 导出到全局
window.HistoryUsageDialog = HistoryUsageDialog;
window.historyUsageDialog = new HistoryUsageDialog();

console.log('✅ 历史记录使用确认对话框已加载'); 