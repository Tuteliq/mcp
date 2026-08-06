import React from 'react';
import { colors, severity } from '../theme';
import { WidgetShell } from '../components/WidgetShell';
import { CardHeader, Legend } from '../components/primitives';
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

interface Props {
  data: { result: OverviewResult };
}

const formatTimeframe = (from: string, to: string) => {
  const f = new Date(from);
  const t = new Date(to);
  const days = Math.round((t.getTime() - f.getTime()) / 86_400_000);
  return `${days}-day window · ${f.toISOString().slice(0, 10)} → ${t.toISOString().slice(0, 10)}`;
};

export function IncidentsOverviewPage({ data }: Props) {
  const o = data.result;
  const platforms = Object.fromEntries(o.top_platforms.map((p) => [p.platform, p.count]));
  const reviewPct =
    o.total_incidents > 0 ? Math.round((o.requires_review_count / o.total_incidents) * 100) : 0;

  // Rising volume is the signal worth flagging, so the recency tiles only turn
  // warm when the short window is running hot relative to the 30-day average.
  const dailyAverage = o.last_30d_count / 30;
  const spiking24h = dailyAverage > 0 && o.last_24h_count > dailyAverage * 2;
  const spiking7d = dailyAverage > 0 && o.last_7d_count > dailyAverage * 7 * 1.5;

  return (
    <WidgetShell tool="get_incidents_overview">
      <CardHeader
        title="Incidents Overview"
        subtitle={formatTimeframe(o.timeframe.from, o.timeframe.to)}
      />

      <Legend
        items={[
          { color: colors.ink.base, label: 'Volume' },
          { color: severity.high, label: 'Needs attention' },
          { color: colors.teal.base, label: 'Recent window' },
        ]}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 14,
          marginBottom: 26,
        }}
      >
        <KpiCard label="Total incidents" value={o.total_incidents} emphasis="neutral" />
        <KpiCard
          label="Needs review"
          value={o.requires_review_count}
          hint={`${reviewPct}% · auto-escalated, pending sign-off`}
          emphasis={reviewPct > 30 ? 'high' : reviewPct > 10 ? 'medium' : 'neutral'}
        />
        <KpiCard
          label="Last 24 hours"
          value={o.last_24h_count}
          hint={spiking24h ? 'above trend' : undefined}
          emphasis={spiking24h ? 'high' : 'neutral'}
        />
        <KpiCard
          label="Last 7 days"
          value={o.last_7d_count}
          hint={spiking7d ? 'above trend' : undefined}
          emphasis={spiking7d ? 'medium' : 'safe'}
        />
        <KpiCard
          label="Last 30 days"
          value={o.last_30d_count}
          hint="= reporting window"
          emphasis="safe"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <BarChart title="By category" data={o.counts_by_category} maxRows={5} />
        <BarChart title="By severity" data={o.counts_by_severity} colorBySeverity />
        <BarChart title="By source" data={o.counts_by_source} />
        <BarChart title="By status" data={o.counts_by_status} />
        <BarChart title="Top platforms" data={platforms} maxRows={5} />
      </div>
    </WidgetShell>
  );
}
