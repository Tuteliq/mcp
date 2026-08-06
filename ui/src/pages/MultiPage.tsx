import React from 'react';
import { WidgetShell } from '../components/WidgetShell';
import { CardHeader, Panel, Eyebrow } from '../components/primitives';
import { StatusBanner } from '../components/StatusBanner';
import { RiskGauge } from '../components/RiskGauge';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { CategoryChips } from '../components/CategoryChips';
import { colors, fonts, radius, severityColor } from '../theme';
import type { ToolResultPayload, AnalyseMultiResult } from '../types';

const multiKeyframes = `
@keyframes multi-fadeSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

/** Verdict copy for the run as a whole. */
const verdictLabel: Record<string, string> = {
  none: 'All clear',
  safe: 'All clear',
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
  critical: 'Critical risk',
};

// ── Endpoint row ─────────────────────────────────────────────────────────────

/**
 * One detector's result.
 *
 * Cleared endpoints are deliberately flat and quiet — in a fan-out across a
 * dozen detectors, the two that fired need to be the only things that catch
 * the eye. The severity rule is the sole differentiator.
 */
function EndpointCard({ r, index }: { r: any; index: number }) {
  const isDetected = r.detected;
  const color = isDetected ? severityColor(r.level) : colors.severity.safe;

  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: radius.inset,
        background: isDetected ? colors.bg.secondary : 'transparent',
        border: `1px solid ${isDetected ? colors.border : colors.borderSubtle}`,
        borderLeft: `3px solid ${color}`,
        animation: `multi-fadeSlideUp 0.4s ease ${0.1 + index * 0.06}s both`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: isDetected ? 10 : 0,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: isDetected ? colors.text.primary : colors.text.muted,
            fontFamily: fonts.mono,
          }}
        >
          {r.endpoint}
        </span>
        <SeverityBadge
          level={isDetected ? r.level : 'safe'}
          label={isDetected ? `${Math.round(r.risk_score * 100)}%` : 'Clear'}
        />
      </div>

      {isDetected && (
        <>
          <ConfidenceBar value={r.confidence ?? r.risk_score} label="Confidence" />
          {r.categories?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <CategoryChips categories={r.categories} label={null} />
            </div>
          )}
          {r.rationale && (
            <div
              style={{
                fontSize: 13,
                color: colors.text.body,
                lineHeight: 1.55,
                marginTop: 12,
              }}
            >
              {r.rationale}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function MultiPage({ data }: { data: ToolResultPayload; viewUUID?: string }) {
  const result = data.result as AnalyseMultiResult;
  const { summary, results } = result;

  const level = (summary.overall_risk_level || 'none').toLowerCase();
  const isClean = summary.detected_count === 0;
  const shownLevel = isClean ? 'safe' : level;

  // Flagged detectors first — the reason the user ran a fan-out is to find
  // them, and scrolling past nine "Clear" rows to reach one is the wrong shape.
  const ordered = [...results].sort((a: any, b: any) => {
    if (a.detected !== b.detected) return a.detected ? -1 : 1;
    return (b.risk_score ?? 0) - (a.risk_score ?? 0);
  });

  return (
    <WidgetShell tool="analyse_multi">
      <style>{multiKeyframes}</style>

      <CardHeader
        title="Multi-Endpoint Analysis"
        subtitle={`${summary.total_endpoints} detectors run · ${summary.detected_count} flagged`}
      />

      <StatusBanner
        level={shownLevel}
        title={isClean ? 'All clear' : verdictLabel[level] || 'Risk detected'}
        subtitle={`${summary.detected_count} of ${summary.total_endpoints} detectors flagged this content`}
        style={{ marginBottom: 26 }}
      />

      <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 26, flexWrap: 'wrap' }}>
        <RiskGauge score={summary.highest_risk.risk_score} level={shownLevel} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <SeverityBadge level={shownLevel} label={isClean ? 'Safe' : level} />
            <span style={{ fontSize: 12.5, color: colors.text.muted }}>Highest risk across all detectors</span>
          </div>
          {result.cross_endpoint_modifier != null && (
            <div
              style={{
                fontSize: 12.5,
                color: colors.text.body,
                padding: '6px 12px',
                borderRadius: radius.tag,
                background: colors.bg.tertiary,
                display: 'inline-block',
              }}
              title="Risk uplift applied because multiple detectors corroborate each other"
            >
              Cross-endpoint modifier{' '}
              <strong className="tq-tabular" style={{ color: colors.text.primary, fontFamily: fonts.mono }}>
                ×{result.cross_endpoint_modifier.toFixed(2)}
              </strong>
            </div>
          )}
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 12 }}>Per-detector results</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ordered.map((r: any, i: number) => (
          <EndpointCard key={r.endpoint ?? i} r={r} index={i} />
        ))}
      </div>
    </WidgetShell>
  );
}
