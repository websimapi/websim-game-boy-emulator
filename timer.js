class Timer {
    constructor(memory) {
        this.memory = memory;
    }
    
    // Update timers with cycles elapsed
    update(cycles) {
        this.memory.updateTimers(cycles);
    }
}