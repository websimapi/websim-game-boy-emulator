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
        this.pendingEnableInterrupts = false;
        this.halted = false;
        this.stopped = false;
        
        // Operation timing
        this.clock = {
            m: 0, // Machine cycles
            t: 0, // Clock cycles (t = m * 4)
        };
        
        // Initialize the instruction tables
        this.initInstructions();
        this.initCBInstructions();
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
        this.pendingEnableInterrupts = false;
        this.halted = false;
        this.stopped = false;
        
        this.clock.m = 0;
        this.clock.t = 0;
    }
    
    // Get value of 16-bit register pair
    getRegisterPair(high, low) {
        return (this.registers[high] << 8) | this.registers[low];
    }
    
    // Set value of 16-bit register pair
    setRegisterPair(high, low, value) {
        this.registers[high] = (value >> 8) & 0xFF;
        this.registers[low] = value & 0xFF;
    }
    
    // Get HL register pair
    getHL() {
        return this.getRegisterPair('h', 'l');
    }
    
    // Set HL register pair
    setHL(value) {
        this.setRegisterPair('h', 'l', value);
    }
    
    // Get BC register pair
    getBC() {
        return this.getRegisterPair('b', 'c');
    }
    
    // Set BC register pair
    setBC(value) {
        this.setRegisterPair('b', 'c', value);
    }
    
    // Get DE register pair
    getDE() {
        return this.getRegisterPair('d', 'e');
    }
    
    // Set DE register pair
    setDE(value) {
        this.setRegisterPair('d', 'e', value);
    }
    
    // Get AF register pair (A and Flags)
    getAF() {
        return this.getRegisterPair('a', 'f');
    }
    
    // Set AF register pair
    setAF(value) {
        this.setRegisterPair('a', 'f', value);
    }
    
    // Initialize opcode instruction table
    initInstructions() {
        // This is a complete instruction table for the Game Boy CPU
        this.instructions = {
            // 0x00: NOP
            0x00: () => { this.clock.m = 1; this.clock.t = 4; },
            
            // 0x01: LD BC, nn
            0x01: () => {
                this.setBC(this.memory.readWord(this.registers.pc));
                this.registers.pc += 2;
                this.clock.m = 3; this.clock.t = 12;
            },
            
            // 0x02: LD (BC), A
            0x02: () => {
                this.memory.writeByte(this.getBC(), this.registers.a);
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // 0x03: INC BC
            0x03: () => {
                this.setBC((this.getBC() + 1) & 0xFFFF);
                this.clock.m = 1; this.clock.t = 8;
            },
            
            // 0x04: INC B
            0x04: () => {
                this.registers.b = this.inc8(this.registers.b);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // 0x05: DEC B
            0x05: () => {
                this.registers.b = this.dec8(this.registers.b);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // 0x06: LD B, n
            0x06: () => {
                this.registers.b = this.memory.readByte(this.registers.pc++);
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // 0x07: RLCA
            0x07: () => {
                const carry = (this.registers.a & 0x80) >> 7;
                this.registers.a = ((this.registers.a << 1) | carry) & 0xFF;
                this.setFlag(this.FLAGS.Z, 0);
                this.setFlag(this.FLAGS.N, 0);
                this.setFlag(this.FLAGS.H, 0);
                this.setFlag(this.FLAGS.C, carry);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // 0x08: LD (nn), SP
            0x08: () => {
                const address = this.memory.readWord(this.registers.pc);
                this.registers.pc += 2;
                this.memory.writeWord(address, this.registers.sp);
                this.clock.m = 5; this.clock.t = 20;
            },
            
            // 0x09: ADD HL, BC
            0x09: () => {
                this.addHL(this.getBC());
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // 0x0A: LD A, (BC)
            0x0A: () => {
                this.registers.a = this.memory.readByte(this.getBC());
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // 0x0B: DEC BC
            0x0B: () => {
                this.setBC((this.getBC() - 1) & 0xFFFF);
                this.clock.m = 1; this.clock.t = 8;
            },
            
            // 0x0C: INC C
            0x0C: () => {
                this.registers.c = this.inc8(this.registers.c);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // 0x0D: DEC C
            0x0D: () => {
                this.registers.c = this.dec8(this.registers.c);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // 0x0E: LD C, n
            0x0E: () => {
                this.registers.c = this.memory.readByte(this.registers.pc++);
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // 0x0F: RRCA
            0x0F: () => {
                const carry = this.registers.a & 0x01;
                this.registers.a = ((this.registers.a >> 1) | (carry << 7)) & 0xFF;
                this.setFlag(this.FLAGS.Z, 0);
                this.setFlag(this.FLAGS.N, 0);
                this.setFlag(this.FLAGS.H, 0);
                this.setFlag(this.FLAGS.C, carry);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // ... many more opcodes ...
            
            // 0x10: STOP
            0x10: () => {
                this.stopped = true;
                this.registers.pc++;  // Skip the next byte
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // 0x11: LD DE, nn
            0x11: () => {
                this.setDE(this.memory.readWord(this.registers.pc));
                this.registers.pc += 2;
                this.clock.m = 3; this.clock.t = 12;
            },
            
            // 0x12: LD (DE), A
            0x12: () => {
                this.memory.writeByte(this.getDE(), this.registers.a);
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // 0x13: INC DE
            0x13: () => {
                this.setDE((this.getDE() + 1) & 0xFFFF);
                this.clock.m = 1; this.clock.t = 8;
            },
            
            // 0x14: INC D
            0x14: () => {
                this.registers.d = this.inc8(this.registers.d);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // 0x15: DEC D
            0x15: () => {
                this.registers.d = this.dec8(this.registers.d);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // 0x16: LD D, n
            0x16: () => {
                this.registers.d = this.memory.readByte(this.registers.pc++);
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // ... many more opcodes ...
            
            // 0x20: JR NZ, n
            0x20: () => {
                const offset = this.memory.readByte(this.registers.pc++);
                if (this.getFlag(this.FLAGS.Z) === 0) {
                    this.registers.pc = (this.registers.pc + ((offset << 24) >> 24)) & 0xFFFF;
                    this.clock.m = 3; this.clock.t = 12;
                } else {
                    this.clock.m = 2; this.clock.t = 8;
                }
            },
            
            // ... many more opcodes ...
            
            // 0x31: LD SP, nn
            0x31: () => {
                this.registers.sp = this.memory.readWord(this.registers.pc);
                this.registers.pc += 2;
                this.clock.m = 3; this.clock.t = 12;
            },
            
            // ... many more opcodes ...
            
            // 0x3E: LD A, n
            0x3E: () => {
                this.registers.a = this.memory.readByte(this.registers.pc++);
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // ... many more opcodes ...
            
            // 0xAF: XOR A
            0xAF: () => {
                this.registers.a = 0;
                this.setFlag(this.FLAGS.Z, 1);
                this.setFlag(this.FLAGS.N, 0);
                this.setFlag(this.FLAGS.H, 0);
                this.setFlag(this.FLAGS.C, 0);
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // ... many more opcodes ...
            
            // 0xC3: JP nn
            0xC3: () => {
                this.registers.pc = this.memory.readWord(this.registers.pc);
                this.clock.m = 4; this.clock.t = 16;
            },
            
            // ... many more opcodes ...
            
            // 0xCB: Extended instructions
            0xCB: () => {
                const cbOpcode = this.memory.readByte(this.registers.pc++);
                if (this.cbInstructions[cbOpcode]) {
                    this.cbInstructions[cbOpcode]();
                } else {
                    console.log(`Unknown CB opcode: ${toHex(cbOpcode)} at ${toHex(this.registers.pc - 1, 4)}`);
                    this.clock.m = 1; this.clock.t = 4;
                }
            },
            
            // ... many more opcodes ...
            
            // 0xF3: DI (Disable Interrupts)
            0xF3: () => {
                this.interruptsEnabled = false;
                this.pendingEnableInterrupts = false;
                this.clock.m = 1; this.clock.t = 4;
            },
            
            // ... many more opcodes ...
            
            // 0xFB: EI (Enable Interrupts)
            0xFB: () => {
                // Interrupts are enabled after the next instruction
                this.pendingEnableInterrupts = true;
                this.clock.m = 1; this.clock.t = 4;
            }
        };
        
        // Add many more instructions to make the CPU fully functional
        // This is just a subset of the required instructions
    }
    
    // Initialize CB-prefixed instructions
    initCBInstructions() {
        this.cbInstructions = {
            // CB 0x00: RLC B
            0x00: () => {
                this.registers.b = this.rlc(this.registers.b);
                this.clock.m = 2; this.clock.t = 8;
            },
            
            // Add many more CB instructions
            // ...
        };
    }
    
    // Helper function for 8-bit increment
    inc8(value) {
        const result = (value + 1) & 0xFF;
        this.setFlag(this.FLAGS.Z, result === 0 ? 1 : 0);
        this.setFlag(this.FLAGS.N, 0);
        this.setFlag(this.FLAGS.H, (value & 0x0F) === 0x0F ? 1 : 0);
        return result;
    }
    
    // Helper function for 8-bit decrement
    dec8(value) {
        const result = (value - 1) & 0xFF;
        this.setFlag(this.FLAGS.Z, result === 0 ? 1 : 0);
        this.setFlag(this.FLAGS.N, 1);
        this.setFlag(this.FLAGS.H, (value & 0x0F) === 0 ? 1 : 0);
        return result;
    }
    
    // Helper function for adding to HL
    addHL(value) {
        const hl = this.getHL();
        const result = (hl + value) & 0xFFFF;
        
        this.setFlag(this.FLAGS.N, 0);
        this.setFlag(this.FLAGS.H, ((hl & 0x0FFF) + (value & 0x0FFF)) > 0x0FFF ? 1 : 0);
        this.setFlag(this.FLAGS.C, result < hl ? 1 : 0);
        
        this.setHL(result);
    }
    
    // Helper function for rotate left with carry
    rlc(value) {
        const carry = (value & 0x80) >> 7;
        const result = ((value << 1) | carry) & 0xFF;
        
        this.setFlag(this.FLAGS.Z, result === 0 ? 1 : 0);
        this.setFlag(this.FLAGS.N, 0);
        this.setFlag(this.FLAGS.H, 0);
        this.setFlag(this.FLAGS.C, carry);
        
        return result;
    }
    
    // Execute a single instruction
    executeInstruction() {
        if (this.halted) {
            // Check for interrupt to wake up
            const interruptFlag = this.memory.readByte(0xFF0F);
            const interruptEnable = this.memory.readByte(0xFFFF);
            if (interruptFlag & interruptEnable & 0x1F) {
                this.halted = false;
            } else {
                this.clock.m = 1;
                this.clock.t = 4;
                return 4;
            }
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
        
        // Check for pending interrupt enable
        if (this.pendingEnableInterrupts) {
            this.pendingEnableInterrupts = false;
            this.interruptsEnabled = true;
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