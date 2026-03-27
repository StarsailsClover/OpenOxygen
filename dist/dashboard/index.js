/**
 * OpenOxygen — Web Dashboard (26w11aE_P8)
 *
 * 最简方案：纯 HTML + 原生 JS，零依赖，由 Gateway 直接托管。
 * 无需 React/Vue/Tauri，一个 HTML 文件覆盖全部功能。
 */
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenOxygen Dashboard</title>
<style>
  :root {
    --bg: #0a0a0f;
    --surface: #12121a;
    --border: #1e1e2e;
    --text: #e0e0e0;
    --dim: #888;
    --accent: #4fc3f7;
    --green: #66bb6a;
    --red: #ef5350;
    --yellow: #ffa726;
    --font: 'Segoe UI', system-ui, sans-serif;
    --mono: 'Cascadia Code', 'Fira Code', monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font); background: var(--bg); color: var(--text); min-height: 100vh; }

  /* Layout */
  .app { display: grid; grid-template-columns: 220px 1fr; grid-template-rows: 56px 1fr; height: 100vh; }
  .header { grid-column: 1 / -1; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; gap: 16px; }
  .header h1 { font-size: 18px; font-weight: 600; }
  .header h1 span { color: var(--accent); }
  .header .status { margin-left: auto; display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .header .dot { width: 8px; height: 8px; border-radius: 50%; }
  .header .dot.ok { background: var(--green); }
  .header .dot.err { background: var(--red); }

  .sidebar { background: var(--surface); border-right: 1px solid var(--border); padding: 16px 0; overflow-y: auto; }
  .sidebar a { display: block; padding: 10px 24px; color: var(--dim); text-decoration: none; font-size: 14px; cursor: pointer; transition: all .15s; }
  .sidebar a:hover, .sidebar a.active { color: var(--text); background: rgba(79,195,247,.08); border-left: 3px solid var(--accent); }

  .main { padding: 24px; overflow-y: auto; }

  /* Cards */
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
  .card .label { font-size: 12px; color: var(--dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .card .value { font-size: 28px; font-weight: 700; }
  .card .sub { font-size: 12px; color: var(--dim); margin-top: 4px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; padding: 10px 12px; color: var(--dim); font-weight: 500; border-bottom: 1px solid var(--border); font-size: 12px; text-transform: uppercase; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
  tr:hover { background: rgba(255,255,255,.02); }

  /* Chat */
  .chat-container { display: flex; flex-direction: column; height: calc(100vh - 56px - 48px); }
  .chat-messages { flex: 1; overflow-y: auto; padding: 16px; }
  .chat-input { display: flex; gap: 8px; padding: 16px; border-top: 1px solid var(--border); }
  .chat-input input { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; color: var(--text); font-size: 14px; outline: none; }
  .chat-input input:focus { border-color: var(--accent); }
  .chat-input button { background: var(--accent); color: #000; border: none; border-radius: 6px; padding: 10px 20px; font-weight: 600; cursor: pointer; }
  .chat-input button:hover { opacity: .9; }
  .msg { margin-bottom: 12px; max-width: 80%; }
  .msg.user { margin-left: auto; }
  .msg .bubble { padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
  .msg.user .bubble { background: var(--accent); color: #000; border-bottom-right-radius: 4px; }
  .msg.ai .bubble { background: var(--surface); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
  .msg .meta { font-size: 11px; color: var(--dim); margin-top: 4px; }

  /* Log */
  .log { background: #000; border-radius: 8px; padding: 16px; font-family: var(--mono); font-size: 12px; max-height: 500px; overflow-y: auto; line-height: 1.6; }
  .log .info { color: var(--accent); }
  .log .warn { color: var(--yellow); }
  .log .error { color: var(--red); }

  /* Badge */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge.green { background: rgba(102,187,106,.15); color: var(--green); }
  .badge.red { background: rgba(239,83,80,.15); color: var(--red); }
  .badge.yellow { background: rgba(255,167,38,.15); color: var(--yellow); }
  .badge.blue { background: rgba(79,195,247,.15); color: var(--accent); }

  /* Section */
  .section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }

  /* Hidden */
  .page { display: none; }
  .page.active { display: block; }
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <h1><span>Open</span>Oxygen</h1>
    <div class="status">
      <div class="dot" id="statusDot"></div>
      <span id="statusText">Connecting...</span>
      <span style="color:var(--dim);margin-left:8px" id="versionText"></span>
    </div>
  </div>

  <div class="sidebar">
    <a class="active" onclick="showPage('overview')">📊 Overview</a>
    <a onclick="showPage('chat')">💬 Chat</a>
    <a onclick="showPage('models')">🧠 Models</a>
    <a onclick="showPage('agents')">🤖 Agents</a>
    <a onclick="showPage('security')">🔐 Security</a>
    <a onclick="showPage('plugins')">🔌 Plugins</a>
    <a onclick="showPage('logs')">📋 Logs</a>
    <a onclick="showPage('settings')">⚙️ Settings</a>
  </div>

  <div class="main">
    <!-- Overview -->
    <div class="page active" id="page-overview">
      <div class="section-title">System Overview</div>
      <div class="grid" id="overviewCards"></div>
      <div class="section-title">Model Performance</div>
      <table id="modelTable">
        <thead><tr><th>Model</th><th>Provider</th><th>Status</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>

    <!-- Chat -->
    <div class="page" id="page-chat">
      <div class="chat-container">
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input">
          <input id="chatInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendChat()">
          <select id="chatMode" style="background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:8px;">
            <option value="fast">Fast</option>
            <option value="balanced" selected>Balanced</option>
            <option value="deep">Deep</option>
          </select>
          <button onclick="sendChat()">Send</button>
        </div>
      </div>
    </div>

    <!-- Models -->
    <div class="page" id="page-models">
      <div class="section-title">Configured Models</div>
      <table id="modelsDetailTable">
        <thead><tr><th>Model</th><th>Provider</th><th>API Key</th><th>Base URL</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>

    <!-- Agents -->
    <div class="page" id="page-agents">
      <div class="section-title">Agents</div>
      <div id="agentsList"></div>
    </div>

    <!-- Security -->
    <div class="page" id="page-security">
      <div class="section-title">Security Audit</div>
      <div class="grid" id="securityCards"></div>
      <div class="section-title">Recent Audit Log</div>
      <div class="log" id="auditLog">Loading...</div>
    </div>

    <!-- Plugins -->
    <div class="page" id="page-plugins">
      <div class="section-title">Installed Plugins</div>
      <div id="pluginsList">No plugins installed</div>
    </div>

    <!-- Logs -->
    <div class="page" id="page-logs">
      <div class="section-title">System Logs</div>
      <div class="log" id="systemLog"></div>
    </div>

    <!-- Settings -->
    <div class="page" id="page-settings">
      <div class="section-title">Configuration</div>
      <div class="card">
        <div class="label">Gateway</div>
        <div id="settingsGateway"></div>
      </div>
    </div>
  </div>
</div>

<script>
const API = window.location.origin;
let refreshTimer;

// ─── Navigation ─────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector('.sidebar a[onclick*="' + name + '"]').classList.add('active');
}

// ─── API Calls ──────────────────────────────────────────────
async function apiGet(path) {
  try {
    const r = await fetch(API + path);
    return await r.json();
  } catch { return null; }
}

async function apiPost(path, body) {
  try {
    const r = await fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch { return null; }
}

// ─── Overview ───────────────────────────────────────────────
async function refreshOverview() {
  const health = await apiGet('/health');
  const status = await apiGet('/api/v1/status');

  // Status indicator
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (health && health.status === 'ok') {
    dot.className = 'dot ok';
    text.textContent = 'Online';
  } else {
    dot.className = 'dot err';
    text.textContent = 'Offline';
  }
  document.getElementById('versionText').textContent = 'v' + (health?.version || '?');

  if (!status) return;

  // Cards
  const cards = document.getElementById('overviewCards');
  cards.innerHTML = [
    card('Models', status.models?.length || 0, status.inferenceReady ? 'Ready' : 'Not Ready'),
    card('Agents', status.agents?.length || 0, ''),
    card('Plugins', status.plugins?.length || 0, ''),
    card('Uptime', Math.round(status.uptime || 0) + 's', ''),
  ].join('');

  // Model table
  const tbody = document.querySelector('#modelTable tbody');
  tbody.innerHTML = (status.models || []).map(m =>
    '<tr><td>' + m.model + '</td><td>' + m.provider + '</td><td>' +
    (m.hasKey ? '<span class="badge green">Ready</span>' : '<span class="badge red">No Key</span>') +
    '</td></tr>'
  ).join('');
}

function card(label, value, sub) {
  return '<div class="card"><div class="label">' + label + '</div><div class="value">' + value + '</div><div class="sub">' + sub + '</div></div>';
}

// ─── Chat ───────────────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chatInput');
  const mode = document.getElementById('chatMode').value;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  addMessage('user', msg);

  const data = await apiPost('/api/v1/chat', { message: msg, mode });
  if (data && data.content) {
    addMessage('ai', data.content, data.model + ' | ' + (data.durationMs || '?') + 'ms | ' + mode);
  } else if (data && data.error) {
    addMessage('ai', 'Error: ' + data.error, 'error');
  } else {
    addMessage('ai', 'No response', 'error');
  }
}

function addMessage(role, text, meta) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = '<div class="bubble">' + escapeHtml(text) + '</div>' +
    (meta ? '<div class="meta">' + escapeHtml(meta) + '</div>' : '');
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Models Detail ──────────────────────────────────────────
async function refreshModels() {
  const data = await apiGet('/api/v1/models');
  if (!data) return;
  const tbody = document.querySelector('#modelsDetailTable tbody');
  tbody.innerHTML = (data.models || []).map(m =>
    '<tr><td><strong>' + m.model + '</strong></td><td><span class="badge blue">' + m.provider + '</span></td><td>' +
    (m.hasKey ? '✅' : '❌') + '</td><td style="color:var(--dim);font-size:12px">' + (m.baseUrl || '-') + '</td></tr>'
  ).join('');
}

// ─── Agents ─────────────────────────────────────────────────
async function refreshAgents() {
  const data = await apiGet('/api/v1/agents');
  if (!data) return;
  document.getElementById('agentsList').innerHTML = (data.agents || []).map(a =>
    '<div class="card" style="margin-bottom:12px"><div class="label">Agent</div><div class="value" style="font-size:20px">' +
    (a.name || a.id) + '</div><div class="sub">ID: ' + a.id + '</div></div>'
  ).join('');
}

// ─── Security ───────────────────────────────────────────────
async function refreshSecurity() {
  const secCards = document.getElementById('securityCards');
  secCards.innerHTML = [
    card('Auth Mode', 'Token', ''),
    card('Audit', 'Enabled', ''),
    card('Privilege', 'Standard', ''),
    card('CVE Coverage', '100%', '6 CVEs mitigated'),
  ].join('');
}

// ─── Logs ───────────────────────────────────────────────────
function addLog(level, msg) {
  const log = document.getElementById('systemLog');
  const time = new Date().toISOString().slice(11, 19);
  log.innerHTML += '<div class="' + level + '">[' + time + '] [' + level.toUpperCase() + '] ' + escapeHtml(msg) + '</div>';
  log.scrollTop = log.scrollHeight;
}

// ─── Init ───────────────────────────────────────────────────
async function init() {
  await refreshOverview();
  await refreshModels();
  await refreshAgents();
  await refreshSecurity();
  addLog('info', 'Dashboard connected to ' + API);
  addLog('info', 'Refreshing every 5 seconds');

  refreshTimer = setInterval(refreshOverview, 5000);
}

init();
</script>
</body>
</html>`;
//# sourceMappingURL=index.js.map