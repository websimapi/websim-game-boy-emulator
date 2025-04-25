class Memory {
    constructor() {
        // Initialize memory regions
        this.rom = new Uint8Array(0x8000);         // 0x0000-0x7FFF: Cartridge ROM
        this.vram = new Uint8Array(0x2000);        // 0x8000-0x9FFF: Video RAM
        this.eram = new Uint8Array(0x8000);        // 0xA000-0xBFFF: External RAM (Cartridge) - expanded for larger RAM sizes
        this.wram = new Uint8Array(0x2000);        // 0xC000-0xDFFF: Work RAM
        this.oam = new Uint8Array(0x100);          // 0xFE00-0xFEFF: Sprite Attribute Table (OAM)
        this.io = new Uint8Array(0x80);            // 0xFF00-0xFF7F: I/O Registers
        this.hram = new Uint8Array(0x80);          // 0xFF80-0xFFFE: High RAM
        this.ie = 0;                               // 0xFFFF: Interrupt Enable Register
        
        // ROM and RAM banking
        this.romBanks = [];                       // All ROM banks
        this.currentRomBank = 1;
        this.currentRamBank = 0;
        this.ramEnabled = false;
        
        // MBC (Memory Bank Controller) type
        this.mbcType = 0;
        this.romBanking = false;
        this.ramBanking = false;
        
        // Banking modes
        this.bankingMode = 0; // 0 = ROM Banking, 1 = RAM Banking
        
        // Reset boot ROM flag
        this.bootRomActive = true;
        
        // Define boot ROM (displays the Nintendo logo and scrolls it)
        this.bootRom = new Uint8Array([
            0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
            0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
            0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
            0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
            0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
            0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
            0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
            0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
            0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xE2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
            0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
            0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
            0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
            0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
            0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3C, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x3C,
            0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
            0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50
        ]);
        
        // Initialize timer registers
        this.div = 0;  // Divider register (0xFF04)
        this.tima = 0; // Timer counter (0xFF05)
        this.tma = 0;  // Timer modulo (0xFF06)
        this.tac = 0;  // Timer control (0xFF07)
        this.divCycles = 0;
        this.timaCycles = 0;
    }
    
    // Load ROM data
    loadRom(romData) {
        // Store the ROM in banks
        const romSize = this.getRomBanks(romData[0x0148]);
        this.romBanks = new Array(romSize);
        
        // Initialize ROM banks
        for (let i = 0; i < romSize; i++) {
            this.romBanks[i] = new Uint8Array(0x4000);
        }
        
        // Copy ROM data to banks
        for (let i = 0; i < romData.length && i < romSize * 0x4000; i++) {
            const bank = Math.floor(i / 0x4000);
            const offset = i % 0x4000;
            this.romBanks[bank][offset] = romData[i];
        }
        
        // Copy first two banks to ROM area
        for (let i = 0; i < 0x4000; i++) {
            this.rom[i] = this.romBanks[0][i];
        }
        
        for (let i = 0; i < 0x4000; i++) {
            this.rom[i + 0x4000] = this.romBanks[1][i];
        }
        
        // Extract ROM information
        const cartridgeType = romData[0x0147];
        this.mbcType = this.getMBCType(cartridgeType);
        
        const romSizeCode = romData[0x0148];
        const ramSizeCode = romData[0x0149];
        
        console.log(`Cartridge Type: ${toHex(cartridgeType)} (MBC${this.mbcType})`);
        console.log(`ROM Size: ${romSize} banks (${romSize * 16}KB)`);
        console.log(`RAM Size: ${this.getRamSize(ramSizeCode)}KB`);
        
        // Set banking flags
        this.romBanking = this.mbcType > 0;
        this.ramBanking = this.mbcType === 1 || this.mbcType === 3 || this.mbcType === 5;
        
        // Display ROM title
        let title = '';
        for (let i = 0x0134; i < 0x0143; i++) {
            if (romData[i] === 0) break;
            title += String.fromCharCode(romData[i]);
        }
        console.log(`ROM Title: ${title}`);
        notify(`Loaded ROM: ${title}`);
    }
    
    // Get MBC type from cartridge type
    getMBCType(cartridgeType) {
        switch (cartridgeType) {
            case 0x00: return 0;  // ROM ONLY
            case 0x01: case 0x02: case 0x03: return 1;  // MBC1
            case 0x05: case 0x06: return 2;  // MBC2
            case 0x0F: case 0x10: case 0x11: case 0x12: case 0x13: return 3;  // MBC3
            case 0x19: case 0x1A: case 0x1B: case 0x1C: case 0x1D: case 0x1E: return 5;  // MBC5
            default: return 0;
        }
    }
    
    // Get number of ROM banks from ROM size code
    getRomBanks(romSizeCode) {
        switch (romSizeCode) {
            case 0x00: return 2;   // 32KB (2 banks)
            case 0x01: return 4;   // 64KB (4 banks)
            case 0x02: return 8;   // 128KB (8 banks)
            case 0x03: return 16;  // 256KB (16 banks)
            case 0x04: return 32;  // 512KB (32 banks)
            case 0x05: return 64;  // 1MB (64 banks)
            case 0x06: return 128; // 2MB (128 banks)
            case 0x07: return 256; // 4MB (256 banks)
            case 0x08: return 512; // 8MB (512 banks)
            default: return 2;
        }
    }
    
    // Get RAM size in KB from RAM size code
    getRamSize(ramSizeCode) {
        switch (ramSizeCode) {
            case 0x00: return 0;  // No RAM
            case 0x01: return 2;  // 2KB
            case 0x02: return 8;  // 8KB
            case 0x03: return 32; // 32KB (4 banks of 8KB)
            case 0x04: return 128; // 128KB (16 banks of 8KB)
            case 0x05: return 64; // 64KB (8 banks of 8KB)
            default: return 0;
        }
    }
    
    // Read a byte from memory
    readByte(address) {
        // Boot ROM (0x0000-0x00FF)
        if (this.bootRomActive && address < 0x0100) {
            return this.bootRom[address];
        }
        
        // Memory regions
        if (address < 0x4000) {
            // ROM Bank 0
            return this.rom[address];
        } else if (address < 0x8000) {
            // ROM Bank 1-n
            return this.rom[address];
        } else if (address < 0xA000) {
            // VRAM
            return this.vram[address - 0x8000];
        } else if (address < 0xC000) {
            // External RAM
            if (this.ramEnabled) {
                const ramOffset = this.currentRamBank * 0x2000;
                return this.eram[ramOffset + (address - 0xA000)];
            }
            return 0xFF; // RAM not enabled
        } else if (address < 0xE000) {
            // Work RAM
            return this.wram[address - 0xC000];
        } else if (address < 0xFE00) {
            // Echo RAM (mirror of C000-DDFF)
            return this.wram[address - 0xE000];
        } else if (address < 0xFF00) {
            // OAM
            return this.oam[address - 0xFE00];
        } else if (address < 0xFF80) {
            // I/O Registers
            return this.readIO(address);
        } else if (address < 0xFFFF) {
            // High RAM
            return this.hram[address - 0xFF80];
        } else {
            // Interrupt Enable Register
            return this.ie;
        }
    }
    
    // Read from I/O registers with special handling
    readIO(address) {
        // Timer registers
        if (address === 0xFF04) return this.div;
        if (address === 0xFF05) return this.tima;
        if (address === 0xFF06) return this.tma;
        if (address === 0xFF07) return this.tac;
        
        // Other I/O registers
        return this.io[address - 0xFF00];
    }
    
    // Write a byte to memory
    writeByte(address, value) {
        // ROM Bank 0
        if (address < 0x2000) {
            // RAM Enable (MBC1, MBC3, MBC5)
            if (this.mbcType === 1 || this.mbcType === 3 || this.mbcType === 5) {
                this.ramEnabled = (value & 0x0F) === 0x0A;
            }
            return;
        } else if (address < 0x4000) {
            // ROM Bank Number (lower bits)
            if (this.romBanking) {
                this.handleRomBanking(address, value);
            }
            return;
        } else if (address < 0x6000) {
            // ROM/RAM Bank Number (upper bits) or RAM Bank Number
            if (this.romBanking || this.ramBanking) {
                this.handleBankingMode(address, value);
            }
            return;
        } else if (address < 0x8000) {
            // Banking Mode Select
            if (this.mbcType === 1) {
                this.bankingMode = value & 0x01;
                this.updateCurrentRomBank();
            }
            return;
        } else if (address < 0xA000) {
            // VRAM
            this.vram[address - 0x8000] = value;
        } else if (address < 0xC000) {
            // External RAM
            if (this.ramEnabled) {
                const ramOffset = this.currentRamBank * 0x2000;
                this.eram[ramOffset + (address - 0xA000)] = value;
            }
        } else if (address < 0xE000) {
            // Work RAM
            this.wram[address - 0xC000] = value;
        } else if (address < 0xFE00) {
            // Echo RAM (mirror of C000-DDFF)
            this.wram[address - 0xE000] = value;
        } else if (address < 0xFF00) {
            // OAM
            this.oam[address - 0xFE00] = value;
        } else if (address === 0xFF50 && value !== 0) {
            // Disable boot ROM
            this.bootRomActive = false;
            console.log("Boot ROM disabled");
        } else if (address < 0xFF80) {
            // I/O Registers
            this.writeIO(address, value);
        } else if (address < 0xFFFF) {
            // High RAM
            this.hram[address - 0xFF80] = value;
        } else {
            // Interrupt Enable Register
            this.ie = value;
        }
    }
    
    // Write to I/O registers with special handling
    writeIO(address, value) {
        // Timer registers
        if (address === 0xFF04) {
            this.div = 0; // Writing to DIV resets it
            return;
        } 
        if (address === 0xFF05) {
            this.tima = value;
            return;
        }
        if (address === 0xFF06) {
            this.tma = value;
            return;
        }
        if (address === 0xFF07) {
            this.tac = value;
            return;
        }
        
        // Other I/O registers
        this.io[address - 0xFF00] = value;
    }
    
    // Read a 16-bit word (2 bytes) from memory
    readWord(address) {
        return this.readByte(address) | (this.readByte(address + 1) << 8);
    }
    
    // Write a 16-bit word (2 bytes) to memory
    writeWord(address, value) {
        this.writeByte(address, value & 0xFF);
        this.writeByte(address + 1, (value >> 8) & 0xFF);
    }
    
    // Handle ROM banking
    handleRomBanking(address, value) {
        if (this.mbcType === 1) {
            // MBC1
            let bank = value & 0x1F;
            if (bank === 0) bank = 1;
            
            // Clear upper 3 bits and set them from the banking mode
            this.currentRomBank = (this.currentRomBank & 0xE0) | bank;
            this.updateCurrentRomBank();
        } else if (this.mbcType === 3) {
            // MBC3
            let bank = value & 0x7F;
            if (bank === 0) bank = 1;
            this.currentRomBank = bank;
            this.updateCurrentRomBank();
        } else if (this.mbcType === 5) {
            // MBC5
            if (address < 0x3000) {
                // Lower 8 bits
                this.currentRomBank = (this.currentRomBank & 0x100) | value;
            } else {
                // 9th bit
                this.currentRomBank = (this.currentRomBank & 0xFF) | ((value & 0x01) << 8);
            }
            this.updateCurrentRomBank();
        }
    }
    
    // Handle banking mode
    handleBankingMode(address, value) {
        if (this.mbcType === 1) {
            // MBC1
            if (this.bankingMode === 0) {
                // ROM Banking mode
                this.currentRomBank = (this.currentRomBank & 0x1F) | ((value & 0x03) << 5);
                this.updateCurrentRomBank();
            } else {
                // RAM Banking mode
                this.currentRamBank = value & 0x03;
            }
        } else if (this.mbcType === 3 || this.mbcType === 5) {
            // MBC3 or MBC5 RAM Banking
            this.currentRamBank = value & 0x03;
        }
    }
    
    // Update current ROM bank
    updateCurrentRomBank() {
        // Ensure the bank number is within range
        const bankNum = this.currentRomBank % this.romBanks.length;
        
        // Switch to the selected ROM bank
        for (let i = 0; i < 0x4000; i++) {
            this.rom[i + 0x4000] = this.romBanks[bankNum][i];
        }
    }
    
    // Update timers (called by the emulator)
    updateTimers(cycles) {
        // DIV register increases at 16384Hz (CPU clock / 256)
        this.divCycles += cycles;
        const divInc = Math.floor(this.divCycles / 256);
        this.divCycles %= 256;
        
        if (divInc > 0) {
            this.div = (this.div + divInc) & 0xFF;
        }
        
        // Check if timer is enabled
        if (this.tac & 0x04) {
            const timerFreqs = [1024, 16, 64, 256]; // Clock cycles per timer increment
            const freq = timerFreqs[this.tac & 0x03];
            
            this.timaCycles += cycles;
            while (this.timaCycles >= freq) {
                this.timaCycles -= freq;
                
                // Increment TIMA
                this.tima = (this.tima + 1) & 0xFF;
                
                // Check for overflow
                if (this.tima === 0) {
                    // TIMA overflowed, reset to TMA and request timer interrupt
                    this.tima = this.tma;
                    
                    // Request timer interrupt
                    this.io[0x0F] |= 0x04;
                }
            }
        }
    }
}