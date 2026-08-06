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
export function RiskGauge({ score, level, size = 96 }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(1, score || 0));
  const pct = Math.round(clamped * 100);
  const color = severityColor(level);

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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          className="tq-tabular"
          style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 22, color, lineHeight: 1 }}
        >
          {pct}%
        </span>
        <span
          style={{
            fontSize: 10,
            color: colors.text.muted,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            marginTop: 3,
          }}
        >
          Risk score
        </span>
      </div>
    </div>
  );
}
