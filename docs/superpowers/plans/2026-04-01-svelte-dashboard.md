# Svelte Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the embedded HTML dashboard with a Svelte + Vite app featuring reactive updates, component architecture, keyboard navigation, and both full dashboard and compact menu bar layouts

**Architecture:** New `ui/` directory with Svelte 5 + Vite + TypeScript. Svelte stores manage state and API polling. Components own their own state so edits aren't disrupted by refresh. API server updated to serve built static files.

**Tech Stack:** Svelte 5, Vite, TypeScript

---

## Task 1: Scaffold ui/ project

- [ ] Create `ui/package.json`, `ui/vite.config.ts`, `ui/tsconfig.json`, `ui/index.html`, `ui/src/main.ts`, `ui/src/App.svelte`
- [ ] Verify `npm install` and `npm run dev` work

### ui/package.json

```json
{
  "name": "kennel-ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.3.3",
    "vite": "^6.0.0"
  }
}
```

### ui/vite.config.ts

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5555',
    },
  },
});
```

### ui/tsconfig.json

```json
{
  "extends": "@sveltejs/vite-plugin-svelte/tsconfig/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "strict": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"]
}
```

### ui/svelte.config.js

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
```

### ui/index.html

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>kennel — where your daemons live</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### ui/src/main.ts

```ts
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
```

### ui/src/App.svelte

```svelte
<script lang="ts">
  // Placeholder — replaced in Task 18
</script>

<p>kennel ui loading...</p>
```

### Verification

```bash
cd ui && npm install && npm run build
```

---

## Task 2: Global styles + theme system

- [ ] Create `ui/src/app.css` with all CSS variables, dark/light theme, fonts, resets, scrollbar styles, and animations

### ui/src/app.css

```css
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
  --scanline: rgba(0, 0, 0, 0.03);
  --claude: #D4A27A;
  --claude-glow: rgba(212, 162, 122, 0.15);
  --shadow-panel: rgba(0, 0, 0, 0.5);
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
  --scanline: rgba(0, 0, 0, 0.01);
  --claude: #b8845a;
  --claude-glow: rgba(184, 132, 90, 0.12);
  --shadow-panel: rgba(0, 0, 0, 0.12);
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

h1, h2, h3, h4, h5, h6 {
  font-family: 'Space Grotesk', sans-serif;
}

button {
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
}

input, textarea, select {
  font-family: 'JetBrains Mono', monospace;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-in { animation: fadeSlideIn 0.2s ease-out both; }
```

### Verification

```bash
cd ui && npm run build
```

---

## Task 3: Types and API layer

- [ ] Create `ui/src/lib/types.ts` with all shared interfaces
- [ ] Create `ui/src/lib/api.ts` with typed fetch wrappers for every endpoint

### ui/src/lib/types.ts

```ts
export type BackendType = 'launchd' | 'pm2' | 'cron' | 'brew';
export type ServiceStatus = 'running' | 'stopped' | 'error' | 'scheduled' | 'unknown';
export type ServiceAction = 'start' | 'stop' | 'restart';

export interface Service {
  name: string;
  backend: BackendType;
  status: ServiceStatus;
  pid?: number;
  enabled?: boolean;
  schedule?: string;
  configPath?: string;
  command?: string;
  cwd?: string;
  logPaths?: { stdout?: string; stderr?: string };
  exitCode?: number;
  restartCount?: number;
  backendId: string;
  manageable: boolean;
}

export interface DoctorIssue {
  severity: 'error' | 'warning' | 'info';
  service: string;
  backend: BackendType;
  message: string;
  suggestion?: string;
}

export interface KennelConfig {
  aliases: Record<string, string>;
  notes: Record<string, string>;
  terminal?: string;
}

export interface Terminal {
  name: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface ClaudeResult {
  success: boolean;
  message?: string;
  command?: string;
}
```

### ui/src/lib/api.ts

```ts
import type {
  Service,
  DoctorIssue,
  KennelConfig,
  Terminal,
  ActionResult,
  ClaudeResult,
  ServiceAction,
  BackendType,
  ServiceStatus,
} from './types.js';

const BASE = '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function fetchServices(filters?: {
  backend?: BackendType;
  status?: ServiceStatus;
}): Promise<Service[]> {
  const params = new URLSearchParams();
  if (filters?.backend) params.set('backend', filters.backend);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  return get<Service[]>(`/api/services${qs ? `?${qs}` : ''}`);
}

export async function fetchService(name: string): Promise<Service> {
  return get<Service>(`/api/services/${encodeURIComponent(name)}`);
}

export async function performAction(name: string, action: ServiceAction): Promise<ActionResult> {
  return post<ActionResult>('/api/action', { name, action });
}

export async function fetchLogs(name: string, lines: number = 30): Promise<string> {
  const data = await get<{ logs: string }>(`/api/logs/${encodeURIComponent(name)}?lines=${lines}`);
  return data.logs;
}

export async function fetchDoctor(): Promise<DoctorIssue[]> {
  return get<DoctorIssue[]>('/api/doctor');
}

export async function fetchConfig(): Promise<KennelConfig> {
  return get<KennelConfig>('/api/config');
}

export async function saveAlias(name: string, displayName: string): Promise<void> {
  await post('/api/alias', { name, displayName });
}

export async function saveNote(name: string, note: string): Promise<void> {
  await post('/api/note', { name, note });
}

export async function fetchTerminals(): Promise<Terminal[]> {
  return get<Terminal[]>('/api/terminals');
}

export async function saveTerminal(terminal: string): Promise<void> {
  await post('/api/config/terminal', { terminal });
}

export async function launchClaude(prompt: string): Promise<ClaudeResult> {
  return post<ClaudeResult>('/api/claude', { prompt });
}
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 4: Svelte stores

- [ ] Create `ui/src/lib/stores.ts` with writable stores for services, config, doctor issues, terminals, theme, polling state
- [ ] Implement polling logic with pause-on-hidden and manual refresh

### ui/src/lib/stores.ts

```ts
import { writable, derived, get } from 'svelte/store';
import type { Service, DoctorIssue, KennelConfig, Terminal, BackendType } from './types.js';
import * as api from './api.js';

// ---- Core data stores ----
export const services = writable<Service[]>([]);
export const config = writable<KennelConfig>({ aliases: {}, notes: {} });
export const doctorIssues = writable<DoctorIssue[]>([]);
export const terminals = writable<Terminal[]>([]);
export const loading = writable(true);

// ---- UI state stores ----
export const searchQuery = writable('');
export const activeBackend = writable<BackendType | null>(null);
export const expandedService = writable<string | null>(null);
export const theme = writable<'dark' | 'light'>(
  (localStorage.getItem('kennel-theme') as 'dark' | 'light') || 'dark'
);

// ---- Derived stores ----
export const aliases = derived(config, ($config) => $config.aliases);
export const notes = derived(config, ($config) => $config.notes);
export const selectedTerminal = derived(config, ($config) => $config.terminal || '');

export function friendlyName(name: string): string {
  const f = name
    .replace(/^com\.apple\./, '')
    .replace(/^com\.\w+\./, '')
    .replace(/^org\.\w+\./, '')
    .replace(/^io\.\w+\./, '')
    .replace(/^homebrew\.mxcl\./, '');
  return f.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function displayName(name: string): string {
  const $aliases = get(aliases);
  return $aliases[name] || friendlyName(name);
}

export const filteredServices = derived(
  [services, searchQuery, activeBackend],
  ([$services, $searchQuery, $activeBackend]) => {
    return $services.filter((s) => {
      if ($activeBackend && s.backend !== $activeBackend) return false;
      if ($searchQuery) {
        const q = $searchQuery.toLowerCase();
        const dn = displayName(s.name).toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !dn.includes(q)) return false;
      }
      return true;
    });
  }
);

export const stats = derived(services, ($services) => ({
  total: $services.length,
  running: $services.filter((s) => s.status === 'running').length,
  stopped: $services.filter((s) => s.status === 'stopped' || s.status === 'unknown').length,
  errors: $services.filter((s) => s.status === 'error').length,
}));

// ---- Polling ----
const POLL_INTERVAL = 60; // seconds
export const countdown = writable(POLL_INTERVAL);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isVisible = true;

export async function refreshData(): Promise<void> {
  try {
    const [svcData, doctorData] = await Promise.all([
      api.fetchServices(),
      api.fetchDoctor(),
    ]);
    services.set(svcData);
    doctorIssues.set(doctorData);
  } catch (err) {
    console.error('Failed to refresh data:', err);
  }
}

export async function initialize(): Promise<void> {
  loading.set(true);
  try {
    const cfg = await api.fetchConfig();
    config.set(cfg);

    const terms = await api.fetchTerminals();
    terminals.set(terms);

    // If no terminal selected and terminals are available, pick the first
    if (!cfg.terminal && terms.length > 0) {
      config.update((c) => ({ ...c, terminal: terms[0].name }));
    }

    await refreshData();
  } catch (err) {
    console.error('Failed to initialize:', err);
  } finally {
    loading.set(false);
  }
}

export function manualRefresh(): void {
  countdown.set(POLL_INTERVAL);
  refreshData();
}

export function startPolling(): void {
  if (pollTimer) return;
  countdown.set(POLL_INTERVAL);

  pollTimer = setInterval(() => {
    if (!isVisible) return;
    countdown.update((n) => {
      if (n <= 1) {
        refreshData();
        return POLL_INTERVAL;
      }
      return n - 1;
    });
  }, 1000);

  // Pause polling when tab not visible
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (isVisible) {
      countdown.set(POLL_INTERVAL);
      refreshData();
    }
  });
}

export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ---- Theme persistence ----
theme.subscribe(($theme) => {
  document.documentElement.setAttribute('data-theme', $theme);
  localStorage.setItem('kennel-theme', $theme);
});

export function toggleTheme(): void {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}

// ---- Config mutation helpers ----
export async function updateAlias(name: string, displayName: string): Promise<void> {
  await api.saveAlias(name, displayName);
  config.update((c) => {
    const newAliases = { ...c.aliases };
    if (displayName) {
      newAliases[name] = displayName;
    } else {
      delete newAliases[name];
    }
    return { ...c, aliases: newAliases };
  });
}

export async function updateNote(name: string, note: string): Promise<void> {
  await api.saveNote(name, note);
  config.update((c) => {
    const newNotes = { ...c.notes };
    if (note) {
      newNotes[name] = note;
    } else {
      delete newNotes[name];
    }
    return { ...c, notes: newNotes };
  });
}

export async function updateTerminal(terminal: string): Promise<void> {
  await api.saveTerminal(terminal);
  config.update((c) => ({ ...c, terminal }));
}
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 5: SummaryBar component

- [ ] Create `ui/src/components/SummaryBar.svelte` with stat cards showing total, running, stopped, errors

### ui/src/components/SummaryBar.svelte

```svelte
<script lang="ts">
  import { stats } from '../lib/stores.js';
</script>

<div class="stats">
  <div class="stat">
    <div>
      <div class="stat-value dim">{$stats.total}</div>
      <div class="stat-label">services</div>
    </div>
  </div>
  <div class="stat">
    <div>
      <div class="stat-value green">{$stats.running}</div>
      <div class="stat-label">running</div>
    </div>
  </div>
  <div class="stat">
    <div>
      <div class="stat-value dim">{$stats.stopped}</div>
      <div class="stat-label">stopped</div>
    </div>
  </div>
  <div class="stat">
    <div>
      <div class="stat-value red">{$stats.errors}</div>
      <div class="stat-label">errors</div>
    </div>
  </div>
</div>

<style>
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
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 6: SearchBar component

- [ ] Create `ui/src/components/SearchBar.svelte` with search input + backend filter pills

### ui/src/components/SearchBar.svelte

```svelte
<script lang="ts">
  import { searchQuery, activeBackend } from '../lib/stores.js';
  import type { BackendType } from '../lib/types.js';

  const backends: (BackendType | 'all')[] = ['all', 'launchd', 'pm2', 'brew', 'cron'];

  let inputEl: HTMLInputElement;

  function setFilter(backend: BackendType | 'all') {
    activeBackend.set(backend === 'all' ? null : backend);
  }

  function handleInput(e: Event) {
    searchQuery.set((e.target as HTMLInputElement).value);
  }

  export function focus() {
    inputEl?.focus();
  }
</script>

<div class="toolbar">
  <input
    bind:this={inputEl}
    type="text"
    class="search-box"
    placeholder="search services..."
    value={$searchQuery}
    oninput={handleInput}
  />
  {#each backends as backend}
    <button
      class="filter-btn"
      class:active={backend === 'all' ? $activeBackend === null : $activeBackend === backend}
      onclick={() => setFilter(backend)}
    >
      {backend}
    </button>
  {/each}
</div>

<style>
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
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .filter-btn:hover { border-color: var(--text-dim); color: var(--text); }
  .filter-btn.active { border-color: var(--text-dim); color: var(--text); background: var(--bg-raised); }
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 7: ServiceRow component

- [ ] Create `ui/src/components/ServiceRow.svelte` with status indicator stripe, name (with rename), backend badge, status dot, pid, schedule, action buttons, Claude sparkle button

### ui/src/components/ServiceRow.svelte

```svelte
<script lang="ts">
  import type { Service, ServiceAction } from '../lib/types.js';
  import { aliases, notes, expandedService, friendlyName, displayName as getDisplayName, updateAlias } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  interface Props {
    service: Service;
    onaction: (name: string, action: ServiceAction) => void;
    onclaude: (serviceName: string) => void;
    ontoast: (message: string, type: 'success' | 'error') => void;
    index: number;
  }

  let { service, onaction, onclaude, ontoast, index }: Props = $props();

  let renaming = $state(false);
  let renameValue = $state('');

  let isExpanded = $derived($expandedService === service.name);
  let dn = $derived($aliases[service.name] || friendlyName(service.name));

  function toggleExpand() {
    if (renaming) return;
    expandedService.update((current) => current === service.name ? null : service.name);
  }

  function startRename(e: MouseEvent) {
    e.stopPropagation();
    renaming = true;
    renameValue = dn;
  }

  function commitRename() {
    renaming = false;
    const val = renameValue.trim();
    const friendly = friendlyName(service.name);
    updateAlias(service.name, val && val !== friendly ? val : '');
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      renaming = false;
    }
  }

  function handleAction(e: MouseEvent, action: ServiceAction) {
    e.stopPropagation();
    onaction(service.name, action);
  }

  function handleClaude(e: MouseEvent) {
    e.stopPropagation();
    onclaude(service.name);
  }
</script>

<tr
  class="svc-row animate-in"
  class:expanded={isExpanded}
  style="animation-delay: {index * 25}ms"
  onclick={toggleExpand}
  data-name={service.name}
>
  <td class="td-indicator">
    <span class="stripe {service.status}"></span>
  </td>

  <td class="td-name">
    {#if renaming}
      <input
        class="rename-input"
        bind:value={renameValue}
        onblur={commitRename}
        onkeydown={handleRenameKeydown}
        onclick={(e) => e.stopPropagation()}
        autofocus
      />
    {:else}
      <div class="name-line">
        {dn}
        <button class="edit-btn" onclick={startRename} title="Rename">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
      </div>
    {/if}
    <div class="service-id">{service.name}</div>
  </td>

  <td class="td-backend backend-{service.backend}">{service.backend}</td>

  <td class="td-status">
    <span class="status-dot {service.status}"></span>{service.status}
  </td>

  <td class="td-pid">{service.pid || '\u2014'}</td>

  <td class="td-schedule">{service.schedule || '\u2014'}</td>

  <td class="td-actions">
    {#if service.manageable && service.status === 'running'}
      <button class="action-btn stop" onclick={(e) => handleAction(e, 'stop')}>stop</button>
      <button class="action-btn" onclick={(e) => handleAction(e, 'restart')}>restart</button>
    {:else if service.manageable && service.status !== 'running' && service.status !== 'scheduled'}
      <button class="action-btn start" onclick={(e) => handleAction(e, 'start')}>start</button>
    {/if}
    <button class="claude-btn" onclick={handleClaude} title="Investigate with Claude">
      <svg viewBox="0 0 248 248" fill="currentColor"><path d="M52.4 162.9L98.8 136.9l.7-2.3-.7-1.3h-2.3l-7.8-.5-26.5-.7-22.9-.9L17 130l-5.6-1.2L6.2 121.9l.5-3.4 4.7-3.2 6.8.6 14.9 1.1 22.4 1.5 16.2.9 24.1 2.5h3.8l.5-1.5-1.3-1-.9-.9-23.2-15.7-25.1-16.5-13.1-9.6-7-4.8-3.6-4.5-1.5-9.9 6.4-7.1 8.6.6 2.2.6 8.8 6.7 18.7 14.5 24.5 18 3.6 2.9 1.4-.9.2-.7-1.6-2.7L83.8 65.3 69.6 40.8l-6.4-10.2-1.6-6 .1-7.2L68 7.5l4-1.3 9.8 1.3 4.1 3.5 6.1 13.9 9.8 21.9L117 76.6l4.5 8.9 2.4 8.1.9 2.5h1.5v-1.4l1.3-16.8 2.3-20.6 2.3-26.5.7-7.4 3.7-9 7.4-4.8 5.7 2.7 4.7 6.7-.6 4.4-2.8 18.2-5.5 28.5-3.6 19.1h2l2.4-2.5 9.7-12.8L173 53.7l7-8 8.4-8.9 5.3-3.3h10.2l7.4 11.1-3.3 11.5-10.5 13.2-8.6 11.2-12.4 16.6-7.7 13.4.7 1.1 1.9-.2 28-6 15.2-2.7 18.1-3.1 8.1 3.8.9 3.9-3.2 7.9-19.3 4.7-22.7 4.6-33.8 7.9-.3.3.4.7 15.2 1.4 6.5.4h15.9l29.7 2.2 7.8 5.1 4.6 6.3-.8 4.8-12 6-16-3.8-37.6-9-12.9-3.2h-1.8v1.1l10.7 10.5 19.7 17.7 24.6 22.9 1.3 5.7-3.2 4.5-3.3-.5-21.6-16.3-8.4-7.3-18.9-15.9h-1.3v1.6l4.3 6.4 23.1 34.6 1.1 10.6-1.6 3.4-6 2.1-6.5-1.2-13.6-19L147.3 182.5 136.1 163.3l-1.4.9-6.7 71.2-3 3.7-7.1 2.7-6-4.5-3.2-7.3 3.2-14.5 3.8-18.9 3.1-15 2.8-18.7 1.7-6.2-.2-.4-1.3.2-14.1 19.3-21.5 29-16.9 18.1-4.1 1.6-7-3.7.6-6.5 4-5.8 23.4-29.8 14.1-18.5 9.1-10.6-.1-1.5-.5-.1-62.3 40.6-11.1 1.4-4.8-4.5.6-7.3 2.3-2.4 18.7-12.9Z"/></svg>
    </button>
  </td>
</tr>

<style>
  .svc-row {
    background: var(--bg-surface);
    cursor: pointer;
    transition: background 0.1s;
  }

  .svc-row:hover { background: var(--bg-hover); }
  .svc-row.expanded { background: var(--bg-raised); }

  td {
    padding: 10px 14px;
    font-size: 12px;
    border-bottom: 1px solid var(--border-subtle);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }

  .td-indicator {
    padding: 0 !important;
    width: 3px;
  }

  .stripe {
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
    font-size: 12px;
    padding: 2px 6px;
    outline: none;
    width: 100%;
  }

  .td-backend {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .backend-launchd { color: var(--cyan); }
  .backend-pm2 { color: var(--magenta); }
  .backend-brew { color: var(--amber); }
  .backend-cron { color: var(--blue); }

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
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 8: DetailPanel component

- [ ] Create `ui/src/components/DetailPanel.svelte` with key/value grid for expanded service details

### ui/src/components/DetailPanel.svelte

```svelte
<script lang="ts">
  import type { Service } from '../lib/types.js';
  import NotesEditor from './NotesEditor.svelte';
  import LogViewer from './LogViewer.svelte';

  interface Props {
    service: Service;
    ontoast: (message: string, type: 'success' | 'error') => void;
  }

  let { service, ontoast }: Props = $props();

  interface KV {
    label: string;
    value: string | undefined | null;
  }

  let kvPairs: KV[] = $derived([
    { label: 'command', value: service.command },
    { label: 'cwd', value: service.cwd },
    { label: 'config', value: service.configPath },
    { label: 'enabled', value: service.enabled !== undefined ? (service.enabled ? 'yes' : 'no') : undefined },
    { label: 'exit code', value: service.exitCode !== undefined ? String(service.exitCode) : undefined },
    { label: 'restarts', value: service.restartCount !== undefined ? String(service.restartCount) : undefined },
    { label: 'stdout', value: service.logPaths?.stdout },
    { label: 'stderr', value: service.logPaths?.stderr !== service.logPaths?.stdout ? service.logPaths?.stderr : undefined },
  ].filter((kv): kv is { label: string; value: string } => !!kv.value));
</script>

<tr class="detail-row">
  <td colspan="7" class="detail-td">
    <div class="detail-inner">
      <div class="detail-grid">
        {#each kvPairs as kv}
          <div class="detail-kv">
            <span class="detail-k">{kv.label}</span>
            <span class="detail-v" title={kv.value}>{kv.value}</span>
          </div>
        {/each}
      </div>

      <NotesEditor serviceName={service.name} {ontoast} />
      <LogViewer serviceName={service.name} />
    </div>
  </td>
</tr>

<style>
  .detail-row { cursor: default; background: var(--bg); }

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
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 9: NotesEditor component

- [ ] Create `ui/src/components/NotesEditor.svelte` with textarea and autosave debounce

### ui/src/components/NotesEditor.svelte

```svelte
<script lang="ts">
  import { notes, updateNote } from '../lib/stores.js';

  interface Props {
    serviceName: string;
    ontoast: (message: string, type: 'success' | 'error') => void;
  }

  let { serviceName, ontoast }: Props = $props();

  // Local state so edits aren't disrupted by store refresh
  let localValue = $state($notes[serviceName] || '');
  let showSaved = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  // Only sync from store if local hasn't been touched
  let lastSyncedValue = $notes[serviceName] || '';

  function handleInput(e: Event) {
    localValue = (e.target as HTMLTextAreaElement).value;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await updateNote(serviceName, localValue.trim());
        lastSyncedValue = localValue.trim();
        showSaved = true;
        setTimeout(() => { showSaved = false; }, 1500);
      } catch {
        ontoast('Failed to save note', 'error');
      }
    }, 600);
  }

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
  }
</script>

<div class="notes-section">
  <div class="notes-header">
    <span class="log-label">notes</span>
    <span class="notes-saved" class:show={showSaved}>saved</span>
  </div>
  <textarea
    class="notes-textarea"
    placeholder="What does this service do? Add notes here..."
    value={localValue}
    oninput={handleInput}
    onclick={handleClick}
  ></textarea>
</div>

<style>
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

  .log-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
  }

  .notes-textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 10px 12px;
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
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 10: LogViewer component

- [ ] Create `ui/src/components/LogViewer.svelte` with log tail display that fetches on mount

### ui/src/components/LogViewer.svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import * as api from '../lib/api.js';

  interface Props {
    serviceName: string;
  }

  let { serviceName }: Props = $props();

  let logs = $state('loading...');
  let logEl: HTMLDivElement;

  onMount(async () => {
    try {
      const data = await api.fetchLogs(serviceName, 30);
      logs = data || '(no logs available)';
      // Scroll to bottom after content renders
      requestAnimationFrame(() => {
        if (logEl) logEl.scrollTop = logEl.scrollHeight;
      });
    } catch {
      logs = '(failed to fetch logs)';
    }
  });
</script>

<div class="log-viewer">
  <div class="log-label">recent logs</div>
  <div class="log-content" bind:this={logEl}>{logs}</div>
</div>

<style>
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
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 11: ServiceList component

- [ ] Create `ui/src/components/ServiceList.svelte` that composes SearchBar + ServiceRows + DetailPanel
- [ ] Implement keyboard navigation: j/k through services, Enter to expand, / to focus search, Escape to close

### ui/src/components/ServiceList.svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { filteredServices, expandedService, loading } from '../lib/stores.js';
  import type { ServiceAction } from '../lib/types.js';
  import SearchBar from './SearchBar.svelte';
  import ServiceRow from './ServiceRow.svelte';
  import DetailPanel from './DetailPanel.svelte';

  interface Props {
    onaction: (name: string, action: ServiceAction) => void;
    onclaude: (serviceName: string) => void;
    ontoast: (message: string, type: 'success' | 'error') => void;
  }

  let { onaction, onclaude, ontoast }: Props = $props();

  let searchBar: SearchBar;
  let focusedIndex = $state(-1);

  function isEditing(): boolean {
    const el = document.activeElement;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isEditing()) return;

    const services = $filteredServices;

    if (e.key === '/') {
      e.preventDefault();
      searchBar?.focus();
      return;
    }

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, services.length - 1);
      return;
    }

    if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      return;
    }

    if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < services.length) {
      e.preventDefault();
      const name = services[focusedIndex].name;
      expandedService.update((current) => current === name ? null : name);
      return;
    }

    if (e.key === 'Escape') {
      expandedService.set(null);
      focusedIndex = -1;
      return;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<SearchBar bind:this={searchBar} />

{#if $loading}
  <div class="loading">
    <div class="spinner"></div> loading services...
  </div>
{:else if $filteredServices.length === 0}
  <div class="empty">no services match your filters</div>
{:else}
  <div class="service-table-wrap">
    <table class="service-table">
      <colgroup>
        <col class="col-indicator" />
        <col class="col-name" />
        <col class="col-backend" />
        <col class="col-status" />
        <col class="col-pid" />
        <col class="col-schedule" />
        <col class="col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Backend</th>
          <th>Status</th>
          <th>PID</th>
          <th>Schedule</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each $filteredServices as service, i (service.name)}
          <ServiceRow
            {service}
            {onaction}
            {onclaude}
            {ontoast}
            index={i}
          />
          {#if $expandedService === service.name}
            <DetailPanel {service} {ontoast} />
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
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

  thead th {
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

  thead th:first-child { padding: 0; width: 3px; }

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

  .empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 12: DoctorPanel component

- [ ] Create `ui/src/components/DoctorPanel.svelte` with collapsible issues list and Claude investigate buttons

### ui/src/components/DoctorPanel.svelte

```svelte
<script lang="ts">
  import { doctorIssues } from '../lib/stores.js';

  interface Props {
    onclaude: (prompt: string) => void;
  }

  let { onclaude }: Props = $props();

  let open = $state(false);

  function toggle() {
    open = !open;
  }

  function investigateIssue(idx: number) {
    const issue = $doctorIssues[idx];
    if (!issue) return;
    const prompt = `Investigate a health check issue with the macOS service "${issue.service}" (${issue.backend}). ` +
      `Issue: ${issue.message}${issue.suggestion ? ` Suggestion: ${issue.suggestion}` : ''} ` +
      `Diagnose this issue and suggest a fix.`;
    onclaude(prompt);
  }

  function severityIcon(severity: string): string {
    if (severity === 'error') return '\u2716';
    if (severity === 'warning') return '\u26A0';
    return '\u2139';
  }
</script>

<div class="doctor-panel">
  <div class="doctor-header" onclick={toggle}>
    <div class="doctor-title">health check</div>
    {#if $doctorIssues.length === 0}
      <div class="doctor-badge clean">healthy</div>
    {:else}
      <div class="doctor-badge issues">
        {$doctorIssues.length} issue{$doctorIssues.length > 1 ? 's' : ''}
      </div>
    {/if}
  </div>

  {#if open}
    <div class="doctor-results">
      {#if $doctorIssues.length === 0}
        <div class="doctor-issue healthy-msg">all services look healthy</div>
      {:else}
        {#each $doctorIssues as issue, idx}
          <div class="doctor-issue">
            <span class="issue-icon {issue.severity}">{severityIcon(issue.severity)}</span>
            <div class="issue-body">
              <div class="issue-service">
                {issue.service} <span class="issue-backend">({issue.backend})</span>
              </div>
              <div class="issue-message">{issue.message}</div>
              {#if issue.suggestion}
                <div class="issue-suggestion">{issue.suggestion}</div>
              {/if}
            </div>
            <div class="issue-actions">
              <button class="claude-btn" onclick={() => investigateIssue(idx)} title="Investigate with Claude">
                <svg viewBox="0 0 248 248" fill="currentColor"><path d="M52.4 162.9L98.8 136.9l.7-2.3-.7-1.3h-2.3l-7.8-.5-26.5-.7-22.9-.9L17 130l-5.6-1.2L6.2 121.9l.5-3.4 4.7-3.2 6.8.6 14.9 1.1 22.4 1.5 16.2.9 24.1 2.5h3.8l.5-1.5-1.3-1-.9-.9-23.2-15.7-25.1-16.5-13.1-9.6-7-4.8-3.6-4.5-1.5-9.9 6.4-7.1 8.6.6 2.2.6 8.8 6.7 18.7 14.5 24.5 18 3.6 2.9 1.4-.9.2-.7-1.6-2.7L83.8 65.3 69.6 40.8l-6.4-10.2-1.6-6 .1-7.2L68 7.5l4-1.3 9.8 1.3 4.1 3.5 6.1 13.9 9.8 21.9L117 76.6l4.5 8.9 2.4 8.1.9 2.5h1.5v-1.4l1.3-16.8 2.3-20.6 2.3-26.5.7-7.4 3.7-9 7.4-4.8 5.7 2.7 4.7 6.7-.6 4.4-2.8 18.2-5.5 28.5-3.6 19.1h2l2.4-2.5 9.7-12.8L173 53.7l7-8 8.4-8.9 5.3-3.3h10.2l7.4 11.1-3.3 11.5-10.5 13.2-8.6 11.2-12.4 16.6-7.7 13.4.7 1.1 1.9-.2 28-6 15.2-2.7 18.1-3.1 8.1 3.8.9 3.9-3.2 7.9-19.3 4.7-22.7 4.6-33.8 7.9-.3.3.4.7 15.2 1.4 6.5.4h15.9l29.7 2.2 7.8 5.1 4.6 6.3-.8 4.8-12 6-16-3.8-37.6-9-12.9-3.2h-1.8v1.1l10.7 10.5 19.7 17.7 24.6 22.9 1.3 5.7-3.2 4.5-3.3-.5-21.6-16.3-8.4-7.3-18.9-15.9h-1.3v1.6l4.3 6.4 23.1 34.6 1.1 10.6-1.6 3.4-6 2.1-6.5-1.2-13.6-19L147.3 182.5 136.1 163.3l-1.4.9-6.7 71.2-3 3.7-7.1 2.7-6-4.5-3.2-7.3 3.2-14.5 3.8-18.9 3.1-15 2.8-18.7 1.7-6.2-.2-.4-1.3.2-14.1 19.3-21.5 29-16.9 18.1-4.1 1.6-7-3.7.6-6.5 4-5.8 23.4-29.8 14.1-18.5 9.1-10.6-.1-1.5-.5-.1-62.3 40.6-11.1 1.4-4.8-4.5.6-7.3 2.3-2.4 18.7-12.9Z"/></svg>
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
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

  .doctor-results { }

  .doctor-issue {
    padding: 10px 16px;
    border-top: 1px solid var(--border-subtle);
    font-size: 11px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .doctor-issue.healthy-msg {
    color: var(--green);
    justify-content: center;
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
  .issue-backend { color: var(--text-muted); font-weight: 400; }
  .issue-message { color: var(--text-dim); margin-top: 2px; }

  .issue-suggestion {
    color: var(--text-muted);
    margin-top: 3px;
    font-size: 10px;
  }

  .issue-suggestion::before { content: '\2192 '; }

  .issue-actions { flex-shrink: 0; display: flex; align-items: center; }

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
  }

  .claude-btn:hover { opacity: 1; transform: scale(1.2); }
  .claude-btn svg { width: 13px; height: 13px; }
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 13: Toast component

- [ ] Create `ui/src/components/Toast.svelte` with notification system using a module-level store

### ui/src/lib/toast.ts

```ts
import { writable } from 'svelte/store';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let nextId = 0;

export const toasts = writable<ToastMessage[]>([]);

export function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const id = nextId++;
  toasts.update((all) => [...all, { id, message, type }]);
  setTimeout(() => {
    toasts.update((all) => all.filter((t) => t.id !== id));
  }, 3000);
}
```

### ui/src/components/Toast.svelte

```svelte
<script lang="ts">
  import { toasts } from '../lib/toast.js';
</script>

{#each $toasts as toast (toast.id)}
  <div class="toast {toast.type}">
    {toast.message}
  </div>
{/each}

<style>
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
  }

  .toast.success { border-color: var(--green-dim); color: var(--green); }
  .toast.error { border-color: var(--red-dim); color: var(--red); }

  /* Stack multiple toasts */
  .toast + .toast {
    margin-bottom: 50px;
  }
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 14: ClaudeModal component

- [ ] Create `ui/src/components/ClaudeModal.svelte` with terminal picker, prompt preview, copy, and launch

### ui/src/components/ClaudeModal.svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { terminals, selectedTerminal, updateTerminal } from '../lib/stores.js';
  import * as api from '../lib/api.js';
  import { showToast } from '../lib/toast.js';

  interface Props {
    prompt: string;
    onclose: () => void;
  }

  let { prompt, onclose }: Props = $props();

  let localTerminal = $state($selectedTerminal);

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }

  async function handleTerminalChange(e: Event) {
    localTerminal = (e.target as HTMLSelectElement).value;
    await updateTerminal(localTerminal);
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt).then(() => {
      showToast('Prompt copied to clipboard', 'success');
    });
  }

  async function launch() {
    onclose();
    try {
      const result = await api.launchClaude(prompt);
      if (result.success) {
        showToast(`Opened Claude in ${localTerminal}`, 'success');
      } else {
        showToast(result.message || 'Failed to launch Claude', 'error');
      }
    } catch {
      showToast('Failed to launch Claude', 'error');
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-overlay open" onclick={handleOverlayClick}>
  <div class="modal">
    <div class="modal-header">
      <svg viewBox="0 0 248 248" fill="currentColor"><path d="M52.4 162.9L98.8 136.9l.7-2.3-.7-1.3h-2.3l-7.8-.5-26.5-.7-22.9-.9L17 130l-5.6-1.2L6.2 121.9l.5-3.4 4.7-3.2 6.8.6 14.9 1.1 22.4 1.5 16.2.9 24.1 2.5h3.8l.5-1.5-1.3-1-.9-.9-23.2-15.7-25.1-16.5-13.1-9.6-7-4.8-3.6-4.5-1.5-9.9 6.4-7.1 8.6.6 2.2.6 8.8 6.7 18.7 14.5 24.5 18 3.6 2.9 1.4-.9.2-.7-1.6-2.7L83.8 65.3 69.6 40.8l-6.4-10.2-1.6-6 .1-7.2L68 7.5l4-1.3 9.8 1.3 4.1 3.5 6.1 13.9 9.8 21.9L117 76.6l4.5 8.9 2.4 8.1.9 2.5h1.5v-1.4l1.3-16.8 2.3-20.6 2.3-26.5.7-7.4 3.7-9 7.4-4.8 5.7 2.7 4.7 6.7-.6 4.4-2.8 18.2-5.5 28.5-3.6 19.1h2l2.4-2.5 9.7-12.8L173 53.7l7-8 8.4-8.9 5.3-3.3h10.2l7.4 11.1-3.3 11.5-10.5 13.2-8.6 11.2-12.4 16.6-7.7 13.4.7 1.1 1.9-.2 28-6 15.2-2.7 18.1-3.1 8.1 3.8.9 3.9-3.2 7.9-19.3 4.7-22.7 4.6-33.8 7.9-.3.3.4.7 15.2 1.4 6.5.4h15.9l29.7 2.2 7.8 5.1 4.6 6.3-.8 4.8-12 6-16-3.8-37.6-9-12.9-3.2h-1.8v1.1l10.7 10.5 19.7 17.7 24.6 22.9 1.3 5.7-3.2 4.5-3.3-.5-21.6-16.3-8.4-7.3-18.9-15.9h-1.3v1.6l4.3 6.4 23.1 34.6 1.1 10.6-1.6 3.4-6 2.1-6.5-1.2-13.6-19L147.3 182.5 136.1 163.3l-1.4.9-6.7 71.2-3 3.7-7.1 2.7-6-4.5-3.2-7.3 3.2-14.5 3.8-18.9 3.1-15 2.8-18.7 1.7-6.2-.2-.4-1.3.2-14.1 19.3-21.5 29-16.9 18.1-4.1 1.6-7-3.7.6-6.5 4-5.8 23.4-29.8 14.1-18.5 9.1-10.6-.1-1.5-.5-.1-62.3 40.6-11.1 1.4-4.8-4.5.6-7.3 2.3-2.4 18.7-12.9Z"/></svg>
      <span class="modal-title">Open in Claude</span>
    </div>
    <div class="modal-body">
      <div class="modal-label">Prompt to send</div>
      <div class="modal-prompt">{prompt}</div>
      <div class="modal-terminal">
        <span>Opening in</span>
        <select class="terminal-select" value={localTerminal} onchange={handleTerminalChange}>
          {#each $terminals as t}
            <option value={t.name}>{t.name}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn" onclick={onclose}>Cancel</button>
      <button class="modal-btn" onclick={copyPrompt} title="Copy prompt to clipboard">Copy</button>
      <button class="modal-btn primary" onclick={launch}>Open in {localTerminal}</button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.12s ease-out;
  }

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
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 15: SettingsPanel component

- [ ] Create `ui/src/components/SettingsPanel.svelte` with terminal selection dropdown

### ui/src/components/SettingsPanel.svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { terminals, selectedTerminal, updateTerminal } from '../lib/stores.js';
  import { showToast } from '../lib/toast.js';

  let open = $state(false);
  let panelEl: HTMLDivElement;
  let btnEl: HTMLButtonElement;

  function toggle() {
    open = !open;
  }

  async function selectTerminal(name: string) {
    await updateTerminal(name);
    showToast(`Terminal set to ${name}`, 'success');
  }

  function handleClickOutside(e: MouseEvent) {
    if (panelEl && !panelEl.contains(e.target as Node) && !btnEl.contains(e.target as Node)) {
      open = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="settings-anchor">
  <button class="icon-btn" bind:this={btnEl} onclick={toggle} title="Settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
    </svg>
  </button>
  {#if open}
    <div class="settings-panel" bind:this={panelEl}>
      <div class="settings-label">Terminal App</div>
      {#if $terminals.length === 0}
        <div class="no-terminals">No terminals detected</div>
      {:else}
        {#each $terminals as t}
          <div
            class="terminal-option"
            class:selected={t.name === $selectedTerminal}
            onclick={() => selectTerminal(t.name)}
          >
            <div class="terminal-radio"></div>
            <span>{t.name}</span>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .settings-anchor { position: relative; }

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
    flex-shrink: 0;
  }

  .icon-btn:hover { background: var(--bg-hover); color: var(--text); }
  .icon-btn svg { width: 15px; height: 15px; }

  .settings-panel {
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

  .settings-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 6px 14px 6px;
  }

  .no-terminals {
    padding: 8px 14px;
    color: var(--text-muted);
    font-size: 11px;
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
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 16: Dashboard layout

- [ ] Create `ui/src/layouts/Dashboard.svelte` that composes all components for the full dashboard view

### ui/src/layouts/Dashboard.svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    initialize,
    startPolling,
    stopPolling,
    manualRefresh,
    toggleTheme,
    theme,
    countdown,
    services,
    notes as notesStore,
    selectedTerminal,
  } from '../lib/stores.js';
  import { showToast } from '../lib/toast.js';
  import * as api from '../lib/api.js';
  import type { ServiceAction } from '../lib/types.js';
  import SummaryBar from '../components/SummaryBar.svelte';
  import ServiceList from '../components/ServiceList.svelte';
  import DoctorPanel from '../components/DoctorPanel.svelte';
  import ClaudeModal from '../components/ClaudeModal.svelte';
  import SettingsPanel from '../components/SettingsPanel.svelte';
  import Toast from '../components/Toast.svelte';

  let spinning = $state(false);
  let claudePrompt = $state<string | null>(null);

  function handleRefresh() {
    spinning = true;
    setTimeout(() => { spinning = false; }, 600);
    manualRefresh();
  }

  async function handleAction(name: string, action: ServiceAction) {
    try {
      const result = await api.performAction(name, action);
      showToast(result.message, result.success ? 'success' : 'error');
      setTimeout(() => manualRefresh(), 800);
    } catch {
      showToast('Action failed', 'error');
    }
  }

  function handleClaudeService(serviceName: string) {
    const s = $services.find((svc) => svc.name === serviceName);
    if (!s) return;

    if (!$selectedTerminal) {
      showToast('Select a terminal app in settings first', 'error');
      return;
    }

    const $notes = $notesStore;
    const parts = [`Investigate the macOS service "${serviceName}" (${s.backend} backend).`];
    if (s.configPath) parts.push(`Config: ${s.configPath}`);
    if (s.command) parts.push(`Command: ${s.command}`);
    if (s.cwd) parts.push(`Working dir: ${s.cwd}`);
    parts.push(`Status: ${s.status}${s.pid ? `, PID ${s.pid}` : ''}.`);
    if (s.logPaths?.stdout) parts.push(`Logs: ${s.logPaths.stdout}`);
    if ($notes[serviceName]) parts.push(`User notes: ${$notes[serviceName]}`);
    parts.push('Read the config file and recent logs. Tell me what this service does, whether it looks healthy, and anything notable about its configuration.');
    claudePrompt = parts.join(' ');
  }

  function handleClaudePrompt(prompt: string) {
    if (!$selectedTerminal) {
      showToast('Select a terminal app in settings first', 'error');
      return;
    }
    claudePrompt = prompt;
  }

  function handleToast(message: string, type: 'success' | 'error') {
    showToast(message, type);
  }

  function handleThemeKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      toggleTheme();
    }
  }

  onMount(() => {
    initialize();
    startPolling();
    document.addEventListener('keydown', handleThemeKeydown);
  });

  onDestroy(() => {
    stopPolling();
    document.removeEventListener('keydown', handleThemeKeydown);
  });
</script>

<div class="shell">
  <header>
    <div class="logo">kennel<span>where your daemons live</span></div>
    <div class="header-controls">
      <span class="refresh-timer">{$countdown}s</span>
      <button class="icon-btn" class:spinning onclick={handleRefresh} title="Refresh now">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      </button>
      <button class="icon-btn" onclick={toggleTheme} title="Toggle theme (D)">
        {#if $theme === 'dark'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        {/if}
      </button>
      <SettingsPanel />
    </div>
  </header>

  <SummaryBar />

  <ServiceList
    onaction={handleAction}
    onclaude={handleClaudeService}
    ontoast={handleToast}
  />

  <DoctorPanel onclaude={handleClaudePrompt} />
</div>

{#if claudePrompt}
  <ClaudeModal prompt={claudePrompt} onclose={() => { claudePrompt = null; }} />
{/if}

<Toast />

<style>
  .shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
  }

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
  .icon-btn :global(svg) { width: 15px; height: 15px; }
  .icon-btn.spinning :global(svg) { animation: spin 0.6s ease; }
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 17: MenuBar layout

- [ ] Create `ui/src/layouts/MenuBar.svelte` with compact view for Tauri tray (~320px wide)

### ui/src/layouts/MenuBar.svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    initialize,
    startPolling,
    stopPolling,
    services,
    stats,
    displayName,
  } from '../lib/stores.js';
  import { showToast } from '../lib/toast.js';
  import * as api from '../lib/api.js';
  import type { ServiceAction } from '../lib/types.js';
  import Toast from '../components/Toast.svelte';

  // Sort: errors first, then running, then rest
  let sortedServices = $derived(
    [...$services].sort((a, b) => {
      const order: Record<string, number> = { error: 0, running: 1, scheduled: 2, unknown: 3, stopped: 4 };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    })
  );

  async function handleAction(e: MouseEvent, name: string, action: ServiceAction) {
    e.stopPropagation();
    try {
      const result = await api.performAction(name, action);
      showToast(result.message, result.success ? 'success' : 'error');
    } catch {
      showToast('Action failed', 'error');
    }
  }

  function openDashboard() {
    window.open('/', '_blank');
  }

  onMount(() => {
    initialize();
    startPolling();
  });

  onDestroy(() => {
    stopPolling();
  });
</script>

<div class="menubar">
  <div class="menubar-header">
    <span class="menubar-logo">kennel</span>
    <div class="menubar-stats">
      <span class="stat-pill green">{$stats.running}</span>
      {#if $stats.errors > 0}
        <span class="stat-pill red">{$stats.errors}</span>
      {/if}
      <span class="stat-pill dim">{$stats.stopped}</span>
    </div>
  </div>

  <div class="menubar-services">
    {#each sortedServices as service (service.name)}
      <div class="menubar-row">
        <span class="status-dot {service.status}"></span>
        <span class="menubar-name" title={service.name}>{displayName(service.name)}</span>
        <div class="menubar-actions">
          {#if service.manageable && service.status === 'running'}
            <button class="mb-action-btn stop" onclick={(e) => handleAction(e, service.name, 'stop')}>stop</button>
            <button class="mb-action-btn" onclick={(e) => handleAction(e, service.name, 'restart')}>restart</button>
          {:else if service.manageable && service.status !== 'running' && service.status !== 'scheduled'}
            <button class="mb-action-btn start" onclick={(e) => handleAction(e, service.name, 'start')}>start</button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="menubar-footer">
    <button class="open-dashboard-btn" onclick={openDashboard}>Open Dashboard</button>
  </div>
</div>

<Toast />

<style>
  .menubar {
    width: 320px;
    max-height: 500px;
    overflow-y: auto;
    background: var(--bg-surface);
    font-size: 11px;
  }

  .menubar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .menubar-logo {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }

  .menubar-stats {
    display: flex;
    gap: 4px;
  }

  .stat-pill {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 8px;
  }

  .stat-pill.green { background: var(--green-glow); color: var(--green); }
  .stat-pill.red { background: var(--red-glow); color: var(--red); }
  .stat-pill.dim { color: var(--text-muted); }

  .menubar-services {
    padding: 4px 0;
  }

  .menubar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    transition: background 0.1s;
  }

  .menubar-row:hover { background: var(--bg-hover); }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.running { background: var(--green); box-shadow: 0 0 4px var(--green); }
  .status-dot.stopped { background: var(--text-muted); }
  .status-dot.error { background: var(--red); box-shadow: 0 0 4px var(--red); }
  .status-dot.scheduled { background: var(--blue); box-shadow: 0 0 4px var(--blue); }
  .status-dot.unknown { background: var(--yellow); }

  .menubar-name {
    flex: 1;
    color: var(--text);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menubar-actions {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
  }

  .mb-action-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text-dim);
    font-size: 8px;
    padding: 2px 5px;
    cursor: pointer;
    transition: all 0.12s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mb-action-btn:hover { border-color: var(--text-dim); color: var(--text); }
  .mb-action-btn.stop:hover { border-color: var(--red); color: var(--red); }
  .mb-action-btn.start:hover { border-color: var(--green); color: var(--green); }

  .menubar-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--border-subtle);
  }

  .open-dashboard-btn {
    width: 100%;
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-size: 11px;
    padding: 6px;
    cursor: pointer;
    transition: all 0.12s;
    text-align: center;
  }

  .open-dashboard-btn:hover { border-color: var(--text-dim); color: var(--text); }
</style>
```

### Verification

```bash
cd ui && npx svelte-check
```

---

## Task 18: App.svelte routing

- [ ] Update `ui/src/App.svelte` to route between Dashboard and MenuBar based on `?mode=menubar` URL param

### ui/src/App.svelte

```svelte
<script lang="ts">
  import Dashboard from './layouts/Dashboard.svelte';
  import MenuBar from './layouts/MenuBar.svelte';

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
</script>

{#if mode === 'menubar'}
  <MenuBar />
{:else}
  <Dashboard />
{/if}
```

### Verification

```bash
cd ui && npm run build
```

---

## Task 19: Update api.ts to serve static files

- [ ] Update `src/api.ts` to serve static files from `ui/dist/` instead of calling `getDashboardHtml()`
- [ ] Serve `index.html` for `/`, and serve JS/CSS/assets from the dist directory
- [ ] Keep the `getDashboardHtml` import removal clean

### Changes to src/api.ts

Replace the import line:

```ts
// REMOVE:
import { getDashboardHtml } from './dashboard.js';

// ADD:
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const UI_DIST = join(__dirname, '..', 'ui', 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveStatic(res: ServerResponse, filePath: string): Promise<boolean> {
  try {
    const fullPath = join(UI_DIST, filePath);
    // Basic path traversal protection
    if (!fullPath.startsWith(UI_DIST)) {
      return false;
    }
    const data = await readFile(fullPath);
    const ext = extname(fullPath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}
```

Replace the `GET /` route handler:

```ts
// REMOVE:
if (pathname === '/' && req.method === 'GET') {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(getDashboardHtml());
  return;
}

// ADD:
if (req.method === 'GET' && !pathname.startsWith('/api/')) {
  // Try serving the exact file, fall back to index.html for SPA routing
  const filePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const served = await serveStatic(res, filePath);
  if (served) return;

  // Fall back to index.html for client-side routing
  const indexServed = await serveStatic(res, 'index.html');
  if (indexServed) return;

  // If no UI build exists, show a helpful message
  res.writeHead(503, { 'Content-Type': 'text/plain' });
  res.end('Dashboard UI not built. Run: cd ui && npm run build');
  return;
}
```

Note: Place the static file serving block **before** the API routes in `handleRequest` so that asset requests (like `/assets/index-abc123.js`) are handled. The `!pathname.startsWith('/api/')` guard ensures API routes still work.

Also remove `{ access }` from the `node:fs/promises` import if it was the only use (it's used for terminal detection, so it stays). The `readFile` import was already present in the original for `access` — add `readFile` to the same import. Actually, looking at the original `api.ts`, `access` is imported from `node:fs/promises` already. Add `readFile` to that import:

```ts
// Change:
import { access } from 'node:fs/promises';
// To:
import { access, readFile } from 'node:fs/promises';
```

And add `join, extname` to the path import — but there's no path import in the original. Add it:

```ts
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
```

### Verification

```bash
cd ui && npm run build && cd .. && npx tsc --noEmit
```

---

## Task 20: Build and integration test

- [ ] Run `cd ui && npm install && npm run build` to verify the UI builds
- [ ] Run `cd .. && npm run build` to verify the server TypeScript compiles
- [ ] Start the server with `npm run dev -- dashboard` and verify:
  - `GET /` returns the Svelte app HTML
  - `GET /api/services` returns JSON
  - The dashboard renders in a browser
  - Theme toggle works (press D)
  - Search and filter pills work
  - Clicking a service row expands the detail panel
  - Notes autosave works
  - Doctor panel toggles open/closed
- [ ] Test menubar mode: visit `/?mode=menubar`

### Build commands

```bash
# Build UI
cd ui && npm install && npm run build

# Build server
cd .. && npm run build

# Start server
npm run dev -- dashboard
```

### Manual browser verification

Open `http://localhost:5555` and check:

1. Dashboard loads with service list
2. Stats bar shows correct counts
3. Backend filter pills filter the list
4. Search box filters by name
5. Click row to expand detail panel
6. Notes textarea autosaves
7. Logs appear in expanded panel
8. Press D to toggle dark/light theme
9. Settings gear shows terminal picker
10. Claude sparkle button opens modal
11. `http://localhost:5555/?mode=menubar` shows compact layout
12. j/k keyboard nav moves through services
13. Enter expands/collapses focused service
14. / focuses search box
15. Escape closes expanded panel and modal
