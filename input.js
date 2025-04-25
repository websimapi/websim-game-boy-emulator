class Input {
    constructor(memory) {
        this.memory = memory;
        
        // Input register (0xFF00)
        // Bit 7-4: P14 (Down, Up, Left, Right)
        // Bit 3-0: P15 (Start, Select, B, A)
        this.inputState = 0xFF;
        
        // Button mapping
        this.buttons = {
            A: false,
            B: false,
            START: false,
            SELECT: false,
            UP: false,
            DOWN: false,
            LEFT: false,
            RIGHT: false
        };
        
        // Set up event listeners
        this.setupListeners();
    }
    
    // Initialize input event listeners
    setupListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Set up button touch/click handlers for mobile
        document.getElementById('btn-a').addEventListener('mousedown', () => this.setButton('A', true));
        document.getElementById('btn-a').addEventListener('mouseup', () => this.setButton('A', false));
        document.getElementById('btn-a').addEventListener('touchstart', (e) => { e.preventDefault(); this.setButton('A', true); });
        document.getElementById('btn-a').addEventListener('touchend', () => this.setButton('A', false));
        
        document.getElementById('btn-b').addEventListener('mousedown', () => this.setButton('B', true));
        document.getElementById('btn-b').addEventListener('mouseup', () => this.setButton('B', false));
        document.getElementById('btn-b').addEventListener('touchstart', (e) => { e.preventDefault(); this.setButton('B', true); });
        document.getElementById('btn-b').addEventListener('touchend', () => this.setButton('B', false));
        
        document.getElementById('btn-start').addEventListener('mousedown', () => this.setButton('START', true));
        document.getElementById('btn-start').addEventListener('mouseup', () => this.setButton('START', false));
        document.getElementById('btn-start').addEventListener('touchstart', (e) => { e.preventDefault(); this.setButton('START', true); });
        document.getElementById('btn-start').addEventListener('touchend', () => this.setButton('START', false));
        
        document.getElementById('btn-select').addEventListener('mousedown', () => this.setButton('SELECT', true));
        document.getElementById('btn-select').addEventListener('mouseup', () => this.setButton('SELECT', false));
        document.getElementById('btn-select').addEventListener('touchstart', (e) => { e.preventDefault(); this.setButton('SELECT', true); });
        document.getElementById('btn-select').addEventListener('touchend', () => this.setButton('SELECT', false));
        
        document.getElementById('btn-up').addEventListener('mousedown', () => this.setButton('UP', true));
        document.getElementById('btn-up').addEventListener('mouseup', () => this.setButton('UP', false));
        document.getElementById('btn-up').addEventListener('touchstart', (e) => { e.preventDefault(); this.setButton('UP', true); });
        document.getElementById('btn-up').addEventListener('touchend', () => this.setButton('UP', false));
        
        document.getElementById('btn-down').addEventListener('mousedown', () => this.setButton('DOWN', true));
        document.getElementById('btn-down').addEventListener('mouseup', () => this.setButton('DOWN', false));
        document.getElementById('btn-down').addEventListener('touchstart', (e) => { e.preventDefault(); this.setButton('DOWN', true); });
        document.getElementById('btn-down').addEventListener('touchend', () => this.setButton('DOWN', false));
        
        document.getElementById('btn-left').addEventListener('mousedown', () => this.setButton('LEFT', true));
        document.getElementById('btn-left').addEventListener('mouseup', () => this.setButton('LEFT', false));
        document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); this.setButton('LEFT', true); });
        document.getElementById('btn-left').addEventListener('touchend', () => this.setButton('LEFT', false));
        
        document.getElementById('btn-right').addEventListener('mousedown', () => this.setButton('RIGHT', true));
        document.getElementById('btn-right').addEventListener('mouseup', () => this.setButton('RIGHT', false));
        document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); this.setButton('RIGHT', true); });
        document.getElementById('btn-right').addEventListener('touchend', () => this.setButton('RIGHT', false));
        
        // Prevent D-pad center button from doing anything
        document.getElementById('btn-center').addEventListener('mousedown', (e) => e.preventDefault());
        document.getElementById('btn-center').addEventListener('touchstart', (e) => e.preventDefault());
    }
    
    // Handle keyboard input
    handleKeyDown(e) {
        switch (e.key) {
            case 'z':
                this.setButton('A', true);
                break;
            case 'x':
                this.setButton('B', true);
                break;
            case 'Enter':
                this.setButton('START', true);
                break;
            case 'Shift':
                this.setButton('SELECT', true);
                break;
            case 'ArrowUp':
                this.setButton('UP', true);
                break;
            case 'ArrowDown':
                this.setButton('DOWN', true);
                break;
            case 'ArrowLeft':
                this.setButton('LEFT', true);
                break;
            case 'ArrowRight':
                this.setButton('RIGHT', true);
                break;
        }
    }
    
    handleKeyUp(e) {
        switch (e.key) {
            case 'z':
                this.setButton('A', false);
                break;
            case 'x':
                this.setButton('B', false);
                break;
            case 'Enter':
                this.setButton('START', false);
                break;
            case 'Shift':
                this.setButton('SELECT', false);
                break;
            case 'ArrowUp':
                this.setButton('UP', false);
                break;
            case 'ArrowDown':
                this.setButton('DOWN', false);
                break;
            case 'ArrowLeft':
                this.setButton('LEFT', false);
                break;
            case 'ArrowRight':
                this.setButton('RIGHT', false);
                break;
        }
    }
    
    // Set button state
    setButton(button, pressed) {
        this.buttons[button] = pressed;
        this.updateInputState();
    }
    
    // Update the input state based on current button states
    updateInputState() {
        // Start with all buttons released
        this.inputState = 0xFF;
        
        // P14 selection (bit 4 = 0)
        // Bits 3-0: Down, Up, Left, Right
        if (this.buttons.DOWN) this.inputState &= ~(1 << 3);
        if (this.buttons.UP) this.inputState &= ~(1 << 2);
        if (this.buttons.LEFT) this.inputState &= ~(1 << 1);
        if (this.buttons.RIGHT) this.inputState &= ~(1 << 0);
        
        // P15 selection (bit 5 = 0)
        // Bits 3-0: Start, Select, B, A
        if (this.buttons.START) this.inputState &= ~(1 << 3);
        if (this.buttons.SELECT) this.inputState &= ~(1 << 2);
        if (this.buttons.B) this.inputState &= ~(1 << 1);
        if (this.buttons.A) this.inputState &= ~(1 << 0);
        
        // Write the current input state to memory
        this.memory.io[0x00] = this.inputState;
    }
    
    // Handle input register reads and writes
    handleIO(address, value, isWrite) {
        if (address !== 0xFF00) return false;
        
        if (isWrite) {
            // Only bits 4-5 are writable (button group selection)
            this.inputState = (this.inputState & 0xCF) | (value & 0x30);
            this.updateInputState();
        } else {
            // Return the current input state
            return this.inputState;
        }
        
        return true;
    }
}

