# Kennel redesign: build plan

Written 2026-10-07 by Kit at the end of the design session. Start here in a fresh session.

## Where things stand

- **Approved prototype:** `docs/design/2026-10-redesign/kennel-today.html` (built from `app-template.html` + `jobs.json`; published privately at https://claude.ai/artifact/977tmwZuZC1VDXF36Wv56g). Alex: "i LOVE this!!!!" on round 11.
- **Design history:** proposal + earlier rounds at https://claude.ai/artifact/8bGhqAxpiPrHKatLFdFZdZ; files in `docs/design/2026-10-redesign/`.
- **Live today:** `com.alexpriest.kennel` serves the *old* Svelte UI at localhost:5544 (localhost-only), with the Scheduled panel added this week (`src/scheduled.ts`). Six agent tasks run locally via `~/Code/tools/scheduled-tasks/run_task.py` and write run state to `~/.local/state/scheduled-tasks/`.
- **Linear:** project Kennel (https://linear.app/alexpriest/project/kennel-2516abdca10c). Umbrella ANT-992. Delegated: ANT-993 phase 1 data, ANT-994 other accounts' daemons, ANT-995 phase 2 UI port, ANT-996 calendar view, ANT-997 Settings + Ask Claude to fix, ANT-998 Digs pose pass + footer order, ANT-999 Tailscale. Backlog: ANT-1000 menu bar, ANT-1001 alerts decision (discuss), ANT-1002 Paloma login (Alex). Done: ANT-1003 scheduled tasks moved local.

## Design decisions Alex made (verbatim where it matters)

1. Plain native-scale app UI: 13px type, quiet lists, problems as one muted row, no hero. ("yeah this is infinitely better!!!")
2. **Mona Sans** is the default typeface ("mona sans is nice! let's keep it"). SF Pro and Atkinson stay as options in Settings.
3. Timeline = one lane per domain, quiet hours folded, real tooltips ("i LOVE this!!!!").
4. View pages each fit their content: daemon tiles with uptime, scheduled grouped by cadence, agent cards.
5. Slide-over detail panel per job ("slideover is really nice!").
6. Keyboard shortcuts like alexpriest.com: d theme, f size, t typeface, 1-5 views, j/k/↵, ⌘K, ?, esc.
7. Digs, the line-drawn dog (GPT-6.1 Sol), lives in the sidebar footer and reacts to activity. No color, easter egg, not a mascot.
8. No spend anywhere: it can't be right on a Max plan.
9. "Ask Kit to fix" becomes **"Ask Claude to fix"**, with the agent selectable in Settings.
10. Build for Alex first, keep his specifics in config so a public release stays possible.
11. Phone access over Tailscale (private to his devices).

## Open decision (do not build until Alex answers)

- Should Kennel own failure texts (one text per incident as Kit, quiet hours, mute), replacing the per-script texts and `kit-imsg-healthcheck`?

## Phases

### Phase 1: make the data true (backend)
- State model: daemons Up / Down / Flapping / Unhealthy; scheduled jobs carry last result, next-run on-time vs Missed (grace window for sleep), schedule active/paused.
- `kennel-run` wrapper so every scheduled job records start, finish, exit code, duration, log tail (generalize `run_task.py`'s state files).
- Job kinds from launchd definitions: KeepAlive daemons, calendar/interval jobs, WatchPaths ("when files change"), run-once (KeepAlive SuccessfulExit=false). The prototype's `jobs.json` builder shows the rules.
- Names, purposes, domains from `~/Code/system/scripts/system-inventory-notes.toml` plus a Kennel config (`~/.config/kennel/config.json`) for overrides.
- Watch other users' launchd domains (paloma, kit). Paloma's daemon was down 5 days and invisible to Kennel.
- Uptime from the real process tree (the launcher wrapper's pid under-reports memory; sum children or drop memory).
- Honest actions: optimistic state, confirm against launchd, revert with reason. Never let Kennel stop itself.
- Logs: merge stdout + stderr; follow live.
- Push updates (SSE) instead of 60s polling; cache plist parsing.
- Delete the 1,488-line legacy `src/dashboard.ts`; one schedule formatter.

### Phase 2: the approved UI (Svelte)
- Port the prototype: sidebar (views, domain filters, Live + Shortcuts pinned to the very bottom, Digs above them), Today, view pages, detail slide-over, shortcuts, toast, help overlay, light/dark, Mona Sans default.
- Calendar view for Scheduled and Agents: day / week / month, showing when each job runs and how past runs went.
- Settings page: agent for "Ask ___ to fix" (Claude default; Kit, Codex as options), typeface, theme, text size; later quiet hours and domain mapping.
- "Ask Claude to fix": wire to the existing `/api/claude` terminal launcher with the job's name, purpose, exit code and last log lines in the prompt.
- Digs: GPT pass for clearly distinct poses (the head tilt doesn't read; sit and alert look alike), then the behaviors in the prototype.

### Phase 3: reach Alex
- `tailscale serve` for phone access; responsive layout already in the prototype.
- Menu bar dot (fix or replace the Tauri app: wrong API origin, CORS/CSRF, CSP blocks fonts, no compact layout).
- Alerts, if Alex says yes to the open decision.

## How to verify each phase
- Phase 1: `npm test` green with new tests written red-first for the state model and kind detection; `node dist/cli.js scheduled --json` and `/api/services` report the new states against the real machine.
- Phase 2: headless Chrome renders of every view in light and dark at 1440 and 390 wide, compared against the prototype.
- Phase 3: open the Tailscale URL from the phone (Alex), menu bar dot changes when a test job fails.
