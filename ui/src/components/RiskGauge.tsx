import React from 'react';
import { severityColor, colors, fontFamily } from '../theme';

const gaugeKeyframes = `
@keyframes gauge-fill {
  from { stroke-dashoffset: var(--gauge-circumference); }
  to { stroke-dashoffset: var(--gauge-target); }
}
@keyframes gauge-fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes gauge-countUp {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

interface RiskGaugeProps {
  score: number; // 0-1
  level: string;
}

export function RiskGauge({ score, level }: RiskGaugeProps) {
  const pct = Math.round(score * 100);
  const color = severityColor(level);
  const radius = 40;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '8px 0',
        animation: 'gauge-fadeIn 0.5s ease both',
      }}
    >
      <style>{gaugeKeyframes}</style>
      <svg width={100} height={100} viewBox="0 0 100 100">
        {/* Background track */}
        <circle
          cx={50} cy={50} r={radius}
          fill="none" stroke={colors.bg.tertiary} strokeWidth={stroke}
        />
        {/* Animated fill */}
        <circle
          cx={50} cy={50} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{
            // CSS custom properties for the keyframe animation
            ['--gauge-circumference' as string]: circumference,
            ['--gauge-target' as string]: offset,
            animation: `gauge-fill 1s ease-out 0.3s both`,
          }}
        />
        {/* Percentage text */}
        <text
          x={50} y={44} textAnchor="middle"
          fontSize={22} fontWeight={700} fill={color}
          fontFamily={fontFamily}
          style={{ animation: 'gauge-countUp 0.6s ease 0.5s both' }}
        >
          {pct}%
        </text>
        {/* Label */}
        <text
          x={50} y={60} textAnchor="middle"
          fontSize={9} fontWeight={500} fill={colors.text.muted}
          fontFamily={fontFamily}
          style={{ animation: 'gauge-countUp 0.6s ease 0.7s both' }}
        >
          Risk Score
        </text>
      </svg>
    </div>
  );
}
