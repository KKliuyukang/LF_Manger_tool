// Blueprint Automation Manager - 蓝图自动化管理模块
// 负责自动生成和管理自动化类型的蓝图

class BlueprintAutomationManager {
    constructor() {
        this.isGenerating = false;
        this.defaultTimeSlots = {
            exercise: { hour: 7, minute: 0 },    // 锻炼类：早上7点
            study: { hour: 20, minute: 0 },      // 学习类：晚上8点
            work: { hour: 9, minute: 0 },        // 工作类：上午9点
            lifestyle: { hour: 10, minute: 0 }, // 生活类：上午10点
            default: { hour: 9, minute: 0 }     // 默认：上午9点
        };
    }

    // 主要生成函数
    async generateAutomationBlueprints(options = {}) {
        if (this.isGenerating) {
            console.log('⚠️ 蓝图生成正在进行中，跳过此次请求');
            return;
        }

        this.isGenerating = true;
        
        try {
            const settings = this.getSettings();
            if (!settings.enabled) {
                console.log('🔄 自动化蓝图生成已禁用');
                return;
            }

            const range = options.range || settings.globalSettings.generationRange;
            const automationProjects = this.getAutomationProjects();
            
            if (automationProjects.length === 0) {
                console.log('📝 无自动化项目需要生成蓝图');
                return;
            }

            console.log(`🎯 开始为未来${range}天生成蓝图，自动化项目：${automationProjects.length}个`);
            
            const generatedBlueprints = [];
            const dateRange = this.generateDateRange(range);
            
            for (const project of automationProjects) {
                const projectBlueprints = await this.generateProjectBlueprints(project, dateRange);
                generatedBlueprints.push(...projectBlueprints);
            }

            // 处理时间冲突
            const resolvedBlueprints = this.resolveTimeConflicts(generatedBlueprints);
            
            // 保存蓝图
            this.saveBlueprintsToGame(resolvedBlueprints);
            
            // 记录生成日志
            this.logGeneration(resolvedBlueprints, automationProjects);
            
            console.log(`✅ 成功生成${resolvedBlueprints.length}个自动化蓝图`);
            
            // 刷新界面
            if (window.renderWeekCalendar) {
                window.renderWeekCalendar();
            }
            
            return resolvedBlueprints;
            
        } catch (error) {
            console.error('❌ 生成自动化蓝图失败:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    // 获取自动化项目
    getAutomationProjects() {
        const productions = window.gameData?.productions || [];
        return productions.filter(prod => 
            prod.type === 'automation' && 
            !prod.paused &&
            prod.freq // 确保有频率设置
        );
    }

    // 生成日期范围
    generateDateRange(days) {
        const dates = [];
        const today = new Date();
        
        for (let i = 1; i <= days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date);
        }
        
        return dates;
    }

    // 为单个项目生成蓝图
    async generateProjectBlueprints(project, dateRange) {
        const blueprints = [];
        const requiredDates = this.calculateRequiredDates(project, dateRange);
        
        for (const date of requiredDates) {
            const blueprint = await this.createBlueprint(project, date);
            if (blueprint) {
                blueprints.push(blueprint);
            }
        }
        
        return blueprints;
    }

    // 计算需要生成蓝图的日期
    calculateRequiredDates(project, dateRange) {
        const requiredDates = [];
        const freq = project.freq;
        
        if (freq === '每天') {
            return dateRange; // 每天都需要
        }
        
        // 解析频率
        const weeklyMatch = freq.match(/每周(\d+)次/);
        if (weeklyMatch) {
            const timesPerWeek = parseInt(weeklyMatch[1]);
            return this.distributeWeekly(dateRange, timesPerWeek);
        }
        
        const monthlyMatch = freq.match(/每月(\d+)次/);
        if (monthlyMatch) {
            const timesPerMonth = parseInt(monthlyMatch[1]);
            return this.distributeMonthly(dateRange, timesPerMonth);
        }
        
        const intervalMatch = freq.match(/每(\d+)天/);
        if (intervalMatch) {
            const interval = parseInt(intervalMatch[1]);
            return this.distributeByInterval(dateRange, interval, project);
        }
        
        // 默认：每天
        return dateRange;
    }

    // 在一周内均匀分布
    distributeWeekly(dateRange, timesPerWeek) {
        const result = [];
        const weeks = this.groupDatesByWeek(dateRange);
        
        for (const week of weeks) {
            const selected = this.selectDatesFromWeek(week, timesPerWeek);
            result.push(...selected);
        }
        
        return result;
    }

    // 在一月内均匀分布  
    distributeMonthly(dateRange, timesPerMonth) {
        const result = [];
        const months = this.groupDatesByMonth(dateRange);
        
        for (const month of months) {
            const selected = this.selectDatesFromMonth(month, timesPerMonth);
            result.push(...selected);
        }
        
        return result;
    }

    // 按间隔分布
    distributeByInterval(dateRange, interval, project) {
        const result = [];
        const lastExecuted = this.getLastExecutionDate(project);
        let nextDate = lastExecuted ? new Date(lastExecuted) : new Date();
        
        for (const date of dateRange) {
            if (date >= nextDate) {
                result.push(date);
                nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + interval);
            }
        }
        
        return result;
    }

    // 创建蓝图对象
    async createBlueprint(project, date) {
        const optimalTime = await this.calculateOptimalTime(project, date);
        const duration = this.calculateDuration(project);
        
        return {
            id: `auto_bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: project.name,
            category: project.type, // 'automation'
            scheduledDate: new Date(date.setHours(optimalTime.hour, optimalTime.minute, 0, 0)).toISOString(),
            duration: duration,
            priority: this.calculatePriority(project),
            status: 'planned',
            autoGenerated: true, // 标记为自动生成
            sourceProject: project.name,
            generatedAt: new Date().toISOString()
        };
    }

    // 计算最优时间
    async calculateOptimalTime(project, date) {
        // 1. 检查历史数据
        const historicalTime = this.analyzeHistoricalTime(project);
        if (historicalTime) {
            return historicalTime;
        }
        
        // 2. 使用默认时间规则
        const category = this.categorizeProject(project);
        let defaultTime = this.defaultTimeSlots[category] || this.defaultTimeSlots.default;
        
        // 3. 检查时间冲突
        const availableTime = await this.findAvailableTime(defaultTime, date, project);
        
        return availableTime;
    }

    // 分析历史执行时间
    analyzeHistoricalTime(project) {
        const timeLogs = window.gameData?.timeLogs || [];
        const projectLogs = timeLogs
            .filter(log => log.name === project.name)
            .slice(-30); // 最近30次记录
        
        if (projectLogs.length < 3) {
            return null; // 历史数据不足
        }
        
        // 统计各时段的执行次数和成功率
        const timeStats = {};
        
        projectLogs.forEach(log => {
            const hour = log.hour || 9;
            const timeSlot = `${hour}:00`;
            
            if (!timeStats[timeSlot]) {
                timeStats[timeSlot] = { count: 0, success: 0 };
            }
            
            timeStats[timeSlot].count++;
            if (log.completed !== false) { // 假设未明确标记为失败就算成功
                timeStats[timeSlot].success++;
            }
        });
        
        // 找出成功率最高的时段
        let bestTime = null;
        let bestScore = 0;
        
        for (const [timeSlot, stats] of Object.entries(timeStats)) {
            const successRate = stats.success / stats.count;
            const score = successRate * Math.log(stats.count + 1); // 考虑频次
            
            if (score > bestScore) {
                bestScore = score;
                bestTime = timeSlot;
            }
        }
        
        if (bestTime) {
            const [hour, minute] = bestTime.split(':').map(Number);
            return { hour, minute };
        }
        
        return null;
    }

    // 项目分类
    categorizeProject(project) {
        const name = project.name.toLowerCase();
        
        if (name.includes('锻炼') || name.includes('运动') || name.includes('健身')) {
            return 'exercise';
        }
        if (name.includes('学习') || name.includes('阅读') || name.includes('课程')) {
            return 'study';
        }
        if (name.includes('工作') || name.includes('项目') || name.includes('任务')) {
            return 'work';
        }
        if (name.includes('生活') || name.includes('家务') || name.includes('购物')) {
            return 'lifestyle';
        }
        
        return 'default';
    }

    // 查找可用时间
    async findAvailableTime(preferredTime, date, project) {
        const settings = this.getSettings();
        const flexWindow = 120; // 弹性窗口2小时
        
        // 检查偏好时间是否可用
        if (this.isTimeAvailable(preferredTime, date)) {
            return preferredTime;
        }
        
        // 在弹性窗口内寻找可用时间
        for (let offset = 15; offset <= flexWindow; offset += 15) {
            // 向后尝试
            const laterTime = {
                hour: preferredTime.hour,
                minute: preferredTime.minute + offset
            };
            if (laterTime.minute >= 60) {
                laterTime.hour += Math.floor(laterTime.minute / 60);
                laterTime.minute = laterTime.minute % 60;
            }
            
            if (this.isTimeAvailable(laterTime, date)) {
                return laterTime;
            }
            
            // 向前尝试
            const earlierTime = {
                hour: preferredTime.hour,
                minute: preferredTime.minute - offset
            };
            if (earlierTime.minute < 0) {
                earlierTime.hour -= Math.ceil(Math.abs(earlierTime.minute) / 60);
                earlierTime.minute = (earlierTime.minute % 60 + 60) % 60;
            }
            
            if (earlierTime.hour >= 0 && this.isTimeAvailable(earlierTime, date)) {
                return earlierTime;
            }
        }
        
        // 找不到合适时间，返回原时间（后续处理冲突）
        return preferredTime;
    }

    // 检查时间是否可用
    isTimeAvailable(time, date) {
        const settings = this.getSettings();
        const { protectedHours } = settings.globalSettings;
        
        // 检查是否在保护时段
        if (this.isInProtectedHours(time, protectedHours)) {
            return false;
        }
        
        // 检查是否与现有蓝图冲突
        return !this.hasTimeConflict(time, date);
    }

    // 检查是否在保护时段
    isInProtectedHours(time, protectedHours) {
        const hour = time.hour;
        
        // 睡眠时间
        if (protectedHours.sleepStart > protectedHours.sleepEnd) {
            // 跨天睡眠，如22:00-7:00
            if (hour >= protectedHours.sleepStart || hour < protectedHours.sleepEnd) {
                return true;
            }
        } else {
            // 同天睡眠
            if (hour >= protectedHours.sleepStart && hour < protectedHours.sleepEnd) {
                return true;
            }
        }
        
        // 午休时间
        const lunch = protectedHours.lunchBreak;
        if (hour >= lunch.start && hour < lunch.end) {
            return true;
        }
        
        return false;
    }

    // 检查时间冲突
    hasTimeConflict(time, date) {
        const dateStr = this.formatDateLocal(date);
        const startMinutes = time.hour * 60 + time.minute;
        
        // 检查现有蓝图
        const existingBlueprints = window.gameData?.blueprints || [];
        for (const blueprint of existingBlueprints) {
            const bpDate = new Date(blueprint.scheduledDate);
            const bpDateStr = this.formatDateLocal(bpDate);
            
            if (bpDateStr === dateStr) {
                const bpStartMinutes = bpDate.getHours() * 60 + bpDate.getMinutes();
                const bpEndMinutes = bpStartMinutes + blueprint.duration;
                
                // 检查重叠（给15分钟缓冲）
                if (Math.abs(startMinutes - bpStartMinutes) < 15) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // 其他辅助方法...
    getSettings() {
        return window.gameData?.blueprintAutomation || {};
    }

    formatDateLocal(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    calculateDuration(project) {
        // 基于历史数据计算平均时长
        const timeLogs = window.gameData?.timeLogs || [];
        const projectLogs = timeLogs
            .filter(log => log.name === project.name && log.timeCost)
            .slice(-10);
        
        if (projectLogs.length > 0) {
            const avgDuration = projectLogs.reduce((sum, log) => sum + log.timeCost, 0) / projectLogs.length;
            return Math.round(avgDuration);
        }
        
        // 默认时长
        return 30;
    }

    calculatePriority(project) {
        // 基于项目重要性和紧急程度计算优先级
        return project.priority || 'medium';
    }

    // 解决时间冲突
    resolveTimeConflicts(blueprints) {
        const resolved = [];
        const conflicts = [];
        
        // 按日期和时间排序
        blueprints.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        
        for (const blueprint of blueprints) {
            if (this.hasConflictWithResolved(blueprint, resolved)) {
                conflicts.push(blueprint);
            } else {
                resolved.push(blueprint);
            }
        }
        
        // 尝试重新安排冲突的蓝图
        for (const conflictBlueprint of conflicts) {
            const rescheduled = this.rescheduleBlueprint(conflictBlueprint, resolved);
            if (rescheduled) {
                resolved.push(rescheduled);
            }
        }
        
        return resolved;
    }

    // 检查与已解决蓝图的冲突
    hasConflictWithResolved(blueprint, resolvedBlueprints) {
        const bpStart = new Date(blueprint.scheduledDate);
        const bpEnd = new Date(bpStart.getTime() + blueprint.duration * 60000);
        
        for (const resolved of resolvedBlueprints) {
            const resolvedStart = new Date(resolved.scheduledDate);
            const resolvedEnd = new Date(resolvedStart.getTime() + resolved.duration * 60000);
            
            // 检查时间重叠
            if (bpStart < resolvedEnd && bpEnd > resolvedStart) {
                return true;
            }
        }
        
        return false;
    }

    // 重新安排蓝图
    rescheduleBlueprint(blueprint, existingBlueprints) {
        const originalDate = new Date(blueprint.scheduledDate);
        const settings = this.getSettings();
        
        // 尝试在同一天找到其他时间
        for (let hour = 6; hour <= 22; hour++) {
            const testTime = { hour, minute: 0 };
            const testDate = new Date(originalDate);
            testDate.setHours(hour, 0, 0, 0);
            
            if (!this.isInProtectedHours(testTime, settings.globalSettings.protectedHours)) {
                const testBlueprint = {
                    ...blueprint,
                    scheduledDate: testDate.toISOString()
                };
                
                if (!this.hasConflictWithResolved(testBlueprint, existingBlueprints)) {
                    return testBlueprint;
                }
            }
        }
        
        // 尝试推迟到第二天
        const nextDay = new Date(originalDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        for (let hour = 6; hour <= 22; hour++) {
            const testTime = { hour, minute: 0 };
            const testDate = new Date(nextDay);
            testDate.setHours(hour, 0, 0, 0);
            
            if (!this.isInProtectedHours(testTime, settings.globalSettings.protectedHours)) {
                const testBlueprint = {
                    ...blueprint,
                    scheduledDate: testDate.toISOString()
                };
                
                if (!this.hasConflictWithResolved(testBlueprint, existingBlueprints)) {
                    return testBlueprint;
                }
            }
        }
        
        // 无法重新安排，返回null
        console.warn(`⚠️ 无法为蓝图 "${blueprint.name}" 找到合适的时间`);
        return null;
    }

    // 保存蓝图到游戏数据
    saveBlueprintsToGame(blueprints) {
        if (!window.gameData.blueprints) {
            window.gameData.blueprints = [];
        }
        
        window.gameData.blueprints.push(...blueprints);
        
        // 更新最后生成时间
        window.gameData.blueprintAutomation.lastGeneratedAt = new Date().toISOString();
        
        // 保存到云端
        if (window.saveToCloud) {
            window.saveToCloud();
        }
    }

    // 记录生成日志
    logGeneration(blueprints, projects) {
        const log = {
            timestamp: new Date().toISOString(),
            generatedCount: blueprints.length,
            projectCount: projects.length,
            projectSummary: this.createProjectSummary(blueprints),
            conflicts: blueprints.filter(bp => bp.rescheduled).length
        };
        
        if (!window.gameData.blueprintAutomation.generationLog) {
            window.gameData.blueprintAutomation.generationLog = [];
        }
        
        window.gameData.blueprintAutomation.generationLog.unshift(log);
        
        // 只保留最近30条记录
        if (window.gameData.blueprintAutomation.generationLog.length > 30) {
            window.gameData.blueprintAutomation.generationLog = 
                window.gameData.blueprintAutomation.generationLog.slice(0, 30);
        }
    }

    // 创建项目摘要
    createProjectSummary(blueprints) {
        const summary = {};
        
        blueprints.forEach(bp => {
            const projectName = bp.sourceProject || bp.name;
            summary[projectName] = (summary[projectName] || 0) + 1;
        });
        
        return summary;
    }

    // 按周分组日期
    groupDatesByWeek(dates) {
        const weeks = {};
        
        dates.forEach(date => {
            const weekStart = this.getWeekStart(date);
            const weekKey = weekStart.toISOString().slice(0, 10);
            
            if (!weeks[weekKey]) {
                weeks[weekKey] = [];
            }
            weeks[weekKey].push(date);
        });
        
        return Object.values(weeks);
    }

    // 按月分组日期
    groupDatesByMonth(dates) {
        const months = {};
        
        dates.forEach(date => {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!months[monthKey]) {
                months[monthKey] = [];
            }
            months[monthKey].push(date);
        });
        
        return Object.values(months);
    }

    // 获取周起始日期（周一）
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    // 从一周中选择指定数量的日期
    selectDatesFromWeek(weekDates, count) {
        if (weekDates.length <= count) {
            return weekDates;
        }
        
        // 均匀分布算法
        const selected = [];
        const step = weekDates.length / count;
        
        for (let i = 0; i < count; i++) {
            const index = Math.floor(i * step);
            selected.push(weekDates[index]);
        }
        
        return selected;
    }

    // 从一月中选择指定数量的日期
    selectDatesFromMonth(monthDates, count) {
        if (monthDates.length <= count) {
            return monthDates;
        }
        
        // 均匀分布算法
        const selected = [];
        const step = monthDates.length / count;
        
        for (let i = 0; i < count; i++) {
            const index = Math.floor(i * step);
            selected.push(monthDates[index]);
        }
        
        return selected;
    }

    // 获取最后执行日期
    getLastExecutionDate(project) {
        const timeLogs = window.gameData?.timeLogs || [];
        const projectLogs = timeLogs
            .filter(log => log.name === project.name)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return projectLogs.length > 0 ? projectLogs[0].date : null;
    }

    // 清除自动生成的蓝图
    clearAutoGeneratedBlueprints() {
        if (!window.gameData.blueprints) return;
        
        const beforeCount = window.gameData.blueprints.length;
        window.gameData.blueprints = window.gameData.blueprints.filter(bp => !bp.autoGenerated);
        const afterCount = window.gameData.blueprints.length;
        
        console.log(`🧹 清除了 ${beforeCount - afterCount} 个自动生成的蓝图`);
        
        if (window.saveToCloud) {
            window.saveToCloud();
        }
        
        if (window.renderWeekCalendar) {
            window.renderWeekCalendar();
        }
    }

    // 获取生成报告
    getGenerationReport() {
        const logs = window.gameData?.blueprintAutomation?.generationLog || [];
        if (logs.length === 0) {
            return '暂无生成记录';
        }
        
        const latest = logs[0];
        const summary = Object.entries(latest.projectSummary)
            .map(([name, count]) => `${name}: ${count}个`)
            .join(', ');
        
        return `最近一次生成：${latest.generatedCount}个蓝图\n${summary}`;
    }
}

// 导出全局实例
window.BlueprintAutomationManager = BlueprintAutomationManager;
window.blueprintAutomation = new BlueprintAutomationManager(); 