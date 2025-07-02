// --- Hand-Drawn Pixel Grid to Turtle (Remake) ---
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
    let isMouseDown = false;
    gridDiv.onmousedown = () => { isMouseDown = true; };
    gridDiv.onmouseup = () => { isMouseDown = false; };
    gridDiv.onmouseleave = () => { isMouseDown = false; };
    for (let y=0; y<GRID_SIZE; y++) for (let x=0; x<GRID_SIZE; x++) {
        const cell = document.createElement('div');
        cell.style.width = cell.style.height = '14px';
        cell.style.border = '1px solid #eee';
        cell.style.background = grid[y][x] ? '#333' : '#fff';
        cell.style.cursor = 'pointer';
        cell.addEventListener('mousedown', e => {
            grid[y][x] = 1-grid[y][x];
            cell.style.background = grid[y][x] ? '#333' : '#fff';
        });
        cell.addEventListener('mouseenter', e => {
            if (isMouseDown) {
                grid[y][x] = 1;
                cell.style.background = '#333';
            }
        });
        gridDiv.appendChild(cell);
    }
}

function nextLetter() { current++; showLetter(); }
function prevLetter() { current--; showLetter(); }
function clearGrid() { grids[letters[current]] = Array(GRID_SIZE).fill().map(()=>Array(GRID_SIZE).fill(0)); showLetter(); }
function resetApp() { location.reload(); }

// --- Path Extraction for Turtle ---
function extractPaths(grid) {
    // Find all 1-pixels and group into continuous paths (4-connected)
    const visited = Array(GRID_SIZE).fill().map(()=>Array(GRID_SIZE).fill(false));
    const paths = [];
    const dx = [0,1,0,-1], dy = [-1,0,1,0];
    for (let y=0; y<GRID_SIZE; y++) {
        for (let x=0; x<GRID_SIZE; x++) {
            if (grid[y][x] && !visited[y][x]) {
                // Start new path
                const path = [];
                const stack = [[x,y]];
                visited[y][x] = true;
                while (stack.length) {
                    const [cx,cy] = stack.pop();
                    path.push([cx,cy]);
                    for (let d=0; d<4; d++) {
                        const nx = cx+dx[d], ny = cy+dy[d];
                        if (nx>=0 && nx<GRID_SIZE && ny>=0 && ny<GRID_SIZE && grid[ny][nx] && !visited[ny][nx]) {
                            stack.push([nx,ny]);
                            visited[ny][nx] = true;
                        }
                    }
                }
                paths.push(path);
            }
        }
    }
    return paths;
}

function getAllLetterPaths() {
    // For each unique letter, extract its paths
    const letterPaths = {};
    for (const l of Object.keys(grids)) {
        letterPaths[l] = extractPaths(grids[l]);
    }
    return letterPaths;
}

function getBoundingBox(allPaths) {
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    for (const paths of Object.values(allPaths)) {
        for (const path of paths) {
            for (const [x,y] of path) {
                if (x<minX) minX=x;
                if (y<minY) minY=y;
                if (x>maxX) maxX=x;
                if (y>maxY) maxY=y;
            }
        }
    }
    return {minX, minY, maxX, maxY};
}

function scaleAndCenterPaths(allPaths, boxSize=350, margin=25) {
    // Scale and center all paths to fit ColabTurtle window
    const {minX, minY, maxX, maxY} = getBoundingBox(allPaths);
    const width = maxX-minX+1, height = maxY-minY+1;
    const scale = Math.min((boxSize-margin*2)/width, (boxSize-margin*2)/height);
    const offsetX = (boxSize-width*scale)/2 - minX*scale + margin;
    const offsetY = (boxSize-height*scale)/2 - minY*scale + margin;
    const out = {};
    for (const l in allPaths) {
        out[l] = allPaths[l].map(path => path.map(([x,y]) => [
            Math.round(x*scale+offsetX),
            Math.round((GRID_SIZE-1-y)*scale+offsetY) // flip y for turtle
        ]));
    }
    return out;
}

function generateCode() {
    const letterPaths = getAllLetterPaths();
    const scaledPaths = scaleAndCenterPaths(letterPaths);
    let code = `!pip install ColabTurtle\nfrom ColabTurtle.Turtle import *\nimport ColabTurtle.Turtle as t\nt.initializeTurtle(initial_speed=5)\nt.hideturtle()\npensize(2)\n\n`;
    for (const l of Object.keys(scaledPaths)) {
        code += `def helper_${escapeLetter(l)}():\n`;
        const paths = scaledPaths[l];
        if (!paths.length) {
            code += `    pass  # No drawing for this letter\n`;
        } else {
            for (const path of paths) {
                if (path.length) {
                    code += `    penup()\n`;
                    code += `    goto(${path[0][0]}, ${path[0][1]})\n`;
                    code += `    pendown()\n`;
                    for (let i=1; i<path.length; i++) {
                        code += `    goto(${path[i][0]}, ${path[i][1]})\n`;
                    }
                    code += `    penup()\n`;
                }
            }
        }
        code += `\n`;
    }
    code += 'def helper(c):\n';
    code += '    if False: pass\n';
    for (const l of Object.keys(scaledPaths)) {
        code += `    elif c == '${l}': helper_${escapeLetter(l)}()\n`;
    }
    code += '\ndef draw_name():\n';
    for (const l of letters) code += `    helper('${l}')\n`;
    code += '\ndraw_name()\n';
    document.getElementById('generatedCode').textContent = code;
    document.getElementById('drawingSection').classList.add('hidden');
    document.getElementById('codeSection').classList.remove('hidden');
}
function escapeLetter(l) { return /^[a-zA-Z]$/.test(l) ? l : 'char'+l.charCodeAt(0); }
function copyCode() { navigator.clipboard.writeText(document.getElementById('generatedCode').textContent); }
// --- End ---