// --- Hand-Drawn Pixel Grid to Turtle (Fixed) ---
const GRID_SIZE = 40;
let name = '';
let letters = [];
let grids = {};
let current = 0;

function startDrawing() {
    name = document.getElementById('nameInput').value.trim();
    if (!name) return alert('Enter a name!');
    letters = [...name];
    grids = {};
    letters.forEach(l => { if (!grids[l]) grids[l] = Array(GRID_SIZE).fill().map(()=>Array(GRID_SIZE).fill(0)); });
    current = 0;
    document.getElementById('nameSection').classList.add('hidden');
    document.getElementById('drawingSection').classList.remove('hidden');
    document.getElementById('codeSection').classList.add('hidden');
    showLetter();
}

function showLetter() {
    document.getElementById('currentLetter').textContent = letters[current] || '';
    drawGrid(grids[letters[current]]);
    document.getElementById('prevBtn').disabled = current === 0;
    document.getElementById('nextBtn').classList.toggle('hidden', current === letters.length-1);
    document.getElementById('generateBtn').classList.toggle('hidden', current !== letters.length-1);
    document.getElementById('progressFill').style.width = ((current+1)/letters.length*100)+'%';
    document.getElementById('progressText').textContent = `${current+1} / ${letters.length}`;
}

function drawGrid(grid) {
    const gridDiv = document.getElementById('pixelGrid');
    if (!grid) {
        gridDiv.innerHTML = '';
        gridDiv.style.display = 'none';
        return;
    }
    gridDiv.style.display = 'grid';
    gridDiv.innerHTML = '';
    gridDiv.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 14px)`;
    gridDiv.style.gridTemplateRows = `repeat(${GRID_SIZE}, 14px)`;
    gridDiv.style.gap = '1px';
    gridDiv.style.padding = '10px';
    gridDiv.style.backgroundColor = '#f0f0f0';
    gridDiv.style.border = '2px solid #333';
    gridDiv.style.borderRadius = '5px';
    gridDiv.style.userSelect = 'none';
    
    let isMouseDown = false;
    let isDragging = false;
    
    // Global mouse events
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        isDragging = false;
    });
    
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = document.createElement('div');
            cell.style.width = '14px';
            cell.style.height = '14px';
            cell.style.backgroundColor = grid[y][x] ? '#333' : '#fff';
            cell.style.border = '1px solid #ddd';
            cell.style.cursor = 'pointer';
            cell.style.boxSizing = 'border-box';
            
            // Mouse down - start drawing
            cell.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isMouseDown = true;
                isDragging = true;
                grid[y][x] = 1 - grid[y][x]; // Toggle
                cell.style.backgroundColor = grid[y][x] ? '#333' : '#fff';
            });
            
            // Mouse enter - continue drawing if mouse is down
            cell.addEventListener('mouseenter', (e) => {
                if (isMouseDown && isDragging) {
                    grid[y][x] = 1; // Always fill when dragging
                    cell.style.backgroundColor = '#333';
                }
            });
            
            // Prevent context menu on right click
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
            
            // Touch events for mobile
            cell.addEventListener('touchstart', (e) => {
                e.preventDefault();
                grid[y][x] = 1 - grid[y][x];
                cell.style.backgroundColor = grid[y][x] ? '#333' : '#fff';
            });
            
            gridDiv.appendChild(cell);
        }
    }
    
    // Prevent drag on the grid container
    gridDiv.addEventListener('dragstart', (e) => e.preventDefault());
    gridDiv.addEventListener('selectstart', (e) => e.preventDefault());
}

function nextLetter() { 
    if (current < letters.length - 1) {
        current++; 
        showLetter(); 
    }
}

function prevLetter() { 
    if (current > 0) {
        current--; 
        showLetter(); 
    }
}

function clearGrid() { 
    grids[letters[current]] = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)); 
    showLetter(); 
}

function resetApp() { 
    location.reload(); 
}

// --- Path Extraction for Turtle ---
function extractPaths(grid) {
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    const paths = [];
    const dx = [0, 1, 0, -1], dy = [-1, 0, 1, 0];
    
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] && !visited[y][x]) {
                const path = [];
                const queue = [[x, y]];
                visited[y][x] = true;
                
                while (queue.length) {
                    const [cx, cy] = queue.shift();
                    path.push([cx, cy]);
                    
                    for (let d = 0; d < 4; d++) {
                        const nx = cx + dx[d], ny = cy + dy[d];
                        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && 
                            grid[ny][nx] && !visited[ny][nx]) {
                            queue.push([nx, ny]);
                            visited[ny][nx] = true;
                        }
                    }
                }
                
                if (path.length > 0) {
                    // Sort path points for better drawing order
                    path.sort((a, b) => a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]);
                    paths.push(path);
                }
            }
        }
    }
    return paths;
}

function getAllLetterPaths() {
    const letterPaths = {};
    for (const l of Object.keys(grids)) {
        letterPaths[l] = extractPaths(grids[l]);
    }
    return letterPaths;
}

function getBoundingBox(allPaths) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasPoints = false;
    
    for (const paths of Object.values(allPaths)) {
        for (const path of paths) {
            for (const [x, y] of path) {
                hasPoints = true;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    
    if (!hasPoints) {
        return { minX: 0, minY: 0, maxX: GRID_SIZE, maxY: GRID_SIZE };
    }
    
    return { minX, minY, maxX, maxY };
}

function scaleAndCenterPaths(allPaths, boxSize = 350, margin = 25) {
    const { minX, minY, maxX, maxY } = getBoundingBox(allPaths);
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const scale = Math.min((boxSize - margin * 2) / width, (boxSize - margin * 2) / height);
    const offsetX = (boxSize - width * scale) / 2 - minX * scale + margin;
    const offsetY = (boxSize - height * scale) / 2 - minY * scale + margin;
    
    const out = {};
    for (const l in allPaths) {
        out[l] = allPaths[l].map(path => path.map(([x, y]) => [
            Math.round(x * scale + offsetX),
            Math.round((GRID_SIZE - 1 - y) * scale + offsetY) // flip y for turtle
        ]));
    }
    return out;
}

function generateCode() {
    const letterPaths = getAllLetterPaths();
    const scaledPaths = scaleAndCenterPaths(letterPaths);
    
    let code = `!pip install ColabTurtle\n`;
    code += `from ColabTurtle.Turtle import *\n`;
    code += `import ColabTurtle.Turtle as t\n`;
    code += `t.initializeTurtle(initial_speed=5)\n`;
    code += `pensize(3)\n`;
    code += `color('black')\n\n`;
    
    // Generate helper functions for each unique letter
    for (const l of Object.keys(scaledPaths)) {
        code += `def helper_${escapeLetter(l)}():\n`;
        const paths = scaledPaths[l];
        if (!paths.length) {
            code += `    pass  # No drawing for this letter\n`;
        } else {
            for (const path of paths) {
                if (path.length > 0) {
                    code += `    penup()\n`;
                    code += `    goto(${path[0][0]}, ${path[0][1]})\n`;
                    code += `    pendown()\n`;
                    for (let i = 1; i < path.length; i++) {
                        code += `    goto(${path[i][0]}, ${path[i][1]})\n`;
                    }
                }
            }
            code += `    penup()\n`;
        }
        code += `\n`;
    }
    
    // Main helper function
    code += `def helper(c):\n`;
    code += `    if False: pass\n`;
    for (const l of Object.keys(scaledPaths)) {
        code += `    elif c == '${l.replace("'", "\\'")}': helper_${escapeLetter(l)}()\n`;
    }
    code += `\n`;
    
    // Draw name function
    code += `def draw_name():\n`;
    code += `    # Starting position\n`;
    code += `    start_x = 50\n`;
    code += `    letter_spacing = ${Math.max(100, 400 / letters.length)}\n`;
    code += `    \n`;
    
    for (let i = 0; i < letters.length; i++) {
        const l = letters[i];
        code += `    # Letter '${l.replace("'", "\\'")}':\n`;
        code += `    penup()\n`;
        code += `    goto(start_x + ${i} * letter_spacing, 200)\n`;
        code += `    helper('${l.replace("'", "\\'")}')\n`;
    }
    
    code += `\n# Execute drawing\n`;
    code += `draw_name()\n`;
    
    document.getElementById('generatedCode').textContent = code;
    document.getElementById('drawingSection').classList.add('hidden');
    document.getElementById('codeSection').classList.remove('hidden');
}

function escapeLetter(l) { 
    return /^[a-zA-Z]$/.test(l) ? l : 'char' + l.charCodeAt(0); 
}

function copyCode() { 
    navigator.clipboard.writeText(document.getElementById('generatedCode').textContent)
        .then(() => alert('Code copied to clipboard!'))
        .catch(() => alert('Failed to copy code')); 
}

function downloadCode() {
    const code = document.getElementById('generatedCode').textContent;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_turtle_drawing.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}