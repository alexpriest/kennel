# Kennel UI Polish — Design Spec

## Overview

Polish pass on kennel's web dashboard and CLI output. Adds service descriptions, fixes layout issues, improves refresh behavior, adds dark/light mode, and cleans up visual design.

## 1. Service Descriptions

### Data model

Add `description?: string` to the `Service` interface in `types.ts`.

### Description sources (hybrid approach)

**Primary: static descriptions file** at `~/.config/kennel/descriptions.json`

```json
{
  "com.alexpriest.imessage-attio": "Hourly iMessage → Attio CRM sync",
  "blooio-daemon": "iMessage assistant via Blooio API"
}
```

- Flat `{ "service-name-or-backendId": "description" }` map
- Looked up by exact match on `name` first, then `backendId`
- File is optional — missing file or missing key falls through to heuristic

**Fallback: heuristic from command/config**

Derive a best-guess description from available service metadata:

1. Extract the script/binary name from `command` (last path component, strip extension)
2. If the command contains a recognizable interpreter (`node`, `python`, `ts-node`), use the script name instead
3. Combine with working directory basename if it adds context (e.g., `sync` script in `imessage-attio/` → "imessage-attio sync")
4. For brew services, use the formula name as-is (e.g., "postgresql@14") — brew names are already descriptive
5. For cron jobs, use the existing `nameFromCommand` logic plus the schedule
6. If nothing useful can be derived, leave `description` undefined (no field shown)

### Where descriptions appear

- **Dashboard**: dim subtitle line under the service name in the table row
- **CLI `list`**: second line under the name column (gray/dim)
- **CLI `info`**: new "Description" field in the detail output
- **MCP server**: included in service JSON responses (no changes needed — it's just a new field on Service)

### Implementation

- New module: `src/descriptions.ts`
  - `loadDescriptions()`: reads `~/.config/kennel/descriptions.json`, returns Map
  - `describeService(service: Service, descriptions: Map<string, string>): string | undefined`: static lookup → heuristic fallback
- Registry calls `describeService` for each service in `listServices()` and sets `service.description`
- Descriptions loaded once per `listServices()` call (file read is cheap, keeps it fresh)

## 2. Dashboard Layout Fixes

### Column changes

Current grid: `8px 1fr 80px 100px 60px 120px auto` (status-bar, name, backend, status, pid, schedule, actions)

New grid: `4px 1fr 72px 90px 100px auto` (status-bar, name+desc, backend, status, schedule, actions)

- **Remove PID column** from the main grid — move to expanded detail panel
- **Backend column**: 72px is enough for "launchd" at 10px uppercase with letter-spacing
- **Name column**: `1fr` with `min-width: 0` so text-overflow works. Description as a second line (font-size 10px, muted color)
- **Schedule column**: 100px, enough for "every 1h" or "daily at 7:00"
- **Actions column**: `auto`, only renders buttons when applicable

### Service name display

```html
<div class="cell service-name">
  <div class="name-primary">imessage-attio</div>
  <div class="name-desc">Hourly iMessage → Attio CRM sync</div>
</div>
```

The `.name-desc` line is smaller (10px), muted color, single-line with ellipsis overflow.

## 3. Refresh Behavior

### Interval

Change from 15 seconds to 60 seconds.

### Diff-based updates

- Store the previous services array (JSON stringified per-service by name)
- On fetch, compare each service's JSON to the previous version
- Only update DOM for rows whose data actually changed
- Full re-render on: filter change, search change, first load
- This prevents the "flash" of the entire list re-rendering every cycle

### Manual refresh

- Add a refresh button in the header, next to the countdown timer
- Circular arrow icon (SVG, not emoji)
- Click triggers immediate fetch + resets countdown to 60
- Brief spin animation on the icon during fetch
- Disable the button during fetch to prevent double-clicks

### Countdown display

Keep the `refresh in Xs` text but update to 60s cycle. Show "refreshing..." during active fetch.

## 4. Dark and Light Mode

### CSS architecture

Current CSS uses `:root` variables for all colors. Add a second set under `[data-theme="light"]`:

```css
:root, [data-theme="dark"] {
  --bg: #0a0a0c;
  --bg-surface: #111115;
  /* ... existing dark values ... */
}

[data-theme="light"] {
  --bg: #f8f8fa;
  --bg-surface: #ffffff;
  --bg-raised: #f0f0f4;
  --bg-hover: #e8e8ee;
  --border: #d4d4dc;
  --border-subtle: #e2e2ea;
  --text: #1a1a2e;
  --text-dim: #4a4a66;
  --text-muted: #8888a0;
  --green: #16a34a;
  --green-dim: #15803d;
  --green-glow: rgba(22, 163, 74, 0.12);
  --red: #dc2626;
  --red-dim: #b91c1c;
  --red-glow: rgba(220, 38, 38, 0.12);
  --yellow: #ca8a04;
  --yellow-glow: rgba(202, 138, 4, 0.1);
  --blue: #2563eb;
  --blue-glow: rgba(37, 99, 235, 0.1);
  --cyan: #0891b2;
  --magenta: #9333ea;
  --amber: #d97706;
}
```

### Theme detection and toggle

- On load: check `localStorage.getItem('kennel-theme')`
  - If set: use that value (`dark` or `light`)
  - If not set: use `prefers-color-scheme` media query
- Set `data-theme` attribute on `<html>` element
- Toggle button in the header: sun icon (in dark mode) / moon icon (in light mode)
- Click toggles theme, saves to `localStorage`, updates `data-theme`
- Listen for `prefers-color-scheme` changes to update if user hasn't manually overridden

### What changes per theme

All color changes are handled by CSS variables — no JS-driven style changes. The scanline overlay is removed entirely (see section 5).

## 5. UI Polish

### Remove scanline overlay

Delete the `body::after` scanline effect. It's a dated CRT aesthetic that doesn't fit a utility dashboard.

### Typography and spacing

- Keep JetBrains Mono for data/monospace content
- Keep Space Grotesk for headings and stat values
- Tighten header: reduce bottom margin from 32px to 24px
- Stats bar: reduce padding slightly (12px 14px), tighten gap
- Service rows: 10px 12px padding in cells (down from 12px 14px)
- Overall shell padding: keep 32px top, reduce to 20px sides

### Stats bar refinement

- Add a subtle left-border color accent to each stat matching its meaning (green for running, red for errors, neutral for total/stopped)
- Slightly smaller stat values (20px instead of 22px)

### Toolbar

- Search box: add a subtle search icon (SVG) inside the input as placeholder decoration
- Filter buttons: slightly tighter padding (6px 12px)

### Service rows

- Hover state: slightly more pronounced background shift
- Expanded state: subtle left-border highlight matching status color
- Action buttons: slightly larger touch target (padding 4px 8px)
- Status text: capitalize first letter ("Running" not "running")

### Detail panel (expanded)

- Now includes PID (moved from main grid)
- Cleaner two-column layout with consistent label width
- Log viewer: slightly taller default (max-height 240px)

### Doctor panel

- Keep collapsible behavior
- Clean badge styling in both themes
- Issue rows: slightly more padding for readability

### Loading and empty states

- Loading spinner: use a more subtle animation (opacity pulse instead of rotating border)
- Empty state: add a small illustration or icon above the text

### Toast notifications

- Position: bottom-center instead of bottom-right
- Slightly wider with centered text
- Auto-dismiss after 3s (unchanged)

### Header additions

- Refresh button (circular arrow) next to countdown
- Theme toggle button (sun/moon) on the far right of header meta area

## File Changes Summary

| File | Change |
|------|--------|
| `src/types.ts` | Add `description?: string` to `Service` |
| `src/descriptions.ts` | New — description loading + heuristic |
| `src/registry.ts` | Call `describeService` in `listServices()` |
| `src/dashboard.ts` | Full rewrite of HTML/CSS/JS |
| `src/formatter.ts` | Show description in CLI table and info |
| `src/api.ts` | No changes (Service JSON already passes through) |
| `src/server.ts` | No changes (MCP tools already return Service) |
| `src/cli.ts` | No changes |

## Out of Scope

- CLI dark/light mode (terminal handles its own theming)
- Mobile responsive layout (desktop utility dashboard)
- Persistent service grouping or sorting preferences
- WebSocket live updates (polling is fine for this use case)
