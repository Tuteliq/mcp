import React from 'react';
import { severityColor, colors, fonts } from '../theme';

const gaugeKeyframes = `
@keyframes tq-gauge-sweep {
  from { stroke-dashoffset: var(--tq-gauge-start); }
  to   { stroke-dashoffset: var(--tq-gauge-end); }
}
`;

interface RiskGaugeProps {
  /** 0–1. */
  score: number;
  level: string;
  size?: number;
}

/**
 * Risk score as a ring.
 *
 * The value sits in HTML rather than an SVG `<text>` so it renders in Poppins
 * with the same weight as every other headline number in the system — SVG text
 * ignores the display stack in several of the hosts we render inside.
 */
/**
 * Nothing to plot.
 *
 * A ring is a comparison — it reads as "this much of the whole". At zero there
 * is no arc to compare against, so the scored treatment renders an empty grey
 * track that looks like a component that failed to load rather than a clean
 * result. A cleared result is not a small amount of risk; it is a different
 * kind of answer, so it gets its own mark: a filled disc and a tick.
 */
function ClearedDisc({ size }: { size: number }) {
  return (
    <div
      role="img"
      aria-label="Risk score 0 percent, cleared"
      style={{
        width: size,
        height: size,
        flex: '0 0 auto',
        borderRadius: '50%',
        background: 'rgba(25,183,155,0.06)',
        border: `1px solid rgba(25,183,155,0.30)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <svg
        width={Math.round(size * 0.29)}
        height={Math.round(size * 0.29)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 6L9 17l-5-5"
          stroke={colors.teal.deep}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: Math.round(size * 0.15),
          color: colors.teal.deep,
          lineHeight: 1.1,
        }}
      >
        0% risk
      </span>
      <span
        style={{
          fontSize: Math.max(7, Math.round(size * 0.082)),
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: colors.text.muted,
          lineHeight: 1,
        }}
      >
        Cleared
      </span>
    </div>
  );
}

export function RiskGauge({ score, level, size = 96 }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(1, score || 0));
  const pct = Math.round(clamped * 100);
  const color = severityColor(level);

  // No arc to draw. See ClearedDisc.
  if (pct === 0) return <ClearedDisc size={size} />;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <style>{gaugeKeyframes}</style>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Risk score ${pct} percent, ${level}`}>
        <circle cx={50} cy={50} r={radius} fill="none" stroke={colors.bg.track} strokeWidth={10} />
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{
            ['--tq-gauge-start' as string]: circumference,
            ['--tq-gauge-end' as string]: offset,
            animation: 'tq-gauge-sweep 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
          }}
        />
      </svg>
      {/*
        Clamped to the ring's inner disc, not the full box.
        `inset: 0` let the label run the whole width of the gauge, so
        "RISK SCORE" crossed the coloured stroke on both sides. The stroke
        occupies 10 of the 100 viewBox units centred on r=42, so the first
        clear unit is at 100 - 2*47 = 6%; 15% leaves a real margin inside that
        and keeps the text off the ring even when the webfont falls back to a
        wider system face.
      */}
      <div
        style={{
          position: 'absolute',
          inset: '15%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <span
          className="tq-tabular"
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            // 0.23 fitted "85%" but left a 100% score all but touching the
            // ring, and 100% is a value this gauge can genuinely show.
            fontSize: Math.round(size * 0.205),
            color,
            lineHeight: 1,
          }}
        >
          {pct}%
        </span>
        {/*
          The label is the widest thing in the disc and sits below centre,
          where the circle has already narrowed — so its bottom corners, not
          its width, are what collide with the ring. No letter-spacing, a
          tighter top margin and a smaller face keep those corners clear.
        */}
        <span
          style={{
            // Measured in the preview at size 96: the label rendered 47px wide
            // against a 68px chord. Inside the MCP host it renders materially
            // wider, close enough to touch the stroke, because the display
            // stack is not guaranteed there and the fallback face is broader.
            // Sizing down buys clearance that survives that substitution.
            fontSize: Math.max(7, Math.round(size * 0.076)),
            lineHeight: 1.05,
            color: colors.text.muted,
            letterSpacing: 0,
            textTransform: 'uppercase',
            marginTop: 2,
            // Belt and braces: even a very wide fallback cannot reach the ring.
            maxWidth: '86%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Risk score
        </span>
      </div>
    </div>
  );
}
