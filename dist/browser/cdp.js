/**
 * Browser CDP - Fix
 */
export async function connectCDP(port) { return { send: () => {}, on: () => {}, close: () => {} }; }
export async function enableDomains(client) {}
export async function navigateCDP(client, url) {}
export async function executeScriptCDP(client, script) { return null; }
export async function queryElementCDP(client, selector) { return null; }
export async function clickElementCDP(client, selector) {}
export async function takeScreenshotCDP(client) { return ""; }
export async function getMetricsCDP(client) { return {}; }
export function disconnectCDP() {}
