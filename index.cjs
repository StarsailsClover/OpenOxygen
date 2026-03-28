const { TaskExecutionEngine } = require("./src/llm/task-engine.cjs");

const DEFAULT_CONFIG = {
    ollama: {
        autoStart: true,
        autoPull: true,
        defaultModel: "qwen3:4b"
    },
    enableBrowser: true,
    enableUIA: true,
    enableNative: true
};

class OpenOxygen {
    constructor(config = {}) {
        this.config = Object.assign({}, DEFAULT_CONFIG, config);
        this.engine = new TaskExecutionEngine(this.config);
    }
    
    async start() {
        console.log("OpenOxygen starting...");
        await this.engine.initialize();
        console.log("OpenOxygen started");
        return true;
    }
    
    async execute(request) {
        return await this.engine.executeRequest(request);
    }
}

module.exports = { OpenOxygen };

if (require.main === module) {
    const app = new OpenOxygen();
    app.start().then(() => {
        console.log("Ready");
    }).catch(console.error);
}
