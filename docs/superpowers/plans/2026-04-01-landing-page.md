# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the kennel.sh landing page to showcase both CLI and menu bar app with high design quality

**Architecture:** Single-file static HTML/CSS/JS. Scroll-triggered animations, dual install paths, terminal animation showing new CLI design, dashboard mockup section.

**Tech Stack:** HTML, CSS, JavaScript (no framework)

---

## Task 1: Page Structure and Updated Hero

Update the hero to a two-column layout with updated copy, v0.2.0 badge, and dual install options (CLI + Mac app download).

- [ ] Replace the current centered hero with a two-column layout
- [ ] Update badge to v0.2.0
- [ ] Tighten subtitle copy to emphasize both CLI and menu bar app
- [ ] Add dual install section: `npm install -g kennel` and "Download for Mac" button side by side
- [ ] Widen container to 1100px for the two-column hero layout

Replace the full `site/index.html` content with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>kennel — where your daemons live</title>
<meta name="description" content="Unified macOS service manager for launchd, PM2, Homebrew services, and cron. CLI + menu bar app + web dashboard.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #08080a;
    --bg-surface: #0f0f13;
    --bg-raised: #16161c;
    --border: #222230;
    --text: #e8e8ec;
    --text-dim: #9090a8;
    --text-muted: #55556a;
    --green: #22c55e;
    --red: #ef4444;
    --cyan: #06b6d4;
    --magenta: #a855f7;
    --amber: #f59e0b;
    --blue: #3b82f6;
    --accent: #22c55e;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Space Grotesk', -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    overflow-x: hidden;
  }

  /* Grain overlay */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 9999;
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Nav */
  nav {
    padding: 20px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-logo {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    text-decoration: none;
  }

  .nav-links {
    display: flex;
    gap: 24px;
    align-items: center;
  }

  .nav-links a {
    color: var(--text-dim);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: color 0.15s;
  }

  .nav-links a:hover { color: var(--text); }

  .nav-github {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .nav-github svg { width: 18px; height: 18px; fill: currentColor; }

  /* Hero */
  .hero {
    padding: 100px 0 80px;
  }

  .hero-top {
    text-align: center;
    margin-bottom: 64px;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 6px 16px;
    font-size: 12px;
    color: var(--text-dim);
    margin-bottom: 32px;
    font-family: 'JetBrains Mono', monospace;
  }

  .hero-badge .dot {
    width: 6px;
    height: 6px;
    background: var(--green);
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
  }

  h1 {
    font-size: clamp(48px, 8vw, 80px);
    font-weight: 700;
    letter-spacing: -2px;
    line-height: 1.05;
    margin-bottom: 20px;
  }

  h1 .dim { color: var(--text-muted); }

  .hero-sub {
    font-size: 18px;
    color: var(--text-dim);
    max-width: 560px;
    margin: 0 auto 40px;
    line-height: 1.7;
  }

  /* Dual install */
  .hero-install-group {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .hero-install {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 24px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    color: var(--text);
    cursor: pointer;
    transition: border-color 0.15s;
    position: relative;
  }

  .hero-install:hover { border-color: var(--text-muted); }

  .hero-install .prefix { color: var(--green); }

  .hero-install .copy-hint {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .hero-install .copied {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-surface);
    border-radius: 8px;
    color: var(--green);
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
  }

  .hero-install .copied.show { opacity: 1; }

  .download-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--green);
    color: #000;
    border: none;
    border-radius: 8px;
    padding: 14px 28px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    text-decoration: none;
  }

  .download-btn:hover { opacity: 0.9; transform: translateY(-1px); }

  .download-btn svg { width: 18px; height: 18px; }

  /* Hero columns */
  .hero-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    align-items: start;
  }

  /* ---- Styles continue in Task 2+ ---- */
</style>
</head>
<body>
  <div class="container">
    <nav>
      <a href="/" class="nav-logo">kennel</a>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#dashboard">Dashboard</a>
        <a href="https://github.com/alexpriest/kennel" class="nav-github" target="_blank">
          <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub
        </a>
      </div>
    </nav>
  </div>

  <section class="hero">
    <div class="container">
      <div class="hero-top">
        <div class="hero-badge"><span class="dot"></span> v0.2.0</div>
        <h1>where your<br><span class="dim">daemons</span> live</h1>
        <p class="hero-sub">One place for every background service on your Mac. CLI for power users, menu bar app for quick glances. Launchd, PM2, Homebrew, cron — unified.</p>
        <div class="hero-install-group">
          <div class="hero-install" onclick="copyInstall()" id="install-box">
            <span class="prefix">$</span>
            <span>npm install -g kennel</span>
            <span class="copy-hint">copy</span>
            <span class="copied" id="copied-msg">copied!</span>
          </div>
          <a class="download-btn" href="#download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download for Mac
          </a>
        </div>
      </div>

      <div class="hero-columns">
        <div class="terminal-wrapper">
          <div class="terminal">
            <div class="terminal-bar">
              <span class="terminal-dot r"></span>
              <span class="terminal-dot y"></span>
              <span class="terminal-dot g"></span>
              <span class="terminal-title">kennel</span>
            </div>
            <div class="terminal-body" id="terminal"></div>
          </div>
        </div>

        <div class="menubar-mockup" id="menubar-mockup">
          <!-- Menu bar app mockup inserted in Task 3 -->
        </div>
      </div>
    </div>
  </section>

  <!-- Dashboard section inserted in Task 4 -->
  <!-- Features section inserted in Task 5 -->
  <!-- Backends + Footer carried forward -->

<script>
  function copyInstall() {
    navigator.clipboard.writeText('npm install -g kennel');
    const msg = document.getElementById('copied-msg');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 1500);
  }
</script>
</body>
</html>
```

---

## Task 2: Updated Terminal Animation

Replace the old `kennel list` / `kennel doctor` animation with the new CLI design showing the stacked bar chart and errors-first layout.

- [ ] Update the terminal animation lines to show the new v0.2.0 CLI output
- [ ] Show bar chart, status summary, errors-first list, then healthy services
- [ ] Use the same typewriter animation approach with per-line delays

Add the following CSS (append inside `<style>` before `</style>`):

```css
  /* Terminal */
  .terminal-wrapper {
    perspective: 800px;
  }

  .terminal {
    background: #0c0c10;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    box-shadow:
      0 4px 24px rgba(0,0,0,0.4),
      0 0 0 1px rgba(255,255,255,0.03) inset;
    transform: rotateX(2deg);
    transition: transform 0.4s ease;
  }

  .terminal:hover { transform: rotateX(0); }

  .terminal-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 16px;
    background: #0a0a0e;
    border-bottom: 1px solid var(--border);
  }

  .terminal-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .terminal-dot.r { background: #ff5f57; }
  .terminal-dot.y { background: #febc2e; }
  .terminal-dot.g { background: #28c840; }

  .terminal-title {
    flex: 1;
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
  }

  .terminal-body {
    padding: 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.8;
    color: var(--text-dim);
    min-height: 320px;
  }

  .terminal-body .prompt { color: var(--green); }
  .terminal-body .cmd { color: var(--text); }
  .terminal-body .header { color: var(--text-muted); font-weight: 600; }
  .terminal-body .running { color: var(--green); }
  .terminal-body .stopped { color: var(--text-muted); }
  .terminal-body .error { color: var(--red); }
  .terminal-body .be-cyan { color: var(--cyan); }
  .terminal-body .be-magenta { color: var(--magenta); }
  .terminal-body .be-amber { color: var(--amber); }
  .terminal-body .be-blue { color: var(--blue); }
  .terminal-body .dim { color: var(--text-muted); }
  .terminal-body .version { color: var(--text-muted); }
  .terminal-body .bar-green { color: var(--green); }
  .terminal-body .bar-red { color: var(--red); }
  .terminal-body .bar-amber { color: var(--amber); }
  .terminal-body .bar-muted { color: var(--text-muted); }
  .terminal-body .border-char { color: var(--border); }
  .terminal-body .separator { color: var(--border); }

  .terminal-line {
    opacity: 0;
    animation: termLine 0.3s ease-out forwards;
    white-space: pre;
  }

  @keyframes termLine {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
```

Replace the `<script>` block at the bottom with:

```html
<script>
  function copyInstall() {
    navigator.clipboard.writeText('npm install -g kennel');
    const msg = document.getElementById('copied-msg');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 1500);
  }

  // Terminal animation — new CLI design with bar chart + errors-first
  const lines = [
    { text: '$ kennel', type: 'command' },
    { text: '' },
    { html: '<span class="version">kennel v0.2.0</span>' },
    { text: '' },
    { html: '<span class="border-char">╭──────────────────────────────────────────────────────╮</span>' },
    { html: '<span class="border-char">│</span>  <span class="bar-green">▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰</span><span class="bar-red">▰▰▰▰</span><span class="bar-amber">▰▰▰▰▰▰</span><span class="bar-muted">▰▰▰▰▰▰▰▰▰▰</span>          <span class="border-char">│</span>' },
    { html: '<span class="border-char">│</span>  <span class="running">●</span> 12 running   <span class="error">●</span> 2 errors   <span class="be-amber">●</span> 3 scheduled   <span class="stopped">○</span> 5 stopped <span class="border-char">│</span>' },
    { html: '<span class="border-char">╰──────────────────────────────────────────────────────╯</span>' },
    { text: '' },
    { html: '  <span class="error">✖ Obsidian CRM</span>             <span class="be-cyan">launchd</span>   <span class="error">error</span>      <span class="dim">exit 1</span>' },
    { html: '  <span class="separator">──────────────────────────────────────────────────────</span>' },
    { html: '  <span class="running">●</span> Syncthing               <span class="be-amber">brew</span>      <span class="running">running</span>    <span class="dim">pid 1234</span>' },
    { html: '  <span class="running">●</span> Cloudflare Tunnel        <span class="be-cyan">launchd</span>   <span class="running">running</span>    <span class="dim">pid 1561</span>' },
    { html: '  <span class="running">●</span> TextMe                   <span class="be-magenta">pm2</span>       <span class="running">running</span>    <span class="dim">pid 57648</span>' },
    { html: '  <span class="be-amber">◷</span> Daily Backup             <span class="be-blue">cron</span>      <span class="dim">every 6h</span>' },
    { html: '  <span class="stopped">○</span> iMessage Attio           <span class="be-cyan">launchd</span>   <span class="stopped">stopped</span>' },
  ];

  const terminal = document.getElementById('terminal');
  let lineIndex = 0;

  function renderLine() {
    if (lineIndex >= lines.length) return;

    const line = lines[lineIndex];
    const el = document.createElement('div');
    el.className = 'terminal-line';
    el.style.animationDelay = '0ms';

    if (line.type === 'command') {
      el.innerHTML = '<span class="prompt">$ </span><span class="cmd">' + line.text.slice(2) + '</span>';
    } else if (line.html) {
      el.innerHTML = line.html;
    } else {
      el.textContent = line.text || '\u00A0';
    }

    terminal.appendChild(el);
    lineIndex++;

    const delay = line.type === 'command' ? 600 : line.text === '' ? 100 : 80;
    setTimeout(renderLine, delay);
  }

  // Start animation when terminal scrolls into view
  const termObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      setTimeout(renderLine, 500);
      termObserver.disconnect();
    }
  }, { threshold: 0.3 });

  termObserver.observe(document.querySelector('.terminal'));
</script>
```

---

## Task 3: Menu Bar App Mockup in Hero

Build a pure CSS/HTML mockup of the kennel menu bar dropdown that sits in the right column of the hero. This should look like a macOS menu bar extra dropdown panel.

- [ ] Create a realistic menu bar app mockup with a mini status bar at top
- [ ] Show a condensed service list with status indicators
- [ ] Include a subtle macOS-style pointer/arrow at top
- [ ] Add a gentle float animation to the mockup

Add the following CSS (append inside `<style>`):

```css
  /* Menu Bar Mockup */
  .menubar-mockup {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding-top: 20px;
  }

  .menubar-chrome {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    padding: 6px 16px;
    background: #1c1c1e;
    border-radius: 8px 8px 0 0;
    border: 1px solid #333;
    border-bottom: none;
    width: 340px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 12px;
    color: #ccc;
  }

  .menubar-chrome-time {
    font-weight: 500;
  }

  .menubar-chrome-icons {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .menubar-chrome-icons span {
    font-size: 14px;
    opacity: 0.7;
  }

  .menubar-kennel-icon {
    font-size: 13px;
    color: var(--green);
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }

  .menubar-dropdown {
    width: 340px;
    background: rgba(30, 30, 34, 0.97);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0 0 12px 12px;
    box-shadow:
      0 20px 60px rgba(0,0,0,0.5),
      0 0 0 1px rgba(255,255,255,0.05) inset;
    overflow: hidden;
    animation: menubarFloat 4s ease-in-out infinite;
  }

  @keyframes menubarFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  .menubar-header {
    padding: 16px 16px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .menubar-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 8px;
  }

  .menubar-summary {
    display: flex;
    gap: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }

  .menubar-stat {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .menubar-stat .dot-sm {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  .menubar-stat .dot-sm.green { background: var(--green); }
  .menubar-stat .dot-sm.red { background: var(--red); }
  .menubar-stat .dot-sm.muted { background: var(--text-muted); }

  .menubar-stat .count { color: var(--text-dim); }

  .menubar-services {
    padding: 8px 0;
  }

  .menubar-service {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    transition: background 0.1s;
  }

  .menubar-service:hover {
    background: rgba(255,255,255,0.04);
  }

  .menubar-service-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .menubar-service-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .menubar-service-indicator.green { background: var(--green); box-shadow: 0 0 6px rgba(34,197,94,0.4); }
  .menubar-service-indicator.red { background: var(--red); box-shadow: 0 0 6px rgba(239,68,68,0.4); }
  .menubar-service-indicator.muted { background: var(--text-muted); }

  .menubar-service-name { color: var(--text); }

  .menubar-service-backend {
    color: var(--text-muted);
    font-size: 10px;
  }

  .menubar-footer {
    padding: 10px 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .menubar-footer-link {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s;
  }

  .menubar-footer-link:hover { color: var(--text); }
```

Replace the `<div class="menubar-mockup" id="menubar-mockup">` placeholder in the HTML with:

```html
        <div class="menubar-mockup" id="menubar-mockup">
          <div class="menubar-chrome">
            <div class="menubar-chrome-icons">
              <span>&#9679;</span>
              <span class="menubar-kennel-icon">K</span>
            </div>
            <div class="menubar-chrome-time">3:42 PM</div>
          </div>
          <div class="menubar-dropdown">
            <div class="menubar-header">
              <div class="menubar-title">kennel</div>
              <div class="menubar-summary">
                <div class="menubar-stat"><span class="dot-sm green"></span><span class="count">12 running</span></div>
                <div class="menubar-stat"><span class="dot-sm red"></span><span class="count">2 errors</span></div>
                <div class="menubar-stat"><span class="dot-sm muted"></span><span class="count">5 stopped</span></div>
              </div>
            </div>
            <div class="menubar-services">
              <div class="menubar-service">
                <div class="menubar-service-left">
                  <span class="menubar-service-indicator red"></span>
                  <span class="menubar-service-name">Obsidian CRM</span>
                </div>
                <span class="menubar-service-backend">launchd</span>
              </div>
              <div class="menubar-service">
                <div class="menubar-service-left">
                  <span class="menubar-service-indicator green"></span>
                  <span class="menubar-service-name">Syncthing</span>
                </div>
                <span class="menubar-service-backend">brew</span>
              </div>
              <div class="menubar-service">
                <div class="menubar-service-left">
                  <span class="menubar-service-indicator green"></span>
                  <span class="menubar-service-name">Cloudflare Tunnel</span>
                </div>
                <span class="menubar-service-backend">launchd</span>
              </div>
              <div class="menubar-service">
                <div class="menubar-service-left">
                  <span class="menubar-service-indicator green"></span>
                  <span class="menubar-service-name">TextMe</span>
                </div>
                <span class="menubar-service-backend">pm2</span>
              </div>
              <div class="menubar-service">
                <div class="menubar-service-left">
                  <span class="menubar-service-indicator muted"></span>
                  <span class="menubar-service-name">iMessage Attio</span>
                </div>
                <span class="menubar-service-backend">launchd</span>
              </div>
            </div>
            <div class="menubar-footer">
              <span class="menubar-footer-link">Open Dashboard</span>
              <span class="menubar-footer-link">Quit</span>
            </div>
          </div>
        </div>
```

---

## Task 4: Dashboard Section

Add a new full-width dashboard mockup section between the hero and features. This is a CSS-rendered mockup of the web dashboard showing the service management view.

- [ ] Add a section with heading and subtitle
- [ ] Build a CSS mockup of the dashboard showing service rows with status, controls, and log preview
- [ ] Use a perspective transform for depth
- [ ] Wire up scroll animation (IntersectionObserver, handled in Task 6)

Add the following CSS (append inside `<style>`):

```css
  /* Dashboard section */
  .dashboard-section {
    padding: 80px 0 100px;
  }

  .section-header {
    text-align: center;
    margin-bottom: 56px;
  }

  .section-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: var(--green);
    margin-bottom: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
  }

  .section-heading {
    font-size: clamp(32px, 5vw, 48px);
    font-weight: 700;
    letter-spacing: -1.5px;
    margin-bottom: 16px;
  }

  .section-desc {
    font-size: 16px;
    color: var(--text-dim);
    max-width: 480px;
    margin: 0 auto;
    line-height: 1.7;
  }

  .dashboard-mockup-wrapper {
    perspective: 1200px;
    max-width: 960px;
    margin: 0 auto;
  }

  .dashboard-mockup {
    background: #0a0a0e;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow:
      0 8px 40px rgba(0,0,0,0.5),
      0 0 0 1px rgba(255,255,255,0.03) inset,
      0 0 80px rgba(34,197,94,0.03);
    transform: rotateX(4deg);
    transition: transform 0.5s ease;
  }

  .dashboard-mockup:hover { transform: rotateX(0); }

  .dashboard-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    background: #0c0c10;
  }

  .dashboard-topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dashboard-topbar-logo {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }

  .dashboard-topbar-logo span {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 11px;
    margin-left: 8px;
  }

  .dashboard-topbar-right {
    display: flex;
    gap: 8px;
  }

  .dashboard-topbar-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    padding: 4px 10px;
    border-radius: 100px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    color: var(--text-dim);
  }

  .dashboard-topbar-pill.green {
    background: rgba(34,197,94,0.08);
    border-color: rgba(34,197,94,0.2);
    color: var(--green);
  }

  .dashboard-body {
    padding: 0;
  }

  .dashboard-row {
    display: grid;
    grid-template-columns: 6px 1fr 100px 100px 80px;
    gap: 0;
    align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    transition: background 0.1s;
  }

  .dashboard-row:hover { background: rgba(255,255,255,0.02); }

  .dashboard-row-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .dashboard-row-indicator.green { background: var(--green); box-shadow: 0 0 6px rgba(34,197,94,0.4); }
  .dashboard-row-indicator.red { background: var(--red); box-shadow: 0 0 6px rgba(239,68,68,0.4); }
  .dashboard-row-indicator.muted { background: var(--text-muted); }
  .dashboard-row-indicator.amber { background: var(--amber); }

  .dashboard-row-name {
    padding-left: 14px;
    color: var(--text);
    font-weight: 500;
  }

  .dashboard-row-backend {
    color: var(--text-muted);
    font-size: 11px;
  }

  .dashboard-row-status {
    font-size: 11px;
  }

  .dashboard-row-status.running { color: var(--green); }
  .dashboard-row-status.error { color: var(--red); }
  .dashboard-row-status.stopped { color: var(--text-muted); }
  .dashboard-row-status.scheduled { color: var(--amber); }

  .dashboard-row-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }

  .dashboard-row-action {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    cursor: pointer;
  }

  .dashboard-log-preview {
    grid-column: 1 / -1;
    margin-top: 8px;
    padding: 10px 14px;
    background: rgba(0,0,0,0.3);
    border-radius: 6px;
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.6;
    margin-left: 20px;
  }

  .dashboard-log-preview .log-error { color: var(--red); }
  .dashboard-log-preview .log-ts { color: var(--text-muted); opacity: 0.5; }
```

Add this HTML after the `</section>` closing tag of the hero section:

```html
  <section class="dashboard-section" id="dashboard">
    <div class="container">
      <div class="section-header">
        <div class="section-label">Web Dashboard</div>
        <h2 class="section-heading">Monitor, manage, investigate</h2>
        <p class="section-desc">A real-time dashboard for every service. See logs, restart processes, and diagnose failures without touching the terminal.</p>
      </div>

      <div class="dashboard-mockup-wrapper">
        <div class="dashboard-mockup">
          <div class="dashboard-topbar">
            <div class="dashboard-topbar-left">
              <span class="dashboard-topbar-logo">kennel <span>dashboard</span></span>
            </div>
            <div class="dashboard-topbar-right">
              <span class="dashboard-topbar-pill green">12 running</span>
              <span class="dashboard-topbar-pill">22 total</span>
            </div>
          </div>
          <div class="dashboard-body">
            <div class="dashboard-row">
              <span class="dashboard-row-indicator red"></span>
              <span class="dashboard-row-name">Obsidian CRM</span>
              <span class="dashboard-row-backend">launchd</span>
              <span class="dashboard-row-status error">error</span>
              <span class="dashboard-row-actions">
                <span class="dashboard-row-action">&#9654;</span>
                <span class="dashboard-row-action">&#8635;</span>
              </span>
            </div>
            <div class="dashboard-log-preview">
              <span class="log-ts">2026-04-01 15:38:22</span> <span class="log-error">Error: ECONNREFUSED 127.0.0.1:5432</span><br>
              <span class="log-ts">2026-04-01 15:38:22</span> <span class="log-error">Process exited with code 1</span>
            </div>
            <div class="dashboard-row">
              <span class="dashboard-row-indicator green"></span>
              <span class="dashboard-row-name">Syncthing</span>
              <span class="dashboard-row-backend">brew</span>
              <span class="dashboard-row-status running">running</span>
              <span class="dashboard-row-actions">
                <span class="dashboard-row-action">&#9724;</span>
                <span class="dashboard-row-action">&#8635;</span>
              </span>
            </div>
            <div class="dashboard-row">
              <span class="dashboard-row-indicator green"></span>
              <span class="dashboard-row-name">Cloudflare Tunnel</span>
              <span class="dashboard-row-backend">launchd</span>
              <span class="dashboard-row-status running">running</span>
              <span class="dashboard-row-actions">
                <span class="dashboard-row-action">&#9724;</span>
                <span class="dashboard-row-action">&#8635;</span>
              </span>
            </div>
            <div class="dashboard-row">
              <span class="dashboard-row-indicator green"></span>
              <span class="dashboard-row-name">TextMe</span>
              <span class="dashboard-row-backend">pm2</span>
              <span class="dashboard-row-status running">running</span>
              <span class="dashboard-row-actions">
                <span class="dashboard-row-action">&#9724;</span>
                <span class="dashboard-row-action">&#8635;</span>
              </span>
            </div>
            <div class="dashboard-row">
              <span class="dashboard-row-indicator amber"></span>
              <span class="dashboard-row-name">Daily Backup</span>
              <span class="dashboard-row-backend">cron</span>
              <span class="dashboard-row-status scheduled">every 6h</span>
              <span class="dashboard-row-actions">
                <span class="dashboard-row-action">&#9654;</span>
              </span>
            </div>
            <div class="dashboard-row">
              <span class="dashboard-row-indicator muted"></span>
              <span class="dashboard-row-name">iMessage Attio</span>
              <span class="dashboard-row-backend">launchd</span>
              <span class="dashboard-row-status stopped">stopped</span>
              <span class="dashboard-row-actions">
                <span class="dashboard-row-action">&#9654;</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
```

---

## Task 5: Updated Feature Grid

Tighten feature descriptions to be benefit-oriented and add "Menu Bar App" as a feature. Replace "Web Dashboard" with "Menu Bar App" since the dashboard now has its own section.

- [ ] Update feature copy to be concise and benefit-oriented
- [ ] Replace "Web Dashboard" with "Menu Bar App" feature
- [ ] Keep the 3x2 grid layout

Add the following CSS (append inside `<style>` — carried forward from original with no changes needed):

```css
  /* Features */
  .features {
    padding: 100px 0;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }

  .feature {
    background: var(--bg-surface);
    padding: 32px 28px;
    transition: background 0.15s;
  }

  .feature:hover { background: var(--bg-raised); }

  .feature:nth-child(1) { border-radius: 10px 0 0 0; }
  .feature:nth-child(3) { border-radius: 0 10px 0 0; }
  .feature:nth-child(4) { border-radius: 0 0 0 10px; }
  .feature:nth-child(6) { border-radius: 0 0 10px 0; }

  .feature-icon {
    font-size: 24px;
    margin-bottom: 16px;
    display: block;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
  }

  .feature-icon.green { background: rgba(34,197,94,0.1); color: var(--green); }
  .feature-icon.cyan { background: rgba(6,182,212,0.1); color: var(--cyan); }
  .feature-icon.magenta { background: rgba(168,85,247,0.1); color: var(--magenta); }
  .feature-icon.amber { background: rgba(245,158,11,0.1); color: var(--amber); }
  .feature-icon.blue { background: rgba(59,130,246,0.1); color: var(--blue); }
  .feature-icon.red { background: rgba(239,68,68,0.1); color: var(--red); }

  .feature h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .feature p {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.6;
  }
```

Add this HTML after the dashboard section:

```html
  <section class="features" id="features">
    <div class="container">
      <div class="section-header">
        <div class="section-label">Features</div>
        <h2 class="section-heading">Everything you need</h2>
      </div>
      <div class="features-grid">
        <div class="feature">
          <div class="feature-icon green">*</div>
          <h3>Unified View</h3>
          <p>Every background service in one table. Stop switching between launchctl, pm2 list, brew services, and crontab -l.</p>
        </div>
        <div class="feature">
          <div class="feature-icon cyan">&#9881;</div>
          <h3>Start, Stop, Restart</h3>
          <p>One interface to manage any service regardless of backend. No more remembering four different CLIs.</p>
        </div>
        <div class="feature">
          <div class="feature-icon magenta">&#9820;</div>
          <h3>MCP Server</h3>
          <p>Let Claude manage your services directly. Built-in Model Context Protocol server for AI-native workflows.</p>
        </div>
        <div class="feature">
          <div class="feature-icon amber">&#9678;</div>
          <h3>Menu Bar App</h3>
          <p>Glanceable service status in your menu bar. See errors instantly, restart services without opening a terminal.</p>
        </div>
        <div class="feature">
          <div class="feature-icon red">&#9763;</div>
          <h3>Health Checks</h3>
          <p>Automatic detection of stale PIDs, missing executables, hardcoded secrets, and crash loops.</p>
        </div>
        <div class="feature">
          <div class="feature-icon blue">{ }</div>
          <h3>JSON Output</h3>
          <p>Every command supports <code>--json</code> for scripting. Pipe to jq, feed to automation, build on top.</p>
        </div>
      </div>
    </div>
  </section>
```

---

## Task 6: Scroll Animations and Polish

Add IntersectionObserver-based scroll-triggered animations for all major sections. Elements fade in and slide up as they enter the viewport.

- [ ] Add CSS classes for reveal animations (fade-in, slide-up)
- [ ] Create a single IntersectionObserver that handles all animated elements
- [ ] Add staggered delays to feature grid items
- [ ] Add a subtle glow effect behind the hero heading

Add the following CSS (append inside `<style>`):

```css
  /* Scroll reveal animations */
  .reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }

  .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .reveal-delay-1 { transition-delay: 0.1s; }
  .reveal-delay-2 { transition-delay: 0.2s; }
  .reveal-delay-3 { transition-delay: 0.3s; }
  .reveal-delay-4 { transition-delay: 0.4s; }
  .reveal-delay-5 { transition-delay: 0.5s; }

  /* Hero glow */
  .hero-top::before {
    content: '';
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse, rgba(34,197,94,0.06) 0%, transparent 70%);
    pointer-events: none;
    z-index: -1;
  }

  .hero-top {
    position: relative;
  }

  /* Backends section */
  .backends {
    padding: 0 0 100px;
  }

  .section-title {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--text-muted);
    text-align: center;
    margin-bottom: 40px;
  }

  .backend-pills {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .backend-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 12px 24px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 500;
  }

  .backend-pill .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .backend-pill .dot.cyan { background: var(--cyan); }
  .backend-pill .dot.magenta { background: var(--magenta); }
  .backend-pill .dot.amber { background: var(--amber); }
  .backend-pill .dot.blue { background: var(--blue); }

  /* Footer */
  footer {
    border-top: 1px solid var(--border);
    padding: 24px 0;
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
  }

  footer a {
    color: var(--text-dim);
    text-decoration: none;
  }

  footer a:hover { color: var(--text); }
```

Add the `reveal` class to these elements in the HTML:
- `.section-header` inside dashboard section: add `class="section-header reveal"`
- `.dashboard-mockup-wrapper`: add `class="dashboard-mockup-wrapper reveal reveal-delay-1"`
- `.section-header` inside features section: add `class="section-header reveal"`
- Each `.feature` element: add `reveal reveal-delay-N` (N from 0-5) to stagger
- `.backends` section inner content

Add the backends and footer HTML after the features section:

```html
  <section class="backends">
    <div class="container">
      <div class="section-title reveal">Supported Backends</div>
      <div class="backend-pills reveal reveal-delay-1">
        <div class="backend-pill"><span class="dot cyan"></span> launchd</div>
        <div class="backend-pill"><span class="dot magenta"></span> PM2</div>
        <div class="backend-pill"><span class="dot amber"></span> Homebrew</div>
        <div class="backend-pill"><span class="dot blue"></span> cron</div>
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <a href="https://github.com/alexpriest/kennel">kennel</a> &middot; MIT License
    </div>
  </footer>
```

Add this JavaScript at the end of the `<script>` block (before `</script>`):

```javascript
  // Scroll reveal
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
  });
```

---

## Task 7: Responsive Design Pass

Ensure the page works well on mobile and tablet viewports.

- [ ] Stack the hero columns vertically on mobile
- [ ] Collapse feature grid to single column on mobile, 2 columns on tablet
- [ ] Scale down the menu bar mockup on smaller screens
- [ ] Ensure terminal and dashboard mockups are scrollable if needed
- [ ] Adjust font sizes and spacing for mobile

Add the following CSS (append inside `<style>`, replacing the existing media query):

```css
  @media (max-width: 1024px) {
    .hero-columns {
      grid-template-columns: 1fr;
      gap: 48px;
    }

    .menubar-mockup {
      align-items: center;
    }

    .features-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .feature:nth-child(1) { border-radius: 10px 0 0 0; }
    .feature:nth-child(2) { border-radius: 0 10px 0 0; }
    .feature:nth-child(3) { border-radius: 0; }
    .feature:nth-child(4) { border-radius: 0; }
    .feature:nth-child(5) { border-radius: 0 0 0 10px; }
    .feature:nth-child(6) { border-radius: 0 0 10px 0; }
  }

  @media (max-width: 768px) {
    .container { padding: 0 16px; }

    .hero { padding: 60px 0 40px; }

    .hero-top { margin-bottom: 40px; }

    h1 { letter-spacing: -1px; }

    .hero-sub { font-size: 16px; }

    .hero-install-group {
      flex-direction: column;
      gap: 12px;
    }

    .hero-install {
      font-size: 13px;
      padding: 12px 20px;
    }

    .download-btn {
      width: 100%;
      justify-content: center;
      padding: 14px 24px;
    }

    .hero-columns {
      grid-template-columns: 1fr;
      gap: 32px;
    }

    .terminal-body {
      font-size: 10px;
      overflow-x: auto;
      padding: 16px;
    }

    .menubar-mockup {
      align-items: center;
    }

    .menubar-chrome,
    .menubar-dropdown {
      width: 300px;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .feature { border-radius: 0 !important; }
    .feature:first-child { border-radius: 10px 10px 0 0 !important; }
    .feature:last-child { border-radius: 0 0 10px 10px !important; }

    .dashboard-mockup-wrapper {
      margin: 0 -8px;
    }

    .dashboard-mockup {
      border-radius: 8px;
    }

    .dashboard-row {
      grid-template-columns: 6px 1fr 60px 60px 50px;
      padding: 12px 14px;
      font-size: 11px;
    }

    .dashboard-row-name { font-size: 11px; }

    .dashboard-log-preview {
      font-size: 9px;
      margin-left: 14px;
    }

    .section-heading {
      font-size: 28px;
      letter-spacing: -1px;
    }

    .backend-pills { gap: 8px; }

    .backend-pill {
      padding: 10px 18px;
      font-size: 12px;
    }
  }

  @media (max-width: 480px) {
    .menubar-chrome,
    .menubar-dropdown {
      width: 280px;
    }

    .menubar-service { font-size: 10px; }

    .dashboard-row {
      grid-template-columns: 6px 1fr 80px;
    }

    .dashboard-row-backend,
    .dashboard-row-actions {
      display: none;
    }
  }
```

---

## Task 8: Final Review and Test

Assemble all pieces into the final single `site/index.html` file, verify all sections render correctly, and confirm the page works end-to-end.

- [ ] Combine all CSS from Tasks 1-7 into a single `<style>` block
- [ ] Combine all HTML sections in order: nav, hero (with terminal + menubar), dashboard, features, backends, footer
- [ ] Combine all JavaScript into a single `<script>` block
- [ ] Open the file in a browser and verify:
  - Hero renders with two-column layout (terminal left, menubar right)
  - Terminal animation plays the new CLI design
  - Menu bar mockup floats with subtle animation
  - Dashboard section shows full-width mockup with log preview
  - Feature grid shows 6 features with "Menu Bar App" replacing "Web Dashboard"
  - Backend pills display correctly
  - Scroll animations trigger on each section
  - Page is responsive at 1024px, 768px, and 480px breakpoints
  - Copy-to-clipboard works on the install command
  - "Download for Mac" button is present and styled

The final assembled file should contain this complete structure:

```
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- meta, fonts -->
  <style>
    /* CSS variables */
    /* Reset + body */
    /* Grain overlay */
    /* Container */
    /* Nav */
    /* Hero (two-column, dual install) */
    /* Terminal */
    /* Menu bar mockup */
    /* Dashboard section */
    /* Features grid */
    /* Scroll reveal animations */
    /* Hero glow */
    /* Backends */
    /* Footer */
    /* Responsive: 1024px */
    /* Responsive: 768px */
    /* Responsive: 480px */
  </style>
</head>
<body>
  <!-- Nav -->
  <!-- Hero: badge, h1, subtitle, dual install, columns (terminal + menubar) -->
  <!-- Dashboard section -->
  <!-- Features section -->
  <!-- Backends section -->
  <!-- Footer -->
  <script>
    /* copyInstall() */
    /* Terminal animation with new CLI design */
    /* IntersectionObserver for terminal */
    /* IntersectionObserver for scroll reveals */
  </script>
</body>
</html>
```

- [ ] Verify no console errors
- [ ] Verify all animations are smooth (60fps)
- [ ] Verify the page feels polished and modern (Vercel/Linear/Raycast level)
