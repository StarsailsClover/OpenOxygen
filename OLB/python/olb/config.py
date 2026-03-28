"""
OLB Configuration

Configuration management for OLB Core
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
import json


@dataclass
class ModelCapability:
    """Model capability definition"""
    capability_type: str
    score: float


@dataclass
class ModelConfig:
    """Model configuration"""
    model_type: str = "llama"
    num_layers: int = 32
    num_heads: int = 32
    head_dim: int = 128
    max_seq_len: int = 32768
    num_experts: int = 8
    top_k: int = 2
    quantization_bits: int = 3
    page_size: int = 4096
    max_gpu_pages: int = 1024
    max_cpu_pages: int = 4096

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps({
            "model_type": self.model_type,
            "num_layers": self.num_layers,
            "num_heads": self.num_heads,
            "head_dim": self.head_dim,
            "max_seq_len": self.max_seq_len,
            "num_experts": self.num_experts,
            "top_k": self.top_k,
            "quantization_bits": self.quantization_bits,
            "page_size": self.page_size,
            "max_gpu_pages": self.max_gpu_pages,
            "max_cpu_pages": self.max_cpu_pages,
        })

    @classmethod
    def from_json(cls, json_str: str) -> "ModelConfig":
        """Create from JSON string"""
        data = json.loads(json_str)
        return cls(**data)


@dataclass
class OLBConfig:
    """OLB Core configuration"""
    model_config: ModelConfig
    use_cuda: bool = True
    use_flash_attention: bool = True
    use_moe: bool = True
    use_kv_compression: bool = True
    use_paged_memory: bool = True
    log_level: str = "info"

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps({
            "model_config": json.loads(self.model_config.to_json()),
            "use_cuda": self.use_cuda,
            "use_flash_attention": self.use_flash_attention,
            "use_moe": self.use_moe,
            "use_kv_compression": self.use_kv_compression,
            "use_paged_memory": self.use_paged_memory,
            "log_level": self.log_level,
        })


# Predefined configurations
LLAMA_3_8B = ModelConfig(
    model_type="llama",
    num_layers=32,
    num_heads=32,
    head_dim=128,
    max_seq_len=8192,
)

LLAMA_3_70B = ModelConfig(
    model_type="llama",
    num_layers=80,
    num_heads=64,
    head_dim=128,
    max_seq_len=32768,
)

DEEPSEEK_MOE_67B = ModelConfig(
    model_type="deepseek",
    num_layers=64,
    num_heads=128,
    head_dim=128,
    max_seq_len=32768,
    num_experts=64,
    top_k=6,
)

QWEN_3_72B = ModelConfig(
    model_type="qwen",
    num_layers=80,
    num_heads=64,
    head_dim=128,
    max_seq_len=32768,
)
