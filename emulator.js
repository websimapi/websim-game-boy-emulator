class Emulator {
    constructor() {
        // Initialize components
        this.memory = new Memory();
        this.cpu = new CPU(this.memory);
        this.gpu = new GPU(this.memory);
        this.timer = new Timer(this.memory);
        this.input = new Input(this.memory);
        
        // Emulator state
        this.isRunning = false;
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.cyclesThisFrame = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTimer = 0;
        
        // Debug mode
        this.debugMode = false;
        
        // Initialize ROM loading
        this.initRomLoading();
        
        // Reset CPU and start the emulator
        this.reset();
        this.start();
    }
    
    // Initialize ROM loading button
    initRomLoading() {
        const loadRomButton = document.getElementById('load-rom');
        loadRomButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.gb,.gbc,.rom';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const romData = await readRomFile(file);
                    this.loadRom(romData);
                } catch (error) {
                    console.error('Error loading ROM:', error);
                    notify('Error loading ROM: ' + error.message);
                }
            };
            
            input.click();
        });
    }
    
    // Load ROM data
    loadRom(romData) {
        this.memory.loadRom(romData);
        this.reset();
        notify('ROM loaded successfully!');
    }
    
    // Reset the emulator
    reset() {
        this.stop();
        this.cpu.reset();
        this.gpu.clearScreen();
        
        // Display Nintendo logo if boot ROM is active
        if (this.memory.bootRomActive) {
            this.gpu.renderNintendoLogo();
        }
        
        // Reset timers
        this.cyclesThisFrame = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTimer = 0;
        
        this.start();
    }
    
    // Start the emulator
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.mainLoop.bind(this));
    }
    
    // Stop the emulator
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    // Main emulation loop
    mainLoop(timestamp) {
        if (!this.isRunning) return;
        
        // Calculate elapsed time
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // Update FPS counter
        this.fpsTimer += deltaTime;
        this.fpsCounter++;
        if (this.fpsTimer >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTimer = 0;
            
            if (this.debugMode) {
                console.log(`FPS: ${this.fps}`);
            }
        }
        
        // Run one frame of emulation
        this.runFrame();
        
        // Request next frame
        this.animationFrameId = requestAnimationFrame(this.mainLoop.bind(this));
    }
    
    // Run a single frame of emulation
    runFrame() {
        // Game Boy runs at approximately 4.194304 MHz
        // At 60fps, each frame should execute around 70000 cycles
        const cyclesPerFrame = 70224; // Exact number of cycles per frame
        this.cyclesThisFrame = 0;
        
        while (this.cyclesThisFrame < cyclesPerFrame) {
            // Execute an instruction
            const instructionCycles = this.cpu.executeInstruction();
            this.cyclesThisFrame += instructionCycles;
            
            // Update timers
            this.timer.update(instructionCycles);
            
            // Update GPU
            this.gpu.step(instructionCycles);
            
            // Check for interrupts
            this.handleInterrupts();
        }
    }
    
    // Handle CPU interrupts
    handleInterrupts() {
        if (!this.cpu.interruptsEnabled && !this.cpu.halted) return;
        
        // Check for interrupts
        const interruptFlag = this.memory.readByte(0xFF0F);
        const interruptEnable = this.memory.readByte(0xFFFF);
        
        if (interruptFlag & interruptEnable) {
            // At least one interrupt is pending and enabled
            this.cpu.halted = false;
            
            if (!this.cpu.interruptsEnabled) return;
            
            // Process interrupts in priority order (VBlank, LCD, Timer, Serial, Joypad)
            for (let i = 0; i < 5; i++) {
                if ((interruptFlag & (1 << i)) && (interruptEnable & (1 << i))) {
                    // Service this interrupt
                    this.cpu.interruptsEnabled = false;
                    
                    // Push PC to stack
                    this.cpu.registers.sp = (this.cpu.registers.sp - 2) & 0xFFFF;
                    this.memory.writeWord(this.cpu.registers.sp, this.cpu.registers.pc);
                    
                    // Jump to interrupt vector
                    this.cpu.registers.pc = 0x0040 + (i * 0x08);
                    
                    // Clear interrupt flag
                    this.memory.writeByte(0xFF0F, interruptFlag & ~(1 << i));
                    
                    // Use 5 M-cycles (20 T-cycles)
                    this.cpu.clock.m = 5;
                    this.cpu.clock.t = 20;
                    
                    // Only handle one interrupt at a time
                    break;
                }
            }
        }
    }
    
    // Toggle debug mode
    toggleDebug() {
        this.debugMode = !this.debugMode;
        notify(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
    }
}

// Start the emulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const emulator = new Emulator();
    
    // Add keyboard shortcuts for emulator control
    document.addEventListener('keydown', (e) => {
        // Reset - R key
        if (e.key === 'r') {
            emulator.reset();
        }
        
        // Pause/Resume - P key
        if (e.key === 'p') {
            if (emulator.isRunning) {
                emulator.stop();
                notify('Emulator paused');
            } else {
                emulator.start();
                notify('Emulator resumed');
            }
        }
        
        // Debug mode toggle - D key
        if (e.key === 'd') {
            emulator.toggleDebug();
        }
    });
});