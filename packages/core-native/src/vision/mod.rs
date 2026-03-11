//! 视觉处理管道 — 图像预处理、UI 元素检测辅助
//!
//! 高性能图像操作：裁剪、缩放、灰度化、边缘检测、差异比较。
//! 为 OxygenUltraVision 的 fast pipeline 提供底层加速。

use napi::bindgen_prelude::*;
use image::{GenericImageView, ImageBuffer};

/// 图像元数据
#[napi(object)]
pub struct ImageMeta {
    pub width: u32,
    pub height: u32,
    pub channels: u32,
    pub size_bytes: u32,
}

/// 获取图像元数据
#[napi]
pub fn get_image_meta(path: String) -> Result<ImageMeta> {
    let img = image::open(&path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let (w, h) = img.dimensions();
    let channels = img.color().channel_count() as u32;
    let size = std::fs::metadata(&path)
        .map(|m| m.len() as u32)
        .unwrap_or(0);

    Ok(ImageMeta {
        width: w,
        height: h,
        channels,
        size_bytes: size,
    })
}

/// 裁剪图像区域并保存
#[napi]
pub fn crop_image(
    input_path: String,
    output_path: String,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<bool> {
    let img = image::open(&input_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let cropped = img.crop_imm(x, y, width, height);
    cropped
        .save(&output_path)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(true)
}

/// 缩放图像
#[napi]
pub fn resize_image(
    input_path: String,
    output_path: String,
    width: u32,
    height: u32,
) -> Result<bool> {
    let img = image::open(&input_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let resized = img.resize_exact(width, height, image::imageops::FilterType::Lanczos3);
    resized
        .save(&output_path)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(true)
}

/// 转灰度图
#[napi]
pub fn to_grayscale(input_path: String, output_path: String) -> Result<bool> {
    let img = image::open(&input_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let gray = img.grayscale();
    gray.save(&output_path)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(true)
}

/// 计算两张图片的像素差异百分比（用于变化检测）
#[napi]
pub fn image_diff_percent(path_a: String, path_b: String) -> Result<f64> {
    let img_a = image::open(&path_a).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let img_b = image::open(&path_b).map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let (w_a, h_a) = img_a.dimensions();
    let (w_b, h_b) = img_b.dimensions();

    if w_a != w_b || h_a != h_b {
        return Err(napi::Error::from_reason("Images must have same dimensions"));
    }

    let rgba_a = img_a.to_rgba8();
    let rgba_b = img_b.to_rgba8();

    let total_pixels = (w_a * h_a) as f64;
    let mut diff_pixels = 0u64;
    let threshold = 30u8; // Per-channel difference threshold

    for (pa, pb) in rgba_a.pixels().zip(rgba_b.pixels()) {
        let dr = (pa[0] as i16 - pb[0] as i16).unsigned_abs() as u8;
        let dg = (pa[1] as i16 - pb[1] as i16).unsigned_abs() as u8;
        let db = (pa[2] as i16 - pb[2] as i16).unsigned_abs() as u8;

        if dr > threshold || dg > threshold || db > threshold {
            diff_pixels += 1;
        }
    }

    Ok(diff_pixels as f64 / total_pixels * 100.0)
}

/// 简单边缘检测（Sobel 算子），用于 UI 元素边界识别
#[napi]
pub fn detect_edges(input_path: String, output_path: String) -> Result<bool> {
    let img = image::open(&input_path)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?
        .to_luma8();

    let (w, h) = img.dimensions();
    let mut output = ImageBuffer::new(w, h);

    for y in 1..(h - 1) {
        for x in 1..(w - 1) {
            // Sobel kernels
            let gx: i32 = -1 * img.get_pixel(x - 1, y - 1)[0] as i32
                + 1 * img.get_pixel(x + 1, y - 1)[0] as i32
                + -2 * img.get_pixel(x - 1, y)[0] as i32
                + 2 * img.get_pixel(x + 1, y)[0] as i32
                + -1 * img.get_pixel(x - 1, y + 1)[0] as i32
                + 1 * img.get_pixel(x + 1, y + 1)[0] as i32;

            let gy: i32 = -1 * img.get_pixel(x - 1, y - 1)[0] as i32
                + -2 * img.get_pixel(x, y - 1)[0] as i32
                + -1 * img.get_pixel(x + 1, y - 1)[0] as i32
                + 1 * img.get_pixel(x - 1, y + 1)[0] as i32
                + 2 * img.get_pixel(x, y + 1)[0] as i32
                + 1 * img.get_pixel(x + 1, y + 1)[0] as i32;

            let magnitude = ((gx * gx + gy * gy) as f64).sqrt().min(255.0) as u8;
            output.put_pixel(x, y, image::Luma([magnitude]));
        }
    }

    output
        .save(&output_path)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(true)
}

/// 提取图像中的高对比度矩形区域（潜在 UI 元素）
#[napi(object)]
pub struct DetectedRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub avg_intensity: f64,
}

#[napi]
pub fn detect_ui_regions(
    input_path: String,
    min_width: Option<u32>,
    min_height: Option<u32>,
) -> Result<Vec<DetectedRegion>> {
    let img = image::open(&input_path)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?
        .to_luma8();

    let (w, h) = img.dimensions();
    let min_w = min_width.unwrap_or(20);
    let min_h = min_height.unwrap_or(10);
    let grid_size = 16u32;

    let mut regions = Vec::new();

    // Grid-based intensity analysis
    for gy in (0..h).step_by(grid_size as usize) {
        for gx in (0..w).step_by(grid_size as usize) {
            let bw = grid_size.min(w - gx);
            let bh = grid_size.min(h - gy);

            let mut sum = 0u64;
            let mut count = 0u64;
            let mut edge_count = 0u64;

            for dy in 0..bh {
                for dx in 0..bw {
                    let px = img.get_pixel(gx + dx, gy + dy)[0];
                    sum += px as u64;
                    count += 1;

                    // Check if this pixel is an edge (high gradient)
                    if dx > 0 && dy > 0 {
                        let left = img.get_pixel(gx + dx - 1, gy + dy)[0] as i32;
                        let top = img.get_pixel(gx + dx, gy + dy - 1)[0] as i32;
                        let curr = px as i32;
                        if (curr - left).abs() > 40 || (curr - top).abs() > 40 {
                            edge_count += 1;
                        }
                    }
                }
            }

            let avg = sum as f64 / count.max(1) as f64;
            let edge_density = edge_count as f64 / count.max(1) as f64;

            // High edge density = likely UI element boundary
            if edge_density > 0.15 && bw >= min_w && bh >= min_h {
                regions.push(DetectedRegion {
                    x: gx,
                    y: gy,
                    width: bw,
                    height: bh,
                    avg_intensity: avg,
                });
            }
        }
    }

    Ok(regions)
}
