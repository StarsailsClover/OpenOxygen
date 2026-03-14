//! 快速 UI Automation — 缓存 COM 实例，避免重复初始化

use napi::bindgen_prelude::*;
use once_cell::sync::Lazy;
use std::sync::Mutex;

#[cfg(windows)]
use windows::{
    core::*,
    Win32::Foundation::*,
    Win32::UI::Accessibility::*,
    Win32::System::Com::*,
};

use super::ui_automation::UiaElement;

// 全局缓存的 COM 和 Automation 实例
#[cfg(windows)]
static UIA_CACHE: Lazy<Mutex<Option<IUIAutomation>>> = Lazy::new(|| Mutex::new(None));

#[cfg(windows)]
fn get_cached_automation() -> anyhow::Result<IUIAutomation> {
    let mut cache = UIA_CACHE.lock().unwrap();
    
    if let Some(auto) = cache.as_ref() {
        return Ok(auto.clone());
    }
    
    // 初始化 COM（仅一次）
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    
    // 创建 Automation 实例
    let auto: IUIAutomation = unsafe {
        CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)?
    };
    
    *cache = Some(auto.clone());
    Ok(auto)
}

/// 快速获取 UI 元素（使用缓存）
#[napi]
pub fn get_ui_elements_fast(hwnd: Option<i64>) -> Vec<UiaElement> {
    #[cfg(windows)]
    {
        get_ui_elements_fast_impl(hwnd).unwrap_or_default()
    }
    #[cfg(not(windows))]
    {
        vec![]
    }
}

#[cfg(windows)]
fn get_ui_elements_fast_impl(hwnd: Option<i64>) -> anyhow::Result<Vec<UiaElement>> {
    let automation = get_cached_automation()?;
    
    let root = if let Some(h) = hwnd {
        let handle = HWND(h as *mut _);
        unsafe { automation.ElementFromHandle(handle)? }
    } else {
        unsafe { automation.GetRootElement()? }
    };
    
    let walker = unsafe { automation.CreateTreeWalker(automation.CreateTrueCondition()?)? };
    
    let mut elements = Vec::new();
    collect_elements_fast(&walker, &root, &mut elements, 0, 6)?;
    
    Ok(elements)
}

#[cfg(windows)]
unsafe fn collect_elements_fast(
    walker: &IUIAutomationTreeWalker,
    parent: &IUIAutomationElement,
    results: &mut Vec<UiaElement>,
    depth: u32,
    max_depth: u32,
) -> anyhow::Result<()> {
    if depth >= max_depth || results.len() >= 300 {
        return Ok(());
    }
    
    let child = walker.GetFirstChildElement(parent);
    let mut current = match child {
        Ok(c) => c,
        Err(_) => return Ok(()),
    };
    
    loop {
        if let Ok(elem) = element_to_uia_fast(&current) {
            if !elem.name.is_empty() && elem.width > 0 && elem.height > 0 {
                results.push(elem);
            }
        }
        
        // 递归（但限制深度）
        if depth < max_depth - 1 {
            let _ = collect_elements_fast(walker, &current, results, depth + 1, max_depth);
        }
        
        match walker.GetNextSiblingElement(&current) {
            Ok(next) => current = next,
            Err(_) => break,
        }
    }
    
    Ok(())
}

#[cfg(windows)]
unsafe fn element_to_uia_fast(element: &IUIAutomationElement) -> anyhow::Result<UiaElement> {
    let name = element.CurrentName()?.to_string();
    let automation_id = element.CurrentAutomationId().map(|s| s.to_string()).unwrap_or_default();
    let class_name = element.CurrentClassName().map(|s| s.to_string()).unwrap_or_default();
    let control_type_id = element.CurrentControlType()?;
    let control_type = control_type_name_fast(UIA_CONTROLTYPE_ID(control_type_id.0));
    let rect = element.CurrentBoundingRectangle()?;
    let is_enabled = element.CurrentIsEnabled()?.as_bool();
    let is_offscreen = element.CurrentIsOffscreen()?.as_bool();
    let has_focus = element.CurrentHasKeyboardFocus()?.as_bool();
    
    Ok(UiaElement {
        automation_id,
        name,
        control_type: control_type.to_string(),
        class_name,
        x: rect.left,
        y: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        is_enabled,
        is_offscreen,
        has_keyboard_focus: has_focus,
    })
}

#[cfg(windows)]
fn control_type_name_fast(id: UIA_CONTROLTYPE_ID) -> &'static str {
    match id {
        UIA_ButtonControlTypeId => "Button",
        UIA_CheckBoxControlTypeId => "CheckBox",
        UIA_ComboBoxControlTypeId => "ComboBox",
        UIA_EditControlTypeId => "Edit",
        UIA_HyperlinkControlTypeId => "Hyperlink",
        UIA_ImageControlTypeId => "Image",
        UIA_ListControlTypeId => "List",
        UIA_ListItemControlTypeId => "ListItem",
        UIA_MenuControlTypeId => "Menu",
        UIA_MenuItemControlTypeId => "MenuItem",
        UIA_ProgressBarControlTypeId => "ProgressBar",
        UIA_RadioButtonControlTypeId => "RadioButton",
        UIA_ScrollBarControlTypeId => "ScrollBar",
        UIA_SliderControlTypeId => "Slider",
        UIA_TabControlTypeId => "Tab",
        UIA_TabItemControlTypeId => "TabItem",
        UIA_TextControlTypeId => "Text",
        UIA_ToolBarControlTypeId => "ToolBar",
        UIA_TreeControlTypeId => "Tree",
        UIA_TreeItemControlTypeId => "TreeItem",
        UIA_WindowControlTypeId => "Window",
        UIA_PaneControlTypeId => "Pane",
        UIA_GroupControlTypeId => "Group",
        UIA_StatusBarControlTypeId => "StatusBar",
        UIA_DocumentControlTypeId => "Document",
        UIA_SplitButtonControlTypeId => "SplitButton",
        UIA_DataGridControlTypeId => "DataGrid",
        UIA_DataItemControlTypeId => "DataItem",
        UIA_ToolTipControlTypeId => "ToolTip",
        UIA_HeaderControlTypeId => "Header",
        UIA_HeaderItemControlTypeId => "HeaderItem",
        UIA_TableControlTypeId => "Table",
        UIA_TitleBarControlTypeId => "TitleBar",
        UIA_ThumbControlTypeId => "Thumb",
        UIA_SeparatorControlTypeId => "Separator",
        _ => "Unknown",
    }
}

/// 重置缓存（用于测试或内存回收）
#[napi]
pub fn reset_uia_cache() -> bool {
    #[cfg(windows)]
    {
        let mut cache = UIA_CACHE.lock().unwrap();
        *cache = None;
        true
    }
    #[cfg(not(windows))]
    {
        false
    }
}
