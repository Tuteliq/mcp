import React from 'react';
import { AppWrapper } from '../App';
import { RiskGauge } from '../components/RiskGauge';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { CategoryChips } from '../components/CategoryChips';
import { colors, fontFamily, severityColor } from '../theme';
import type { ToolResultPayload, AnalyseMultiResult } from '../types';

// ── Keyframes ────────────────────────────────────────────────────────────────

const multiKeyframes = `
@keyframes multi-fadeSlideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes multi-fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes multi-bannerPulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
  50% { box-shadow: 0 4px 24px rgba(0,0,0,0.25); }
}
.multi-banner-pulse { animation: multi-bannerPulse 3s ease-in-out infinite !important; }
`;

// ── Status Banner ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { gradient: string; label: string; iconColor: string }> = {
  none: {
    gradient: 'linear-gradient(135deg, #81B29A 0%, #2A9D8F 50%, #1E7A6D 100%)',
    label: 'All Clear',
    iconColor: '#D1FAE5',
  },
  safe: {
    gradient: 'linear-gradient(135deg, #81B29A 0%, #2A9D8F 50%, #1E7A6D 100%)',
    label: 'All Clear',
    iconColor: '#D1FAE5',
  },
  low: {
    gradient: 'linear-gradient(135deg, #5B9E94 0%, #2A9D8F 50%, #1E7A6D 100%)',
    label: 'Low Risk',
    iconColor: '#CCFBF1',
  },
  medium: {
    gradient: 'linear-gradient(135deg, #E8A85C 0%, #D97706 50%, #B45309 100%)',
    label: 'Medium Risk',
    iconColor: '#FEF3C7',
  },
  high: {
    gradient: 'linear-gradient(135deg, #D94F3D 0%, #C0392B 50%, #A93226 100%)',
    label: 'High Risk',
    iconColor: '#FEE2E2',
  },
  critical: {
    gradient: 'linear-gradient(135deg, #D94F3D 0%, #922B2B 50%, #7B1F1F 100%)',
    label: 'Critical',
    iconColor: '#FEE2E2',
  },
};

function MultiStatusBanner({ level, detectedCount, totalEndpoints }: { level: string; detectedCount: number; totalEndpoints: number }) {
  const normalized = (level || 'none').toLowerCase();
  const cfg = statusConfig[normalized] || statusConfig.none;
  const shouldPulse = normalized === 'high' || normalized === 'critical';
  const isClean = detectedCount === 0;

  return (
    <div
      className={shouldPulse ? 'multi-banner-pulse' : undefined}
      style={{
        background: cfg.gradient,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        animation: 'multi-fadeSlideDown 0.5s ease both',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glass shimmer */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.06) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={cfg.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isClean ? (
            <>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </>
          ) : (
            <>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </>
          )}
        </svg>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily, letterSpacing: '-0.01em' }}>
          {isClean ? 'All Clear' : cfg.label}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily, marginTop: 2 }}>
          {detectedCount} of {totalEndpoints} endpoints flagged
        </div>
      </div>
    </div>
  );
}

// ── Endpoint Card ────────────────────────────────────────────────────────────

function EndpointCard({ r, index }: { r: any; index: number }) {
  const color = severityColor(r.level);
  const isDetected = r.detected;

  return (
    <div
      style={{
        padding: '12px 14px',
        marginBottom: 8,
        borderRadius: 10,
        background: isDetected ? 'rgba(255,255,255,0.7)' : colors.bg.secondary,
        backdropFilter: isDetected ? 'blur(8px)' : undefined,
        borderLeft: `3px solid ${isDetected ? color : colors.severity.safe}`,
        boxShadow: isDetected ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
        animation: `multi-fadeSlideUp 0.4s ease ${0.15 + index * 0.08}s both`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', fontFamily }}>
          {r.endpoint.replace(/_/g, ' ')}
        </span>
        <SeverityBadge
          level={isDetected ? r.level : 'safe'}
          label={isDetected ? `${Math.round(r.risk_score * 100)}%` : 'Clear'}
        />
      </div>

      {/* Inline confidence bar for detected endpoints */}
      {isDetected && (
        <div style={{ marginBottom: 6 }}>
          <ConfidenceBar value={r.confidence ?? r.risk_score} label="Confidence" />
        </div>
      )}

      {r.categories.length > 0 && <CategoryChips categories={r.categories} />}

      {r.rationale && (
        <div style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 1.6, fontFamily, marginTop: 4 }}>
          {r.rationale}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function MultiPage({ data, viewUUID }: { data: ToolResultPayload; viewUUID?: string }) {
  const result = data.result as AnalyseMultiResult;
  const { summary, results } = result;

  return (
    <AppWrapper title="Multi-Endpoint Analysis">
      <style>{multiKeyframes}</style>

      {/* Status Banner */}
      <MultiStatusBanner
        level={summary.overall_risk_level}
        detectedCount={summary.detected_count}
        totalEndpoints={summary.total_endpoints}
      />

      {/* Score Panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          animation: 'multi-fadeSlideUp 0.5s ease 0.1s both',
        }}
      >
        <RiskGauge score={summary.highest_risk.risk_score} level={summary.overall_risk_level} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <SeverityBadge level={summary.overall_risk_level} />
            <span style={{ fontSize: 11, color: colors.text.muted, fontFamily }}>
              Overall Risk
            </span>
          </div>
          {result.cross_endpoint_modifier && (
            <div
              style={{
                fontSize: 11,
                color: colors.text.muted,
                fontFamily,
                padding: '3px 8px',
                borderRadius: 6,
                background: colors.bg.secondary,
                display: 'inline-block',
              }}
            >
              Cross-endpoint modifier: <strong style={{ color: colors.text.secondary }}>{result.cross_endpoint_modifier.toFixed(2)}x</strong>
            </div>
          )}
        </div>
      </div>

      {/* Endpoint Results */}
      {results.map((r, i) => (
        <EndpointCard key={i} r={r} index={i} />
      ))}
    </AppWrapper>
  );
}
