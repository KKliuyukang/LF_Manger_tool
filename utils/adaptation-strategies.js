/**
 * 项目适应策略
 * 定义不同的适应性调整策略
 */

// 策略基类
class AdaptationStrategy {
    constructor(name, description) {
        this.name = name;
        this.description = description;
        this.type = name;
    }
    
    // 计算适应参数
    calculateAdaptation(projectInfo, metrics) {
        throw new Error('Must implement calculateAdaptation');
    }
    
    // 生成用户提示
    generateUserPrompt(projectInfo, adaptation) {
        throw new Error('Must implement generateUserPrompt');
    }
}

// 频率降低策略
class FrequencyReductionStrategy extends AdaptationStrategy {
    constructor() {
        super('frequency_reduction', '降低执行频率');
    }
    
    calculateAdaptation(projectInfo, metrics) {
        const reductionFactor = this.calculateReductionFactor(metrics);
        
        return {
            originalFreq: projectInfo.frequency,
            adaptiveFreq: this.generateAdaptiveFreq(projectInfo.frequency, reductionFactor),
            originalTarget: projectInfo.target,
            adaptiveTarget: Math.ceil(projectInfo.target * reductionFactor),
            factor: reductionFactor
        };
    }
    
    generateUserPrompt(projectInfo, adaptation) {
        return {
            title: `${projectInfo.name} 执行困难`,
            message: `检测到项目执行困难，建议调整执行频率`,
            details: `从"${adaptation.originalFreq}"调整为"${adaptation.adaptiveFreq}"，目标从${adaptation.originalTarget}次降为${adaptation.adaptiveTarget}次`,
            options: [
                { text: '接受建议', action: 'accept', style: 'primary' },
                { text: '继续原计划', action: 'reject', style: 'secondary' },
                { text: '自定义调整', action: 'custom', style: 'secondary' }
            ]
        };
    }
    
    calculateReductionFactor(metrics) {
        // 根据不同的指标计算降低因子
        if (metrics.successRate < 0.2) return 0.3;  // 成功率很低，大幅降低
        if (metrics.successRate < 0.4) return 0.5;  // 成功率较低，适中降低
        if (metrics.pauseDays > 7) return 0.4;      // 暂停时间长，适中降低
        if (metrics.consecutivePauses > 5) return 0.6; // 连续暂停，轻度降低
        return 0.6; // 默认降低到60%
    }
    
    generateAdaptiveFreq(originalFreq, factor) {
        // 频率映射表
        const freqMap = {
            '每天': {
                0.3: '每周2次',
                0.4: '每周3次', 
                0.5: '每周3次',
                0.6: '每周4次'
            },
            '每周5次': {
                0.3: '每周2次',
                0.4: '每周2次',
                0.5: '每周3次',
                0.6: '每周3次'
            },
            '每周4次': {
                0.3: '每周1次',
                0.4: '每周2次',
                0.5: '每周2次',
                0.6: '每周3次'
            },
            '每周3次': {
                0.3: '每周1次',
                0.4: '每周1次',
                0.5: '每周2次',
                0.6: '每周2次'
            },
            '每周2次': {
                0.3: '每周1次',
                0.4: '每周1次',
                0.5: '每周1次',
                0.6: '每周1次'
            }
        };
        
        // 找到最接近的因子
        const availableFactors = Object.keys(freqMap[originalFreq] || {}).map(f => parseFloat(f));
        const closestFactor = availableFactors.reduce((prev, curr) => 
            Math.abs(curr - factor) < Math.abs(prev - factor) ? curr : prev
        );
        
        return freqMap[originalFreq]?.[closestFactor] || `${originalFreq}(降低难度)`;
    }
}

// 阶段延长策略
class StageExtensionStrategy extends AdaptationStrategy {
    constructor() {
        super('stage_extension', '延长阶段周期');
    }
    
    calculateAdaptation(projectInfo, metrics) {
        const extensionFactor = this.calculateExtensionFactor(metrics);
        
        return {
            originalCycle: projectInfo.cycle,
            adaptiveCycle: Math.ceil(projectInfo.cycle * extensionFactor),
            originalTarget: projectInfo.target,
            adaptiveTarget: projectInfo.target, // 目标不变，时间延长
            factor: extensionFactor
        };
    }
    
    generateUserPrompt(projectInfo, adaptation) {
        return {
            title: `${projectInfo.name} 时间压力大`,
            message: `检测到项目时间压力较大，建议延长项目周期`,
            details: `将周期从${adaptation.originalCycle}天延长到${adaptation.adaptiveCycle}天，给自己更多时间适应`,
            options: [
                { text: '接受建议', action: 'accept', style: 'primary' },
                { text: '保持原计划', action: 'reject', style: 'secondary' },
                { text: '自定义时间', action: 'custom', style: 'secondary' }
            ]
        };
    }
    
    calculateExtensionFactor(metrics) {
        // 根据不同指标计算延长因子
        if (metrics.successRate < 0.2) return 2.0;    // 成功率很低，延长一倍
        if (metrics.successRate < 0.4) return 1.5;    // 成功率较低，延长50%
        if (metrics.consecutivePauses > 10) return 1.8; // 长期暂停，大幅延长
        if (metrics.consecutivePauses > 5) return 1.5;  // 中期暂停，适中延长
        return 1.3; // 默认延长30%
    }
}

// 混合策略 - 同时降低频率和延长周期
class HybridStrategy extends AdaptationStrategy {
    constructor() {
        super('hybrid', '混合调整');
        this.frequencyStrategy = new FrequencyReductionStrategy();
        this.extensionStrategy = new StageExtensionStrategy();
    }
    
    calculateAdaptation(projectInfo, metrics) {
        const freqAdaptation = this.frequencyStrategy.calculateAdaptation(projectInfo, metrics);
        const extAdaptation = this.extensionStrategy.calculateAdaptation(projectInfo, metrics);
        
        return {
            ...freqAdaptation,
            ...extAdaptation,
            isHybrid: true
        };
    }
    
    generateUserPrompt(projectInfo, adaptation) {
        return {
            title: `${projectInfo.name} 需要全面调整`,
            message: `项目执行困难较大，建议同时调整频率和周期`,
            details: `频率：${adaptation.originalFreq} → ${adaptation.adaptiveFreq}\n周期：${adaptation.originalCycle}天 → ${adaptation.adaptiveCycle}天\n目标：${adaptation.originalTarget}次 → ${adaptation.adaptiveTarget}次`,
            options: [
                { text: '接受全面调整', action: 'accept', style: 'primary' },
                { text: '只调整频率', action: 'freq_only', style: 'secondary' },
                { text: '只延长周期', action: 'ext_only', style: 'secondary' },
                { text: '保持原计划', action: 'reject', style: 'secondary' }
            ]
        };
    }
}

// 暂停恢复策略 - 针对长期暂停的项目
class PauseRecoveryStrategy extends AdaptationStrategy {
    constructor() {
        super('pause_recovery', '暂停恢复');
    }
    
    calculateAdaptation(projectInfo, metrics) {
        // 为长期暂停的项目提供温和的恢复方案
        const recoveryFactor = 0.4; // 恢复时使用更低的强度
        
        return {
            originalFreq: projectInfo.frequency,
            adaptiveFreq: this.generateRecoveryFreq(projectInfo.frequency),
            originalTarget: projectInfo.target,
            adaptiveTarget: Math.ceil(projectInfo.target * recoveryFactor),
            factor: recoveryFactor,
            isRecovery: true
        };
    }
    
    generateUserPrompt(projectInfo, adaptation) {
        return {
            title: `${projectInfo.name} 暂停恢复`,
            message: `项目已暂停较久，建议使用恢复模式重新开始`,
            details: `恢复频率：${adaptation.adaptiveFreq}\n恢复目标：${adaptation.adaptiveTarget}次\n后续可根据执行情况逐步提高`,
            options: [
                { text: '开始恢复', action: 'accept', style: 'primary' },
                { text: '继续暂停', action: 'reject', style: 'secondary' },
                { text: '删除项目', action: 'delete', style: 'danger' }
            ]
        };
    }
    
    generateRecoveryFreq(originalFreq) {
        // 恢复频率映射
        const recoveryMap = {
            '每天': '每周2次',
            '每周5次': '每周2次',
            '每周4次': '每周2次',
            '每周3次': '每周1次',
            '每周2次': '每周1次'
        };
        
        return recoveryMap[originalFreq] || '每周1次';
    }
}

// 导出策略类
window.AdaptationStrategy = AdaptationStrategy;
window.FrequencyReductionStrategy = FrequencyReductionStrategy;
window.StageExtensionStrategy = StageExtensionStrategy;
window.HybridStrategy = HybridStrategy;
window.PauseRecoveryStrategy = PauseRecoveryStrategy;

// 创建策略实例并注册到全局管理器
function registerStrategies() {
    if (window.projectAdaptabilityManager) {
        window.projectAdaptabilityManager.registerStrategy('frequency_reduction', new FrequencyReductionStrategy());
        window.projectAdaptabilityManager.registerStrategy('stage_extension', new StageExtensionStrategy());
        window.projectAdaptabilityManager.registerStrategy('hybrid', new HybridStrategy());
        window.projectAdaptabilityManager.registerStrategy('pause_recovery', new PauseRecoveryStrategy());
        console.log('✅ 所有适应策略已注册');
    } else {
        console.log('⏳ 等待项目适应性管理器加载...');
        setTimeout(registerStrategies, 100);
    }
}

// 延迟注册，确保管理器已经创建
setTimeout(registerStrategies, 100);

console.log('✅ 项目适应策略已加载'); 