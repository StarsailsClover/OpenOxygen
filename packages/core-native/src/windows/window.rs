//! 窗口枚举与管理 — EnumWindows + GetWindowText

use napi::bindgen_prelude::*;

#[cfg(windows)]
use windows::{
    Win32::Foundation::*,
    Win32::UI::WindowsAndMessaging::*,
};

#[napi(object)]
#[derive(Clone)]
pub struct WindowInfo {
    pub hwnd: i64,
    pub title: String,
    pub class_name: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub visible: bool,
    pub focused: bool,
}

/// 枚举所有可见窗口
#[napi]
pub fn list_windows() -> Vec<WindowInfo> {
    #[cfg(windows)]
    {
        list_windows_impl()
    }
    #[cfg(not(windows))]
    {
        vec![]
    }
}

/// 获取当前前台窗口信息
#[napi]
pub fn get_foreground_window_info() -> Option<WindowInfo> {
    #[cfg(windows)]
    {
        get_foreground_window_impl()
    }
    #[cfg(not(windows))]
    {
        None
    }
}

/// 将窗口置于前台
#[napi]
pub fn focus_window(hwnd: i64) -> bool {
    #[cfg(windows)]
    unsafe {
        let h = HWND(hwnd as *mut _);
        SetForegroundWindow(h).as_bool()
    }
    #[cfg(not(windows))]
    {
        false
    }
}

#[cfg(windows)]
fn list_windows_impl() -> Vec<WindowInfo> {
    let mut windows: Vec<WindowInfo> = Vec::new();

    unsafe {
        let fg = GetForegroundWindow();

        let _ = EnumWindows(
            Some(enum_window_callback),
            LPARAM(&mut windows as *mut Vec<WindowInfo> as isize),
        );

        // Mark focused window
        let fg_val = fg.0 as i64;
        for w in &mut windows {
            w.focused = w.hwnd == fg_val;
        }
    }

    windows
}

#[cfg(windows)]
unsafe extern "system" fn enum_window_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    if !IsWindowVisible(hwnd).as_bool() {
        return TRUE;
    }

    let mut title = [0u16; 512];
    let title_len = GetWindowTextW(hwnd, &mut title);
    if title_len == 0 {
        return TRUE;
    }
    let title_str = String::from_utf16_lossy(&title[..title_len as usize]);

    let mut class = [0u16; 256];
    let class_len = GetClassNameW(hwnd, &mut class);
    let class_str = String::from_utf16_lossy(&class[..class_len as usize]);

    let mut rect = RECT::default();
    let _ = GetWindowRect(hwnd, &mut rect);

    let info = WindowInfo {
        hwnd: hwnd.0 as i64,
        title: title_str,
        class_name: class_str,
        x: rect.left,
        y: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        visible: true,
        focused: false,
    };

    let windows = &mut *(lparam.0 as *mut Vec<WindowInfo>);
    windows.push(info);

    TRUE
}

#[cfg(windows)]
fn get_foreground_window_impl() -> Option<WindowInfo> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }

        let mut title = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title);
        let title_str = String::from_utf16_lossy(&title[..title_len as usize]);

        let mut class = [0u16; 256];
        let class_len = GetClassNameW(hwnd, &mut class);
        let class_str = String::from_utf16_lossy(&class[..class_len as usize]);

        let mut rect = RECT::default();
        let _ = GetWindowRect(hwnd, &mut rect);

        Some(WindowInfo {
            hwnd: hwnd.0 as i64,
            title: title_str,
            class_name: class_str,
            x: rect.left,
            y: rect.top,
            width: rect.right - rect.left,
            height: rect.bottom - rect.top,
            visible: true,
            focused: true,
        })
    }
}
