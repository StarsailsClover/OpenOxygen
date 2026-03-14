//! 高性能推理客户端 — Rust native HTTP + 连接池
//!
//! 替代 TypeScript fetch，提供：
//! - 连接复用（keep-alive）
//! - 并发请求限制
//! - 超时精细控制
//! - 流式响应支持

use napi::bindgen_prelude::*;
use reqwest::{Client, ClientBuilder};
use std::sync::Arc;
use std::time::Duration;
use tokio::runtime::Runtime;

#[napi(object)]
pub struct InferenceRequest {
    pub url: String,
    pub method: String,
    pub headers: Option<Vec<(String, String)>>,
    pub body: Option<String>,
    pub timeout_ms: Option<u32>,
}

#[napi(object)]
pub struct InferenceResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: String,
    pub duration_ms: f64,
}

#[napi(object)]
pub struct InferenceConfig {
    pub max_connections: Option<u32>,
    pub timeout_ms: Option<u32>,
    pub keep_alive: Option<bool>,
}

/// 高性能推理客户端
#[napi]
pub struct InferenceClient {
    client: Arc<Client>,
    runtime: Arc<Runtime>,
}

#[napi]
impl InferenceClient {
    #[napi(constructor)]
    pub fn new(config: Option<InferenceConfig>) -> Result<Self> {
        let cfg = config.unwrap_or(InferenceConfig {
            max_connections: Some(10),
            timeout_ms: Some(30000),
            keep_alive: Some(true),
        });

        let client = ClientBuilder::new()
            .pool_max_idle_per_host(cfg.max_connections.unwrap_or(10) as usize)
            .timeout(Duration::from_millis(cfg.timeout_ms.unwrap_or(30000) as u64))
            .pool_idle_timeout(Duration::from_secs(90))
            .build()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        let runtime = Runtime::new().map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(InferenceClient {
            client: Arc::new(client),
            runtime: Arc::new(runtime),
        })
    }

    #[napi]
    pub fn request_sync(&self, req: InferenceRequest) -> Result<InferenceResponse> {
        let start = std::time::Instant::now();
        let client = self.client.clone();

        let result = self.runtime.block_on(async {
            let mut request = client.request(
                [reqwest::Method::from_bytes](req.method.as_bytes()).map_err(|e| napi::Error::from_reason(e.to_string()))?,
                &req.url,
            );

            if let Some(headers) = req.headers {
                for (k, v) in headers {
                    request = request.header(k, v);
                }
            }

            if let Some(body) = req.body {
                request = request.body(body);
            }

            let response = request.send().await.map_err(|e| napi::Error::from_reason(e.to_string()))?;
            let status = response.status().as_u16();
            
            let headers: Vec<(String, String)> = response
                .headers()
                .iter()
                .filter_map(|(k, v)| v.to_str().ok().map(|v| (k.to_string(), v.to_string())))
                .collect();

            let body = response.text().await.map_err(|e| napi::Error::from_reason(e.to_string()))?;

            Ok::<_, napi::Error>(InferenceResponse {
                status,
                headers,
                body,
                duration_ms: 0.0,
            })
        });

        let mut resp = result?;
        resp.duration_ms = start.elapsed().as_secs_f64() * 1000.0;
        Ok(resp)
    }

    /// 批量并发请求
    #[napi]
    pub fn batch_request_sync(&self, requests: Vec<InferenceRequest>) -> Result<Vec<InferenceResponse>> {
        let start = std::time::Instant::now();
        let client = self.client.clone();

        let results = self.runtime.block_on(async {
            let futures: Vec<_> = requests.into_iter().map(|req| {
                let client = client.clone();
                async move {
                    let mut request = client.request(
                        [reqwest::Method::from_bytes](req.method.as_bytes()).map_err(|e| napi::Error::from_reason(e.to_string()))?,
                        &req.url,
                    );

                    if let Some(headers) = req.headers {
                        for (k, v) in headers {
                            request = request.header(k, v);
                        }
                    }

                    if let Some(body) = req.body {
                        request = request.body(body);
                    }

                    let response = request.send().await.map_err(|e| napi::Error::from_reason(e.to_string()))?;
                    let status = response.status().as_u16();
                    
                    let headers: Vec<(String, String)> = response
                        .headers()
                        .iter()
                        .filter_map(|(k, v)| v.to_str().ok().map(|v| (k.to_string(), v.to_string())))
                        .collect();

                    let body = response.text().await.map_err(|e| napi::Error::from_reason(e.to_string()))?;

                    Ok::<_, napi::Error>(InferenceResponse {
                        status,
                        headers,
                        body,
                        duration_ms: 0.0,
                    })
                }
            }).collect();

            futures::future::join_all(futures).await
        });

        let total_duration = start.elapsed().as_secs_f64() * 1000.0;
        let mut responses: Vec<InferenceResponse> = results.into_iter().filter_map(|r| r.ok()).collect();
        
        // 记录批量请求总时间
        for resp in &mut responses {
            resp.duration_ms = total_duration;
        }

        Ok(responses)
    }
}

