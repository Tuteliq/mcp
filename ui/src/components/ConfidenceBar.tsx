import React from 'react';
import { colors } from '../theme';

interface ConfidenceBarProps {
  /** 0–1. */
  value: number;
  label?: string;
}

/**
 * How sure the model is — always teal, never the severity colour.
 *
 * Confidence and severity are independent axes: a high-confidence "safe" and a
 * low-confidence "critical" are different situations, and colouring this bar
 * by severity would collapse them. Teal means "this is a measurement", the
 * ramp means "this is a risk".
 */
export function ConfidenceBar({ value, label = 'Detection confidence' }: ConfidenceBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value || 0)) * 100);
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13.5,
          fontWeight: 600,
          color: colors.text.primary,
          marginBottom: 8,
        }}
      >
        <span>{label}</span>
        <span className="tq-tabular">{pct}%</span>
      </div>
      <div
        style={{ height: 8, background: colors.bg.track, borderRadius: 4 }}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: colors.teal.base,
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}
