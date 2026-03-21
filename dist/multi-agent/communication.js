/**
 * Multi-Agent Communication - Fix
 */
const handlers = new Map();

export function sendMessage(from, to, type, payload) {
  return { id: "msg-" + Date.now(), type, from, to, timestamp: Date.now(), payload };
}
export function broadcastMessage(from, type, payload) {
  return sendMessage(from, undefined, type, payload);
}
export function onMessage(agentId, handler) {
  const list = handlers.get(agentId) || [];
  list.push(handler);
  handlers.set(agentId, list);
}
export function offMessage(agentId, handler) {
  const list = handlers.get(agentId) || [];
  const idx = list.indexOf(handler);
  if (idx > -1) list.splice(idx, 1);
}
export function requestTask(from, to, instruction, options) {
  return sendMessage(from, to, "task", { instruction, options });
}
export function sendResult(from, to, result) {
  return sendMessage(from, to, "result", result);
}
export function sendError(from, to, error) {
  return sendMessage(from, to, "error", { error });
}
export function sendHeartbeat(agentId) {
  return broadcastMessage(agentId, "heartbeat", { timestamp: Date.now() });
}
