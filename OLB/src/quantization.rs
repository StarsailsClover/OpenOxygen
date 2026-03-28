/**
 * Quantization Module
 * 
 * Weight and activation quantization
 * Supports INT8, INT4, and custom bit widths
 */

use ndarray::Array2;

pub struct Quantizer {
    bits: u8,
    symmetric: bool,
}

impl Quantizer {
    pub fn new(bits: u8) -> Self {
        Self {
            bits,
            symmetric: true,
        }
    }

    pub fn quantize(&self, tensor: &Array2<f32>) -> QuantizedTensor {
        let min_val = tensor.iter().fold(f32::INFINITY, |a, &b| a.min(b));
        let max_val = tensor.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));

        let scale = if self.symmetric {
            max_val.abs().max(min_val.abs()) / ((1 << (self.bits - 1)) as f32 - 1.0)
        } else {
            (max_val - min_val) / ((1 << self.bits) as f32 - 1.0)
        };

        let zero_point = if self.symmetric {
            0.0
        } else {
            min_val
        };

        let quantized = tensor.map(|&v| {
            let q = ((v - zero_point) / scale).round() as i32;
            q.clamp(
                -(1 << (self.bits - 1)),
                (1 << (self.bits - 1)) - 1,
            ) as i8
        });

        QuantizedTensor {
            data: quantized,
            scale,
            zero_point,
            bits: self.bits,
        }
    }

    pub fn dequantize(&self, quantized: &QuantizedTensor) -> Array2<f32> {
        quantized.data.map(|&v| {
            v as f32 * quantized.scale + quantized.zero_point
        })
    }
}

pub struct QuantizedTensor {
    pub data: ndarray::Array2<i8>,
    pub scale: f32,
    pub zero_point: f32,
    pub bits: u8,
}
