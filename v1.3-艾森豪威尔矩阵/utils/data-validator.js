/**
 * 数据验证模块 - Life Factory Manager Tool
 * 提供各种数据类型的验证规则和验证方法
 */

class DataValidator {
    constructor() {
        this.validationSchemas = this.createValidationSchemas();
    }

    /**
     * 创建验证模式
     */
    createValidationSchemas() {
        return {
            // 生产线验证模式
            production: {
                name: {
                    required: true,
                    type: 'string',
                    minLength: 1,
                    maxLength: 50,
                    pattern: /^[^\n\r\t<>]+$/
                },
                type: {
                    required: true,
                    type: 'string',
                    enum: ['production', 'investment', 'automation', 'lifestyle']
                },
                activeIncome: {
                    type: 'number',
                    min: 0
                },
                passiveIncome: {
                    type: 'number',
                    min: 0
                },
                expenseAmount: {
                    type: 'number',
                    min: 0
                },
                currency: {
                    type: 'string',
                    enum: ['CNY', 'AUD', 'USD', 'EUR']
                }
            },

            // 研发项目验证模式
            development: {
                researchName: {
                    required: true,
                    type: 'string',
                    minLength: 1,
                    maxLength: 100
                },
                level: {
                    type: 'number',
                    min: 1,
                    max: 100
                },
                progress: {
                    type: 'number',
                    min: 0
                },
                maxProgress: {
                    type: 'number',
                    min: 1
                },
                cycle: {
                    type: 'number',
                    min: 1,
                    max: 365
                },
                target: {
                    type: 'number',
                    min: 1,
                    max: 1000
                }
            },

            // 支出验证模式
            expense: {
                name: {
                    required: true,
                    type: 'string',
                    minLength: 1,
                    maxLength: 100
                },
                amount: {
                    required: true,
                    type: 'number',
                    min: 0.01
                },
                currency: {
                    required: true,
                    type: 'string',
                    enum: ['CNY', 'AUD', 'USD', 'EUR']
                },
                date: {
                    required: true,
                    type: 'string',
                    pattern: /^\d{4}-\d{2}-\d{2}$/
                },
                category: {
                    type: 'string',
                    maxLength: 50
                }
            },

            // 时间记录验证模式
            timeLog: {
                name: {
                    required: true,
                    type: 'string',
                    minLength: 1,
                    maxLength: 100
                },
                date: {
                    required: true,
                    type: 'string',
                    pattern: /^\d{4}-\d{2}-\d{2}$/
                },
                duration: {
                    type: 'number',
                    min: 1,
                    max: 1440 // 24小时 * 60分钟
                },
                notes: {
                    type: 'string',
                    maxLength: 500
                }
            },

            // 里程碑验证模式
            milestone: {
                name: {
                    required: true,
                    type: 'string',
                    minLength: 1,
                    maxLength: 100
                },
                description: {
                    type: 'string',
                    maxLength: 500
                },
                difficulty: {
                    type: 'number',
                    min: 1,
                    max: 5
                },
                category: {
                    required: true,
                    type: 'string',
                    enum: ['自我成长', '探索体验', '财务管理', '创作表达']
                },
                completed: {
                    type: 'boolean'
                }
            },

            // 财务数据验证模式
            finance: {
                totalSavings: {
                    type: 'number',
                    min: 0
                },
                savingsCurrency: {
                    type: 'string',
                    enum: ['CNY', 'AUD', 'USD', 'EUR']
                },
                savingsUpdateTime: {
                    type: 'string',
                    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
                }
            }
        };
    }

    /**
     * 验证数据
     * @param {Object} data - 要验证的数据
     * @param {string} schemaName - 验证模式名称
     * @returns {Object} 验证结果
     */
    validate(data, schemaName) {
        const schema = this.validationSchemas[schemaName];
        if (!schema) {
            throw new Error(`未知的验证模式: ${schemaName}`);
        }

        const errors = [];
        const warnings = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            
            // 必填字段检查
            if (rules.required && this.isEmpty(value)) {
                errors.push(`${this.getFieldDisplayName(field)} 是必填项`);
                continue;
            }

            // 如果字段为空且不是必填，跳过其他验证
            if (this.isEmpty(value)) {
                continue;
            }

            // 类型检查
            if (rules.type && !this.checkType(value, rules.type)) {
                errors.push(`${this.getFieldDisplayName(field)} 类型错误，期望 ${rules.type}`);
                continue;
            }

            // 枚举值检查
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`${this.getFieldDisplayName(field)} 值无效，可选值: ${rules.enum.join(', ')}`);
                continue;
            }

            // 数值范围检查
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${this.getFieldDisplayName(field)} 不能小于 ${rules.min}`);
            }

            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${this.getFieldDisplayName(field)} 不能大于 ${rules.max}`);
            }

            // 字符串长度检查
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${this.getFieldDisplayName(field)} 长度不能少于 ${rules.minLength} 个字符`);
            }

            if (rules.maxLength && value.length > rules.maxLength) {
                warnings.push(`${this.getFieldDisplayName(field)} 长度超过 ${rules.maxLength} 个字符，建议缩短`);
            }

            // 正则表达式检查
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${this.getFieldDisplayName(field)} 格式不正确`);
            }

            // 自定义验证函数
            if (rules.custom && typeof rules.custom === 'function') {
                const customResult = rules.custom(value, data);
                if (customResult !== true) {
                    errors.push(customResult || `${this.getFieldDisplayName(field)} 验证失败`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            hasWarnings: warnings.length > 0
        };
    }

    /**
     * 检查值是否为空
     * @param {*} value - 要检查的值
     * @returns {boolean} 是否为空
     */
    isEmpty(value) {
        return value === undefined || 
               value === null || 
               value === '' || 
               (Array.isArray(value) && value.length === 0);
    }

    /**
     * 检查类型
     * @param {*} value - 要检查的值
     * @param {string} expectedType - 期望的类型
     * @returns {boolean} 类型是否匹配
     */
    checkType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return true;
        }
    }

    /**
     * 获取字段显示名称
     * @param {string} fieldName - 字段名
     * @returns {string} 显示名称
     */
    getFieldDisplayName(fieldName) {
        const displayNames = {
            name: '名称',
            type: '类型',
            activeIncome: '主动收入',
            passiveIncome: '被动收入',
            expenseAmount: '支出金额',
            currency: '货币',
            researchName: '研发项目名称',
            level: '等级',
            progress: '进度',
            maxProgress: '最大进度',
            cycle: '周期',
            target: '目标',
            amount: '金额',
            date: '日期',
            category: '分类',
            duration: '时长',
            notes: '备注',
            description: '描述',
            difficulty: '难度',
            completed: '完成状态',
            totalSavings: '总储蓄',
            savingsCurrency: '储蓄货币',
            savingsUpdateTime: '储蓄更新时间'
        };

        return displayNames[fieldName] || fieldName;
    }

    /**
     * 验证并显示错误
     * @param {Object} data - 要验证的数据
     * @param {string} schemaName - 验证模式名称
     * @returns {boolean} 是否验证通过
     */
    validateAndShowErrors(data, schemaName) {
        const result = this.validate(data, schemaName);
        
        if (!result.isValid) {
            const errorMessage = result.errors.join('\n');
            window.showError(errorMessage, 'warning');
            return false;
        }

        if (result.hasWarnings) {
            const warningMessage = result.warnings.join('\n');
            window.showError(warningMessage, 'info');
        }

        return true;
    }

    /**
     * 清理和标准化数据
     * @param {Object} data - 原始数据
     * @param {string} schemaName - 验证模式名称
     * @returns {Object} 清理后的数据
     */
    sanitizeData(data, schemaName) {
        const schema = this.validationSchemas[schemaName];
        if (!schema) {
            return data;
        }

        const sanitized = { ...data };

        for (const [field, rules] of Object.entries(schema)) {
            const value = sanitized[field];

            // 字符串清理
            if (rules.type === 'string' && typeof value === 'string') {
                // 移除危险字符
                sanitized[field] = value.replace(/[<>]/g, '');
                
                // 去除首尾空格
                sanitized[field] = value.trim();
            }

            // 数字清理
            if (rules.type === 'number' && typeof value === 'number') {
                // 确保是有效数字
                if (isNaN(value)) {
                    delete sanitized[field];
                }
            }

            // 日期清理
            if (field === 'date' && typeof value === 'string') {
                // 验证日期格式
                if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    delete sanitized[field];
                }
            }
        }

        return sanitized;
    }

    /**
     * 添加自定义验证规则
     * @param {string} schemaName - 模式名称
     * @param {string} fieldName - 字段名称
     * @param {Function} validator - 验证函数
     */
    addCustomValidator(schemaName, fieldName, validator) {
        if (!this.validationSchemas[schemaName]) {
            this.validationSchemas[schemaName] = {};
        }
        
        if (!this.validationSchemas[schemaName][fieldName]) {
            this.validationSchemas[schemaName][fieldName] = {};
        }

        this.validationSchemas[schemaName][fieldName].custom = validator;
    }

    /**
     * 获取所有验证模式
     * @returns {Object} 所有验证模式
     */
    getSchemas() {
        return this.validationSchemas;
    }
}

// 创建全局数据验证器实例
window.dataValidator = new DataValidator();

// 导出验证函数供其他模块使用
window.validateData = (data, schemaName) => {
    return window.dataValidator.validate(data, schemaName);
};

window.validateAndShowErrors = (data, schemaName) => {
    return window.dataValidator.validateAndShowErrors(data, schemaName);
};

window.sanitizeData = (data, schemaName) => {
    return window.dataValidator.sanitizeData(data, schemaName);
};

console.log('✅ 数据验证模块已加载'); 