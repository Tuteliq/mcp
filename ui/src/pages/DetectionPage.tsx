import React from 'react';
import { AppWrapper } from '../App';
import { RiskGauge } from '../components/RiskGauge';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { CategoryChips } from '../components/CategoryChips';
import { EvidenceCard } from '../components/EvidenceCard';
import { ActionCard } from '../components/ActionCard';
import { AgeCalibration } from '../components/AgeCalibration';
import { SupportCard } from '../components/SupportCard';
import { UpsellBanner } from '../components/UpsellBanner';
import { colors, fontFamily } from '../theme';
import type { ToolResultPayload } from '../types';

// ── Keyframes ────────────────────────────────────────────────────────────────

const detectionKeyframes = `
@keyframes det-fadeSlideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes det-fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes det-bannerPulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
  50% { box-shadow: 0 4px 24px rgba(0,0,0,0.25); }
}
.det-banner-pulse { animation: det-bannerPulse 3s ease-in-out infinite !important; }
`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatToolName(name: string): string {
  return name
    .replace(/^detect_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeLevel(level: string): string {
  return (level || 'none').toLowerCase();
}

// ── Status Banner ────────────────────────────────────────────────────────────

type StatusLevel = 'none' | 'safe' | 'low' | 'medium' | 'high' | 'critical';

const statusConfig: Record<string, { gradient: string; label: string; subtitle: string; iconColor: string }> = {
  none: {
    gradient: 'linear-gradient(135deg, #81B29A 0%, #2A9D8F 50%, #1E7A6D 100%)',
    label: 'All Clear',
    subtitle: 'No threats detected in this content',
    iconColor: '#D1FAE5',
  },
  safe: {
    gradient: 'linear-gradient(135deg, #81B29A 0%, #2A9D8F 50%, #1E7A6D 100%)',
    label: 'All Clear',
    subtitle: 'No threats detected in this content',
    iconColor: '#D1FAE5',
  },
  low: {
    gradient: 'linear-gradient(135deg, #5B9E94 0%, #2A9D8F 50%, #1E7A6D 100%)',
    label: 'Low Risk Detected',
    subtitle: 'Minor concerns identified',
    iconColor: '#CCFBF1',
  },
  medium: {
    gradient: 'linear-gradient(135deg, #E8A85C 0%, #D97706 50%, #B45309 100%)',
    label: 'Medium Risk Detected',
    subtitle: 'Moderate concerns require attention',
    iconColor: '#FEF3C7',
  },
  high: {
    gradient: 'linear-gradient(135deg, #D94F3D 0%, #C0392B 50%, #A93226 100%)',
    label: 'High Risk Detected',
    subtitle: 'Significant threats identified',
    iconColor: '#FEE2E2',
  },
  critical: {
    gradient: 'linear-gradient(135deg, #D94F3D 0%, #922B2B 50%, #7B1F1F 100%)',
    label: 'Critical Threat Detected',
    subtitle: 'Immediate action recommended',
    iconColor: '#FEE2E2',
  },
};

function ShieldCheckIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

const bannerIconMap: Record<string, React.FC<{ color: string }>> = {
  none: ShieldCheckIcon,
  safe: ShieldCheckIcon,
  low: InfoIcon,
  medium: WarningIcon,
  high: AlertIcon,
  critical: AlertIcon,
};

function StatusBanner({ level }: { level: string }) {
  const normalized = normalizeLevel(level) as StatusLevel;
  const cfg = statusConfig[normalized] || statusConfig.none;
  const Icon = bannerIconMap[normalized] || ShieldCheckIcon;
  const shouldPulse = normalized === 'high' || normalized === 'critical';

  return (
    <div
      className={shouldPulse ? 'det-banner-pulse' : undefined}
      style={{
        background: cfg.gradient,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        animation: 'det-fadeSlideDown 0.5s ease both',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glass shimmer overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
        <Icon color={cfg.iconColor} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            fontFamily,
            letterSpacing: '-0.01em',
          }}
        >
          {cfg.label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.75)',
            fontFamily,
            marginTop: 2,
          }}
        >
          {cfg.subtitle}
        </div>
      </div>
    </div>
  );
}

// ── Badge label helper ───────────────────────────────────────────────────────

function badgeLabel(level: string, detected: boolean): string {
  if (!detected) return 'Safe';
  const l = normalizeLevel(level);
  if (l === 'none' || l === 'safe') return 'Safe';
  // Capitalize first letter
  return l.charAt(0).toUpperCase() + l.slice(1);
}

// ── Rationale Card ───────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  marginBottom: 12,
};

function RationaleCard({ rationale, delay = 0.4 }: { rationale: string; delay?: number }) {
  return (
    <div
      style={{
        ...cardStyle,
        borderLeft: `3px solid ${colors.brand.primaryLight}`,
        animation: `det-fadeSlideUp 0.5s ease ${delay}s both`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: colors.text.primary,
          fontFamily,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Analysis Summary
      </div>
      <p style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 1.7, fontFamily, margin: 0 }}>
        {rationale}
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface DetectionPageProps {
  data: ToolResultPayload;
  viewUUID?: string;
}

export function DetectionPage({ data }: DetectionPageProps) {
  const { toolName, result } = data;
  const title = formatToolName(toolName);

  // Handle upsell / tier restriction errors
  if (result.error && (result.upgrade || result.tier_restricted)) {
    return (
      <AppWrapper title={title}>
        <UpsellBanner message={result.message || result.error} />
      </AppWrapper>
    );
  }

  // Handle different result shapes
  const severityIsNumeric = typeof result.severity === 'number';
  const riskScore = result.risk_score ?? (severityIsNumeric ? result.severity : 0);
  const confidence = result.confidence ?? 0;
  const level = result.level || (!severityIsNumeric ? result.severity : null) || result.grooming_risk || result.risk_level || 'none';
  const detected = result.detected ?? result.is_bullying ?? result.unsafe ?? (result.grooming_risk && result.grooming_risk !== 'none') ?? false;
  const rationale = result.rationale || result.summary || '';
  const action = result.recommended_action || '';
  const categories = result.categories || result.bullying_type || result.flags || [];
  const evidence = result.evidence || [];
  const ageCalibration = result.age_calibration;
  const support = result.support;

  const showAction = action && action.toLowerCase() !== 'none';

  return (
    <AppWrapper title={title}>
      <style>{detectionKeyframes}</style>

      {/* Status Banner */}
      <StatusBanner level={detected ? level : 'safe'} />

      {/* Score Panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 14,
          animation: 'det-fadeSlideUp 0.5s ease 0.15s both',
        }}
      >
        <RiskGauge score={riskScore} level={level} />
        <div style={{ flex: 1 }}>
          <ConfidenceBar value={confidence} label="Detection Confidence" />
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SeverityBadge level={detected ? level : 'safe'} label={badgeLabel(level, detected)} />
            {ageCalibration && <AgeCalibration calibration={ageCalibration} />}
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div style={{ animation: 'det-fadeSlideUp 0.5s ease 0.25s both' }}>
          <CategoryChips categories={categories} />
        </div>
      )}

      {/* Rationale */}
      {rationale && <RationaleCard rationale={rationale} delay={0.35} />}

      {/* Evidence */}
      {evidence.length > 0 && (
        <div style={{ animation: 'det-fadeSlideUp 0.5s ease 0.45s both' }}>
          <EvidenceCard evidence={evidence} />
        </div>
      )}

      {/* Action */}
      {showAction && (
        <div style={{ animation: 'det-fadeSlideUp 0.5s ease 0.55s both' }}>
          <ActionCard action={action} />
        </div>
      )}

      {/* Support */}
      {support && (support.helplines?.length > 0 || support.response_guide || support.emergency_number) && (
        <div style={{ animation: 'det-fadeSlideUp 0.5s ease 0.65s both' }}>
          <SupportCard support={support} />
        </div>
      )}
    </AppWrapper>
  );
}
