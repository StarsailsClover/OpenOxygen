/**
 * Model Router
 * 
 * Intelligent routing for multi-model inference:
 * - Dynamic model selection
 * - Load balancing
 * - Cost optimization
 * - Latency optimization
 */

use std::collections::HashMap;

pub struct ModelRouter {
    models: HashMap<String, ModelInfo>,
    routing_strategy: RoutingStrategy,
    metrics: RouterMetrics,
}

#[derive(Default)]
pub struct RouterMetrics {
    pub total_requests: u64,
    pub avg_latency_ms: f64,
    pub cost_savings: f64,
}

pub struct ModelInfo {
    id: String,
    name: String,
    provider: String,
    capabilities: Vec<ModelCapability>,
    performance: ModelPerformance,
    cost_per_1k_tokens: f64,
}

pub struct ModelCapability {
    capability_type: String,
    score: f32,
}

pub struct ModelPerformance {
    avg_latency_ms: f64,
    throughput_tps: f64,
    success_rate: f64,
}

pub enum RoutingStrategy {
    LatencyOptimized,
    CostOptimized,
    QualityOptimized,
    Balanced,
}

pub struct Route {
    pub model_id: String,
    pub confidence: f64,
    pub estimated_latency: f64,
    pub estimated_cost: f64,
}

impl ModelRouter {
    pub fn new() -> Self {
        Self {
            models: HashMap::new(),
            routing_strategy: RoutingStrategy::Balanced,
            metrics: RouterMetrics::default(),
        }
    }

    pub fn initialize(&mut self, config: &serde_json::Value) -> Result<(), PyErr> {
        // Register default models
        self.register_model(ModelInfo {
            id: "gpt-4".to_string(),
            name: "GPT-4".to_string(),
            provider: "openai".to_string(),
            capabilities: vec![
                ModelCapability { capability_type: "text".to_string(), score: 0.95 },
                ModelCapability { capability_type: "reasoning".to_string(), score: 0.90 },
            ],
            performance: ModelPerformance {
                avg_latency_ms: 500.0,
                throughput_tps: 50.0,
                success_rate: 0.99,
            },
            cost_per_1k_tokens: 0.03,
        });

        self.register_model(ModelInfo {
            id: "gpt-3.5".to_string(),
            name: "GPT-3.5 Turbo".to_string(),
            provider: "openai".to_string(),
            capabilities: vec![
                ModelCapability { capability_type: "text".to_string(), score: 0.85 },
                ModelCapability { capability_type: "reasoning".to_string(), score: 0.75 },
            ],
            performance: ModelPerformance {
                avg_latency_ms: 200.0,
                throughput_tps: 100.0,
                success_rate: 0.995,
            },
            cost_per_1k_tokens: 0.0015,
        });

        self.register_model(ModelInfo {
            id: "claude-3".to_string(),
            name: "Claude 3 Opus".to_string(),
            provider: "anthropic".to_string(),
            capabilities: vec![
                ModelCapability { capability_type: "text".to_string(), score: 0.95 },
                ModelCapability { capability_type: "reasoning".to_string(), score: 0.92 },
                ModelCapability { capability_type: "vision".to_string(), score: 0.88 },
            ],
            performance: ModelPerformance {
                avg_latency_ms: 600.0,
                throughput_tps: 40.0,
                success_rate: 0.985,
            },
            cost_per_1k_tokens: 0.015,
        });

        Ok(())
    }

    /// Register a new model
    pub fn register_model(&mut self, model: ModelInfo) {
        self.models.insert(model.id.clone(), model);
    }

    /// Route request to best model
    pub fn route(&mut self, input: &str) -> Route {
        let start = std::time::Instant::now();
        
        // Analyze input requirements
        let requirements = self.analyze_input(input);
        
        // Score all models
        let mut scored_models: Vec<(String, f64)> = self.models
            .iter()
            .map(|(id, model)| {
                let score = self.score_model(model, &requirements);
                (id.clone(), score)
            })
            .collect();
        
        // Sort by score
        scored_models.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        
        // Select best model
        let best_model_id = scored_models[0].0.clone();
        let best_model = self.models.get(&best_model_id).unwrap();
        
        let route = Route {
            model_id: best_model_id,
            confidence: scored_models[0].1,
            estimated_latency: best_model.performance.avg_latency_ms,
            estimated_cost: best_model.cost_per_1k_tokens,
        };
        
        // Update metrics
        let elapsed = start.elapsed();
        self.metrics.total_requests += 1;
        self.metrics.avg_latency_ms = 
            (self.metrics.avg_latency_ms * (self.metrics.total_requests - 1) as f64 + elapsed.as_secs_f64() * 1000.0)
            / self.metrics.total_requests as f64;
        
        route
    }

    /// Analyze input to determine requirements
    fn analyze_input(&self, input: &str) -> InputRequirements {
        let mut requirements = InputRequirements::default();
        
        // Check for vision requirements
        if input.contains("image") || input.contains("picture") || input.contains("photo") {
            requirements.needs_vision = true;
        }
        
        // Check for code requirements
        if input.contains("code") || input.contains("program") || input.contains("function") {
            requirements.needs_code = true;
        }
        
        // Check for reasoning requirements
        if input.contains("analyze") || input.contains("compare") || input.contains("evaluate") {
            requirements.needs_reasoning = true;
        }
        
        // Estimate complexity
        requirements.complexity = (input.len() as f32 / 1000.0).min(1.0);
        
        requirements
    }

    /// Score a model for given requirements
    fn score_model(&self, model: &ModelInfo, requirements: &InputRequirements) -> f64 {
        let mut score = 0.0;
        
        // Capability matching
        for req_cap in &requirements.get_required_capabilities() {
            if let Some(cap) = model.capabilities.iter().find(|c| &c.capability_type == req_cap) {
                score += cap.score as f64 * 0.3;
            }
        }
        
        // Performance score
        score += model.performance.success_rate * 0.2;
        score += (1.0 - model.performance.avg_latency_ms / 1000.0).max(0.0) * 0.15;
        
        // Cost score (lower is better)
        let cost_score = 1.0 / (1.0 + model.cost_per_1k_tokens * 100.0);
        score += cost_score * 0.15;
        
        // Complexity matching
        if requirements.complexity > 0.7 {
            // Complex tasks need more capable models
            let max_capability = model.capabilities.iter()
                .map(|c| c.score)
                .fold(0.0f32, f32::max);
            score += max_capability as f64 * 0.2;
        }
        
        score
    }

    /// Set routing strategy
    pub fn set_strategy(&mut self, strategy: RoutingStrategy) {
        self.routing_strategy = strategy;
    }

    pub fn get_metrics(&self) -> serde_json::Value {
        serde_json::json!({
            "total_requests": self.metrics.total_requests,
            "avg_latency_ms": self.metrics.avg_latency_ms,
            "cost_savings": self.metrics.cost_savings,
            "registered_models": self.models.len(),
        })
    }
}

#[derive(Default)]
struct InputRequirements {
    needs_vision: bool,
    needs_code: bool,
    needs_reasoning: bool,
    complexity: f32,
}

impl InputRequirements {
    fn get_required_capabilities(&self) -> Vec<String> {
        let mut caps = vec!["text".to_string()];
        
        if self.needs_vision {
            caps.push("vision".to_string());
        }
        if self.needs_code {
            caps.push("code".to_string());
        }
        if self.needs_reasoning {
            caps.push("reasoning".to_string());
        }
        
        caps
    }
}

use pyo3::PyErr;
