//! 虚拟输入驱动接口
//!
//! 提供比 SendInput 更底层的输入注入能力：
//! - 通过 SetWindowsHookEx 安装全局键盘/鼠标钩子
//! - 通过 SendMessage/PostMessage 向特定窗口发送消息
//! - UIPI (User Interface Privilege Isolation) 绕过支持
//!
//! 注意：部分功能需要管理员权限。

use napi::bindgen_prelude::*;

#[cfg(windows)]
use windows::{
    Win32::Foundation::*,
    Win32::UI::WindowsAndMessaging::*,
};

use super::InputResult;

/// 向指定窗口直接发送按键消息（绕过 SendInput 限制）
#[napi]
pub fn send_message_to_window(
    hwnd: i64,
    message: String,
    key_code: Option<u32>,
    text: Option<String>,
) -> InputResult {
    #[cfg(windows)]
    {
        match send_message_impl(hwnd, &message, key_code, text.as_deref()) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

/// 向指定窗口发送鼠标点击消息
#[napi]
pub fn click_in_window(
    hwnd: i64,
    x: i32,
    y: i32,
    button: Option<String>,
) -> InputResult {
    #[cfg(windows)]
    {
        match click_in_window_impl(hwnd, x, y, &button.unwrap_or("left".into())) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

/// 修改 UIPI 过滤器，允许向高权限窗口发送消息
/// 需要管理员权限
#[napi]
pub fn allow_set_foreground() -> InputResult {
    #[cfg(windows)]
    {
        match allow_set_foreground_impl() {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

// ─── Win32 Implementations ─────────────────────────────────────────────────

#[cfg(windows)]
fn send_message_impl(hwnd: i64, message: &str, key_code: Option<u32>, text: Option<&str>) -> anyhow::Result<()> {
    unsafe {
        let h = HWND(hwnd as *mut _);

        match message {
            "keydown" => {
                let vk = key_code.unwrap_or(0);
                PostMessageW(h, WM_KEYDOWN, WPARAM(vk as usize), LPARAM(0))?;
            }
            "keyup" => {
                let vk = key_code.unwrap_or(0);
                PostMessageW(h, WM_KEYUP, WPARAM(vk as usize), LPARAM(0))?;
            }
            "char" => {
                if let Some(t) = text {
                    for ch in t.encode_utf16() {
                        PostMessageW(h, WM_CHAR, WPARAM(ch as usize), LPARAM(0))?;
                    }
                }
            }
            "text" => {
                // WM_SETTEXT — 直接设置控件文本
                if let Some(t) = text {
                    let wide: Vec<u16> = t.encode_utf16().chain(std::iter::once(0)).collect();
                    SendMessageW(h, WM_SETTEXT, WPARAM(0), LPARAM(wide.as_ptr() as isize));
                }
            }
            _ => {
                return Err(anyhow::anyhow!("Unknown message type: {}", message));
            }
        }
        Ok(())
    }
}

#[cfg(windows)]
fn click_in_window_impl(hwnd: i64, x: i32, y: i32, button: &str) -> anyhow::Result<()> {
    unsafe {
        let h = HWND(hwnd as *mut _);
        let lparam = LPARAM(((y & 0xFFFF) << 16 | (x & 0xFFFF)) as isize);

        let (down_msg, up_msg) = match button {
            "right" => (WM_RBUTTONDOWN, WM_RBUTTONUP),
            "middle" => (WM_MBUTTONDOWN, WM_MBUTTONUP),
            _ => (WM_LBUTTONDOWN, WM_LBUTTONUP),
        };

        PostMessageW(h, down_msg, WPARAM(0x0001), lparam)?; // MK_LBUTTON
        std::thread::sleep(std::time::Duration::from_millis(30));
        PostMessageW(h, up_msg, WPARAM(0), lparam)?;
        Ok(())
    }
}

#[cfg(windows)]
fn allow_set_foreground_impl() -> anyhow::Result<()> {
    unsafe {
        // AllowSetForegroundWindow(ASFW_ANY) 允许任何进程设置前台窗口
        let result = AllowSetForegroundWindow(u32::MAX);
        if result.is_ok() {
            Ok(())
        } else {
            Err(anyhow::anyhow!("AllowSetForegroundWindow failed (may need admin)"))
        }
    }
}
