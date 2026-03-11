//! 剪贴板操作 — Win32 Clipboard API

use napi::bindgen_prelude::*;

#[cfg(windows)]
use windows::Win32::System::DataExchange::*;
#[cfg(windows)]
use windows::Win32::System::Ole::CF_UNICODETEXT;
#[cfg(windows)]
use windows::Win32::Foundation::*;
#[cfg(windows)]
use windows::Win32::System::Memory::*;

use super::input::InputResult;

/// 读取剪贴板文本
#[napi]
pub fn clipboard_get_text() -> Result<Option<String>> {
    #[cfg(windows)]
    {
        clipboard_get_text_impl().map_err(|e| napi::Error::from_reason(e.to_string()))
    }
    #[cfg(not(windows))]
    {
        Ok(None)
    }
}

/// 写入文本到剪贴板
#[napi]
pub fn clipboard_set_text(text: String) -> InputResult {
    #[cfg(windows)]
    {
        match clipboard_set_text_impl(&text) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

#[cfg(windows)]
fn clipboard_get_text_impl() -> anyhow::Result<Option<String>> {
    unsafe {
        OpenClipboard(HWND::default())
            .map_err(|e| anyhow::anyhow!("Failed to open clipboard: {}", e))?;

        let result = match GetClipboardData(CF_UNICODETEXT.0 as u32) {
            Ok(h) => {
                let hmem = HGLOBAL(h.0);
                let ptr = GlobalLock(hmem) as *const u16;
                if ptr.is_null() {
                    Ok(None)
                } else {
                    let mut len = 0;
                    while *ptr.add(len) != 0 {
                        len += 1;
                    }
                    let slice = std::slice::from_raw_parts(ptr, len);
                    let text = String::from_utf16_lossy(slice);
                    let _ = GlobalUnlock(hmem);
                    Ok(Some(text))
                }
            }
            Err(_) => Ok(None),
        };

        let _ = CloseClipboard();
        result
    }
}

#[cfg(windows)]
fn clipboard_set_text_impl(text: &str) -> anyhow::Result<()> {
    unsafe {
        let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
        let byte_len = wide.len() * 2;

        let hmem = GlobalAlloc(GMEM_MOVEABLE, byte_len)
            .map_err(|e| anyhow::anyhow!("GlobalAlloc failed: {}", e))?;
        let ptr = GlobalLock(hmem) as *mut u16;
        if ptr.is_null() {
            let _ = GlobalFree(hmem);
            return Err(anyhow::anyhow!("GlobalLock failed"));
        }
        std::ptr::copy_nonoverlapping(wide.as_ptr(), ptr, wide.len());
        let _ = GlobalUnlock(hmem);

        OpenClipboard(HWND::default())
            .map_err(|e| anyhow::anyhow!("Failed to open clipboard: {}", e))?;

        let _ = EmptyClipboard();
        SetClipboardData(CF_UNICODETEXT.0 as u32, HANDLE(hmem.0))
            .map_err(|e| anyhow::anyhow!("SetClipboardData failed: {}", e))?;
        let _ = CloseClipboard();

        Ok(())
    }
}
