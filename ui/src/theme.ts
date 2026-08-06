/**
 * Tuteliq MCP widget design tokens.
 *
 * Single source of truth for the widget surface, derived from the Tuteliq MCP
 * UI Kit. Every widget renders inside a host chat transcript (Claude, Cursor,
 * …) where we control nothing outside our own iframe — so the design has to
 * read as a self-contained, signed artifact rather than a page. That drives
 * three decisions encoded below:
 *
 *   1. Dark chrome bar + white body + footer bar (see WidgetShell). The chrome
 *      names the tool that produced the card, so a transcript full of widgets
 *      stays legible.
 *   2. Three typefaces with distinct jobs — display for headline numbers, body
 *      for prose, mono for anything a human might copy (IDs, tool names,
 *      counts). Mono on data is what makes the cards read as forensic output.
 *   3. A monotonic severity ramp. These widgets report on child safety and
 *      fraud; a moderator scanning a queue must be able to rank two chips by
 *      colour alone, without reading the label.
 */

// ── Palette ──────────────────────────────────────────────────────────────────

/** Dark surfaces: chrome bar, inset panels, icon tiles. */
export const ink = {
  /** Chrome bar + page backdrop. Near-black with a blue cast. */
  black: '#0D0D14',
  /** Primary ink. Headings, dark panels, solid buttons, icon tiles. */
  base: '#1D1D33',
  /** Gradient partner for `base` — lifts large dark panels off flat. */
  raised: '#233047',
  /** Borders and dividers *within* dark surfaces. */
  border: '#2A2A38',
} as const;

/** Brand teal. The only saturated hue in the system that isn't a severity. */
export const teal = {
  /** Accent fills: bars, gauges, the logo dot. */
  base: '#19B79A',
  /** Links, eyebrow labels, chip text. Darker for AA contrast on white. */
  deep: '#0E8672',
  /** Teal that survives on a dark background — icons on ink panels. */
  soft: '#7FE6D3',
} as const;

/**
 * Severity ramp — monotonic from safe to critical.
 *
 * `low` is deliberately a cool grey rather than a yellow: in a moderation
 * queue, yellow reads as "caution" and competes with `medium` for attention.
 * Low-severity incidents should recede.
 */
export const severity = {
  safe: '#19B79A',
  low: '#B7C2D4',
  medium: '#D98A3D',
  high: '#C2543A',
  critical: '#9C3A29',
} as const;

// ── Semantic tokens ──────────────────────────────────────────────────────────

export const colors = {
  ink,
  teal,

  brand: {
    /** Primary brand ink — headings, dark surfaces. */
    primary: ink.base,
    /** Accent teal — fills, indicators. */
    primaryLight: teal.base,
    /** Deep teal — links and small text that must hold contrast on white. */
    primaryDark: teal.deep,
    /** Teal for use on dark surfaces. */
    onDark: teal.soft,
  },

  severity,

  /** Light surfaces, lightest first. */
  bg: {
    /** Card body. */
    primary: '#FFFFFF',
    /** Inset panels, callouts, the support card body. */
    secondary: '#F7F9FC',
    /** Tinted panels and tag backgrounds — slightly bluer than `secondary`. */
    tertiary: '#F1F5FB',
    /** Progress-bar tracks and dividers. */
    track: '#EEF1F7',
  },

  text: {
    /** Headings and emphasised values. */
    primary: '#1D1D33',
    /** Body copy. */
    body: '#3A4453',
    /** Secondary text and mono data. */
    secondary: '#4A5568',
    /** Labels, captions, metadata. */
    muted: '#8A94A6',
    /** De-emphasised metadata — IDs, "shown for reference" notes. */
    faint: '#B4BCCB',
    /** Control outlines (checkboxes) and the faintest hairlines. */
    fainter: '#C7CEDB',
    /** Body copy on dark surfaces. */
    onDark: '#F7F9FC',
    /** Muted copy on dark surfaces. */
    onDarkMuted: '#AEB8C9',
  },

  /** Chrome-bar text, dark to light. */
  chrome: {
    dim: '#5A6478',
    mid: '#7A8496',
    label: '#8A94A6',
  },

  /** Panel border. */
  border: '#E4E9F2',
  /** Divider between rows inside a panel — one step lighter than `border`. */
  borderSubtle: '#F0F3F8',

  /** Warning glyph on dark surfaces. */
  warningOnDark: '#F2CC8F',
  /** "Encrypted — decrypt client-side" notices. Reads as a lock, not an error. */
  locked: '#B4863F',
} as const;

/**
 * Resolve a severity/risk level to its ramp colour.
 *
 * Accepts the several vocabularies the API uses across tools — detection
 * levels (`none`…`critical`), incident severities (`moderate`), and synthetic
 * classifications — so callers never have to normalise first.
 */
export function severityColor(level: string): string {
  const map: Record<string, string> = {
    none: severity.safe,
    safe: severity.safe,
    authentic: severity.safe,
    low: severity.low,
    minimal: severity.low,
    medium: severity.medium,
    moderate: severity.medium,
    high: severity.high,
    critical: severity.critical,
    severe: severity.critical,
  };
  return map[(level || '').toLowerCase()] || colors.text.faint;
}

/** Foreground that holds contrast on a solid `severityColor(level)` fill. */
export function severityForeground(level: string): string {
  // `low` is the only ramp step light enough to need dark text.
  return severityColor(level) === severity.low ? colors.text.primary : '#FFFFFF';
}

// ── Typography ───────────────────────────────────────────────────────────────

/**
 * Three faces, three jobs. Each stack degrades to a system font, so a host
 * that blocks the webfont request loses the texture but not the layout.
 */
export const fonts = {
  /** Headline numbers and card titles. Weights 700/800 only. */
  display: "'Poppins', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  /** Everything prose. Weights 400–800. */
  body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  /** IDs, tool names, counts — anything copyable or column-aligned. */
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

/** @deprecated Use `fonts.body`. Retained so older call sites keep compiling. */
export const fontFamily = fonts.body;

/** Type scale. Sizes in px; the widgets render at a fixed transcript width. */
export const type = {
  /** Card title — Poppins 700. */
  title: { fontFamily: fonts.display, fontWeight: 700, fontSize: 20 },
  /** Panel heading on dark surfaces — Poppins 700. */
  headline: { fontFamily: fonts.display, fontWeight: 700, fontSize: 19 },
  /** Headline metric — Poppins 700, tabular. */
  metric: { fontFamily: fonts.display, fontWeight: 700, fontSize: 25 },
  /** Gauge centre value — Poppins 800. */
  gauge: { fontFamily: fonts.display, fontWeight: 800, fontSize: 22 },
  /** Body copy. */
  body: { fontFamily: fonts.body, fontWeight: 400, fontSize: 14, lineHeight: 1.55 },
  /** Secondary body / subtitles. */
  bodySm: { fontFamily: fonts.body, fontWeight: 400, fontSize: 13 },
  /** Row labels. */
  label: { fontFamily: fonts.body, fontWeight: 600, fontSize: 13.5 },
  /** Captions and metadata. */
  caption: { fontFamily: fonts.body, fontWeight: 400, fontSize: 12 },
  /** Mono data — IDs, counts, tool names. */
  mono: { fontFamily: fonts.mono, fontWeight: 500, fontSize: 12 },
} as const;

/**
 * Uppercase section label ("BY CATEGORY", "CATEGORIES"). The wide tracking is
 * what makes these read as structure rather than content.
 */
export const eyebrow = {
  fontFamily: fonts.body,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
  color: colors.text.muted,
  textTransform: 'uppercase' as const,
};

/** Tighter eyebrow for the constrained space inside a stat tile. */
export const eyebrowTight = {
  ...eyebrow,
  fontSize: 10.5,
  letterSpacing: 0.9,
};

// ── Shape ────────────────────────────────────────────────────────────────────

export const radius = {
  /** Outer card. */
  card: 14,
  /** Panels and dark callouts. */
  panel: 12,
  /** Stat tiles. */
  tile: 10,
  /** Inset blocks and buttons. */
  inset: 8,
  /** Chips and icon tiles. */
  chip: 6,
  /** Tags. */
  tag: 5,
  /** Version pills and progress tracks. */
  xs: 4,
  /** Fully rounded — status pills, badges. */
  pill: 100,
} as const;

export const shadow = {
  /** The card's lift off the host transcript background. */
  card: '0 12px 32px rgba(0,0,0,0.4)',
} as const;

/** Horizontal padding shared by the chrome bar, body, and footer. */
export const gutter = 36;

// ── Base stylesheet ──────────────────────────────────────────────────────────

const FONT_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Inter:wght@400;500;600;700;800' +
  '&family=Poppins:wght@700;800' +
  '&family=JetBrains+Mono:wght@500;600' +
  '&display=swap';

/**
 * Injected once per widget by each entrypoint.
 *
 * `body` carries no padding — WidgetShell owns the card's own margin, so the
 * card can sit flush against the host's transcript gutter.
 */
export const baseStyles = `
  @import url('${FONT_HREF}');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: ${fonts.body};
    color: ${colors.text.primary};
    background: transparent;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a { color: ${teal.deep}; text-decoration: none; }
  a:hover { color: ${teal.base}; }

  /* Numeric columns must not jitter as values animate or update. */
  .tq-tabular { font-variant-numeric: tabular-nums; }

  /*
   * Horizontal rhythm. A class rather than an inline style because the gutter
   * has to shrink on narrow hosts — the mobile Claude app renders these cards
   * around 400px, where a 36px gutter each side eats a fifth of the width.
   */
  .tq-gutter { padding-left: ${gutter}px; padding-right: ${gutter}px; }
  .tq-chrome-gutter { padding-left: ${gutter - 14}px; padding-right: ${gutter - 14}px; }

  @media (max-width: 560px) {
    .tq-gutter { padding-left: 18px; padding-right: 18px; }
    .tq-chrome-gutter { padding-left: 14px; padding-right: 14px; }
  }

  /*
   * IDs, cursors and envelope references are unbroken tokens with no spaces.
   * Without this they force the whole card wider than its container.
   */
  .tq-break { overflow-wrap: anywhere; word-break: break-word; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
