"""
OLB Core Tests

Test suite for OLB Python bindings
"""

import pytest
import json
from olb import OLBCore, OLBConfig
from olb.config import LLAMA_3_8B, DEEPSEEK_MOE_67B


class TestOLBCore:
    """Test OLB Core functionality"""

    def test_create_instance(self):
        """Test creating OLB instance"""
        olb = OLBCore()
        assert olb is not None

    def test_initialize(self):
        """Test initialization with config"""
        olb = OLBCore()
        config = LLAMA_3_8B
        olb.initialize(config.to_json())

    def test_get_metrics(self):
        """Test getting metrics"""
        olb = OLBCore()
        config = LLAMA_3_8B
        olb.initialize(config.to_json())
        
        metrics = olb.get_metrics()
        assert metrics is not None
        
        data = json.loads(metrics)
        assert "attention" in data
        assert "moe" in data
        assert "kv_cache" in data
        assert "router" in data

    def test_optimize_for_model(self):
        """Test model optimization"""
        olb = OLBCore()
        config = LLAMA_3_8B
        olb.initialize(config.to_json())
        
        olb.optimize_for_model("llama")
        olb.optimize_for_model("deepseek")
        olb.optimize_for_model("mamba")


class TestModelConfig:
    """Test ModelConfig"""

    def test_default_config(self):
        """Test default configuration"""
        config = LLAMA_3_8B
        assert config.model_type == "llama"
        assert config.num_layers == 32
        assert config.num_heads == 32

    def test_to_json(self):
        """Test JSON serialization"""
        config = LLAMA_3_8B
        json_str = config.to_json()
        
        data = json.loads(json_str)
        assert data["model_type"] == "llama"
        assert data["num_layers"] == 32

    def test_from_json(self):
        """Test JSON deserialization"""
        config = LLAMA_3_8B
        json_str = config.to_json()
        
        restored = type(config).from_json(json_str)
        assert restored.model_type == config.model_type
        assert restored.num_layers == config.num_layers


class TestPredefinedConfigs:
    """Test predefined configurations"""

    def test_llama_3_8b(self):
        """Test Llama 3 8B config"""
        config = LLAMA_3_8B
        assert config.num_layers == 32
        assert config.max_seq_len == 8192

    def test_llama_3_70b(self):
        """Test Llama 3 70B config"""
        from olb.config import LLAMA_3_70B
        config = LLAMA_3_70B
        assert config.num_layers == 80
        assert config.max_seq_len == 32768

    def test_deepseek_moe(self):
        """Test DeepSeek MoE config"""
        config = DEEPSEEK_MOE_67B
        assert config.model_type == "deepseek"
        assert config.num_experts == 64
        assert config.top_k == 6


class TestPerformance:
    """Performance benchmarks"""

    @pytest.mark.benchmark
    def test_initialization_performance(self, benchmark):
        """Benchmark initialization"""
        olb = OLBCore()
        config = LLAMA_3_8B
        
        result = benchmark(olb.initialize, config.to_json())
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
