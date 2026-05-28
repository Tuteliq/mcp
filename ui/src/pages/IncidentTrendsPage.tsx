import React from 'react';
import { colors, fontFamily, severityColor } from '../theme';
import { IncidentHeader } from '../components/IncidentHeader';

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

interface Props { data: { result: TrendsResult } }

const ORDERED_SEVERITIES = ['critical', 'high', 'medium', 'low'];

const formatBucketLabel = (iso: string, bucket: TrendsResult['bucket_size']) => {
  const d = new Date(iso);
  if (bucket === 'hour') return d.toISOString().slice(11, 13) + 'h';
  if (bucket === 'week') return d.toISOString().slice(5, 10);
  return d.toISOString().slice(5, 10);
};

export function IncidentTrendsPage({ data }: Props) {
  const t = data.result;
  const maxTotal = Math.max(1, ...t.series.map(b => b.total));
  const grandTotal = t.series.reduce((s, b) => s + b.total, 0);
  const severitiesPresent = Array.from(new Set(t.series.flatMap(b => Object.keys(b.by_severity))));
  const orderedSevs = ORDERED_SEVERITIES.filter(s => severitiesPresent.includes(s));

  // Stacked-bar height (px) for the chart area
  const CHART_HEIGHT = 160;

  return (
    <div style={{ fontFamily, color: colors.text.primary }}>
      <IncidentHeader
        title="Incident Trends"
        subtitle={`${t.bucket_size} buckets · ${t.series.length} points · ${grandTotal.toLocaleString()} total incidents`}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 12l3-3 4 4 5-5" />
          </svg>
        }
      />

      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '14px 16px' }}>
        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, fontSize: 10 }}>
          {orderedSevs.map(s => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.text.muted }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: severityColor(s) }} />
              {s}
            </span>
          ))}
        </div>

        {/* Stacked bar chart */}
        {t.series.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: colors.text.muted, fontSize: 12 }}>
            No incidents in this window.
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: CHART_HEIGHT + 28 }}>
            {t.series.map((bucket, idx) => {
              const barHeight = (bucket.total / maxTotal) * CHART_HEIGHT;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 8 }}>
                  <div style={{ fontSize: 9, color: colors.text.muted, marginBottom: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {bucket.total > 0 ? bucket.total : ''}
                  </div>
                  <div style={{ width: '100%', height: barHeight, display: 'flex', flexDirection: 'column-reverse', borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
                    {orderedSevs.map(s => {
                      const v = bucket.by_severity[s] || 0;
                      if (v === 0) return null;
                      const h = (v / bucket.total) * barHeight;
                      return (
                        <div
                          key={s}
                          title={`${s}: ${v}`}
                          style={{ background: severityColor(s), height: h, transition: 'height 0.4s ease' }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 9, color: colors.text.muted, marginTop: 4, transform: 'rotate(-35deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', height: 16 }}>
                    {formatBucketLabel(bucket.bucket_start, t.bucket_size)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
        {orderedSevs.map(s => {
          const total = t.series.reduce((sum, b) => sum + (b.by_severity[s] || 0), 0);
          return (
            <div
              key={s}
              style={{
                background: '#fff',
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: '10px 12px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: severityColor(s) }} />
              <div style={{ fontSize: 9, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{s}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.text.primary, marginTop: 2 }}>{total.toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
