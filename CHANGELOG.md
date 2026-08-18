# Changelog

All notable changes to `@tuteliq/mcp` are documented here.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
The MCP tool surface — tool names, input schemas, and `structuredContent` shapes —
is the public API. Changes to the interactive widgets are user-visible but do not
break programmatic callers.

## [3.23.0] — 2026-08-18

### Fixed

- **Ambiguous file input was resolved silently instead of rejected.** Every
  file-taking tool accepts `file_path`, `url` and `base64` as three optional
  strings, of which exactly one is required. Nothing said so, and `resolveFile`
  returned on the first one it found. A caller supplying two had the others
  discarded with nothing thrown and nothing warned, so an agent hedging with
  both `url` and `base64` received a confident analysis of one file. Where the
  two pointed at different content, the answer described the wrong file.

  Supplying more than one source is now an error naming what was received.
  Empty strings count as absent, so a caller filling every field with `""` gets
  "no source" rather than "ambiguous". Supplying exactly one is unchanged.

  **Potentially breaking.** A caller that previously sent two sources received a
  successful response; it now receives an error. That response was describing a
  file the caller did not choose, so the previous behaviour was not safe to rely
  on, but the change is visible and is why this is a minor rather than a patch.

### Changed

- **The exactly-one constraint is now stated in the schema descriptions.** 28
  parameter descriptions and 7 tool descriptions across the media and synthetic
  tools. "Provide a file_path, url, or base64" read as a menu of things a caller
  may supply rather than a choice between them.

- **`analyze` now says when not to use it.** Its description was "Quick
  comprehensive safety analysis that checks for both bullying and unsafe
  content", which gave an agent nothing to choose it by. It now states that
  `detect_bullying` and `detect_unsafe` return richer per-category detail when
  the harm is known, and that multi-turn conversations belong to
  `detect_grooming` or `analyse_multi` because this endpoint scores one message
  at a time and does not reason across a conversation.

### Notes

- This package has no test runner. File-input behaviour is verified by a
  runnable script, `npm run verify:file-inputs`, rather than a test file that
  nothing would execute.

## [3.22.2] — 2026-08-13

### Fixed

- **`analyse_multi` accepted any string as an endpoint id.** The schema was
  `z.array(z.string())` with the description "Detection endpoints to run" and no
  list of valid values, so a caller had to guess them — and they are hyphenated
  and deliberately *not* the tool names (`social-engineering`, not
  `detect_social_engineering`). A wrong guess only surfaced as an API error.

  It is now a closed enum of the 11 documented endpoints, bounded to the 1-10
  the endpoint itself enforces, with the values listed in the description. The
  tool description also points callers here from `analyze`, which only ever runs
  bullying and unsafe — analysing a financial scam with `analyze` returns
  categories from the child-safety taxonomy because no fraud detector was run,
  which reads as a misclassification and is not one.

## [3.22.1] — 2026-08-13

### Fixed

- **`analyze` showed a restatement of its own chips as the analysis summary.**
  The card read `rationale || summary`, but `analyze` has no top-level
  `rationale` — it fans out to the bullying and unsafe detectors and only those
  sub-calls produce free text, while its top-level `summary` is a terse derived
  line ("Unsafe content: sexual_exploitation, illegal_activity"). Every
  `analyze` result therefore displayed the categories back to the reader
  instead of the reasoning behind them.

  The summary now prefers real prose wherever it lives: top-level `rationale`,
  then the nested sub-detector rationales, and `summary` only as a last resort
  — which is also the correct answer for `verdict_only` responses, since those
  skip rationale generation entirely. Where more than one detector explains
  itself, each paragraph is attributed, because two unlabelled paragraphs leave
  the reader guessing which detector said what.

## [3.22.0] — 2026-08-13

### Added

- **A cleared state for the risk gauge.** At 0% the ring had nothing to draw, so
  it rendered an empty grey track that read as a component that had failed to
  load. A cleared result is not a small amount of risk, it is a different kind
  of answer, so it now gets its own mark: a tinted disc, a tick, and a
  `0% risk / CLEARED` label. The scored ring is untouched.

- **A `DETECTED CATEGORIES` row on detection results**, above the analysis
  summary and separated by a rule. Chips are mono — these are literal API enum
  values a moderator may paste into a filter — with a leading dot for a
  scannable left edge, tinted by the result's severity.

  The section always renders. An absent section cannot be told apart from one
  that failed to load, and "none" is a finding worth stating, so a cleared
  result shows a teal `none` chip.

### Fixed

- **`analyze` never showed its categories.** It has no top-level `categories`
  field — it nests a `bullying` and an `unsafe` result, each carrying its own
  list under a different name (`bullying_type`, `categories`). The card read
  only the top level, so the chip row was empty and the finding surfaced only
  buried in the summary prose. Categories are now collected from every known
  shape, including the nested ones, and de-duplicated.

- **`server.json` had drifted to 3.21.2 while the package was at 3.21.7.** The
  MCP registry manifest and the published package now carry the same version.

### Changed

- The card keeps a 4px brand rule along its top edge in place of the chrome bar,
  per the updated UI kit. Hosts draw their own header naming the server and
  tool, so the card no longer repeats it.
- The moderation console's reasoning block is titled "Detection reasoning". No
  vendor or agent name appears anywhere in the widget surface.

## [3.21.7] — 2026-08-12

### Added

- **Per-call incident logging control** — `detect_bullying`, `detect_grooming`, `detect_unsafe` and `analyze_emotions` now accept an optional `incident_moderation_enabled`. It overrides your account-level incident-logging setting for that single call: `true` forces the incident to be persisted, `false` suppresses persistence, and omitting it defers to your account default (which itself defaults to enabled). Passed through to the API via `@tuteliq/sdk` 2.23.0.

## [3.21.1] — 2026-08-07

### Fixed

- **The chrome bar and footer had no left or right padding**, so the Tuteliq
  mark sat flush against the card's left edge and the `</>` glyph against the
  right. Introduced in 3.20.1 along with the responsive gutters: both elements
  set `padding: '14px 0'` inline, and that shorthand overrides the horizontal
  padding the gutter class supplies. The card body escaped it only because it
  uses `paddingTop`/`paddingBottom` longhand. Both now use longhand.

  Verified at 920px, 750px and 400px: the mark and the `</>` glyph are inset
  23px at full width and 15px on narrow hosts, matching the body gutter.

- **The risk gauge's centre text overlapped the ring.** Its overlay was pinned
  to the full square (`inset: 0`), so "RISK SCORE" ran the whole width of the
  gauge and crossed the coloured stroke on both sides. The overlay is now
  clamped to the ring's inner disc, the label has lost its letter-spacing, and
  both faces scale with the gauge.

  Measured rather than eyeballed — worst-corner distance from the centre versus
  the inner clear radius, since the label sits below centre where the circle
  has already narrowed. Every value from 0% to 100% now clears the ring, worst
  case 5.4px at "100%", and the label holds 6px of clearance even when the
  webfont is blocked and it falls back to a system face.

- `WidgetShell` gained a `showChrome` prop (default on). MCP hosts draw their
  own header above the widget iframe naming the server and tool, so both are
  visible at once; set it to false where that duplication is unwanted.

## [3.21.0] — 2026-08-07

### Added

- **`moderation_queue`** — a moderator triage console, with a paired widget.
  Reads the unreviewed queue and the next item from the incident store, and
  renders the calling assistant's own analysis trace, reasoning and recommended
  decision alongside it for a human to sign off.

  The tool itself is read-only — it reads the queue and renders a
  recommendation. Applying a decision is always `review_incident`.

  The card keeps API-derived facts and assistant-supplied claims visually
  distinct, and labels the latter "Assistant reasoning" — a moderator signing an
  escalation needs to know which half is a measurement and which is an argument.

  `operator_name` is an optional parameter, never defaulted. There is no
  account- or organisation-name field anywhere in the Tuteliq SDK, so the name
  cannot be retrieved; supplying it is the caller's job, and omitting it yields
  an unbranded header rather than an invented one.

  Queue depth beyond one page is reported as a floor (`47+`) rather than an
  exact count, since the list endpoint returns a page, not a total.

  **The decision buttons act.** "Escalate" calls `review_incident` through the
  host — the moderator clicking the button *is* the human decision, and routing
  that through copy-and-paste would have added friction without adding
  oversight. It does not fire on a single click: `review_incident` persists an
  override and emits a signed Art 12 audit receipt, and it requires a
  `reason_code`. Defaulting that silently would write a value the moderator
  never chose into a document that is legal evidence, so the button opens a
  reason picker and a second click commits. "View full analysis" calls
  `get_incident`; "Skip to next" re-invokes `moderation_queue` at a higher
  offset via the new `skip` parameter, mutating nothing.

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
