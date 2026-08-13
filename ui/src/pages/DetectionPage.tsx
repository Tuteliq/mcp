import React from 'react';
import { colors } from '../theme';
import { WidgetShell, AnalysisProvenance, DATA_HANDLING_NOTE } from '../components/WidgetShell';
import { StatusBanner } from '../components/StatusBanner';
import { RiskGauge } from '../components/RiskGauge';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { CategoryChips } from '../components/CategoryChips';
import { EvidenceCard } from '../components/EvidenceCard';
import { ActionCard } from '../components/ActionCard';
import { AgeCalibration } from '../components/AgeCalibration';
import { SupportCard } from '../components/SupportCard';
import { UpsellBanner } from '../components/UpsellBanner';
import { CardHeader, Callout, VerifiedBadge } from '../components/primitives';
import type { ToolResultPayload } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatToolName(name: string): string {
  return (name || '')
    .replace(/^detect_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const normalize = (level: unknown) => String(level || 'none').toLowerCase();

/**
 * Verdict copy per level.
 *
 * The subtitle states the consequence in plain language, because "high" alone
 * doesn't tell a first-time reader whether to act now or file it.
 */
const verdict: Record<string, { title: string; subtitle: string }> = {
  none: { title: 'All clear', subtitle: 'No threats detected in this content' },
  safe: { title: 'All clear', subtitle: 'No threats detected in this content' },
  low: { title: 'Low risk detected', subtitle: 'Minor concerns identified. No action required' },
  medium: { title: 'Medium risk detected', subtitle: 'Moderate concerns require attention' },
  high: { title: 'High risk detected', subtitle: 'Significant threats identified. Review promptly' },
  critical: { title: 'Critical threat detected', subtitle: 'Immediate action recommended' },
};

function badgeLabel(level: string, detected: boolean): string {
  const l = normalize(level);
  if (!detected || l === 'none' || l === 'safe') return 'Safe';
  return l;
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface DetectionPageProps {
  data: ToolResultPayload;
  viewUUID?: string;
}

export function DetectionPage({ data }: DetectionPageProps) {
  const { toolName, result } = data;
  const title = formatToolName(toolName);

  if (result.error && (result.upgrade || result.tier_restricted)) {
    return (
      <WidgetShell tool={toolName}>
        <CardHeader title={title} subtitle="Analysis unavailable" />
        <UpsellBanner message={result.message || result.error} />
      </WidgetShell>
    );
  }

  // The detection tools don't share one response shape — each grew its own
  // field names. Normalise here so everything below reads from one model.
  const severityIsNumeric = typeof result.severity === 'number';
  const riskScore = result.risk_score ?? (severityIsNumeric ? result.severity : 0);
  const confidence = result.confidence ?? 0;
  const level = normalize(
    result.level || (!severityIsNumeric ? result.severity : null) || result.grooming_risk || result.risk_level || 'none',
  );
  const detected =
    result.detected ??
    result.is_bullying ??
    result.unsafe ??
    (result.grooming_risk && result.grooming_risk !== 'none') ??
    false;

  const shownLevel = detected ? level : 'safe';
  const copy = verdict[shownLevel] || verdict.none;

  /**
   * The model's actual explanation, in order of preference.
   *
   * `analyze` fans out to the bullying and unsafe detectors and only those
   * sub-calls produce free text; its top-level `summary` is a terse derived
   * line ("Unsafe content: sexual_exploitation, illegal_activity"). Reading
   * `rationale || summary` therefore showed the restatement of the chips
   * instead of the reasoning behind them. Prefer real prose wherever it lives,
   * and keep `summary` only as the last resort — which is also what
   * `verdict_only` responses legitimately return, since they skip rationale
   * generation entirely.
   */
  const rationales: Array<{ source?: string; text: string }> = (() => {
    const own = typeof result.rationale === 'string' ? result.rationale.trim() : '';
    if (own) return [{ text: own }];

    const nested = [
      { source: 'Unsafe', text: result.unsafe?.rationale },
      { source: 'Bullying', text: result.bullying?.rationale },
      { source: 'Grooming', text: result.grooming?.rationale },
    ].filter((r): r is { source: string; text: string } => typeof r.text === 'string' && r.text.trim().length > 0);

    // De-duplicate: sub-detectors sometimes return the same sentence.
    const seen = new Set<string>();
    const unique = nested.filter((r) => !seen.has(r.text) && seen.add(r.text));
    if (unique.length > 0) {
      // A single explanation needs no attribution; two unlabelled paragraphs
      // would leave the reader guessing which detector said what.
      return unique.length === 1 ? [{ text: unique[0].text }] : unique;
    }

    const summary = typeof result.summary === 'string' ? result.summary.trim() : '';
    return summary ? [{ text: summary }] : [];
  })();
  const action = result.recommended_action || '';
  /**
   * Categories, gathered from wherever this tool happens to put them.
   *
   * `analyze` has no top-level `categories` at all — it nests a `bullying` and
   * an `unsafe` result, each carrying its own list under a different name. That
   * is why the Analyze card showed no chips and the finding only ever surfaced
   * buried in the summary prose. Collect from every shape and de-duplicate,
   * since a category can legitimately appear in more than one sub-result.
   */
  const categories: string[] = Array.from(
    new Set(
      [
        result.categories,
        result.bullying_type,
        result.flags,
        result.unsafe?.categories,
        result.bullying?.bullying_type,
        result.grooming?.flags,
      ]
        .filter(Array.isArray)
        .flat()
        .filter((c: unknown): c is string => typeof c === 'string' && c.length > 0),
    ),
  );
  const evidence = result.evidence || [];
  const support = result.support;

  const showSupport =
    support && (support.helplines?.length > 0 || support.response_guide || support.emergency_number);

  return (
    <WidgetShell
      tool={toolName}
      footerNote={
        result.analysis_id || result.model_version ? (
          <AnalysisProvenance model={result.model_version} analysisId={result.analysis_id} />
        ) : (
          DATA_HANDLING_NOTE
        )
      }
    >
      <CardHeader
        title={title}
        icon={null}
        divider={false}
        right={<VerifiedBadge>Verified detection</VerifiedBadge>}
      />

      <StatusBanner level={shownLevel} title={copy.title} subtitle={copy.subtitle} style={{ marginBottom: 26 }} />

      {/* Score row: the "how bad" and the "how sure" side by side. Keeping them
          adjacent is what stops a confident-but-low result being misread. */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 26, flexWrap: 'wrap' }}>
        <RiskGauge score={riskScore} level={shownLevel} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <ConfidenceBar value={confidence} label="Detection confidence" />
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <SeverityBadge level={shownLevel} label={badgeLabel(level, detected)} />
            <AgeCalibration calibration={result.age_calibration} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Always shown: "none" is a finding, and an absent section is
            indistinguishable from a section that failed to render. */}
        <CategoryChips categories={categories} tone={shownLevel} showEmpty divider />

        {rationales.length > 0 && (
          <Callout title="Analysis summary">
            {rationales.map((r, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0' }}>
                {r.source && (
                  <strong style={{ color: colors.text.primary }}>{r.source}: </strong>
                )}
                {r.text}
              </p>
            ))}
          </Callout>
        )}

        {evidence.length > 0 && <EvidenceCard evidence={evidence} />}

        {action && action.toLowerCase() !== 'none' && (
          <ActionCard action={action} detail={result.action_detail} />
        )}

        {showSupport && <SupportCard support={support} />}
      </div>
    </WidgetShell>
  );
}
