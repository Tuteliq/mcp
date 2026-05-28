import React from 'react';
import { colors, fontFamily, severityColor } from '../theme';

interface BarChartProps {
  title: string;
  data: Record<string, number>;
  /** When true, color bars by severity key; otherwise use the default accent. */
  colorBySeverity?: boolean;
  /** Cap rows shown; rows beyond the cap are summed into "other". */
  maxRows?: number;
}

export function BarChart({ title, data, colorBySeverity, maxRows = 8 }: BarChartProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, maxRows);
  const hidden = entries.slice(maxRows);
  const overflow = hidden.reduce((sum, [, v]) => sum + v, 0);
  const displayed: Array<[string, number]> = overflow > 0
    ? [...shown, [`+${hidden.length} other`, overflow]]
    : shown;
  const max = Math.max(1, ...displayed.map(([, v]) => v));

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        fontFamily,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
        {title}
      </div>
      {displayed.length === 0 ? (
        <div style={{ fontSize: 12, color: colors.text.muted, padding: '8px 0' }}>No data</div>
      ) : (
        displayed.map(([key, value]) => {
          const pct = (value / max) * 100;
          const accent = colorBySeverity ? severityColor(key) : colors.brand.primaryLight;
          return (
            <div key={key} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.text.primary, marginBottom: 3 }}>
                <span style={{ fontWeight: 500 }}>{key}</span>
                <span style={{ color: colors.text.muted, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</span>
              </div>
              <div style={{ background: colors.bg.tertiary, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    background: accent,
                    height: '100%',
                    width: `${pct}%`,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
