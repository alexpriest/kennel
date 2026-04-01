use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::Duration;

const API_HOST: &str = "http://localhost";
const HEALTH_ENDPOINT: &str = "/api/services";
const MAX_STARTUP_WAIT: Duration = Duration::from_secs(10);
const POLL_INTERVAL: Duration = Duration::from_millis(200);

#[derive(Clone)]
pub struct ApiServer {
    child: Arc<Mutex<Option<Child>>>,
    port: u16,
}

impl ApiServer {
    pub fn new(port: u16) -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            port,
        }
    }

    pub async fn is_running(&self) -> bool {
        let url = format!("{}:{}{}", API_HOST, self.port, HEALTH_ENDPOINT);
        match reqwest::Client::new()
            .get(&url)
            .timeout(Duration::from_secs(2))
            .send()
            .await
        {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    pub fn spawn(&self) -> Result<(), String> {
        let (program, args) = Self::resolve_command(self.port)?;

        let child = Command::new(&program)
            .args(&args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn API server: {}", e))?;

        let mut guard = self.child.lock().unwrap();
        *guard = Some(child);
        Ok(())
    }

    pub async fn wait_for_healthy(&self) -> Result<(), String> {
        let start = std::time::Instant::now();
        while start.elapsed() < MAX_STARTUP_WAIT {
            if self.is_running().await {
                return Ok(());
            }
            tokio::time::sleep(POLL_INTERVAL).await;
        }
        Err("API server did not become healthy within timeout".to_string())
    }

    pub async fn ensure_running(&self) -> Result<bool, String> {
        if self.is_running().await {
            return Ok(false);
        }
        self.spawn()?;
        self.wait_for_healthy().await?;
        Ok(true)
    }

    pub fn shutdown(&self) {
        let mut guard = self.child.lock().unwrap();
        if let Some(ref mut child) = *guard {
            let _ = child.kill();
            let _ = child.wait();
        }
        *guard = None;
    }

    fn resolve_command(port: u16) -> Result<(String, Vec<String>), String> {
        let port_str = port.to_string();

        // Strategy 1: `kennel` in PATH
        if let Ok(output) = Command::new("which").arg("kennel").output() {
            if output.status.success() {
                let kennel_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                return Ok((kennel_path, vec!["ui".into(), "--port".into(), port_str]));
            }
        }

        // Strategy 2: Bundled dist/cli.js in .app bundle
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()));

        if let Some(dir) = &exe_dir {
            let cli_path = dir.join("../Resources/dist/cli.js");
            if cli_path.exists() {
                return Ok((
                    "node".into(),
                    vec![
                        cli_path.to_string_lossy().to_string(),
                        "ui".into(),
                        "--port".into(),
                        port_str,
                    ],
                ));
            }
        }

        // Strategy 3: npx fallback (dev)
        Ok((
            "npx".into(),
            vec!["kennel".into(), "ui".into(), "--port".into(), port_str],
        ))
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub fn base_url(&self) -> String {
        format!("{}:{}", API_HOST, self.port)
    }
}

impl Drop for ApiServer {
    fn drop(&mut self) {
        self.shutdown();
    }
}
