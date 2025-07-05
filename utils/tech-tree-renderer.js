// tech_tree_renderer.js - 优化版本
// 主要改进：更现代的视觉效果、更好的颜色搭配、优化的字体显示

(function(window) {
    'use strict';
    
    // 配置项 - 优化的视觉方案
    const CONFIG = {
        layout: {
            containerWidth: 1200,           
            layerHeight: 200,
            nodeWidth: 160,
            nodeHeight: 80,
            minSpacing: 50,
            layerPadding: 100,
            verticalGap: 200,
            horizontalPadding: 60
        },
        colors: {
            // 更柔和的渐变色系
            nodeGradients: {
                default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                physiological: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                psychological: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                financial: 'linear-gradient(135deg, #f7b731 0%, #f79d00 100%)',
                professional: 'linear-gradient(135deg, #5f27cd 0%, #4834d4 100%)',
                lifestyle: 'linear-gradient(135deg, #00d2ff 0%, #0095ff 100%)',
                completed: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
                researching: 'linear-gradient(135deg, #ff9a00 0%, #ff6200 100%)',
                locked: 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)'
            },
            // 更柔和的连接线颜色
            connectionColor: 'rgba(149, 165, 166, 0.6)',
            highlightColor: '#3498db',
            dimmedColor: 'rgba(149, 165, 166, 0.2)',
            // 背景和文字颜色
            modalBg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            textPrimary: '#ffffff',
            textSecondary: 'rgba(255, 255, 255, 0.9)',
            textDimmed: 'rgba(255, 255, 255, 0.6)'
        },
        styles: {
            nodeRadius: '20px',
            nodeShadow: '0 8px 32px rgba(0,0,0,0.15)',
            hoverScale: 1.08,
            hoverShadow: '0 12px 48px rgba(0,0,0,0.25)',
            // 字体优化
            fonts: {
                primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                chinese: '"Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", sans-serif'
            }
        }
    };
    
    // 根据类别获取节点颜色
    function getNodeGradient(tech) {
        if (tech.category) {
            const categoryMap = {
                '生理基础': CONFIG.colors.nodeGradients.physiological,
                '心理基础': CONFIG.colors.nodeGradients.psychological,
                '财务': CONFIG.colors.nodeGradients.financial,
                '职业': CONFIG.colors.nodeGradients.professional,
                '生活方式': CONFIG.colors.nodeGradients.lifestyle
            };
            return categoryMap[tech.category] || CONFIG.colors.nodeGradients.default;
        }
        return CONFIG.colors.nodeGradients.default;
    }
    
    class TechTreeRenderer {
        constructor(containerId, config = CONFIG) {
            this.containerId = containerId;
            this.config = config;
            this.techData = null;
            this.nodeElements = new Map();
            this.connectionElements = new Map();
            this.setupDataListener();
        }
        
        async render(techData) {
            this.techData = techData;
            
            const positions = layoutNodesByLayer(
                this.getAllNodes(),
                this.getAllEdges()
            );
            
            const container = this.createContainer();
            this.renderNodes(container, positions);
            this.renderConnections(container, positions);
            this.setupInteractions();
            this.applyStyles();
        }

        getAllNodes() {
            const nodes = [];
            this.techData.layers.forEach((layer, layerIndex) => {
                layer.technologies.forEach(tech => {
                    nodes.push({
                        ...tech,
                        layer: layerIndex
                    });
                });
            });
            if (this.techData.finalGoal) {
                nodes.push({
                    ...this.techData.finalGoal,
                    layer: this.techData.layers.length
                });
            }
            return nodes;
        }

        getAllEdges() {
            const edges = [];
            this.techData.layers.forEach(layer => {
                layer.technologies.forEach(tech => {
                    if (tech.requirements) {
                        tech.requirements.forEach(reqId => {
                            edges.push({
                                from: reqId,
                                to: tech.id
                            });
                        });
                    }
                });
            });
            if (this.techData.finalGoal && this.techData.finalGoal.requirements) {
                this.techData.finalGoal.requirements.forEach(reqId => {
                    edges.push({
                        from: reqId,
                        to: this.techData.finalGoal.id
                    });
                });
            }
            return edges;
        }
        
        createContainer() {
            const modal = document.createElement('div');
            modal.id = 'tech-tree-modal';
            modal.className = 'tech-tree-modal';
            
            const content = document.createElement('div');
            content.className = 'tech-tree-content';
            
            // 添加标题
            const header = document.createElement('div');
            header.className = 'tech-tree-header';
            header.innerHTML = `
                <h2 class="tech-tree-title">🚀 人生科技树</h2>
                <p class="tech-tree-subtitle">点击节点查看详情，开始你的成长之旅</p>
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tech-tree-close';
            closeBtn.innerHTML = '✕';
            closeBtn.onclick = () => modal.remove();
            
            const treeContainer = document.createElement('div');
            treeContainer.className = 'tech-tree-container';
            treeContainer.style.position = 'relative';
            
            content.appendChild(closeBtn);
            content.appendChild(header);
            content.appendChild(treeContainer);
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            return treeContainer;
        }
        
        renderNodes(container, positions) {
            const allTechs = this.getAllNodes();
            
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            Object.values(positions).forEach(pos => {
                minX = Math.min(minX, pos.x);
                maxX = Math.max(maxX, pos.x + this.config.layout.nodeWidth);
                minY = Math.min(minY, pos.y);
                maxY = Math.max(maxY, pos.y + this.config.layout.nodeHeight);
            });
            
            const contentWidth = maxX - minX + 100; // 额外边距
            const contentHeight = maxY - minY + 100;
            const offsetX = -minX + 50;
            const offsetY = 50;
            
            container.style.width = contentWidth + 'px';
            container.style.height = contentHeight + 'px';
            container.style.margin = '0 auto';
            
            allTechs.forEach(tech => {
                const pos = positions[tech.id];
                if (!pos) return;
                const adjustedPos = {
                    x: pos.x + offsetX,
                    y: pos.y + offsetY
                };
                const node = this.createNode(tech, adjustedPos);
                container.appendChild(node);
                this.nodeElements.set(tech.id, node);
            });
        }
        
        createNode(tech, position) {
            const node = document.createElement('div');
            node.className = 'tech-tree-node';
            node.id = `tech-${tech.id}`;
            
            // 根据类别设置渐变背景
            const gradient = getNodeGradient(tech);
            
            Object.assign(node.style, {
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${this.config.layout.nodeWidth}px`,
                height: `${this.config.layout.nodeHeight}px`,
                background: gradient
            });
            
            // 优化内容布局
            node.innerHTML = `
                <div class="tech-node-content">
                    <div class="tech-node-icon">${tech.icon || '🔬'}</div>
                    <div class="tech-node-name">${tech.name}</div>
                    <div class="tech-node-priority">${tech.priority || ''}</div>
                    <div class="tech-node-status"></div>
                </div>
            `;
            
            this.updateNodeStatus(node, tech);
            
            return node;
        }
        
        renderConnections(container, positions) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'tech-tree-connections');
            
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            Object.values(positions).forEach(pos => {
                minX = Math.min(minX, pos.x);
                maxX = Math.max(maxX, pos.x + this.config.layout.nodeWidth);
                minY = Math.min(minY, pos.y);
                maxY = Math.max(maxY, pos.y + this.config.layout.nodeHeight);
            });
            
            const offsetX = -minX + 50;
            const offsetY = 50;
            
            const adjustedPositions = {};
            Object.entries(positions).forEach(([id, pos]) => {
                adjustedPositions[id] = {
                    x: pos.x + offsetX,
                    y: pos.y + offsetY
                };
            });
            
            const { layerInfo, channels } = TechTreeRenderer.calculateLayerChannels(adjustedPositions);
            
            const edges = this.getAllEdges();
            const targetInEdges = {};
            edges.forEach(edge => {
                if (!targetInEdges[edge.to]) targetInEdges[edge.to] = [];
                targetInEdges[edge.to].push(edge.from);
            });
            
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = container.offsetWidth + 'px';
            svg.style.height = container.offsetHeight + 'px';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = 1;

            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            
            // 优化的箭头标记
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', 'tech-arrow');
            marker.setAttribute('viewBox', '0 0 10 10');
            marker.setAttribute('refX', '9');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', '6');
            marker.setAttribute('markerHeight', '6');
            marker.setAttribute('orient', 'auto');

            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
            arrow.setAttribute('fill', this.config.colors.connectionColor);
            marker.appendChild(arrow);
            defs.appendChild(marker);
            svg.appendChild(defs);

            edges.forEach((edge) => {
                const points = this.getOrthogonalPath(edge.from, edge.to, adjustedPositions, layerInfo, channels, targetInEdges);
                if (points.length > 0) {
                    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                    polyline.setAttribute('class', 'tech-connection');
                    polyline.setAttribute('points', points.map(p => p.join(',')).join(' '));
                    polyline.setAttribute('marker-end', 'url(#tech-arrow)');
                    polyline.setAttribute('data-from', edge.from);
                    polyline.setAttribute('data-to', edge.to);
                    polyline.setAttribute('fill', 'none');
                    polyline.setAttribute('stroke', this.config.colors.connectionColor);
                    polyline.setAttribute('stroke-width', '2');
                    
                    svg.appendChild(polyline);
                    this.connectionElements.set(`${edge.from}-${edge.to}`, polyline);
                }
            });

            container.appendChild(svg);
        }
        
        setupInteractions() {
            this.nodeElements.forEach((node, techId) => {
                node.addEventListener('click', () => {
                    const tech = this.findTechById(techId);
                    if (tech && window.showTechDetailModal) {
                        window.showTechDetailModal(tech);
                    }
                });
                
                node.addEventListener('mouseenter', () => {
                    this.highlightNode(techId);
                });
                
                node.addEventListener('mouseleave', () => {
                    this.unhighlightAll();
                });
            });
        }
        
        highlightNode(techId) {
            const relatedNodes = new Set([techId]);
            const relatedEdges = new Set();
            
            this.getAllEdges().forEach(edge => {
                if (edge.from === techId || edge.to === techId) {
                    relatedNodes.add(edge.from);
                    relatedNodes.add(edge.to);
                    relatedEdges.add(`${edge.from}-${edge.to}`);
                }
            });
            
            this.nodeElements.forEach((node, id) => {
                if (relatedNodes.has(id)) {
                    node.classList.add('highlighted');
                    node.classList.remove('dimmed');
                } else {
                    node.classList.remove('highlighted');
                    node.classList.add('dimmed');
                }
            });
            
            this.connectionElements.forEach((line, key) => {
                if (relatedEdges.has(key)) {
                    line.classList.add('highlighted');
                    line.classList.remove('dimmed');
                } else {
                    line.classList.remove('highlighted');
                    line.classList.add('dimmed');
                }
            });
        }
        
        unhighlightAll() {
            this.nodeElements.forEach(node => {
                node.classList.remove('highlighted', 'dimmed');
            });
            
            this.connectionElements.forEach(line => {
                line.classList.remove('highlighted', 'dimmed');
            });
        }
        
        applyStyles() {
            if (!document.getElementById('tech-tree-styles')) {
                const style = document.createElement('style');
                style.id = 'tech-tree-styles';
                style.textContent = this.generateStyles();
                document.head.appendChild(style);
            }
        }
        
        generateStyles() {
            return `
                /* 模态框背景 */
                .tech-tree-modal {
                    position: fixed;
                    display: flex;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(10px);
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                /* 内容容器 - 优化背景 */
                .tech-tree-content {
                    background: ${this.config.colors.modalBg};
                    padding: 30px;
                    border-radius: 24px;
                    width: 95%;
                    max-width: 1400px;
                    height: 90%;
                    overflow: auto;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                
                /* 标题样式 */
                .tech-tree-header {
                    text-align: center;
                    margin-bottom: 30px;
                    color: white;
                }
                
                .tech-tree-title {
                    font-size: 2.5em;
                    font-weight: 700;
                    margin: 0 0 10px 0;
                    background: linear-gradient(135deg, #fff 0%, #ddd 100%);
                    background-clip: text;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .tech-tree-subtitle {
                    font-size: 1.1em;
                    color: rgba(255,255,255,0.8);
                    margin: 0;
                }
                
                /* 关闭按钮优化 */
                .tech-tree-close {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 40px;
                    height: 40px;
                    border: none;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    font-size: 20px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                }
                
                .tech-tree-close:hover {
                    background: rgba(255,255,255,0.2);
                    transform: rotate(90deg);
                }
                
                /* 树容器滚动优化 */
                .tech-tree-content {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255,255,255,0.3) transparent;
                }
                
                .tech-tree-content::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                
                .tech-tree-content::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .tech-tree-content::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.3);
                    border-radius: 4px;
                }
                
                .tech-tree-content::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.5);
                }
                
                .tech-tree-container {
                    position: relative;
                    flex-grow: 1;
                    margin: 0 auto;
                }
                
                /* 节点样式优化 */
                .tech-tree-node {
                    border-radius: ${this.config.styles.nodeRadius};
                    box-shadow: ${this.config.styles.nodeShadow};
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 90;
                    border: 2px solid rgba(255,255,255,0.2);
                    backdrop-filter: blur(10px);
                    overflow: hidden;
                }
                
                .tech-tree-node::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                    transform: rotate(45deg);
                    transition: all 0.6s;
                    opacity: 0;
                }
                
                .tech-tree-node:hover::before {
                    animation: shimmer 0.6s ease;
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%) translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(100%) translateY(100%); opacity: 0; }
                }
                
                .tech-tree-node:hover {
                    transform: scale(${this.config.styles.hoverScale}) translateY(-4px);
                    box-shadow: ${this.config.styles.hoverShadow};
                    z-index: 100;
                    border-color: rgba(255,255,255,0.4);
                }
                
                /* 节点内容布局 */
                .tech-node-content {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                    width: 100%;
                    padding: 10px;
                }
                
                .tech-node-icon {
                    font-size: 1.8em;
                    margin-bottom: 4px;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                }
                
                .tech-node-name {
                    font-size: 0.9em;
                    font-weight: 600;
                    color: ${this.config.colors.textPrimary};
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                    line-height: 1.2;
                    font-family: ${this.config.styles.fonts.chinese}, ${this.config.styles.fonts.primary};
                    letter-spacing: 0.5px;
                }
                
                .tech-node-priority {
                    font-size: 0.75em;
                    color: ${this.config.colors.textDimmed};
                    margin-top: 2px;
                    font-weight: 500;
                }
                
                .tech-node-status {
                    position: absolute;
                    bottom: 5px;
                    right: 5px;
                    font-size: 0.9em;
                }
                
                /* 状态样式 */
                .tech-tree-node.completed {
                    background: ${this.config.colors.nodeGradients.completed} !important;
                    border-color: rgba(86, 171, 47, 0.5);
                }
                
                .tech-tree-node.completed .tech-node-name {
                    color: white;
                }
                
                .tech-tree-node.researching {
                    background: ${this.config.colors.nodeGradients.researching} !important;
                    border-color: rgba(255, 154, 0, 0.5);
                    animation: researching 2s ease-in-out infinite;
                }
                
                @keyframes researching {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                
                .tech-tree-node.locked {
                    background: ${this.config.colors.nodeGradients.locked} !important;
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                /* 高亮和淡化效果 */
                .tech-tree-node.highlighted {
                    box-shadow: 0 0 20px ${this.config.colors.highlightColor};
                    z-index: 101;
                    border-color: ${this.config.colors.highlightColor};
                }
                
                .tech-tree-node.dimmed {
                    opacity: 0.3;
                    filter: grayscale(0.5);
                }
                
                /* 连接线优化 */
                .tech-connection {
                    transition: all 0.3s ease;
                    stroke: ${this.config.colors.connectionColor};
                    stroke-width: 2;
                    fill: none;
                    stroke-dasharray: 0;
                }
                
                .tech-connection.highlighted {
                    stroke: ${this.config.colors.highlightColor};
                    stroke-width: 3;
                    filter: drop-shadow(0 0 6px ${this.config.colors.highlightColor});
                    z-index: 99;
                }
                
                .tech-connection.dimmed {
                    stroke: ${this.config.colors.dimmedColor};
                    stroke-width: 1;
                    opacity: 0.3;
                }
                
                /* 状态图标动画 */
                .tech-status-icon {
                    display: inline-block;
                    font-size: 1em;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
                }
                
                .tech-status-icon.researching {
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                    100% { opacity: 1; transform: scale(1); }
                }
                
                /* 响应式优化 */
                @media (max-width: 768px) {
                    .tech-tree-content {
                        padding: 20px;
                        border-radius: 16px;
                    }
                    
                    .tech-tree-title {
                        font-size: 2em;
                    }
                    
                    .tech-tree-node {
                        transform: scale(0.9);
                    }
                }
            `;
        }
        
        // 其他方法保持不变...
        findTechById(techId) {
            const allTechs = this.getAllNodes();
            return allTechs.find(t => t.id === techId);
        }
        
        setupDataListener() {
            // 留空
        }

        updateAllNodesStatus() {
            console.log('[TechTree] 批量刷新所有节点状态');
            this.nodeElements.forEach((node, techId) => {
                const tech = this.findTechById(techId);
                if (tech) {
                    this.updateNodeStatus(node, tech);
                }
            });
        }

        updateNodeStatus(node, tech) {
            console.log(`[TechTree] 更新节点: ${tech.name}`);
            const developments = window.gameData?.developments || [];
            const devProject = developments.find(d => d.researchName === tech.name);
            
            node.classList.remove('completed', 'researching', 'locked', 'level-progress');
            
            if (devProject) {
                const progress = this.calculateProgress(devProject);
                const isResearched = progress.isCompleted;
                const isResearching = devProject.active && !devProject.paused && !isResearched;
                
                if (isResearched) {
                    node.classList.add('completed');
                } else if (isResearching) {
                    node.classList.add('researching');
                    
                    // 如果有等级进度，显示当前等级进度
                    if (progress.currentLevel && progress.currentLevelProgress) {
                        node.classList.add('level-progress');
                        const levelProgress = Math.round(progress.currentLevelProgress.progressPercentage || 0);
                        
                        // 更新进度显示
                        const progressBar = node.querySelector('.tech-progress-bar');
                        if (progressBar) {
                            progressBar.style.width = `${levelProgress}%`;
                            progressBar.title = `当前等级进度: ${progress.currentLevelProgress.progress}/${progress.currentLevelProgress.total}`;
                        }
                        
                        // 更新等级信息
                        const levelInfo = node.querySelector('.tech-level-info');
                        if (levelInfo) {
                            levelInfo.textContent = `等级 ${progress.currentLevel}/${progress.total}`;
                            levelInfo.title = `已完成 ${progress.count} 个等级，共 ${progress.total} 个等级`;
                        }
                    }
                }
                
                const statusDiv = node.querySelector('.tech-node-status');
                if (statusDiv) {
                    let statusIcon = '';
                    let statusText = '';
                    
                    if (isResearched) {
                        statusIcon = '<span class="tech-status-icon" title="已完成">✅</span>';
                    } else if (isResearching) {
                        if (progress.currentLevel && progress.currentLevel > 1) {
                            statusIcon = '<span class="tech-status-icon researching" title="进行中">⏳</span>';
                            statusText = `<span class="tech-level-info">等级 ${progress.currentLevel}/${progress.total}</span>`;
                        } else {
                            statusIcon = '<span class="tech-status-icon researching" title="进行中">⏳</span>';
                        }
                    }
                    
                    statusDiv.innerHTML = statusIcon + statusText;
                }
            }
            
            // 检查是否满足前置条件
            if (tech.requirements && tech.requirements.length > 0) {
                const allRequirementsMet = tech.requirements.every(reqId => {
                    const reqDev = developments.find(d => {
                        const reqTech = this.findTechById(reqId);
                        return reqTech && d.researchName === reqTech.name;
                    });
                    if (reqDev) {
                        const progress = this.calculateProgress(reqDev);
                        return progress.isCompleted;
                    }
                    return false;
                });
                
                if (!allRequirementsMet) {
                    node.classList.add('locked');
                }
            }
        }

        calculateProgress(dev) {
            // 使用新的等级进度计算器
            if (window.levelProgressCalculator) {
                const progressResult = window.levelProgressCalculator.calculateLevelProgress(dev);
                
                // 转换为兼容的格式
                return {
                    count: progressResult.completedLevels,
                    total: progressResult.totalLevels,
                    currentLevel: progressResult.currentLevel,
                    currentLevelProgress: progressResult.currentLevelProgress,
                    isCompleted: progressResult.isCompleted
                };
            }
            
            // 后备方案：使用传统计算方式
            let prodNames = [];
            if (window.gameData?.productions) {
                prodNames = window.gameData.productions
                    .filter(p => p.linkedDev === dev.researchName)
                    .map(p => p.name);
            }
            if (prodNames.length === 0 && dev.prodName) {
                prodNames = [dev.prodName];
            }
            
            const timeLogs = (window.gameData?.timeLogs || []).filter(log => 
                prodNames.includes(log.name)
            );
            
            return {
                count: timeLogs.length,
                total: dev.target || 21,
                currentLevel: 1,
                currentLevelProgress: {
                    completed: timeLogs.length >= (dev.target || 21),
                    progress: timeLogs.length,
                    total: dev.target || 21
                },
                isCompleted: timeLogs.length >= (dev.target || 21)
            };
        }

        // 检查阶段要求是否满足
        checkStageRequirements(stage, logs) {
            // 根据阶段类型检查不同的要求
            switch (stage.type) {
                case 'fixed_time':
                    // 检查固定时间要求（如23:30睡觉）
                    const timeMatches = logs.filter(log => {
                        const logTime = new Date(log.date);
                        const hour = logTime.getHours();
                        const minute = logTime.getMinutes();
                        const requiredTime = stage.time.split(':');
                        return hour === parseInt(requiredTime[0]) && 
                               minute === parseInt(requiredTime[1]);
                    });
                    return {
                        completed: timeMatches.length >= stage.requiredCount,
                        progress: timeMatches.length,
                        total: stage.requiredCount
                    };

                case 'time_window':
                    // 检查时间窗口要求（如睡前30分钟无屏幕）
                    const windowMatches = logs.filter(log => {
                        const logTime = new Date(log.date);
                        // 实现时间窗口检查逻辑
                        return this.isInTimeWindow(logTime, stage.window);
                    });
                    return {
                        completed: windowMatches.length >= stage.requiredCount,
                        progress: windowMatches.length,
                        total: stage.requiredCount
                    };

                case 'duration':
                    // 检查持续时间要求
                    const durationMatches = logs.filter(log => 
                        log.duration >= stage.minDuration
                    );
                    return {
                        completed: durationMatches.length >= stage.requiredCount,
                        progress: durationMatches.length,
                        total: stage.requiredCount
                    };

                default:
                    // 默认只检查次数
                    return {
                        completed: logs.length >= stage.requiredCount,
                        progress: logs.length,
                        total: stage.requiredCount
                    };
            }
        }

        // 检查时间是否在指定窗口内
        isInTimeWindow(time, window) {
            const hour = time.getHours();
            const minute = time.getMinutes();
            const totalMinutes = hour * 60 + minute;

            const [startTime, endTime] = window.split('-');
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);

            const windowStart = startHour * 60 + startMinute;
            const windowEnd = endHour * 60 + endMinute;

            return totalMinutes >= windowStart && totalMinutes <= windowEnd;
        }

        getOrthogonalPath(from, to, nodePositions, layerInfo, channels, targetInEdges) {
            const fromPos = nodePositions[from];
            const toPos = nodePositions[to];
            if (!fromPos || !toPos) return [];
            
            const points = [];
            const fromLayer = Math.round((fromPos.y - 80) / this.config.layout.layerHeight);
            const toLayer = Math.round((toPos.y - 80) / this.config.layout.layerHeight);
            
            const startX = fromPos.x + this.config.layout.nodeWidth / 2;
            const startY = fromPos.y + this.config.layout.nodeHeight;
            const endX = toPos.x + this.config.layout.nodeWidth / 2;
            const endY = toPos.y;
            
            if (fromLayer < toLayer) {
                points.push([startX, startY]);
                
                const siblings = targetInEdges && targetInEdges[to] ? targetInEdges[to] : [];
                const index = siblings.indexOf(from);
                
                const hasVerticalSibling = siblings.some(sibling => {
                    if (sibling === from) return false;
                    const siblingPos = nodePositions[sibling];
                    if (!siblingPos) return false;
                    const siblingLayer = Math.round((siblingPos.y - 80) / this.config.layout.layerHeight);
                    return siblingLayer > fromLayer && Math.abs(siblingPos.x - fromPos.x) < this.config.layout.nodeWidth;
                });
                
                if (hasVerticalSibling) {
                    const firstChannelY = channels[`${fromLayer}-${fromLayer+1}`];
                    points.push([startX, firstChannelY]);
                    
                    const channelX = startX + this.config.layout.nodeWidth + this.config.layout.minSpacing;
                    points.push([channelX, firstChannelY]);
                    
                    for (let layer = fromLayer + 1; layer < toLayer; layer++) {
                        const channelY = channels[`${layer}-${layer+1}`];
                        if (!channelY) continue;
                        points.push([channelX, channelY]);
                    }
                    
                    const lastChannelY = channels[`${toLayer-1}-${toLayer}`];
                    if (lastChannelY) {
                        points.push([channelX, lastChannelY]);
                        points.push([endX, lastChannelY]);
                    }
                    points.push([endX, endY]);
                } else {
                    for (let layer = fromLayer; layer < toLayer; layer++) {
                        const channelY = channels[`${layer}-${layer+1}`];
                        if (!channelY) continue;
                        points.push([startX, channelY]);
                        if (layer === toLayer - 1 && startX !== endX) {
                            points.push([endX, channelY]);
                        }
                    }
                    points.push([endX, endY]);
                }
                return points;
            }
            
            const channelY = channels[`${fromLayer}-${fromLayer+1}`];
            if (channelY) {
                const targetBottom = toPos.y + this.config.layout.nodeHeight;
                points.push([startX, startY]);
                points.push([startX, channelY]);
                points.push([endX, channelY]);
                points.push([endX, targetBottom]);
                points.push([endX, targetBottom - 2]);
            } else {
                points.push([startX, startY]);
                points.push([endX, endY]);
            }
            return points;
        }

        static calculateLayerChannels(nodePositions) {
            const layerInfo = {};
            const config = CONFIG; // 使用配置中的值
            
            Object.entries(nodePositions).forEach(([id, pos]) => {
                const layer = Math.round((pos.y - 80) / config.layout.layerHeight);
                if (!layerInfo[layer]) {
                    layerInfo[layer] = {
                        minY: pos.y,
                        maxY: pos.y + config.layout.nodeHeight,
                        nodes: []
                    };
                }
                layerInfo[layer].nodes.push({ 
                    id, 
                    x: pos.x, 
                    y: pos.y,
                    left: pos.x,
                    right: pos.x + config.layout.nodeWidth,
                    top: pos.y,
                    bottom: pos.y + config.layout.nodeHeight,
                    centerX: pos.x + config.layout.nodeWidth / 2,
                    centerY: pos.y + config.layout.nodeHeight / 2
                });
            });
            
            Object.values(layerInfo).forEach(layer => {
                layer.nodes.sort((a, b) => a.x - b.x);
            });
            
            const channels = {};
            const layers = Object.keys(layerInfo).map(Number).sort((a, b) => a - b);
            
            for (let i = 0; i < layers.length - 1; i++) {
                const currentLayer = layers[i];
                const nextLayer = layers[i + 1];
                const gap = layerInfo[nextLayer].minY - layerInfo[currentLayer].maxY;
                channels[`${currentLayer}-${nextLayer}`] = 
                    layerInfo[currentLayer].maxY + gap / 2;
            }
            
            return { layerInfo, channels, layers };
        }
    }
    
    // 导出到全局
    window.TechTreeRenderer = TechTreeRenderer;
    window.TechTreeConfig = CONFIG;
    
    // 改进的布局算法
    function topoSortLayer(nodes, allEdges) {
        const inDegree = {};
        nodes.forEach(n => inDegree[n.id] = 0);
        
        allEdges.forEach(e => {
            if (inDegree[e.to] !== undefined && nodes.find(n => n.id === e.from)) {
                inDegree[e.to]++;
            }
        });
        
        const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
        const result = [];
        const used = new Set();
        
        while (queue.length) {
            const id = queue.shift();
            if (used.has(id)) continue;
            used.add(id);
            const node = nodes.find(n => n.id === id);
            if (node) result.push(node);
            
            allEdges.forEach(e => {
                if (e.from === id && inDegree[e.to] !== undefined) {
                    inDegree[e.to]--;
                    if (inDegree[e.to] === 0) queue.push(e.to);
                }
            });
        }
        
        nodes.forEach(n => { 
            if (!used.has(n.id)) result.push(n); 
        });
        
        return result;
    }

    function layoutNodesByLayer(nodes, allEdges) {
        const layers = {};
        nodes.forEach(node => {
            if (!layers[node.layer]) layers[node.layer] = [];
            layers[node.layer].push(node);
        });
        
        const nodePositions = {};
        const layerKeys = Object.keys(layers).sort((a, b) => a - b);
        const config = CONFIG;
        
        layerKeys.forEach((layerIdx) => {
            let layerNodes = layers[layerIdx];
            layerNodes = topoSortLayer(layerNodes, allEdges);
            
            const y = config.layout.layerHeight * layerIdx + 80;
            const totalWidth = layerNodes.length * config.layout.nodeWidth + 
                              (layerNodes.length - 1) * config.layout.minSpacing;
            let x = (config.layout.containerWidth - totalWidth) / 2;
            
            layerNodes.forEach(node => {
                nodePositions[node.id] = { x, y };
                x += config.layout.nodeWidth + config.layout.minSpacing;
            });
        });
        
        return nodePositions;
    }

    // 保留renderDevLibrary实现
    window.renderDevLibrary = async function() {
        if (!window.__devLibraryManualOpen && !window.__devLibraryForceRender) {
            return;
        }
        window.__devLibraryManualOpen = false;
        window.__devLibraryForceRender = false;

        try {
            const techData = await loadDevLibraryFromJSON();
            if (!techData || !techData.techTree) {
                alert('科技树数据加载失败');
                return;
            }

            const renderer = new TechTreeRenderer('tech-tree-container');
            window.techTreeRendererInstance = renderer; // 保存实例引用
            
            await renderer.render(techData.techTree);
            
        } catch (error) {
            console.error("Failed to render dev library:", error);
            showCustomModal({
                title: 'Error',
                content: `Could not load technology tree data. Please check the console for details. Error: ${error.message}`
            });
        }
    };
    
    // 改进的科技详情弹窗样式
    window.showTechDetailModal = function(tech) {
        const existingModal = document.getElementById('tech-detail-modal');
        if (existingModal) existingModal.remove();

        const detailModal = document.createElement('div');
        detailModal.id = 'tech-detail-modal';
        detailModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            z-index: 10000;
            width: 90%;
            max-width: 600px;
            border: 1px solid rgba(0,0,0,0.1);
            backdrop-filter: blur(20px);
        `;

        let isResearched = false;
        let isResearching = false;
        let devProject = null;
        
        if (window.gameData && Array.isArray(window.gameData.developments)) {
            devProject = window.gameData.developments.find(d => d.researchName === tech.name);
            if (devProject) {
                const renderer = window.techTreeRendererInstance;
                if (renderer) {
                    const progress = renderer.calculateProgress(devProject);
                    isResearched = progress.count >= progress.total;
                    isResearching = devProject.active && !devProject.paused && !isResearched;
                }
            }
        }
        
        let statusText = '';
        let statusStyle = '';
        if (isResearched) {
            statusText = '已完成 ✅';
            statusStyle = 'color: #27ae60; font-weight: bold;';
        } else if (isResearching) {
            statusText = '进行中 ⏳';
            statusStyle = 'color: #f39c12; font-weight: bold; animation: pulse 2s infinite;';
        }

        const gradient = getNodeGradient(tech);
        
        let requirementsHTML = '无';
        if (tech.requirements && tech.requirements.length > 0) {
            requirementsHTML = tech.requirements.join(', ');
        }
        
        let unlocksHTML = '无';
        if (tech.unlocks && tech.unlocks.length > 0) {
            unlocksHTML = tech.unlocks.join(', ');
        }
        
        detailModal.innerHTML = `
            <style>
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { opacity: 1; }
                }
                .detail-header {
                    background: ${gradient};
                    margin: -30px -30px 25px -30px;
                    padding: 30px;
                    border-radius: 20px 20px 0 0;
                    text-align: center;
                    color: white;
                    position: relative;
                    overflow: hidden;
                }
                .detail-header::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                    transform: rotate(45deg);
                    animation: shimmer 3s infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                }
                .detail-grid {
                    display: grid;
                    grid-template-columns: 120px 1fr;
                    gap: 12px 20px;
                    align-items: start;
                    margin-bottom: 25px;
                }
                .detail-grid strong {
                    color: #555;
                    text-align: right;
                    font-weight: 600;
                    font-size: 0.95em;
                }
                .detail-grid span {
                    color: #333;
                    line-height: 1.5;
                }
                .detail-actions {
                    text-align: center;
                    margin-top: 30px;
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    align-items: center;
                }
                .detail-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.95em;
                    color: #666;
                }
                .detail-checkbox input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                .btn-detail {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 1em;
                }
                .btn-detail-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                }
                .btn-detail-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }
                .btn-detail-secondary {
                    background: #f0f0f0;
                    color: #666;
                }
                .btn-detail-secondary:hover {
                    background: #e0e0e0;
                }
                .btn-detail:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none !important;
                }
            </style>
            <div class="detail-header">
                <h2 style="margin: 0; font-size: 2em; position: relative; z-index: 1;">
                    ${tech.icon || '🔬'} ${tech.name}
                </h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9; position: relative; z-index: 1;">
                    ${tech.description || ''}
                </p>
                ${statusText ? `<div style="${statusStyle} margin-top: 10px; position: relative; z-index: 1;">${statusText}</div>` : ''}
            </div>
            <div class="detail-grid">
                <strong>优先级</strong>     <span style="color: #e74c3c; font-weight: bold;">${tech.priority || 'N/A'}</span>
                <strong>类别</strong>       <span>${tech.category || '未分类'}</span>
                <strong>需要前置</strong>   <span>${requirementsHTML}</span>
                <strong>解锁科技</strong>   <span>${unlocksHTML}</span>
                <strong>核心行动</strong>   <span style="font-weight:bold; color:#3498db;">${tech.action || 'N/A'}</span>
                <strong>成功标志</strong>   <span>${tech.success_metric || 'N/A'}</span>
                <strong>预计用时</strong>   <span>${tech.estimated_time || 'N/A'}</span>
                <strong>自动化奖励</strong> <span style="color:#27ae60;">${tech.automation_reward || 'N/A'}</span>
                <strong>频率</strong>       <span>${tech.freq || 'N/A'}</span>
                <strong>周期/目标</strong>  <span>${tech.cycle || 'N/A'} 天 / ${tech.target || 'N/A'} 次</span>
            </div>
            <div class="detail-actions">
                ${!isResearched && !isResearching ? `
                    <label class="detail-checkbox">
                        <input type="checkbox" id="tech-create-production-checkbox" checked>
                        创建对应的生产线
                    </label>
                    <button id="start-research-btn" class="btn-detail btn-detail-primary">
                        🚀 开始研究
                    </button>
                ` : `
                    <button class="btn-detail btn-detail-secondary" disabled>
                        ${isResearching ? '⏳ 研究进行中' : '✅ 已完成'}
                    </button>
                `}
                <button id="close-detail-btn" class="btn-detail btn-detail-secondary">关闭</button>
            </div>
        `;
        
        document.body.appendChild(detailModal);
        
        document.getElementById('close-detail-btn').onclick = () => {
            detailModal.remove();
        };
        
        const startBtn = document.getElementById('start-research-btn');
        if (startBtn) {
            startBtn.onclick = () => {
                const fullTech = {
                    ...tech,
                    prodName: tech.prodName || tech.name,
                    icon: tech.icon || '🧪',
                    level: 1,
                    progress: 0,
                    maxProgress: tech.target || 1,
                    active: true,
                    paused: false,
                    repeatable: tech.repeatable || false,
                    checkedToday: false,
                    category: tech.category || '',
                    cycle: tech.cycle || 21,
                    target: tech.target || 17,
                    action: tech.action || '',
                    science: tech.science || '',
                    freq: tech.freq || '每天',
                    startDate: new Date().toISOString()
                };
                
                const createProd = document.getElementById('tech-create-production-checkbox');
                const createProductionLine = createProd && createProd.checked;
                
                if (typeof window.startResearch === 'function') {
                    window.startResearch(fullTech, createProductionLine);
                }
                
                detailModal.remove();
                
                // 刷新科技树节点状态
                if (window.techTreeRendererInstance) {
                    setTimeout(() => {
                        window.techTreeRendererInstance.updateAllNodesStatus();
                    }, 100);
                }
            };
        }
    };

    // 提供全局刷新方法
    window.refreshTechTreeNodes = () => {
        if (window.techTreeRendererInstance) {
            window.techTreeRendererInstance.updateAllNodesStatus();
        }
    };

})(window);