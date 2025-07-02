class HandwritingToTurtle {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentLetterIndex = 0;
        this.letters = [];
        this.letterData = {};
        this.gridSize = 50;
        this.cellSize = 10;
        this.name = '';
        this.brushSize = 8;
        this.currentPath = [];
    }

    init() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
    }

    setupCanvas() {
        // Mouse events
        this.canvas.onmousedown = (e) => this.startDrawing(e);
        this.canvas.onmousemove = (e) => this.draw(e);
        this.canvas.onmouseup = () => this.stopDrawing();
        this.canvas.onmouseout = () => this.stopDrawing();

        // Touch events for mobile
        this.canvas.ontouchstart = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        };

        this.canvas.ontouchmove = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        };

        this.canvas.ontouchend = (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.currentPath = [];
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.currentPath.push({x, y});
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.currentPath.push({x, y});
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#000';

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.beginPath();
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getDrawingPaths() {
        // Convert canvas drawing to paths
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const paths = [];
        
        // Find all drawn pixels
        const drawnPixels = [];
        for (let y = 0; y < this.canvas.height; y += 2) {
            for (let x = 0; x < this.canvas.width; x += 2) {
                const index = (y * this.canvas.width + x) * 4;
                const alpha = imageData.data[index + 3];
                
                if (alpha > 0) {
                    drawnPixels.push({x, y});
                }
            }
        }
        
        // Group nearby pixels into paths
        while (drawnPixels.length > 0) {
            const path = [];
            const startPixel = drawnPixels.shift();
            const queue = [startPixel];
            
            while (queue.length > 0) {
                const current = queue.shift();
                path.push(current);
                
                for (let i = drawnPixels.length - 1; i >= 0; i--) {
                    const pixel = drawnPixels[i];
                    const distance = Math.sqrt(
                        Math.pow(current.x - pixel.x, 2) + 
                        Math.pow(current.y - pixel.y, 2)
                    );
                    
                    if (distance < 15) {
                        queue.push(pixel);
                        drawnPixels.splice(i, 1);
                    }
                }
            }
            
            if (path.length > 1) {
                const sortedPath = this.sortPathPoints(path);
                paths.push(sortedPath);
            }
        }
        return paths;
    }

    sortPathPoints(points) {
        if (points.length <= 2) return points;
        
        const sorted = [points[0]];
        const remaining = points.slice(1);
        
        while (remaining.length > 0) {
            const current = sorted[sorted.length - 1];
            let nearest = remaining[0];
            let nearestIndex = 0;
            let nearestDistance = this.distance(current, nearest);
            
            for (let i = 1; i < remaining.length; i++) {
                const distance = this.distance(current, remaining[i]);
                if (distance < nearestDistance) {
                    nearest = remaining[i];
                    nearestIndex = i;
                    nearestDistance = distance;
                }
            }
            
            sorted.push(nearest);
            remaining.splice(nearestIndex, 1);
        }
        return sorted;
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    updateProgress() {
        const progress = ((this.currentLetterIndex) / this.letters.length) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressText').textContent = 
            `${this.currentLetterIndex} / ${this.letters.length}`;
    }

    generateTurtleCommands(paths) {
        const commands = [];
        for (const path of paths) {
            if (path.length > 0) {
                // Convert canvas coordinates to ColabTurtle coordinates (non-negative, y-down)
                const startPoint = this.canvasToColabTurtle(path[0]);
                commands.push(`    penup()`);
                commands.push(`    goto(${startPoint.x}, ${startPoint.y})`);
                commands.push(`    pendown()`);
                for (let i = 1; i < path.length; i++) {
                    const point = this.canvasToColabTurtle(path[i]);
                    commands.push(`    goto(${point.x}, ${point.y})`);
                }
            }
        }
        if (commands.length > 0) {
            commands.push(`    penup()`);
        }
        return commands;
    }

    canvasToColabTurtle(canvasPoint) {
        // Map canvas (0-500) to ColabTurtle (0-400), y-down
        const x = Math.round((canvasPoint.x / this.canvas.width) * 400);
        const y = Math.round((canvasPoint.y / this.canvas.height) * 400);
        return {x, y};
    }

    generatePythonCode() {
        let code = `!pip install ColabTurtle\n`;
        code += `from ColabTurtle.Turtle import *\n`;
        code += `import ColabTurtle.Turtle as t\n`;
        code += `t.initializeTurtle(initial_speed=5)\n`;
        code += `t.hideturtle()\n`;
        code += `pensize(2)\n\n`;
        for (const letter of this.letters) {
            const paths = this.letterData[letter];
            const commands = this.generateTurtleCommands(paths);
            code += `def helper_${this.escapeLetterName(letter)}():\n`;
            code += `    """Draw letter '${letter}'"""\n`;
            if (commands.length === 0) {
                code += `    pass  # No drawing data for this letter\n`;
            } else {
                for (const command of commands) {
                    code += `${command}\n`;
                }
            }
            code += `\n`;
        }
        code += `def draw_name():\n`;
        code += `    """Draw the complete name: ${this.name}"""\n`;
        code += `    penup()\n`;
        code += `    # Calculate starting position\n`;
        code += `    letter_width = 250\n`;
        code += `    start_x = 50\n`;
        code += `    start_y = 200\n`;
        code += `    \n`;
        for (let i = 0; i < this.letters.length; i++) {
            const letter = this.letters[i];
            code += `    # Position for letter '${letter}'\n`;
            code += `    base_x = start_x + ${i} * letter_width\n`;
            code += `    base_y = start_y\n`;
            code += `    \n`;
            code += `    # Save current position\n`;
            code += `    current_pos = position()\n`;
            code += `    \n`;
            code += `    # Move to letter position and draw\n`;
            code += `    penup()\n`;
            code += `    goto(base_x, base_y)\n`;
            code += `    helper_${this.escapeLetterName(letter)}()\n`;
            code += `    \n`;
        }
        code += `\n# Execute the drawing\n`;
        code += `draw_name()\n`;
        return code;
    }

    escapeLetterName(letter) {
        const charCode = letter.charCodeAt(0);
        if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
            return letter.toLowerCase();
        } else {
            return `char_${charCode}`;
        }
    }
}

// Global instance
const app = new HandwritingToTurtle();

// --- Font to Turtle Graphics Only ---
let loadedFont = null;
let defaultKanitFont = null;

// Load Kanit Regular as default font
async function loadDefaultFont() {
    try {
        // Try to load Kanit Regular from Google Fonts
        // Using a more reliable direct URL for Kanit Regular
        const response = await fetch('https://fonts.gstatic.com/s/kanit/v15/nKKZ-Go6G5tXcoaSEQGodLxA.woff2');
        
        if (!response.ok) {
            throw new Error('Failed to fetch font');
        }
        
        const fontBuffer = await response.arrayBuffer();
        
        opentype.load(fontBuffer, function(err, font) {
            if (!err && font) {
                defaultKanitFont = font;
                loadedFont = font;
                document.getElementById('fontName').textContent = 'Kanit Regular (Default)';
                console.log('Kanit Regular loaded successfully');
            } else {
                console.error('Failed to load Kanit font:', err);
                loadFallbackFont();
            }
        });
    } catch (error) {
        console.error('Failed to fetch Kanit font:', error);
        loadFallbackFont();
    }
}

function loadFallbackFont() {
    // Create a better fallback using system font metrics
    loadedFont = createFallbackFont();
    document.getElementById('fontName').textContent = 'System Font (Fallback)';
    console.log('Using fallback font');
}

// Create a simple fallback font simulation
function createFallbackFont() {
    return {
        charToGlyph: function(char) {
            return {
                getPath: function(x, y, fontSize) {
                    return getSimpleCharPath(char, x, y, fontSize);
                },
                advanceWidth: 600 // Standard width
            };
        },
        unitsPerEm: 1000,
        names: { fullName: { en: 'Fallback Font' } }
    };
}

// Simple character path generation for fallback
function getSimpleCharPath(char, x, y, fontSize) {
    const scale = fontSize / 1000;
    const width = 400 * scale;
    const height = 600 * scale;
    
    const commands = [];
    
    // Create simple letter shapes based on character
    switch (char.toLowerCase()) {
        case 'a':
            // Triangle with crossbar
            commands.push({type: 'M', x: x + 200*scale, y: y - 600*scale}); // Top
            commands.push({type: 'L', x: x + 50*scale, y: y}); // Bottom left
            commands.push({type: 'L', x: x + 350*scale, y: y}); // Bottom right
            commands.push({type: 'Z'});
            // Crossbar
            commands.push({type: 'M', x: x + 125*scale, y: y - 200*scale});
            commands.push({type: 'L', x: x + 275*scale, y: y - 200*scale});
            break;
        case 'b':
            // Vertical line with two bumps
            commands.push({type: 'M', x: x + 50*scale, y: y});
            commands.push({type: 'L', x: x + 50*scale, y: y - 600*scale});
            commands.push({type: 'L', x: x + 250*scale, y: y - 600*scale});
            commands.push({type: 'L', x: x + 300*scale, y: y - 450*scale});
            commands.push({type: 'L', x: x + 250*scale, y: y - 300*scale});
            commands.push({type: 'L', x: x + 300*scale, y: y - 150*scale});
            commands.push({type: 'L', x: x + 250*scale, y: y});
            commands.push({type: 'L', x: x + 50*scale, y: y});
            commands.push({type: 'Z'});
            break;
        case 'c':
            // Open circle
            commands.push({type: 'M', x: x + 350*scale, y: y - 150*scale});
            commands.push({type: 'L', x: x + 200*scale, y: y});
            commands.push({type: 'L', x: x + 100*scale, y: y - 150*scale});
            commands.push({type: 'L', x: x + 100*scale, y: y - 450*scale});
            commands.push({type: 'L', x: x + 200*scale, y: y - 600*scale});
            commands.push({type: 'L', x: x + 350*scale, y: y - 450*scale});
            break;
        case 'd':
            // Vertical line with curve
            commands.push({type: 'M', x: x + 50*scale, y: y});
            commands.push({type: 'L', x: x + 200*scale, y: y});
            commands.push({type: 'L', x: x + 300*scale, y: y - 150*scale});
            commands.push({type: 'L', x: x + 300*scale, y: y - 450*scale});
            commands.push({type: 'L', x: x + 200*scale, y: y - 600*scale});
            commands.push({type: 'L', x: x + 50*scale, y: y - 600*scale});
            commands.push({type: 'Z'});
            break;
        case 'e':
            // E shape
            commands.push({type: 'M', x: x + 50*scale, y: y});
            commands.push({type: 'L', x: x + 300*scale, y: y});
            commands.push({type: 'L', x: x + 300*scale, y: y - 100*scale});
            commands.push({type: 'L', x: x + 150*scale, y: y - 100*scale});
            commands.push({type: 'L', x: x + 150*scale, y: y - 250*scale});
            commands.push({type: 'L', x: x + 250*scale, y: y - 250*scale});
            commands.push({type: 'L', x: x + 250*scale, y: y - 350*scale});
            commands.push({type: 'L', x: x + 150*scale, y: y - 350*scale});
            commands.push({type: 'L', x: x + 150*scale, y: y - 500*scale});
            commands.push({type: 'L', x: x + 300*scale, y: y - 500*scale});
            commands.push({type: 'L', x: x + 300*scale, y: y - 600*scale});
            commands.push({type: 'L', x: x + 50*scale, y: y - 600*scale});
            commands.push({type: 'Z'});
            break;
        case ' ':
            // Space - no drawing
            break;
        default:
            // Simple rectangle for unknown characters
            commands.push({type: 'M', x: x + 50*scale, y: y});
            commands.push({type: 'L', x: x + 350*scale, y: y});
            commands.push({type: 'L', x: x + 350*scale, y: y - 500*scale});
            commands.push({type: 'L', x: x + 50*scale, y: y - 500*scale});
            commands.push({type: 'Z'});
    }
    
    return { commands };
}

// Load default font on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDefaultFont();
});

document.getElementById('fontUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) {
        // Reset to default font if no file selected
        loadedFont = defaultKanitFont || loadedFont;
        document.getElementById('fontName').textContent = defaultKanitFont ? 'Kanit Regular (Default)' : 'System Font (Fallback)';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(event) {
        opentype.load(event.target.result, function(err, font) {
            if (err) {
                alert('Font could not be loaded: ' + err);
                // Revert to default font
                loadedFont = defaultKanitFont || loadedFont;
                document.getElementById('fontName').textContent = defaultKanitFont ? 'Kanit Regular (Default)' : 'System Font (Fallback)';
            } else {
                loadedFont = font;
                document.getElementById('fontName').textContent = font.names.fullName.en || file.name;
            }
        });
    };
    reader.readAsDataURL(file);
});

function getFontGlyphPaths(text, font, fontSize = 200) {
    const paths = [];
    let x = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const char of text) {
        const glyph = font.charToGlyph(char);
        const glyphPath = glyph.getPath(x, fontSize, fontSize);
        let currentPath = [];
        for (const cmd of glyphPath.commands) {
            if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C') {
                currentPath.push({x: cmd.x, y: cmd.y});
                if (cmd.x < minX) minX = cmd.x;
                if (cmd.y < minY) minY = cmd.y;
                if (cmd.x > maxX) maxX = cmd.x;
                if (cmd.y > maxY) maxY = cmd.y;
            } else if (cmd.type === 'Z') {
                if (currentPath.length > 0) {
                    paths.push(currentPath);
                    currentPath = [];
                }
            }
        }
        if (currentPath.length > 0) paths.push(currentPath);
        x += glyph.advanceWidth * (fontSize / font.unitsPerEm);
    }
    return { paths, minX, minY, maxX, maxY };
}

function fontPathsToTurtleCommands(paths, scale = 1, offsetX = 0, offsetY = 0, minXShift = 0, minYShift = 0) {
    const commands = [];
    for (const path of paths) {
        if (path.length > 0) {
            const start = path[0];
            commands.push(`    penup()`);
            commands.push(`    goto(${Math.round(start.x * scale + offsetX + minXShift)}, ${Math.round(start.y * scale + offsetY + minYShift)})`);
            commands.push(`    pendown()`);
            for (let i = 1; i < path.length; i++) {
                const pt = path[i];
                commands.push(`    goto(${Math.round(pt.x * scale + offsetX + minXShift)}, ${Math.round(pt.y * scale + offsetY + minYShift)})`);
            }
            commands.push(`    penup()`);
        }
    }
    return commands;
}

function generateCode() {
    const name = document.getElementById('nameInput').value.trim();
    if (!loadedFont) {
        alert('Font is still loading, please wait a moment and try again!');
        return;
    }
    if (!name) {
        alert('Please enter a name!');
        return;
    }
    let code = `!pip install ColabTurtle\n`;
    code += `from ColabTurtle.Turtle import *\n`;
    code += `import ColabTurtle.Turtle as t\n`;
    code += `t.initializeTurtle(initial_speed=5)\n`;
    code += `t.hideturtle()\n`;
    code += `pensize(2)\n\n`;
    // Get paths and bounding box
    const { paths, minX, minY, maxX, maxY } = getFontGlyphPaths(name, loadedFont, 200);
    // Centering offset
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    // Optionally scale to fit a 400x400 box (ColabTurtle default)
    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min(350 / width, 350 / height, 1); // leave margin
    // After centering, shift so minX/minY are 0 (or margin)
    let shiftedMinX = Infinity, shiftedMinY = Infinity;
    for (const path of paths) {
        for (const pt of path) {
            const sx = (pt.x - centerX) * scale;
            const sy = (pt.y - centerY) * scale;
            if (sx < shiftedMinX) shiftedMinX = sx;
            if (sy < shiftedMinY) shiftedMinY = sy;
        }
    }
    const margin = 25;
    const minXShift = -shiftedMinX + margin;
    const minYShift = -shiftedMinY + margin;
    const commands = fontPathsToTurtleCommands(paths, scale, -centerX * scale, -centerY * scale, minXShift, minYShift);
    code += `def draw_name():\n`;
    code += `    """Draw the name: ${name} centered in the window"""\n`;
    if (commands.length === 0) {
        code += `    pass  # No drawing data\n`;
    } else {
        for (const command of commands) {
            code += `${command}\n`;
        }
    }
    code += `\ndraw_name()\n`;
    document.getElementById('generatedCode').textContent = code;
    document.getElementById('codeSection').classList.remove('hidden');
}

function copyCode() {
    const code = document.getElementById('generatedCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('Code copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy code. Please select and copy manually.');
    });
}

function downloadCode() {
    const code = document.getElementById('generatedCode').textContent;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turtle_drawing.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function resetApp() {
    document.getElementById('nameInput').value = '';
    document.getElementById('generatedCode').textContent = '';
    document.getElementById('codeSection').classList.add('hidden');
}
// --- End ---