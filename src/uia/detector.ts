/**
 * OpenOxygen - UIA Element Detector
 *
<<<<<<< HEAD
 * 基于 Windows UIA (UI Automation) 的元素定�?
=======
 * 基于 Windows UI Automation (UIA) 的元素定位系统
 * 提供原生 Windows GUI 元素的检测和操作能力
>>>>>>> dev
 */

import { createSubsystemLogger } from "../logging/index.js";
import type { ToolResult } from "../types/index.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { sleep } from "../utils/index.js";

const execAsync = promisify(exec);
const log = createSubsystemLogger("uia/detector");

// ============================================================================
// Types
// ============================================================================

export interface UIAElement {
  automationId: string;
  name: string;
  controlType: string;
  className: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center: {
    x: number;
    y: number;
  };
  isEnabled: boolean;
  isOffscreen: boolean;
  hasKeyboardFocus: boolean;
  processId?: number;
  windowHandle?: number;
}

export interface UIASelector {
  type: "name" | "automationId" | "className" | "controlType" | "partialName";
  value: string;
  scope?: "children" | "descendants" | "subtree";
}

export interface UIAWindow {
  handle: number;
  title: string;
  className: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isEnabled: boolean;
  isVisible: boolean;
  processId: number;
}

// ============================================================================
// Element Detection
// ============================================================================

export async function findElement(
  selector: UIASelector,
  windowHandle?: number,
): Promise<ToolResult> {
  log.info(`Finding element by ${selector.type}: ${selector.value}`);

  try {
    const element = await findElementViaPowerShell(selector, windowHandle);
    
    if (!element) {
      return {
        success: false,
        error: `Element not found: ${selector.type}=${selector.value}`,
      };
    }

    return {
      success: true,
      data: element,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to find element: ${error}`,
    };
  }
}

export async function findElements(
  selector: UIASelector,
  windowHandle?: number,
): Promise<ToolResult> {
  log.info(`Finding elements by ${selector.type}: ${selector.value}`);

  try {
    const elements = await findElementsViaPowerShell(selector, windowHandle);
    
    return {
      success: true,
      data: { elements },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to find elements: ${error}`,
    };
  }
}

async function findElementViaPowerShell(
  selector: UIASelector,
  windowHandle?: number,
): Promise<UIAElement | null> {
  const scope = selector.scope || "descendants";
  
  let condition: string;
  switch (selector.type) {
    case "name":
      condition = `$_.Name -eq "${selector.value}"`;
      break;
    case "automationId":
      condition = `$_.AutomationId -eq "${selector.value}"`;
      break;
    case "className":
      condition = `$_.ClassName -eq "${selector.value}"`;
      break;
    case "controlType":
      condition = `$_.ControlType.ProgrammaticName -eq "${selector.value}"`;
      break;
    case "partialName":
      condition = `$_.Name -like "*${selector.value}*"`;
      break;
    default:
      condition = `$_.Name -eq "${selector.value}"`;
  }

  const script = `
    Add-Type -AssemblyName UIAutomationClient
<<<<<<< HEAD
    
    ${windowHandle 
      ? `$element = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new(${windowHandle}))`
      : `$element = [System.Windows.Automation.AutomationElement]::RootElement`
    }
<<<<<<< HEAD

    return false;
  }

  /**
   * 输入文本到元�?
   */
  async typeText(element: UIAElement, text: string): Promise<boolean> {
    log.info(`Typing text to element: ${element.name}`);

    // 先点击元素获取焦�?
    await this.clickElement(element);

    if (native?.typeText) {
      native.typeText(text);
      return true;
    }

    return false;
  }

  /**
   * 滚动到元�?
   */
  async scrollToElement(element: UIAElement): Promise<boolean> {
    log.info(`Scrolling to element: ${element.name}`);
    // TODO: 实现滚动逻辑
    return true;
  }

  /**
   * 等待元素出现
   */
  async waitForElement(
    selector: ElementSelector,
    timeoutMs: number = 5000,
  ): Promise<UIAElement | null> {
    log.info(
      `Waiting for element: ${selector.value} (timeout: ${timeoutMs}ms)`,
    );

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const element = await this.findElement(selector);
      if (element) {
        return element;
=======
    
    $found = ${conditionScript}
    
    if ($found) {
      $rect = $found.Current.BoundingRectangle
      $props = @{
        automationId = $found.Current.AutomationId
        name = $found.Current.Name
        controlType = $found.Current.ControlType.ProgrammaticName
        className = $found.Current.ClassName
=======
    $desktop = [System.Windows.Automation.AutomationElement]::RootElement
    ${windowHandle ? `$window = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new(${windowHandle})); $scope = $window` : `$scope = $desktop`}
    $condition = [System.Windows.Automation.Condition]::TrueCondition
    $elements = $scope.FindAll([System.Windows.Automation.TreeScope]::${scope}, $condition)
    $element = $elements | Where-Object { ${condition} } | Select-Object -First 1
    if ($element) {
      $rect = $element.Current.BoundingRectangle
      @{
        automationId = $element.Current.AutomationId
        name = $element.Current.Name
        controlType = $element.Current.ControlType.ProgrammaticName
        className = $element.Current.ClassName
>>>>>>> dev
        bounds = @{
          x = $rect.X
          y = $rect.Y
          width = $rect.Width
          height = $rect.Height
        }
        center = @{
          x = $rect.X + $rect.Width / 2
          y = $rect.Y + $rect.Height / 2
        }
<<<<<<< HEAD
        isEnabled = $found.Current.IsEnabled
        isOffscreen = $found.Current.IsOffscreen
        hasKeyboardFocus = $found.Current.HasKeyboardFocus
        processId = $found.Current.ProcessId
>>>>>>> dev
      }
      $props | ConvertTo-Json -Compress
    } else {
      Write-Output "null"
=======
        isEnabled = $element.Current.IsEnabled
        isOffscreen = $element.Current.IsOffscreen
        hasKeyboardFocus = $element.Current.HasKeyboardFocus
        processId = $element.Current.ProcessId
      } | ConvertTo-Json -Compress
>>>>>>> dev
    }
  `;

  try {
    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 10000 },
    );

    if (!stdout.trim()) {
      return null;
    }

    const data = JSON.parse(stdout.trim());
    return {
      automationId: data.automationId || "",
      name: data.name || "",
      controlType: data.controlType || "",
      className: data.className || "",
      bounds: data.bounds || { x: 0, y: 0, width: 0, height: 0 },
      center: data.center || { x: 0, y: 0 },
      isEnabled: data.isEnabled ?? true,
      isOffscreen: data.isOffscreen ?? false,
      hasKeyboardFocus: data.hasKeyboardFocus ?? false,
      processId: data.processId,
    };
  } catch (error) {
    log.error(`PowerShell execution failed: ${error}`);
    return null;
  }
}

async function findElementsViaPowerShell(
  selector: UIASelector,
  windowHandle?: number,
): Promise<UIAElement[]> {
  const scope = selector.scope || "descendants";
  
  let condition: string;
  switch (selector.type) {
    case "name":
      condition = `$_.Name -eq "${selector.value}"`;
      break;
    case "automationId":
      condition = `$_.AutomationId -eq "${selector.value}"`;
      break;
    case "className":
      condition = `$_.ClassName -eq "${selector.value}"`;
      break;
    case "controlType":
      condition = `$_.ControlType.ProgrammaticName -eq "${selector.value}"`;
      break;
    case "partialName":
      condition = `$_.Name -like "*${selector.value}*"`;
      break;
    default:
      condition = `$_.Name -eq "${selector.value}"`;
  }

  const script = `
    Add-Type -AssemblyName UIAutomationClient
    $desktop = [System.Windows.Automation.AutomationElement]::RootElement
    ${windowHandle ? `$window = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new(${windowHandle})); $scope = $window` : `$scope = $desktop`}
    $condition = [System.Windows.Automation.Condition]::TrueCondition
    $elements = $scope.FindAll([System.Windows.Automation.TreeScope]::${scope}, $condition)
    $matched = $elements | Where-Object { ${condition} }
    $result = @()
    foreach ($el in $matched) {
      $rect = $el.Current.BoundingRectangle
      $result += @{
        automationId = $el.Current.AutomationId
        name = $el.Current.Name
        controlType = $el.Current.ControlType.ProgrammaticName
        className = $el.Current.ClassName
        bounds = @{
          x = $rect.X
          y = $rect.Y
          width = $rect.Width
          height = $rect.Height
        }
        center = @{
          x = $rect.X + $rect.Width / 2
          y = $rect.Y + $rect.Height / 2
        }
        isEnabled = $el.Current.IsEnabled
        isOffscreen = $el.Current.IsOffscreen
        hasKeyboardFocus = $el.Current.HasKeyboardFocus
        processId = $el.Current.ProcessId
      }
    }
    $result | ConvertTo-Json -Compress
  `;

  try {
    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 10000 },
    );

    if (!stdout.trim()) {
      return [];
    }

    const data = JSON.parse(stdout.trim());
    const elements = Array.isArray(data) ? data : [data];
    
    return elements.map((el: any) => ({
      automationId: el.automationId || "",
      name: el.name || "",
      controlType: el.controlType || "",
      className: el.className || "",
      bounds: el.bounds || { x: 0, y: 0, width: 0, height: 0 },
      center: el.center || { x: 0, y: 0 },
      isEnabled: el.isEnabled ?? true,
      isOffscreen: el.isOffscreen ?? false,
      hasKeyboardFocus: el.hasKeyboardFocus ?? false,
      processId: el.processId,
    }));
  } catch (error) {
    log.error(`PowerShell execution failed: ${error}`);
    return [];
  }
}

// ============================================================================
// Window Management
// ============================================================================

export async function getForegroundWindow(): Promise<ToolResult> {
  log.info("Getting foreground window");

  try {
    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Win32 {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
        [DllImport("user32.dll")]
        public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);
        [DllImport("user32.dll")]
        public static extern bool IsWindowEnabled(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
      }
"@
      $hwnd = [Win32]::GetForegroundWindow()
      $title = New-Object System.Text.StringBuilder(256)
      $class = New-Object System.Text.StringBuilder(256)
      [Win32]::GetWindowText($hwnd, $title, 256)
      [Win32]::GetClassName($hwnd, $class, 256)
      $processId = 0
      [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
      @{
        handle = $hwnd.ToInt64()
        title = $title.ToString()
        className = $class.ToString()
        isEnabled = [Win32]::IsWindowEnabled($hwnd)
        isVisible = [Win32]::IsWindowVisible($hwnd)
        processId = $processId
      } | ConvertTo-Json -Compress
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const data = JSON.parse(stdout.trim());
    
    return {
      success: true,
      data: {
        handle: data.handle,
        title: data.title,
        className: data.className,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        isEnabled: data.isEnabled,
        isVisible: data.isVisible,
        processId: data.processId,
      } as UIAWindow,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get foreground window: ${error}`,
    };
  }
}

export async function findWindowByTitle(title: string): Promise<ToolResult> {
  log.info(`Finding window by title: ${title}`);

  try {
    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      using System.Text;
      public class Win32 {
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
        [DllImport("user32.dll")]
        public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
        [DllImport("user32.dll")]
        public static extern bool IsWindowEnabled(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
      }
"@
      $hwnd = [Win32]::FindWindow($null, "${title}")
      if ($hwnd -eq [IntPtr]::Zero) {
        Write-Output "null"
      } else {
        $windowTitle = New-Object System.Text.StringBuilder(256)
        $class = New-Object System.Text.StringBuilder(256)
        [Win32]::GetWindowText($hwnd, $windowTitle, 256)
        [Win32]::GetClassName($hwnd, $class, 256)
        $processId = 0
        [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        @{
          handle = $hwnd.ToInt64()
          title = $windowTitle.ToString()
          className = $class.ToString()
          isEnabled = [Win32]::IsWindowEnabled($hwnd)
          isVisible = [Win32]::IsWindowVisible($hwnd)
          processId = $processId
        } | ConvertTo-Json -Compress
      }
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const trimmed = stdout.trim();
    if (trimmed === "null") {
      return {
        success: false,
        error: `Window not found: ${title}`,
      };
    }

    const data = JSON.parse(trimmed);
    
    return {
      success: true,
      data: {
        handle: data.handle,
        title: data.title,
        className: data.className,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        isEnabled: data.isEnabled,
        isVisible: data.isVisible,
        processId: data.processId,
      } as UIAWindow,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to find window: ${error}`,
    };
  }
}

export async function setWindowFocus(windowHandle: number): Promise<ToolResult> {
  log.info(`Setting window focus: ${windowHandle}`);

  try {
    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Win32 {
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        public const int SW_RESTORE = 9;
      }
"@
      $hwnd = [IntPtr]::new(${windowHandle})
      [Win32]::ShowWindow($hwnd, [Win32]::SW_RESTORE)
      $result = [Win32]::SetForegroundWindow($hwnd)
      Write-Output $result
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const success = stdout.trim().toLowerCase() === "true";
    
    return {
      success,
      data: { focused: success },
      error: success ? undefined : "Failed to set window focus",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to set window focus: ${error}`,
    };
  }
}

// ============================================================================
// Element Interaction
// ============================================================================

export async function clickElement(element: UIAElement): Promise<ToolResult> {
  log.info(`Clicking element: ${element.name}`);

  try {
    const { mouseClickAt } = await import("../native/mouse.js");
    await mouseClickAt(element.center.x, element.center.y);
    
    return {
      success: true,
      data: { clicked: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to click element: ${error}`,
    };
  }
}

export async function doubleClickElement(element: UIAElement): Promise<ToolResult> {
  log.info(`Double-clicking element: ${element.name}`);

  try {
    const { mouseDoubleClickAt } = await import("../native/mouse.js");
    await mouseDoubleClickAt(element.center.x, element.center.y);
    
    return {
      success: true,
      data: { doubleClicked: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to double-click element: ${error}`,
    };
  }
}

export async function rightClickElement(element: UIAElement): Promise<ToolResult> {
  log.info(`Right-clicking element: ${element.name}`);

  try {
    const { mouseRightClickAt } = await import("../native/mouse.js");
    await mouseRightClickAt(element.center.x, element.center.y);
    
    return {
      success: true,
      data: { rightClicked: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to right-click element: ${error}`,
    };
  }
}

export async function typeIntoElement(
  element: UIAElement,
  text: string,
): Promise<ToolResult> {
  log.info(`Typing into element: ${element.name}`);

  try {
    // First click to focus
    await clickElement(element);
    await sleep(100);

    // Type text
    const { typeText } = await import("../native/keyboard.js");
    await typeText(text);
    
    return {
      success: true,
      data: { typed: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to type into element: ${error}`,
    };
  }
}

export async function getElementValue(element: UIAElement): Promise<ToolResult> {
  log.info(`Getting element value: ${element.name}`);

  try {
    const script = `
      Add-Type -AssemblyName UIAutomationClient
      $element = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new(${element.windowHandle || 0}))
      $valuePattern = $element.GetCurrentPattern([System.Windows.Automation.PatternIdentifiers]::ValuePattern)
      if ($valuePattern) {
        $valuePattern.Current.Value
      } else {
        $element.Current.Name
      }
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    return {
      success: true,
      data: { value: stdout.trim() },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get element value: ${error}`,
    };
  }
}

export async function setElementValue(
  element: UIAElement,
  value: string,
): Promise<ToolResult> {
  log.info(`Setting element value: ${element.name} = ${value}`);

  try {
    const script = `
      Add-Type -AssemblyName UIAutomationClient
      $element = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new(${element.windowHandle || 0}))
      $valuePattern = $element.GetCurrentPattern([System.Windows.Automation.PatternIdentifiers]::ValuePattern)
      if ($valuePattern) {
        $valuePattern.SetValue("${value}")
        $true
      } else {
        $false
      }
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const success = stdout.trim().toLowerCase() === "true";
    
    return {
      success,
      data: { set: success },
      error: success ? undefined : "Element does not support value pattern",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to set element value: ${error}`,
    };
  }
}

// ============================================================================
// UIA Detector Class
// ============================================================================

export class UIAElementDetector {
  async findElement(selector: UIASelector): Promise<UIAElement | null> {
    const result = await findElement(selector);
    return result.success ? (result.data as UIAElement) : null;
  }

  async findElements(selector: UIASelector): Promise<UIAElement[]> {
    const result = await findElements(selector);
    return result.success ? (result.data as { elements: UIAElement[] }).elements : [];
  }

  async clickElement(element: UIAElement): Promise<boolean> {
    const result = await clickElement(element);
    return result.success;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const UIASkills = {
  element: {
    find: findElement,
    findAll: findElements,
    click: clickElement,
    doubleClick: doubleClickElement,
    rightClick: rightClickElement,
    type: typeIntoElement,
    getValue: getElementValue,
    setValue: setElementValue,
  },
  window: {
    getForeground: getForegroundWindow,
    findByTitle: findWindowByTitle,
    setFocus: setWindowFocus,
  },
};

export default UIASkills;
