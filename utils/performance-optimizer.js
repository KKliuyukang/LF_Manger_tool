/**
 * 性能优化模块 - Life Factory Manager Tool
 * 提供防抖、节流、渲染优化等功能
 */

class PerformanceOptimizer {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.renderQueue = new Set();
        this.isRendering = false;
        this.performanceMetrics = {
            renderCount: 0,
            renderTime: 0,
            lastRenderTime: 0
        };
        this.init();
    }

    /**
     * 初始化性能优化器
     */
    init() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseOptimizations();
            } else {
                this.resumeOptimizations();
            }
        });

        // 监听窗口大小变化
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        console.log('✅ 性能优化模块已初始化');
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @param {string} key - 防抖标识符
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait = 300, key = null) {
        const timerKey = key || func.name || 'anonymous';
        
        return (...args) => {
            if (this.debounceTimers.has(timerKey)) {
                clearTimeout(this.debounceTimers.get(timerKey));
            }
            
            const timer = setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(timerKey);
            }, wait);
            
            this.debounceTimers.set(timerKey, timer);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 时间限制（毫秒）
     * @param {string} key - 节流标识符
     * @returns {Function} 节流后的函数
     */
    throttle(func, limit = 100, key = null) {
        const timerKey = key || func.name || 'anonymous';
        
        return (...args) => {
            if (!this.throttleTimers.has(timerKey)) {
                func.apply(this, args);
                this.throttleTimers.set(timerKey, setTimeout(() => {
                    this.throttleTimers.delete(timerKey);
                }, limit));
            }
        };
    }

    /**
     * 批量渲染优化
     * @param {Function} renderFunction - 渲染函数
     * @param {string} key - 渲染标识符
     */
    batchRender(renderFunction, key = null) {
        const renderKey = key || renderFunction.name || 'anonymous';
        this.renderQueue.add(renderKey);
        
        if (!this.isRendering) {
            this.processRenderQueue();
        }
    }

    /**
     * 处理渲染队列
     */
    processRenderQueue() {
        if (this.renderQueue.size === 0) {
            this.isRendering = false;
            return;
        }

        this.isRendering = true;
        const startTime = performance.now();

        // 使用 requestAnimationFrame 确保在下一帧执行
        requestAnimationFrame(() => {
            const renderFunctions = Array.from(this.renderQueue);
            this.renderQueue.clear();

            // 执行所有渲染函数
            renderFunctions.forEach(key => {
                const renderFunction = window[`render${key.charAt(0).toUpperCase() + key.slice(1)}`];
                if (typeof renderFunction === 'function') {
                    try {
                        renderFunction();
                    } catch (error) {
                        window.handleError(error, { type: 'render', function: key });
                    }
                }
            });

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // 更新性能指标
            this.performanceMetrics.renderCount++;
            this.performanceMetrics.renderTime += renderTime;
            this.performanceMetrics.lastRenderTime = renderTime;

            // 如果渲染时间过长，记录警告
            if (renderTime > 16) { // 超过一帧的时间（60fps = 16.67ms）
                console.warn(`渲染时间过长: ${renderTime.toFixed(2)}ms`);
            }

            this.isRendering = false;
            
            // 检查是否还有新的渲染请求
            if (this.renderQueue.size > 0) {
                this.processRenderQueue();
            }
        });
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 重新计算布局相关的渲染
        this.batchRender(() => {
            if (typeof updateBottomRowLayout === 'function') {
                updateBottomRowLayout();
            }
        }, 'layout');
    }

    /**
     * 暂停优化
     */
    pauseOptimizations() {
        // 清除所有定时器
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        this.throttleTimers.forEach(timer => clearTimeout(timer));
        this.throttleTimers.clear();
    }

    /**
     * 恢复优化
     */
    resumeOptimizations() {
        // 重新初始化必要的优化
        console.log('页面重新可见，恢复性能优化');
    }

    /**
     * 测量函数执行时间
     * @param {Function} func - 要测量的函数
     * @param {string} name - 函数名称
     * @returns {*} 函数执行结果
     */
    measurePerformance(func, name = 'unknown') {
        const startTime = performance.now();
        const result = func();
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (duration > 10) { // 超过10ms的函数记录
            console.log(`[性能] ${name} 执行时间: ${duration.toFixed(2)}ms`);
        }

        return result;
    }

    /**
     * 获取性能指标
     * @returns {Object} 性能指标
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            averageRenderTime: this.performanceMetrics.renderCount > 0 
                ? this.performanceMetrics.renderTime / this.performanceMetrics.renderCount 
                : 0,
            activeDebounceTimers: this.debounceTimers.size,
            activeThrottleTimers: this.throttleTimers.size,
            renderQueueSize: this.renderQueue.size
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.pauseOptimizations();
        this.renderQueue.clear();
        this.isRendering = false;
    }
}

// 创建全局性能优化器实例
window.performanceOptimizer = new PerformanceOptimizer();

// 导出优化函数供其他模块使用
window.debounce = (func, wait, key) => {
    return window.performanceOptimizer.debounce(func, wait, key);
};

window.throttle = (func, limit, key) => {
    return window.performanceOptimizer.throttle(func, limit, key);
};

window.batchRender = (renderFunction, key) => {
    return window.performanceOptimizer.batchRender(renderFunction, key);
};

window.measurePerformance = (func, name) => {
    return window.performanceOptimizer.measurePerformance(func, name);
};

// 创建常用的防抖函数
window.debouncedSave = window.debounce(() => {
    if (typeof saveToCloud === 'function') {
        saveToCloud();
    }
}, 1000, 'saveToCloud');

window.debouncedRender = window.debounce(() => {
    if (typeof renderProductions === 'function') {
        renderProductions();
    }
    if (typeof renderResourceStats === 'function') {
        renderResourceStats();
    }
}, 300, 'render');

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    window.performanceOptimizer.cleanup();
});

console.log('✅ 性能优化模块已加载'); 