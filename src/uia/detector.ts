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
    log.error(`Failed to find element: ${error}`);
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
      data: { elements, count: elements.length },
    };
  } catch (error) {
    log.error(`Failed to find elements: ${error}`);
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
  
  let conditionScript: string;
  switch (selector.type) {
    case "name":
      conditionScript = `$element.FindFirst([System.Windows.Automation.TreeScope]::${scope}, [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, "${selector.value}"))`;
      break;
    case "automationId":
      conditionScript = `$element.FindFirst([System.Windows.Automation.TreeScope]::${scope}, [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::AutomationIdProperty, "${selector.value}"))`;
      break;
    case "className":
      conditionScript = `$element.FindFirst([System.Windows.Automation.TreeScope]::${scope}, [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ClassNameProperty, "${selector.value}"))`;
      break;
    case "controlType":
      conditionScript = `$element.FindFirst([System.Windows.Automation.TreeScope]::${scope}, [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::${selector.value}))`;
      break;
    case "partialName":
      conditionScript = `$element.FindAll([System.Windows.Automation.TreeScope]::${scope}, [System.Windows.Automation.Condition]::TrueCondition) | Where-Object { $_.Current.Name -like "*${selector.value}*" } | Select-Object -First 1`;
      break;
    default:
      throw new Error(`Unknown selector type: ${selector.type}`);
  }

  const script = `
    Add-Type -AssemblyName UIAutomationClient
    
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
        isEnabled = $found.Current.IsEnabled
        isOffscreen = $found.Current.IsOffscreen
        hasKeyboardFocus = $found.Current.HasKeyboardFocus
        processId = $found.Current.ProcessId
>>>>>>> dev
      }
      $props | ConvertTo-Json -Compress
    } else {
      Write-Output "null"
    }
  `;

  try {
    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 10000 },
    );

    const output = stdout.trim();
    if (output === "null") {
      return null;
    }

    return JSON.parse(output) as UIAElement;
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
  
  let conditionScript: string;
  switch (selector.type) {
    case "name":
      conditionScript = `[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, "${selector.value}")`;
      break;
    case "automationId":
      conditionScript = `[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::AutomationIdProperty, "${selector.value}")`;
      break;
    case "className":
      conditionScript = `[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ClassNameProperty, "${selector.value}")`;
      break;
    case "controlType":
      conditionScript = `[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::${selector.value})`;
      break;
    case "partialName":
      conditionScript = `[System.Windows.Automation.Condition]::TrueCondition`;
      break;
    default:
      throw new Error(`Unknown selector type: ${selector.type}`);
  }

  const script = `
    Add-Type -AssemblyName UIAutomationClient
    
    ${windowHandle 
      ? `$element = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new(${windowHandle}))`
      : `$element = [System.Windows.Automation.AutomationElement]::RootElement`
    }
    
    $found = $element.FindAll([System.Windows.Automation.TreeScope]::${scope}, ${conditionScript})
    
    $results = @()
    for ($i = 0; $i -lt $found.Count; $i++) {
      $item = $found[$i]
      ${selector.type === "partialName" ? `if ($item.Current.Name -like "*${selector.value}*") {` : ``}
      $rect = $item.Current.BoundingRectangle
      $props = @{
        automationId = $item.Current.AutomationId
        name = $item.Current.Name
        controlType = $item.Current.ControlType.ProgrammaticName
        className = $item.Current.ClassName
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
        isEnabled = $item.Current.IsEnabled
        isOffscreen = $item.Current.IsOffscreen
        hasKeyboardFocus = $item.Current.HasKeyboardFocus
        processId = $item.Current.ProcessId
      }
      $results += $props
      ${selector.type === "partialName" ? `}` : ``}
    }
    
    $results | ConvertTo-Json -Compress -AsArray
  `;

  try {
    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 10000 },
    );

    const output = stdout.trim();
    if (!output || output === "null") {
      return [];
    }

    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
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
      public class User32 {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        
        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
        
        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
        
        [DllImport("user32.dll")]
        public static extern bool IsWindowEnabled(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);
        
        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
        
        public struct RECT {
          public int Left, Top, Right, Bottom;
        }
      }
"@
      
      $hwnd = [User32]::GetForegroundWindow()
      $rect = New-Object User32+RECT
      [User32]::GetWindowRect($hwnd, [ref]$rect)
      
      $title = New-Object System.Text.StringBuilder(256)
      [User32]::GetWindowText($hwnd, $title, 256)
      
      $processId = 0
      [User32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
      
      @{
        handle = $hwnd.ToInt64()
        title = $title.ToString()
        bounds = @{
          x = $rect.Left
          y = $rect.Top
          width = $rect.Right - $rect.Left
          height = $rect.Bottom - $rect.Top
        }
        isEnabled = [User32]::IsWindowEnabled($hwnd)
        isVisible = [User32]::IsWindowVisible($hwnd)
        processId = $processId
      } | ConvertTo-Json -Compress
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const window = JSON.parse(stdout.trim()) as UIAWindow;

    return {
      success: true,
      data: window,
    };
  } catch (error) {
    log.error(`Failed to get foreground window: ${error}`);
    return {
      success: false,
      error: `Failed to get foreground window: ${error}`,
    };
  }
}

export async function findWindowByTitle(titlePattern: string): Promise<ToolResult> {
  log.info(`Finding window by title: ${titlePattern}`);

  try {
    const script = `
      Add-Type -AssemblyName UIAutomationClient
      
      $condition = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Window
      )
      
      $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
        [System.Windows.Automation.TreeScope]::Children,
        $condition
      )
      
      $results = @()
      for ($i = 0; $i -lt $windows.Count; $i++) {
        $window = $windows[$i]
        if ($window.Current.Name -like "*${titlePattern}*") {
          $rect = $window.Current.BoundingRectangle
          $results += @{
            handle = 0
            title = $window.Current.Name
            className = $window.Current.ClassName
            bounds = @{
              x = $rect.X
              y = $rect.Y
              width = $rect.Width
              height = $rect.Height
            }
            isEnabled = $window.Current.IsEnabled
            isVisible = -not $window.Current.IsOffscreen
            processId = $window.Current.ProcessId
          }
        }
      }
      
      $results | ConvertTo-Json -Compress -AsArray
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const windows = JSON.parse(stdout.trim()) as UIAWindow[];

    return {
      success: true,
      data: { windows, count: windows.length },
    };
  } catch (error) {
    log.error(`Failed to find window: ${error}`);
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
      public class User32 {
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        
        public const int SW_RESTORE = 9;
      }
"@
      
      $hwnd = [IntPtr]::new(${windowHandle})
      [User32]::ShowWindow($hwnd, [User32]::SW_RESTORE)
      $result = [User32]::SetForegroundWindow($hwnd)
      
      @{ success = $result } | ConvertTo-Json -Compress
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const result = JSON.parse(stdout.trim());

    return {
      success: result.success,
      data: { focused: result.success },
    };
  } catch (error) {
    log.error(`Failed to set window focus: ${error}`);
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
    // Use native mouse control
    const { mouseMove, mouseClick } = await import("../native/mouse.js");
    
    await mouseMove(element.center.x, element.center.y);
    await new Promise(r => setTimeout(r, 50));
    await mouseClick(0);

    return {
      success: true,
      data: { clicked: true, element: element.name },
    };
  } catch (error) {
    log.error(`Failed to click element: ${error}`);
    return {
      success: false,
      error: `Failed to click element: ${error}`,
    };
  }
}

export async function doubleClickElement(element: UIAElement): Promise<ToolResult> {
  log.info(`Double-clicking element: ${element.name}`);

  try {
    const { mouseMove, mouseDoubleClick } = await import("../native/mouse.js");
    
    await mouseMove(element.center.x, element.center.y);
    await new Promise(r => setTimeout(r, 50));
    await mouseDoubleClick(0);

    return {
      success: true,
      data: { doubleClicked: true, element: element.name },
    };
  } catch (error) {
    log.error(`Failed to double-click element: ${error}`);
    return {
      success: false,
      error: `Failed to double-click element: ${error}`,
    };
  }
}

export async function rightClickElement(element: UIAElement): Promise<ToolResult> {
  log.info(`Right-clicking element: ${element.name}`);

  try {
    const { mouseMove, MouseButton } = await import("../native/mouse.js");
    const { mouseClick } = await import("../native/mouse.js");
    
    await mouseMove(element.center.x, element.center.y);
    await new Promise(r => setTimeout(r, 50));
    await mouseClick(MouseButton.RIGHT);

    return {
      success: true,
      data: { rightClicked: true, element: element.name },
    };
  } catch (error) {
    log.error(`Failed to right-click element: ${error}`);
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
    // Click to focus
    const clickResult = await clickElement(element);
    if (!clickResult.success) {
      return clickResult;
    }

    await new Promise(r => setTimeout(r, 100));

    // Type text
    const { typeText } = await import("../native/keyboard.js");
    await typeText(text);

    return {
      success: true,
      data: { typed: true, element: element.name, textLength: text.length },
    };
  } catch (error) {
    log.error(`Failed to type into element: ${error}`);
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
      $condition = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::AutomationIdProperty,
        "${element.automationId}"
      )
      $found = $element.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
      
      if ($found) {
        $pattern = $found.GetCurrentPattern([System.Windows.Automation.PatternIdentifiers]::ValuePattern)
        if ($pattern) {
          @{ value = $pattern.Current.Value } | ConvertTo-Json -Compress
        } else {
          @{ value = $found.Current.Name } | ConvertTo-Json -Compress
        }
      } else {
        @{ value = $null } | ConvertTo-Json -Compress
      }
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const result = JSON.parse(stdout.trim());

    return {
      success: true,
      data: { value: result.value },
    };
  } catch (error) {
    log.error(`Failed to get element value: ${error}`);
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
  log.info(`Setting element value: ${element.name}`);

  try {
    const script = `
      Add-Type -AssemblyName UIAutomationClient
      
      $element = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new(${element.windowHandle || 0}))
      $condition = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::AutomationIdProperty,
        "${element.automationId}"
      )
      $found = $element.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
      
      if ($found) {
        $pattern = $found.GetCurrentPattern([System.Windows.Automation.PatternIdentifiers]::ValuePattern)
        if ($pattern) {
          $pattern.SetValue("${value.replace(/"/g, '`"')}")
          @{ success = $true } | ConvertTo-Json -Compress
        } else {
          @{ success = $false; error = "Value pattern not supported" } | ConvertTo-Json -Compress
        }
      } else {
        @{ success = $false; error = "Element not found" } | ConvertTo-Json -Compress
      }
    `;

    const { stdout } = await execAsync(
      `powershell -Command "${script.replace(/"/g, '`"')}"`,
      { timeout: 5000 },
    );

    const result = JSON.parse(stdout.trim());

    return {
      success: result.success,
      data: { valueSet: result.success },
      error: result.error,
    };
  } catch (error) {
    log.error(`Failed to set element value: ${error}`);
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

export {
  findElement,
  findElements,
  getForegroundWindow,
  findWindowByTitle,
  setWindowFocus,
  clickElement,
  doubleClickElement,
  rightClickElement,
  typeIntoElement,
  getElementValue,
  setElementValue,
  UIAElementDetector,
};

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
