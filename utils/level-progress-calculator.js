/**
 * 等级进度计算器
 * 处理基于等级的项目进度计算和管理
 */

class LevelProgressCalculator {
    constructor() {
        this.historyProcessors = new Map();
        this.levelValidators = new Map();
        this.initializeDefaultProcessors();
    }

    /**
     * 初始化默认的历史记录处理器
     */
    initializeDefaultProcessors() {
        // 固定时间处理器
        this.historyProcessors.set('fixed_time', (logs, requirement) => {
            return logs.filter(log => {
                const logTime = new Date(log.date);
                const hour = logTime.getHours();
                const minute = logTime.getMinutes();
                const [reqHour, reqMinute] = requirement.time.split(':').map(Number);
                
                // 允许5分钟的误差
                const logMinutes = hour * 60 + minute;
                const reqMinutes = reqHour * 60 + reqMinute;
                return Math.abs(logMinutes - reqMinutes) <= 5;
            });
        });

        // 时间窗口处理器
        this.historyProcessors.set('time_window', (logs, requirement) => {
            return logs.filter(log => {
                const logTime = new Date(log.date);
                return this.isInTimeWindow(logTime, requirement.window);
            });
        });

        // 持续时间处理器
        this.historyProcessors.set('duration', (logs, requirement) => {
            return logs.filter(log => {
                return log.duration && log.duration >= requirement.minDuration;
            });
        });

        // 简单计数处理器
        this.historyProcessors.set('count', (logs, requirement) => {
            return logs; // 直接返回所有记录
        });
    }

    /**
     * 计算项目的等级进度
     * @param {Object} project - 项目对象
     * @param {Object} options - 计算选项
     * @returns {Object} 进度信息
     */
    calculateLevelProgress(project, options = {}) {
        const { 
            useHistoryRecords = null, // null表示需要询问用户
            startFromDate = null 
        } = options;

        // 获取项目相关的时间记录
        const allLogs = this.getProjectLogs(project);
        
        // 如果没有等级定义，使用传统计算方式
        if (!project.levels || !Array.isArray(project.levels)) {
            return this.calculateTraditionalProgress(project, allLogs);
        }

        // 确定计算起始时间
        const calculationStartDate = this.determineCalculationStartDate(
            project, 
            useHistoryRecords, 
            startFromDate
        );

        // 过滤时间记录
        const relevantLogs = allLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= calculationStartDate;
        });

        // 计算当前等级和进度
        return this.calculateCurrentLevelProgress(project, relevantLogs);
    }

    /**
     * 获取项目相关的时间记录
     */
    getProjectLogs(project) {
        const prodNames = this.getLinkedProductionNames(project);
        return (window.gameData?.timeLogs || []).filter(log => 
            prodNames.includes(log.name)
        );
    }

    /**
     * 获取关联的生产线名称
     */
    getLinkedProductionNames(project) {
        const prodNames = [];
        
        if (window.gameData?.productions) {
            const linkedProds = window.gameData.productions.filter(p => 
                p.linkedDev === project.researchName
            );
            prodNames.push(...linkedProds.map(p => p.name));
        }
        
        if (prodNames.length === 0 && project.prodName) {
            prodNames.push(project.prodName);
        }
        
        return prodNames;
    }

    /**
     * 确定计算起始时间
     */
    determineCalculationStartDate(project, useHistoryRecords, startFromDate) {
        if (startFromDate) {
            return new Date(startFromDate);
        }

        if (useHistoryRecords === false) {
            // 从项目开始时间计算
            return new Date(project.startDate || new Date());
        }

        if (useHistoryRecords === true) {
            // 使用所有历史记录
            return new Date(0); // 从最早开始
        }

        // 如果未指定，需要询问用户
        return new Date(project.startDate || new Date());
    }

    /**
     * 计算当前等级进度
     */
    calculateCurrentLevelProgress(project, logs) {
        const levels = project.levels;
        let currentLevel = project.currentLevel || 1;
        let completedLevels = 0;

        // 检查每个等级的完成情况
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const levelLogs = this.filterLogsForLevel(logs, level);
            const levelProgress = this.calculateLevelRequirements(level, levelLogs);

            if (levelProgress.completed) {
                completedLevels = i + 1;
                currentLevel = Math.min(i + 2, levels.length); // 解锁下一等级
            } else {
                // 当前等级未完成，返回当前等级的进度
                return {
                    currentLevel: i + 1,
                    totalLevels: levels.length,
                    completedLevels,
                    currentLevelProgress: levelProgress,
                    isCompleted: false,
                    nextLevel: i < levels.length - 1 ? levels[i + 1] : null
                };
            }
        }

        // 所有等级都已完成
        return {
            currentLevel: levels.length,
            totalLevels: levels.length,
            completedLevels: levels.length,
            currentLevelProgress: { completed: true, progress: 1, total: 1 },
            isCompleted: true,
            nextLevel: null
        };
    }

    /**
     * 过滤等级相关的记录
     */
    filterLogsForLevel(logs, level) {
        if (!level.dateRange) {
            return logs;
        }

        const startDate = new Date(level.dateRange.start);
        const endDate = new Date(level.dateRange.end);

        return logs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startDate && logDate <= endDate;
        });
    }

    /**
     * 计算等级要求完成情况
     */
    calculateLevelRequirements(level, logs) {
        const requirements = level.requirements || [];
        let completedRequirements = 0;
        let totalProgress = 0;
        let totalTarget = 0;

        for (const requirement of requirements) {
            const processor = this.historyProcessors.get(requirement.type);
            if (!processor) {
                console.warn(`未找到处理器: ${requirement.type}`);
                continue;
            }

            const matchingLogs = processor(logs, requirement);
            const target = requirement.target || requirement.count || 1;
            const progress = Math.min(matchingLogs.length, target);
            const isCompleted = progress >= target;

            if (isCompleted) {
                completedRequirements++;
            }

            totalProgress += progress;
            totalTarget += target;
        }

        return {
            completed: completedRequirements === requirements.length,
            completedRequirements,
            totalRequirements: requirements.length,
            progress: totalProgress,
            total: totalTarget,
            progressPercentage: totalTarget > 0 ? (totalProgress / totalTarget) * 100 : 0
        };
    }

    /**
     * 传统进度计算（兼容旧系统）
     */
    calculateTraditionalProgress(project, logs) {
        return {
            currentLevel: 1,
            totalLevels: 1,
            completedLevels: logs.length >= (project.target || 21) ? 1 : 0,
            currentLevelProgress: {
                completed: logs.length >= (project.target || 21),
                progress: logs.length,
                total: project.target || 21,
                progressPercentage: (logs.length / (project.target || 21)) * 100
            },
            isCompleted: logs.length >= (project.target || 21),
            nextLevel: null
        };
    }

    /**
     * 检查是否需要询问用户历史记录使用方式
     */
    shouldAskForHistoryUsage(project) {
        const logs = this.getProjectLogs(project);
        const projectStartDate = new Date(project.startDate || new Date());
        
        // 检查是否有项目开始前的记录
        const preProjectLogs = logs.filter(log => {
            const logDate = new Date(log.date);
            return logDate < projectStartDate;
        });

        return preProjectLogs.length > 0;
    }

    /**
     * 预测使用历史记录的结果
     */
    predictHistoryUsageResult(project) {
        const allLogs = this.getProjectLogs(project);
        
        if (!project.levels || !Array.isArray(project.levels)) {
            const target = project.target || 21;
            return {
                willComplete: allLogs.length >= target,
                completionLevel: Math.min(Math.floor(allLogs.length / target), 1),
                totalRecords: allLogs.length
            };
        }

        // 使用所有历史记录计算
        const result = this.calculateCurrentLevelProgress(project, allLogs);
        return {
            willComplete: result.isCompleted,
            completionLevel: result.completedLevels,
            currentLevel: result.currentLevel,
            totalRecords: allLogs.length
        };
    }

    /**
     * 检查时间是否在指定窗口内
     */
    isInTimeWindow(time, window) {
        const hour = time.getHours();
        const minute = time.getMinutes();
        const totalMinutes = hour * 60 + minute;

        const [startTime, endTime] = window.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const windowStart = startHour * 60 + startMinute;
        const windowEnd = endHour * 60 + endMinute;

        // 处理跨天的情况
        if (windowEnd < windowStart) {
            return totalMinutes >= windowStart || totalMinutes <= windowEnd;
        }

        return totalMinutes >= windowStart && totalMinutes <= windowEnd;
    }

    /**
     * 更新项目等级状态
     */
    updateProjectLevelStatus(project, progressResult) {
        // 更新当前等级
        project.currentLevel = progressResult.currentLevel;
        
        // 如果项目完成，标记为完成状态
        if (progressResult.isCompleted) {
            project.completed = true;
            project.completedAt = new Date().toISOString();
            
            // 如果是可重复项目，可以重置到下一个周期
            if (project.repeatable) {
                this.handleRepeatableProject(project);
            }
        }

        return project;
    }

    /**
     * 处理可重复项目
     */
    handleRepeatableProject(project) {
        // 创建新的周期
        const newCycle = {
            cycleNumber: (project.cycleNumber || 0) + 1,
            startDate: new Date().toISOString(),
            previousCycles: project.previousCycles || []
        };

        // 保存当前周期到历史
        newCycle.previousCycles.push({
            cycleNumber: project.cycleNumber || 0,
            completedAt: project.completedAt,
            completedLevels: project.currentLevel
        });

        // 重置项目状态
        project.currentLevel = 1;
        project.completed = false;
        project.completedAt = null;
        project.cycleNumber = newCycle.cycleNumber;
        project.previousCycles = newCycle.previousCycles;
        project.startDate = newCycle.startDate;
    }
}

// 导出到全局
window.LevelProgressCalculator = LevelProgressCalculator;
window.levelProgressCalculator = new LevelProgressCalculator();

console.log('✅ 等级进度计算器已加载'); 