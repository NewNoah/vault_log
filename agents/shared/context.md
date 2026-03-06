---
name: context
description: Vault Log project context. Load at the start of every session.
---

# Vault Log — Project Context

## What it is
PWA for logging time spent in bomb shelters during rocket alerts.
Single-user, offline-first, mobile-focused.

## State Machine

```
ALERT → IDLE → VAULT → ALERT
```

| State   | Screen                     | Actions                          |
|---------|----------------------------|----------------------------------|
| ALERT   | Home: stats + trigger      | "rocket alert" → IDLE            |
| IDLE    | Choose action              | "go to vault" → VAULT, "not going" → ALERT |
| VAULT   | Timer in header-box        | "exit vault" → ALERT (logs visit)|

## File Map

| File             | Role                                       |
|------------------|------------------------------------------  |
| `index.html`     | 3 screens (alert, idle, vault)             |
| `style.css`      | Vanilla CSS, custom properties, blue/white |
| `app.js`         | State machine, timers, localStorage        |
| `data.js`        | Historical visit data (42 entries)         |
| `sw.js`          | Service worker, cache-first strategy       |
| `manifest.json`  | PWA manifest                               |
| `icons/icon.svg` | SVG icon (blue circle), primary            |

## Stack

- **Frontend:** Vanilla HTML/CSS/JS, no frameworks
- **Storage:** localStorage (key: `vault_log`, migrated from `shelter_tracker`)
- **PWA:** Service worker + manifest, installable
- **Font:** Roboto 400/700 (Google Fonts)
- **Icons:** SVG primary + PNG fallback (192px, 512px)

## Design Tokens

```css
--color-primary: #0038b8;
--color-bg: #fff;
--box-height: 86px;
--opacity-secondary: 0.5;
--opacity-muted: 0.4;
```

- Single text size: `1.25rem` (20px) on body, everything inherits
- Letter-spacing: `-0.02em` (relative)
- Stats: CSS Grid (3 columns)
- Buttons: same size as body, `font-weight: 700`

## Roadmap direction

Moving toward multi-user with Supabase Auth + RLS.
Current version is v0.1 — local-only, single device.
