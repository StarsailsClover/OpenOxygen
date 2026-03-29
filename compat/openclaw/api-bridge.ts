/**
 * OpenClaw API Bridge
 * 
 * OpenClaw API 兼容�?
 */

import { handleExecutionRequest } from '../../execution/unified/index.js';
import { createOrchestration, executeOrchestration } from '../../agent/orchestrator/index.js';

// OpenClaw API types
export interface OpenClawContext {
  instruction: string;
  mode?: string;
  options?: any;
}

export interface OpenClawResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

/**
 * OpenClaw execute API
 */
export async function openclawExecute(context: OpenClawContext): Promise<OpenClawResult> {
  // Bridge to OpenOxygen unified executor
  const result = await handleExecutionRequest({
    instruction: context.instruction,
    mode: context.mode || 'auto',
    ...context.options
  });
  
  return {
    success: result.success,
    output: result.output,
    error: result.error,
    duration: result.durationMs
  };
}

/**
 * OpenClaw orchestrate API
 */
export async function openclawOrchestrate(tasks: string[]): Promise<OpenClawResult> {
  // Bridge to OpenOxygen orchestrator
  const orch = createOrchestration({
    name: 'OpenClaw Orchestration',
    subtasks: tasks.map((t, i) => ({
      name: `Task ${i + 1}`,
      instruction: t,
      mode: 'auto'
    }))
  });
  
  const result = await executeOrchestration(orch.id);
  
  return {
    success: result.status === 'completed',
    output: JSON.stringify(result),
    duration: result.endTime - result.startTime
  };
}

/**
 * OpenClaw memory API
 */
export function openclawMemory(action: string, key: string, value?: any): any {
  const { getGlobalMemory } = require('../../memory/global/index.js');
  const memory = getGlobalMemory();
  
  switch (action) {
    case 'get':
      return memory.getPreference(key);
    case 'set':
      memory.setPreference(key, value);
      return true;
    case 'delete':
      memory.deletePreference(key);
      return true;
    default:
      return null;
  }
}

// Export
export default {
  execute: openclawExecute,
  orchestrate: openclawOrchestrate,
  memory: openclawMemory
};
