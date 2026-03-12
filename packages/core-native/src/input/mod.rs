//! 高级输入系统 — 虚拟驱动级键鼠控制
//!
//! 三层输入架构：
//! 1. SendInput API (用户态，默认) — 兼容性最好
//! 2. Raw Input Injection (低级) — 绕过部分输入过滤
//! 3. 提权操作支持 — UAC 检测、管理员权限请求
//!
//! 增强功能：
//! - 平滑鼠标移动（贝塞尔曲线插值，模拟人类行为）
//! - 智能等待（操作后等待 UI 响应）
//! - 输入序列录制与回放
//! - DPI 感知坐标转换

pub mod driver;

use napi::bindgen_prelude::*;

#[cfg(windows)]
use windows::Win32::UI::Input::KeyboardAndMouse::*;
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::*;
#[cfg(windows)]
use windows::Win32::Foundation::*;
#[cfg(windows)]
use windows::Win32::Security::*;
#[cfg(windows)]
use windows::Win32::System::Threading::*;

#[napi(object)]
pub struct InputResult {
    pub success: bool,
    pub error: Option<String>,
}

// ═══════════════════════════════════════════════════════════════════════════
// 权限检测与提升
// ═══════════════════════════════════════════════════════════════════════════

/// 检测当前进程是否以管理员权限运行
#[napi]
pub fn is_elevated() -> bool {
    #[cfg(windows)]
    {
        is_elevated_impl()
    }
    #[cfg(not(windows))]
    {
        false
    }
}

/// 获取当前进程的权限级别描述
#[napi(object)]
pub struct PrivilegeInfo {
    pub is_admin: bool,
    pub is_system: bool,
    pub integrity_level: String,
    pub can_inject_input: bool,
    pub can_access_uipi: bool,
}

#[napi]
pub fn get_privilege_info() -> PrivilegeInfo {
    #[cfg(windows)]
    {
        get_privilege_info_impl()
    }
    #[cfg(not(windows))]
    {
        PrivilegeInfo {
            is_admin: false,
            is_system: false,
            integrity_level: "unknown".to_string(),
            can_inject_input: false,
            can_access_uipi: false,
        }
    }
}

/// 请求以管理员权限重启当前进程
#[napi]
pub fn request_elevation() -> InputResult {
    #[cfg(windows)]
    {
        match request_elevation_impl() {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 平滑鼠标移动 — 贝塞尔曲线插值
// ═══════════════════════════════════════════════════════════════════════════

/// 平滑移动鼠标到目标位置（模拟人类行为）
#[napi]
pub fn mouse_move_smooth(
    target_x: i32,
    target_y: i32,
    duration_ms: Option<u32>,
    curve: Option<String>, // "linear" | "ease" | "bezier"
) -> InputResult {
    #[cfg(windows)]
    {
        match mouse_move_smooth_impl(target_x, target_y, duration_ms.unwrap_or(300), &curve.unwrap_or("ease".into())) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

/// 平滑移动 + 点击（一步完成）
#[napi]
pub fn mouse_click_smooth(
    x: i32,
    y: i32,
    button: Option<String>,
    move_duration_ms: Option<u32>,
) -> InputResult {
    #[cfg(windows)]
    {
        match mouse_move_smooth_impl(x, y, move_duration_ms.unwrap_or(200), "ease") {
            Ok(()) => {},
            Err(e) => return InputResult { success: false, error: Some(e.to_string()) },
        }
        std::thread::sleep(std::time::Duration::from_millis(30));
        let btn = button.unwrap_or("left".into());
        match mouse_click_at_current(&btn) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DPI 感知坐标系统
// ═══════════════════════════════════════════════════════════════════════════

#[napi(object)]
pub struct ScreenMetrics {
    pub physical_width: i32,
    pub physical_height: i32,
    pub logical_width: i32,
    pub logical_height: i32,
    pub dpi_x: u32,
    pub dpi_y: u32,
    pub scale_factor: f64,
}

/// 获取屏幕 DPI 和缩放信息
#[napi]
pub fn get_screen_metrics() -> ScreenMetrics {
    #[cfg(windows)]
    {
        get_screen_metrics_impl()
    }
    #[cfg(not(windows))]
    {
        ScreenMetrics {
            physical_width: 1920, physical_height: 1080,
            logical_width: 1920, logical_height: 1080,
            dpi_x: 96, dpi_y: 96, scale_factor: 1.0,
        }
    }
}

/// 将逻辑坐标转换为物理像素坐标
#[napi]
pub fn logical_to_physical(x: i32, y: i32) -> Vec<i32> {
    #[cfg(windows)]
    {
        let metrics = get_screen_metrics_impl();
        vec![
            (x as f64 * metrics.scale_factor) as i32,
            (y as f64 * metrics.scale_factor) as i32,
        ]
    }
    #[cfg(not(windows))]
    {
        vec![x, y]
    }
}

/// 将物理像素坐标转换为逻辑坐标
#[napi]
pub fn physical_to_logical(x: i32, y: i32) -> Vec<i32> {
    #[cfg(windows)]
    {
        let metrics = get_screen_metrics_impl();
        vec![
            (x as f64 / metrics.scale_factor) as i32,
            (y as f64 / metrics.scale_factor) as i32,
        ]
    }
    #[cfg(not(windows))]
    {
        vec![x, y]
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 输入序列录制与回放
// ═══════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Clone)]
pub struct InputAction {
    pub action_type: String,  // "click" | "move" | "type" | "hotkey" | "scroll" | "wait"
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub button: Option<String>,
    pub text: Option<String>,
    pub keys: Option<String>,
    pub delta: Option<i32>,
    pub delay_ms: Option<u32>,
}

/// 回放输入序列
#[napi]
pub fn replay_input_sequence(actions: Vec<InputAction>) -> InputResult {
    #[cfg(windows)]
    {
        match replay_sequence_impl(&actions) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 原有 SendInput 函数（保留兼容）
// ═══════════════════════════════════════════════════════════════════════════

#[napi]
pub fn mouse_click(x: i32, y: i32, button: String) -> InputResult {
    #[cfg(windows)]
    {
        match mouse_click_impl(x, y, &button) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    { InputResult { success: false, error: Some("Requires Windows".into()) } }
}

#[napi]
pub fn mouse_double_click(x: i32, y: i32) -> InputResult {
    #[cfg(windows)]
    {
        if let Err(e) = mouse_click_impl(x, y, "left") {
            return InputResult { success: false, error: Some(e.to_string()) };
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
        match mouse_click_impl(x, y, "left") {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    { InputResult { success: false, error: Some("Requires Windows".into()) } }
}

#[napi]
pub fn mouse_move(x: i32, y: i32) -> InputResult {
    #[cfg(windows)]
    {
        match mouse_move_impl(x, y) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    { InputResult { success: false, error: Some("Requires Windows".into()) } }
}

#[napi]
pub fn mouse_scroll(delta: i32) -> InputResult {
    #[cfg(windows)]
    {
        match mouse_scroll_impl(delta) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    { InputResult { success: false, error: Some("Requires Windows".into()) } }
}

#[napi]
pub fn type_text(text: String) -> InputResult {
    #[cfg(windows)]
    {
        match type_text_impl(&text) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    { InputResult { success: false, error: Some("Requires Windows".into()) } }
}

#[napi]
pub fn send_hotkey(keys: String) -> InputResult {
    #[cfg(windows)]
    {
        match send_hotkey_impl(&keys) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    { InputResult { success: false, error: Some("Requires Windows".into()) } }
}

// ═══════════════════════════════════════════════════════════════════════════
// Win32 Implementations
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(windows)]
fn is_elevated_impl() -> bool {
    unsafe {
        let mut token = HANDLE::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION::default();
        let mut size = 0u32;
        let result = GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut elevation as *mut _ as *mut _),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut size,
        );
        let _ = CloseHandle(token);
        result.is_ok() && elevation.TokenIsElevated != 0
    }
}

#[cfg(windows)]
fn get_privilege_info_impl() -> PrivilegeInfo {
    let is_admin = is_elevated_impl();
    PrivilegeInfo {
        is_admin,
        is_system: false, // TODO: check for SYSTEM token
        integrity_level: if is_admin { "high".to_string() } else { "medium".to_string() },
        can_inject_input: true, // SendInput always works at same or lower integrity
        can_access_uipi: is_admin, // UIPI bypass requires admin
    }
}

#[cfg(windows)]
fn request_elevation_impl() -> anyhow::Result<()> {
    unsafe {
        let exe_path: Vec<u16> = {
            let mut buf = vec![0u16; 260];
            let len = windows::Win32::System::LibraryLoader::GetModuleFileNameW(None, &mut buf);
            buf.truncate(len as usize);
            buf
        };

        let verb: Vec<u16> = "runas\0".encode_utf16().collect();
        let result = windows::Win32::UI::Shell::ShellExecuteW(
            HWND::default(),
            windows::core::PCWSTR(verb.as_ptr()),
            windows::core::PCWSTR(exe_path.as_ptr()),
            None,
            None,
            windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL,
        );

        if (result.0 as usize) <= 32 {
            Err(anyhow::anyhow!("ShellExecuteW failed"))
        } else {
            Ok(())
        }
    }
}

#[cfg(windows)]
fn get_screen_metrics_impl() -> ScreenMetrics {
    unsafe {
        let phys_w = GetSystemMetrics(SM_CXSCREEN);
        let phys_h = GetSystemMetrics(SM_CYSCREEN);

        // 获取 DPI
        let hdc = windows::Win32::Graphics::Gdi::GetDC(HWND::default());
        let dpi_x = windows::Win32::Graphics::Gdi::GetDeviceCaps(hdc, windows::Win32::Graphics::Gdi::LOGPIXELSX) as u32;
        let dpi_y = windows::Win32::Graphics::Gdi::GetDeviceCaps(hdc, windows::Win32::Graphics::Gdi::LOGPIXELSY) as u32;
        windows::Win32::Graphics::Gdi::ReleaseDC(HWND::default(), hdc);

        let scale = dpi_x as f64 / 96.0;
        let log_w = (phys_w as f64 / scale) as i32;
        let log_h = (phys_h as f64 / scale) as i32;

        ScreenMetrics {
            physical_width: phys_w,
            physical_height: phys_h,
            logical_width: log_w,
            logical_height: log_h,
            dpi_x,
            dpi_y,
            scale_factor: scale,
        }
    }
}

// ─── 平滑鼠标移动 ──────────────────────────────────────────────────────────

#[cfg(windows)]
fn mouse_move_smooth_impl(target_x: i32, target_y: i32, duration_ms: u32, curve: &str) -> anyhow::Result<()> {
    unsafe {
        let mut current = POINT::default();
        windows::Win32::UI::WindowsAndMessaging::GetCursorPos(&mut current)?;

        let steps = (duration_ms / 10).max(5).min(200) as usize;
        let sleep_per_step = std::time::Duration::from_millis((duration_ms as u64) / steps as u64);

        let sx = current.x as f64;
        let sy = current.y as f64;
        let ex = target_x as f64;
        let ey = target_y as f64;

        for i in 1..=steps {
            let t = i as f64 / steps as f64;

            // 插值函数
            let eased_t = match curve {
                "linear" => t,
                "bezier" => {
                    // 三次贝塞尔：缓入缓出
                    let t2 = t * t;
                    let t3 = t2 * t;
                    3.0 * t2 - 2.0 * t3
                }
                _ => {
                    // ease (默认): 缓入缓出正弦
                    (1.0 - (t * std::f64::consts::PI).cos()) / 2.0
                }
            };

            let ix = (sx + (ex - sx) * eased_t) as i32;
            let iy = (sy + (ey - sy) * eased_t) as i32;

            mouse_move_impl(ix, iy)?;
            std::thread::sleep(sleep_per_step);
        }

        // 确保精确到达目标
        mouse_move_impl(target_x, target_y)?;
        Ok(())
    }
}

#[cfg(windows)]
fn mouse_click_at_current(button: &str) -> anyhow::Result<()> {
    unsafe {
        let (down_flag, up_flag) = match button {
            "right" => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            "middle" => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
            _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
        };
        let inputs = [
            INPUT { r#type: INPUT_MOUSE, Anonymous: INPUT_0 { mi: MOUSEINPUT { dwFlags: down_flag, ..Default::default() } } },
            INPUT { r#type: INPUT_MOUSE, Anonymous: INPUT_0 { mi: MOUSEINPUT { dwFlags: up_flag, ..Default::default() } } },
        ];
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        Ok(())
    }
}

// ─── 基础 SendInput 实现 ───────────────────────────────────────────────────

#[cfg(windows)]
fn mouse_move_impl(x: i32, y: i32) -> anyhow::Result<()> {
    unsafe {
        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);
        let abs_x = (x as f64 / screen_w as f64 * 65535.0) as i32;
        let abs_y = (y as f64 / screen_h as f64 * 65535.0) as i32;
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT { dx: abs_x, dy: abs_y, dwFlags: MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE, ..Default::default() },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        Ok(())
    }
}

#[cfg(windows)]
fn mouse_click_impl(x: i32, y: i32, button: &str) -> anyhow::Result<()> {
    mouse_move_impl(x, y)?;
    std::thread::sleep(std::time::Duration::from_millis(10));
    mouse_click_at_current(button)
}

#[cfg(windows)]
fn mouse_scroll_impl(delta: i32) -> anyhow::Result<()> {
    unsafe {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT { mouseData: (delta * 120) as u32, dwFlags: MOUSEEVENTF_WHEEL, ..Default::default() },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        Ok(())
    }
}

#[cfg(windows)]
fn type_text_impl(text: &str) -> anyhow::Result<()> {
    unsafe {
        let mut inputs = Vec::new();
        for ch in text.encode_utf16() {
            inputs.push(INPUT { r#type: INPUT_KEYBOARD, Anonymous: INPUT_0 { ki: KEYBDINPUT { wScan: ch, dwFlags: KEYEVENTF_UNICODE, ..Default::default() } } });
            inputs.push(INPUT { r#type: INPUT_KEYBOARD, Anonymous: INPUT_0 { ki: KEYBDINPUT { wScan: ch, dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, ..Default::default() } } });
        }
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        Ok(())
    }
}

#[cfg(windows)]
fn send_hotkey_impl(keys: &str) -> anyhow::Result<()> {
    let parts: Vec<String> = keys.split('+').map(|s| s.trim().to_lowercase()).collect();
    let mut vkeys = Vec::new();
    for part in &parts {
        let vk = match part.as_str() {
            "ctrl" | "control" => VK_CONTROL, "alt" => VK_MENU, "shift" => VK_SHIFT,
            "win" | "super" => VK_LWIN, "tab" => VK_TAB, "enter" | "return" => VK_RETURN,
            "esc" | "escape" => VK_ESCAPE, "space" => VK_SPACE, "backspace" => VK_BACK,
            "delete" | "del" => VK_DELETE, "home" => VK_HOME, "end" => VK_END,
            "pageup" => VK_PRIOR, "pagedown" => VK_NEXT,
            "up" => VK_UP, "down" => VK_DOWN, "left" => VK_LEFT, "right" => VK_RIGHT,
            "f1" => VK_F1, "f2" => VK_F2, "f3" => VK_F3, "f4" => VK_F4,
            "f5" => VK_F5, "f6" => VK_F6, "f7" => VK_F7, "f8" => VK_F8,
            "f9" => VK_F9, "f10" => VK_F10, "f11" => VK_F11, "f12" => VK_F12,
            s if s.len() == 1 => VIRTUAL_KEY(s.chars().next().unwrap().to_ascii_uppercase() as u16),
            _ => continue,
        };
        vkeys.push(vk);
    }
    unsafe {
        let mut inputs = Vec::new();
        for &vk in &vkeys {
            inputs.push(INPUT { r#type: INPUT_KEYBOARD, Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: vk, ..Default::default() } } });
        }
        for &vk in vkeys.iter().rev() {
            inputs.push(INPUT { r#type: INPUT_KEYBOARD, Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: vk, dwFlags: KEYEVENTF_KEYUP, ..Default::default() } } });
        }
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
    Ok(())
}

// ─── 输入序列回放 ──────────────────────────────────────────────────────────

#[cfg(windows)]
fn replay_sequence_impl(actions: &[InputAction]) -> anyhow::Result<()> {
    for action in actions {
        match action.action_type.as_str() {
            "click" => {
                let x = action.x.unwrap_or(0);
                let y = action.y.unwrap_or(0);
                let btn = action.button.clone().unwrap_or("left".into());
                mouse_click_impl(x, y, &btn)?;
            }
            "move" => {
                let x = action.x.unwrap_or(0);
                let y = action.y.unwrap_or(0);
                let dur = action.delay_ms.unwrap_or(200);
                mouse_move_smooth_impl(x, y, dur, "ease")?;
            }
            "type" => {
                if let Some(ref text) = action.text {
                    type_text_impl(text)?;
                }
            }
            "hotkey" => {
                if let Some(ref keys) = action.keys {
                    send_hotkey_impl(keys)?;
                }
            }
            "scroll" => {
                mouse_scroll_impl(action.delta.unwrap_or(3))?;
            }
            "wait" => {
                let ms = action.delay_ms.unwrap_or(100);
                std::thread::sleep(std::time::Duration::from_millis(ms as u64));
            }
            _ => {}
        }

        // 动作间默认间隔
        if action.action_type != "wait" {
            let gap = action.delay_ms.unwrap_or(50);
            std::thread::sleep(std::time::Duration::from_millis(gap as u64));
        }
    }
    Ok(())
}
