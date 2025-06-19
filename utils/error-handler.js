/**
 * 错误处理与用户体验优化模块 - Life Factory Manager Tool
 * 提供统一的错误处理、通知系统、加载状态管理等功能
 */

// 调试模式开关
window.DEBUG_MODE = false; // 设置为true可以看到更多调试信息

class ErrorUtils {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 5;
        this.errorTimeout = 30000; // 30秒重置错误计数
        this.notifications = [];
        this.loadingStates = new Map();
        this.init();
    }

    /**
     * 初始化错误处理系统
     */
    init() {
        // 全局错误捕获
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message), {
                type: 'global',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Promise错误捕获
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: 'promise',
                promise: event.promise
            });
        });

        // 定期重置错误计数
        setInterval(() => {
            this.errorCount = 0;
        }, this.errorTimeout);

        console.log('✅ 错误处理与用户体验优化模块已初始化');
    }

    /**
     * 统一错误处理
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @param {Function} fallback - 错误恢复函数
     */
    handleError(error, context = {}, fallback = null) {
        this.errorCount++;
        
        // 过滤掉一些常见的无害错误
        if (this.shouldIgnoreError(error, context)) {
            return;
        }

        console.error('🚨 错误详情:', {
            message: error.message,
            stack: error.stack,
            context: context,
            count: this.errorCount
        });

        // 显示用户友好的错误信息
        this.showNotification(
            this.getUserFriendlyMessage(error, context),
            'error',
            5000
        );

        // 如果错误过多，显示调试模式提示
        if (this.errorCount >= this.maxErrors) {
            this.showNotification(
                '检测到多个错误，建议刷新页面或检查网络连接',
                'warning',
                8000
            );
        }

        // 执行错误恢复函数
        if (typeof fallback === 'function') {
            try {
                fallback();
            } catch (fallbackError) {
                console.error('错误恢复函数执行失败:', fallbackError);
            }
        }
    }

    /**
     * 判断是否应该忽略错误
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @returns {boolean} 是否忽略
     */
    shouldIgnoreError(error, context) {
        const ignorePatterns = [
            /Script error/,
            /ResizeObserver loop limit exceeded/,
            /Network request failed/,
            /Failed to fetch/,
            /Chrome extension/,
            /DevTools/,
            /Extension context/,
            /moz-extension/,
            /chrome-extension/
        ];

        return ignorePatterns.some(pattern => 
            pattern.test(error.message) || 
            (context.filename && pattern.test(context.filename))
        );
    }

    /**
     * 获取用户友好的错误信息
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @returns {string} 用户友好的消息
     */
    getUserFriendlyMessage(error, context) {
        const messages = {
            'NetworkError': '网络连接失败，请检查网络设置',
            'TypeError': '数据格式错误，请刷新页面重试',
            'ReferenceError': '页面加载异常，请刷新页面',
            'SyntaxError': '代码执行错误，请刷新页面',
            'render': '界面渲染失败，请刷新页面',
            'data-save': '数据保存失败，请重试',
            'data-load': '数据加载失败，请检查网络连接'
        };

        if (context.type && messages[context.type]) {
            return messages[context.type];
        }

        if (error.name && messages[error.name]) {
            return messages[error.name];
        }

        return '操作失败，请重试';
    }

    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型 (success, error, warning, info)
     * @param {number} duration - 显示时长（毫秒）
     */
    showNotification(message, type = 'info', duration = 4000) {
        const notification = this.createNotification(message, type);
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }

        // 存储通知引用
        this.notifications.push(notification);

        // 限制通知数量
        if (this.notifications.length > 5) {
            const oldNotification = this.notifications.shift();
            if (oldNotification && oldNotification.parentNode) {
                oldNotification.parentNode.removeChild(oldNotification);
            }
        }
    }

    /**
     * 创建通知元素
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型
     * @returns {HTMLElement} 通知元素
     */
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icons[type] || icons.info}</div>
                <div class="notification-text">${message}</div>
                <button class="notification-close" onclick="window.ErrorUtils.hideNotification(this.parentElement.parentElement)">×</button>
            </div>
        `;

        return notification;
    }

    /**
     * 隐藏通知
     * @param {HTMLElement} notification - 通知元素
     */
    hideNotification(notification) {
        if (!notification) return;
        
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            // 从数组中移除
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    /**
     * 显示加载状态
     * @param {string} key - 加载状态标识
     * @param {string} message - 加载消息
     * @param {boolean} fullscreen - 是否全屏加载
     */
    showLoading(key, message = '加载中...', fullscreen = false) {
        if (this.loadingStates.has(key)) {
            return; // 已存在加载状态
        }

        const loadingElement = this.createLoadingElement(message, fullscreen);
        document.body.appendChild(loadingElement);

        this.loadingStates.set(key, loadingElement);

        // 显示动画
        setTimeout(() => {
            loadingElement.style.opacity = '1';
        }, 100);
    }

    /**
     * 创建加载元素
     * @param {string} message - 加载消息
     * @param {boolean} fullscreen - 是否全屏
     * @returns {HTMLElement} 加载元素
     */
    createLoadingElement(message, fullscreen) {
        const loading = document.createElement('div');
        loading.className = fullscreen ? 'loading-overlay' : 'loading-inline';
        loading.style.opacity = '0';
        loading.style.transition = 'opacity 0.3s ease';

        if (fullscreen) {
            loading.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${message}</div>
                </div>
            `;
        } else {
            loading.innerHTML = `
                <div class="loading-spinner"></div>
                <span style="margin-left: 8px;">${message}</span>
            `;
        }

        return loading;
    }

    /**
     * 隐藏加载状态
     * @param {string} key - 加载状态标识
     */
    hideLoading(key) {
        const loadingElement = this.loadingStates.get(key);
        if (!loadingElement) return;

        loadingElement.style.opacity = '0';
        setTimeout(() => {
            if (loadingElement.parentNode) {
                loadingElement.parentNode.removeChild(loadingElement);
            }
            this.loadingStates.delete(key);
        }, 300);
    }

    /**
     * 显示骨架屏
     * @param {HTMLElement} container - 容器元素
     * @param {number} itemCount - 骨架项数量
     */
    showSkeleton(container, itemCount = 3) {
        if (!container) return;

        const skeletonHTML = Array(itemCount).fill(`
            <div class="skeleton-item" style="padding: 12px; margin-bottom: 8px;">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text" style="width: 60%;"></div>
            </div>
        `).join('');

        container.innerHTML = skeletonHTML;
    }

    /**
     * 隐藏骨架屏
     * @param {HTMLElement} container - 容器元素
     */
    hideSkeleton(container) {
        if (!container) return;
        
        // 添加淡入动画
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            container.style.opacity = '1';
        }, 100);
    }

    /**
     * 安全执行函数
     * @param {Function} func - 要执行的函数
     * @param {Object} context - 执行上下文
     * @param {Function} fallback - 错误恢复函数
     * @returns {*} 函数执行结果
     */
    safeExecute(func, context = {}, fallback = null) {
        try {
            return func();
        } catch (error) {
            this.handleError(error, context, fallback);
            return null;
        }
    }

    /**
     * 安全执行异步函数
     * @param {Function} asyncFunc - 要执行的异步函数
     * @param {Object} context - 执行上下文
     * @param {Function} fallback - 错误恢复函数
     * @returns {Promise} 异步执行结果
     */
    async safeExecuteAsync(asyncFunc, context = {}, fallback = null) {
        try {
            return await asyncFunc();
        } catch (error) {
            this.handleError(error, context, fallback);
            return null;
        }
    }

    /**
     * 添加按钮点击反馈
     * @param {HTMLElement} button - 按钮元素
     */
    addButtonFeedback(button) {
        if (!button) return;

        button.addEventListener('click', () => {
            button.classList.add('btn-click-feedback');
            setTimeout(() => {
                button.classList.remove('btn-click-feedback');
            }, 200);
        });
    }

    /**
     * 添加成功动画
     * @param {HTMLElement} element - 目标元素
     */
    addSuccessAnimation(element) {
        if (!element) return;

        element.classList.add('success-animation');
        setTimeout(() => {
            element.classList.remove('success-animation');
        }, 600);
    }

    /**
     * 添加错误动画
     * @param {HTMLElement} element - 目标元素
     */
    addErrorAnimation(element) {
        if (!element) return;

        element.classList.add('error-animation');
        setTimeout(() => {
            element.classList.remove('error-animation');
        }, 600);
    }

    /**
     * 显示空状态
     * @param {HTMLElement} container - 容器元素
     * @param {string} icon - 图标
     * @param {string} text - 主文本
     * @param {string} subtext - 副文本
     */
    showEmptyState(container, icon = '📭', text = '暂无数据', subtext = '') {
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <div class="empty-state-text">${text}</div>
                ${subtext ? `<div class="empty-state-subtext">${subtext}</div>` : ''}
            </div>
        `;
    }

    /**
     * 清理所有通知
     */
    clearAllNotifications() {
        this.notifications.forEach(notification => {
            this.hideNotification(notification);
        });
        this.notifications = [];
    }

    /**
     * 清理所有加载状态
     */
    clearAllLoading() {
        this.loadingStates.forEach((element, key) => {
            this.hideLoading(key);
        });
        this.loadingStates.clear();
    }
}

// 创建全局错误处理实例
window.ErrorUtils = new ErrorUtils();

// 导出便捷函数
window.showNotification = (message, type, duration) => {
    window.ErrorUtils.showNotification(message, type, duration);
};

window.showLoading = (key, message, fullscreen) => {
    window.ErrorUtils.showLoading(key, message, fullscreen);
};

window.hideLoading = (key) => {
    window.ErrorUtils.hideLoading(key);
};

window.showSkeleton = (container, itemCount) => {
    window.ErrorUtils.showSkeleton(container, itemCount);
};

window.hideSkeleton = (container) => {
    window.ErrorUtils.hideSkeleton(container);
};

console.log('🎨 用户体验优化模块已加载'); 