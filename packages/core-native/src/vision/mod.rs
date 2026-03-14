//! 视觉处理管道 — 图像预处理、UI 元素检测、UI Automation
//!
//! 三层检测架构：
//! 1. UI Automation (精确层) — Win32 UIA API，标准控件 100% 准确
//! 2. 图像处理 (快速层) — Rust 原生 Sobel/连通域，自绘控件检测
//! 3. 视觉大模型 (理解层) — 由 TS 层调用 LLM，语义级理解
//!
//! 高性能图像操作：裁剪、缩放、灰度化、边缘检测、差异比较、
//! 连通域分析、自适应阈值、模板匹配。

pub mod mod;
pub mod ui_automation;
pub mod ui_automation_fast;

use napi::bindgen_prelude::*;
use image::{GenericImageView, ImageBuffer, GrayImage, Luma, Pixel};

// ─── Re-export UI Automation ────────────────────────────────────────────────
pub use ui_automation::*;

/// 图像元数据
#[napi(object)]
pub struct ImageMeta {
    pub width: u32,
    pub height: u32,
    pub channels: u32,
    pub size_bytes: u32,
}

#[napi]
pub fn get_image_meta(path: String) -> Result<ImageMeta> {
    let img = image::open(&path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let (w, h) = img.dimensions();
    let channels = img.color().channel_count() as u32;
    let size = std::fs::metadata(&path).map(|m| m.len() as u32).unwrap_or(0);
    Ok(ImageMeta { width: w, height: h, channels, size_bytes: size })
}

#[napi]
pub fn crop_image(input_path: String, output_path: String, x: u32, y: u32, width: u32, height: u32) -> Result<bool> {
    let img = image::open(&input_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    img.crop_imm(x, y, width, height).save(&output_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(true)
}

#[napi]
pub fn resize_image(input_path: String, output_path: String, width: u32, height: u32) -> Result<bool> {
    let img = image::open(&input_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    img.resize_exact(width, height, image::imageops::FilterType::Lanczos3).save(&output_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(true)
}

#[napi]
pub fn to_grayscale(input_path: String, output_path: String) -> Result<bool> {
    let img = image::open(&input_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    img.grayscale().save(&output_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(true)
}

#[napi]
pub fn image_diff_percent(path_a: String, path_b: String) -> Result<f64> {
    let a = image::open(&path_a).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let b = image::open(&path_b).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let (wa, ha) = a.dimensions();
    let (wb, hb) = b.dimensions();
    if wa != wb || ha != hb {
        return Err(napi::Error::from_reason("Images must have same dimensions"));
    }
    let ra = a.to_rgba8();
    let rb = b.to_rgba8();
    let total = (wa * ha) as f64;
    let mut diff = 0u64;
    for (pa, pb) in ra.pixels().zip(rb.pixels()) {
        let dr = (pa[0] as i16 - pb[0] as i16).unsigned_abs();
        let dg = (pa[1] as i16 - pb[1] as i16).unsigned_abs();
        let db = (pa[2] as i16 - pb[2] as i16).unsigned_abs();
        if dr > 30 || dg > 30 || db > 30 { diff += 1; }
    }
    Ok(diff as f64 / total * 100.0)
}

// ═══════════════════════════════════════════════════════════════════════════
// 高级视觉算法
// ═══════════════════════════════════════════════════════════════════════════

/// Sobel 边缘检测 + 自适应阈值二值化
#[napi]
pub fn detect_edges(input_path: String, output_path: String, threshold: Option<u32>) -> Result<bool> {
    let img = image::open(&input_path).map_err(|e| napi::Error::from_reason(e.to_string()))?.to_luma8();
    let (w, h) = img.dimensions();
    let mut output: GrayImage = ImageBuffer::new(w, h);
    let thresh = threshold.unwrap_or(0) as u8; // 0 = 自适应

    let mut magnitudes = vec![0u16; (w * h) as usize];
    let mut max_mag: u16 = 0;

    for y in 1..(h - 1) {
        for x in 1..(w - 1) {
            let gx: i32 =
                -1 * img.get_pixel(x-1, y-1)[0] as i32 + 1 * img.get_pixel(x+1, y-1)[0] as i32
              + -2 * img.get_pixel(x-1, y  )[0] as i32 + 2 * img.get_pixel(x+1, y  )[0] as i32
              + -1 * img.get_pixel(x-1, y+1)[0] as i32 + 1 * img.get_pixel(x+1, y+1)[0] as i32;
            let gy: i32 =
                -1 * img.get_pixel(x-1, y-1)[0] as i32 + -2 * img.get_pixel(x, y-1)[0] as i32 + -1 * img.get_pixel(x+1, y-1)[0] as i32
              +  1 * img.get_pixel(x-1, y+1)[0] as i32 +  2 * img.get_pixel(x, y+1)[0] as i32 +  1 * img.get_pixel(x+1, y+1)[0] as i32;
            let mag = ((gx * gx + gy * gy) as f64).sqrt().min(65535.0) as u16;
            magnitudes[(y * w + x) as usize] = mag;
            if mag > max_mag { max_mag = mag; }
        }
    }

    // 自适应阈值：Otsu 方法
    let effective_thresh = if thresh == 0 {
        otsu_threshold(&magnitudes, max_mag)
    } else {
        thresh as u16
    };

    for y in 0..h {
        for x in 0..w {
            let mag = magnitudes[(y * w + x) as usize];
            let val = if mag >= effective_thresh { 255 } else { 0 };
            output.put_pixel(x, y, Luma([val]));
        }
    }

    output.save(&output_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(true)
}

/// Otsu 自适应阈值算法
fn otsu_threshold(data: &[u16], max_val: u16) -> u16 {
    if max_val == 0 { return 0; }
    let bins = 256usize;
    let mut histogram = vec![0u64; bins];
    let scale = max_val as f64 / 255.0;

    for &v in data {
        let bin = ((v as f64 / scale).min(255.0)) as usize;
        histogram[bin] += 1;
    }

    let total = data.len() as f64;
    let mut sum_total = 0.0f64;
    for (i, &count) in histogram.iter().enumerate() {
        sum_total += i as f64 * count as f64;
    }

    let mut sum_bg = 0.0f64;
    let mut weight_bg = 0.0f64;
    let mut max_variance = 0.0f64;
    let mut best_threshold = 0usize;

    for (t, &count) in histogram.iter().enumerate() {
        weight_bg += count as f64;
        if weight_bg == 0.0 { continue; }
        let weight_fg = total - weight_bg;
        if weight_fg == 0.0 { break; }
        sum_bg += t as f64 * count as f64;
        let mean_bg = sum_bg / weight_bg;
        let mean_fg = (sum_total - sum_bg) / weight_fg;
        let variance = weight_bg * weight_fg * (mean_bg - mean_fg).powi(2);
        if variance > max_variance {
            max_variance = variance;
            best_threshold = t;
        }
    }

    (best_threshold as f64 * scale) as u16
}

/// 连通域分析 — 检测矩形 UI 区域
#[napi(object)]
#[derive(Clone)]
pub struct DetectedRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub area: i32,
    pub aspect_ratio: f64,
    pub label: String,
}

/// 基于边缘图的连通域分析，提取矩形区域
#[napi]
pub fn detect_connected_regions(
    edge_image_path: String,
    min_area: Option<i32>,
    max_regions: Option<i32>,
) -> Result<Vec<DetectedRegion>> {
    let img = image::open(&edge_image_path).map_err(|e| napi::Error::from_reason(e.to_string()))?.to_luma8();
    let (w, h) = img.dimensions();
    let min_a = min_area.unwrap_or(200) as u32;
    let max_r = max_regions.unwrap_or(100) as usize;

    // 简单的两遍连通域标记 (4-连通)
    let mut labels = vec![0u32; (w * h) as usize];
    let mut next_label = 1u32;
    let mut equivalences: Vec<u32> = vec![0]; // index 0 unused

    // 第一遍：标记
    for y in 0..h {
        for x in 0..w {
            if img.get_pixel(x, y)[0] == 0 { continue; }
            let idx = (y * w + x) as usize;
            let left = if x > 0 { labels[(y * w + x - 1) as usize] } else { 0 };
            let top = if y > 0 { labels[((y - 1) * w + x) as usize] } else { 0 };

            if left == 0 && top == 0 {
                labels[idx] = next_label;
                equivalences.push(next_label);
                next_label += 1;
            } else if left != 0 && top == 0 {
                labels[idx] = left;
            } else if left == 0 && top != 0 {
                labels[idx] = top;
            } else {
                let min_l = left.min(top);
                labels[idx] = min_l;
                // 合并等价类
                let max_l = left.max(top);
                let root_min = find_root(&equivalences, min_l);
                let root_max = find_root(&equivalences, max_l);
                if root_min != root_max {
                    equivalences[root_max as usize] = root_min;
                }
            }
        }
    }

    // 第二遍：解析等价类，计算边界框
    let mut bboxes: std::collections::HashMap<u32, (i32, i32, i32, i32)> = std::collections::HashMap::new();

    for y in 0..h {
        for x in 0..w {
            let idx = (y * w + x) as usize;
            if labels[idx] == 0 { continue; }
            let root = find_root(&equivalences, labels[idx]);
            labels[idx] = root;

            let entry = bboxes.entry(root).or_insert((x as i32, y as i32, x as i32, y as i32));
            entry.0 = entry.0.min(x as i32);
            entry.1 = entry.1.min(y as i32);
            entry.2 = entry.2.max(x as i32);
            entry.3 = entry.3.max(y as i32);
        }
    }

    let mut regions: Vec<DetectedRegion> = bboxes.values()
        .filter_map(|&(x1, y1, x2, y2)| {
            let w = x2 - x1 + 1;
            let h = y2 - y1 + 1;
            let area = w * h;
            if (area as u32) < min_a { return None; }
            let aspect = w as f64 / h.max(1) as f64;
            // 过滤掉极端长条形（可能是边框线）
            if aspect > 20.0 || aspect < 0.05 { return None; }
            Some(DetectedRegion {
                x: x1, y: y1, width: w, height: h,
                area, aspect_ratio: aspect,
                label: classify_region(w, h, aspect),
            })
        })
        .collect();

    regions.sort_by(|a, b| b.area.cmp(&a.area));
    regions.truncate(max_r);
    Ok(regions)
}

fn find_root(eq: &[u32], mut label: u32) -> u32 {
    while eq[label as usize] != label {
        label = eq[label as usize];
    }
    label
}

fn classify_region(w: i32, h: i32, aspect: f64) -> String {
    if w < 60 && h < 60 { return "icon".to_string(); }
    if aspect > 2.5 && h < 50 { return "toolbar".to_string(); }
    if aspect > 1.5 && h < 45 { return "button".to_string(); }
    if aspect > 3.0 { return "input".to_string(); }
    if w > 300 && h > 200 { return "panel".to_string(); }
    "element".to_string()
}

/// 快速模板匹配 — 在截图中定位小图标/按钮
#[napi(object)]
pub struct TemplateMatch {
    pub x: i32,
    pub y: i32,
    pub score: f64,
}

#[napi]
pub fn template_match(
    screenshot_path: String,
    template_path: String,
    threshold: Option<f64>,
) -> Result<Vec<TemplateMatch>> {
    let screen = image::open(&screenshot_path).map_err(|e| napi::Error::from_reason(e.to_string()))?.to_luma8();
    let tmpl = image::open(&template_path).map_err(|e| napi::Error::from_reason(e.to_string()))?.to_luma8();
    let (sw, sh) = screen.dimensions();
    let (tw, th) = tmpl.dimensions();
    let thresh = threshold.unwrap_or(0.8);

    if tw > sw || th > sh {
        return Ok(vec![]);
    }

    let mut matches = Vec::new();

    // 归一化互相关 (NCC)
    let tmpl_mean = pixel_mean(&tmpl);
    let tmpl_std = pixel_std(&tmpl, tmpl_mean);
    if tmpl_std < 1.0 { return Ok(vec![]); }

    // 步长优化：先粗搜再细搜
    let step = 2u32;
    for sy in (0..=(sh - th)).step_by(step as usize) {
        for sx in (0..=(sw - tw)).step_by(step as usize) {
            let score = ncc_score(&screen, &tmpl, sx, sy, tmpl_mean, tmpl_std);
            if score >= thresh {
                matches.push(TemplateMatch { x: sx as i32, y: sy as i32, score });
            }
        }
    }

    // 非极大值抑制
    matches.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    let suppressed = nms(&matches, tw.max(th) as i32 / 2);
    Ok(suppressed)
}

fn pixel_mean(img: &GrayImage) -> f64 {
    let sum: f64 = img.pixels().map(|p| p[0] as f64).sum();
    sum / img.pixels().count() as f64
}

fn pixel_std(img: &GrayImage, mean: f64) -> f64 {
    let var: f64 = img.pixels().map(|p| (p[0] as f64 - mean).powi(2)).sum();
    (var / img.pixels().count() as f64).sqrt()
}

fn ncc_score(screen: &GrayImage, tmpl: &GrayImage, ox: u32, oy: u32, tmpl_mean: f64, tmpl_std: f64) -> f64 {
    let (tw, th) = tmpl.dimensions();
    let n = (tw * th) as f64;
    let mut sum = 0.0f64;
    let mut screen_sum = 0.0f64;
    let mut screen_sq_sum = 0.0f64;

    for dy in 0..th {
        for dx in 0..tw {
            let sv = screen.get_pixel(ox + dx, oy + dy)[0] as f64;
            let tv = tmpl.get_pixel(dx, dy)[0] as f64;
            sum += sv * tv;
            screen_sum += sv;
            screen_sq_sum += sv * sv;
        }
    }

    let screen_mean = screen_sum / n;
    let screen_std = ((screen_sq_sum / n) - screen_mean.powi(2)).max(0.0).sqrt();
    if screen_std < 1.0 { return 0.0; }

    (sum / n - screen_mean * tmpl_mean) / (screen_std * tmpl_std)
}

fn nms(matches: &[TemplateMatch], radius: i32) -> Vec<TemplateMatch> {
    let mut result = Vec::new();
    for m in matches {
        let dominated = result.iter().any(|r: &TemplateMatch| {
            (r.x - m.x).abs() < radius && (r.y - m.y).abs() < radius
        });
        if !dominated {
            result.push(TemplateMatch { x: m.x, y: m.y, score: m.score });
        }
    }
    result
}
