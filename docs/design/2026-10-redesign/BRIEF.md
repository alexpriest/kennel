# Design brief: Kennel "Today" screen — push the envelope, stay readable

## What Kennel is
A personal web app (localhost on a Mac Mini, also opened on an iPhone over Tailscale) that answers one question at a glance: **is everything that works for me OK?** It watches ~60 background jobs on one person's Mac:
- **Daemons** (always-on services). States: Up, Down, Flapping (crash-looping), Unhealthy.
- **Scheduled jobs** (run on a timer). Three facts each: last run succeeded/failed; next run on time/missed (with a grace window); schedule active/paused. "Running now" overlays while a run is going.
- **Agents**: scheduled AI tasks that cost money per run (duration + $).
- Mac/third-party jobs, hidden by default.
Each job has a human name, a one-line purpose, and an owner domain: Kit (the AI chief of staff), Paloma (Spanish tutor), Vault and memory, Home and family, Anthimeros (consulting), Mac.
The mascot is the owner's dog, Digs: a small, simple cartoon dog mark (asleep = all quiet; head up = running/due; puzzled = missed; barking = failed). Reserve a 40-56px square slot for it near the product name (use a plain placeholder box labelled "Digs"); do not draw the dog.

## The owner's taste (images in this folder)
- craft-app-dashboard.png — "Everything about Craft is just impeccable. Layout, icons, spacing, visual organization."
- dia-sidebar-+-new-tab.png — "Clean layouts, good spacing, snappy interactions." Colored space names.
- hister-homepage.png — "Colors, comic book vibes, opinionated but not overwhelming."
- reflection-and-reflexivity-illustration.png — "Palette, simplicity, illustration."
He hates generic AI-generated design ("AI slop"). He wants it **good, usable, easily readable, and novel**.

## What has already failed (images in this folder)
- Current.png — today's UI: dark terminal, monospace, flat table of launchd labels. Wrong in every way.
- Home-v1.png — first proposal ("Kennel Paper" v1). He liked it at first. Two reviewers then scored it 6/10 and 4/10 for distinctiveness: Bricolage + Instrument Sans + JetBrains Mono is the default "not-Inter" AI trio; offset shadows sprinkled everywhere; status colors and domain colors collided; too many rounded white cards.
- Home-v2.png — the revision (Archivo Expanded + Newsreader serif + mono, ledger rules, one hard shadow). **He says it feels worse than v1.** Likely why: editorial/newspaper affect, harder to scan, serif body in a status tool, expanded caps shouting, cold. Do not repeat it.

## The real data to show (use exactly this; no invented numbers)
- Date: Tuesday, Oct 6. Machine: Mac Mini. 60 jobs total.
- 1 problem: **Agent sync** (Kit) — "Regenerates every agent instruction file from the canonical sources." Last run exited with code 3; it has not run since. Actions: Ask Kit to fix, View log, Mute for a day.
- Daemons: 16 up, 0 down, 0 flapping. Names (domain): Kit on iMessage (Kit), Kit gateway (Kit), Kit email (Kit), Message filter (Kit), Content vault sync (Vault), Agent runner (Anthimeros), Bike garage door (Home), AirDrop watchdog (Mac), + 8 more.
- Scheduled jobs: 35, all on time except agent sync. Timeline of today's runs: 3:30am activity digest (succeeded), 5:00am Kit rebuild and CRM contacts (succeeded), every-5/15/30-minute jobs (14 of them, all fine), now ≈ 10:00am, upcoming 1:00pm changelog, 9:00pm memory distillation.
- Agents (6): Daily Briefing (Kit) "Texts you what matters today" — last run Mon 12:35pm (test), 4m 03s, $2.31, next Wed 4:55am. Claude Code Changelog (Vault) "Reads each new release and notes what's worth adopting" — first run today 1:00pm. Memory Distillation (Vault) "Turns the day's log into lasting memory" — first run today 9:00pm. Weekly Review (Kit) "Catches you up on the whole week if it's the only thing you read" — Fri 4:00pm. Project Refresh (Kit) — Sun 9:00am. Maven Watch (Home) — Nov 1, 1:00pm. October agent spend so far: $2.31 (one run).
- Alice Payroll (Home) — plain script, no AI, "Submits nanny payroll from the calendar" — ran by hand Mon 12:12pm, next Mon 9:00am.

## Requirements
- Readability first: someone glancing for 3 seconds knows if anything is wrong and what. Body text comfortable (≥15px), strong contrast (WCAG AA), tabular numbers.
- Novel: a point of view a human designer with taste would commit to. Not a SaaS dashboard template, not cards-in-a-grid, not a newspaper. Avoid: Inter, Roboto, Bricolage, Instrument Sans, JetBrains Mono, Archivo, Newsreader, purple gradients, glassmorphism, emoji, generic stat tiles.
- Color: status (failed / missed / ok) must never be confusable with domain identity.
- Real controls (button, a) with visible focus; works at 390px wide (phone) with a media query.
- Fonts only from Google Fonts (or system fonts). One self-contained HTML file, inline CSS, no JS frameworks, no external images (CSS/inline SVG only).

## Deliverables (write into your output folder)
1. `today.html` — the Today screen at 1440px wide, responsive down to 390px.
2. `RATIONALE.md` — under 200 words: the idea in one sentence, the type/color/layout decisions and why, and what makes it not-slop.
Do not modify anything outside your output folder. Do not write the activity log, file or comment on Linear, or send anything.
