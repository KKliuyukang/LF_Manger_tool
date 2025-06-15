// =================================================================================
// Life Factorio - Tech Tree Module
// This file contains the new, standalone implementation for the technology tree.
// It replaces the original functions in LF_tool.js when loaded.
// =================================================================================

/**
 * Checks if a research project has been started or completed.
 * This function OVERWRITES the old version in LF_tool.js.
 * @param {string} researchName - The name of the technology to check.
 * @returns {boolean} - True if the research exists in gameData.
 */
function hasResearch(researchName) {
    if (!gameData || !gameData.developments) {
        console.error("gameData.developments is not available for hasResearch check.");
        return false;
    }
    // Correctly checks the developments array for the research project.
    return gameData.developments.some(dev => dev.researchName === researchName);
}

// Dummy sortNodesForLayout function to maintain compatibility with renderDevLibrary call structure.
// The actual layout logic is now integrated into calculateNodePositions.
function sortNodesForLayout(techTree) {
    console.log('Sorting is now integrated into positioning.');
    return JSON.parse(JSON.stringify(techTree));
}

/**
 * Calculates node positions using a compact tree layout algorithm.
 * This function creates a top-down hierarchical tree structure.
 * @param {object} techTree - The tech tree data.
 * @returns {Map<string, {x: number, y: number}>} A map of node IDs to their calculated positions.
 */
function calculateNodePositions(techTree) {
    const positions = new Map();
    const techMap = new Map();
    const containerWidth = 2400;
    const layerHeight = 220; // Vertical space between layers
    const nodeWidth = 180;
    const horizontalSpacing = 40; // Horizontal space between nodes

    // 1. Create a deep copy and build a map of all techs with layer info
    const tree = JSON.parse(JSON.stringify(techTree));
    const allTechs = [];
    tree.layers.forEach((layer, layerIndex) => {
        layer.technologies.forEach((tech, techIndex) => {
            tech.layerIndex = layerIndex;
            tech.techIndex = techIndex; // Original index for sorting stability
            techMap.set(tech.id, tech);
            allTechs.push(tech);
        });
    });
    if (tree.finalGoal) {
        const finalGoalLayerIndex = tree.layers.length;
        tree.finalGoal.layerIndex = finalGoalLayerIndex;
        techMap.set(tree.finalGoal.id, tree.finalGoal);
        allTechs.push(tree.finalGoal);
        // Add final goal as its own layer for processing
        tree.layers.push({ layer: finalGoalLayerIndex, technologies: [tree.finalGoal] });
    }

    // 2. Position nodes layer by layer, starting from the top
    for (let layerIndex = 0; layerIndex < tree.layers.length; layerIndex++) {
        const layerTechs = tree.layers[layerIndex].technologies;

        // Calculate the ideal x-position for each node based on its parents' average x-position
        layerTechs.forEach(tech => {
            const y = 100 + layerIndex * layerHeight;
            let idealX = 0;
            if (tech.requirements && tech.requirements.length > 0) {
                let parentXSum = 0;
                let parentCount = 0;
                tech.requirements.forEach(reqId => {
                    if (positions.has(reqId)) {
                        parentXSum += positions.get(reqId).x;
                        parentCount++;
                    }
                });
                if (parentCount > 0) {
                    idealX = parentXSum / parentCount;
                }
            }
            positions.set(tech.id, { x: idealX, y: y, idealX: idealX });
        });

        // Sort nodes in the current layer based on their ideal X to maintain tree structure
        layerTechs.sort((a, b) => {
            const posA = positions.get(a.id);
            const posB = positions.get(b.id);
            if (posA.idealX !== posB.idealX) {
                return posA.idealX - posB.idealX;
            }
            return a.techIndex - b.techIndex; // Fallback to original order
        });
        
        // 3. Resolve collisions and finalize X positions for the current layer
        let currentX = 0;
        layerTechs.forEach((tech, index) => {
            if (index > 0) {
                const prevTech = layerTechs[index - 1];
                const prevPos = positions.get(prevTech.id);
                currentX = prevPos.x + nodeWidth + horizontalSpacing;
            }
            const pos = positions.get(tech.id);
            pos.x = Math.max(currentX, pos.x); // Use calculated position but ensure no overlap
        });

        // 4. Center the entire block of nodes in the layer
        const layerWidth = layerTechs.length > 0
            ? positions.get(layerTechs[layerTechs.length - 1].id).x + nodeWidth - positions.get(layerTechs[0].id).x
            : 0;
        
        const layerStartX = layerTechs.length > 0 ? positions.get(layerTechs[0].id).x : 0;
        const centeringOffset = ((containerWidth - layerWidth) / 2) - layerStartX;

        layerTechs.forEach(tech => {
            positions.get(tech.id).x += centeringOffset;
        });
    }

    return positions;
}


// Global flag to prevent automatic/unwanted rendering calls
window.__devLibraryManualOpen = false;

/**
 * Renders the entire technology tree modal.
 * This is the main entry point for displaying the tech tree.
 */
async function renderDevLibrary() {
    // Only render if opened manually by the user via a button click
    if (!window.__devLibraryManualOpen) {
        console.log("renderDevLibrary call skipped: not triggered by manual user action.");
        return;
    }
    window.__devLibraryManualOpen = false; // Reset flag after use

    try {
        // Wait for the data to be loaded
        const originalTechTreeData = await loadDevLibraryFromJSON();
        
        if (!originalTechTreeData || !originalTechTreeData.techTree) {
            throw new Error("Loaded data is not in the correct format.");
        }

        // The sortNodesForLayout is now just a pass-through.
        const techTree = sortNodesForLayout(originalTechTreeData.techTree);
        
        // The new calculateNodePositions function handles the entire layout.
        const nodePositions = calculateNodePositions(techTree);
        
        // --- PROCEED WITH RENDERING using the calculated positions ---
        
        // Create a map here for rendering purposes (with layerIndex)
        const techRenderMap = new Map();
        techTree.layers.forEach((layer, layerIndex) => {
            layer.technologies.forEach(tech => {
                techRenderMap.set(tech.id, { ...tech, layerIndex });
            });
        });
        if (techTree.finalGoal) {
            techRenderMap.set(techTree.finalGoal.id, { ...techTree.finalGoal, layerIndex: techTree.layers.length });
        }
        
        // Remove any existing modal to prevent duplicates
        const existingModal = document.getElementById('dev-library-modal');
        if (existingModal) existingModal.remove();

        // Create the main modal container
        const modal = document.createElement('div');
        modal.id = 'dev-library-modal';
        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: '1000', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#333'
        });

        // Create the content area
        const content = document.createElement('div');
        content.id = 'dev-library-content';
        Object.assign(content.style, {
            backgroundColor: '#f4f4f9', padding: '20px', borderRadius: '10px',
            width: '95%', height: '90%', position: 'relative',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)', overflow: 'auto'
        });

        // Create a dedicated close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        Object.assign(closeButton.style, {
            position: 'fixed', top: '20px', left: '20px', zIndex: '10001',
            background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%',
            width: '40px', height: '40px', fontSize: '18px', cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
        });
        closeButton.onclick = () => modal.remove();
        modal.appendChild(closeButton);

        // Create the container for all tech nodes and lines
        const techContainer = document.createElement('div');
        techContainer.id = 'tech-container';
        techContainer.style.position = 'relative';
        // Set a fixed large size for the container to hold absolute positions
        const containerHeight = (techTree.layers.length + 1) * 220;
        techContainer.style.width = '2400px';
        techContainer.style.height = `${containerHeight}px`;

        // **LAYOUT REWORK: Render all nodes with absolute positions**
        const allNodes = [...techTree.layers.flatMap(l => l.technologies)];
        allNodes.forEach(tech => {
            if (tech && nodePositions.has(tech.id)) {
                const pos = nodePositions.get(tech.id);
                const isFinalGoal = tech.id === techTree.finalGoal?.id;
                const techInfo = techRenderMap.get(tech.id);
                const node = createTechNode(tech, techInfo.layerIndex, isFinalGoal);
                Object.assign(node.style, {
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                });
                techContainer.appendChild(node);
            }
        });
        
        content.appendChild(techContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Draw connection lines after a short delay to ensure nodes are rendered
        setTimeout(() => {
            drawLines(techTree, techContainer, techRenderMap);
            setupInteractiveHighlighting(techContainer, techTree);
        }, 150);

    } catch (error) {
        console.error("Failed to render dev library:", error);
        showCustomModal({ title: 'Error', content: `Could not load technology tree data. Please check the console for details. Error: ${error.message}` });
    }
}

/**
 * Creates a single visual node for a technology.
 * @param {object} tech - The technology data object.
 * @param {number} layerIndex - The layer index of the technology for coloring.
 * @param {boolean} isGoal - True if this is the final goal node.
 * @returns {HTMLElement} The created node element.
 */
function createTechNode(tech, layerIndex, isGoal = false) {
    const node = document.createElement('div');
    node.id = `tech-${tech.id}`;
    node.className = 'tech-node';

    // **VISUAL UPGRADE: Define a color palette for layers**
    const layerColors = ['#3498db', '#1abc9c', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#34495e', '#7f8c8d'];
    const borderColor = isGoal ? '#c0392b' : layerColors[layerIndex % layerColors.length];

    // **BUG FIX: Refined status checking to align with main app logic**
    const devProject = gameData.developments.find(d => d.researchName === tech.name);
    // A research is "completed" only if its progress reaches the max and it's not a repeatable quest that's active.
    let isResearched = false;
    let isResearching = false;
    
    if (devProject) {
        // hasResearch checks for existence. isResearching means it exists and is active.
        isResearching = devProject.active && (!devProject.paused);
        // isResearched means it's fully progressed.
        if (devProject.progress !== undefined && devProject.maxProgress !== undefined) {
             // A project is only truly "researched" if progress is full.
            isResearched = devProject.progress >= devProject.maxProgress;
        }
        // If it's researched, it's no longer considered "researching" for the purpose of node color.
        if(isResearched) isResearching = false;
    }
    
    // Apply styles based on status
    Object.assign(node.style, {
        background: isResearched ? '#bdc3c7' : (isResearching ? '#f39c12' : 'white'), // Use a distinct 'researching' color
        border: `3px solid ${borderColor}`,
        borderRadius: '8px', padding: '10px', margin: '15px', cursor: 'pointer',
        minWidth: '150px', textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative', zIndex: '10' // Nodes above lines
    });
    
    if (isGoal) {
        Object.assign(node.style, {
            borderColor: '#c0392b',
            background: 'linear-gradient(45deg, #e74c3c, #c0392b)',
            color: 'white'
        });
    }

    node.innerHTML = `<div style="font-size: 24px;">${tech.icon || '🧪'}</div><div style="font-weight: bold; margin-top: 5px;">${tech.name}</div>`;
    
    // Add interactions
    node.onmouseover = () => { node.style.transform = 'scale(1.05)'; node.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'; };
    node.onmouseout = () => { node.style.transform = 'scale(1)'; node.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'; };
    node.onclick = () => showTechDetailModal(tech);

    return node;
}


/**
 * Draws clean, tree-style SVG lines connecting the technology nodes.
 * @param {object} techTreeData - The full tech tree data object.
 * @param {HTMLElement} container - The parent container of the nodes.
 * @param {Map} techMap - A map of all tech data, including layerIndex.
 */
function drawLines(techTreeData, container, techMap) {
    const existingSvg = container.querySelector('#tech-lines-svg');
    if (existingSvg) existingSvg.remove();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'tech-lines-svg';
    Object.assign(svg.style, {
        position: 'absolute', top: 0, left: 0,
        width: container.scrollWidth, height: container.scrollHeight,
        zIndex: 1, pointerEvents: 'none'
    });

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    container.prepend(svg);

    const nodeRects = new Map();
    container.querySelectorAll('.tech-node').forEach(nodeEl => {
        const nodeId = nodeEl.id.replace('tech-', '');
        nodeRects.set(nodeId, {
            id: nodeId,
            x: nodeEl.offsetLeft,
            y: nodeEl.offsetTop,
            width: nodeEl.offsetWidth,
            height: nodeEl.offsetHeight,
            cx: nodeEl.offsetLeft + nodeEl.offsetWidth / 2,
            cy: nodeEl.offsetTop + nodeEl.offsetHeight / 2,
        });
    });

    const createArrowMarker = (color, id) => {
        const markerId = `arrow-${id}`;
        if (defs.querySelector(`#${markerId}`)) return markerId;
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.id = markerId;
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '8');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto-start-reverse');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        path.setAttribute('fill', color);
        marker.appendChild(path);
        defs.appendChild(marker);
        return markerId;
    };

    const getNodeColor = (nodeId) => {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        let hash = 0;
        for (let i = 0; i < nodeId.length; i++) {
            hash = nodeId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const connectionGroups = new Map();
    const allTechs = Array.from(techMap.values());
    allTechs.forEach(tech => {
        if (tech.requirements) {
            tech.requirements.forEach(reqId => {
                if (!connectionGroups.has(reqId)) {
                    connectionGroups.set(reqId, []);
                }
                connectionGroups.get(reqId).push(tech.id);
            });
        }
    });

    connectionGroups.forEach((childIds, parentId) => {
        const parentRect = nodeRects.get(parentId);
        if (!parentRect) return;

        const childrenRects = childIds.map(childId => nodeRects.get(childId)).filter(Boolean);
        if (childrenRects.length === 0) return;

        const color = getNodeColor(parentId);
        const verticalTrunkY = parentRect.y + parentRect.height + 40; // Vertical "bus" line Y-position

        // Draw main vertical trunk from parent
        const trunkStart = { x: parentRect.cx, y: parentRect.y + parentRect.height };
        const trunkEnd = { x: parentRect.cx, y: verticalTrunkY };
        const mainTrunk = document.createElementNS("http://www.w3.org/2000/svg", "path");
        mainTrunk.setAttribute('d', `M ${trunkStart.x} ${trunkStart.y} V ${trunkEnd.y}`);
        mainTrunk.setAttribute('stroke', color);
        mainTrunk.setAttribute('stroke-width', '2');
        mainTrunk.setAttribute('fill', 'none');
        mainTrunk.classList.add('connection-path');
        mainTrunk.dataset.parentId = parentId;
        mainTrunk.dataset.pathType = 'trunk';
        svg.appendChild(mainTrunk);

        // Draw horizontal branch connecting all children
        const minChildX = Math.min(...childrenRects.map(r => r.cx));
        const maxChildX = Math.max(...childrenRects.map(r => r.cx));
        const horizontalBranch = document.createElementNS("http://www.w3.org/2000/svg", "path");
        // Connect main trunk to the horizontal branch
        const branchStartX = Math.min(parentRect.cx, minChildX);
        const branchEndX = Math.max(parentRect.cx, maxChildX);
        horizontalBranch.setAttribute('d', `M ${branchStartX} ${verticalTrunkY} H ${branchEndX}`);
        horizontalBranch.setAttribute('stroke', color);
        horizontalBranch.setAttribute('stroke-width', '2');
        horizontalBranch.setAttribute('fill', 'none');
        horizontalBranch.classList.add('connection-path');
        horizontalBranch.dataset.parentId = parentId;
        horizontalBranch.dataset.pathType = 'branch';
        svg.appendChild(horizontalBranch);

        // Draw vertical lines from horizontal branch to each child
        childrenRects.forEach(childRect => {
            const childLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const d = `M ${childRect.cx} ${verticalTrunkY} V ${childRect.y}`;
            childLine.setAttribute('d', d);
            childLine.setAttribute('stroke', color);
            childLine.setAttribute('stroke-width', '2');
            childLine.setAttribute('fill', 'none');
            childLine.classList.add('connection-path');
            childLine.dataset.parentId = parentId;
            childLine.dataset.childId = childRect.id;
            childLine.dataset.pathType = 'child-link';
            const markerId = createArrowMarker(color, `${parentId}-${childRect.id}`);
            childLine.setAttribute('marker-end', `url(#${markerId})`);
            svg.appendChild(childLine);
        });
    });
}

/**
 * Sets up interactive highlighting for nodes and connections.
 * @param {HTMLElement} container - The main container for the tech tree.
 * @param {object} techTreeData - The full tech tree data.
 */
function setupInteractiveHighlighting(container, techTreeData) {
    const allNodes = container.querySelectorAll('.tech-node');
    const allPaths = container.querySelectorAll('.connection-path');

    const techMap = new Map();
    const childMap = new Map();
    const allTechs = [];

    techTreeData.layers.forEach(l => allTechs.push(...l.technologies));
    if (techTreeData.finalGoal) allTechs.push(techTreeData.finalGoal);
    
    allTechs.forEach(tech => {
        techMap.set(tech.id, tech);
        if (tech.requirements) {
            tech.requirements.forEach(reqId => {
                if (!childMap.has(reqId)) childMap.set(reqId, []);
                childMap.get(reqId).push(tech.id);
            });
        }
    });

    allNodes.forEach(nodeEl => {
        const nodeId = nodeEl.id.replace('tech-', '');
        
        nodeEl.addEventListener('mouseenter', () => {
            const tech = techMap.get(nodeId);
            if (!tech) return;

            const parentIds = tech.requirements || [];
            const childIds = childMap.get(nodeId) || [];
            const relatedNodeIds = new Set([nodeId, ...parentIds, ...childIds]);

            // Dim unrelated nodes
            allNodes.forEach(otherNodeEl => {
                if (!relatedNodeIds.has(otherNodeEl.id.replace('tech-', ''))) {
                    otherNodeEl.style.opacity = '0.2';
                    otherNodeEl.style.transition = 'opacity 0.3s';
                }
            });
            
            // Dim all paths then highlight related ones
            allPaths.forEach(p => {
                 p.style.opacity = '0.1';
                 p.style.transition = 'opacity 0.3s';
            });

            // Highlight outgoing paths (when this node is a parent)
            container.querySelectorAll(`[data-parent-id="${nodeId}"]`).forEach(p => {
                p.style.opacity = '1';
            });

            // Highlight incoming paths (when this node is a child)
            parentIds.forEach(parentId => {
                // Highlight the specific vertical line to this child
                container.querySelectorAll(`[data-child-id="${nodeId}"][data-parent-id="${parentId}"]`).forEach(p => p.style.opacity = '1');
                // Highlight the shared trunk and branch from the parent
                container.querySelectorAll(`[data-parent-id="${parentId}"][data-path-type="trunk"]`).forEach(p => p.style.opacity = '1');
                container.querySelectorAll(`[data-parent-id="${parentId}"][data-path-type="branch"]`).forEach(p => p.style.opacity = '1');
            });
        });

        nodeEl.addEventListener('mouseleave', () => {
            // Reset all nodes and paths to full opacity
            allNodes.forEach(n => n.style.opacity = '1');
            allPaths.forEach(p => p.style.opacity = '1');
        });
    });
}


/**
 * Shows a detailed modal for a specific technology.
 * @param {object} tech - The technology data object.
 */
function showTechDetailModal(tech) {
    const existingModal = document.getElementById('tech-detail-modal');
    if (existingModal) existingModal.remove();

    const detailModal = document.createElement('div');
    detailModal.id = 'tech-detail-modal';
    Object.assign(detailModal.style, {
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', backgroundColor: 'white',
        padding: '25px', borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: '10000', // Highest z-index
        width: '90%', maxWidth: '500px',
        borderTop: '5px solid #3498db'
    });

    // Determine current status
    const devProject = gameData.developments.find(d => d.researchName === tech.name);
    let statusText = '';
    let researchLevel = '';
    
    if (devProject) {
        if (devProject.progress >= devProject.maxProgress) {
            statusText = '<span style="color: #27ae60;font-weight:bold;">(已完成)</span>';
        } else if (devProject.active && !devProject.paused) {
            statusText = '<span style="color:#f39c12;font-weight:bold;">(研究中)</span>';
        }
        if (devProject.level > 0) {
            researchLevel = ` <span style="color:#9b59b6; font-size: 0.9em;">LV.${devProject.level}</span>`;
        }
    }
    
    // **BUG FIX**: The button to start research should only appear if the project hasn't been started at all.
    const canStartResearch = !devProject;

    // Helper to resolve dependency IDs to names
    const allTechs = [...window.devLibraryData.techTree.layers.flatMap(l => l.technologies), window.devLibraryData.techTree.finalGoal].filter(Boolean);
    const getTechName = (id) => { const t = allTechs.find(t => t.id === id); return t ? t.name : id; };
    
    const requirementsHTML = (tech.requirements && tech.requirements.length > 0) ? tech.requirements.map(getTechName).join(', ') : '无';
    const unlocksHTML = (tech.unlocks && tech.unlocks.length > 0) ? tech.unlocks.map(getTechName).join(', ') : '无';

    // Populate modal with rich content from JSON
    detailModal.innerHTML = `
        <style>
            .detail-grid{display:grid;grid-template-columns:100px 1fr;gap:8px 15px;align-items:center;}
            .detail-grid strong{color:#555;text-align:right;}
            .detail-grid span{color:#333;}
            .create-production-label { display: flex; align-items: center; justify-content: center; margin-top: 15px; cursor: pointer; }
            .create-production-label input { margin-right: 8px; }
        </style>
        <h2 style="text-align:center;margin-top:0;color:#2c3e50;">${tech.icon || '🧪'} ${tech.name}${researchLevel} ${statusText}</h2>
        <p style="text-align:center;color:#7f8c8d;margin-top:-10px;margin-bottom:20px;">${tech.description}</p>
        <div class="detail-grid">
            <strong>优先级</strong><span>${tech.priority || 'N/A'}</span>
            <strong>需要前置</strong><span>${requirementsHTML}</span>
            <strong>解锁科技</strong><span>${unlocksHTML}</span>
            <strong>核心行动</strong><span style="font-weight:bold;color:#3498db;">${tech.action || 'N/A'}</span>
            <strong>成功标志</strong><span>${tech.success_metric || 'N/A'}</span>
            <strong>预计用时</strong><span>${tech.estimated_time || 'N/A'}</span>
            <strong>自动化奖励</strong><span>${tech.automation_reward || 'N/A'}</span>
        </div>
        
        ${canStartResearch ? `
            <label class="create-production-label">
                <input type="checkbox" id="create-production-checkbox" checked>
                创建对应的生产线
            </label>
            <div style="text-align:center; margin-top: 15px;">
                <button id="start-research-btn" class="btn btn-primary">🚀 开始研究</button>
            </div>
        ` : ''}

        <div style="text-align: center; margin-top: 10px;">
             <button id="close-detail-btn" class="btn btn-secondary">关闭</button>
        </div>
    `;

    document.body.appendChild(detailModal);

    // Add event listeners for buttons
    const startBtn = document.getElementById('start-research-btn');
    if (startBtn) {
        startBtn.onclick = () => {
            const createProduction = document.getElementById('create-production-checkbox').checked;
            startResearch(tech, createProduction); // Pass checkbox state to startResearch
            detailModal.remove(); // Close detail modal
            // Also close the main tech tree modal to give immediate feedback to the user
            const mainDevModal = document.getElementById('dev-library-modal');
            if (mainDevModal) mainDevModal.remove();
        };
    }
    document.getElementById('close-detail-btn').onclick = () => detailModal.remove();
}

/**
 * Starts a new research project. Overwrites the original function.
 * Adds the research to gameData and syncs production lines.
 * @param {object} research - The technology object to start researching.
 * @param {boolean} createProductionLine - Whether to create a corresponding production line.
 */
function startResearch(research, createProductionLine) {
    if (hasResearch(research.name)) {
        console.warn(`Attempted to research "${research.name}", but it already exists.`);
        showCustomModal({ title: "提示", content: `你已经研究过或正在研究 "${research.name}"。` });
        return;
    }

    // **BUG FIX & FEATURE UPGRADE: Create a complete object for the main app**
    const newResearch = {
        researchName: research.name,
        // **FEATURE**: Use specific production line content if available, otherwise fall back to the research name.
        prodName: research.production_line_content || research.name, 
        icon: research.icon || '🧪',
        // **BUG FIX**: Initialize level at 1, as syncResearchProductions in the main app has specific requirements.
        level: 1, 
        progress: 0,
        maxProgress: research.base_progress || 21, 
        active: true,
        paused: false,
        repeatable: research.repeatable || false, 
        checkedToday: false,
        isNew: true,
        description: research.description,
        action: research.action,
        success_metric: research.success_metric,
    };

    gameData.developments.push(newResearch);
    renderDevelopments(); 
    
    let productionMessage = ''; // To provide feedback in the final modal

    // **FINAL FIX**: Manually create the production line item instead of calling the destructive syncResearchProductions()
    if (createProductionLine) {
        console.log('--- Tech Tree Debug: Starting Production Line Creation ---');
        console.log('Checkbox "createProductionLine" is:', createProductionLine);
        
        // Ensure production array exists
        if (!gameData.productions) {
            gameData.productions = [];
        }
        console.log('Productions array (before add):', JSON.parse(JSON.stringify(gameData.productions)));

        // Check if a production line for this research already exists to avoid duplicates
        const productionExists = gameData.productions.some(p => p.linkedDev === newResearch.researchName);
        console.log('Does a linked production already exist?', productionExists);

        if (!productionExists) {
            const newProduction = {
                name: newResearch.prodName, // Use the same name logic
                type: 'habit', // Default type
                activeIncome: 0,
                activeCurrency: 'CNY',
                passiveIncome: 0,
                passiveCurrency: 'CNY',
                expense: 0,
                expenseCurrency: 'CNY',
                linkedDev: newResearch.researchName, // Link to the research project
                lastCheckIn: null,
                hasActiveIncome: false,
                hasPassiveIncome: false,
                timeCost: 0
            };
            console.log('Creating new production object:', newProduction);
            gameData.productions.push(newProduction);
            console.log('Productions array (after add):', JSON.parse(JSON.stringify(gameData.productions)));
            productionMessage = '\\n\\n✅ 关联生产线已成功添加！';
        } else {
            productionMessage = '\\n\\nℹ️ 关联生产线已存在，未重复添加。';
        }
        
        renderProductions(); 
    }
    
    // Save state and notify user
    saveToCloud();
    console.log(`Research started: ${research.name}`);
    showCustomModal({ title: "研究已开始", content: `新的研究项目 "${research.name}" 已添加到你的研发列表中。${productionMessage}` });
} 