/**
 * 错误处理中心 - Life Factory Manager Tool
 * 提供统一的错误处理、用户反馈和错误上报功能
 */

// 调试模式开关
window.DEBUG_MODE = false; // 设置为true可以看到更多调试信息

// 先创建ErrorUtils，避免循环依赖
window.ErrorUtils = {
    /**
     * 安全执行函数，自动捕获错误
     * @param {Function} fn - 要执行的函数
     * @param {Object} context - 错误上下文
     * @param {Function} fallback - 错误时的回调函数
     */
    safeExecute: (fn, context = {}, fallback = null) => {
        try {
            return fn();
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.handle(error, context);
            } else {
                console.error('Error occurred before error handler was initialized:', error);
            }
            if (fallback && typeof fallback === 'function') {
                return fallback(error);
            }
            return null;
        }
    },

    /**
     * 异步安全执行函数
     * @param {Function} asyncFn - 异步函数
     * @param {Object} context - 错误上下文
     * @param {Function} fallback - 错误时的回调函数
     */
    safeExecuteAsync: async (asyncFn, context = {}, fallback = null) => {
        try {
            return await asyncFn();
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.handle(error, context);
            } else {
                console.error('Error occurred before error handler was initialized:', error);
            }
            if (fallback && typeof fallback === 'function') {
                return fallback(error);
            }
            return null;
        }
    },

    /**
     * 验证数据格式
     * @param {*} data - 要验证的数据
     * @param {Object} schema - 验证模式
     */
    validateData: (data, schema) => {
        const errors = [];
        
        for (const [key, rules] of Object.entries(schema)) {
            if (rules.required && (data[key] === undefined || data[key] === null || data[key] === '')) {
                errors.push(`${key} 是必填项`);
            }
            
            if (data[key] !== undefined && data[key] !== null) {
                if (rules.type && typeof data[key] !== rules.type) {
                    errors.push(`${key} 类型错误，期望 ${rules.type}`);
                }
                
                if (rules.min && data[key] < rules.min) {
                    errors.push(`${key} 不能小于 ${rules.min}`);
                }
                
                if (rules.max && data[key] > rules.max) {
                    errors.push(`${key} 不能大于 ${rules.max}`);
                }
                
                if (rules.pattern && !rules.pattern.test(data[key])) {
                    errors.push(`${key} 格式不正确`);
                }
            }
        }
        
        if (errors.length > 0) {
            const error = new Error(errors.join(', '));
            if (window.errorHandler) {
                window.errorHandler.handle(error, { type: 'validation', errors });
            }
            return false;
        }
        
        return true;
    }
};

class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrorsPerSession = 10;
        this.errorLog = [];
        this.isInitialized = false;
        this.init();
    }

    /**
     * 初始化错误处理器
     */
    init() {
        if (this.isInitialized) return;
        
        // 捕获全局错误
        window.addEventListener('error', (event) => {
            // 过滤掉脚本错误和跨域错误
            if (event.message === 'Script error.' || event.filename === '') {
                return;
            }
            
            this.handle(event.error || new Error(event.message), {
                type: 'global',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handle(new Error(event.reason), {
                type: 'promise',
                promise: event.promise
            });
        });

        // 延迟设置Firebase错误处理，等待Firebase初始化
        setTimeout(() => {
            if (window.firebase) {
                this.setupFirebaseErrorHandling();
            }
        }, 2000);

        this.isInitialized = true;
        console.log('✅ 错误处理中心已初始化');
    }

    /**
     * 设置Firebase错误处理
     */
    setupFirebaseErrorHandling() {
        // 等待Firebase初始化完成
        if (window.firebase && firebase.apps && firebase.apps.length > 0) {
            // Firebase Auth 错误处理
            if (firebase.auth) {
                firebase.auth().onAuthStateChanged((user) => {
                    // 正常流程，不需要错误处理
                }, (error) => {
                    this.handle(error, { type: 'firebase-auth' });
                });
            }

            // Firestore 错误处理
            if (firebase.firestore) {
                // 监听Firestore错误
                const originalOnSnapshot = firebase.firestore().collection('test').onSnapshot;
                // 这里可以添加Firestore错误拦截逻辑
            }
        } else {
            // Firebase还未初始化，稍后重试
            setTimeout(() => {
                this.setupFirebaseErrorHandling();
            }, 1000);
        }
    }

    /**
     * 统一错误处理方法
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     */
    handle(error, context = {}) {
        this.errorCount++;
        
        // 记录错误
        const errorInfo = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errorLog.push(errorInfo);
        
        // 控制台输出（仅在调试模式下或重要错误时）
        if (window.DEBUG_MODE || context.type === 'data-save' || context.type === 'data-load') {
            console.error(`[${context.type || 'unknown'}] Error:`, error);
            console.error('Error Context:', context);
        }
        
        // 检查错误频率
        if (this.errorCount > this.maxErrorsPerSession) {
            if (window.DEBUG_MODE) {
                console.warn('错误频率过高，已停止显示用户提示');
            }
            return;
        }

        // 只对重要错误显示用户友好的错误信息
        if (context.type === 'data-save' || context.type === 'data-load' || 
            context.type === 'validation' || context.type === 'firebase-auth') {
            this.showUserFriendlyError(error, context);
        }
        
        // 错误上报（可选）
        this.reportError(errorInfo);
    }

    /**
     * 显示用户友好的错误信息
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     */
    showUserFriendlyError(error, context) {
        let userMessage = '操作失败，请稍后重试';
        let errorType = 'error';

        // 根据错误类型提供不同的用户提示
        if (context.type === 'firebase-auth') {
            userMessage = '登录状态异常，请重新登录';
            errorType = 'warning';
        } else if (context.type === 'data-save') {
            userMessage = '数据保存失败，请检查网络连接';
            errorType = 'error';
        } else if (context.type === 'data-load') {
            userMessage = '数据加载失败，请刷新页面重试';
            errorType = 'error';
        } else if (context.type === 'validation') {
            userMessage = error.message || '输入数据格式不正确';
            errorType = 'warning';
        } else if (context.type === 'network') {
            userMessage = '网络连接异常，请检查网络设置';
            errorType = 'error';
        }

        // 创建错误提示元素
        this.createErrorNotification(userMessage, errorType);
    }

    /**
     * 创建错误通知
     * @param {string} message - 错误消息
     * @param {string} type - 错误类型 (error, warning, info)
     */
    createErrorNotification(message, type = 'error') {
        // 检查document.body是否存在
        if (!document.body) {
            console.warn('Document body not ready, cannot show error notification');
            return;
        }

        // 移除现有的错误通知
        const existingNotifications = document.querySelectorAll('.error-notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        const notification = document.createElement('div');
        notification.className = `error-notification error-notification-${type}`;
        notification.innerHTML = `
            <div class="error-notification-content">
                <span class="error-notification-icon">
                    ${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span class="error-notification-message">${message}</span>
                <button class="error-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // 添加样式
        this.addNotificationStyles();

        // 插入到页面
        document.body.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 添加通知样式
     */
    addNotificationStyles() {
        if (document.getElementById('error-notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'error-notification-styles';
        style.textContent = `
            .error-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideInRight 0.3s ease-out;
            }

            .error-notification-error {
                background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
                color: white;
            }

            .error-notification-warning {
                background: linear-gradient(135deg, #f7b731, #f79d00);
                color: white;
            }

            .error-notification-info {
                background: linear-gradient(135deg, #4ecdc4, #44a08d);
                color: white;
            }

            .error-notification-content {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                gap: 8px;
            }

            .error-notification-icon {
                font-size: 16px;
                flex-shrink: 0;
            }

            .error-notification-message {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
            }

            .error-notification-close {
                background: none;
                border: none;
                color: inherit;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .error-notification-close:hover {
                background-color: rgba(255,255,255,0.2);
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 错误上报（可选功能）
     * @param {Object} errorInfo - 错误信息
     */
    reportError(errorInfo) {
        // 这里可以集成错误上报服务，如Sentry、Bugsnag等
        // 目前只是记录到控制台
        if (window.DEBUG_MODE) {
            console.log('Error Report:', errorInfo);
        }
    }

    /**
     * 获取错误统计
     */
    getErrorStats() {
        return {
            totalErrors: this.errorCount,
            errorLog: this.errorLog,
            isHealthy: this.errorCount < this.maxErrorsPerSession
        };
    }

    /**
     * 清除错误日志
     */
    clearErrorLog() {
        this.errorLog = [];
        this.errorCount = 0;
    }
}

// 创建全局错误处理器实例
window.errorHandler = new ErrorHandler();

// 导出错误处理函数供其他模块使用
window.handleError = (error, context) => {
    window.errorHandler.handle(error, context);
};

window.showError = (message, type = 'error') => {
    window.errorHandler.createErrorNotification(message, type);
};

console.log('✅ 错误处理模块已加载'); 