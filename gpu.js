class GPU {
    constructor(memory) {
        this.memory = memory;
        this.canvas = document.getElementById('screen');
        this.ctx = this.canvas.getContext('2d');
        
        // GPU state
        this.mode = 0;
        this.modeClock = 0;
        this.line = 0;
        
        // Screen dimensions
        this.width = 160;
        this.height = 144;
        
        // Game Boy color palette (4 shades of green)
        this.colors = [
            [155, 188, 15, 255],   // Lightest
            [139, 172, 15, 255],   // Light
            [48, 98, 48, 255],     // Dark
            [15, 56, 15, 255]      // Darkest
        ];
        
        // Tile data
        this.tileData = new Uint8Array(384 * 16); // 384 tiles, 16 bytes per tile
        
        // Frame buffer (RGBA format)
        this.frameBuffer = new Uint8ClampedArray(this.width * this.height * 4);
        this.imageData = this.ctx.createImageData(this.width, this.height);
        
        // Clear screen
        this.clearScreen();
    }
    
    // Clear the screen
    clearScreen() {
        // Fill with the lightest green color
        for (let i = 0; i < this.frameBuffer.length; i += 4) {
            this.frameBuffer[i] = this.colors[0][0];     // R
            this.frameBuffer[i + 1] = this.colors[0][1]; // G
            this.frameBuffer[i + 2] = this.colors[0][2]; // B
            this.frameBuffer[i + 3] = this.colors[0][3]; // A
        }
        this.updateScreen();
    }
    
    // Update screen with current frameBuffer
    updateScreen() {
        this.imageData.data.set(this.frameBuffer);
        this.ctx.putImageData(this.imageData, 0, 0);
    }
    
    // Step the GPU by a number of cycles
    step(cycles) {
        this.modeClock += cycles;
        
        // Mode 0: H-Blank
        // Mode 1: V-Blank
        // Mode 2: Searching OAM
        // Mode 3: Transferring data to LCD controller
        
        switch (this.mode) {
            case 0: // H-Blank
                if (this.modeClock >= 204) {
                    this.modeClock = 0;
                    this.line++;
                    
                    if (this.line === 143) {
                        // End of visible screen, enter V-Blank
                        this.mode = 1;
                        this.updateScreen();
                    } else {
                        // Move to next line, start with OAM search
                        this.mode = 2;
                    }
                }
                break;
                
            case 1: // V-Blank
                if (this.modeClock >= 456) {
                    this.modeClock = 0;
                    this.line++;
                    
                    if (this.line > 153) {
                        // V-Blank finished, reset line and go to OAM search
                        this.mode = 2;
                        this.line = 0;
                    }
                }
                break;
                
            case 2: // OAM search
                if (this.modeClock >= 80) {
                    this.modeClock = 0;
                    this.mode = 3;
                }
                break;
                
            case 3: // Data transfer to LCD controller
                if (this.modeClock >= 172) {
                    this.modeClock = 0;
                    this.mode = 0;
                    
                    // Render the current scanline
                    this.renderScanline();
                }
                break;
        }
        
        // Update LCD controller status register (FF41)
        const stat = this.memory.readByte(0xFF41) & 0xFC;
        this.memory.writeByte(0xFF41, stat | this.mode);
        
        // Update current scanline register (FF44)
        this.memory.writeByte(0xFF44, this.line);
    }
    
    // Render a single scanline
    renderScanline() {
        // For simplicity, just render some test data
        // A full implementation would read from VRAM and render background, window, and sprites
        
        // Example: Just fill the current line with a color based on the line number
        const y = this.line;
        for (let x = 0; x < this.width; x++) {
            const index = (y * this.width + x) * 4;
            const colorIndex = Math.floor((x / this.width) * 4);
            
            this.frameBuffer[index] = this.colors[colorIndex % 4][0];     // R
            this.frameBuffer[index + 1] = this.colors[colorIndex % 4][1]; // G
            this.frameBuffer[index + 2] = this.colors[colorIndex % 4][2]; // B
            this.frameBuffer[index + 3] = this.colors[colorIndex % 4][3]; // A
        }
    }
    
    // Render Nintendo logo (for boot sequence)
    renderNintendoLogo() {
        // Nintendo logo tile data from boot ROM
        const logoData = [
            0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B, 0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D,
            0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E, 0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99,
            0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC, 0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E
        ];
        
        // Center the logo on screen
        const startX = 48;
        const startY = 40;
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 16; x++) {
                const tileIndex = y * 2 + (x >> 3);
                const tileX = x & 7;
                
                // Get the byte containing the pixel data
                const b1 = logoData[tileIndex * 2];
                const b2 = logoData[tileIndex * 2 + 1];
                
                // Get the bit corresponding to the pixel (big-endian)
                const mask = 0x80 >> tileX;
                const colorIndex = ((b1 & mask) ? 1 : 0) | ((b2 & mask) ? 2 : 0);
                
                // Draw the pixel to the frame buffer
                const pixelX = startX + x * 2;
                const pixelY = startY + y * 2;
                
                for (let py = 0; py < 2; py++) {
                    for (let px = 0; px < 2; px++) {
                        const index = ((pixelY + py) * this.width + (pixelX + px)) * 4;
                        this.frameBuffer[index] = this.colors[3 - colorIndex][0];     // R
                        this.frameBuffer[index + 1] = this.colors[3 - colorIndex][1]; // G
                        this.frameBuffer[index + 2] = this.colors[3 - colorIndex][2]; // B
                        this.frameBuffer[index + 3] = this.colors[3 - colorIndex][3]; // A
                    }
                }
            }
        }
        
        this.updateScreen();
    }
}

