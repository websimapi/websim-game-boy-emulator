// Utility functions for the Game Boy emulator

// Convert a number to hexadecimal string representation
function toHex(num, length = 2) {
    return num.toString(16).toUpperCase().padStart(length, '0');
}

// Create a notification that appears temporarily
function notify(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '1000';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => document.body.removeChild(notification), 500);
    }, duration);
}

// Read ROM from file
function readRomFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            const rom = new Uint8Array(arrayBuffer);
            resolve(rom);
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read the ROM file.'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Debugging helper to log CPU state
function logCpuState(cpu) {
    console.log(`A: ${toHex(cpu.registers.a)} F: ${toHex(cpu.registers.f)} BC: ${toHex(cpu.registers.b)}${toHex(cpu.registers.c)} DE: ${toHex(cpu.registers.d)}${toHex(cpu.registers.e)} HL: ${toHex(cpu.registers.h)}${toHex(cpu.registers.l)} SP: ${toHex(cpu.registers.sp, 4)} PC: ${toHex(cpu.registers.pc, 4)}`);
}

