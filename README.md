# kennel

> Where your daemons live

Unified macOS service manager for **launchd**, **PM2**, **Homebrew services**, and **cron** — CLI + MCP server + web dashboard.

**npm:** `kennel` (available)
**Domain:** `kennel.sh` (available)
**Repo:** https://github.com/alexpriest/kennel

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
kennel list --backend pm2           # filter by backend
kennel list --status running        # filter by status
kennel list --json                  # JSON output for scripting

kennel info <service>               # detailed service info
kennel info imessage-attio          # partial name match works

kennel logs <service>               # recent logs
kennel logs <service> --lines 100   # specify line count

kennel start <service>              # start a service
kennel stop <service>               # stop a service
kennel restart <service>            # restart a service

kennel doctor                       # health checks
kennel doctor --json                # JSON output

kennel ui                           # open web dashboard (localhost:5544)
kennel ui --port 8080               # custom port

kennel server                       # start MCP server (stdio)
```

### Example output

```
$ kennel list
 Name                            Backend   Status      PID     Schedule    Info
 com.alexpriest.imessage-attio   launchd   ○ stopped   -       every 1h    -
 com.cloudflare.cyrus-tunnel     launchd   ● running   1561    -           -
 syncthing                       brew      ● running   -       -           -
 textme                          pm2       ● running   57648   -           8 restarts

$ kennel doctor
⚠ com.alexpriest.imessage-attio (launchd): Config file may contain hardcoded secrets
  → Consider using environment variables or a keychain instead
```

## Web Dashboard

`kennel ui` starts a local web server with:
- Live service status table with colored status indicators
- Click to expand: command, config path, cwd, log paths, exit code, restart count
- Inline log viewer showing recent output
- Start/stop/restart buttons for manageable services
- Search and filter by backend
- Health check panel
- Auto-refreshes every 15 seconds

## MCP Server

Kennel includes an MCP server for use with Claude Code and other AI assistants.

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

### Backend details

- **launchd**: Parses plists via `plutil -convert json`. Gets status via `launchctl list`. Uses modern `launchctl bootstrap/bootout` for start/stop.
- **PM2**: Checks `~/.pm2/pm2.pid` before calling to avoid starting the daemon as a side effect. Parses `pm2 jlist` JSON.
- **brew**: Uses `brew services list --json` with fallback to text parsing. Deduplicates against launchd (brew services create launchd plists under `homebrew.mxcl.*`).
- **cron**: Parses `crontab -l`. Read-only — no start/stop. Extracts meaningful names from commands.

### Doctor checks

- Stale PIDs (PID listed but process gone)
- Missing executables (reads ProgramArguments from plist to handle paths with spaces)
- Hardcoded secrets in plist config files (API keys, tokens, long hex strings)
- Services in error state

## Architecture

```
src/
├── index.ts              # Library entry, exports public API
├── cli.ts                # CLI entry (commander)
├── server.ts             # MCP server (stdio transport)
├── api.ts                # HTTP API server for dashboard
├── dashboard.ts          # Embedded HTML dashboard
├── types.ts              # Service, Backend, enums
├── registry.ts           # Backend discovery, dedup, unified query
├── formatter.ts          # CLI table output (chalk + cli-table3)
├── doctor.ts             # Health checks
└── backends/
    ├── index.ts           # Re-exports + factory
    ├── launchd.ts         # ~/Library/LaunchAgents plist parsing
    ├── pm2.ts             # PM2 JSON API
    ├── cron.ts            # crontab parsing
    └── brew.ts            # brew services wrapper

tests/
├── registry.test.ts      # 7 tests (filtering, dedup, partial match, actions)
└── doctor.test.ts        # 2 tests (error state, healthy services)

site/
└── index.html            # Landing page for kennel.sh
```

## Development

```bash
npm install
npm run build         # tsc
npm run test          # vitest
npm run dev -- list   # run CLI via tsx
npm run dev -- ui     # run dashboard via tsx
```

## Status

### Done
- [x] Phase 1: CLI + MCP Server (all commands, all backends, doctor, tests)
- [x] Phase 2: Web Dashboard (embedded HTML, API server, live refresh)
- [x] Phase 3: Landing Page (static HTML in `site/`)

### TODO before publishing to npm
- [ ] Test `npm pack` / `npx kennel` end-to-end
- [ ] Add shebang handling for `dist/cli.js` in build
- [ ] Deploy landing page to kennel.sh (Cloudflare Pages or similar)
- [ ] Add to Alex's `~/.claude.json` as MCP server
- [ ] Consider: `--follow` flag for `kennel logs` (tail -f)
- [ ] Consider: system-level LaunchDaemons (`/Library/LaunchDaemons/`)

## License

MIT
