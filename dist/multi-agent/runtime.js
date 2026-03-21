/**
 * Multi-Agent Runtime - Fix
 */
const agents = new Map();
const assignments = new Map();

export function registerAgent(agent) {
  const id = "agent-" + Date.now();
  agents.set(id, { ...agent, id, status: "idle", lastHeartbeat: Date.now() });
  return agents.get(id);
}
export function unregisterAgent(agentId) { return agents.delete(agentId); }
export function getAgent(agentId) { return agents.get(agentId); }
export function listAgents(filter) {
  let result = Array.from(agents.values());
  if (filter?.type) result = result.filter(a => a.type === filter.type);
  if (filter?.status) result = result.filter(a => a.status === filter.status);
  return result;
}
export function findBestAgent(requiredCapabilities) {
  return listAgents({ status: "idle" }).find(a => requiredCapabilities.every(c => a.capabilities.includes(c))) || null;
}
export async function delegateTask(instruction, options) {
  const id = "task-" + Date.now();
  const assignment = { id, instruction, status: "assigned", startTime: Date.now() };
  assignments.set(id, assignment);
  return assignment;
}
export function getAssignment(assignmentId) { return assignments.get(assignmentId); }
export async function waitForTask(assignmentId, timeoutMs) {
  return getAssignment(assignmentId) || { status: "completed" };
}
export function saveCheckpoint(taskId, data) {}
export function loadCheckpoint(taskId) { return null; }
export async function resumeTask(taskId, instruction) { return delegateTask(instruction); }
export function cancelTask(assignmentId) { return true; }
export function getTaskStatistics() { return { total: 0, completed: 0, failed: 0, pending: 0, running: 0 }; }
