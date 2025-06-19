/**
 * 性能优化模块 - Life Factory Manager Tool
 * 提供防抖、节流、渲染优化、虚拟滚动、数据缓存等功能
 */

class PerformanceOptimizer {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.renderQueue = new Set();
        this.isRendering = false;
        this.dataCache = new Map();
        this.cacheExpiry = new Map();
        this.performanceMetrics = {
            renderCount: 0,
            renderTime: 0,
            lastRenderTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        this.virtualScrollConfig = {
            itemHeight: 60,
            containerHeight: 400,
            overscan: 5
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

        // 定期清理过期缓存
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 60000); // 每分钟清理一次

        // 监听内存使用情况
        if ('memory' in performance) {
            setInterval(() => {
                this.monitorMemoryUsage();
            }, 30000); // 每30秒监控一次
        }

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
     * 数据缓存系统
     * @param {string} key - 缓存键
     * @param {Function} getter - 获取数据的函数
     * @param {number} ttl - 缓存时间（毫秒）
     * @returns {*} 缓存的数据
     */
    cache(key, getter, ttl = 300000) { // 默认5分钟
        const now = Date.now();
        const expiry = this.cacheExpiry.get(key);
        
        // 检查缓存是否有效
        if (this.dataCache.has(key) && expiry && now < expiry) {
            this.performanceMetrics.cacheHits++;
            return this.dataCache.get(key);
        }
        
        // 缓存未命中，执行getter函数
        this.performanceMetrics.cacheMisses++;
        const data = getter();
        
        // 存储数据和过期时间
        this.dataCache.set(key, data);
        this.cacheExpiry.set(key, now + ttl);
        
        return data;
    }

    /**
     * 清理过期缓存
     */
    cleanupExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        
        this.cacheExpiry.forEach((expiry, key) => {
            if (now >= expiry) {
                expiredKeys.push(key);
            }
        });
        
        expiredKeys.forEach(key => {
            this.dataCache.delete(key);
            this.cacheExpiry.delete(key);
        });
        
        if (expiredKeys.length > 0) {
            console.log(`清理了 ${expiredKeys.length} 个过期缓存`);
        }
    }

    /**
     * 虚拟滚动优化
     * @param {Array} items - 数据项数组
     * @param {number} scrollTop - 滚动位置
     * @param {number} containerHeight - 容器高度
     * @param {number} itemHeight - 每项高度
     * @returns {Object} 虚拟滚动信息
     */
    virtualScroll(items, scrollTop, containerHeight, itemHeight = this.virtualScrollConfig.itemHeight) {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(containerHeight / itemHeight) + this.virtualScrollConfig.overscan,
            items.length
        );
        
        const visibleItems = items.slice(startIndex, endIndex);
        const totalHeight = items.length * itemHeight;
        const offsetY = startIndex * itemHeight;
        
        return {
            items: visibleItems,
            startIndex,
            endIndex,
            totalHeight,
            offsetY
        };
    }

    /**
     * DOM操作优化 - 批量更新
     * @param {Element} container - 容器元素
     * @param {Array} updates - 更新操作数组
     */
    batchDOMUpdates(container, updates) {
        // 使用 DocumentFragment 减少重排
        const fragment = document.createDocumentFragment();
        
        updates.forEach(update => {
            if (typeof update === 'function') {
                update(fragment);
            }
        });
        
        // 一次性更新DOM
        container.appendChild(fragment);
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 清除相关缓存
        this.clearCacheByPattern('layout');
        
        // 重新计算布局相关的渲染
        this.batchRender(() => {
            if (typeof updateBottomRowLayout === 'function') {
                updateBottomRowLayout();
            }
        }, 'layout');
    }

    /**
     * 按模式清除缓存
     * @param {string} pattern - 缓存键模式
     */
    clearCacheByPattern(pattern) {
        const keysToDelete = [];
        this.dataCache.forEach((value, key) => {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => {
            this.dataCache.delete(key);
            this.cacheExpiry.delete(key);
        });
    }

    /**
     * 监控内存使用情况
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
            const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
            
            // 如果内存使用超过80%，进行清理
            if (usedMB / limitMB > 0.8) {
                console.warn(`内存使用率过高: ${usedMB}MB/${limitMB}MB (${(usedMB/limitMB*100).toFixed(1)}%)`);
                this.emergencyCleanup();
            }
        }
    }

    /**
     * 紧急清理
     */
    emergencyCleanup() {
        console.log('执行紧急内存清理...');
        
        // 清理所有缓存
        this.dataCache.clear();
        this.cacheExpiry.clear();
        
        // 清理定时器
        this.pauseOptimizations();
        
        // 强制垃圾回收（如果支持）
        if (window.gc) {
            window.gc();
        }
        
        console.log('紧急清理完成');
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
            cacheHitRate: (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) > 0
                ? this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)
                : 0,
            activeDebounceTimers: this.debounceTimers.size,
            activeThrottleTimers: this.throttleTimers.size,
            renderQueueSize: this.renderQueue.size,
            cacheSize: this.dataCache.size
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.pauseOptimizations();
        this.renderQueue.clear();
        this.isRendering = false;
        this.dataCache.clear();
        this.cacheExpiry.clear();
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

window.cache = (key, getter, ttl) => {
    return window.performanceOptimizer.cache(key, getter, ttl);
};

// 创建常用的防抖函数
window.debouncedSave = window.debounce(() => {
    if (typeof saveToCloud === 'function') {
        saveToCloud();
    }
}, 1000, 'saveToCloud');

window.debouncedRender = window.debounce((renderFunc) => {
    if (typeof renderFunc === 'function') {
        renderFunc();
    }
}, 100, 'render');

// 导出性能监控函数
window.getPerformanceMetrics = () => {
    return window.performanceOptimizer.getPerformanceMetrics();
};

console.log('🚀 高级性能优化模块已加载'); 