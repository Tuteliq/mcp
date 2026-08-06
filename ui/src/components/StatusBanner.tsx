import React from 'react';
import { colors, fonts, radius, severityColor } from '../theme';

/**
 * The verdict line — the one thing a reader must take away from the card.
 *
 * This replaces an earlier treatment that used a full-bleed severity gradient,
 * a translucent shimmer overlay, and an infinite pulse animation on high and
 * critical results. Three reasons it had to go:
 *
 *   1. A pulsing red box in a chat transcript is an alarm the user cannot
 *      dismiss, on content they may be scrolling past for the tenth time.
 *      These widgets report on grooming, self-harm and abuse; the material is
 *      alarming enough without the UI performing urgency at the reader.
 *   2. The gradient made severity a *background*, so the label sat on a moving
 *      colour and contrast varied across the box.
 *   3. Four saturated gradient families meant no two severity levels shared a
 *      visual system.
 *
 * Now: one ink panel at every level, with severity carried by a 5px rule and
 * the glyph. Rank is legible, and the card stays readable in a long scroll.
 */

/**
 * Lightened red for the two hot levels. `severity.high`/`severity.critical`
 * are tuned for white backgrounds and go muddy on ink, so the glyph gets a
 * tint rather than the ramp value itself.
 */
const DANGER_ON_INK = '#F0A08C';

/** Severity tints that hold up against the ink panel. */
const glyphColor: Record<string, string> = {
  safe: colors.teal.soft,
  low: colors.text.fainter,
  medium: colors.warningOnDark,
  high: DANGER_ON_INK,
  critical: DANGER_ON_INK,
};

function onDark(level: string): string {
  const c = severityColor(level);
  const key = (Object.keys(glyphColor) as string[]).find((k) => severityColor(k) === c);
  return key ? glyphColor[key] : colors.text.onDarkMuted;
}

// ── Glyphs ───────────────────────────────────────────────────────────────────

const stroke = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function ShieldCheckIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export function InfoIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function WarningIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke} aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ShieldAlertIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

export function QuestionIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const glyphForLevel: Record<string, React.FC<{ color: string; size?: number }>> = {
  none: ShieldCheckIcon,
  safe: ShieldCheckIcon,
  low: InfoIcon,
  medium: WarningIcon,
  moderate: WarningIcon,
  high: ShieldAlertIcon,
  critical: ShieldAlertIcon,
};

// ── Banner ───────────────────────────────────────────────────────────────────

interface StatusBannerProps {
  /** Severity level driving the rule colour and glyph. */
  level: string;
  /** The verdict, e.g. "Medium risk detected". */
  title: React.ReactNode;
  /** One line of plain-language consequence. */
  subtitle?: React.ReactNode;
  /** Override the glyph — used by the synthetic-media classification banner. */
  icon?: React.FC<{ color: string; size?: number }>;
  style?: React.CSSProperties;
}

export function StatusBanner({ level, title, subtitle, icon, style }: StatusBannerProps) {
  const key = (level || 'none').toLowerCase();
  const Glyph = icon || glyphForLevel[key] || ShieldCheckIcon;
  const tint = onDark(key);

  return (
    <div
      // Announced politely: the reader gets the verdict from a screen reader
      // without the card seizing focus mid-transcript.
      role="status"
      style={{
        background: colors.ink.base,
        borderRadius: radius.panel,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderLeft: `5px solid ${severityColor(key)}`,
        ...style,
      }}
    >
      <Glyph color={tint} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 19,
            color: colors.text.onDark,
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 13.5, color: colors.text.onDarkMuted, marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
