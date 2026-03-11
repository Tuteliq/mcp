import React from 'react';
import { AppWrapper } from '../App';
import { RiskGauge } from '../components/RiskGauge';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { CategoryChips } from '../components/CategoryChips';
import { EvidenceCard } from '../components/EvidenceCard';
import { ActionCard } from '../components/ActionCard';
import { AgeCalibration } from '../components/AgeCalibration';
import { FooterLinks } from '../components/FooterLinks';
import { SupportCard } from '../components/SupportCard';
import { UpsellBanner } from '../components/UpsellBanner';
import { colors } from '../theme';
import type { ToolResultPayload } from '../types';

function formatToolName(name: string): string {
  return name
    .replace(/^detect_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

interface DetectionPageProps {
  data: ToolResultPayload;
}

export function DetectionPage({ data }: DetectionPageProps) {
  const { toolName, result } = data;
  const title = formatToolName(toolName);

  // Handle upsell / tier restriction errors
  if (result.error && (result.upgrade || result.tier_restricted)) {
    return (
      <AppWrapper title={title}>
        <UpsellBanner message={result.message || result.error} />
        <FooterLinks />
      </AppWrapper>
    );
  }

  // Handle different result shapes — severity can be a string ("high") or number (0-1)
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

  return (
    <AppWrapper title={title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <RiskGauge score={riskScore} level={level} />
        <div>
          <SeverityBadge level={level} label={detected ? `${level} Risk` : 'Safe'} />
          <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 4 }}>
            {detected ? 'Threat detected' : 'No threat detected'}
          </div>
          {ageCalibration && <AgeCalibration calibration={ageCalibration} />}
        </div>
      </div>

      <ConfidenceBar value={confidence} />

      {categories.length > 0 && <CategoryChips categories={categories} />}

      {rationale && (
        <div style={{ margin: '12px 0', fontSize: 13, color: colors.text.secondary, lineHeight: 1.6 }}>
          {rationale}
        </div>
      )}

      {evidence.length > 0 && <EvidenceCard evidence={evidence} />}

      {action && <ActionCard action={action} />}

      {support && (support.helplines?.length > 0 || support.response_guide || support.emergency_number) && (
        <SupportCard support={support} />
      )}

      <FooterLinks />
    </AppWrapper>
  );
}
