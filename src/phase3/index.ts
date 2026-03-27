/**
 * OpenOxygen - Phase 3 Module Index (26w15aD Phase 7)
 *
 * Phase 3: 自主规划、生产部署与完整生态
 */

// Autonomous Planning
export {
  AutonomousPlanningController,
  type Goal,
  type GoalType,
  type PlannedTask,
  type ExecutionPlan,
} from "./autonomous-planning.js";

// Production Deployment
export {
  ProductionDeploymentController,
  type DeploymentConfig,
  type DeploymentEnvironment,
  type PerformanceReport,
} from "./production-deployment.js";

// Default export
import { AutonomousPlanningController } from "./autonomous-planning.js";
import { ProductionDeploymentController } from "./production-deployment.js";

export const Phase3 = {
  AutonomousPlanning: AutonomousPlanningController,
  ProductionDeployment: ProductionDeploymentController,
};

export default Phase3;
