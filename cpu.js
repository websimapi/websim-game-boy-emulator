class CPU {
    constructor(memory) {
        this.memory = memory;
        
        // CPU registers
        this.registers = {
            a: 0, // Accumulator
            b: 0,
            c: 0,
            d: 0,
            e: 0,
            h: 0,
            l: 0,
            f: 0, // Flags register
            pc: 0, // Program counter
            sp: 0, // Stack pointer
        };
        
        // Flag bit positions
        this.FLAGS = {
            Z: 7, // Zero flag
            N: 6, // Subtract flag
            H: 5, // Half Carry flag
            C: 4, // Carry flag
        };
        
        // Interrupt flags
        this.interruptsEnabled = false;
        this.halted = false;
        this.stopped = false;
        
        // Operation timing
        this.clock = {
            m: 0, // Machine cycles
            t: 0, // Clock cycles (t = m * 4)
        };
        
        // Initialize the instruction table
        this.initInstructions();
    }
    
    // Initialize CPU state
    reset() {
        // Initialize registers according to GB state after BIOS
        if (!this.memory.bootRomActive) {
            this.registers.a = 0x01;
            this.registers.f = 0xB0;
            this.registers.b = 0x00;
            this.registers.c = 0x13;
            this.registers.d = 0x00;
            this.registers.e = 0xD8;
            this.registers.h = 0x01;
            this.registers.l = 0x4D;
            this.registers.pc = 0x0100;
            this.registers.sp = 0xFFFE;
        } else {
            // If booting with BIOS, start at 0x0000
            this.registers.pc = 0x0000;
            this.registers.sp = 0xFFFE;
        }
        
        this.interruptsEnabled = false;
        this.halted = false;
        this.stopped = false;
        
        this.clock.m = 0;
        this.clock.t = 0;
    }
    
    // Initialize opcode instruction table
    initInstructions() {
        // This is a simplified instruction table with just a few basic instructions
        // A full Game Boy CPU would need all 256 opcodes plus CB-prefixed opcodes
        this.instructions = {
            // 0x00: NOP
            0x00: () => {
                this.clock.m = 1;
                this.clock.t = 4;
            },
            
            // 0xAF: XOR A (A = A ^ A, which is 0)
            0xAF: () => {
                this.registers.a = 0;
                this.setFlag(this.FLAGS.Z, 1);
                this.setFlag(this.FLAGS.N, 0);
                this.setFlag(this.FLAGS.H, 0);
                this.setFlag(this.FLAGS.C, 0);
                this.clock.m = 1;
                this.clock.t = 4;
            },
            
            // 0xC3: JP nn (Jump to nn)
            0xC3: () => {
                const nn = this.memory.readWord(this.registers.pc);
                this.registers.pc = nn;
                this.clock.m = 4;
                this.clock.t = 16;
            },
            
            // 0x31: LD SP, nn
            0x31: () => {
                this.registers.sp = this.memory.readWord(this.registers.pc);
                this.registers.pc += 2;
                this.clock.m = 3;
                this.clock.t = 12;
            },
            
            // 0x3E: LD A, n
            0x3E: () => {
                this.registers.a = this.memory.readByte(this.registers.pc++);
                this.clock.m = 2;
                this.clock.t = 8;
            },
            
            // 0x21: LD HL, nn
            0x21: () => {
                const nn = this.memory.readWord(this.registers.pc);
                this.registers.l = nn & 0xFF;
                this.registers.h = (nn >> 8) & 0xFF;
                this.registers.pc += 2;
                this.clock.m = 3;
                this.clock.t = 12;
            },
            
            // 0x32: LD (HL-), A
            0x32: () => {
                const hl = (this.registers.h << 8) | this.registers.l;
                this.memory.writeByte(hl, this.registers.a);
                const newHL = (hl - 1) & 0xFFFF;
                this.registers.h = (newHL >> 8) & 0xFF;
                this.registers.l = newHL & 0xFF;
                this.clock.m = 2;
                this.clock.t = 8;
            },
            
            // 0xCB: Extended operations
            0xCB: () => {
                const cbOpcode = this.memory.readByte(this.registers.pc++);
                // CB operations would be implemented here
                console.log(`CB Opcode: ${toHex(cbOpcode)}`);
                this.clock.m = 2;
                this.clock.t = 8;
            },
            
            // 0x76: HALT
            0x76: () => {
                this.halted = true;
                this.clock.m = 1;
                this.clock.t = 4;
            },
            
            // 0xF3: DI (Disable Interrupts)
            0xF3: () => {
                this.interruptsEnabled = false;
                this.clock.m = 1;
                this.clock.t = 4;
            },
            
            // 0xFB: EI (Enable Interrupts)
            0xFB: () => {
                this.interruptsEnabled = true;
                this.clock.m = 1;
                this.clock.t = 4;
            }
        };
    }
    
    // Execute a single instruction
    executeInstruction() {
        if (this.halted) {
            this.clock.m = 1;
            this.clock.t = 4;
            return;
        }
        
        // Read opcode at PC
        const opcode = this.memory.readByte(this.registers.pc++);
        
        // Execute the instruction
        if (this.instructions[opcode]) {
            this.instructions[opcode]();
        } else {
            console.log(`Unknown opcode: ${toHex(opcode)} at ${toHex(this.registers.pc - 1, 4)}`);
            this.clock.m = 1;
            this.clock.t = 4;
        }
        
        return this.clock.t;
    }
    
    // Set a CPU flag
    setFlag(flag, value) {
        if (value) {
            this.registers.f |= (1 << flag);
        } else {
            this.registers.f &= ~(1 << flag);
        }
    }
    
    // Get a CPU flag
    getFlag(flag) {
        return (this.registers.f & (1 << flag)) ? 1 : 0;
    }
}

