"""
OLB - OpenOxygen Lightning Backend

Universal LLM Acceleration Engine

Features:
- OxygenFlashAttention V3
- Universal MoE Optimization
- KV Cache Compression (TurboQuant)
- Paged Memory Management
- Multi-Model Fusion
"""

from .core import OLBCore
from .config import OLBConfig

__version__ = "26w13a-main-26.103.0"
__all__ = ["OLBCore", "OLBConfig"]
