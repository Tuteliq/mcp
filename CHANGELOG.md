# Changelog

All notable changes to `@tuteliq/mcp` are documented here.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
The MCP tool surface — tool names, input schemas, and `structuredContent` shapes —
is the public API. Changes to the interactive widgets are user-visible but do not
break programmatic callers.

## [3.21.0] — 2026-08-07

### Added

- **`moderation_queue`** — a moderator triage console, with a paired widget.
  Reads the unreviewed queue and the next item from the incident store, and
  renders the calling assistant's own analysis trace, reasoning and recommended
  decision alongside it for a human to sign off.

  It is **read-only**. It renders a recommendation; it never applies one.
  Applying a decision remains `review_incident`, so the host's approval step
  stays in the path and the human-in-the-loop is preserved. The action buttons
  copy the exact `review_incident` call rather than firing it.

  The card keeps API-derived facts and assistant-supplied claims visually
  distinct, and labels the latter "Assistant reasoning" — a moderator signing an
  escalation needs to know which half is a measurement and which is an argument.

  `operator_name` is an optional parameter, never defaulted. There is no
  account- or organisation-name field anywhere in the Tuteliq SDK, so the name
  cannot be retrieved; supplying it is the caller's job, and omitting it yields
  an unbranded header rather than an invented one.

  Queue depth beyond one page is reported as a floor (`47+`) rather than an
  exact count, since the list endpoint returns a page, not a total.

### Changed

- The README now documents the incident and moderation tools, which had never
  appeared in the tool tables despite shipping since 3.15.3.

## [3.20.1] — 2026-08-07

Layout fixes found by running 3.20.0 in a real MCP host. Presentation only.

### Fixed

- **The KPI row on the incidents overview wrapped to 4+1** instead of the five
  columns it is designed as. It used `auto-fit, minmax(150px, 1fr)`, which fits
  five at the 920px design width but silently drops to four below ~810px — and
  hosts render the card narrower than that. Now a fixed five-column grid that
  collapses only below 700px.
- **"Last 24 hours" was painted as volume rather than needs-attention**, which
  made the card's own legend wrong. An earlier revision coloured the recency
  tiles by whether they were running above the 30-day average, but the legend
  declares three fixed meanings (volume, needs attention, recent window) and
  each tile belongs to exactly one of them. Tile accents are fixed again:

  | Tile | Accent |
  |---|---|
  | Total incidents | `#1D1D33` volume |
  | Needs review | `#C2543A` needs attention |
  | Last 24 hours | `#C2543A` needs attention |
  | Last 7 days | `#19B79A` recent window |
  | Last 30 days | `#19B79A` recent window |

- The analysis panels below the KPI row are now an explicit two-column grid
  collapsing to one, rather than relying on a min-width that behaved
  inconsistently across host widths.

## [3.20.0] — 2026-08-06

Complete redesign of the interactive widgets against the Tuteliq MCP UI Kit. No
tool schemas changed; every widget looks different.

### Added

- **Unified widget shell.** Every widget now renders inside one frame: a dark
  chrome bar naming the MCP tool that produced the result, a white body, and a
  footer carrying the data-handling note and a Trust Center link. Previously the
  detection widgets and the dashboard widgets used two unrelated headers, so two
  cards in the same transcript looked like two products.
- **Design token system** (`ui/src/theme.ts`) — ink/teal/severity palettes, a
  three-typeface scale (Poppins for headline numbers, Inter for prose, JetBrains
  Mono for IDs and counts), radii, shadow, and spacing. Replaces ad-hoc colour
  literals scattered across pages.
- **Shared primitives** (`ui/src/components/primitives.tsx`) — `StatTile`,
  `MetricBar`, `Panel`, `CardHeader`, `SeverityChip`, `StatusPill`, `Tag`,
  `Callout`, `Legend`, `EmptyState`.
- **Responsive layout.** Card gutters narrow from 36px to 18px below 560px, and
  unbroken tokens (incident IDs, cursors, envelope references) now wrap. Verified
  with no horizontal overflow at 400px, 600px, and 900px viewports.
- **Loading state renders inside the real shell**, so the frame and footer are
  final from first paint and only the body swaps when the result arrives.
- **`npm run preview:ui`** — a local harness that renders every widget against
  fixture data on the host backdrop. Output is gitignored.
- **Relative timestamps** on incident rows ("2h ago") alongside the absolute time.
- **Above-trend markers** on the incidents overview, comparing the 24-hour and
  7-day counts against the 30-day daily average.

### Changed

- **Severity ramp is now monotonic** across all five levels, so two chips can be
  ranked by colour alone:

  | Level | Colour |
  |---|---|
  | `critical` | `#9C3A29` |
  | `high` | `#C2543A` |
  | `medium` | `#D98A3D` |
  | `low` | `#B7C2D4` |
  | `safe` / `none` | `#19B79A` |

  `low` is a cool grey rather than the previous yellow: in a moderation queue,
  yellow reads as caution and competed with `medium` for attention.
- **Status banners no longer animate.** The previous treatment used a full-bleed
  severity gradient, a translucent shimmer overlay, and an infinite pulse on high
  and critical results. These widgets report on grooming, self-harm and abuse; a
  pulsing red box the reader cannot dismiss, on content they may scroll past
  repeatedly, is the interface performing urgency at them. Severity is now carried
  by a rule and a glyph on a flat ink panel. A global `prefers-reduced-motion`
  rule was added alongside.
- **Support card rebuilt.** Moved from blue to ink, and the emoji (💙 🚨 📞) were
  removed — they render inconsistently across hosts and screen readers announce
  their CLDR names mid-sentence. Phone numbers are now the highest-contrast
  targets on the card and copy in one click.
- **Upsell banner is quieter** — no rocket, no gradient hero. It appears where the
  user expected an analysis result.
- **Brand mark is inline SVG**, replacing an 8KB base64 PNG that was duplicated
  across two files.
- Widgets report their real version to the MCP host. `appInfo.version` is now
  injected from `package.json` at build time; it had been hardcoded to `3.0.0`
  since the 3.0 release.

### Fixed

- **Widget collapsed to content width** when a host rendered it as a flex or grid
  child. `margin: 0 auto` with `max-width` and no `width: 100%` makes the auto
  side margins consume the free space instead of stretching.
- **Footer and helpline links now open through the MCP host** on every widget.
  Nine of the eleven entrypoints did not wrap their page in `AppProvider`, so
  `openLink` fell through to its clipboard fallback — the link appeared to do
  nothing when clicked. Previously this only affected two widgets, because only
  those two rendered any links.
- **Trust Center links pointed at paths that don't exist** (`tuteliq.ai/trust/…`,
  carried over from a design mockup). All widgets now link to
  `https://trust.tuteliq.ai/`.
- **Empty cards in the synthetic-media widgets.** `RationaleCard` and
  `ActionBadge` had no empty guards, so a tool returning no rationale or no
  recommended action produced a headed card with no body — indistinguishable from
  a failed analysis. The score panel likewise rendered a 0% grey gauge and an
  unlabelled severity pill when those fields were absent.
- **Default button border leaked** through on the first Action Plan step. React
  removes a style declaration set to `undefined` rather than blanking it, so the
  user-agent's `2px outset` border won.
- **`textTransform: capitalize`** on the incident detail banner rendered
  "Critical Severity".
- **Duplicated trend statement** on the emotions widget, which printed
  "Trend: ↓ Worsening" directly beneath a banner reading "Worsening trend".
- Bar charts scale against the largest row rather than the total. With incident
  distributions as skewed as these, scaling to the total left every row but the
  first as an unreadable stub.

### Removed

- `ui/src/App.tsx` (`AppWrapper`), `ui/src/components/IncidentHeader.tsx`, and
  `ui/src/components/FooterLinks.tsx` — superseded by `WidgetShell`.

## [3.19.0] — 2026-08

- Updated to `@tuteliq/sdk` 2.21.
- Surfaced `action_detail` on detection results.
- Fixed the video formatter.
- Documentation now leads with OAuth setup; static token and stdio demoted to
  secondary paths.

## [3.18.0]

- Verdict-only fast mode on `detect_grooming` and `detect_bullying` via
  `verdict_only: true` — returns the verdict without the per-message breakdown.
- Consumed `@tuteliq/sdk` 2.16.0.

## [3.17.0]

- Policy automation rules, detection settings, and threat intelligence
  (13 new tools).

## [3.16.0]

- Moderation-agent tooling: `batch_analyze`, policy configuration, usage quota.

## [3.15.8]

- Bulk triage: `batch_review_incidents` plus a multi-select incidents widget.

## [3.15.7]

- BYOK paste-in decryption using Web Crypto, browser-only.

## [3.15.6]

- Trajectory curve hero on the incident detail widget.

## [3.15.4]

- Interactive widgets for the read-only dashboard tools.

## [3.15.3]

- Read-only dashboard tools; `bypass_cache` on the `synthetic_*` tools.

## [3.13.0]

- Governance tools: E2E key management, audit receipts, moderator review.
