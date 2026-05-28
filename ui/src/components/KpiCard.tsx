import React from 'react';
import { colors, fontFamily } from '../theme';

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  emphasis?: 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'neutral';
}

const accentForEmphasis = (e: KpiCardProps['emphasis']) => {
  switch (e) {
    case 'safe': return colors.severity.safe;
    case 'low': return colors.severity.low;
    case 'medium': return colors.severity.medium;
    case 'high': return colors.severity.high;
    case 'critical': return colors.severity.critical;
    default: return colors.brand.primaryLight;
  }
};

export function KpiCard({ label, value, hint, emphasis = 'neutral' }: KpiCardProps) {
  const accent = accentForEmphasis(emphasis);
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '12px 14px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 3,
          bottom: 0,
          background: accent,
        }}
      />
      <div style={{ fontSize: 10, color: colors.text.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.text.primary, marginTop: 4, lineHeight: 1.1 }}>
        {displayValue}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: colors.text.muted, marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}
