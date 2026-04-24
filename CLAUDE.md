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

### Status system

Three canonical statuses. Everything routes to one of them.

- **Good** (`--status-good-*`) — Emerald. Healthy, completed, no action needed.
- **Monitor** (`--status-monitor-*`) — Saffron. Attention needed, in-progress watch states, warnings.
- **Flag** (`--status-flag-*`) — Tomato. Urgent, overdue, complications, call vet.

**Single source of truth:** `STATUS_TOKENS` in `src/lib/statusUtils.ts`. Every badge, dot, swatch, and filter indicator reads from here. Do not duplicate this logic.

**Status value routing** (handled automatically by `routeToCanonical` in `statusUtils.ts`):

- `good`, `green`, `calved` → good
- `monitor`, `amber`, `calving-soon`, `pregnant`, `in-labor` → monitor
- `flag`, `urgent`, `overdue`, `complications`, `call-vet` → flag

**Emphasis policy (Policy B):**

Each status has three emphasis variants: `secondary` (default, soft tint), `primary` (solid fill, for focal moments), and `outline` (rare, explicitly requested).

- Tables and lists → always `secondary`. Scannability first.
- Detail panels, hero statuses, homepage "needs attention" counts → `monitor` and `flag` escalate to `primary`. Good stays `secondary` always.
- Outline → only when explicitly requested.

Helper API:

```ts
getStatusBadgeClass(status, emphasis)  // emphasis defaults to 'secondary'
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

Everything downstream (StatusBadge, filter swatches, observation timeline, getStatusBadgeClass) picks it up automatically.

### Semantic rules

- **Monitor color (saffron)** — use for status indicators AND semantically-equivalent content (warning/attention callouts, RichText warning variants). Do not use as a generic accent, decoration, or for non-status UI.
- **Amber** — in v0.1, there is no generic amber. Saffron IS the amber, and it belongs to Monitor.
- **Red** — all red lives in the flag palette (`--status-flag-*`). No standalone red tokens.

### Badges

- All status badges: `rounded-lg`
- All status badges render through `getStatusBadgeClass` or the `<StatusBadge>` component
- Do not define one-off badge colors in components. Add to the status system if a new role is truly needed.

### Special treatments

- **Diamond-rotated sparkle box** — reserved exclusively for the observation log accordion trigger on white backgrounds.
- **Smart Suggestions card** — periwinkle (`--ai-accent` family), not teal. Teal is not part of the v0.1 palette.

## Working preferences

- Show before/after code blocks for any change
- Targeted single-file changes preferred over broad rewrites
- Show options side by side before committing
- Iterate through mocks before committing to implementation specs
- No em-dashes in prose
- Flag tool or font limitations upfront — never silently substitute
- For long migrations: break into small chunks, stop between saves, re-verify before deletion
