export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>kennel — where your daemons live</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  :root {
    --bg: #0a0a0c;
    --bg-surface: #111115;
    --bg-raised: #18181d;
    --bg-hover: #1f1f26;
    --border: #2a2a33;
    --border-subtle: #1e1e26;
    --text: #e4e4e8;
    --text-dim: #8888a0;
    --text-muted: #55556a;
    --green: #22c55e;
    --green-dim: #16a34a;
    --green-glow: rgba(34, 197, 94, 0.15);
    --red: #ef4444;
    --red-dim: #dc2626;
    --red-glow: rgba(239, 68, 68, 0.15);
    --yellow: #eab308;
    --yellow-glow: rgba(234, 179, 8, 0.12);
    --blue: #3b82f6;
    --blue-glow: rgba(59, 130, 246, 0.12);
    --cyan: #06b6d4;
    --magenta: #a855f7;
    --amber: #f59e0b;
    --radius: 6px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'JetBrains Mono', monospace;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Scanline overlay */
  body::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
    pointer-events: none;
    z-index: 9999;
  }

  .shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  /* Header */
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }

  .logo {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text);
  }

  .logo span {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 14px;
    margin-left: 12px;
    letter-spacing: 0.5px;
  }

  .header-meta {
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: var(--green);
    border-radius: 50%;
    display: inline-block;
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 6px var(--green);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Stats bar */
  .stats {
    display: flex;
    gap: 2px;
    margin-bottom: 24px;
  }

  .stat {
    flex: 1;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .stat:first-child { border-radius: var(--radius) 0 0 var(--radius); }
  .stat:last-child { border-radius: 0 var(--radius) var(--radius) 0; }

  .stat-value {
    font-size: 22px;
    font-weight: 600;
    font-family: 'Space Grotesk', sans-serif;
  }

  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
  }

  .stat-value.green { color: var(--green); }
  .stat-value.red { color: var(--red); }
  .stat-value.dim { color: var(--text-dim); }

  /* Toolbar */
  .toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    align-items: center;
  }

  .search-box {
    flex: 1;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 8px 12px;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s;
  }

  .search-box::placeholder { color: var(--text-muted); }
  .search-box:focus { border-color: var(--text-dim); }

  .filter-btn {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 8px 14px;
    color: var(--text-dim);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .filter-btn:hover { border-color: var(--text-dim); color: var(--text); }
  .filter-btn.active { border-color: var(--text-dim); color: var(--text); background: var(--bg-raised); }

  /* Service list */
  .service-list {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .service-row {
    display: grid;
    grid-template-columns: 8px 1fr 80px 100px 60px 120px auto;
    align-items: center;
    gap: 0;
    padding: 0;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    cursor: pointer;
    transition: background 0.1s;
  }

  .service-row:last-child { border-bottom: none; }
  .service-row:hover { background: var(--bg-hover); }
  .service-row.expanded { background: var(--bg-raised); }

  .service-row .status-bar {
    width: 4px;
    align-self: stretch;
    margin: 0;
  }

  .service-row .status-bar.running { background: var(--green); box-shadow: 0 0 8px var(--green-glow); }
  .service-row .status-bar.stopped { background: var(--text-muted); }
  .service-row .status-bar.error { background: var(--red); box-shadow: 0 0 8px var(--red-glow); }
  .service-row .status-bar.scheduled { background: var(--blue); box-shadow: 0 0 8px var(--blue-glow); }
  .service-row .status-bar.unknown { background: var(--yellow); }

  .service-row .cell {
    padding: 12px 14px;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .service-name {
    font-weight: 500;
    color: var(--text);
  }

  .service-backend {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .backend-launchd { color: var(--cyan); }
  .backend-pm2 { color: var(--magenta); }
  .backend-brew { color: var(--amber); }
  .backend-cron { color: var(--blue); }

  .service-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.running { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .status-dot.stopped { background: var(--text-muted); }
  .status-dot.error { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .status-dot.scheduled { background: var(--blue); box-shadow: 0 0 6px var(--blue); }
  .status-dot.unknown { background: var(--yellow); }

  .service-pid { color: var(--text-dim); font-size: 11px; }
  .service-schedule { color: var(--text-dim); font-size: 11px; }

  .service-actions {
    display: flex;
    gap: 4px;
    padding-right: 12px;
  }

  .action-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text-dim);
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    padding: 3px 7px;
    cursor: pointer;
    transition: all 0.12s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .action-btn:hover { border-color: var(--text-dim); color: var(--text); }
  .action-btn.stop:hover { border-color: var(--red); color: var(--red); }
  .action-btn.start:hover { border-color: var(--green); color: var(--green); }
  .action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* Expanded detail panel */
  .service-detail {
    display: none;
    background: var(--bg);
    border-bottom: 1px solid var(--border-subtle);
    padding: 16px 20px 16px 24px;
  }

  .service-detail.open { display: block; }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 32px;
    font-size: 11px;
  }

  .detail-row {
    display: flex;
    gap: 8px;
  }

  .detail-label {
    color: var(--text-muted);
    min-width: 80px;
    flex-shrink: 0;
  }

  .detail-value {
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .log-viewer {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .log-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
  }

  .log-content {
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 10px 12px;
    font-size: 10px;
    line-height: 1.6;
    color: var(--text-dim);
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* Doctor panel */
  .doctor-panel {
    margin-top: 24px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .doctor-header {
    background: var(--bg-surface);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: background 0.1s;
  }

  .doctor-header:hover { background: var(--bg-hover); }

  .doctor-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-dim);
    font-weight: 500;
  }

  .doctor-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
  }

  .doctor-badge.clean { background: var(--green-glow); color: var(--green); }
  .doctor-badge.issues { background: var(--yellow-glow); color: var(--yellow); }

  .doctor-results {
    display: none;
    padding: 0;
  }

  .doctor-results.open { display: block; }

  .doctor-issue {
    padding: 10px 16px;
    border-top: 1px solid var(--border-subtle);
    font-size: 11px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .issue-icon {
    flex-shrink: 0;
    width: 14px;
    text-align: center;
    margin-top: 1px;
  }

  .issue-icon.error { color: var(--red); }
  .issue-icon.warning { color: var(--yellow); }
  .issue-icon.info { color: var(--blue); }

  .issue-body { flex: 1; }
  .issue-service { color: var(--text); font-weight: 500; }
  .issue-message { color: var(--text-dim); margin-top: 2px; }

  .issue-suggestion {
    color: var(--text-muted);
    margin-top: 3px;
    font-size: 10px;
  }

  .issue-suggestion::before { content: '→ '; }

  /* Loading states */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: var(--text-muted);
    font-size: 12px;
    gap: 10px;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--text-dim);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Stagger animations */
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-in {
    animation: fadeSlideIn 0.25s ease-out both;
  }

  /* Toast */
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 16px;
    font-size: 11px;
    color: var(--text-dim);
    z-index: 1000;
    animation: fadeSlideIn 0.2s ease-out;
    font-family: 'JetBrains Mono', monospace;
  }

  .toast.success { border-color: var(--green-dim); color: var(--green); }
  .toast.error { border-color: var(--red-dim); color: var(--red); }

  /* Empty state */
  .empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-muted);
    font-size: 12px;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
</style>
</head>
<body>
<div class="shell">
  <header>
    <div class="logo">kennel<span>where your daemons live</span></div>
    <div class="header-meta">
      <span><span class="pulse-dot"></span></span>
      <span id="refresh-timer">refreshing...</span>
    </div>
  </header>

  <div class="stats" id="stats">
    <div class="stat"><div><div class="stat-value dim" id="stat-total">—</div><div class="stat-label">services</div></div></div>
    <div class="stat"><div><div class="stat-value green" id="stat-running">—</div><div class="stat-label">running</div></div></div>
    <div class="stat"><div><div class="stat-value dim" id="stat-stopped">—</div><div class="stat-label">stopped</div></div></div>
    <div class="stat"><div><div class="stat-value red" id="stat-errors">—</div><div class="stat-label">errors</div></div></div>
  </div>

  <div class="toolbar">
    <input type="text" class="search-box" id="search" placeholder="search services..." />
    <button class="filter-btn active" data-filter="all">all</button>
    <button class="filter-btn" data-backend="launchd">launchd</button>
    <button class="filter-btn" data-backend="pm2">pm2</button>
    <button class="filter-btn" data-backend="brew">brew</button>
    <button class="filter-btn" data-backend="cron">cron</button>
  </div>

  <div id="service-list" class="service-list">
    <div class="loading"><div class="spinner"></div> loading services...</div>
  </div>

  <div class="doctor-panel" id="doctor-panel">
    <div class="doctor-header" id="doctor-toggle">
      <div class="doctor-title">health check</div>
      <div class="doctor-badge clean" id="doctor-badge">checking...</div>
    </div>
    <div class="doctor-results" id="doctor-results"></div>
  </div>
</div>

<script>
  let services = [];
  let doctorIssues = [];
  let expandedService = null;
  let activeBackend = null;
  let searchQuery = '';
  let refreshInterval = null;

  async function fetchServices() {
    const res = await fetch('/api/services');
    services = await res.json();
    renderServices();
    updateStats();
  }

  async function fetchDoctor() {
    const res = await fetch('/api/doctor');
    doctorIssues = await res.json();
    renderDoctor();
  }

  async function fetchLogs(name) {
    const res = await fetch('/api/logs/' + encodeURIComponent(name) + '?lines=30');
    const data = await res.json();
    return data.logs;
  }

  async function performAction(name, action) {
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, action }),
    });
    const result = await res.json();
    showToast(result.message, result.success ? 'success' : 'error');
    setTimeout(fetchServices, 800);
  }

  function getFiltered() {
    return services.filter(s => {
      if (activeBackend && s.backend !== activeBackend) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }

  function updateStats() {
    document.getElementById('stat-total').textContent = services.length;
    document.getElementById('stat-running').textContent = services.filter(s => s.status === 'running').length;
    document.getElementById('stat-stopped').textContent = services.filter(s => s.status === 'stopped' || s.status === 'unknown').length;
    document.getElementById('stat-errors').textContent = services.filter(s => s.status === 'error').length;
  }

  function renderServices() {
    const list = document.getElementById('service-list');
    const filtered = getFiltered();

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty">no services match your filters</div>';
      return;
    }

    list.innerHTML = filtered.map((s, i) => {
      const isExpanded = expandedService === s.name;
      return '<div class="service-row' + (isExpanded ? ' expanded' : '') + ' animate-in" style="animation-delay:' + (i * 30) + 'ms" data-name="' + esc(s.name) + '">' +
        '<div class="status-bar ' + s.status + '"></div>' +
        '<div class="cell service-name">' + esc(s.name) + '</div>' +
        '<div class="cell service-backend backend-' + s.backend + '">' + s.backend + '</div>' +
        '<div class="cell service-status"><span class="status-dot ' + s.status + '"></span>' + s.status + '</div>' +
        '<div class="cell service-pid">' + (s.pid || '—') + '</div>' +
        '<div class="cell service-schedule">' + (s.schedule || '—') + '</div>' +
        '<div class="cell service-actions">' +
          (s.manageable && s.status === 'running' ? '<button class="action-btn stop" onclick="event.stopPropagation();performAction(\\''+esc(s.name)+'\\',\\'stop\\')">stop</button><button class="action-btn" onclick="event.stopPropagation();performAction(\\''+esc(s.name)+'\\',\\'restart\\')">restart</button>' :
           s.manageable && s.status !== 'running' && s.status !== 'scheduled' ? '<button class="action-btn start" onclick="event.stopPropagation();performAction(\\''+esc(s.name)+'\\',\\'start\\')">start</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="service-detail' + (isExpanded ? ' open' : '') + '" id="detail-' + esc(s.name) + '">' +
        '<div class="detail-grid">' +
          detailRow('command', s.command) +
          detailRow('cwd', s.cwd) +
          detailRow('config', s.configPath) +
          detailRow('enabled', s.enabled !== undefined ? (s.enabled ? 'yes' : 'no') : null) +
          detailRow('exit code', s.exitCode !== undefined ? String(s.exitCode) : null) +
          detailRow('restarts', s.restartCount !== undefined ? String(s.restartCount) : null) +
          detailRow('stdout', s.logPaths?.stdout) +
          detailRow('stderr', s.logPaths?.stderr !== s.logPaths?.stdout ? s.logPaths?.stderr : null) +
        '</div>' +
        (isExpanded ? '<div class="log-viewer"><div class="log-header"><span class="log-title">recent logs</span></div><div class="log-content" id="logs-' + esc(s.name) + '">loading...</div></div>' : '') +
      '</div>';
    }).join('');

    // click handlers
    list.querySelectorAll('.service-row').forEach(row => {
      row.addEventListener('click', () => toggleExpand(row.dataset.name));
    });

    // load logs if expanded
    if (expandedService) {
      loadLogs(expandedService);
    }
  }

  function detailRow(label, value) {
    if (!value) return '';
    return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value" title="' + esc(value) + '">' + esc(value) + '</span></div>';
  }

  async function toggleExpand(name) {
    expandedService = expandedService === name ? null : name;
    renderServices();
  }

  async function loadLogs(name) {
    const el = document.getElementById('logs-' + name);
    if (!el) return;
    const logs = await fetchLogs(name);
    el.textContent = logs || '(no logs available)';
    el.scrollTop = el.scrollHeight;
  }

  function renderDoctor() {
    const badge = document.getElementById('doctor-badge');
    const results = document.getElementById('doctor-results');

    if (doctorIssues.length === 0) {
      badge.textContent = 'healthy';
      badge.className = 'doctor-badge clean';
      results.innerHTML = '<div class="doctor-issue" style="color:var(--green);justify-content:center;">all services look healthy</div>';
    } else {
      badge.textContent = doctorIssues.length + ' issue' + (doctorIssues.length > 1 ? 's' : '');
      badge.className = 'doctor-badge issues';
      results.innerHTML = doctorIssues.map(issue =>
        '<div class="doctor-issue">' +
          '<span class="issue-icon ' + issue.severity + '">' + (issue.severity === 'error' ? '✖' : issue.severity === 'warning' ? '⚠' : 'ℹ') + '</span>' +
          '<div class="issue-body">' +
            '<div class="issue-service">' + esc(issue.service) + ' <span style="color:var(--text-muted)">(' + issue.backend + ')</span></div>' +
            '<div class="issue-message">' + esc(issue.message) + '</div>' +
            (issue.suggestion ? '<div class="issue-suggestion">' + esc(issue.suggestion) + '</div>' : '') +
          '</div>' +
        '</div>'
      ).join('');
    }
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeBackend = btn.dataset.backend || null;
      expandedService = null;
      renderServices();
    });
  });

  // Search
  document.getElementById('search').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderServices();
  });

  // Doctor toggle
  document.getElementById('doctor-toggle').addEventListener('click', () => {
    document.getElementById('doctor-results').classList.toggle('open');
  });

  // Auto-refresh
  let countdown = 15;
  function tick() {
    countdown--;
    document.getElementById('refresh-timer').textContent = 'refresh in ' + countdown + 's';
    if (countdown <= 0) {
      countdown = 15;
      fetchServices();
      fetchDoctor();
    }
  }

  // Init
  fetchServices();
  fetchDoctor();
  setInterval(tick, 1000);
</script>
</body>
</html>`;
}
