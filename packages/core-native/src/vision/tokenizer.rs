//! Vision Tokenizer — 将屏幕截图和 UI 元素转换为模型可理解的 Token

use napi::bindgen_prelude::*;
use image::GenericImageView;

/// 压缩后的图像数据
#[napi(object)]
pub struct CompressedImage {
    pub data: Buffer,
    pub format: String,
    pub original_width: u32,
    pub original_height: u32,
    pub compressed_width: u32,
    pub compressed_height: u32,
    pub compression_ratio: f64,
}

/// 将截图压缩为模型输入格式
#[napi]
pub fn compress_screenshot(
    input_path: String,
    max_dimension: Option<u32>,
    quality: Option<u8>,
) -> Result<CompressedImage> {
    let max_dim = max_dimension.unwrap_or(1024);
    let q = quality.unwrap_or(85);

    let img = image::open(&input_path)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let (orig_w, orig_h) = img.dimensions();

    let scale = if orig_w > orig_h {
        max_dim as f32 / orig_w as f32
    } else {
        max_dim as f32 / orig_h as f32
    };

    let new_w = (orig_w as f32 * scale) as u32;
    let new_h = (orig_h as f32 * scale) as u32;

    let resized = img.resize(new_w, new_h, image::imageops::FilterType::Lanczos3);

    let mut buffer = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, q);
    encoder
        .encode_image(&resized)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let compression_ratio = (orig_w * orig_h) as f64 / (new_w * new_h) as f64;

    Ok(CompressedImage {
        data: Buffer::from(buffer),
        format: "jpeg".to_string(),
        original_width: orig_w,
        original_height: orig_h,
        compressed_width: new_w,
        compressed_height: new_h,
        compression_ratio,
    })
}

/// 将压缩图像转为 Base64
#[napi]
pub fn image_to_base64(data: Buffer) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine};
    STANDARD.encode(data.as_ref())
}
