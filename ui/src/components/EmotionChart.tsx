import React from 'react';
import { colors } from '../theme';

interface EmotionChartProps {
  scores: Record<string, number>;
  trend?: string;
}

const trendLabels: Record<string, string> = {
  improving: '\u2191 Improving',
  stable: '\u2192 Stable',
  worsening: '\u2193 Worsening',
};

export function EmotionChart({ scores, trend }: EmotionChartProps) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ margin: '12px 0' }}>
      {trend && (
        <div style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 8 }}>
          Trend: <strong>{trendLabels[trend] || trend}</strong>
        </div>
      )}
      {sorted.map(([emotion, score]) => {
        const pct = Math.round(score * 100);
        return (
          <div key={emotion} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span style={{ textTransform: 'capitalize', color: colors.text.secondary }}>{emotion}</span>
              <span style={{ color: colors.text.muted }}>{pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: colors.bg.tertiary }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${colors.brand.primary}, ${colors.brand.primaryLight})`,

                  width: `${pct}%`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
