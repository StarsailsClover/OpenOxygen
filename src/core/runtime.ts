/**
 * OpenOxygen - Runtime
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId } from "../utils/index.js";

const log = createSubsystemLogger("core/runtime");

export type RuntimeConfig = {
  name?: string;
  version?: string;
};

export type Runtime = {
  id: string;
  name: string;
  version: string;
  startTime: number;
};

export function createRuntime(config?: RuntimeConfig): Runtime {
  const runtime: Runtime = {
    id: generateId("runtime"),
    name: config?.name || "OpenOxygen",
    version: config?.version || "26w15aD",
    startTime: Date.now()
  };

  log.info(`Runtime created: ${runtime.name} v${runtime.version}`);
  return runtime;
}

