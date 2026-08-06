import React from 'react';
import { colors, severityColor } from '../theme';
import { WidgetShell } from '../components/WidgetShell';
import { CardHeader, Panel, Legend, StatTile, EmptyState } from '../components/primitives';

interface TrendsBucket {
  bucket_start: string;
  total: number;
  by_severity: Record<string, number>;
}

interface TrendsResult {
  bucket_size: 'hour' | 'day' | 'week';
  timeframe: { from: string; to: string };
  series: TrendsBucket[];
}

interface Props {
  data: { result: TrendsResult };
}

/** Stack order, worst at the bottom of the bar so the ramp reads top-to-bottom. */
const ORDERED_SEVERITIES = ['critical', 'high', 'medium', 'low'];

const CHART_HEIGHT = 170;

const formatBucketLabel = (iso: string, bucket: TrendsResult['bucket_size']) => {
  const d = new Date(iso);
  return bucket === 'hour' ? `${d.toISOString().slice(11, 13)}h` : d.toISOString().slice(5, 10);
};

export function IncidentTrendsPage({ data }: Props) {
  const t = data.result;
  const maxTotal = Math.max(1, ...t.series.map((b) => b.total));
  const grandTotal = t.series.reduce((s, b) => s + b.total, 0);
  const present = new Set(t.series.flatMap((b) => Object.keys(b.by_severity)));
  const orderedSevs = ORDERED_SEVERITIES.filter((s) => present.has(s));

  // Label every bucket at low counts; thin them out as the series grows so the
  // axis never collapses into an unreadable smear.
  const labelEvery = Math.max(1, Math.ceil(t.series.length / 12));

  return (
    <WidgetShell tool="get_incident_trends">
      <CardHeader
        title="Incident Trends"
        subtitle={`${t.bucket_size} buckets · ${t.series.length} points · ${grandTotal.toLocaleString()} total incidents`}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 3v18h18"
              stroke={colors.teal.base}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 12l3-3 4 4 5-5"
              stroke={colors.teal.base}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      <Panel style={{ marginBottom: 16 }}>
        <Legend items={orderedSevs.map((s) => ({ color: severityColor(s), label: s }))} />

        {t.series.length === 0 ? (
          <EmptyState>No incidents in this window.</EmptyState>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: CHART_HEIGHT + 40 }}>
            {t.series.map((bucket, idx) => {
              const barHeight = (bucket.total / maxTotal) * CHART_HEIGHT;
              const showLabel = idx % labelEvery === 0;
              return (
                <div
                  key={bucket.bucket_start}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 8,
                  }}
                  title={`${formatBucketLabel(bucket.bucket_start, t.bucket_size)} · ${bucket.total} incidents`}
                >
                  <div
                    className="tq-tabular"
                    style={{ fontSize: 9.5, color: colors.text.muted, marginBottom: 3, height: 12 }}
                  >
                    {bucket.total > 0 ? bucket.total : ''}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: barHeight,
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      borderRadius: '3px 3px 0 0',
                      overflow: 'hidden',
                      background: bucket.total === 0 ? colors.bg.track : undefined,
                      minHeight: bucket.total === 0 ? 2 : undefined,
                    }}
                  >
                    {orderedSevs.map((s) => {
                      const v = bucket.by_severity[s] || 0;
                      if (v === 0) return null;
                      return (
                        <div
                          key={s}
                          style={{
                            background: severityColor(s),
                            height: (v / bucket.total) * barHeight,
                            transition: 'height 0.4s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      color: colors.text.muted,
                      marginTop: 5,
                      height: 18,
                      whiteSpace: 'nowrap',
                      transform: 'rotate(-35deg)',
                      transformOrigin: 'top left',
                    }}
                  >
                    {showLabel ? formatBucketLabel(bucket.bucket_start, t.bucket_size) : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 14,
        }}
      >
        {orderedSevs.map((s) => {
          const total = t.series.reduce((sum, b) => sum + (b.by_severity[s] || 0), 0);
          const share = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
          return (
            <StatTile
              key={s}
              label={s}
              value={total}
              hint={`${share}% of window`}
              accent={severityColor(s)}
            />
          );
        })}
      </div>
    </WidgetShell>
  );
}
