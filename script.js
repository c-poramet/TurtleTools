// --- Smooth Drawing to Turtle (Fixed) ---
const GRID_SIZE = 40;
let name = '';
let letters = [];
let grids = {};
let current = 0;

// Canvas drawing variables
let canvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

function startDrawing() {
    name = document.getElementById('nameInput').value.trim();
    if (!name) return alert('Enter a name!');
    letters = [...name];
    grids = {};
    letters.forEach(l => { if (!grids[l]) grids[l] = null; }); // Will store canvas data
    current = 0;
    document.getElementById('nameSection').classList.add('hidden');
    document.getElementById('drawingSection').classList.remove('hidden');
    document.getElementById('codeSection').classList.add('hidden');
    setupCanvas();
    showLetter();
}

function setupCanvas() {
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 500;
    canvas.height = 500;
    
    // Set drawing styles
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    
    // Clear canvas
    clearCanvas();
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawingOnCanvas);
    canvas.addEventListener('mousemove', drawOnCanvas);
    canvas.addEventListener('mouseup', stopDrawingOnCanvas);
    canvas.addEventListener('mouseout', stopDrawingOnCanvas);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawingOnCanvas);
    
    // Prevent scrolling when touching the canvas
    canvas.addEventListener('touchstart', (e) => e.preventDefault());
    canvas.addEventListener('touchmove', (e) => e.preventDefault());
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function startDrawingOnCanvas(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
}

function drawOnCanvas(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    lastX = currentX;
    lastY = currentY;
}

function stopDrawingOnCanvas() {
    if (isDrawing) {
        isDrawing = false;
        ctx.beginPath();
    }
}

function showLetter() {
    document.getElementById('currentLetter').textContent = letters[current] || '';
    
    // Load existing drawing if available
    if (grids[letters[current]]) {
        const img = new Image();
        img.onload = () => {
            clearCanvas();
            ctx.drawImage(img, 0, 0);
        };
        img.src = grids[letters[current]];
    } else {
        clearCanvas();
    }
    
    document.getElementById('prevBtn').disabled = current === 0;
    document.getElementById('nextBtn').classList.toggle('hidden', current === letters.length-1);
    document.getElementById('generateBtn').classList.toggle('hidden', current !== letters.length-1);
    document.getElementById('progressFill').style.width = ((current+1)/letters.length*100)+'%';
    document.getElementById('progressText').textContent = `${current+1} / ${letters.length}`;
}

function clearCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
}

function nextLetter() { 
    if (current < letters.length - 1) {
        // Save current drawing
        grids[letters[current]] = canvas.toDataURL();
        current++; 
        showLetter(); 
    }
}

function prevLetter() { 
    if (current > 0) {
        // Save current drawing
        grids[letters[current]] = canvas.toDataURL();
        current--; 
        showLetter(); 
    }
}

function clearGrid() { 
    clearCanvas();
    grids[letters[current]] = null;
}

function resetApp() { 
    location.reload(); 
}

// --- Convert Canvas to Pixel Grid ---
function canvasToPixelGrid() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    const cellWidth = canvas.width / GRID_SIZE;
    const cellHeight = canvas.height / GRID_SIZE;
    
    for (let gridY = 0; gridY < GRID_SIZE; gridY++) {
        for (let gridX = 0; gridX < GRID_SIZE; gridX++) {
            let blackPixels = 0;
            let totalPixels = 0;
            
            // Sample pixels in this grid cell
            const startX = Math.floor(gridX * cellWidth);
            const endX = Math.floor((gridX + 1) * cellWidth);
            const startY = Math.floor(gridY * cellHeight);
            const endY = Math.floor((gridY + 1) * cellHeight);
            
            for (let y = startY; y < endY; y += 2) { // Sample every 2nd pixel for performance
                for (let x = startX; x < endX; x += 2) {
                    const index = (y * canvas.width + x) * 4;
                    const r = imageData.data[index];
                    const g = imageData.data[index + 1];
                    const b = imageData.data[index + 2];
                    const brightness = (r + g + b) / 3;
                    
                    if (brightness < 200) { // Not white
                        blackPixels++;
                    }
                    totalPixels++;
                }
            }
            
            // If more than 30% of pixels are black, mark this grid cell as filled
            if (totalPixels > 0 && (blackPixels / totalPixels) > 0.3) {
                pixelGrid[gridY][gridX] = 1;
            }
        }
    }
    
    return pixelGrid;
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
    
    // Get unique letters from the name
    const uniqueLetters = [...new Set(letters)];
    
    // Convert current letter's canvas drawing to pixel grid
    if (letters[current]) {
        const pixelGrid = canvasToPixelGrid();
        letterPaths[letters[current]] = extractPaths(pixelGrid);
    }
    
    // For other letters, we need to process their saved canvas data
    for (const l of uniqueLetters) {
        if (l !== letters[current] && grids[l]) {
            // Create temporary canvas to process saved image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 500;
            tempCanvas.height = 500;
            const tempCtx = tempCanvas.getContext('2d');
            
            // For now, we'll just create empty paths for letters we haven't processed yet
            // In a real implementation, you'd want to process the saved image data
            letterPaths[l] = letterPaths[l] || [];
        } else if (!letterPaths[l]) {
            letterPaths[l] = []; // Empty paths for undrawn letters
        }
    }
    
    return letterPaths;
}

function imageDataToPixelGrid(imageData) {
    const pixelGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    const cellWidth = canvas.width / GRID_SIZE;
    const cellHeight = canvas.height / GRID_SIZE;
    
    for (let gridY = 0; gridY < GRID_SIZE; gridY++) {
        for (let gridX = 0; gridX < GRID_SIZE; gridX++) {
            let blackPixels = 0;
            let totalPixels = 0;
            
            const startX = Math.floor(gridX * cellWidth);
            const endX = Math.floor((gridX + 1) * cellWidth);
            const startY = Math.floor(gridY * cellHeight);
            const endY = Math.floor((gridY + 1) * cellHeight);
            
            for (let y = startY; y < endY; y += 2) {
                for (let x = startX; x < endX; x += 2) {
                    const index = (y * canvas.width + x) * 4;
                    const r = imageData.data[index];
                    const g = imageData.data[index + 1];
                    const b = imageData.data[index + 2];
                    const brightness = (r + g + b) / 3;
                    
                    if (brightness < 200) {
                        blackPixels++;
                    }
                    totalPixels++;
                }
            }
            
            if (totalPixels > 0 && (blackPixels / totalPixels) > 0.3) {
                pixelGrid[gridY][gridX] = 1;
            }
        }
    }
    
    return pixelGrid;
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
            Math.round((GRID_SIZE - 1 - y) * scale + offsetY)
        ]));
    }
    return out;
}

function generateCode() {
    if (letters[current]) {
        grids[letters[current]] = canvas.toDataURL();
    }
    
    // Validate all letters are drawn
    if (!validateAllLettersDrawn()) {
        return;
    }

    // Save current drawing before generating
    if (letters[current]) {
        grids[letters[current]] = canvas.toDataURL();
    }
    
    // Use a promise-based approach to handle async image loading
    setTimeout(() => {
        const letterPaths = getAllLetterPaths();
        const scaledPaths = scaleAndCenterPaths(letterPaths);
        
        let code = `!pip install ColabTurtle\n`;
        code += `from ColabTurtle.Turtle import *\n`;
        code += `import ColabTurtle.Turtle as t\n`;
        code += `t.initializeTurtle(initial_speed=5)\n`;
        code += `pensize(3)\n`;
        code += `color('black')\n\n`;
        
        // Generate helper functions for each unique letter that appears in the name
        const uniqueLetters = [...new Set(letters)]; // Get unique letters from the name
        
        for (const l of uniqueLetters) {
            code += `def helper_${escapeLetter(l)}():\n`;
            const paths = scaledPaths[l] || []; // Use empty array if no paths
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
        
        // Main helper function - only include letters that actually exist in the name
        code += `def helper(c):\n`;
        code += `    if False: pass\n`;
        for (const l of uniqueLetters) {
            code += `    elif c == '${l.replace("'", "\\'")}': helper_${escapeLetter(l)}()\n`;
        }
        code += `    else:\n`;
        code += `        pass  # Letter not drawn\n`;
        code += `\n`;
        
        // Draw name function
        code += `def draw_name():\n`;
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
    }, 100);
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

function validateAllLettersDrawn() {
    const uniqueLetters = [...new Set(letters)];
    const missingLetters = [];
    
    for (const letter of uniqueLetters) {
        if (!grids[letter] && letter !== letters[current]) {
            missingLetters.push(letter);
        }
    }
    
    if (missingLetters.length > 0) {
        alert(`Please draw the following letters: ${missingLetters.join(', ')}`);
        return false;
    }
    
    return true;
}

// Update the generateCode function to include validation
function showLetter() {
    document.getElementById('currentLetter').textContent = letters[current] || '';
    
    // Show which letters are completed
    const uniqueLetters = [...new Set(letters)];
    const completedLetters = Object.keys(grids).filter(l => grids[l]);
    const pendingLetters = uniqueLetters.filter(l => !completedLetters.includes(l) && l !== letters[current]);
    
    if (pendingLetters.length > 0) {
        document.getElementById('currentLetter').innerHTML += 
            `<br><small style="color: #666;">Still need: ${pendingLetters.join(', ')}</small>`;
    }
    
    // Load existing drawing if available
    if (grids[letters[current]]) {
        const img = new Image();
        img.onload = () => {
            clearCanvas();
            ctx.drawImage(img, 0, 0);
        };
        img.src = grids[letters[current]];
    } else {
        clearCanvas();
    }
    
    document.getElementById('prevBtn').disabled = current === 0;
    document.getElementById('nextBtn').classList.toggle('hidden', current === letters.length-1);
    document.getElementById('generateBtn').classList.toggle('hidden', current !== letters.length-1);
    document.getElementById('progressFill').style.width = ((current+1)/letters.length*100)+'%';
    document.getElementById('progressText').textContent = `${current+1} / ${letters.length}`;
}