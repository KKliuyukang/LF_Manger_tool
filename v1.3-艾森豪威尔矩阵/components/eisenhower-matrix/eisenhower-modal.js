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
                                <div class="quadrant-actions">
                                    <button class="btn btn-sm btn-goal" 
                                            onclick="EisenhowerMatrix.showGoalSelector('urgent-important')"
                                            title="设为今日目标">
                                        📌 设为今日目标
                                    </button>
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
                
                <div class="eisenhower-footer">
                    <div class="matrix-stats">
                        <span>总任务: <span id="total-tasks">0</span></span>
                        <span>已分类: <span id="categorized-tasks">0</span></span>
                        <span>待分类: <span id="uncategorized-tasks">0</span></span>
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
    },
    
    // 显示矩阵模态框
    showModal: function() {
        this.initDataStructure();
        
        const modal = document.getElementById('eisenhower-matrix-modal');
        if (!modal) {
            this.createModal();
        }
        
        // 渲染数据
        this.renderTaskPool();
        this.renderMatrix();
        this.updateStats();
        
        // 显示模态框
        modal.classList.add('show');
        
        // 聚焦到输入框
        setTimeout(() => {
            const input = document.getElementById('new-task-title');
            if (input) input.focus();
        }, 100);
    },
    
    // 关闭模态框
    closeModal: function() {
        const modal = document.getElementById('eisenhower-matrix-modal');
        if (modal) {
            modal.classList.remove('show');
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
        
        return `
            <div class="task-item ${deadlineClass}" data-task-id="${task.id}" data-location="${location}">
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${deadlineText ? `<div class="task-deadline ${deadlineClass}">${deadlineText}</div>` : ''}
                </div>
                <div class="task-actions">
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
        
        this.dragState.draggedElement = taskElement;
        this.dragState.draggedTaskId = taskId;
        this.dragState.sourceLocation = location;
        this.dragState.isDragging = true;
        
        // 记录初始触摸位置
        const touch = e.touches[0];
        this.dragState.startX = touch.clientX;
        this.dragState.startY = touch.clientY;
        
        // 添加拖拽样式
        taskElement.classList.add('dragging');
        
        // 防止默认滚动行为
        e.preventDefault();
        
        console.log('📱 开始触摸拖拽任务:', taskId);
    },
    
    handleTouchMove: function(e) {
        if (!this.dragState.isDragging || e.touches.length !== 1) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        // 移动拖拽元素（视觉反馈）
        if (this.dragState.draggedElement) {
            const deltaX = x - this.dragState.startX;
            const deltaY = y - this.dragState.startY;
            
            this.dragState.draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(3deg)`;
        }
        
        // 检测拖拽目标
        const elementBelow = document.elementFromPoint(x, y);
        this.updateTouchDropTarget(elementBelow);
    },
    
    handleTouchEnd: function(e) {
        if (!this.dragState.isDragging) return;
        
        e.preventDefault();
        
        const touch = e.changedTouches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        // 重置拖拽元素样式
        if (this.dragState.draggedElement) {
            this.dragState.draggedElement.style.transform = '';
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
                
                // 重新渲染界面
                this.renderTaskPool();
                this.renderMatrix();
                this.updateStats();
                
                // 保存数据
                this.saveData();
                
                console.log('📱 触摸拖拽完成:', this.dragState.draggedTaskId, '→', targetLocation);
            }
        }
        
        // 重置拖拽状态
        this.dragState.isDragging = false;
        
        // 重新绑定事件
        setTimeout(() => {
            this.attachDragEvents();
        }, 50);
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
        
        // 检查是否是象限
        const quadrants = ['urgent-important', 'important', 'urgent', 'neither'];
        for (const quadrant of quadrants) {
            const quadrantElement = element.closest(`#${quadrant}-tasks`);
            if (quadrantElement) {
                return { element: quadrantElement, location: quadrant };
            }
        }
        
        return null;
    }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    if (window.EisenhowerMatrix) {
        window.EisenhowerMatrix.init();
    }
});

console.log('✅ 艾森豪威尔矩阵模块加载完成'); 