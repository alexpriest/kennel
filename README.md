# kennel

> Where your daemons live

Unified macOS service manager for **launchd**, **PM2**, **Homebrew services**, and **cron** — CLI + MCP server + web dashboard + menu bar app.

**npm:** `kennel`
**Domain:** `kennel.sh`
**Repo:** https://github.com/alexpriest/kennel
**Project notes:** `~/Obsidian/alexpriest/Projects/Kennel/Status.md`

## Why

macOS developers accumulate background services across 4+ different process managers. Checking what's running requires separate commands for each. Kennel gives you a single interface to see and manage them all.

## Install

```bash
npm install -g kennel
```

## CLI

```bash
kennel                              # list all services (default command)
kennel list                         # same as above
kennel list --all                   # expand collapsed groups
kennel list --backend pm2           # filter by backend
kennel list --status running        # filter by status
kennel list --json                  # JSON output for scripting

kennel info <service>               # detailed service info (box-drawn card)
kennel info imessage-attio          # partial name match works

kennel logs <service>               # recent logs
kennel logs <service> --follow      # live tail (polls every 2s)
kennel logs <service> --lines 100   # specify line count

kennel start <service>              # start a service (animated spinner)
kennel stop <service>               # stop a service
kennel restart <service>            # restart a service

kennel doctor                       # health checks (box-drawn cards)
kennel doctor --json                # JSON output

kennel ui                           # open web dashboard (localhost:5544)
kennel ui --port 8080               # custom port

kennel server                       # start MCP server (stdio)
```

### Example output

```
kennel v0.2.0

╭────────────────────────────────────────────────────────╮
│ ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰               │
│ ● 10 running   ○ 10 stopped   ? 2 unknown              │
╰────────────────────────────────────────────────────────╯

  ● Syncthing               brew      running    pid 1234
  ● Cloudflare Tunnel        launchd   running    pid 1561
  ● TextMe                   pm2       running    pid 57648  ↻ 8
    … 7 more running
  ○ iMessage Attio           launchd   stopped
    … 9 more stopped
  ? com.PM2                  launchd   unknown
```

## Web Dashboard

`kennel ui` starts a Svelte-powered dashboard with:
- Stacked bar chart + stats overview
- Sortable service table with click-to-expand details
- Inline log viewer, notes editor
- Start/stop/restart controls
- Health check panel
- Claude integration (investigate services with AI)
- Dark/light theme, keyboard navigation
- Auto-refresh every 60 seconds

## Menu Bar App (Tauri)

Native macOS menu bar app wrapping the dashboard:
- Tray icon with dropdown panel for quick service status
- Full dashboard window for deeper investigation
- Spawns API server as sidecar (or connects to existing)

```bash
npm run tauri:dev     # dev mode
npm run tauri:build   # build .dmg
```

## MCP Server

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "kennel": {
      "command": "npx",
      "args": ["-y", "kennel", "server"],
      "env": {}
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `list_services` | List all services with optional backend/status filters |
| `get_service_info` | Get detailed info about a service by name |
| `service_action` | Start, stop, or restart a service |
| `service_logs` | Get recent log output |
| `doctor` | Run health checks |

## Backends

| Backend | Source | Actions | Notes |
|---------|--------|---------|-------|
| launchd | `~/Library/LaunchAgents/*.plist` | start/stop/restart | Skips `homebrew.mxcl.*` (deduped to brew) |
| PM2 | `pm2 jlist` | start/stop/restart | Won't start PM2 daemon as side effect |
| brew | `brew services list --json` | start/stop/restart | Thin wrapper around Homebrew services |
| cron | `crontab -l` | read-only | Parses schedule into human-readable format |

## Architecture

```
src/                    # TypeScript backend (CLI, API, backends, MCP)
ui/                     # Svelte 5 + Vite dashboard
src-tauri/              # Tauri v2 menu bar app (Rust)
site/                   # Landing page for kennel.sh
docs/superpowers/       # Design spec + implementation plans
```

## Development

```bash
npm install
npm run build           # tsc (backend)
npm test                # vitest

cd ui && npm install
npm run dev             # Vite dev server (localhost:5173)
npm run build           # build to ui/dist/

cd src-tauri
cargo check             # verify Rust compiles
cargo tauri dev         # run Tauri app in dev mode
```

## Status

v0.2.0 — CLI redesign, Svelte dashboard, Tauri app, landing page. See `docs/superpowers/specs/2026-04-01-kennel-v02-design.md` for the full design spec.

## License

MIT
