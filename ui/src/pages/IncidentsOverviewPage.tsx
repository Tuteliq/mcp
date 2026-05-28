import React from 'react';
import { colors, fontFamily } from '../theme';
import { IncidentHeader } from '../components/IncidentHeader';
import { KpiCard } from '../components/KpiCard';
import { BarChart } from '../components/BarChart';

interface OverviewResult {
  timeframe: { from: string; to: string };
  total_incidents: number;
  requires_review_count: number;
  last_24h_count: number;
  last_7d_count: number;
  last_30d_count: number;
  counts_by_category: Record<string, number>;
  counts_by_severity: Record<string, number>;
  counts_by_source: Record<string, number>;
  counts_by_status: Record<string, number>;
  top_platforms: Array<{ platform: string; count: number }>;
}

interface Props { data: { result: OverviewResult } }

const formatTimeframe = (from: string, to: string) => {
  const f = new Date(from), t = new Date(to);
  const ms = t.getTime() - f.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  return `${days}-day window · ${f.toISOString().slice(0, 10)} → ${t.toISOString().slice(0, 10)}`;
};

export function IncidentsOverviewPage({ data }: Props) {
  const o = data.result;
  const platformsAsRecord = Object.fromEntries(o.top_platforms.map(p => [p.platform, p.count]));
  const reviewPct = o.total_incidents > 0
    ? Math.round((o.requires_review_count / o.total_incidents) * 100)
    : 0;

  return (
    <div style={{ fontFamily, color: colors.text.primary }}>
      <IncidentHeader
        title="Incidents Overview"
        subtitle={formatTimeframe(o.timeframe.from, o.timeframe.to)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        <KpiCard label="Total Incidents" value={o.total_incidents} emphasis="neutral" />
        <KpiCard label="Needs Review" value={o.requires_review_count} hint={`${reviewPct}% of total`} emphasis={reviewPct > 30 ? 'high' : reviewPct > 10 ? 'medium' : 'low'} />
        <KpiCard label="Last 24 hours" value={o.last_24h_count} emphasis={o.last_24h_count > 50 ? 'high' : 'neutral'} />
        <KpiCard label="Last 7 days" value={o.last_7d_count} emphasis="neutral" />
        <KpiCard label="Last 30 days" value={o.last_30d_count} emphasis="neutral" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
        <BarChart title="By Category" data={o.counts_by_category} />
        <BarChart title="By Severity" data={o.counts_by_severity} colorBySeverity />
        <BarChart title="By Source" data={o.counts_by_source} />
        <BarChart title="By Status" data={o.counts_by_status} />
        <BarChart title="Top Platforms" data={platformsAsRecord} />
      </div>
    </div>
  );
}
