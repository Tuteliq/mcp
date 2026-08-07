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

      {/*
        Tile accents are fixed, not data-driven, because they are what the
        legend above is describing: ink = volume, red = needs attention,
        teal = recent window. An earlier revision coloured the recency tiles by
        whether they were running above trend, which left "Last 24 hours" ink on
        a quiet day and quietly made the legend a lie.
      */}
      <div className="tq-kpi-grid" style={{ marginBottom: 26 }}>
        <KpiCard label="Total incidents" value={o.total_incidents} emphasis="neutral" />
        <KpiCard
          label="Needs review"
          value={o.requires_review_count}
          hint={`${reviewPct}% · auto-escalated, pending sign-off`}
          emphasis="high"
        />
        <KpiCard label="Last 24 hours" value={o.last_24h_count} emphasis="high" />
        <KpiCard label="Last 7 days" value={o.last_7d_count} emphasis="safe" />
        <KpiCard
          label="Last 30 days"
          value={o.last_30d_count}
          hint="= reporting window"
          emphasis="safe"
        />
      </div>

      <div className="tq-split-grid">
        <BarChart title="By category" data={o.counts_by_category} maxRows={5} />
        <BarChart title="By severity" data={o.counts_by_severity} colorBySeverity />
        <BarChart title="By source" data={o.counts_by_source} />
        <BarChart title="By status" data={o.counts_by_status} />
        <BarChart title="Top platforms" data={platforms} maxRows={5} />
      </div>
    </WidgetShell>
  );
}
