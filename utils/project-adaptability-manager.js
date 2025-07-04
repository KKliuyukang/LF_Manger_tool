/**
 * 项目适应性管理系统
 * 通用的项目适应性检查和调整框架
 */

// 基础适配器接口
class BaseProjectAdapter {
    // 获取项目基础信息
    getProjectInfo(project) {
        throw new Error('Must implement getProjectInfo');
    }
    
    // 获取执行历史
    getExecutionHistory(project) {
        throw new Error('Must implement getExecutionHistory');
    }
    
    // 检查适应性需求
    checkAdaptability(project) {
        throw new Error('Must implement checkAdaptability');
    }
    
    // 应用适应策略
    applyStrategy(project, strategy) {
        throw new Error('Must implement applyStrategy');
    }
}

// Life Factorio 项目适配器
class LifeFactorioAdapter extends BaseProjectAdapter {
    getProjectInfo(project) {
        return {
            id: project.researchName,
            name: project.researchName,
            frequency: project.freq || '每天',
            target: project.target || 21,
            cycle: project.cycle || 30,
            type: 'research',
            startDate: project.startDate,
            isPaused: project.paused || false,
            pausedDate: project.pausedDate || null
        };
    }
    
    getExecutionHistory(project) {
        const prodNames = this.getLinkedProductionNames(project);
        if (!window.gameData?.timeLogs) return [];
        
        return window.gameData.timeLogs.filter(log => 
            prodNames.includes(log.name)
        );
    }
    
    getLinkedProductionNames(project) {
        const prodNames = [];
        
        // 从生产线中找关联的项目
        if (window.gameData?.productions) {
            const linkedProds = window.gameData.productions.filter(p => 
                p.linkedDev === project.researchName
            );
            prodNames.push(...linkedProds.map(p => p.name));
        }
        
        // 如果没有找到关联生产线，使用项目自身的prodName
        if (prodNames.length === 0 && project.prodName) {
            prodNames.push(project.prodName);
        }
        
        return prodNames;
    }
    
    checkAdaptability(project) {
        const history = this.getExecutionHistory(project);
        const recentPauses = this.countRecentPauses(project, 7);
        const successRate = this.calculateSuccessRate(history, 7);
        const consecutivePauses = this.getConsecutivePauseDays(project);
        
        // 判断是否需要适应性调整
        const needsAdaptation = consecutivePauses >= 5 || successRate < 0.3;
        
        let reason = 'normal';
        if (consecutivePauses >= 7) reason = 'long_pause';
        else if (consecutivePauses >= 5) reason = 'frequent_pauses';
        else if (successRate < 0.3) reason = 'low_success_rate';
        
        return {
            needsAdaptation,
            reason,
            metrics: {
                pauseDays: recentPauses,
                consecutivePauses,
                successRate,
                totalExecutions: history.length,
                recentExecutions: this.getRecentExecutions(history, 7)
            },
            suggestions: this.generateSuggestions(reason, {
                pauseDays: recentPauses,
                consecutivePauses,
                successRate
            })
        };
    }
    
    countRecentPauses(project, days) {
        if (!project.pausedDate) return 0;
        
        const pausedDate = new Date(project.pausedDate);
        const now = new Date();
        const daysDiff = Math.floor((now - pausedDate) / (1000 * 60 * 60 * 24));
        
        return Math.min(daysDiff, days);
    }
    
    getConsecutivePauseDays(project) {
        if (!project.paused || !project.pausedDate) return 0;
        
        const pausedDate = new Date(project.pausedDate);
        const now = new Date();
        return Math.floor((now - pausedDate) / (1000 * 60 * 60 * 24));
    }
    
    calculateSuccessRate(history, days) {
        if (history.length === 0) return 0;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const recentLogs = history.filter(log => 
            new Date(log.date) >= cutoffDate
        );
        
        if (recentLogs.length === 0) return 0;
        
        // 计算成功率：有打卡记录的天数 / 总天数
        const uniqueDays = new Set(recentLogs.map(log => log.date)).size;
        return uniqueDays / days;
    }
    
    getRecentExecutions(history, days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return history.filter(log => 
            new Date(log.date) >= cutoffDate
        ).length;
    }
    
    generateSuggestions(reason, metrics) {
        const suggestions = [];
        
        switch (reason) {
            case 'long_pause':
                suggestions.push({
                    type: 'frequency_reduction',
                    priority: 'high',
                    message: '项目已暂停较久，建议降低执行频率重新开始'
                });
                suggestions.push({
                    type: 'stage_extension',
                    priority: 'medium',
                    message: '考虑延长项目周期，减少时间压力'
                });
                break;
                
            case 'frequent_pauses':
                suggestions.push({
                    type: 'frequency_reduction',
                    priority: 'high',
                    message: '频繁暂停说明目标过高，建议降低频率'
                });
                break;
                
            case 'low_success_rate':
                suggestions.push({
                    type: 'frequency_reduction',
                    priority: 'medium',
                    message: '执行成功率较低，可以考虑降低频率'
                });
                suggestions.push({
                    type: 'stage_extension',
                    priority: 'medium',
                    message: '延长阶段时间，给自己更多适应机会'
                });
                break;
        }
        
        return suggestions;
    }
    
    applyStrategy(project, strategy) {
        // 应用策略到项目
        if (strategy.type === 'frequency_reduction') {
            return this.applyFrequencyReduction(project, strategy);
        } else if (strategy.type === 'stage_extension') {
            return this.applyStageExtension(project, strategy);
        }
        
        return null;
    }
    
    applyFrequencyReduction(project, strategyConfig) {
        // 获取真正的策略实例
        const strategy = window.projectAdaptabilityManager.strategies.get('frequency_reduction');
        if (!strategy) {
            throw new Error('未找到频率降低策略');
        }
        
        const projectInfo = this.getProjectInfo(project);
        const metrics = { successRate: 0.3, pauseDays: 7, consecutivePauses: 7 };
        const adaptation = strategy.calculateAdaptation(projectInfo, metrics);
        
        // 创建适应状态
        project.adaptiveState = {
            isAdaptive: true,
            originalFreq: project.freq,
            adaptiveFreq: adaptation.adaptiveFreq,
            originalTarget: project.target,
            adaptiveTarget: adaptation.adaptiveTarget,
            adaptiveFactor: adaptation.factor,
            triggerReason: '频繁暂停',
            appliedDate: new Date().toISOString()
        };
        
        // 应用新的频率和目标
        project.freq = adaptation.adaptiveFreq;
        project.target = adaptation.adaptiveTarget;
        
        return {
            success: true,
            message: `已调整为${adaptation.adaptiveFreq}，目标从${adaptation.originalTarget}降为${adaptation.adaptiveTarget}`
        };
    }
    
    applyStageExtension(project, strategyConfig) {
        // 获取真正的策略实例
        const strategy = window.projectAdaptabilityManager.strategies.get('stage_extension');
        if (!strategy) {
            throw new Error('未找到阶段延长策略');
        }
        
        const projectInfo = this.getProjectInfo(project);
        const metrics = { successRate: 0.3, pauseDays: 7, consecutivePauses: 7 };
        const adaptation = strategy.calculateAdaptation(projectInfo, metrics);
        
        // 创建适应状态
        project.adaptiveState = {
            isAdaptive: true,
            originalCycle: project.cycle,
            adaptiveCycle: adaptation.adaptiveCycle,
            originalTarget: project.target,
            adaptiveTarget: adaptation.adaptiveTarget,
            extensionFactor: adaptation.factor,
            triggerReason: '执行困难',
            appliedDate: new Date().toISOString()
        };
        
        // 应用新的周期
        project.cycle = adaptation.adaptiveCycle;
        
        return {
            success: true,
            message: `已将周期从${adaptation.originalCycle}天延长到${adaptation.adaptiveCycle}天`
        };
    }
}

// 项目适应性管理器 - 核心管理类
class ProjectAdaptabilityManager {
    constructor() {
        this.adapters = new Map();
        this.strategies = new Map();
    }
    
    // 注册项目类型适配器
    registerAdapter(projectType, adapter) {
        this.adapters.set(projectType, adapter);
        console.log(`📋 已注册项目适配器: ${projectType}`);
    }
    
    // 注册适应策略
    registerStrategy(strategyName, strategy) {
        this.strategies.set(strategyName, strategy);
        console.log(`🎯 已注册适应策略: ${strategyName}`);
    }
    
    // 获取项目适配器
    getAdapter(project) {
        // 默认使用 Life Factorio 适配器
        const adapter = this.adapters.get('life_factorio');
        if (!adapter) {
            throw new Error('未找到适配器: life_factorio');
        }
        return adapter;
    }
    
    // 通用适应性检查
    checkAdaptability(project) {
        const adapter = this.getAdapter(project);
        return adapter.checkAdaptability(project);
    }
    
    // 应用适应性调整
    applyAdaptation(project, strategyName, strategyConfig = {}) {
        const adapter = this.getAdapter(project);
        const strategy = this.strategies.get(strategyName);
        
        if (!strategy) {
            throw new Error(`未找到策略: ${strategyName}`);
        }
        
        return adapter.applyStrategy(project, { type: strategyName, ...strategyConfig });
    }
    
    // 批量检查所有项目
    checkAllProjects() {
        const projects = window.gameData?.developments || [];
        const results = [];
        
        projects.forEach(project => {
            try {
                const result = this.checkAdaptability(project);
                if (result.needsAdaptation) {
                    results.push({
                        project,
                        adaptationInfo: result
                    });
                }
            } catch (error) {
                console.error(`检查项目适应性失败: ${project.researchName}`, error);
            }
        });
        
        return results;
    }
}

// 导出到全局
window.ProjectAdaptabilityManager = ProjectAdaptabilityManager;
window.LifeFactorioAdapter = LifeFactorioAdapter;
window.BaseProjectAdapter = BaseProjectAdapter;

// 创建全局实例
window.projectAdaptabilityManager = new ProjectAdaptabilityManager();

// 注册 Life Factorio 适配器
window.projectAdaptabilityManager.registerAdapter('life_factorio', new LifeFactorioAdapter());

console.log('✅ 项目适应性管理系统已加载'); 