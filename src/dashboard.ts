export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>kennel \u2014 where your daemons live</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  :root, [data-theme="dark"] {
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
    --scanline: rgba(0,0,0,0.03);
    --claude: #D4A27A;
    --claude-glow: rgba(212, 162, 122, 0.15);
    --shadow-panel: rgba(0,0,0,0.5);
  }

  [data-theme="light"] {
    --bg: #f5f5f7;
    --bg-surface: #ffffff;
    --bg-raised: #f0f0f2;
    --bg-hover: #e8e8ec;
    --border: #d4d4da;
    --border-subtle: #e2e2e8;
    --text: #1a1a1e;
    --text-dim: #5c5c72;
    --text-muted: #9898a8;
    --green: #16a34a;
    --green-dim: #15803d;
    --green-glow: rgba(22, 163, 74, 0.1);
    --red: #dc2626;
    --red-dim: #b91c1c;
    --red-glow: rgba(220, 38, 38, 0.1);
    --yellow: #ca8a04;
    --yellow-glow: rgba(202, 138, 4, 0.08);
    --blue: #2563eb;
    --blue-glow: rgba(37, 99, 235, 0.08);
    --cyan: #0891b2;
    --magenta: #9333ea;
    --amber: #d97706;
    --scanline: rgba(0,0,0,0.01);
    --claude: #b8845a;
    --claude-glow: rgba(184, 132, 90, 0.12);
    --shadow-panel: rgba(0,0,0,0.12);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'JetBrains Mono', monospace;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
  }

  body::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, var(--scanline) 2px, var(--scanline) 4px);
    pointer-events: none;
    z-index: 9999;
  }

  .shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  /* ---- Header ---- */
  header {
    display: flex;
    align-items: center;
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

  .header-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .refresh-timer {
    font-size: 11px;
    color: var(--text-muted);
    margin-right: 8px;
  }

  /* ---- Ghost icon buttons ---- */
  .icon-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
    position: relative;
    flex-shrink: 0;
  }

  .icon-btn:hover { background: var(--bg-hover); color: var(--text); }
  .icon-btn svg { width: 15px; height: 15px; }
  .icon-btn.spinning svg { animation: spin 0.6s ease; }

  /* ---- Settings panel ---- */
  .settings-anchor { position: relative; }

  .settings-panel {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-width: 200px;
    box-shadow: 0 8px 30px var(--shadow-panel);
    z-index: 100;
    padding: 8px 0;
    animation: fadeSlideIn 0.12s ease-out;
  }

  .settings-panel.open { display: block; }

  .settings-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 6px 14px 6px;
  }

  .terminal-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 14px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-dim);
    transition: background 0.1s, color 0.1s;
  }

  .terminal-option:hover { background: var(--bg-hover); color: var(--text); }
  .terminal-option.selected { color: var(--text); }

  .terminal-radio {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-radius: 50%;
    flex-shrink: 0;
    transition: all 0.15s;
    position: relative;
  }

  .terminal-option.selected .terminal-radio {
    border-color: var(--green);
  }

  .terminal-option.selected .terminal-radio::after {
    content: '';
    position: absolute;
    top: 2px; left: 2px; right: 2px; bottom: 2px;
    background: var(--green);
    border-radius: 50%;
  }

  /* ---- Stats ---- */
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

  /* ---- Toolbar ---- */
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

  /* ---- Service table ---- */
  .service-table-wrap {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .service-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .col-indicator { width: 3px; }
  .col-name { /* auto */ }
  .col-backend { width: 86px; }
  .col-status { width: 100px; }
  .col-pid { width: 70px; }
  .col-schedule { width: 120px; }
  .col-actions { width: 175px; }

  .service-table thead th {
    background: var(--bg-raised);
    padding: 8px 14px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    text-align: left;
    border-bottom: 1px solid var(--border-subtle);
  }

  .service-table thead th:first-child { padding: 0; width: 3px; }

  .service-table tbody tr.svc-row {
    background: var(--bg-surface);
    cursor: pointer;
    transition: background 0.1s;
  }

  .service-table tbody tr.svc-row:hover { background: var(--bg-hover); }
  .service-table tbody tr.svc-row.expanded { background: var(--bg-raised); }
  .service-table tbody tr.detail-row { cursor: default; background: var(--bg); }

  .service-table td {
    padding: 10px 14px;
    font-size: 12px;
    border-bottom: 1px solid var(--border-subtle);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }

  .service-table tbody tr:last-child td { border-bottom: none; }

  /* Indicator stripe */
  .td-indicator {
    padding: 0 !important;
    width: 3px;
  }

  .td-indicator .stripe {
    display: block;
    width: 3px;
    min-height: 44px;
    height: 100%;
  }

  .stripe.running { background: var(--green); }
  .stripe.stopped { background: var(--text-muted); opacity: 0.4; }
  .stripe.error { background: var(--red); }
  .stripe.scheduled { background: var(--blue); }
  .stripe.unknown { background: var(--yellow); }

  /* Name cell */
  .td-name { white-space: normal !important; }

  .name-line {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.3;
  }

  .service-id {
    font-size: 10px;
    font-weight: 400;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 1px;
    line-height: 1.3;
  }

  .edit-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
    flex-shrink: 0;
    display: inline-flex;
  }

  .svc-row:hover .edit-btn { opacity: 0.6; }
  .edit-btn:hover { opacity: 1 !important; color: var(--text); }
  .edit-btn svg { width: 11px; height: 11px; }

  .rename-input {
    background: var(--bg);
    border: 1px solid var(--text-dim);
    border-radius: 3px;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    padding: 2px 6px;
    outline: none;
    width: 100%;
  }

  /* Backend cell */
  .td-backend {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .backend-launchd { color: var(--cyan); }
  .backend-pm2 { color: var(--magenta); }
  .backend-brew { color: var(--amber); }
  .backend-cron { color: var(--blue); }

  /* Status cell */
  .td-status { font-size: 11px; }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
    vertical-align: middle;
  }

  .status-dot.running { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .status-dot.stopped { background: var(--text-muted); }
  .status-dot.error { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .status-dot.scheduled { background: var(--blue); box-shadow: 0 0 6px var(--blue); }
  .status-dot.unknown { background: var(--yellow); }

  .td-pid { color: var(--text-dim); font-size: 11px; }
  .td-schedule { color: var(--text-dim); font-size: 11px; }

  /* Actions cell */
  .td-actions {
    white-space: nowrap !important;
    overflow: visible !important;
    text-overflow: clip !important;
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
    margin-right: 4px;
  }

  .action-btn:hover { border-color: var(--text-dim); color: var(--text); }
  .action-btn.stop:hover { border-color: var(--red); color: var(--red); }
  .action-btn.start:hover { border-color: var(--green); color: var(--green); }

  /* Claude sparkle button */
  .claude-btn {
    background: none;
    border: none;
    color: var(--claude);
    cursor: pointer;
    padding: 3px;
    display: inline-flex;
    align-items: center;
    opacity: 0.45;
    transition: opacity 0.15s, transform 0.15s;
    vertical-align: middle;
  }

  .claude-btn:hover { opacity: 1; transform: scale(1.2); }
  .claude-btn svg { width: 13px; height: 13px; }

  /* ---- Detail panel ---- */
  .detail-td {
    padding: 0 !important;
    background: var(--bg);
  }

  .detail-inner { padding: 16px 20px 16px 22px; }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 32px;
    font-size: 11px;
  }

  .detail-kv { display: flex; gap: 8px; }

  .detail-k {
    color: var(--text-muted);
    min-width: 72px;
    flex-shrink: 0;
  }

  .detail-v {
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

  .log-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    margin-bottom: 8px;
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

  /* ---- Notes ---- */
  .notes-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);
  }

  .notes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .notes-textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 10px 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: var(--text-dim);
    resize: vertical;
    min-height: 56px;
    outline: none;
    transition: border-color 0.15s;
  }

  .notes-textarea::placeholder { color: var(--text-muted); }
  .notes-textarea:focus { border-color: var(--text-dim); }

  .notes-saved {
    font-size: 10px;
    color: var(--green);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .notes-saved.show { opacity: 1; }

  /* ---- Doctor panel ---- */
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

  .doctor-results { display: none; }
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

  .issue-suggestion::before { content: '\u2192 '; }

  .issue-actions { flex-shrink: 0; display: flex; align-items: center; }

  /* ---- Utility ---- */
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
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-in { animation: fadeSlideIn 0.2s ease-out both; }

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
    animation: fadeSlideIn 0.15s ease-out;
    font-family: 'JetBrains Mono', monospace;
  }

  .toast.success { border-color: var(--green-dim); color: var(--green); }
  .toast.error { border-color: var(--red-dim); color: var(--red); }

  .empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-muted);
    font-size: 12px;
  }

  /* ---- Claude modal ---- */
  .modal-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    z-index: 500;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.12s ease-out;
  }

  .modal-overlay.open { display: flex; }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    width: 560px;
    max-width: 90vw;
    max-height: 80vh;
    box-shadow: 0 16px 48px var(--shadow-panel);
    animation: fadeSlideIn 0.15s ease-out;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .modal-header svg { width: 18px; height: 18px; color: var(--claude); flex-shrink: 0; }

  .modal-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .modal-body {
    padding: 16px 20px;
    flex: 1;
    overflow-y: auto;
  }

  .modal-label {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .modal-prompt {
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 12px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: var(--text-dim);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
  }

  .modal-terminal {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .terminal-select {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
    outline: none;
  }

  .terminal-select:hover { border-color: var(--text-dim); }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px 16px;
    border-top: 1px solid var(--border-subtle);
  }

  .modal-btn {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    padding: 8px 18px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.12s;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-dim);
  }

  .modal-btn:hover { border-color: var(--text-dim); color: var(--text); }

  .modal-btn.primary {
    background: var(--claude);
    border-color: var(--claude);
    color: #fff;
  }

  .modal-btn.primary:hover { opacity: 0.9; }

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
    <div class="header-controls">
      <span class="refresh-timer" id="refresh-timer"></span>
      <button class="icon-btn" id="refresh-btn" onclick="manualRefresh()" title="Refresh now"></button>
      <button class="icon-btn" id="theme-btn" onclick="toggleTheme()" title="Toggle theme (D)"></button>
      <div class="settings-anchor">
        <button class="icon-btn" id="settings-btn" onclick="toggleSettings()" title="Settings"></button>
        <div class="settings-panel" id="settings-panel">
          <div class="settings-label">Terminal App</div>
          <div id="terminal-list"></div>
        </div>
      </div>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><div><div class="stat-value dim" id="stat-total">\u2014</div><div class="stat-label">services</div></div></div>
    <div class="stat"><div><div class="stat-value green" id="stat-running">\u2014</div><div class="stat-label">running</div></div></div>
    <div class="stat"><div><div class="stat-value dim" id="stat-stopped">\u2014</div><div class="stat-label">stopped</div></div></div>
    <div class="stat"><div><div class="stat-value red" id="stat-errors">\u2014</div><div class="stat-label">errors</div></div></div>
  </div>

  <div class="toolbar">
    <input type="text" class="search-box" id="search" placeholder="search services..." />
    <button class="filter-btn active" data-filter="all">all</button>
    <button class="filter-btn" data-backend="launchd">launchd</button>
    <button class="filter-btn" data-backend="pm2">pm2</button>
    <button class="filter-btn" data-backend="brew">brew</button>
    <button class="filter-btn" data-backend="cron">cron</button>
  </div>

  <div id="service-list" class="service-table-wrap">
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

<div class="modal-overlay" id="claude-modal">
  <div class="modal">
    <div class="modal-header" id="claude-modal-icon"></div>
    <div class="modal-body">
      <div class="modal-label">Prompt to send</div>
      <div class="modal-prompt" id="claude-modal-prompt"></div>
      <div class="modal-terminal">
        <span>Opening in</span>
        <select class="terminal-select" id="claude-modal-terminal-select"></select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn" onclick="closeClaude()">Cancel</button>
      <button class="modal-btn" onclick="copyClaudePrompt()" title="Copy prompt to clipboard">Copy</button>
      <button class="modal-btn primary" id="claude-modal-launch">Open in Claude</button>
    </div>
  </div>
</div>

<script>
  // ---- SVG Icons (Lucide-inspired, stroke-based) ----
  var SVG_REFRESH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
  var SVG_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SVG_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var SVG_SLIDERS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>';
  var SVG_CLAUDE = '<svg viewBox="0 0 248 248" fill="currentColor"><path d="M52.4 162.9L98.8 136.9l.7-2.3-.7-1.3h-2.3l-7.8-.5-26.5-.7-22.9-.9L17 130l-5.6-1.2L6.2 121.9l.5-3.4 4.7-3.2 6.8.6 14.9 1.1 22.4 1.5 16.2.9 24.1 2.5h3.8l.5-1.5-1.3-1-.9-.9-23.2-15.7-25.1-16.5-13.1-9.6-7-4.8-3.6-4.5-1.5-9.9 6.4-7.1 8.6.6 2.2.6 8.8 6.7 18.7 14.5 24.5 18 3.6 2.9 1.4-.9.2-.7-1.6-2.7L83.8 65.3 69.6 40.8l-6.4-10.2-1.6-6 .1-7.2L68 7.5l4-1.3 9.8 1.3 4.1 3.5 6.1 13.9 9.8 21.9L117 76.6l4.5 8.9 2.4 8.1.9 2.5h1.5v-1.4l1.3-16.8 2.3-20.6 2.3-26.5.7-7.4 3.7-9 7.4-4.8 5.7 2.7 4.7 6.7-.6 4.4-2.8 18.2-5.5 28.5-3.6 19.1h2l2.4-2.5 9.7-12.8L173 53.7l7-8 8.4-8.9 5.3-3.3h10.2l7.4 11.1-3.3 11.5-10.5 13.2-8.6 11.2-12.4 16.6-7.7 13.4.7 1.1 1.9-.2 28-6 15.2-2.7 18.1-3.1 8.1 3.8.9 3.9-3.2 7.9-19.3 4.7-22.7 4.6-33.8 7.9-.3.3.4.7 15.2 1.4 6.5.4h15.9l29.7 2.2 7.8 5.1 4.6 6.3-.8 4.8-12 6-16 -3.8-37.6-9-12.9-3.2h-1.8v1.1l10.7 10.5 19.7 17.7 24.6 22.9 1.3 5.7-3.2 4.5-3.3-.5-21.6-16.3-8.4-7.3-18.9-15.9h-1.3v1.6l4.3 6.4 23.1 34.6 1.1 10.6-1.6 3.4-6 2.1-6.5-1.2-13.6-19L147.3 182.5 136.1 163.3l-1.4.9-6.7 71.2-3 3.7-7.1 2.7-6-4.5-3.2-7.3 3.2-14.5 3.8-18.9 3.1-15 2.8-18.7 1.7-6.2-.2-.4-1.3.2-14.1 19.3-21.5 29-16.9 18.1-4.1 1.6-7 -3.7.6-6.5 4-5.8 23.4-29.8 14.1-18.5 9.1-10.6-.1-1.5-.5-.1-62.3 40.6-11.1 1.4-4.8-4.5.6-7.3 2.3-2.4 18.7-12.9Z"/></svg>';
  var SVG_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';

  // Inject icon SVGs into buttons on load
  document.getElementById('refresh-btn').innerHTML = SVG_REFRESH;
  document.getElementById('theme-btn').innerHTML = SVG_MOON;
  document.getElementById('settings-btn').innerHTML = SVG_SLIDERS;

  // ---- State ----
  var services = [];
  var doctorIssues = [];
  var aliases = {};
  var notes = {};
  var selectedTerminal = '';
  var terminals = [];
  var expandedService = null;
  var activeBackend = null;
  var searchQuery = '';

  // ---- Theme ----
  function initTheme() {
    var saved = localStorage.getItem('kennel-theme') || 'dark';
    applyTheme(saved);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kennel-theme', theme);
    document.getElementById('theme-btn').innerHTML = theme === 'dark' ? SVG_MOON : SVG_SUN;
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeClaude(); return; }
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'd' || e.key === 'D') { e.preventDefault(); toggleTheme(); }
  });

  document.getElementById('claude-modal').addEventListener('click', function(e) {
    if (e.target === this) closeClaude();
  });

  initTheme();

  // ---- Settings panel ----
  function toggleSettings() {
    var panel = document.getElementById('settings-panel');
    panel.classList.toggle('open');
  }

  document.addEventListener('click', function(e) {
    var panel = document.getElementById('settings-panel');
    var btn = document.getElementById('settings-btn');
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  function renderTerminals() {
    var list = document.getElementById('terminal-list');
    if (terminals.length === 0) {
      list.innerHTML = '<div style="padding:8px 14px;color:var(--text-muted);font-size:11px;">No terminals detected</div>';
      return;
    }
    list.innerHTML = terminals.map(function(t) {
      var sel = t.name === selectedTerminal;
      return '<div class="terminal-option' + (sel ? ' selected' : '') + '" onclick="selectTerminal(\\'' + esc(t.name) + '\\')">' +
        '<div class="terminal-radio"></div>' +
        '<span>' + esc(t.name) + '</span></div>';
    }).join('');
  }

  function selectTerminal(name) {
    selectedTerminal = name;
    fetch('/api/config/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terminal: name }),
    });
    renderTerminals();
    showToast('Terminal set to ' + name, 'success');
  }

  // ---- Data fetching ----
  function fetchConfig() {
    return fetch('/api/config').then(function(r) { return r.json(); }).then(function(c) {
      aliases = c.aliases || {};
      notes = c.notes || {};
      selectedTerminal = c.terminal || '';
    });
  }

  function fetchTerminals() {
    return fetch('/api/terminals').then(function(r) { return r.json(); }).then(function(t) {
      terminals = t;
      if (!selectedTerminal && t.length > 0) selectedTerminal = t[0].name;
      renderTerminals();
    });
  }

  function fetchServices() {
    return fetch('/api/services').then(function(r) { return r.json(); }).then(function(d) {
      services = d; renderServices(); updateStats();
    });
  }

  function fetchDoctor() {
    return fetch('/api/doctor').then(function(r) { return r.json(); }).then(function(d) {
      doctorIssues = d; renderDoctor();
    });
  }

  function fetchLogs(name) {
    return fetch('/api/logs/' + encodeURIComponent(name) + '?lines=30').then(function(r) { return r.json(); }).then(function(d) { return d.logs; });
  }

  function performAction(name, action) {
    fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, action: action }),
    }).then(function(r) { return r.json(); }).then(function(result) {
      showToast(result.message, result.success ? 'success' : 'error');
      setTimeout(fetchServices, 800);
    });
  }

  function saveNote(name, note) {
    if (note) { notes[name] = note; } else { delete notes[name]; }
    return fetch('/api/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, note: note }),
    });
  }

  function saveAlias(name, displayName) {
    return fetch('/api/alias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, displayName: displayName }),
    }).then(function() {
      if (displayName) { aliases[name] = displayName; } else { delete aliases[name]; }
      renderServices();
    });
  }

  // ---- Claude ----
  var pendingPrompt = '';

  function launchClaude(serviceName) {
    var s = services.find(function(svc) { return svc.name === serviceName; });
    if (!s) return;
    var parts = ['Investigate the macOS service "' + serviceName + '" (' + s.backend + ' backend).'];
    if (s.configPath) parts.push('Config: ' + s.configPath);
    if (s.command) parts.push('Command: ' + s.command);
    if (s.cwd) parts.push('Working dir: ' + s.cwd);
    parts.push('Status: ' + s.status + (s.pid ? ', PID ' + s.pid : '') + '.');
    if (s.logPaths && s.logPaths.stdout) parts.push('Logs: ' + s.logPaths.stdout);
    if (notes[serviceName]) parts.push('User notes: ' + notes[serviceName]);
    parts.push('Read the config file and recent logs. Tell me what this service does, whether it looks healthy, and anything notable about its configuration.');
    showClaudeModal(parts.join(' '));
  }

  function launchClaudeForIssue(idx) {
    var issue = doctorIssues[idx];
    if (!issue) return;
    var prompt = 'Investigate a health check issue with the macOS service "' + issue.service + '" (' + issue.backend + '). ' +
      'Issue: ' + issue.message + (issue.suggestion ? ' Suggestion: ' + issue.suggestion : '') +
      ' Diagnose this issue and suggest a fix.';
    showClaudeModal(prompt);
  }

  function showClaudeModal(prompt) {
    if (!selectedTerminal) {
      showToast('Select a terminal app in settings first', 'error');
      document.getElementById('settings-panel').classList.add('open');
      return;
    }
    pendingPrompt = prompt;
    document.getElementById('claude-modal-icon').innerHTML = SVG_CLAUDE + '<span class="modal-title">Open in Claude</span>';
    document.getElementById('claude-modal-prompt').textContent = prompt;

    var sel = document.getElementById('claude-modal-terminal-select');
    sel.innerHTML = terminals.map(function(t) {
      return '<option value="' + esc(t.name) + '"' + (t.name === selectedTerminal ? ' selected' : '') + '>' + esc(t.name) + '</option>';
    }).join('');
    sel.onchange = function() {
      selectedTerminal = sel.value;
      document.getElementById('claude-modal-launch').textContent = 'Open in ' + selectedTerminal;
      selectTerminal(selectedTerminal);
    };

    document.getElementById('claude-modal-launch').textContent = 'Open in ' + selectedTerminal;
    document.getElementById('claude-modal-launch').onclick = confirmClaude;
    document.getElementById('claude-modal').classList.add('open');
  }

  function closeClaude() {
    document.getElementById('claude-modal').classList.remove('open');
    pendingPrompt = '';
  }

  function copyClaudePrompt() {
    navigator.clipboard.writeText(pendingPrompt).then(function() {
      showToast('Prompt copied to clipboard', 'success');
    });
  }

  function confirmClaude() {
    var prompt = pendingPrompt;
    closeClaude();
    fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt }),
    }).then(function(r) { return r.json(); }).then(function(result) {
      if (result.success) {
        showToast('Opened claude in ' + selectedTerminal, 'success');
      } else {
        showToast(result.message || 'Failed to launch Claude', 'error');
      }
    }).catch(function() { showToast('Failed to launch Claude', 'error'); });
  }

  // ---- Rendering ----
  function getFiltered() {
    return services.filter(function(s) {
      if (activeBackend && s.backend !== activeBackend) return false;
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        var dn = (aliases[s.name] || friendlyName(s.name)).toLowerCase();
        if (s.name.toLowerCase().indexOf(q) === -1 && dn.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function updateStats() {
    document.getElementById('stat-total').textContent = services.length;
    document.getElementById('stat-running').textContent = services.filter(function(s) { return s.status === 'running'; }).length;
    document.getElementById('stat-stopped').textContent = services.filter(function(s) { return s.status === 'stopped' || s.status === 'unknown'; }).length;
    document.getElementById('stat-errors').textContent = services.filter(function(s) { return s.status === 'error'; }).length;
  }

  function renderServices() {
    var wrap = document.getElementById('service-list');
    var filtered = getFiltered();

    if (filtered.length === 0) {
      wrap.innerHTML = '<div class="empty">no services match your filters</div>';
      return;
    }

    var h = '<table class="service-table"><colgroup><col class="col-indicator"><col class="col-name"><col class="col-backend"><col class="col-status"><col class="col-pid"><col class="col-schedule"><col class="col-actions"></colgroup>';
    h += '<thead><tr><th></th><th>Name</th><th>Backend</th><th>Status</th><th>PID</th><th>Schedule</th><th>Actions</th></tr></thead><tbody>';

    filtered.forEach(function(s, i) {
      var isExp = expandedService === s.name;
      var en = esc(s.name);

      h += '<tr class="svc-row animate-in' + (isExp ? ' expanded' : '') + '" style="animation-delay:' + (i * 25) + 'ms" data-name="' + en + '">';
      h += '<td class="td-indicator"><span class="stripe ' + s.status + '"></span></td>';

      // Name
      h += '<td class="td-name"><div class="name-line">' + esc(aliases[s.name] || friendlyName(s.name));
      h += ' <button class="edit-btn" onclick="event.stopPropagation();startRename(\\'' + en + '\\')" title="Rename">' + SVG_EDIT + '</button></div>';
      h += '<div class="service-id">' + en + '</div></td>';

      h += '<td class="td-backend backend-' + s.backend + '">' + s.backend + '</td>';
      h += '<td class="td-status"><span class="status-dot ' + s.status + '"></span>' + s.status + '</td>';
      h += '<td class="td-pid">' + (s.pid || '\u2014') + '</td>';
      h += '<td class="td-schedule">' + (s.schedule || '\u2014') + '</td>';

      // Actions
      h += '<td class="td-actions">';
      if (s.manageable && s.status === 'running') {
        h += '<button class="action-btn stop" onclick="event.stopPropagation();performAction(\\'' + en + '\\',\\'stop\\')">stop</button>';
        h += '<button class="action-btn" onclick="event.stopPropagation();performAction(\\'' + en + '\\',\\'restart\\')">restart</button>';
      } else if (s.manageable && s.status !== 'running' && s.status !== 'scheduled') {
        h += '<button class="action-btn start" onclick="event.stopPropagation();performAction(\\'' + en + '\\',\\'start\\')">start</button>';
      }
      h += '<button class="claude-btn" onclick="event.stopPropagation();launchClaude(\\'' + en + '\\')" title="Investigate with Claude">' + SVG_CLAUDE + '</button>';
      h += '</td></tr>';

      // Expanded detail row
      if (isExp) {
        h += '<tr class="detail-row"><td colspan="7" class="detail-td"><div class="detail-inner"><div class="detail-grid">';
        h += kv('command', s.command) + kv('cwd', s.cwd) + kv('config', s.configPath);
        h += kv('enabled', s.enabled !== undefined ? (s.enabled ? 'yes' : 'no') : null);
        h += kv('exit code', s.exitCode !== undefined ? String(s.exitCode) : null);
        h += kv('restarts', s.restartCount !== undefined ? String(s.restartCount) : null);
        h += kv('stdout', s.logPaths ? s.logPaths.stdout : null);
        h += kv('stderr', s.logPaths && s.logPaths.stderr !== s.logPaths.stdout ? s.logPaths.stderr : null);
        h += '</div><div class="notes-section"><div class="notes-header"><span class="log-label">notes</span><span class="notes-saved" id="notes-saved-' + en + '">saved</span></div>';
        h += '<textarea class="notes-textarea" id="notes-' + en + '" placeholder="What does this service do? Add notes here...">' + esc(notes[s.name] || '') + '</textarea></div>';
        h += '<div class="log-viewer"><div class="log-label">recent logs</div>';
        h += '<div class="log-content" id="logs-' + en + '">loading...</div></div></div></td></tr>';
      }
    });

    h += '</tbody></table>';
    wrap.innerHTML = h;

    wrap.querySelectorAll('tr.svc-row').forEach(function(row) {
      row.addEventListener('click', function() { toggleExpand(row.dataset.name); });
    });

    if (expandedService) {
      loadLogs(expandedService);
      bindNotes(expandedService);
    }
  }

  function kv(label, value) {
    if (!value) return '';
    return '<div class="detail-kv"><span class="detail-k">' + label + '</span><span class="detail-v" title="' + esc(value) + '">' + esc(value) + '</span></div>';
  }

  function toggleExpand(name) {
    expandedService = expandedService === name ? null : name;
    renderServices();
  }

  function loadLogs(name) {
    var el = document.getElementById('logs-' + name);
    if (!el) return;
    fetchLogs(name).then(function(logs) {
      el.textContent = logs || '(no logs available)';
      el.scrollTop = el.scrollHeight;
    });
  }

  function bindNotes(name) {
    var textarea = document.getElementById('notes-' + name);
    var saved = document.getElementById('notes-saved-' + name);
    if (!textarea) return;
    var timer = null;
    textarea.addEventListener('input', function() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function() {
        saveNote(name, textarea.value.trim()).then(function() {
          saved.classList.add('show');
          setTimeout(function() { saved.classList.remove('show'); }, 1500);
        });
      }, 600);
    });
    // Prevent row click from collapsing when clicking in textarea
    textarea.addEventListener('click', function(e) { e.stopPropagation(); });
  }

  function renderDoctor() {
    var badge = document.getElementById('doctor-badge');
    var results = document.getElementById('doctor-results');

    if (doctorIssues.length === 0) {
      badge.textContent = 'healthy';
      badge.className = 'doctor-badge clean';
      results.innerHTML = '<div class="doctor-issue" style="color:var(--green);justify-content:center;">all services look healthy</div>';
    } else {
      badge.textContent = doctorIssues.length + ' issue' + (doctorIssues.length > 1 ? 's' : '');
      badge.className = 'doctor-badge issues';
      results.innerHTML = doctorIssues.map(function(issue, idx) {
        return '<div class="doctor-issue">' +
          '<span class="issue-icon ' + issue.severity + '">' + (issue.severity === 'error' ? '\u2716' : issue.severity === 'warning' ? '\u26A0' : '\u2139') + '</span>' +
          '<div class="issue-body">' +
            '<div class="issue-service">' + esc(issue.service) + ' <span style="color:var(--text-muted)">(' + issue.backend + ')</span></div>' +
            '<div class="issue-message">' + esc(issue.message) + '</div>' +
            (issue.suggestion ? '<div class="issue-suggestion">' + esc(issue.suggestion) + '</div>' : '') +
          '</div>' +
          '<div class="issue-actions"><button class="claude-btn" onclick="launchClaudeForIssue(' + idx + ')" title="Investigate with Claude">' + SVG_CLAUDE + '</button></div>' +
        '</div>';
      }).join('');
    }
  }

  // ---- Utilities ----
  function showToast(message, type) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'success');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function friendlyName(name) {
    var f = name
      .replace(/^com\\.apple\\./, '')
      .replace(/^com\\.\\w+\\./, '')
      .replace(/^org\\.\\w+\\./, '')
      .replace(/^io\\.\\w+\\./, '')
      .replace(/^homebrew\\.mxcl\\./, '');
    return f.replace(/[._-]+/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
  }

  function startRename(serviceName) {
    var row = document.querySelector('tr[data-name="' + serviceName + '"]');
    if (!row) return;
    var cell = row.querySelector('.td-name');
    var current = aliases[serviceName] || friendlyName(serviceName);
    cell.innerHTML = '<input class="rename-input" value="' + esc(current) + '" /><div class="service-id">' + esc(serviceName) + '</div>';
    var input = cell.querySelector('.rename-input');
    input.focus();
    input.select();
    function commit() {
      var val = input.value.trim();
      saveAlias(serviceName, val && val !== friendlyName(serviceName) ? val : '');
    }
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') renderServices();
    });
    input.addEventListener('blur', commit);
  }

  function manualRefresh() {
    var btn = document.getElementById('refresh-btn');
    btn.classList.add('spinning');
    setTimeout(function() { btn.classList.remove('spinning'); }, 600);
    countdown = 60;
    fetchServices();
    fetchDoctor();
  }

  // ---- Event listeners ----
  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeBackend = btn.dataset.backend || null;
      expandedService = null;
      renderServices();
    });
  });

  document.getElementById('search').addEventListener('input', function(e) {
    searchQuery = e.target.value;
    renderServices();
  });

  document.getElementById('doctor-toggle').addEventListener('click', function() {
    document.getElementById('doctor-results').classList.toggle('open');
  });

  // ---- Auto-refresh ----
  var countdown = 60;
  function tick() {
    countdown--;
    document.getElementById('refresh-timer').textContent = countdown + 's';
    if (countdown <= 0) {
      countdown = 60;
      fetchServices();
      fetchDoctor();
    }
  }

  // ---- Init ----
  fetchConfig().then(function() {
    fetchTerminals();
    fetchServices();
    fetchDoctor();
  });
  setInterval(tick, 1000);
</script>
</body>
</html>`;
}
