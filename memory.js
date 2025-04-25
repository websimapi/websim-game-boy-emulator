class Memory {
    constructor() {
        // Initialize memory regions
        this.rom = new Uint8Array(0x8000);         // 0x0000-0x7FFF: Cartridge ROM
        this.vram = new Uint8Array(0x2000);        // 0x8000-0x9FFF: Video RAM
        this.eram = new Uint8Array(0x2000);        // 0xA000-0xBFFF: External RAM (Cartridge)
        this.wram = new Uint8Array(0x2000);        // 0xC000-0xDFFF: Work RAM
        this.oam = new Uint8Array(0x100);          // 0xFE00-0xFEFF: Sprite Attribute Table (OAM)
        this.io = new Uint8Array(0x80);            // 0xFF00-0xFF7F: I/O Registers
        this.hram = new Uint8Array(0x80);          // 0xFF80-0xFFFE: High RAM
        this.ie = 0;                               // 0xFFFF: Interrupt Enable Register
        
        // ROM Banking
        this.currentRomBank = 1;
        this.romBanking = false;
        
        // Reset boot ROM flag
        this.bootRomActive = true;
        
        // Define simple boot ROM (displays the Nintendo logo)
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
    }
    
    // Load ROM data
    loadRom(romData) {
        // Copy ROM data to memory
        for (let i = 0; i < romData.length && i < this.rom.length; i++) {
            this.rom[i] = romData[i];
        }
        
        // Extract ROM information
        const cartridgeType = this.rom[0x0147];
        const romSize = this.rom[0x0148];
        const ramSize = this.rom[0x0149];
        
        console.log(`Cartridge Type: ${toHex(cartridgeType)}`);
        console.log(`ROM Size: ${toHex(romSize)}`);
        console.log(`RAM Size: ${toHex(ramSize)}`);
        
        // Check for ROM banking
        this.romBanking = cartridgeType !== 0;
        
        // Display ROM title
        let title = '';
        for (let i = 0x0134; i < 0x0143; i++) {
            if (this.rom[i] === 0) break;
            title += String.fromCharCode(this.rom[i]);
        }
        console.log(`ROM Title: ${title}`);
        notify(`Loaded ROM: ${title}`);
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
            const bankOffset = (this.currentRomBank - 1) * 0x4000;
            return this.rom[bankOffset + (address - 0x4000)];
        } else if (address < 0xA000) {
            // VRAM
            return this.vram[address - 0x8000];
        } else if (address < 0xC000) {
            // External RAM
            return this.eram[address - 0xA000];
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
            return this.io[address - 0xFF00];
        } else if (address < 0xFFFF) {
            // High RAM
            return this.hram[address - 0xFF80];
        } else {
            // Interrupt Enable Register
            return this.ie;
        }
    }
    
    // Write a byte to memory
    writeByte(address, value) {
        // ROM Bank 0
        if (address < 0x8000) {
            // ROM is read-only, but some writes may control banking
            if (this.romBanking) {
                this.handleBanking(address, value);
            }
            return;
        } else if (address < 0xA000) {
            // VRAM
            this.vram[address - 0x8000] = value;
        } else if (address < 0xC000) {
            // External RAM
            this.eram[address - 0xA000] = value;
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
            this.io[address - 0xFF00] = value;
        } else if (address < 0xFFFF) {
            // High RAM
            this.hram[address - 0xFF80] = value;
        } else {
            // Interrupt Enable Register
            this.ie = value;
        }
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
    
    // Handle ROM/RAM banking (simplified implementation)
    handleBanking(address, value) {
        if (address < 0x2000) {
            // RAM enable
            console.log(`RAM enable: ${value}`);
        } else if (address < 0x4000) {
            // ROM bank number (lower 5 bits)
            this.currentRomBank = value & 0x1F;
            if (this.currentRomBank === 0) this.currentRomBank = 1;
            console.log(`Switched to ROM bank: ${this.currentRomBank}`);
        } else if (address < 0x6000) {
            // ROM/RAM bank number (upper bits)
            console.log(`ROM/RAM bank number: ${value}`);
        } else {
            // ROM/RAM mode select
            console.log(`ROM/RAM mode select: ${value}`);
        }
    }
}

