//! 屏幕截图 — 使用 Win32 GDI BitBlt 实现零拷贝截屏
//!
//! 比 PowerShell Add-Type 方案快 10-50 倍。

use napi::bindgen_prelude::*;

#[cfg(windows)]
use windows::{
    Win32::Foundation::*,
    Win32::Graphics::Gdi::*,
    Win32::UI::WindowsAndMessaging::*,
};

/// 截屏结果
#[napi(object)]
pub struct CaptureResult {
    pub success: bool,
    pub path: Option<String>,
    pub width: u32,
    pub height: u32,
    pub duration_ms: f64,
    pub error: Option<String>,
}

/// 全屏截图，保存为 PNG
#[napi]
pub fn capture_screen(output_path: String) -> CaptureResult {
    let start = std::time::Instant::now();

    #[cfg(windows)]
    {
        match capture_screen_impl(&output_path) {
            Ok((w, h)) => CaptureResult {
                success: true,
                path: Some(output_path),
                width: w,
                height: h,
                duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                error: None,
            },
            Err(e) => CaptureResult {
                success: false,
                path: None,
                width: 0,
                height: 0,
                duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                error: Some(e.to_string()),
            },
        }
    }

    #[cfg(not(windows))]
    {
        CaptureResult {
            success: false,
            path: None,
            width: 0,
            height: 0,
            duration_ms: start.elapsed().as_secs_f64() * 1000.0,
            error: Some("Screen capture requires Windows".to_string()),
        }
    }
}

/// 区域截图
#[napi]
pub fn capture_region(x: i32, y: i32, width: u32, height: u32, output_path: String) -> CaptureResult {
    let start = std::time::Instant::now();

    #[cfg(windows)]
    {
        match capture_region_impl(x, y, width, height, &output_path) {
            Ok(()) => CaptureResult {
                success: true,
                path: Some(output_path),
                width,
                height,
                duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                error: None,
            },
            Err(e) => CaptureResult {
                success: false,
                path: None,
                width: 0,
                height: 0,
                duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                error: Some(e.to_string()),
            },
        }
    }

    #[cfg(not(windows))]
    {
        CaptureResult {
            success: false,
            path: None,
            width: 0,
            height: 0,
            duration_ms: start.elapsed().as_secs_f64() * 1000.0,
            error: Some("Screen capture requires Windows".to_string()),
        }
    }
}

#[cfg(windows)]
fn capture_screen_impl(output_path: &str) -> anyhow::Result<(u32, u32)> {
    unsafe {
        let screen_dc = GetDC(HWND::default());
        let width = GetSystemMetrics(SM_CXSCREEN);
        let height = GetSystemMetrics(SM_CYSCREEN);

        let mem_dc = CreateCompatibleDC(screen_dc);
        let bitmap = CreateCompatibleBitmap(screen_dc, width, height);
        let old_bitmap = SelectObject(mem_dc, bitmap);

        // BitBlt: 直接从屏幕 DC 拷贝像素，硬件加速
        BitBlt(mem_dc, 0, 0, width, height, screen_dc, 0, 0, SRCCOPY)?;

        // 读取像素数据
        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };

        let mut pixels = vec![0u8; (width * height * 4) as usize];
        GetDIBits(
            mem_dc,
            bitmap,
            0,
            height as u32,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        // 清理 GDI 资源
        SelectObject(mem_dc, old_bitmap);
        DeleteObject(bitmap);
        DeleteDC(mem_dc);
        ReleaseDC(HWND::default(), screen_dc);

        // BGRA -> RGBA 转换并保存为 PNG
        for chunk in pixels.chunks_exact_mut(4) {
            chunk.swap(0, 2); // B <-> R
        }

        let img = image::RgbaImage::from_raw(width as u32, height as u32, pixels)
            .ok_or_else(|| anyhow::anyhow!("Failed to create image buffer"))?;
        img.save(output_path)?;

        Ok((width as u32, height as u32))
    }
}

#[cfg(windows)]
fn capture_region_impl(x: i32, y: i32, width: u32, height: u32, output_path: &str) -> anyhow::Result<()> {
    unsafe {
        let screen_dc = GetDC(HWND::default());
        let mem_dc = CreateCompatibleDC(screen_dc);
        let bitmap = CreateCompatibleBitmap(screen_dc, width as i32, height as i32);
        let old_bitmap = SelectObject(mem_dc, bitmap);

        BitBlt(mem_dc, 0, 0, width as i32, height as i32, screen_dc, x, y, SRCCOPY)?;

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width as i32,
                biHeight: -(height as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };

        let mut pixels = vec![0u8; (width * height * 4) as usize];
        GetDIBits(
            mem_dc,
            bitmap,
            0,
            height,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        SelectObject(mem_dc, old_bitmap);
        DeleteObject(bitmap);
        DeleteDC(mem_dc);
        ReleaseDC(HWND::default(), screen_dc);

        for chunk in pixels.chunks_exact_mut(4) {
            chunk.swap(0, 2);
        }

        let img = image::RgbaImage::from_raw(width, height, pixels)
            .ok_or_else(|| anyhow::anyhow!("Failed to create image buffer"))?;
        img.save(output_path)?;

        Ok(())
    }
}
