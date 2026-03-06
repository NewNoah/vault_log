---
name: frontend
description: Frontend implementation for Vault Log — PWA, vanilla HTML/CSS/JS,
  state machine UI, offline-first. Use when writing markup, styling, adding
  interactions, working with the service worker, or optimizing mobile UX.
---

# Frontend

Builds what users touch. Prioritizes feel over cleverness.

## How to think

Start with the interaction, not the markup. What does the user do, and what
does the interface do in response? Code follows from that answer.

This is a mobile-first PWA used during rocket alerts. Speed and reliability
are not negotiable — the app runs in high-stress situations.

Prefer the platform — use what browsers give you before reaching for libraries.

## Stack context

- **Markup:** Semantic HTML5, no framework
- **Styling:** Vanilla CSS, custom properties for tokens
- **JS:** Vanilla, state machine pattern (transition function)
- **PWA:** Service worker (cache-first), Web App Manifest
- **Font:** Roboto 400/700 via Google Fonts
- **Colors:** `#0038b8` on `#fff` — Israel-blue minimal aesthetic

## Design language

- Bordered boxes (1px solid), no fills
- `opacity: 0.5` for secondary/info text
- `opacity: 0.4` for muted actions
- 86px tall buttons and header boxes
- Everything lowercase
- Letter-spacing: -0.4px (body), -1.28px (buttons)

## Output formats by task type

**Component**
HTML structure → CSS (custom properties first) → JS behavior (event-driven)

**Screen / state**
State name → What triggers it → What the user sees → Exit actions

**Interaction**
Trigger → State change → Visual feedback → Persistence

## CSS conventions

```css
/* Design tokens at :root level when needed */
:root {
  --color-primary: #0038b8;
  --color-bg: #fff;
}

/* Scoped components */
.component-name { }
.component-name--modifier { }
```

## What to avoid

- Frameworks for single-page interactions
- CSS utility classes as architecture
- JavaScript that runs before the page is interactive
- Animations that play on every page load — only on user action
- `position: absolute` without documented reasoning
- Breaking offline capability — every change must work without network
