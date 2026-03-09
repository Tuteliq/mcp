import React from 'react';
import { colors } from '../theme';

interface ConfidenceBarProps {
  value: number; // 0-1
  label?: string;
}

export function ConfidenceBar({ value, label = 'Confidence' }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.text.secondary, marginBottom: 4 }}>
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: colors.bg.tertiary }}>
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            background: colors.brand.primaryLight,
            width: `${pct}%`,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}
