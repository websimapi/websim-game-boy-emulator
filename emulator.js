class Emulator {
    constructor() {
        // Initialize components
        this.memory = new Memory();
        this.cpu = new CPU(this.memory);
        this.gpu = new GPU(this.memory);
        this.input = new Input(this.memory);
        
        // Emulator state
        this.isRunning = false;
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        
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
        this.cpu.reset();
        this.gpu.clearScreen();
        
        // Display Nintendo logo if boot ROM is active
        if (this.memory.bootRomActive) {
            this.gpu.renderNintendoLogo();
        }
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
        
        // Run CPU cycles
        this.runFrame(deltaTime);
        
        // Request next frame
        this.animationFrameId = requestAnimationFrame(this.mainLoop.bind(this));
    }
    
    // Run a single frame of emulation
    runFrame(deltaTime) {
        // Game Boy runs at approximately 4.194304 MHz
        // At 60fps, each frame should execute around 70000 cycles
        const cyclesPerFrame = 70000;
        let cycles = 0;
        
        while (cycles < cyclesPerFrame) {
            // Execute an instruction
            const instructionCycles = this.cpu.executeInstruction();
            cycles += instructionCycles;
            
            // Update GPU
            this.gpu.step(instructionCycles);
            
            // Check for interrupts
            this.handleInterrupts();
        }
    }
    
    // Handle CPU interrupts
    handleInterrupts() {
        if (!this.cpu.interruptsEnabled) return;
        
        // Check for interrupts
        const interruptFlag = this.memory.readByte(0xFF0F);
        const interruptEnable = this.memory.readByte(0xFFFF);
        
        if (interruptFlag & interruptEnable) {
            // At least one interrupt is pending and enabled
            this.cpu.halted = false;
            
            // Process interrupts (VBlank, LCD, Timer, Serial, Joypad)
            for (let i = 0; i < 5; i++) {
                if ((interruptFlag & (1 << i)) && (interruptEnable & (1 << i))) {
                    // Service this interrupt
                    this.cpu.interruptsEnabled = false;
                    
                    // Push PC to stack
                    this.cpu.registers.sp -= 2;
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
}

// Start the emulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const emulator = new Emulator();
});

