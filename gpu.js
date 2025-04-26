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
        this.defaultPalette = [
            [155, 188, 15, 255],   // Lightest
            [139, 172, 15, 255],   // Light
            [48, 98, 48, 255],     // Dark
            [15, 56, 15, 255]      // Darkest
        ];
        
        // Background palette
        this.bgPalette = this.clonePalette(this.defaultPalette);
        
        // Sprite palettes
        this.spritePalette0 = this.clonePalette(this.defaultPalette);
        this.spritePalette1 = this.clonePalette(this.defaultPalette);
        
        // GPU control registers
        this.lcdc = 0x91; // LCD Control
        this.stat = 0;    // LCD Status
        this.scy = 0;     // Scroll Y
        this.scx = 0;     // Scroll X
        this.ly = 0;      // LCD Y-Coordinate (current line)
        this.lyc = 0;     // LY Compare
        this.wy = 0;      // Window Y position
        this.wx = 0;      // Window X position minus 7
        this.bgp = 0xFC;  // BG Palette Data
        this.obp0 = 0xFF; // Object Palette 0 Data
        this.obp1 = 0xFF; // Object Palette 1 Data
        
        // Frame buffer (RGBA format)
        this.frameBuffer = new Uint8ClampedArray(this.width * this.height * 4);
        this.imageData = this.ctx.createImageData(this.width, this.height);
        
        // Scanline buffer
        this.scanlineBuffer = new Uint8Array(this.width);
        
        // Magnify mode
        this.magnifyMode = false;
        this.magnifyCanvas = document.getElementById('magnify-canvas');
        this.magnifyCtx = this.magnifyCanvas.getContext('2d');
        this.magnifyOverlay = document.getElementById('magnify-overlay');
        this.customCursor = document.getElementById('custom-cursor');
        this.screenWrapper = document.querySelector('.screen-wrapper');
        this.magnifyZoom = 8;  // Magnification level
        this.magnifySize = 10; // Size of magnification area in pixels
        this.currentColor = [155, 188, 15, 255]; // Default color
        
        // Initialize magnify mode
        this.initMagnifyMode();
        
        // Clear screen
        this.clearScreen();
        
        // Update palette data
        this.updateBGPalette();
    }
    
    // Initialize magnify mode
    initMagnifyMode() {
        // Handle mouse movement over the screen
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.magnifyMode) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.width / rect.width;
            const scaleY = this.height / rect.height;
            
            // Calculate pixel position on the original screen
            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);
            
            // Update magnify canvas position
            this.magnifyCanvas.style.left = (e.clientX - rect.left - 40) + 'px';
            this.magnifyCanvas.style.top = (e.clientY - rect.top - 40) + 'px';
            
            // Update cursor position
            this.customCursor.style.left = (e.clientX - rect.left) + 'px';
            this.customCursor.style.top = (e.clientY - rect.top) + 'px';
            
            // Get the color of the pixel under the cursor
            const pixelIndex = (y * this.width + x) * 4;
            if (pixelIndex >= 0 && pixelIndex < this.frameBuffer.length) {
                this.currentColor = [
                    this.frameBuffer[pixelIndex],
                    this.frameBuffer[pixelIndex + 1],
                    this.frameBuffer[pixelIndex + 2],
                    this.frameBuffer[pixelIndex + 3]
                ];
                
                // Update cursor color
                this.customCursor.style.backgroundColor = `rgba(${this.currentColor[0]}, ${this.currentColor[1]}, ${this.currentColor[2]}, ${this.currentColor[3] / 255})`;
            }
            
            // Render the magnified view
            this.renderMagnifiedView(x, y);
        });
        
        // Toggle magnify mode with M key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                this.toggleMagnifyMode();
            }
        });
    }
    
    // Toggle magnify mode
    toggleMagnifyMode() {
        this.magnifyMode = !this.magnifyMode;
        
        if (this.magnifyMode) {
            this.magnifyOverlay.classList.add('active');
            this.screenWrapper.classList.add('magnify-mode');
        } else {
            this.magnifyOverlay.classList.remove('active');
            this.screenWrapper.classList.remove('magnify-mode');
        }
        
        notify(`Magnify mode ${this.magnifyMode ? 'enabled' : 'disabled'}`);
    }
    
    // Render magnified view
    renderMagnifiedView(centerX, centerY) {
        // Clear magnify canvas
        this.magnifyCtx.clearRect(0, 0, this.magnifyCanvas.width, this.magnifyCanvas.height);
        
        // Calculate the area to magnify
        const startX = Math.max(0, centerX - this.magnifySize / 2);
        const startY = Math.max(0, centerY - this.magnifySize / 2);
        const endX = Math.min(this.width, centerX + this.magnifySize / 2);
        const endY = Math.min(this.height, centerY + this.magnifySize / 2);
        
        // Draw each pixel magnified
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const pixelIndex = (y * this.width + x) * 4;
                
                const r = this.frameBuffer[pixelIndex];
                const g = this.frameBuffer[pixelIndex + 1];
                const b = this.frameBuffer[pixelIndex + 2];
                const a = this.frameBuffer[pixelIndex + 3];
                
                this.magnifyCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                this.magnifyCtx.fillRect(
                    (x - startX) * this.magnifyZoom,
                    (y - startY) * this.magnifyZoom,
                    this.magnifyZoom,
                    this.magnifyZoom
                );
            }
        }
    }
    
    // Clone a palette
    clonePalette(palette) {
        return palette.map(color => [...color]);
    }
    
    // Clear the screen
    clearScreen() {
        // Fill with the lightest green color
        for (let i = 0; i < this.frameBuffer.length; i += 4) {
            this.frameBuffer[i] = this.defaultPalette[0][0];     // R
            this.frameBuffer[i + 1] = this.defaultPalette[0][1]; // G
            this.frameBuffer[i + 2] = this.defaultPalette[0][2]; // B
            this.frameBuffer[i + 3] = this.defaultPalette[0][3]; // A
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
        // Update GPU registers from memory
        this.updateRegisters();
        
        // Check if LCD is enabled
        if (!(this.lcdc & 0x80)) {
            // LCD is off
            this.mode = 0;
            this.line = 0;
            this.modeClock = 0;
            this.updateLCDStatus();
            return;
        }
        
        this.modeClock += cycles;
        
        switch (this.mode) {
            case 0: // H-Blank
                if (this.modeClock >= 204) {
                    this.modeClock = 0;
                    this.line++;
                    
                    if (this.line === 143) {
                        // End of visible screen, enter V-Blank
                        this.mode = 1;
                        this.updateScreen();
                        
                        // Request V-Blank interrupt
                        this.memory.io[0x0F] |= 0x01;
                        
                        // Check if STAT interrupt should be triggered for V-Blank
                        if (this.stat & 0x10) {
                            this.memory.io[0x0F] |= 0x02;
                        }
                    } else {
                        // Move to next line, start with OAM search
                        this.mode = 2;
                        
                        // Check if STAT interrupt should be triggered for OAM
                        if (this.stat & 0x20) {
                            this.memory.io[0x0F] |= 0x02;
                        }
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
                        
                        // Check if STAT interrupt should be triggered for OAM
                        if (this.stat & 0x20) {
                            this.memory.io[0x0F] |= 0x02;
                        }
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
                    
                    // Check if STAT interrupt should be triggered for H-Blank
                    if (this.stat & 0x08) {
                        this.memory.io[0x0F] |= 0x02;
                    }
                }
                break;
        }
        
        // Update LCD status register
        this.updateLCDStatus();
    }
    
    // Update LCD status register (0xFF41)
    updateLCDStatus() {
        // Update coincidence flag
        if (this.line === this.lyc) {
            this.stat |= 0x04;
            
            // Trigger STAT interrupt if enabled
            if (this.stat & 0x40) {
                this.memory.io[0x0F] |= 0x02;
            }
        } else {
            this.stat &= ~0x04;
        }
        
        // Update mode flags
        this.stat = (this.stat & 0xFC) | this.mode;
        
        // Write back to memory
        this.memory.io[0x41] = this.stat;
        
        // Update current LY
        this.memory.io[0x44] = this.line;
    }
    
    // Update GPU registers from memory
    updateRegisters() {
        this.lcdc = this.memory.io[0x40];
        this.stat = this.memory.io[0x41];
        this.scy = this.memory.io[0x42];
        this.scx = this.memory.io[0x43];
        this.ly = this.memory.io[0x44];
        this.lyc = this.memory.io[0x45];
        this.wy = this.memory.io[0x4A];
        this.wx = this.memory.io[0x4B];
        
        // Check if palette data has changed
        if (this.bgp !== this.memory.io[0x47]) {
            this.bgp = this.memory.io[0x47];
            this.updateBGPalette();
        }
        
        if (this.obp0 !== this.memory.io[0x48]) {
            this.obp0 = this.memory.io[0x48];
            this.updateSpritePalette0();
        }
        
        if (this.obp1 !== this.memory.io[0x49]) {
            this.obp1 = this.memory.io[0x49];
            this.updateSpritePalette1();
        }
    }
    
    // Update background palette from BGP register
    updateBGPalette() {
        for (let i = 0; i < 4; i++) {
            const colorIdx = (this.bgp >> (i * 2)) & 0x03;
            this.bgPalette[i] = [...this.defaultPalette[colorIdx]];
        }
    }
    
    // Update sprite palette 0 from OBP0 register
    updateSpritePalette0() {
        for (let i = 0; i < 4; i++) {
            const colorIdx = (this.obp0 >> (i * 2)) & 0x03;
            if (i === 0) {
                // Color 0 is transparent for sprites
                this.spritePalette0[i] = [0, 0, 0, 0];
            } else {
                this.spritePalette0[i] = [...this.defaultPalette[colorIdx]];
            }
        }
    }
    
    // Update sprite palette 1 from OBP1 register
    updateSpritePalette1() {
        for (let i = 0; i < 4; i++) {
            const colorIdx = (this.obp1 >> (i * 2)) & 0x03;
            if (i === 0) {
                // Color 0 is transparent for sprites
                this.spritePalette1[i] = [0, 0, 0, 0];
            } else {
                this.spritePalette1[i] = [...this.defaultPalette[colorIdx]];
            }
        }
    }
    
    // Render a single scanline
    renderScanline() {
        // Clear scanline buffer
        this.scanlineBuffer.fill(0);
        
        // Render background if enabled
        if (this.lcdc & 0x01) {
            this.renderBackground();
        }
        
        // Render window if enabled
        if ((this.lcdc & 0x20) && this.wx <= 166 && this.line >= this.wy) {
            this.renderWindow();
        }
        
        // Render sprites if enabled
        if (this.lcdc & 0x02) {
            this.renderSprites();
        }
        
        // Copy scanline buffer to framebuffer
        const y = this.line;
        for (let x = 0; x < this.width; x++) {
            const pixelIndex = (y * this.width + x) * 4;
            const colorIndex = this.scanlineBuffer[x];
            
            this.frameBuffer[pixelIndex] = this.bgPalette[colorIndex][0];     // R
            this.frameBuffer[pixelIndex + 1] = this.bgPalette[colorIndex][1]; // G
            this.frameBuffer[pixelIndex + 2] = this.bgPalette[colorIndex][2]; // B
            this.frameBuffer[pixelIndex + 3] = this.bgPalette[colorIndex][3]; // A
        }
    }
    
    // Render background for current scanline
    renderBackground() {
        const y = this.line;
        
        // Get tile map address
        const tileMapAddress = (this.lcdc & 0x08) ? 0x9C00 : 0x9800;
        
        // Get tile data address
        const tileDataAddress = (this.lcdc & 0x10) ? 0x8000 : 0x8800;
        const unsignedTileIndex = (this.lcdc & 0x10) ? true : false;
        
        // Calculate y-position in the tile map with wrapping (256x256 pixels)
        const yPos = (y + this.scy) & 0xFF;
        const tileRow = Math.floor(yPos / 8);
        
        // Calculate which row of pixels of the tiles to use
        const tileY = yPos % 8;
        
        // Render the scanline
        for (let x = 0; x < this.width; x++) {
            // Calculate x-position in the tile map with wrapping
            const xPos = (x + this.scx) & 0xFF;
            const tileCol = Math.floor(xPos / 8);
            
            // Calculate which column of pixels of the tiles to use
            const tileX = xPos % 8;
            
            // Get the tile index from the tile map
            const tileMapOffset = tileRow * 32 + tileCol;
            const tileIndex = this.memory.readByte(tileMapAddress + tileMapOffset);
            
            // Get the tile data address
            let tileAddress;
            if (unsignedTileIndex) {
                tileAddress = tileDataAddress + tileIndex * 16;
            } else {
                tileAddress = tileDataAddress + ((tileIndex << 24) >> 24) * 16;
            }
            
            // Get the pixel data for this tile row
            const pixelDataLow = this.memory.readByte(tileAddress + tileY * 2);
            const pixelDataHigh = this.memory.readByte(tileAddress + tileY * 2 + 1);
            
            // Get the pixel color (bit 7-x for pixel x)
            const pixelBit = 7 - tileX;
            const pixelColorLow = (pixelDataLow >> pixelBit) & 0x01;
            const pixelColorHigh = (pixelDataHigh >> pixelBit) & 0x01;
            const pixelColor = (pixelColorHigh << 1) | pixelColorLow;
            
            // Set the pixel in the scanline buffer
            this.scanlineBuffer[x] = pixelColor;
        }
    }
    
    // Render window for current scanline
    renderWindow() {
        const y = this.line;
        
        // Only render if current line is within window area
        if (y < this.wy) return;
        
        // Get window tile map address
        const tileMapAddress = (this.lcdc & 0x40) ? 0x9C00 : 0x9800;
        
        // Get tile data address
        const tileDataAddress = (this.lcdc & 0x10) ? 0x8000 : 0x8800;
        const unsignedTileIndex = (this.lcdc & 0x10) ? true : false;
        
        // Calculate y-position in the window
        const yPos = y - this.wy;
        const tileRow = Math.floor(yPos / 8);
        
        // Calculate which row of pixels of the tiles to use
        const tileY = yPos % 8;
        
        // Window X position is offset by 7
        const windowX = this.wx - 7;
        
        // Render the window portion of the scanline
        for (let x = 0; x < this.width; x++) {
            // Only render if current pixel is within window area
            if (x < windowX) continue;
            
            // Calculate x-position in the window
            const xPos = x - windowX;
            const tileCol = Math.floor(xPos / 8);
            
            // Calculate which column of pixels of the tiles to use
            const tileX = xPos % 8;
            
            // Get the tile index from the tile map
            const tileMapOffset = tileRow * 32 + tileCol;
            const tileIndex = this.memory.readByte(tileMapAddress + tileMapOffset);
            
            // Get the tile data address
            let tileAddress;
            if (unsignedTileIndex) {
                tileAddress = tileDataAddress + tileIndex * 16;
            } else {
                tileAddress = tileDataAddress + ((tileIndex << 24) >> 24) * 16;
            }
            
            // Get the pixel data for this tile row
            const pixelDataLow = this.memory.readByte(tileAddress + tileY * 2);
            const pixelDataHigh = this.memory.readByte(tileAddress + tileY * 2 + 1);
            
            // Get the pixel color (bit 7-x for pixel x)
            const pixelBit = 7 - tileX;
            const pixelColorLow = (pixelDataLow >> pixelBit) & 0x01;
            const pixelColorHigh = (pixelDataHigh >> pixelBit) & 0x01;
            const pixelColor = (pixelColorHigh << 1) | pixelColorLow;
            
            // Set the pixel in the scanline buffer
            this.scanlineBuffer[x] = pixelColor;
        }
    }
    
    // Render sprites for current scanline
    renderSprites() {
        const y = this.line;
        
        // Determine sprite height (8x8 or 8x16)
        const spriteHeight = (this.lcdc & 0x04) ? 16 : 8;
        
        // Keep track of sprites to render (max 10 per scanline)
        let spritesToRender = [];
        
        // Check all 40 sprites in OAM
        for (let i = 0; i < 40; i++) {
            const spriteAddress = 0xFE00 + i * 4;
            
            const spriteY = this.memory.readByte(spriteAddress) - 16;
            const spriteX = this.memory.readByte(spriteAddress + 1) - 8;
            const tileIndex = this.memory.readByte(spriteAddress + 2);
            const attributes = this.memory.readByte(spriteAddress + 3);
            
            // Check if sprite is on this scanline
            if (y >= spriteY && y < spriteY + spriteHeight) {
                spritesToRender.push({
                    x: spriteX,
                    y: spriteY,
                    tileIndex: tileIndex,
                    attributes: attributes,
                    oamIndex: i
                });
                
                // Max 10 sprites per scanline
                if (spritesToRender.length >= 10) break;
            }
        }
        
        // Sort sprites by x-coordinate (lower has priority)
        spritesToRender.sort((a, b) => {
            // If x-coordinates are equal, lower OAM index has priority
            if (a.x === b.x) {
                return a.oamIndex - b.oamIndex;
            }
            return a.x - b.x;
        });
        
        // Render sprites in priority order (reverse to handle overlapping correctly)
        for (let i = spritesToRender.length - 1; i >= 0; i--) {
            const sprite = spritesToRender[i];
            
            // Calculate which row of the sprite we're rendering
            let tileY = y - sprite.y;
            
            // Handle Y-flip
            if (sprite.attributes & 0x40) {
                tileY = spriteHeight - 1 - tileY;
            }
            
            // For 8x16 sprites, the tile index is always even and we need to select top or bottom half
            let tileIndex = sprite.tileIndex;
            if (spriteHeight === 16) {
                tileIndex &= 0xFE;
                if (tileY >= 8) {
                    tileIndex++;
                    tileY -= 8;
                }
            }
            
            // Get the pixel data for this tile row
            const tileAddress = 0x8000 + tileIndex * 16 + tileY * 2;
            const pixelDataLow = this.memory.readByte(tileAddress);
            const pixelDataHigh = this.memory.readByte(tileAddress + 1);
            
            // Determine which palette to use
            const palette = (sprite.attributes & 0x10) ? this.spritePalette1 : this.spritePalette0;
            
            // Render the sprite
            for (let x = 0; x < 8; x++) {
                // Skip if sprite is off-screen
                if (sprite.x + x < 0 || sprite.x + x >= this.width) continue;
                
                // Get pixel position
                let pixelBit = 7 - x;
                
                // Handle X-flip
                if (sprite.attributes & 0x20) {
                    pixelBit = x;
                }
                
                // Get pixel color
                const pixelColorLow = (pixelDataLow >> pixelBit) & 0x01;
                const pixelColorHigh = (pixelDataHigh >> pixelBit) & 0x01;
                const pixelColor = (pixelColorHigh << 1) | pixelColorLow;
                
                // Skip transparent pixels
                if (pixelColor === 0) continue;
                
                // Check sprite-to-BG priority
                if ((sprite.attributes & 0x80) && this.scanlineBuffer[sprite.x + x] !== 0) {
                    // BG has priority over sprite
                    continue;
                }
                
                // Set the pixel in the scanline buffer (with sprite palette)
                const pixelIndex = (y * this.width + (sprite.x + x)) * 4;
                
                this.frameBuffer[pixelIndex] = palette[pixelColor][0];     // R
                this.frameBuffer[pixelIndex + 1] = palette[pixelColor][1]; // G
                this.frameBuffer[pixelIndex + 2] = palette[pixelColor][2]; // B
                this.frameBuffer[pixelIndex + 3] = palette[pixelColor][3]; // A
            }
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
                        this.frameBuffer[index] = this.defaultPalette[3 - colorIndex][0];     // R
                        this.frameBuffer[index + 1] = this.defaultPalette[3 - colorIndex][1]; // G
                        this.frameBuffer[index + 2] = this.defaultPalette[3 - colorIndex][2]; // B
                        this.frameBuffer[index + 3] = this.defaultPalette[3 - colorIndex][3]; // A
                    }
                }
            }
        }
        
        this.updateScreen();
    }
}