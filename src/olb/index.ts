/**
 * OpenOxygen - OLB Module Index (26w15aD Phase 7)
 *
 * OLB Acceleration Engine
 */

// Core Engine
export {
  SIMDArrayEngine,
  MemoryPoolManager,
  OLBCoreEngine,
  type SIMDVector,
  type SIMDDataType,
  type VectorDim,
  type PerformanceMetrics,
} from "./core.js";

// Default export
import { OLBCoreEngine } from "./core.js";

export const OLB = {
  Core: OLBCoreEngine,
};

export default OLB;
