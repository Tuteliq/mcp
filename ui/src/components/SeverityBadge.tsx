import React from 'react';
import { severityColor, severityForeground, radius } from '../theme';

interface SeverityBadgeProps {
  level: string;
  label?: string;
}

/** Solid severity pill. The headline restatement of the level, next to the gauge. */
export function SeverityBadge({ level, label }: SeverityBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: radius.pill,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: severityForeground(level),
        background: severityColor(level),
        whiteSpace: 'nowrap',
      }}
    >
      {label || level}
    </span>
  );
}
