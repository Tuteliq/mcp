import React from 'react';
import {
  colors,
  fonts,
  radius,
  eyebrow as eyebrowStyle,
  eyebrowTight,
  severityColor,
  severityForeground,
} from '../theme';

/**
 * Shared building blocks for every widget body.
 *
 * These exist so a stat tile in the incidents dashboard and a stat tile in the
 * synthetic-media report are the *same* tile. Before this file each page
 * hand-rolled its own bordered box, and they drifted — different radii,
 * different label tracking, different bar heights.
 */

// ── Section label ────────────────────────────────────────────────────────────

/** Uppercase section label. `tight` for the cramped inside of a stat tile. */
export function Eyebrow({
  children,
  tight = false,
  color,
  style,
}: {
  children: React.ReactNode;
  tight?: boolean;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ ...(tight ? eyebrowTight : eyebrowStyle), ...(color ? { color } : null), ...style }}>
      {children}
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

/** Bordered content box with an optional section label. */
export function Panel({
  title,
  children,
  style,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.panel,
        padding: '20px 22px',
        ...style,
      }}
    >
      {title && <Eyebrow style={{ marginBottom: 16 }}>{title}</Eyebrow>}
      {children}
    </div>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────

/**
 * A single headline number.
 *
 * The left border is the only thing carrying severity here — the number itself
 * stays ink, because a grid of five differently-coloured 25px numerals is
 * noise. Colour marks *which* tile to look at; it doesn't restate the value.
 */
export function StatTile({
  label,
  value,
  hint,
  accent = colors.ink.base,
  /**
   * Centred variant: no accent rule, smaller value. Used where the tiles are a
   * balanced summary row rather than a ranked set — the moderation console's
   * queue counters, where no single tile is the one to look at first.
   */
  centered = false,
  valueColor,
}: {
  label: React.ReactNode;
  value: number | string;
  hint?: React.ReactNode;
  accent?: string;
  centered?: boolean;
  valueColor?: string;
}) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.tile,
        padding: 16,
        ...(centered
          ? { textAlign: 'center' as const }
          : { borderLeft: `3px solid ${accent}` }),
      }}
    >
      <Eyebrow tight style={{ marginBottom: 8 }}>
        {label}
      </Eyebrow>
      <div
        className="tq-tabular"
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: centered ? 20 : 25,
          color: valueColor ?? colors.text.primary,
          lineHeight: 1.1,
        }}
      >
        {display}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: colors.text.muted, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

// ── Metric bar ───────────────────────────────────────────────────────────────

/**
 * Labelled proportion bar.
 *
 * The value is mono so that a stacked list of counts aligns on the right edge
 * and can be compared by eye, which is the whole point of the bar next to it.
 */
export function MetricBar({
  label,
  value,
  pct,
  color = colors.teal.base,
  muted = false,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  /** Fill width, 0–100. */
  pct: number;
  color?: string;
  /** De-emphasise — used for aggregate "+N other" rows. */
  muted?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13.5,
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: muted ? colors.text.muted : colors.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        {value != null && (
          <span
            className="tq-tabular"
            style={{
              color: muted ? colors.text.muted : colors.text.secondary,
              fontFamily: fonts.mono,
              flex: '0 0 auto',
            }}
          >
            {value}
          </span>
        )}
      </div>
      <div style={{ height: 5, background: colors.bg.track, borderRadius: 3 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: muted ? colors.severity.low : color,
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

// ── Chips, pills, tags ───────────────────────────────────────────────────────

/** Solid severity chip. Uppercase, heavy — reads at a glance down a queue. */
export function SeverityChip({ level, label }: { level: string; label?: string }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: severityForeground(level),
        background: severityColor(level),
        padding: '3px 8px',
        borderRadius: radius.xs,
        whiteSpace: 'nowrap',
      }}
    >
      {label || level}
    </span>
  );
}

/** Outlined teal pill — workflow status, counts, secondary state. */
export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: colors.teal.deep,
        background: 'rgba(25,183,155,0.10)',
        border: '1px solid rgba(25,183,155,0.25)',
        padding: '2px 8px',
        borderRadius: radius.pill,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** Neutral tag for detected patterns and free-form labels. */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        background: colors.bg.tertiary,
        color: colors.text.secondary,
        padding: '3px 9px',
        borderRadius: radius.tag,
      }}
    >
      {children}
    </span>
  );
}

/**
 * A category the detector matched.
 *
 * Set in mono because these are literal API enum values (`sexual_exploitation`,
 * not "Sexual exploitation") that a moderator may paste into a filter or a
 * ticket, and the dot gives the row a scannable left edge so a reader counts
 * findings without reading them.
 *
 * `tone` follows the result: findings inherit the severity colour so the chip
 * row is readable at a glance, and a cleared result gets the teal "none" chip
 * rather than an absent section, which is indistinguishable from a bug.
 */
export function CategoryChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'clear' | string;
}) {
  const clear = tone === 'clear';
  const accent = clear ? colors.teal.deep : tone === 'neutral' ? colors.teal.deep : severityColor(tone);
  const tint = clear || tone === 'neutral' ? 'rgba(25,183,155,0.08)' : `${accent}14`;
  const edge = clear || tone === 'neutral' ? 'rgba(25,183,155,0.28)' : `${accent}55`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: fonts.mono,
        fontSize: 12.5,
        fontWeight: 500,
        color: accent,
        background: tint,
        border: `1px solid ${edge}`,
        padding: '6px 14px',
        borderRadius: radius.pill,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: accent,
          flex: '0 0 auto',
        }}
      />
      {children}
    </span>
  );
}

/** Attestation badge — "VERIFIED DETECTION", "C2PA SIGNED". */
export function VerifiedBadge({ children = 'Verified detection' }: { children?: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: colors.teal.deep,
        background: 'rgba(25,183,155,0.08)',
        border: '1px solid rgba(25,183,155,0.25)',
        padding: '4px 10px',
        borderRadius: radius.pill,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"
          stroke={colors.teal.deep}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke={colors.teal.deep}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </span>
  );
}

// ── Callout ──────────────────────────────────────────────────────────────────

/** Inset block with a teal rule — prose the model produced about the result. */
export function Callout({
  title,
  children,
  accent = colors.teal.base,
  style,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${accent}`,
        background: colors.bg.secondary,
        borderRadius: radius.inset,
        padding: '16px 20px',
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: colors.teal.deep,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ fontSize: 14, lineHeight: 1.55, color: colors.text.body }}>{children}</div>
    </div>
  );
}

// ── Card header ──────────────────────────────────────────────────────────────

/** The product lockup, for cards whose header has room on the right. */
export function BrandLockup() {
  return (
    <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 0.3,
          color: colors.text.primary,
        }}
      >
        TUTELIQ
      </div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: 0.6,
          color: colors.teal.deep,
          marginTop: 1,
        }}
      >
        GUARDIAN INTELLIGENCE
      </div>
    </div>
  );
}

/**
 * Title row inside the card body.
 *
 * Distinct from the chrome bar above it: chrome says which *tool* ran, this
 * says what the *result* is in human terms.
 */
export function CardHeader({
  title,
  subtitle,
  icon,
  right,
  divider = true,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Defaults to the shield-check glyph. Pass `null` to drop the tile. */
  icon?: React.ReactNode | null;
  right?: React.ReactNode;
  divider?: boolean;
}) {
  const showTile = icon !== null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: divider ? 28 : 20,
        paddingBottom: divider ? 20 : 0,
        borderBottom: divider ? `1px solid ${colors.bg.track}` : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {showTile && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.tile,
              background: colors.ink.base,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            {icon ?? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke={colors.teal.base}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 20,
              color: colors.text.primary,
              lineHeight: 1.25,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 13, color: colors.text.muted, marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.panel,
        padding: 28,
        textAlign: 'center',
        color: colors.text.muted,
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────

/**
 * Explains what the accent colours in a card mean.
 *
 * Worth the vertical space wherever colour carries meaning that isn't
 * otherwise labelled — a reader who can't distinguish the ramp gets the same
 * information from the text.
 */
export function Legend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        fontSize: 11,
        color: colors.text.muted,
        marginBottom: 14,
      }}
    >
      {items.map((it) => (
        <span key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: it.color,
              display: 'inline-block',
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
