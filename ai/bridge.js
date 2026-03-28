/**
 * Python Bridge - Node.js Integration
 * 
 * Python AI 模块与 Node.js 的桥接
 */

const { spawn } = require('child_process');
const path = require('path');

class PythonBridge {
  constructor() {
    this.pythonProcess = null;
    this.requestQueue = [];
    this.responseHandlers = new Map();
    this.requestId = 0;
  }

  /**
   * Start Python process
   */
  start() {
    const pythonScript = path.join(__dirname, 'python_bridge.py');
    this.pythonProcess = spawn('python', [pythonScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.pythonProcess.stdout.on('data', (data) => {
      this._handleResponse(data.toString());
    });

    this.pythonProcess.stderr.on('data', (data) => {
      console.error('Python Error:', data.toString());
    });

    this.pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });
  }

  /**
   * Call Python function
   */
  call(module, functionName, args = {}) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      
      const request = {
        id: requestId,
        module,
        function: functionName,
        args
      };

      this.responseHandlers.set(requestId, { resolve, reject });
      
      this.pythonProcess.stdin.write(JSON.stringify(request) + '\n');

      // Timeout
      setTimeout(() => {
        if (this.responseHandlers.has(requestId)) {
          this.responseHandlers.delete(requestId);
          reject(new Error('Python call timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Handle Python response
   */
  _handleResponse(data) {
    try {
      const lines = data.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const response = JSON.parse(line);
        const handler = this.responseHandlers.get(response.id);
        
        if (handler) {
          this.responseHandlers.delete(response.id);
          
          if (response.error) {
            handler.reject(new Error(response.error));
          } else {
            handler.resolve(response.result);
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse Python response:', error);
    }
  }

  /**
   * OUV - Analyze screen
   */
  async ouvAnalyzeScreen(screenshotPath, instruction) {
    return this.call('ouv', 'analyze_screen', { screenshotPath, instruction });
  }

  /**
   * OUV - Predict action
   */
  async ouvPredictAction(elements, instruction) {
    return this.call('ouv', 'predict_action', { elements, instruction });
  }

  /**
   * Reflection - Make decision
   */
  async reflectionMakeDecision(decisionType, context, options) {
    return this.call('reflection', 'make_decision', { decisionType, context, options });
  }

  /**
   * Stop Python process
   */
  stop() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }
}

// Singleton
let bridge = null;

function getPythonBridge() {
  if (!bridge) {
    bridge = new PythonBridge();
    bridge.start();
  }
  return bridge;
}

module.exports = { PythonBridge, getPythonBridge };
