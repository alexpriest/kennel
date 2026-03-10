# kennel 🐕

> Where your daemons live

Unified macOS service manager for **launchd**, **PM2**, **Homebrew services**, and **cron** — all in one view.

## Why

macOS developers accumulate background services across 4+ different process managers. Checking what's running requires separate commands for each. Kennel gives you a single interface to see and manage them all.

## Install

```bash
npm install -g kennel
```

## Usage

### List all services

```
$ kennel list
 Name                            Backend   Status      PID     Schedule    Info
 com.alexpriest.imessage-attio   launchd   ○ stopped   -       every 1h    -
 com.cloudflare.cyrus-tunnel     launchd   ● running   1561    -           -
 syncthing                       brew      ● running   -       -           -
 textme                          pm2       ● running   57648   -           8 restarts
```

### Filter

```bash
kennel list --backend pm2
kennel list --status running
kennel list --json
```

### Service details

```bash
kennel info textme
kennel info imessage-attio  # partial name match works
```

### Manage services

```bash
kennel start <service>
kennel stop <service>
kennel restart <service>
```

### View logs

```bash
kennel logs textme
kennel logs textme --lines 100
```

### Health checks

```bash
$ kennel doctor
⚠ com.alexpriest.imessage-attio (launchd): Config file may contain hardcoded secrets
  → Consider using environment variables or a keychain instead
```

Doctor checks for:
- Stale PIDs (process gone but service reports running)
- Missing executables
- Hardcoded secrets in plist config files
- Services in error state

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

Or run in dev mode:

```bash
tsx src/server.ts
```

### MCP Tools

- `list_services` — List all services with optional backend/status filters
- `get_service_info` — Get detailed info about a service
- `service_action` — Start, stop, or restart a service
- `service_logs` — Get recent log output
- `doctor` — Run health checks

## Backends

| Backend | Source | Actions | Notes |
|---------|--------|---------|-------|
| launchd | `~/Library/LaunchAgents/*.plist` | start/stop/restart | Skips `homebrew.mxcl.*` (handled by brew) |
| PM2 | `pm2 jlist` | start/stop/restart | Won't start PM2 daemon as side effect |
| brew | `brew services list --json` | start/stop/restart | Thin wrapper around Homebrew services |
| cron | `crontab -l` | read-only | Parses cron schedule into human-readable format |

## Development

```bash
npm install
npm run build
npm run test

# Run CLI in dev mode
npm run dev -- list
```

## License

MIT
