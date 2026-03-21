/**
 * OpenOxygen — OxygenBrowser Module (26w15aD Phase 4)
 *
 * 统一导出浏览器功能
 */

// Core browser
export {
  launchBrowser,
  navigate,
  executeScript,
  takeScreenshot,
  goBack,
  refresh,
  closeBrowser,
  getBrowser,
  listBrowsers,
  waitForElement,
  clickElement,
  inputText,
  getElementText,
  type BrowserState,
  type BrowserOptions,
  type PageInfo,
  type BrowserInstance,
} from "./core.js";

// CDP integration
export {
  connectCDP,
  enableDomains,
  navigateCDP,
  executeScriptCDP,
  queryElementCDP,
  clickElementCDP,
  takeScreenshotCDP,
  getMetricsCDP,
  disconnectCDP,
  type CDPClient,
} from "./cdp.js";

// OUV integration
export {
  OUVBrowserIntegration,
  type VisualElement,
} from "./ouv-integration.js";

// Default export
import * as core from "./core.js";
import * as cdp from "./cdp.js";
import { OUVBrowserIntegration } from "./ouv-integration.js";

export const Browser = {
  ...core,
  cdp,
  OUVBrowserIntegration,
};

export default Browser;
