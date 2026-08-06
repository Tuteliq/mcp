import React from 'react';
import { colors, severityColor } from '../theme';
import { Panel, MetricBar } from './primitives';

interface BarChartProps {
  title: string;
  data: Record<string, number>;
  /** Colour each bar by its key's severity instead of the brand accent. */
  colorBySeverity?: boolean;
  /** Rows beyond this cap are summed into a single "+N other" row. */
  maxRows?: number;
}

/**
 * Ranked breakdown of a count.
 *
 * Bars are scaled against the largest row, not the total — with distributions
 * as skewed as these (one category routinely holds 70%+ of incidents) scaling
 * to the total leaves every other row a stub and destroys the comparison the
 * chart exists to support.
 */
export function BarChart({ title, data, colorBySeverity, maxRows = 8 }: BarChartProps) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, maxRows);
  const hidden = entries.slice(maxRows);
  const overflow = hidden.reduce((sum, [, v]) => sum + v, 0);
  const max = Math.max(1, ...shown.map(([, v]) => v), overflow);

  return (
    <Panel title={title}>
      {entries.length === 0 ? (
        <div style={{ fontSize: 13, color: colors.text.muted, padding: '4px 0' }}>No data</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map(([key, value]) => (
            <MetricBar
              key={key}
              label={key}
              value={value.toLocaleString()}
              pct={(value / max) * 100}
              color={colorBySeverity ? severityColor(key) : undefined}
            />
          ))}
          {overflow > 0 && (
            <MetricBar
              label={`+${hidden.length} other`}
              value={overflow.toLocaleString()}
              pct={(overflow / max) * 100}
              muted
            />
          )}
        </div>
      )}
    </Panel>
  );
}
