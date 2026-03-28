const fs = require("fs");
const path = require("path");

const log = {
    info: (...args) => console.log("[OSR]", ...args),
    warn: (...args) => console.warn("[OSR]", ...args),
    error: (...args) => console.error("[OSR]", ...args),
    debug: (...args) => console.debug("[OSR]", ...args)
};

let native;
try {
    native = require("../native/build/Release/openoxygen_native.node");
} catch (e) {
    log.warn("Native module not available");
}

class OSRPlayer {
    constructor() {
        this.recording = null;
        this.isPlaying = false;
        this.currentStep = 0;
    }
    
    loadRecording(filePath) {
        log.info(`Loading recording: ${filePath}`);
        const content = fs.readFileSync(filePath, "utf-8");
        this.recording = JSON.parse(content);
        log.info(`Loaded ${this.recording.steps.length} steps`);
        return this.recording;
    }
    
    getStatus() {
        return {
            isPlaying: this.isPlaying,
            currentStep: this.currentStep,
            totalSteps: this.recording?.steps.length || 0,
            progress: this.recording ? (this.currentStep / this.recording.steps.length) * 100 : 0
        };
    }
}

module.exports = { OSRPlayer };
