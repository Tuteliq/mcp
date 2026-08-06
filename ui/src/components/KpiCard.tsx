import React from 'react';
import { colors, severityColor } from '../theme';
import { StatTile } from './primitives';

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  emphasis?: 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'neutral';
}

/**
 * Dashboard KPI — a `StatTile` with severity-driven accent.
 *
 * Kept as a distinct name because callers think in terms of "how alarming is
 * this metric", not "what colour is the rule"; `emphasis` maps that intent
 * onto the ramp in one place.
 */
export function KpiCard({ label, value, hint, emphasis = 'neutral' }: KpiCardProps) {
  const accent = emphasis === 'neutral' ? colors.ink.base : severityColor(emphasis);
  return <StatTile label={label} value={value} hint={hint} accent={accent} />;
}
