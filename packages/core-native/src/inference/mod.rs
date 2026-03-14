//! 高性能推理客户端 — Rust native HTTP + 连接池

use napi::bindgen_prelude::*;
use reqwest::{Client, ClientBuilder, Method};
use std::sync::Arc;
use std::time::Duration;
use tokio::runtime::Runtime;

#[napi(object)]
pub struct InferenceRequest {
    pub url: String,
    pub method: String,
    pub body: Option<String>,
    pub timeout_ms: Option<u32>,
}

#[napi(object)]
pub struct InferenceResponse {
    pub status: u16,
    pub body: String,
    pub duration_ms: f64,
}

#[napi]
pub struct InferenceClient {
    client: Arc<Client>,
    runtime: Arc<Runtime>,
}

#[napi]
impl InferenceClient {
    #[napi(constructor)]
    pub fn new() -> Result<Self> {
        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(30))
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
            let method = match req.method.as_str() {
                "GET" => Method::GET,
                "POST" => Method::POST,
                "PUT" => Method::PUT,
                "DELETE" => Method::DELETE,
                _ => Method::GET,
            };

            let mut request = client.request(method, &req.url);

            if let Some(body) = req.body {
                request = request.body(body);
            }

            let response = request.send().await.map_err(|e| napi::Error::from_reason(e.to_string()))?;
            let status = response.status().as_u16();
            let body = response.text().await.map_err(|e| napi::Error::from_reason(e.to_string()))?;

            Ok::<_, napi::Error>(InferenceResponse {
                status,
                body,
                duration_ms: 0.0,
            })
        });

        let mut resp = result?;
        resp.duration_ms = start.elapsed().as_secs_f64() * 1000.0;
        Ok(resp)
    }
}
