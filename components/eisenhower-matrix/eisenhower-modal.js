/**
 * 艾森豪威尔矩阵模态框主逻辑
 * 负责矩阵界面的渲染和交互管理
 */

window.EisenhowerMatrix = {
    
    // 初始化矩阵模块
    init: function() {
        console.log('🏗️ 初始化艾森豪威尔矩阵模块...');
        
        // 确保数据结构存在
        this.initDataStructure();
        
        // 创建模态框
        this.createModal();
        
        console.log('✅ 艾森豪威尔矩阵模块初始化完成');
    },
    
    // 初始化数据结构
    initDataStructure: function() {
        if (!gameData.eisenhowerTasks) {
            gameData.eisenhowerTasks = {
                taskPool: [],
                quadrants: {
                    "urgent-important": [],
                    "important": [],
                    "urgent": [],
                    "neither": []
                },
                lastTaskId: 0
            };
        }
    },
    
    // 创建模态框DOM
    createModal: function() {
        // 检查是否已存在
        let modal = document.getElementById('eisenhower-matrix-modal');
        if (modal) return;
        
        modal = document.createElement('div');
        modal.id = 'eisenhower-matrix-modal';
        modal.className = 'modal modal-eisenhower';
        
        modal.innerHTML = `
            <div class="modal-content eisenhower-content">
                <div class="eisenhower-header">
                    <h3 class="modal-title">📋 艾森豪威尔任务矩阵</h3>
                    <button class="modal-close" onclick="EisenhowerMatrix.closeModal()">×</button>
                </div>
                
                <div class="eisenhower-body">
                    <!-- 桌面版布局 -->
                    <div class="desktop-layout">
                        <!-- 左侧任务池 -->
                        <div class="task-pool-section">
                            <div class="task-pool-header">
                                <h4>📝 任务池</h4>
                                <span class="task-count" id="task-pool-count">0 个任务</span>
                            </div>
                            
                            <!-- 任务添加区 -->
                            <div class="task-add-area">
                                <div class="task-input-group">
                                    <input type="text" 
                                           id="new-task-title" 
                                           class="task-input" 
                                           placeholder="输入任务标题，按Enter快速添加..."
                                           maxlength="100">
                                </div>
                                <div class="task-input-group">
                                    <input type="date" 
                                           id="new-task-deadline" 
                                           class="task-date-input"
                                           title="截止日期（可选）">
                                    <button id="add-task-btn" 
                                            class="btn btn-primary btn-sm"
                                            onclick="EisenhowerMatrix.addTask()">
                                        ➕ 添加
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 任务列表 -->
                            <div class="task-pool-list" id="task-pool-list">
                                <!-- 任务项将在这里动态生成 -->
                            </div>
                        </div>
                        
                        <!-- 右侧矩阵 -->
                        <div class="matrix-section">
                            <div class="matrix-header">
                                <h4>🎯 优先级矩阵</h4>
                                <div class="matrix-legend">
                                    <span class="legend-item urgent-important">重要且紧急</span>
                                    <span class="legend-item important">重要不紧急</span>
                                    <span class="legend-item urgent">紧急不重要</span>
                                    <span class="legend-item neither">不重要不紧急</span>
                                </div>
                            </div>
                            
                            <!-- 2x2 矩阵网格 -->
                            <div class="matrix-grid">
                                <!-- 第一行 -->
                                <div class="matrix-quadrant urgent-important" data-quadrant="urgent-important">
                                    <div class="quadrant-header">
                                        <span class="quadrant-title">🚨 重要且紧急</span>
                                        <span class="quadrant-subtitle">立即处理</span>
                                        <span class="task-count" id="urgent-important-count">0</span>
                                    </div>
                                    <div class="quadrant-tasks" id="urgent-important-tasks">
                                        <!-- 任务将在这里显示 -->
                                    </div>
                                </div>
                                
                                <div class="matrix-quadrant important" data-quadrant="important">
                                    <div class="quadrant-header">
                                        <span class="quadrant-title">⭐ 重要不紧急</span>
                                        <span class="quadrant-subtitle">计划安排</span>
                                        <span class="task-count" id="important-count">0</span>
                                    </div>
                                    <div class="quadrant-tasks" id="important-tasks">
                                        <!-- 任务将在这里显示 -->
                                    </div>
                                </div>
                                
                                <!-- 第二行 -->
                                <div class="matrix-quadrant urgent" data-quadrant="urgent">
                                    <div class="quadrant-header">
                                        <span class="quadrant-title">⚡ 紧急不重要</span>
                                        <span class="quadrant-subtitle">委托他人</span>
                                        <span class="task-count" id="urgent-count">0</span>
                                    </div>
                                    <div class="quadrant-tasks" id="urgent-tasks">
                                        <!-- 任务将在这里显示 -->
                                    </div>
                                </div>
                                
                                <div class="matrix-quadrant neither" data-quadrant="neither">
                                    <div class="quadrant-header">
                                        <span class="quadrant-title">📱 不重要不紧急</span>
                                        <span class="quadrant-subtitle">减少或消除</span>
                                        <span class="task-count" id="neither-count">0</span>
                                    </div>
                                    <div class="quadrant-tasks" id="neither-tasks">
                                        <!-- 任务将在这里显示 -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 移动端布局 -->
                    <div class="mobile-layout">
                        <!-- 任务添加区 -->
                        <div class="mobile-task-add">
                            <input type="text" 
                                   id="mobile-task-title" 
                                   class="mobile-task-input" 
                                   placeholder="添加新任务..."
                                   maxlength="100">
                            <button id="mobile-add-btn" 
                                    class="mobile-add-button"
                                    onclick="EisenhowerMatrix.addMobileTask()">
                                ＋
                            </button>
                        </div>
                        
                        <!-- 移动端任务管理 -->
                        <div class="mobile-task-manager" id="mobile-task-manager">
                            <!-- 动态生成移动端任务界面 -->
                        </div>
                    </div>
                </div>
                
                <div class="eisenhower-footer">
                    <div class="matrix-stats">
                        <span>总任务: <span id="total-tasks">0</span></span>
                        <span>已分类: <span id="categorized-tasks">0</span></span>
                        <span>待分类: <span id="uncategorized-tasks">0</span></span>
                    </div>
                    <div class="matrix-view-toggle mobile-only">
                        <button id="matrix-view-btn" class="view-toggle-btn active" onclick="EisenhowerMatrix.switchView('matrix')">矩阵</button>
                        <button id="list-view-btn" class="view-toggle-btn" onclick="EisenhowerMatrix.switchView('list')">列表</button>
                    </div>
                    <div class="matrix-actions">
                        <button class="btn btn-secondary" onclick="EisenhowerMatrix.closeModal()">关闭</button>
                        <button class="btn btn-primary" onclick="EisenhowerMatrix.saveData()">保存</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        this.bindEvents();
    },
    
    // 绑定事件
    bindEvents: function() {
        // Enter键快速添加任务
        const taskInput = document.getElementById('new-task-title');
        if (taskInput) {
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addTask();
                }
            });
        }
        
        // Esc键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('eisenhower-matrix-modal').classList.contains('show')) {
                this.closeModal();
            }
        });
        
        // 初始化拖拽功能
        this.initDragAndDrop();
        
        // 监听窗口大小变化
        this.initResponsiveHandler();
        
        // 初始化移动端功能
        this.initMobileFeatures();
    },
    
    // 显示矩阵模态框
    showModal: function() {
        this.initDataStructure();
        
        const modal = document.getElementById('eisenhower-matrix-modal');
        if (!modal) {
            this.createModal();
        }
        
        // 检测移动端
        const isMobile = window.innerWidth <= 768;
        
        // 渲染数据
        if (isMobile) {
            // 移动端渲染
            this.renderMobileTaskManager();
        } else {
            // 桌面端渲染
            this.renderTaskPool();
            this.renderMatrix();
        }
        
        this.updateStats();
        
        // 移动端创建优先级选择器
        if (isMobile) {
            this.createMobilePrioritySelector();
        }
        
        // 显示模态框
        modal.classList.add('show');
        
        // 聚焦到输入框
        setTimeout(() => {
            const input = isMobile ? 
                document.getElementById('mobile-task-title') : 
                document.getElementById('new-task-title');
            if (input) input.focus();
        }, 100);
    },
    
    // 关闭模态框
    closeModal: function() {
        const modal = document.getElementById('eisenhower-matrix-modal');
        if (modal) {
            modal.classList.remove('show');
            
            // 清理移动端优先级选择器
            const prioritySelector = modal.querySelector('.mobile-priority-selector');
            if (prioritySelector) {
                prioritySelector.remove();
                this.mobilePrioritySelector = null;
            }
        }
    },
    
    // 添加新任务
    addTask: function() {
        const titleInput = document.getElementById('new-task-title');
        const deadlineInput = document.getElementById('new-task-deadline');
        
        const title = titleInput.value.trim();
        if (!title) {
            titleInput.focus();
            return;
        }
        
        // 创建新任务
        const task = {
            id: 'task_' + Date.now() + '_' + (++gameData.eisenhowerTasks.lastTaskId),
            title: title,
            description: '',
            deadline: deadlineInput.value || null,
            status: 'active',
            quadrant: null,
            createdAt: Date.now(),
            completedAt: null
        };
        
        // 添加到任务池
        gameData.eisenhowerTasks.taskPool.push(task);
        
        // 清空输入
        titleInput.value = '';
        deadlineInput.value = '';
        titleInput.focus();
        
        // 重新渲染
        this.renderTaskPool();
        this.updateStats();
        
        console.log('✅ 任务已添加:', task.title);
    },
    
    // 渲染任务池
    renderTaskPool: function() {
        const container = document.getElementById('task-pool-list');
        if (!container) return;
        
        const tasks = gameData.eisenhowerTasks.taskPool.filter(task => 
            task.status === 'active' && (task.quadrant === null || task.quadrant === undefined)
        );
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-task-pool">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">任务池为空</div>
                    <div class="empty-hint">在上方添加新任务开始规划</div>
                </div>
            `;
        } else {
            container.innerHTML = tasks.map(task => this.renderTaskItem(task, 'pool')).join('');
        }
        
        // 更新计数
        const countElement = document.getElementById('task-pool-count');
        if (countElement) {
            countElement.textContent = `${tasks.length} 个任务`;
        }
        
        // 重新绑定拖拽事件
        setTimeout(() => {
            this.attachDragEvents();
        }, 50);
    },
    
    // 渲染矩阵
    renderMatrix: function() {
        const quadrants = ['urgent-important', 'important', 'urgent', 'neither'];
        
        quadrants.forEach(quadrant => {
            const container = document.getElementById(`${quadrant}-tasks`);
            const countElement = document.getElementById(`${quadrant}-count`);
            
            if (!container || !countElement) return;
            
            const taskIds = gameData.eisenhowerTasks.quadrants[quadrant] || [];
            const tasks = taskIds.map(id => 
                gameData.eisenhowerTasks.taskPool.find(task => task.id === id && task.status === 'active')
            ).filter(Boolean);
            
            if (tasks.length === 0) {
                container.innerHTML = `
                    <div class="empty-quadrant">
                        <div class="drop-hint">拖拽任务到此处</div>
                    </div>
                `;
            } else {
                container.innerHTML = tasks.map(task => this.renderTaskItem(task, quadrant)).join('');
            }
            
            countElement.textContent = tasks.length;
        });
        
        // 重新绑定拖拽事件
        setTimeout(() => {
            this.attachDragEvents();
        }, 50);
    },
    
    // 渲染单个任务项
    renderTaskItem: function(task, location) {
        const now = new Date();
        const deadline = task.deadline ? new Date(task.deadline) : null;
        
        let deadlineClass = '';
        let deadlineText = '';
        
        if (deadline) {
            const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                deadlineClass = 'overdue';
                deadlineText = `已逾期 ${Math.abs(diffDays)} 天`;
            } else if (diffDays <= 3) {
                deadlineClass = 'urgent';
                deadlineText = diffDays === 0 ? '今天到期' : `${diffDays} 天后到期`;
            } else {
                deadlineText = deadline.toLocaleDateString('zh-CN');
            }
        }
        
        // 为重要且紧急的任务添加推送到今日目标按钮
        const isUrgentImportant = location === 'urgent-important';
        const goalButton = isUrgentImportant ? 
            `<button class="task-action-btn goal-btn" onclick="EisenhowerMatrix.pushToGoals('${task.id}')" title="推送到今日目标">
                📌
            </button>` : '';
        
        return `
            <div class="task-item ${deadlineClass}" data-task-id="${task.id}" data-location="${location}">
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${deadlineText ? `<div class="task-deadline ${deadlineClass}">${deadlineText}</div>` : ''}
                </div>
                <div class="task-actions">
                    ${goalButton}
                    <button class="task-action-btn" onclick="EisenhowerMatrix.editTask('${task.id}')" title="编辑">
                        ✏️
                    </button>
                    <button class="task-action-btn" onclick="EisenhowerMatrix.completeTask('${task.id}')" title="完成">
                        ✅
                    </button>
                    <button class="task-action-btn" onclick="EisenhowerMatrix.deleteTask('${task.id}')" title="删除">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },
    
    // HTML转义
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // 更新统计信息
    updateStats: function() {
        const totalTasks = gameData.eisenhowerTasks.taskPool.filter(task => task.status === 'active').length;
        const categorizedTasks = Object.values(gameData.eisenhowerTasks.quadrants).flat().length;
        const uncategorizedTasks = totalTasks - categorizedTasks;
        
        const totalElement = document.getElementById('total-tasks');
        const categorizedElement = document.getElementById('categorized-tasks');
        const uncategorizedElement = document.getElementById('uncategorized-tasks');
        
        if (totalElement) totalElement.textContent = totalTasks;
        if (categorizedElement) categorizedElement.textContent = categorizedTasks;
        if (uncategorizedElement) uncategorizedElement.textContent = uncategorizedTasks;
    },
    
    // 编辑任务
    editTask: function(taskId) {
        // TODO: Phase 3 实现
        console.log('编辑任务:', taskId);
    },
    
    // 完成任务
    completeTask: function(taskId) {
        const task = gameData.eisenhowerTasks.taskPool.find(t => t.id === taskId);
        if (!task) return;
        
        task.status = 'completed';
        task.completedAt = Date.now();
        
        // 从象限中移除
        Object.keys(gameData.eisenhowerTasks.quadrants).forEach(quadrant => {
            const index = gameData.eisenhowerTasks.quadrants[quadrant].indexOf(taskId);
            if (index > -1) {
                gameData.eisenhowerTasks.quadrants[quadrant].splice(index, 1);
            }
        });
        
        // 重新渲染
        this.renderTaskPool();
        this.renderMatrix();
        this.updateStats();
        
        console.log('✅ 任务已完成:', task.title);
    },
    
    // 删除任务
    deleteTask: function(taskId) {
        if (!confirm('确定要删除这个任务吗？')) return;
        
        const taskIndex = gameData.eisenhowerTasks.taskPool.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        const task = gameData.eisenhowerTasks.taskPool[taskIndex];
        
        // 从任务池中移除
        gameData.eisenhowerTasks.taskPool.splice(taskIndex, 1);
        
        // 从象限中移除
        Object.keys(gameData.eisenhowerTasks.quadrants).forEach(quadrant => {
            const index = gameData.eisenhowerTasks.quadrants[quadrant].indexOf(taskId);
            if (index > -1) {
                gameData.eisenhowerTasks.quadrants[quadrant].splice(index, 1);
            }
        });
        
        // 重新渲染
        this.renderTaskPool();
        this.renderMatrix();
        this.updateStats();
        
        console.log('🗑️ 任务已删除:', task.title);
    },
    
    // 推送任务到今日目标
    pushToGoals: function(taskId) {
        const task = gameData.eisenhowerTasks.taskPool.find(t => t.id === taskId);
        if (!task) {
            console.error('任务不存在:', taskId);
            return;
        }
        
        // 确保今日目标数据结构存在
        if (!gameData.dailyGoals) {
            gameData.dailyGoals = {
                goals: [
                    { text: '', completed: false },
                    { text: '', completed: false },
                    { text: '', completed: false }
                ]
            };
        }
        
        // 查找空位
        const emptyIndex = gameData.dailyGoals.goals.findIndex(goal => !goal.text || goal.text.trim() === '');
        
        if (emptyIndex !== -1) {
            // 有空位，直接放入
            gameData.dailyGoals.goals[emptyIndex] = {
                text: task.title,
                completed: false
            };
            
            // 保存数据
            if (window.saveToCloud) {
                window.saveToCloud();
            }
            
            // 刷新今日目标显示
            if (window.renderResourceStats) {
                window.renderResourceStats();
            }
            
            window.showNotification(`✅ 已推送到今日目标：${task.title}`, 'success');
            console.log('✅ 任务已推送到今日目标:', task.title);
        } else {
            // 没有空位，询问替换
            this.showGoalReplaceDialog(task);
        }
    },
    
    // 显示目标替换对话框
    showGoalReplaceDialog: function(task) {
        const goals = gameData.dailyGoals.goals;
        let dialogHtml = `
            <div class="goal-replace-dialog">
                <h4>今日目标已满，请选择要替换的目标：</h4>
                <div class="goal-options">
        `;
        
        goals.forEach((goal, index) => {
            const statusIcon = goal.completed ? '✅' : '⭕';
            const statusText = goal.completed ? '已完成' : '未完成';
            dialogHtml += `
                <div class="goal-option" onclick="EisenhowerMatrix.replaceGoal(${index}, '${task.id}')">
                    <span class="goal-status">${statusIcon}</span>
                    <span class="goal-text">${goal.text || '空目标'}</span>
                    <span class="goal-status-text">${statusText}</span>
                </div>
            `;
        });
        
        dialogHtml += `
                </div>
                <div class="dialog-buttons">
                    <button class="btn btn-secondary" onclick="EisenhowerMatrix.closeGoalDialog()">取消</button>
                </div>
            </div>
        `;
        
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.id = 'goal-replace-dialog';
        dialog.className = 'modal modal-small';
        dialog.innerHTML = `<div class="modal-content">${dialogHtml}</div>`;
        
        document.body.appendChild(dialog);
        dialog.classList.add('show');
    },
    
    // 替换目标
    replaceGoal: function(goalIndex, taskId) {
        const task = gameData.eisenhowerTasks.taskPool.find(t => t.id === taskId);
        if (!task) return;
        
        gameData.dailyGoals.goals[goalIndex] = {
            text: task.title,
            completed: false
        };
        
        // 保存数据
        if (window.saveToCloud) {
            window.saveToCloud();
        }
        
        // 刷新今日目标显示
        if (window.renderResourceStats) {
            window.renderResourceStats();
        }
        
        this.closeGoalDialog();
        window.showNotification(`✅ 已替换今日目标：${task.title}`, 'success');
        console.log('✅ 目标已替换:', task.title);
    },
    
    // 关闭目标对话框
    closeGoalDialog: function() {
        const dialog = document.getElementById('goal-replace-dialog');
        if (dialog) {
            dialog.remove();
        }
    },
    
    // 编辑任务
    editTask: function(taskId) {
        const task = gameData.eisenhowerTasks.taskPool.find(t => t.id === taskId);
        if (!task) {
            console.error('任务不存在:', taskId);
            return;
        }
        
        const newTitle = prompt('请输入新的任务标题:', task.title);
        if (newTitle === null || newTitle.trim() === '') return;
        
        const trimmedTitle = newTitle.trim();
        if (trimmedTitle === task.title) return; // 标题未改变
        
        task.title = trimmedTitle;
        
        // 重新渲染
        this.renderTaskPool();
        this.renderMatrix();
        this.updateStats();
        this.saveData();
        
        console.log('✅ 任务标题已更新:', trimmedTitle);
        if (window.showNotification) {
            window.showNotification(`✅ 任务已更新：${trimmedTitle}`, 'success');
        }
    },
    
    // 完成任务
    completeTask: function(taskId) {
        const task = gameData.eisenhowerTasks.taskPool.find(t => t.id === taskId);
        if (!task) {
            console.error('任务不存在:', taskId);
            return;
        }
        
        if (!confirm(`确定要完成任务"${task.title}"吗？`)) return;
        
        task.status = 'completed';
        task.completedAt = Date.now();
        
        // 从象限中移除
        if (task.quadrant) {
            const quadrant = gameData.eisenhowerTasks.quadrants[task.quadrant];
            if (quadrant) {
                const index = quadrant.indexOf(taskId);
                if (index > -1) {
                    quadrant.splice(index, 1);
                }
            }
        }
        
        // 重新渲染
        this.renderTaskPool();
        this.renderMatrix();
        this.updateStats();
        this.saveData();
        
        console.log('✅ 任务已完成:', task.title);
        if (window.showNotification) {
            window.showNotification(`✅ 任务已完成：${task.title}`, 'success');
        }
    },
    
    // 删除任务
    deleteTask: function(taskId) {
        const task = gameData.eisenhowerTasks.taskPool.find(t => t.id === taskId);
        if (!task) {
            console.error('任务不存在:', taskId);
            return;
        }
        
        if (!confirm(`确定要删除任务"${task.title}"吗？`)) return;
        
        // 从任务池中移除
        const taskIndex = gameData.eisenhowerTasks.taskPool.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            gameData.eisenhowerTasks.taskPool.splice(taskIndex, 1);
        }
        
        // 从象限中移除
        if (task.quadrant) {
            const quadrant = gameData.eisenhowerTasks.quadrants[task.quadrant];
            if (quadrant) {
                const index = quadrant.indexOf(taskId);
                if (index > -1) {
                    quadrant.splice(index, 1);
                }
            }
        }
        
        // 重新渲染
        this.renderTaskPool();
        this.renderMatrix();
        this.updateStats();
        this.saveData();
        
        console.log('🗑️ 任务已删除:', task.title);
        if (window.showNotification) {
            window.showNotification(`🗑️ 任务已删除：${task.title}`, 'info');
        }
    },
    
    // 显示今日目标选择器
    showGoalSelector: function(quadrant) {
        // TODO: Phase 4 实现
        console.log('设置今日目标:', quadrant);
    },
    
    // 保存数据
    saveData: function() {
        if (window.saveToCloud) {
            window.saveToCloud();
        }
        console.log('💾 艾森豪威尔矩阵数据已保存');
    },
    
    // 初始化拖拽功能
    initDragAndDrop: function() {
        console.log('🎯 初始化拖拽功能...');
        
        // 拖拽状态管理
        this.dragState = {
            draggedElement: null,
            draggedTaskId: null,
            sourceLocation: null,
            placeholder: null,
            isDragging: false
        };
        
        // 为现有任务添加拖拽事件（在渲染时调用）
        this.attachDragEvents();
    },
    
    // 为任务项附加拖拽事件
    attachDragEvents: function() {
        const taskItems = document.querySelectorAll('.task-item');
        taskItems.forEach(item => {
            this.makeDraggable(item);
        });
        
        // 为拖拽区域添加放置事件
        this.attachDropEvents();
    },
    
    // 使任务项可拖拽
    makeDraggable: function(element) {
        element.draggable = true;
        
        // 桌面端拖拽事件
        element.addEventListener('dragstart', (e) => {
            this.handleDragStart(e);
        });
        
        element.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });
        
        // 移动端触摸拖拽事件
        element.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: false });
        
        element.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        }, { passive: false });
        
        element.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: false });
    },
    
    // 为拖拽目标区域添加事件
    attachDropEvents: function() {
        // 任务池
        const taskPool = document.getElementById('task-pool-list');
        if (taskPool) {
            this.makeDropZone(taskPool, 'pool');
        }
        
        // 四个象限
        const quadrants = ['urgent-important', 'important', 'urgent', 'neither'];
        quadrants.forEach(quadrant => {
            const element = document.getElementById(`${quadrant}-tasks`);
            if (element) {
                this.makeDropZone(element, quadrant);
            }
        });
    },
    
    // 使区域成为拖拽目标
    makeDropZone: function(element, location) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(e, location);
        });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e, location);
        });
        
        element.addEventListener('dragenter', (e) => {
            e.preventDefault();
            this.handleDragEnter(e, location);
        });
        
        element.addEventListener('dragleave', (e) => {
            this.handleDragLeave(e, location);
        });
    },
    
    // 处理拖拽开始
    handleDragStart: function(e) {
        const taskElement = e.currentTarget;
        const taskId = taskElement.getAttribute('data-task-id');
        const location = taskElement.getAttribute('data-location');
        
        this.dragState.draggedElement = taskElement;
        this.dragState.draggedTaskId = taskId;
        this.dragState.sourceLocation = location;
        this.dragState.isDragging = true;
        
        // 设置拖拽数据
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
        
        // 添加拖拽样式
        taskElement.classList.add('dragging');
        
        // 创建占位符
        this.createPlaceholder();
        
        console.log('🎯 开始拖拽任务:', taskId, '从位置:', location);
    },
    
    // 处理拖拽结束
    handleDragEnd: function(e) {
        const taskElement = e.currentTarget;
        
        // 移除拖拽样式
        taskElement.classList.remove('dragging');
        
        // 移除所有拖拽相关的样式
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // 移除占位符
        this.removePlaceholder();
        
        // 重置拖拽状态
        this.dragState.isDragging = false;
        
        console.log('🎯 拖拽结束');
    },
    
    // 处理拖拽悬停
    handleDragOver: function(e, location) {
        if (!this.dragState.isDragging) return;
        
        e.dataTransfer.dropEffect = 'move';
    },
    
    // 处理拖拽进入
    handleDragEnter: function(e, location) {
        if (!this.dragState.isDragging) return;
        
        const dropZone = e.currentTarget;
        dropZone.classList.add('drag-over');
    },
    
    // 处理拖拽离开
    handleDragLeave: function(e, location) {
        if (!this.dragState.isDragging) return;
        
        // 只有当真正离开目标区域时才移除样式
        const dropZone = e.currentTarget;
        const rect = dropZone.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            dropZone.classList.remove('drag-over');
        }
    },
    
    // 处理放置
    handleDrop: function(e, targetLocation) {
        if (!this.dragState.isDragging) return;
        
        const taskId = this.dragState.draggedTaskId;
        const sourceLocation = this.dragState.sourceLocation;
        
        console.log('🎯 放置任务:', taskId, '从', sourceLocation, '到', targetLocation);
        
        // 移除拖拽样式
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // 如果目标位置和源位置相同，不做任何操作
        if (targetLocation === sourceLocation) {
            console.log('🎯 目标位置与源位置相同，取消移动');
            return;
        }
        
        // 执行任务移动
        this.moveTask(taskId, sourceLocation, targetLocation);
        
        // 重新渲染界面
        this.renderTaskPool();
        this.renderMatrix();
        this.updateStats();
        
        // 重新绑定拖拽事件
        setTimeout(() => {
            this.attachDragEvents();
        }, 50);
        
        // 保存数据
        this.saveData();
    },
    
    // 移动任务
    moveTask: function(taskId, fromLocation, toLocation) {
        const task = gameData.eisenhowerTasks.taskPool.find(t => t.id === taskId);
        if (!task) {
            console.error('❌ 任务不存在:', taskId);
            return;
        }
        
        // 从源位置移除
        if (fromLocation === 'pool') {
            // 任务在任务池中，只需要更新 quadrant 字段
            task.quadrant = null;
        } else {
            // 任务在某个象限中，从象限数组中移除
            const sourceQuadrant = gameData.eisenhowerTasks.quadrants[fromLocation];
            if (sourceQuadrant) {
                const index = sourceQuadrant.indexOf(taskId);
                if (index > -1) {
                    sourceQuadrant.splice(index, 1);
                }
            }
        }
        
        // 添加到目标位置
        if (toLocation === 'pool') {
            // 移动到任务池
            task.quadrant = null;
        } else {
            // 移动到象限
            task.quadrant = toLocation;
            const targetQuadrant = gameData.eisenhowerTasks.quadrants[toLocation];
            if (targetQuadrant && !targetQuadrant.includes(taskId)) {
                targetQuadrant.push(taskId);
            }
        }
        
        console.log('✅ 任务移动完成:', task.title, '→', toLocation);
    },
    
    // 创建拖拽占位符
    createPlaceholder: function() {
        if (this.dragState.placeholder) return;
        
        const placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        placeholder.innerHTML = '<div class="placeholder-text">拖拽到此处</div>';
        
        this.dragState.placeholder = placeholder;
    },
    
    // 移除拖拽占位符
    removePlaceholder: function() {
        if (this.dragState.placeholder && this.dragState.placeholder.parentNode) {
            this.dragState.placeholder.parentNode.removeChild(this.dragState.placeholder);
        }
        this.dragState.placeholder = null;
    },
    
    // 触摸拖拽处理函数
    handleTouchStart: function(e) {
        if (e.touches.length !== 1) return;
        
        const taskElement = e.currentTarget;
        const taskId = taskElement.getAttribute('data-task-id');
        const location = taskElement.getAttribute('data-location');
        
        // 检测是否点击了操作按钮
        if (e.target.closest('.task-action-btn')) {
            return; // 如果点击的是操作按钮，不启动拖拽
        }
        
        this.dragState.draggedElement = taskElement;
        this.dragState.draggedTaskId = taskId;
        this.dragState.sourceLocation = location;
        this.dragState.touchStartTime = Date.now();
        
        // 记录初始触摸位置
        const touch = e.touches[0];
        this.dragState.startX = touch.clientX;
        this.dragState.startY = touch.clientY;
        this.dragState.initialX = touch.clientX;
        this.dragState.initialY = touch.clientY;
        
        // 延迟启动拖拽，避免与点击冲突
        this.dragState.touchTimer = setTimeout(() => {
            if (!this.dragState.isDragging) {
                this.dragState.isDragging = true;
                
                // 添加拖拽样式
                taskElement.classList.add('dragging');
                
                // 轻微震动反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                
                console.log('📱 开始触摸拖拽任务:', taskId);
            }
        }, 150); // 150ms后启动拖拽
        
        // 防止默认行为，但允许滚动
        e.preventDefault();
    },
    
    handleTouchMove: function(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        // 检查是否移动距离足够启动拖拽
        if (!this.dragState.isDragging) {
            const deltaX = Math.abs(x - this.dragState.initialX);
            const deltaY = Math.abs(y - this.dragState.initialY);
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // 如果移动距离超过阈值，取消定时器并立即启动拖拽
            if (distance > 15) {
                if (this.dragState.touchTimer) {
                    clearTimeout(this.dragState.touchTimer);
                    this.dragState.touchTimer = null;
                }
                
                if (!this.dragState.isDragging) {
                    this.dragState.isDragging = true;
                    this.dragState.draggedElement.classList.add('dragging');
                    
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                    
                    console.log('📱 移动触发拖拽:', this.dragState.draggedTaskId);
                }
            } else {
                return; // 移动距离不够，不处理
            }
        }
        
        e.preventDefault();
        
        // 移动拖拽元素（视觉反馈）
        if (this.dragState.draggedElement) {
            const deltaX = x - this.dragState.startX;
            const deltaY = y - this.dragState.startY;
            
            this.dragState.draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05) rotate(3deg)`;
            this.dragState.draggedElement.style.zIndex = '1000';
        }
        
        // 检测拖拽目标
        const elementBelow = document.elementFromPoint(x, y);
        this.updateTouchDropTarget(elementBelow);
    },
    
    handleTouchEnd: function(e) {
        e.preventDefault();
        
        // 清除延迟定时器
        if (this.dragState.touchTimer) {
            clearTimeout(this.dragState.touchTimer);
            this.dragState.touchTimer = null;
        }
        
        // 如果没有进入拖拽状态，可能是点击操作
        if (!this.dragState.isDragging) {
            const touchDuration = Date.now() - this.dragState.touchStartTime;
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - this.dragState.initialX);
            const deltaY = Math.abs(touch.clientY - this.dragState.initialY);
            
            // 如果是短时间且小距离的触摸，当作点击处理
            if (touchDuration < 300 && deltaX < 10 && deltaY < 10) {
                // 检查是否点击了操作按钮区域
                const target = e.target.closest('.task-actions');
                if (!target) {
                    // 点击任务项本身，可以添加其他交互逻辑
                    console.log('📱 点击任务:', this.dragState.draggedTaskId);
                }
            }
            
            // 重置状态
            this.resetTouchState();
            return;
        }
        
        const touch = e.changedTouches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        // 重置拖拽元素样式
        if (this.dragState.draggedElement) {
            this.dragState.draggedElement.style.transform = '';
            this.dragState.draggedElement.style.zIndex = '';
            this.dragState.draggedElement.classList.remove('dragging');
        }
        
        // 移除所有拖拽样式
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // 检测放置目标
        const elementBelow = document.elementFromPoint(x, y);
        const dropTarget = this.findDropTarget(elementBelow);
        
        if (dropTarget) {
            const targetLocation = dropTarget.location;
            const sourceLocation = this.dragState.sourceLocation;
            
            if (targetLocation !== sourceLocation) {
                // 执行任务移动
                this.moveTask(this.dragState.draggedTaskId, sourceLocation, targetLocation);
                
                // 成功移动的震动反馈
                if (navigator.vibrate) {
                    navigator.vibrate([50, 50, 100]);
                }
                
                // 重新渲染界面
                this.renderTaskPool();
                this.renderMatrix();
                this.updateStats();
                
                // 保存数据
                this.saveData();
                
                console.log('📱 触摸拖拽完成:', this.dragState.draggedTaskId, '→', targetLocation);
                
                // 显示成功提示
                if (window.showNotification) {
                    window.showNotification('✅ 任务已移动', 'success');
                }
            }
        }
        
        // 重置拖拽状态
        this.resetTouchState();
        
        // 重新绑定事件
        setTimeout(() => {
            this.attachDragEvents();
        }, 50);
    },
    
    // 重置触摸状态
    resetTouchState: function() {
        this.dragState.isDragging = false;
        this.dragState.draggedElement = null;
        this.dragState.draggedTaskId = null;
        this.dragState.sourceLocation = null;
        this.dragState.touchStartTime = null;
        this.dragState.startX = null;
        this.dragState.startY = null;
        this.dragState.initialX = null;
        this.dragState.initialY = null;
        
        if (this.dragState.touchTimer) {
            clearTimeout(this.dragState.touchTimer);
            this.dragState.touchTimer = null;
        }
    },
    
    // 更新触摸拖拽的目标高亮
    updateTouchDropTarget: function(element) {
        // 移除所有高亮
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // 找到拖拽目标并高亮
        const dropTarget = this.findDropTarget(element);
        if (dropTarget && dropTarget.element) {
            dropTarget.element.classList.add('drag-over');
        }
    },
    
    // 查找拖拽目标
    findDropTarget: function(element) {
        if (!element) return null;
        
        // 检查是否是任务池
        const taskPoolList = element.closest('#task-pool-list');
        if (taskPoolList) {
            return { element: taskPoolList, location: 'pool' };
        }
        
        // 检查是否是象限（矩阵视图）
        const quadrants = ['urgent-important', 'important', 'urgent', 'neither'];
        for (const quadrant of quadrants) {
            const quadrantElement = element.closest(`#${quadrant}-tasks`);
            if (quadrantElement) {
                return { element: quadrantElement, location: quadrant };
            }
            
            // 检查是否是列表视图的象限
            const listQuadrantElement = element.closest(`#list-${quadrant}-tasks`);
            if (listQuadrantElement) {
                return { element: listQuadrantElement, location: quadrant };
            }
        }
        
        return null;
    },
    
    // 切换视图模式
    switchView: function(viewType) {
        this.currentView = viewType;
        this.updateViewMode();
    },
    
    // 更新视图模式
    updateViewMode: function() {
        const modal = document.getElementById('eisenhower-matrix-modal');
        const matrixBtn = document.getElementById('matrix-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        
        if (!modal || !matrixBtn || !listBtn) return;
        
        // 更新按钮状态
        matrixBtn.classList.toggle('active', this.currentView === 'matrix');
        listBtn.classList.toggle('active', this.currentView === 'list');
        
        // 更新模态框类名
        modal.classList.toggle('list-view-mode', this.currentView === 'list');
        
        if (this.currentView === 'list') {
            this.renderListView();
        } else {
            this.renderMatrix();
        }
    },
    
    // 渲染列表视图
    renderListView: function() {
        const matrixSection = document.querySelector('.matrix-section');
        if (!matrixSection) return;
        
        // 获取所有任务按优先级分组
        const tasksByQuadrant = {
            'urgent-important': [],
            'important': [],
            'urgent': [],
            'neither': []
        };
        
        // 收集各象限的任务
        Object.keys(tasksByQuadrant).forEach(quadrant => {
            const taskIds = gameData.eisenhowerTasks.quadrants[quadrant] || [];
            tasksByQuadrant[quadrant] = taskIds.map(id => 
                gameData.eisenhowerTasks.taskPool.find(task => task.id === id && task.status === 'active')
            ).filter(Boolean);
        });
        
        const quadrantConfig = {
            'urgent-important': { title: '🚨 重要且紧急', subtitle: '立即处理', color: 'urgent-important' },
            'important': { title: '⭐ 重要不紧急', subtitle: '计划安排', color: 'important' },
            'urgent': { title: '⚡ 紧急不重要', subtitle: '委托他人', color: 'urgent' },
            'neither': { title: '📱 不重要不紧急', subtitle: '减少或消除', color: 'neither' }
        };
        
        matrixSection.innerHTML = `
            <div class="matrix-header">
                <h4>🎯 任务列表（按优先级排序）</h4>
            </div>
            <div class="list-view-container">
                ${Object.keys(quadrantConfig).map(quadrant => {
                    const config = quadrantConfig[quadrant];
                    const tasks = tasksByQuadrant[quadrant];
                    const count = tasks.length;
                    
                    return `
                        <div class="list-section ${config.color}" data-quadrant="${quadrant}">
                            <div class="list-section-header">
                                <div class="section-title">${config.title}</div>
                                <div class="section-subtitle">${config.subtitle}</div>
                                <div class="section-count">${count} 项</div>
                            </div>
                            <div class="list-section-tasks" id="list-${quadrant}-tasks">
                                ${tasks.length === 0 ? 
                                    `<div class="empty-section">
                                        <div class="drop-hint">拖拽任务到此处或从任务池添加</div>
                                    </div>` :
                                    tasks.map(task => this.renderTaskItem(task, quadrant)).join('')
                                }
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // 重新绑定拖拽事件
        setTimeout(() => {
            this.attachDragEvents();
            this.attachListDropEvents();
        }, 50);
    },
    
    // 为列表视图添加拖拽目标事件
    attachListDropEvents: function() {
        const quadrants = ['urgent-important', 'important', 'urgent', 'neither'];
        quadrants.forEach(quadrant => {
            const element = document.getElementById(`list-${quadrant}-tasks`);
            if (element) {
                                 this.makeDropZone(element, quadrant);
             }
         });
     },
     
     // 初始化移动端功能
     initMobileFeatures: function() {
         // 移动端专用变量
         this.selectedTaskForPriority = null;
         this.mobilePrioritySelector = null;
         
         // 检测移动端
         this.checkMobileDevice();
         
         // 创建移动端优先级选择器
         this.createMobilePrioritySelector();
         
         // 绑定移动端输入事件
         this.bindMobileEvents();
     },
     
     // 检测移动端设备
     checkMobileDevice: function() {
         const isMobile = window.innerWidth <= 768;
         const modal = document.getElementById('eisenhower-matrix-modal');
         if (modal) {
             modal.classList.toggle('mobile-mode', isMobile);
         }
     },
     
     // 添加移动端任务
     addMobileTask: function() {
         const titleInput = document.getElementById('mobile-task-title');
         if (!titleInput) return;
         
         const title = titleInput.value.trim();
         if (!title) {
             titleInput.focus();
             return;
         }
         
         // 创建新任务
         const task = {
             id: 'task_' + Date.now() + '_' + (++gameData.eisenhowerTasks.lastTaskId),
             title: title,
             description: '',
             deadline: null,
             status: 'active',
             quadrant: null,
             createdAt: Date.now(),
             completedAt: null
         };
         
         // 添加到任务池
         gameData.eisenhowerTasks.taskPool.push(task);
         
         // 清空输入
         titleInput.value = '';
         
         // 震动反馈
         this.vibrate(50);
         
         // 重新渲染移动端界面
         this.renderMobileTaskManager();
         this.updateStats();
         
         console.log('✅ 移动端任务已添加:', task.title);
     },
     
     // 渲染移动端任务管理器
     renderMobileTaskManager: function() {
         const container = document.getElementById('mobile-task-manager');
         if (!container) return;
         
         // 获取所有活动任务
         const allTasks = gameData.eisenhowerTasks.taskPool.filter(task => task.status === 'active');
         
         // 按类别分组
         const unassignedTasks = allTasks.filter(task => !task.quadrant);
         const assignedTasks = {
             'urgent-important': [],
             'important': [],
             'urgent': [],
             'neither': []
         };
         
         allTasks.forEach(task => {
             if (task.quadrant && assignedTasks[task.quadrant]) {
                 assignedTasks[task.quadrant].push(task);
             }
         });
         
         const priorityConfig = {
             'urgent-important': { title: '🚨 重要且紧急', color: 'urgent-important' },
             'important': { title: '⭐ 重要不紧急', color: 'important' },
             'urgent': { title: '⚡ 紧急不重要', color: 'urgent' },
             'neither': { title: '📱 不重要不紧急', color: 'neither' }
         };
         
         let html = '';
         
         // 未分类任务
         if (unassignedTasks.length > 0) {
             html += `
                 <div class="mobile-section">
                     <h3 style="color: #bdc3c7; margin-bottom: 12px; font-size: 0.9em;">📋 待分类任务</h3>
                     ${unassignedTasks.map(task => this.renderMobileTaskCard(task)).join('')}
                 </div>
             `;
         }
         
         // 已分类任务
         Object.keys(priorityConfig).forEach(priority => {
             const tasks = assignedTasks[priority];
             if (tasks.length > 0) {
                 const config = priorityConfig[priority];
                 html += `
                     <div class="mobile-section">
                         <h3 style="color: #ecf0f1; margin-bottom: 12px; font-size: 0.9em;">${config.title}</h3>
                         ${tasks.map(task => this.renderMobileTaskCard(task)).join('')}
                     </div>
                 `;
             }
         });
         
         if (html === '') {
             html = `
                 <div class="mobile-empty-state">
                     <div style="font-size: 3em; margin-bottom: 16px;">📝</div>
                     <div style="color: #bdc3c7; font-size: 1.1em; margin-bottom: 8px;">还没有任务</div>
                     <div style="color: #7f8c8d; font-size: 0.9em;">在上方添加您的第一个任务</div>
                 </div>
             `;
         }
         
         container.innerHTML = html;
     },
     
     // 渲染移动端任务卡片
     renderMobileTaskCard: function(task) {
         const priorityText = this.getPriorityText(task.quadrant);
         const deadlineText = this.formatDeadline(task.deadline);
         
         return `
             <div class="mobile-task-card" data-task-id="${task.id}">
                 <div class="mobile-task-header">
                     <div class="mobile-task-content">
                         <div class="mobile-task-title">${this.escapeHtml(task.title)}</div>
                         ${deadlineText ? `<div class="mobile-task-deadline ${this.getDeadlineClass(task.deadline)}">${deadlineText}</div>` : ''}
                     </div>
                     ${task.quadrant ? `<div class="mobile-task-priority ${task.quadrant}">${priorityText}</div>` : ''}
                 </div>
                 <div class="mobile-task-actions">
                     ${!task.quadrant ? `<button class="mobile-task-action priority" onclick="EisenhowerMatrix.selectTaskPriority('${task.id}')">设置优先级</button>` : ''}
                     <button class="mobile-task-action complete" onclick="EisenhowerMatrix.completeTask('${task.id}')">完成</button>
                     <button class="mobile-task-action delete" onclick="EisenhowerMatrix.deleteTask('${task.id}')">删除</button>
                 </div>
             </div>
         `;
     },
     
     // 获取优先级文本
     getPriorityText: function(quadrant) {
         const texts = {
             'urgent-important': '重要紧急',
             'important': '重要不紧急',
             'urgent': '紧急不重要',
             'neither': '不重要不紧急'
         };
         return texts[quadrant] || '未分类';
     },
     
     // 选择任务优先级
     selectTaskPriority: function(taskId) {
         this.selectedTaskForPriority = taskId;
         this.showMobilePrioritySelector();
     },
     
     // 创建移动端优先级选择器
     createMobilePrioritySelector: function() {
         const modal = document.getElementById('eisenhower-matrix-modal');
         if (!modal || modal.querySelector('.mobile-priority-selector')) return;
         
         const selector = document.createElement('div');
         selector.className = 'mobile-priority-selector';
         
         selector.innerHTML = `
             <div class="mobile-priority-title">选择任务优先级</div>
             <div class="mobile-priority-options">
                 <div class="mobile-priority-option urgent-important" onclick="EisenhowerMatrix.setPriority('urgent-important')">
                     🚨 重要且紧急<br><small style="opacity: 0.7;">立即处理</small>
                 </div>
                 <div class="mobile-priority-option important" onclick="EisenhowerMatrix.setPriority('important')">
                     ⭐ 重要不紧急<br><small style="opacity: 0.7;">计划安排</small>
                 </div>
                 <div class="mobile-priority-option urgent" onclick="EisenhowerMatrix.setPriority('urgent')">
                     ⚡ 紧急不重要<br><small style="opacity: 0.7;">委托他人</small>
                 </div>
                 <div class="mobile-priority-option neither" onclick="EisenhowerMatrix.setPriority('neither')">
                     📱 不重要不紧急<br><small style="opacity: 0.7;">减少或消除</small>
                 </div>
             </div>
             <button class="mobile-priority-cancel" onclick="EisenhowerMatrix.hideMobilePrioritySelector()">取消</button>
         `;
         
         modal.appendChild(selector);
         this.mobilePrioritySelector = selector;
     },
     
     // 显示移动端优先级选择器
     showMobilePrioritySelector: function() {
         if (this.mobilePrioritySelector) {
             this.mobilePrioritySelector.classList.add('show');
             this.vibrate(50);
         }
     },
     
     // 隐藏移动端优先级选择器
     hideMobilePrioritySelector: function() {
         if (this.mobilePrioritySelector) {
             this.mobilePrioritySelector.classList.remove('show');
         }
         this.selectedTaskForPriority = null;
     },
     
     // 设置优先级
     setPriority: function(quadrant) {
         if (!this.selectedTaskForPriority) return;
         
         const task = gameData.eisenhowerTasks.taskPool.find(t => t.id === this.selectedTaskForPriority);
         if (!task) return;
         
         // 从原象限移除
         if (task.quadrant) {
             const oldQuadrant = gameData.eisenhowerTasks.quadrants[task.quadrant];
             if (oldQuadrant) {
                 const index = oldQuadrant.indexOf(task.id);
                 if (index > -1) {
                     oldQuadrant.splice(index, 1);
                 }
             }
         }
         
         // 添加到新象限
         task.quadrant = quadrant;
         if (!gameData.eisenhowerTasks.quadrants[quadrant]) {
             gameData.eisenhowerTasks.quadrants[quadrant] = [];
         }
         gameData.eisenhowerTasks.quadrants[quadrant].push(task.id);
         
         // 震动反馈
         this.vibrate(100);
         
         // 隐藏选择器
         this.hideMobilePrioritySelector();
         
         // 重新渲染
         this.renderMobileTaskManager();
         this.updateStats();
         
         console.log('✅ 任务优先级已设置:', task.title, '→', quadrant);
     },
     
     // 绑定移动端事件
     bindMobileEvents: function() {
         // 移动端输入框回车
         const mobileInput = document.getElementById('mobile-task-title');
         if (mobileInput) {
             mobileInput.addEventListener('keypress', (e) => {
                 if (e.key === 'Enter') {
                     this.addMobileTask();
                 }
             });
         }
         
         // 监听窗口大小变化
         window.addEventListener('resize', () => {
             this.checkMobileDevice();
         });
     },
     
           // 震动反馈
      vibrate: function(duration = 50) {
          if (navigator.vibrate) {
              navigator.vibrate(duration);
          }
      },
      
      // HTML转义
      escapeHtml: function(text) {
          const map = {
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#039;'
          };
          return text.replace(/[&<>"']/g, function(m) { return map[m]; });
      },
      
      // 格式化截止日期
      formatDeadline: function(deadline) {
          if (!deadline) return null;
          
          const date = new Date(deadline);
          const now = new Date();
          const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) {
              return `已超期 ${Math.abs(diffDays)} 天`;
          } else if (diffDays === 0) {
              return '今天到期';
          } else if (diffDays === 1) {
              return '明天到期';
          } else if (diffDays <= 7) {
              return `${diffDays} 天后到期`;
          } else {
              return date.toLocaleDateString('zh-CN');
          }
      },
      
      // 获取截止日期样式类
      getDeadlineClass: function(deadline) {
          if (!deadline) return '';
          
          const date = new Date(deadline);
          const now = new Date();
          const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) {
              return 'overdue';
          } else if (diffDays <= 3) {
              return 'urgent';
          }
          return '';
      },
     
     // 初始化响应式处理
     initResponsiveHandler: function() {
         let resizeTimer;
         
         window.addEventListener('resize', () => {
             clearTimeout(resizeTimer);
             resizeTimer = setTimeout(() => {
                 const modal = document.getElementById('eisenhower-matrix-modal');
                 if (modal && modal.classList.contains('show')) {
                     // 根据屏幕大小自动调整视图
                     const shouldUseMobileView = window.innerWidth <= 768;
                     const currentlyMobile = this.currentView === 'list';
                     
                     if (shouldUseMobileView && !currentlyMobile) {
                         this.switchView('list');
                     } else if (!shouldUseMobileView && currentlyMobile) {
                         this.switchView('matrix');
                     }
                 }
             }, 250);
         });
         
         // 监听方向变化（移动端）
         window.addEventListener('orientationchange', () => {
             setTimeout(() => {
                 const modal = document.getElementById('eisenhower-matrix-modal');
                 if (modal && modal.classList.contains('show')) {
                     this.updateViewMode();
                 }
             }, 500);
         });
     }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    if (window.EisenhowerMatrix) {
        window.EisenhowerMatrix.init();
    }
});

console.log('✅ 艾森豪威尔矩阵模块加载完成'); 