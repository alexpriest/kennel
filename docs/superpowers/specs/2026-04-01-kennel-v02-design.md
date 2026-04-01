# Kennel v0.2.0 — Product Overhaul Design

**Date:** 2026-04-01
**Status:** Approved
**Supersedes:** 2026-03-27-ui-polish-design.md (subsumed into this spec)

## Vision

Kennel is a unified macOS service manager for developers and power users. It consolidates launchd, PM2, Homebrew services, and cron into a single CLI, web dashboard, and native menu bar app. Tagline: "Where your daemons live."

**Target audience:** Mac developers and power users who run background services. Developer-friendly core, but approachable enough that someone who doesn't know what launchd is can still get value.

**v0.2.0 ships everything at once:** CLI redesign, Svelte dashboard, Tauri menu bar app, landing page on kennel.sh, npm publish.

---

## 1. CLI Redesign

### Design Direction

Polished and visually rich with personality in the details. No emojis. Stacked bar chart for gestalt, errors-first ordering so problems surface immediately. Box-drawing for structure.

### `kennel` / `kennel list`

```
kennel v0.2.0

╭──────────────────────────────────────────────────────╮
│  ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰                          │
│  ● 12 running   ● 2 errors   ● 3 scheduled   ○ 5 stopped │
╰──────────────────────────────────────────────────────╯

  ✖ Obsidian CRM             launchd   error      exit 1
  ✖ Webhook Runner           pm2       error      exit 137  ↻ 24
  ──────────────────────────────────────────────────────
  ● Syncthing               brew      running    pid 1234
  ● Cloudflare Tunnel        launchd   running    pid 1561
  ● TextMe                   pm2       running    pid 57648  ↻ 8
    … 9 more running
  ◷ Daily Backup             cron      every 6h
  ◷ Log Rotate               cron      daily at 3am
  ◷ DB Vacuum                cron      weekly Sun 2am
  ○ iMessage Attio           launchd   stopped
    … 4 more stopped

  2 issues — run kennel doctor for details
```

### Key behaviors

- **Errors-first ordering:** Error services float above a thin divider line, then running, scheduled, stopped.
- **Stacked bar chart:** Colored ▰ blocks proportional to service count per status. Instant visual health indicator.
- **Collapsible groups:** When a status group has more than ~8 entries, show first few + "… N more". `--all` flag expands everything.
- **Colored output:** Green (running), red (error), amber (scheduled), dim (stopped). Backend names in dim. PIDs and metadata in dim.
- **Restart count:** Shown as `↻ N` when > 0.

### `kennel doctor`

Box-drawn issue cards with severity coloring and actionable suggestions. Same visual language as the list summary bar.

### `kennel info <service>`

Box-drawn detail card: key/value pairs (command, cwd, config path, enabled, PID, exit code, restart count, log paths), recent log tail, notes if set.

### `kennel logs <service>`

Colored log output. Add `--follow` flag for live tailing via polling.

### `kennel start/stop/restart <service>`

Animated spinner during action, success/failure result with color.

### Tech

- Remove `cli-table3` dependency.
- Custom box-drawing with `chalk` (already a dependency).
- No new runtime dependencies.

---

## 2. Svelte Dashboard

### Architecture

```
ui/
  src/
    App.svelte
    components/
      SummaryBar.svelte       # stacked bar + counts (mirrors CLI)
      ServiceList.svelte      # container: filters, search, list
      ServiceRow.svelte       # single service row, expandable
      DetailPanel.svelte      # expanded: command, config, kv pairs
      NotesEditor.svelte      # textarea with autosave
      LogViewer.svelte        # log tail display
      DoctorPanel.svelte      # collapsible health check issues
      ClaudeModal.svelte      # terminal picker + prompt preview
      SearchBar.svelte        # search input + backend filter pills
      SettingsPanel.svelte    # terminal selection, preferences
      Toast.svelte            # notification toasts
    lib/
      api.ts                  # typed fetch wrapper for /api/* endpoints
      stores.ts               # Svelte stores: services, config, doctor, theme
      types.ts                # shared TypeScript interfaces
    layouts/
      Dashboard.svelte        # full dashboard layout
      MenuBar.svelte          # compact dropdown layout for Tauri tray
  index.html
  vite.config.ts
  package.json
```

### Dashboard layout (full view)

Same feature set as current dashboard, rebuilt as components:

- Summary bar with stacked bar + counts
- Search + backend filter pills
- Service table with expandable rows
- Expanded detail: key/value grid, notes editor, log viewer
- Doctor panel (collapsible)
- Claude integration modal
- Settings panel (terminal selection)
- Dark/light theme toggle

### What improves structurally

- **Reactive updates:** Svelte stores poll the API. Only changed components re-render. No more manual DOM diffing or innerHTML replacement.
- **Text field safety:** Components own their own state. Editing a note or renaming a service is local component state — API refreshes update the store but don't touch actively-edited fields. The bugs we just fixed go away by design.
- **Smooth transitions:** Row expand/collapse, status change animations, enter/exit transitions via Svelte's built-in `transition:` directive.
- **Keyboard navigation:** j/k to move through services, enter to expand/collapse, / to focus search, Escape to close modals. d for dark mode only when no input is focused (handled at store level).

### Menu bar layout (compact view)

- ~320px wide panel, minimal chrome
- Summary bar (same stacked bar component, compact variant)
- Compact service list: status dot + name + quick action button
- Errors highlighted at top
- "Open Dashboard" button at bottom
- Click service for inline expand or open in dashboard window

### API layer

The existing HTTP API (`api.ts`) stays unchanged. The Svelte `api.ts` wrapper provides typed fetch functions:

- `fetchServices()` → `Service[]`
- `fetchDoctor()` → `DoctorIssue[]`
- `fetchConfig()` → `Config`
- `fetchLogs(name, lines)` → `string`
- `performAction(name, action)` → `Result`
- `saveAlias(name, displayName)` → `void`
- `saveNote(name, note)` → `void`

### Polling

- Services store polls every 60 seconds (matching current behavior).
- Manual refresh resets the timer.
- Polling pauses when the browser tab/Tauri window is not visible.

### Build output

Vite builds to `ui/dist/`. The kennel API server serves these static files when running `kennel ui`. Pre-built assets are included in the npm package.

---

## 3. Tauri Menu Bar App

### Architecture

```
src-tauri/
  src/
    main.rs           # app setup, tray icon, window management
  tauri.conf.json     # window config, sidecar, permissions
  Cargo.toml
  icons/              # app icon, tray icon
```

### Behavior

- **Tray icon:** Kennel icon in the macOS menu bar. Clicking opens the dropdown panel.
- **Dropdown panel:** Small window anchored to tray icon, renders `MenuBar.svelte` layout. Clicking outside dismisses it.
- **Dashboard window:** "Open Dashboard" from the dropdown (or tray right-click menu) opens a full-size window rendering `Dashboard.svelte`.
- **Sidecar:** The Tauri app spawns the kennel API server as a child process on launch. The Svelte frontend talks to `localhost:5544` (or a random available port). If kennel is already running (e.g., user ran `kennel ui`), the app detects and connects to the existing instance.
- **Auto-launch:** Optional "Launch at Login" in settings. Uses macOS login items API.
- **Quit:** Tray right-click → Quit. Stops the sidecar API server.

### Distribution

- `.dmg` download from kennel.sh
- Future: Homebrew cask (`brew install --cask kennel`)
- Unsigned initially (Gatekeeper "Open Anyway" required). Apple Developer signing added later.

### Tray icon states

- Default icon: normal operation
- Badge/overlay: red dot when errors are detected (optional, configurable)

---

## 4. Landing Page (kennel.sh)

### Content

- **Hero:** Terminal animation (keep existing, polish) + menu bar app mockup side by side. Two products, one tool.
- **Dashboard section:** Screenshot/mockup of the full dashboard in action.
- **Feature grid:** Tighten existing feature descriptions to be benefit-oriented.
- **Backend pills:** Keep — shows breadth of support.
- **Install section:** Two paths side by side:
  - `npm install -g kennel` for CLI users
  - "Download for Mac" button for the app
- **Copy:** "Where your daemons live." Keep the tagline, tighten supporting copy.

### Design

- Dark theme (matches the product)
- Smooth scroll animations
- High design quality — the landing page IS the first impression
- Responsive (mobile-friendly)

### Tech

- Static HTML/CSS/JS (no framework)
- Deploy to Cloudflare Pages on kennel.sh

### What's not in scope

- No docs site (README covers it for now)
- No changelog page
- No blog

---

## 5. Packaging & Distribution

### npm package (`kennel`)

- Ships: CLI binary + API server + pre-built Svelte dashboard assets
- `npx kennel` — lists services
- `npx kennel ui` — serves dashboard locally
- `npx kennel server` — MCP server on stdio
- Shebang line in `dist/cli.js`
- Pre-built `ui/dist/` included in package

### Tauri Mac app (`Kennel.app`)

- `.dmg` from kennel.sh
- Bundles Svelte frontend + kennel API sidecar
- Menu bar tray icon

### What gets deleted

- `dashboard.ts` — the 1400-line embedded HTML string, replaced by Svelte app
- `cli-table3` dependency — replaced by custom chalk formatting
- The previous UI polish design spec is superseded by this document

---

## 6. What Does NOT Change

- All CLI command names and flags (list, info, logs, start, stop, restart, doctor, ui, server)
- All backend implementations (launchd, PM2, brew, cron)
- The HTTP API endpoints and their contracts
- MCP server tools and interface
- Config file format and location (~/.config/kennel/)
- Registry, doctor, types — all backend logic stays as-is

The overhaul is entirely presentation layer (CLI formatting, dashboard UI, native app shell) plus build/packaging infrastructure.
