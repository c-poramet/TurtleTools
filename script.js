class TurtleDrawingApp {
    constructor() {
        this.currentLanguage = 'en';
        this.userName = '';
        this.letters = [];
        this.currentLetterIndex = 0;
        this.drawings = {};
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupCanvas();
    }

    initializeElements() {
        // Input section elements
        this.inputSection = document.getElementById('inputSection');
        this.nameInput = document.getElementById('nameInput');
        this.startBtn = document.getElementById('startBtn');
        this.langBtns = document.querySelectorAll('.lang-btn');

        // Drawing section elements
        this.drawingSection = document.getElementById('drawingSection');
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentLetterDisplay = document.getElementById('currentLetter');
        this.progressText = document.getElementById('progressText');
        this.progressFill = document.getElementById('progressFill');
        this.clearBtn = document.getElementById('clearBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.prevBtn = document.getElementById('prevBtn');

        // Code section elements
        this.codeSection = document.getElementById('codeSection');
        this.generatedCodeElement = document.getElementById('generatedCode');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.restartBtn = document.getElementById('restartBtn');
    }

    setupEventListeners() {
        // Language toggle
        this.langBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchLanguage(btn.dataset.lang));
        });

        // Start button
        this.startBtn.addEventListener('click', () => this.startDrawing());

        // Drawing controls
        this.clearBtn.addEventListener('click', () => this.clearCanvas());
        this.nextBtn.addEventListener('click', () => this.nextLetter());
        this.prevBtn.addEventListener('click', () => this.previousLetter());

        // Code actions
        this.copyBtn.addEventListener('click', () => this.copyCode());
        this.downloadBtn.addEventListener('click', () => this.downloadCode());
        this.restartBtn.addEventListener('click', () => this.restart());

        // Canvas drawing events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawingOnCanvas(e));
        this.canvas.addEventListener('mousemove', (e) => this.drawOnCanvas(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.startDrawingOnCanvas(e));
        this.canvas.addEventListener('touchmove', (e) => this.drawOnCanvas(e));
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    }

    setupCanvas() {
        this.ctx.strokeStyle = '#6b46c1';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    switchLanguage(lang) {
        this.currentLanguage = lang;
        this.langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        // Update placeholder
        if (lang === 'th') {
            this.nameInput.placeholder = 'เช่น สมชาย ใจดี';
        } else {
            this.nameInput.placeholder = 'e.g., James Bond';
        }
    }

    startDrawing() {
        const name = this.nameInput.value.trim();
        if (!name) {
            alert('Please enter your name first!');
            return;
        }

        this.userName = name;
        this.letters = this.parseNameToLetters(name);
        this.currentLetterIndex = 0;
        this.drawings = {};

        // Hide input section and show drawing section
        this.inputSection.classList.add('hidden');
        this.drawingSection.classList.remove('hidden');

        this.updateDrawingInterface();
    }

    parseNameToLetters(name) {
        // Parse name into letters, preserving spaces for proper spacing
        return name.split('').filter(char => char !== '' && char !== '\n');
    }

    updateDrawingInterface() {
        const currentLetter = this.letters[this.currentLetterIndex];
        const progress = ((this.currentLetterIndex + 1) / this.letters.length) * 100;

        this.currentLetterDisplay.textContent = currentLetter;
        this.progressText.textContent = `Letter ${this.currentLetterIndex + 1} of ${this.letters.length}`;
        this.progressFill.style.width = `${progress}%`;

        // Show/hide previous button
        if (this.currentLetterIndex > 0) {
            this.prevBtn.classList.remove('hidden');
        } else {
            this.prevBtn.classList.add('hidden');
        }

        // Update next button text
        if (this.currentLetterIndex === this.letters.length - 1) {
            this.nextBtn.textContent = 'Generate Code';
        } else {
            this.nextBtn.textContent = 'Next Letter';
        }

        this.clearCanvas();
        this.loadCurrentDrawing();
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    startDrawingOnCanvas(e) {
        e.preventDefault();
        this.isDrawing = true;
        const coords = this.getCanvasCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    drawOnCanvas(e) {
        if (!this.isDrawing) return;
        e.preventDefault();

        const coords = this.getCanvasCoordinates(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();

        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveCurrentDrawing();
        }
    }

    saveCurrentDrawing() {
        const currentLetter = this.letters[this.currentLetterIndex];
        const imageData = this.ctx.getImageData(0, 0, 400, 400);
        this.drawings[currentLetter + '_' + this.currentLetterIndex] = imageData;
    }

    loadCurrentDrawing() {
        const currentLetter = this.letters[this.currentLetterIndex];
        const drawingKey = currentLetter + '_' + this.currentLetterIndex;
        if (this.drawings[drawingKey]) {
            this.ctx.putImageData(this.drawings[drawingKey], 0, 0);
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, 400, 400);
        const currentLetter = this.letters[this.currentLetterIndex];
        const drawingKey = currentLetter + '_' + this.currentLetterIndex;
        delete this.drawings[drawingKey];
    }

    nextLetter() {
        this.saveCurrentDrawing();
        
        if (this.currentLetterIndex === this.letters.length - 1) {
            // Generate code
            this.generateTurtleCode();
        } else {
            this.currentLetterIndex++;
            this.updateDrawingInterface();
        }
    }

    previousLetter() {
        if (this.currentLetterIndex > 0) {
            this.saveCurrentDrawing();
            this.currentLetterIndex--;
            this.updateDrawingInterface();
        }
    }

    generateTurtleCode() {
        const code = this.createTurtleCode();
        this.generatedCodeElement.textContent = code;
        
        // Hide drawing section and show code section
        this.drawingSection.classList.add('hidden');
        this.codeSection.classList.remove('hidden');
    }

    createTurtleCode() {
        let code = `# Generated Turtle Code for "${this.userName}"\n`;
        code += `!pip install ColabTurtle\n`;
        code += `from ColabTurtle.Turtle import *\n`;
        code += `import ColabTurtle.Turtle as t\n\n`;
        code += `t.initializeTurtle(initial_speed=5)\n`;
        code += `t.hideturtle()\n`;
        code += `pensize(2)\n\n`;

        // Generate helper functions for each unique letter
        const uniqueLetters = [...new Set(this.letters)];
        const letterFunctions = {};

        uniqueLetters.forEach((letter, index) => {
            const functionName = this.sanitizeFunctionName(letter);
            letterFunctions[letter] = functionName;
            
            code += `def ${functionName}():\n`;
            code += `    """Draw the letter '${letter}'"""\n`;
            code += this.generateDrawingCommands(letter, index);
            code += `\n\n`;
        });

        // Generate main execution code
        code += `# Draw the name "${this.userName}"\n`;
        code += `def draw_name():\n`;
        code += `    # Starting position (ColabTurtle uses positive coordinates)\n`;
        code += `    t.penup()\n`;
        code += `    start_x = max(50, 400 - ${this.letters.length} * 60)  # Center the name\n`;
        code += `    t.goto(start_x, 200)\n`;
        code += `    t.pendown()\n\n`;

        this.letters.forEach((letter, index) => {
            const functionName = letterFunctions[letter];
            code += `    # Draw letter '${letter}'\n`;
            if (letter === ' ') {
                code += `    # Space - just move forward\n`;
                code += `    t.penup()\n`;
                code += `    t.forward(30)  # Space width\n`;
                code += `    t.pendown()\n\n`;
            } else {
                code += `    ${functionName}()\n`;
                code += `    \n`;
                code += `    # Move to next letter position\n`;
                code += `    t.penup()\n`;
                code += `    t.forward(60)  # Space between letters\n`;
                code += `    t.pendown()\n\n`;
            }
        });

        code += `# Execute the drawing\n`;
        code += `draw_name()\n`;
        code += `t.penup()\n`;
        code += `print("Drawing complete!")`;

        return code;
    }

    sanitizeFunctionName(letter) {
        // Create a safe function name from the letter
        const letterCode = letter.charCodeAt(0);
        if (/^[a-zA-Z]$/.test(letter)) {
            return `draw_${letter.toLowerCase()}`;
        } else {
            return `draw_char_${letterCode}`;
        }
    }

    generateDrawingCommands(letter, letterIndex) {
        // This is a simplified version - in a real implementation,
        // you would analyze the actual drawing data to generate commands
        const drawingKey = letter + '_' + this.letters.indexOf(letter);
        let commands = '';

        // For this demo, we'll generate some basic drawing commands
        // In a real implementation, you would convert the pixel data to turtle commands
        commands += `    # Commands for drawing '${letter}'\n`;
        commands += `    start_x, start_y = t.xcor(), t.ycor()\n`;
        commands += `    t.penup()\n`;
        commands += `    t.goto(start_x, start_y + 40)\n`;
        commands += `    t.pendown()\n`;
        commands += `    \n`;
        commands += `    # Basic letter shape (simplified)\n`;
        
        if (/^[a-zA-Z]$/.test(letter)) {
            commands += this.generateEnglishLetterCommands(letter.toLowerCase());
        } else {
            commands += this.generateThaiLetterCommands(letter);
        }
        
        commands += `    # Return to baseline\n`;
        commands += `    t.penup()\n`;
        commands += `    t.goto(start_x, start_y)\n`;
        commands += `    t.pendown()\n`;

        return commands;
    }

    generateEnglishLetterCommands(letter) {
        // Simplified letter drawing commands using relative movements
        const letterShapes = {
            'a': `    # Draw letter 'A'\n    t.left(75)\n    t.forward(40)\n    t.right(150)\n    t.forward(40)\n    t.backward(15)\n    t.right(105)\n    t.forward(12)\n    t.left(180)\n`,
            'b': `    # Draw letter 'B'\n    t.left(90)\n    t.forward(40)\n    t.right(90)\n    t.forward(20)\n    t.right(90)\n    t.forward(15)\n    t.right(90)\n    t.forward(15)\n    t.left(90)\n    t.forward(5)\n    t.left(90)\n    t.forward(15)\n    t.right(90)\n    t.forward(20)\n    t.left(180)\n`,
            'c': `    # Draw letter 'C'\n    t.penup()\n    t.forward(20)\n    t.pendown()\n    t.left(180)\n    t.forward(20)\n    t.left(90)\n    t.forward(40)\n    t.right(90)\n    t.forward(20)\n    t.left(180)\n`,
            'd': `    # Draw letter 'D'\n    t.left(90)\n    t.forward(40)\n    t.right(90)\n    t.circle(-20, 180)\n    t.left(180)\n`,
            'e': `    # Draw letter 'E'\n    t.penup()\n    t.forward(20)\n    t.pendown()\n    t.left(180)\n    t.forward(20)\n    t.left(90)\n    t.forward(20)\n    t.right(90)\n    t.forward(15)\n    t.left(180)\n    t.forward(15)\n    t.right(90)\n    t.forward(20)\n    t.right(90)\n    t.forward(20)\n    t.left(180)\n`,
            'j': `    # Draw letter 'J'\n    t.penup()\n    t.forward(10)\n    t.left(90)\n    t.forward(40)\n    t.right(90)\n    t.pendown()\n    t.forward(15)\n    t.left(180)\n    t.forward(25)\n    t.left(90)\n    t.forward(30)\n    t.left(90)\n    t.forward(10)\n    t.left(180)\n`,
            'm': `    # Draw letter 'M'\n    t.left(90)\n    t.forward(40)\n    t.right(135)\n    t.forward(20)\n    t.left(90)\n    t.forward(20)\n    t.right(135)\n    t.forward(40)\n    t.left(180)\n`,
            's': `    # Draw letter 'S'\n    t.penup()\n    t.forward(20)\n    t.pendown()\n    t.left(180)\n    t.forward(15)\n    t.left(90)\n    t.forward(15)\n    t.right(90)\n    t.forward(15)\n    t.right(90)\n    t.forward(15)\n    t.left(90)\n    t.forward(15)\n    t.left(180)\n`,
            // Add spaces
            ' ': `    # Space - just move forward\n    pass  # No drawing for space\n`,
        };

        return letterShapes[letter] || `    # Custom drawing for '${letter}'\n    t.forward(15)\n    t.left(90)\n    t.forward(30)\n    t.backward(30)\n    t.right(90)\n    t.forward(5)\n    t.left(180)\n`;
    }

    generateThaiLetterCommands(letter) {
        // Simplified Thai character drawing with safe coordinates
        return `    # Custom drawing for Thai character '${letter}'\n    t.forward(12)\n    t.left(90)\n    t.forward(25)\n    t.right(45)\n    t.forward(10)\n    t.backward(10)\n    t.left(45)\n    t.backward(25)\n    t.right(90)\n    t.forward(8)\n    t.left(180)\n`;
    }

    copyCode() {
        const code = this.generatedCodeElement.textContent;
        navigator.clipboard.writeText(code).then(() => {
            this.copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyBtn.textContent = 'Copy to Clipboard';
            }, 2000);
        }).catch(() => {
            alert('Failed to copy to clipboard. Please select and copy manually.');
        });
    }

    downloadCode() {
        const code = this.generatedCodeElement.textContent;
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turtle_${this.userName.replace(/\s+/g, '_')}.py`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    restart() {
        // Reset all state
        this.userName = '';
        this.letters = [];
        this.currentLetterIndex = 0;
        this.drawings = {};
        this.nameInput.value = '';

        // Show input section and hide others
        this.inputSection.classList.remove('hidden');
        this.drawingSection.classList.add('hidden');
        this.codeSection.classList.add('hidden');

        this.clearCanvas();
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TurtleDrawingApp();
});