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
        code += `t.initializeTurtle(initial_speed=13)\n`;
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
let loadedThinFont = null;

// Load both Kanit-Regular.ttf and Kanit-Thin.ttf automatically on page load
window.addEventListener('load', function() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const nameInput = document.getElementById('nameInput');
    const generateBtn = document.querySelector('button[onclick="generateCode()"]');
    
    // Disable input while loading
    nameInput.disabled = true;
    generateBtn.disabled = true;
    
    let fontsLoaded = 0;
    const totalFonts = 2;
    
    function checkAllFontsLoaded() {
        fontsLoaded++;
        if (fontsLoaded === totalFonts) {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            
            if (loadedFont && loadedThinFont) {
                console.log('Both Kanit fonts loaded successfully');
                
                // Enable input after successful loading
                nameInput.disabled = false;
                generateBtn.disabled = false;
                nameInput.focus();
            } else {
                alert('Could not load all required fonts. Please make sure both Kanit-Regular.ttf and Kanit-Thin.ttf are in the same directory.');
            }
        }
    }
    
    // Load Kanit-Regular.ttf
    opentype.load('./Kanit-Regular.ttf', function(err, font) {
        if (err) {
            console.error('Kanit-Regular font could not be loaded:', err);
            loadedFont = null;
        } else {
            loadedFont = font;
            console.log('Kanit-Regular font loaded successfully');
        }
        checkAllFontsLoaded();
    });
    
    // Load Kanit-Thin.ttf
    opentype.load('./Kanit-Thin.ttf', function(err, font) {
        if (err) {
            console.error('Kanit-Thin font could not be loaded:', err);
            loadedThinFont = null;
        } else {
            loadedThinFont = font;
            console.log('Kanit-Thin font loaded successfully');
        }
        checkAllFontsLoaded();
    });
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


function fontPathsToTurtleCommands(paths, scale = 1, offsetX = 0, offsetY = 0, useThickStrokes = false) {
    const commands = [];
    
    if (useThickStrokes) {
        // Use thick pen width with thin font paths for filled effect
        commands.push(`    width(15)  # Thick stroke with thin font for filled effect`);
    }
    
    // Draw the paths normally (whether from regular or thin font)
    for (const path of paths) {
        if (path.length > 0) {
            const start = path[0];
            const startX = Math.max(0, Math.round(start.x * scale + offsetX));
            const startY = Math.max(0, Math.round(start.y * scale + offsetY));
            
            commands.push(`    penup()`);
            commands.push(`    goto(${startX}, ${startY})`);
            commands.push(`    pendown()`);
            
            for (let i = 1; i < path.length; i++) {
                const pt = path[i];
                const x = Math.max(0, Math.round(pt.x * scale + offsetX));
                const y = Math.max(0, Math.round(pt.y * scale + offsetY));
                commands.push(`    goto(${x}, ${y})`);
            }
            commands.push(`    penup()`);
        }
    }
    
    return commands;
}

function generateCode() {
    const name = document.getElementById('nameInput').value.trim();
    const useCustomSize = document.getElementById('customSizeCheckbox').checked;
    const useThickStrokes = document.getElementById('fillLettersCheckbox').checked;
    
    if (!loadedFont || (useThickStrokes && !loadedThinFont)) {
        alert('Fonts are still loading. Please wait a moment and try again.');
        return;
    }
    if (!name) {
        alert('Please enter a name!');
        return;
    }
    
    // Choose the appropriate font based on the thick strokes option
    const selectedFont = useThickStrokes ? loadedThinFont : loadedFont;
    
    // Get paths and bounding box for the whole name (for scaling/canvas)
    const { minX, minY, maxX, maxY } = getFontGlyphPaths(name, selectedFont, 200);
    
    let code = `!pip install ColabTurtle\n`;
    code += `from ColabTurtle.Turtle import *\n`;
    code += `import ColabTurtle.Turtle as t\n`;
    
    let canvasWidth, canvasHeight, scale, offsetX, offsetY;
    
    if (useCustomSize) {
        // Calculate text dimensions
        const textWidth = maxX - minX;
        const textHeight = maxY - minY;
        const margin = 50;
        canvasWidth = Math.max(400, Math.ceil(textWidth + (2 * margin)));
        canvasHeight = Math.max(300, Math.ceil(textHeight * 0.6 + (2 * margin)));
        code += `# Set up custom canvas size to fit the name perfectly\n`;
        code += `t.initializeTurtle(initial_window_size=(${canvasWidth}, ${canvasHeight}), initial_speed=13)\n`;
        scale = 1;
        offsetX = margin - minX;
        offsetY = margin - minY;
    } else {
        canvasWidth = 400;
        canvasHeight = 400;
        const margin = 50;
        const availableWidth = canvasWidth - (2 * margin);
        const availableHeight = canvasHeight - (2 * margin);
        code += `# Using default ColabTurtle canvas size\n`;
        code += `t.initializeTurtle(initial_speed=13)\n`;
        const textWidth = maxX - minX;
        const textHeight = maxY - minY;
        scale = Math.min(availableWidth / textWidth, availableHeight / textHeight, 1);
        const scaledWidth = textWidth * scale;
        const scaledHeight = textHeight * scale;
        offsetX = (canvasWidth - scaledWidth) / 2 - minX * scale;
        offsetY = (canvasHeight - scaledHeight) / 2 - minY * scale;
    }
    code += `t.hideturtle()\n`;
    if (!useThickStrokes) {
        code += `pensize(2)\n`;
    }
    code += `\n`;

    // Generate a function for each letter
    let letterFns = [];
    let letterCalls = [];
    let xCursor = 0;
    for (let i = 0; i < name.length; i++) {
        const letter = name[i];
        const glyph = selectedFont.charToGlyph(letter);
        const glyphPath = glyph.getPath(xCursor, 200, 200);
        // Get only this letter's paths
        let currentPath = [];
        let paths = [];
        for (const cmd of glyphPath.commands) {
            if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C') {
                currentPath.push({x: cmd.x, y: cmd.y});
            } else if (cmd.type === 'Z') {
                if (currentPath.length > 0) {
                    paths.push(currentPath);
                    currentPath = [];
                }
            }
        }
        if (currentPath.length > 0) paths.push(currentPath);
        // Calculate offset for this letter
        let letterOffsetX = offsetX;
        let letterOffsetY = offsetY;
        // Generate function name
        let fnName = /^[a-zA-Z]$/.test(letter) ? `draw_${letter.toLowerCase()}` : `draw_char_${letter.charCodeAt(0)}`;
        letterCalls.push(`    ${fnName}()`);
        // Generate commands for this letter
        let commands = fontPathsToTurtleCommands(paths, scale, letterOffsetX, letterOffsetY, useThickStrokes);
        let fnCode = `def ${fnName}():\n`;
        fnCode += `    """Draw letter '${letter}'"""\n`;
        if (commands.length === 0) {
            fnCode += `    pass  # No drawing data for this letter\n`;
        } else {
            for (const command of commands) {
                fnCode += `${command}\n`;
            }
        }
        letterFns.push(fnCode);
        // Advance xCursor for next letter
        xCursor += glyph.advanceWidth * (200 / selectedFont.unitsPerEm);
    }
    // Output all letter functions
    code += letterFns.join('\n') + '\n';
    // Main function to call all letter functions in order
    code += `def draw_name():\n`;
    if (useCustomSize) {
        code += `    """Draw the name: ${name} (custom canvas: ${canvasWidth}x${canvasHeight}${useThickStrokes ? ', Kanit-Thin + thick pen' : ', Kanit-Regular outline'})"""\n`;
    } else {
        code += `    """Draw the name: ${name} (default canvas: 400x400, scaled: ${scale.toFixed(2)}${useThickStrokes ? ', Kanit-Thin + thick pen' : ', Kanit-Regular outline'})"""\n`;
    }
    for (const call of letterCalls) {
        code += call + '\n';
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