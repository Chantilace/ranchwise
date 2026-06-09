# RanchWise

AI-powered ranch and breeding operations management MVP. Built solo with React 19, TypeScript, Vite, Tailwind v4, Base UI, ShadCN, Lucide React, Phosphor Icons.

## Design System (v0.1)

### Tokens

- CSS tokens live in `src/index.css` `:root` (NOT `globals.css` — does not exist)
- `@theme inline` block references them via `var()`
- Do not create a separate `globals.css`

### Color roles

The palette is built around four semantic roles. Each color has one job. Do not cross-use.

- **Camel** (`--primary: #9C6A40`) — brand identity only. Sidebar rail, logo, wordmark. Fill only, never strokes.
- **Indigo** (`--action: #5B4CAE`) — all interactive intent. Buttons, links, focus rings, form controls, tab underlines, selected states.
- **Periwinkle** (`--ai-accent: #7B6FDE`) — AI surfaces only. Smart Suggestions, sparkle marks, AI-assisted action indicators.
- **Status palette** — Emerald (good), Saffron (monitor), Tomato (flag). See Status system below.

### Surface tokens

- `--background: #FDFDFD` — page canvas (near-white with faintest undertone)
- `--card: #FFFFFF` — cards, modals, popovers
- `--muted: #F5F5F4` — muted surfaces (chip backgrounds, stat card backgrounds)
- `--muted-deeper: #EBEBE9`, `--surface-sunken: #EBEBE9` — deeper neutral surfaces

### Typography rules

Minimum text size in the app is 13px. The `text-xs` (12px) Tailwind scale is no longer used. The `--text-body-min` token (13px / 0.8125rem) replaces what was previously `--text-xs`.

Use `text-[13px]` for small body text, metadata, badges, labels, eyebrow text, captions, footnotes, and other copy that would have been 10-12px in older code.

Larger sizes available: `text-[14px]`, `text-[15px]`, `text-[16px]`, `text-[18px]`, etc., per location-specific design specs.

### Status system

Three canonical statuses. Everything routes to one of them.

- **Good** (`--status-good-*`) — Emerald. Healthy, completed, no action needed.
- **Monitor** (`--status-monitor-*`) — Saffron. Attention needed, in-progress watch states, warnings.
- **Flag** (`--status-flag-*`) — Tomato. Urgent, overdue, call vet.

**Single source of truth:** `STATUS_TOKENS` in `src/lib/statusUtils.ts`. Every badge, dot, swatch, and filter indicator reads from here. Do not duplicate this logic.

**Status value routing** (handled automatically by `routeToCanonical` in `statusUtils.ts`):

- `good`, `green`, `calved` → good
- `monitor`, `amber`, `calving-soon`, `pregnant`, `in-labor`, `complications` → monitor
- `flag`, `urgent`, `overdue`, `call-vet` → flag

**Emphasis policy (Policy B):**

Each status has three emphasis variants: `secondary` (default, soft tint), `primary` (solid fill, for focal moments), and `outline` (rare, explicitly requested).

- Tables and lists → always `secondary`. Scannability first.
- **Profile identity / hero badges** (the status tag beside the entity name on a horse / pasture / cattle profile, at every breakpoint) → always `primary`, including Good. The identity badge is a focal, solid element, so Good escalates here too. Use `emphasis="primary"` directly; do not route it through a conditional helper. Horse, pasture, and cattle profiles all follow this.
- Other detail panels and homepage "needs attention" counts → `monitor` and `flag` escalate to `primary`; Good stays `secondary`.
- Outline → only when explicitly requested.

Helper API:

```ts
getTableStatusBadgeClass(status, emphasis) // roster / data tables — 13px minimum (dense badge geometry); emphasis defaults to 'secondary'
getStatusBadgeClass(status, emphasis) // cards / modals / list rows — 13px minimum (card geometry)
getTablePastureStatusBadgeClass(status, emphasis)
getPastureStatusBadgeClass(status, emphasis)
getStatusDotClass(status)
```

### Adding a new status color

Future-proofing: adding a new canonical status (e.g., "neutral" or "archive") is a three-step change.

1. Add four tokens to `src/index.css` `:root` and `@theme inline`:
   ```
   --status-<name>-primary
   --status-<name>-primary-fg
   --status-<name>-bg
   --status-<name>-text
   ```
2. Add an entry to `STATUS_TOKENS` in `statusUtils.ts`.
3. Update `routeToCanonical` with any new input values that should route to it.

Everything downstream (`StatusBadge`, filter swatches, observation timeline, and the badge class helpers) picks it up automatically.

### Semantic rules

- **Monitor color (saffron)** — use for status indicators AND semantically-equivalent content (warning/attention callouts, RichText warning variants). Do not use as a generic accent, decoration, or for non-status UI.
- **Amber** — in v0.1, there is no generic amber. Saffron IS the amber, and it belongs to Monitor.
- **Red** — all red lives in the flag palette (`--status-flag-*`). No standalone red tokens.

### Counter semantics (dashboard)

- **Monitor amber** (`#F9C45A`, `--badge-monitor-mid-bg`) — used for Monitor-state counters, including **In labor** and **Complications** cattle counts.
- **Red** (`#e24b4a`) — reserved exclusively for **homepage overdue items** (not complications).
- **Flag-state badges** — use the lighter coral red `#F89898` (`--badge-flag-bg`) rather than deep red.
- **Two status systems**: cattle have both **Health observation status** (Good / Monitor / Flag from observations) and **Calving lifecycle status** (Calving soon / In labor / Complications / Calved). **Health Flag supersedes calving status** for urgency. A cow in Complications is **Monitor amber by default**; it only escalates to Flag red when the cow is also **health-flagged**.

### Badges

- All status badges: `rounded-lg`
- All status badges render through `getStatusBadgeClass` / `getTableStatusBadgeClass` (raw spans) or the `<StatusBadge>` component (`size` selects table vs card geometry)
- Do not define one-off badge colors in components. Add to the status system if a new role is truly needed.

### Special treatments

- **AI brand marks (three tiers)** — Use the shared primitives in `src/components/ai/`: **`AiAnnotationMark`** (Unicode ✦, inline before AI-assessed copy and at 18px for the dashboard Smart Suggestions section header), **`AiSurfaceMark`** (Lucide `Sparkle` at sm/md/lg for chips, sidebar, and other surfaces), **`AiActionButton`** (icon-only disclosure on timelines and cards). **`AiSurfaceMark` with `filled`** remains available for rare emphasis; the homepage Smart Suggestions header uses the Unicode mark instead for a solid glyph at small sizes. Do not reintroduce Lucide `Sparkles` (plural) or a second AI purple token; action buttons that include a sparkle use **`text-action-foreground`** on the icon over indigo fills.
- **Smart Suggestions (homepage)** — Three dark cards (`--ai-accent-deep`) driven by `buildHomeSmartSuggestionCardsModel` in `src/lib/homeSmartSuggestionCards.ts`, not teal. Teal is not part of the v0.1 palette.

## Working preferences

- Show before/after code blocks for any change
- Targeted single-file changes preferred over broad rewrites
- Show options side by side before committing
- Iterate through mocks before committing to implementation specs
- No em-dashes in prose
- Flag tool or font limitations upfront — never silently substitute
- For long migrations: break into small chunks, stop between saves, re-verify before deletion
