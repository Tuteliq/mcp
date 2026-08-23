import type {
  DetectionResult,
  AnalyseMultiResult,
  VideoAnalysisResult,
  DocumentAnalysisResult,
  DocumentFlaggedPage,
  DocumentPageResult,
  SyntheticTextResult,
  SyntheticImageResult,
  SyntheticAudioResult,
  SyntheticVideoResult,
  SyntheticProfile,
  VerificationSession,
  VerificationSessionResult,
} from '@tuteliq/sdk';
import { harmSignals, relevantHelplines } from './support-relevance.js';

export const severityEmoji: Record<string, string> = {
  low: '\u{1F7E1}',
  medium: '\u{1F7E0}',
  high: '\u{1F534}',
  critical: '\u26D4',
};

export const riskEmoji: Record<string, string> = {
  safe: '\u2705',
  none: '\u2705',
  low: '\u{1F7E1}',
  medium: '\u{1F7E0}',
  high: '\u{1F534}',
  critical: '\u26D4',
};

export const trendEmoji: Record<string, string> = {
  improving: '\u{1F4C8}',
  stable: '\u27A1\uFE0F',
  worsening: '\u{1F4C9}',
};

/**
 * The Rationale section, or an honest substitute.
 *
 * `verdict_only: true` suppresses rationale generation server-side \u2014 that is the
 * point of the mode. Interpolating the field regardless printed the literal
 * string "undefined" under a "### Rationale" heading, which reads as a broken
 * detector rather than a deliberately fast one. Fall back to `action_detail`
 * (the endpoint's other free-text field, which verdict_only does keep) and say
 * so when there is nothing at all.
 */
export function formatRationale(result: {
  rationale?: string;
  action_detail?: string;
  summary?: string;
}): string {
  const rationale = typeof result.rationale === 'string' ? result.rationale.trim() : '';
  if (rationale) return `### Rationale\n${rationale}`;

  const summary = typeof result.summary === 'string' ? result.summary.trim() : '';
  if (summary) return `### Summary\n${summary}`;

  const detail = typeof result.action_detail === 'string' ? result.action_detail.trim() : '';
  if (detail) return `### Assessment\n${detail}`;

  return '### Rationale\n_Not generated \u2014 this call ran in `verdict_only` fast mode. Re-run without `verdict_only` for the written analysis._';
}

/**
 * The conversation-level fields the continuation token carries forward.
 *
 * Typed locally rather than imported: `@tuteliq/sdk` gained these on
 * `BullyingResult` / `GroomingResult` / `DetectionResult` in 2.25.0, and the
 * renderer must keep working against an older installed SDK. Every field is
 * optional, so any of those results is assignable to it.
 */
export interface TrajectoryFields {
  /** Risk for THIS message only. */
  risk_score?: number;
  /** Risk for the conversation this message arrived in. */
  trajectory_risk?: number;
  trajectory?: 'rising' | 'stable' | 'declining' | 'none' | string;
  /** Per-turn severity, oldest first. */
  severity_series?: number[];
}

/** How far `trajectory_risk` must exceed `risk_score` before we say so loudly. */
const TRAJECTORY_GAP = 0.15;

/** Longest severity series rendered in full before the head is elided. */
const MAX_SERIES_COLUMNS = 12;

const SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/**
 * A sparkline block for a 0-1 severity, on an ABSOLUTE scale.
 *
 * Not normalised to the series maximum: normalising would draw a full-height
 * bar for the worst turn of an entirely benign conversation, which is the same
 * class of mistake as reading `risk_score` on its own.
 */
function sparkFor(v: number): string {
  const clamped = Math.min(1, Math.max(0, v));
  // Eight equal buckets by floor, not eight levels by rounding: rounding put
  // 65% and 75% on the same bar, which flattened exactly the escalation the
  // series exists to show.
  return SPARK[Math.min(SPARK.length - 1, Math.floor(clamped * SPARK.length))];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function trajectoryEmoji(risk: number): string {
  if (risk >= 0.85) return '⛔';
  if (risk >= 0.7) return '\u{1F534}';
  if (risk >= 0.4) return '\u{1F7E0}';
  if (risk >= 0.2) return '\u{1F7E1}';
  return '✅';
}

const TRAJECTORY_LABEL: Record<string, string> = {
  rising: 'rising ↗',
  stable: 'stable →',
  declining: 'declining ↘',
  none: 'no clear direction',
};

/**
 * Right-aligned fixed-width columns so the severity row and the sparkline row
 * line up under the same turn numbers inside a fenced block.
 */
function seriesTable(series: number[]): string {
  const offset = Math.max(0, series.length - MAX_SERIES_COLUMNS);
  const shown = series.slice(offset);
  const cell = (s: string) => s.padStart(5);

  // Percent signs live in the row label, not in the cells: with them in the
  // cells the sparkline aligned under the `%` rather than under the digits.
  const turns = shown.map((_, i) => cell(String(offset + i + 1))).join('');
  const sevs = shown.map(v => cell(String(Math.round(v * 100)))).join('');
  const spark = shown.map(v => cell(sparkFor(v))).join('');

  const head = offset > 0
    ? `_Last ${shown.length} of ${series.length} turns._\n`
    : '';

  return `${head}\`\`\`\nturn${turns}\nsev%${sevs}\n    ${spark}\n\`\`\``;
}

/**
 * The conversation-level section.
 *
 * The reviewer's finding was not that the detector scored a message wrongly —
 * it scored every message correctly. It was that "see you tomorrow :)", sent
 * straight after two flagged turns, was reported as a positive social
 * interaction, because `risk_score` has no memory. `trajectory_risk` is the
 * answer, and it is worth nothing if a moderator reads "10%" at the top of the
 * output and moves on.
 *
 * So: the conversation number gets its own headed section, both numbers are
 * stated side by side, and the per-turn series is drawn underneath so the 74%
 * is explainable from the evidence rather than asserted. Returns '' when the
 * fields are absent, which is every first turn of a fresh conversation.
 */
export function formatTrajectory(result: TrajectoryFields): string {
  const risk = result?.trajectory_risk;
  if (typeof risk !== 'number' || Number.isNaN(risk)) return '';

  const current = typeof result.risk_score === 'number' ? result.risk_score : undefined;
  const direction = TRAJECTORY_LABEL[result.trajectory ?? ''] ?? result.trajectory;

  const lines = [
    '',
    '---',
    '',
    `### ${trajectoryEmoji(risk)} Conversation risk: ${pct(risk)}${direction ? ` — ${direction}` : ''}`,
    '',
  ];

  if (current !== undefined) {
    lines.push(`**This message: ${pct(current)}. This conversation: ${pct(risk)}.**`, '');
  }

  if (current !== undefined && risk - current >= TRAJECTORY_GAP) {
    lines.push(
      `⚠️ Do not read the ${pct(current)} and stop. \`risk_score\` scores only the message you just sent; `
      + '`trajectory_risk` scores the conversation it arrived in — anchored on the worst turn so far and decaying '
      + `only slowly, so a friendly message straight after an escalation does not reset it. Act on ${pct(risk)}.`,
      '',
    );
  } else {
    lines.push(
      '`risk_score` scores only this message; `trajectory_risk` scores the whole conversation, anchored on the '
      + 'worst turn seen so far. Act on whichever is higher.',
      '',
    );
  }

  const series = result.severity_series;
  if (Array.isArray(series) && series.length > 0) {
    lines.push('**Severity by turn, oldest first:**', '', seriesTable(series), '');

    const peak = Math.max(...series);
    const peakTurn = series.indexOf(peak) + 1;
    lines.push(`Peak ${pct(peak)} at turn ${peakTurn}; this is turn ${series.length}.`);
  }

  return lines.join('\n').replace(/\n+$/, '');
}

/**
 * Suffix for the `Risk Score` line, so the per-message number is not read as
 * the whole picture when a conversation-level one exists directly below it.
 */
export function riskScoreScope(result: TrajectoryFields): string {
  return typeof result?.trajectory_risk === 'number' ? ' _(this message only)_' : '';
}

/**
 * The continuation-token footer.
 *
 * The token is the whole of Tuteliq's multi-turn story: it carries derived
 * trajectory state forward with no content stored server-side. It was already
 * being returned in `structuredContent`, but an MCP host renders the text block
 * \u2014 so through a connector the token was invisible and conversation-level
 * detection could not be used at all. It goes last, verbatim and in a fenced
 * block, with the instruction next to it rather than in the tool description
 * where it is read once and forgotten.
 */
export function formatContinuation(
  result: { continuation_token?: string; continuation_expires_at?: string; state_source?: string },
  toolName: string,
): string {
  if (!result?.continuation_token) return '';

  // Two leading blank lines, not one: `---` directly under a line of text is a
  // setext H2 in Markdown, so a single newline turned whatever preceded this
  // footer (usually the `recommended_action`) into a heading.
  const lines = [
    '',
    '',
    '---',
    '',
    '### Conversation state',
  ];

  if (result.state_source) {
    const source: Record<string, string> = {
      token: 'continued from the token you passed in',
      fresh: 'first turn of a new conversation',
      reset: 'restarted \u2014 the previous token was discarded',
    };
    lines.push(`**This turn:** ${source[result.state_source] ?? result.state_source}`);
  }

  lines.push(
    '',
    `Pass this \`continuation_token\` to the next \`${toolName}\` call to keep trajectory awareness across turns. No message content is stored server-side; the token *is* the state.`,
    '',
    '```',
    result.continuation_token,
    '```',
  );

  if (result.continuation_expires_at) {
    lines.push('', `_Expires ${result.continuation_expires_at}. After that, start a fresh conversation._`);
  }

  return lines.join('\n');
}

export function formatDetectionResult(result: DetectionResult, toolName?: string): string {
  const detected = result.detected;
  const levelEmoji = riskEmoji[result.level] || '\u26AA';
  const label = result.endpoint
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const header = detected
    ? `## ${levelEmoji} ${label} Detected`
    : `## \u2705 No ${label} Detected`;

  const categories = result.categories.length > 0
    ? `**Categories:** ${result.categories.map(c => c.tag).join(', ')}`
    : '';

  const evidence = result.evidence && result.evidence.length > 0
    ? `### Evidence\n${result.evidence.map(e => `- _"${e.text}"_ \u2014 **${e.tactic}** (weight: ${e.weight.toFixed(2)})`).join('\n')}`
    : '';

  const calibration = result.age_calibration?.applied
    ? `**Age Calibration:** ${result.age_calibration.age_group} (${result.age_calibration.multiplier}x)`
    : '';

  const messageAnalysis = result.message_analysis && result.message_analysis.length > 0
    ? `### Message Analysis\n${result.message_analysis.map(m => `- **Message ${m.message_index}** (risk: ${(m.risk_score * 100).toFixed(0)}%) — ${m.summary}${m.flags.length > 0 ? ` [${m.flags.join(', ')}]` : ''}`).join('\n')}`
    : '';

  return `${header}

**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%${riskScoreScope(result)}
**Level:** ${result.level}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
${categories}
${formatTrajectory(result)}

${formatRationale(result)}

### Recommended Action
\`${result.recommended_action}\`${result.action_detail ? `\n${result.action_detail}` : ''}

${evidence}
${messageAnalysis}
${calibration}`.replace(/\n{3,}/g, '\n\n').trim()
    + (result.support ? formatSupportText(result.support, harmSignals(result, toolName)) : '')
    + formatContinuation(result, toolName ?? `detect_${result.endpoint.replace(/-/g, '_')}`);
}

export function formatMultiResult(result: AnalyseMultiResult): string {
  const s = result.summary;
  const overallEmoji = riskEmoji[s.overall_risk_level] || '\u26AA';

  const summarySection = `## Multi-Endpoint Analysis

**Overall Risk:** ${overallEmoji} ${s.overall_risk_level}
**Endpoints Analyzed:** ${s.total_endpoints}
**Threats Detected:** ${s.detected_count}
**Highest Risk:** ${s.highest_risk.endpoint} (${(s.highest_risk.risk_score * 100).toFixed(0)}%)
${result.cross_endpoint_modifier ? `**Cross-Endpoint Modifier:** ${result.cross_endpoint_modifier.toFixed(2)}x` : ''}`;

  const perEndpoint = result.results
    .map(r => {
      const emoji = r.detected ? (riskEmoji[r.level] || '\u26AA') : '\u2705';
      return `### ${emoji} ${r.endpoint}
**Detected:** ${r.detected ? 'Yes' : 'No'} | **Risk:** ${(r.risk_score * 100).toFixed(0)}% | **Level:** ${r.level}
${r.categories.length > 0 ? `**Categories:** ${r.categories.map(c => c.tag).join(', ')}` : ''}
${r.rationale ?? r.action_detail ?? '_No written analysis returned for this endpoint._'}`;
    })
    .join('\n\n');

  return `${summarySection}

---

${perEndpoint}`;
}

export interface SupportBlock {
  country?: string;
  country_name?: string;
  emergency_number?: string;
  helplines: Array<{ name: string; number: string; available?: string; category?: string }>;
  response_guide?: { immediateActions: string[]; resources: Array<{ name: string; url?: string; description?: string }> };
}

/**
 * Render the crisis-support block.
 *
 * `signals` are the detected harm signals (see support-relevance.ts). Pass them
 * so topical helplines that have nothing to do with the harm are not shown next
 * to ones that do; omit them and every line the API returned is rendered.
 */
export function formatSupportText(support: SupportBlock, signals: string[] = []): string {
  const lines: string[] = [
    // See formatContinuation: `---` on the line straight after text is a setext
    // heading, not a rule.
    '',
    '',
    '---',
    '',
    '\u{1F499} **You Are Not Alone**',
    'If you or someone you know needs support, help is available.',
    '',
  ];

  if (support.emergency_number) {
    lines.push(`\u{1F6A8} **Emergency:** ${support.emergency_number}${support.country_name ? ` (${support.country_name})` : ''}`);
    lines.push('');
  }

  const helplines = relevantHelplines(support.helplines ?? [], signals);

  if (helplines.length > 0) {
    // Name the jurisdiction. The helplines are localised but the resource links
    // below them are a global list that still leans US, so an unlabelled block
    // reads as if all of it applies where the caller is.
    const where = support.country_name || support.country;
    lines.push(where ? `**Crisis Helplines (${where}):**` : '**Crisis Helplines:**');
    for (const h of helplines) {
      lines.push(`- \u{1F4DE} **${h.name}:** ${h.number}${h.available ? ` (${h.available})` : ''}`);
    }
    lines.push('');
  }

  if (support.response_guide?.immediateActions?.length) {
    lines.push('**What you can do now:**');
    for (const action of support.response_guide.immediateActions) {
      lines.push(`- ${action}`);
    }
    lines.push('');
  }

  if (support.response_guide?.resources?.length) {
    // Not localised by the API — a single global list per category. Label it so
    // a US-only link is not mistaken for local guidance.
    lines.push('**Resources (general, not country-specific):**');
    for (const r of support.response_guide.resources) {
      lines.push(r.url ? `- [${r.name}](${r.url})` : `- ${r.name}`);
    }
  }

  return lines.join('\n');
}

export function formatVideoResult(result: VideoAnalysisResult): string {
  const emoji = severityEmoji[result.overall_severity] || '\u2705';

  // The API returns flagged_timestamps (points above the reporting threshold)
  // and frame_results (per-frame detail). An earlier version of this formatter
  // read `safety_findings`, which the API has never returned — so this section
  // was always empty.
  const flagged = result.flagged_timestamps ?? [];
  const findingsSection = flagged.length > 0
    ? flagged
        .map(f => {
          const fEmoji = severityEmoji[f.severity] || '\u26AA';
          return `- \`${f.timestamp_s.toFixed(1)}s\` ${fEmoji} ${f.reason} (${f.severity})`;
        })
        .join('\n')
    : '_No safety findings._';

  return `## \u{1F3AC} Video Analysis

**Overall Severity:** ${emoji} ${result.overall_severity}
**Overall Risk Score:** ${(result.overall_risk_score * 100).toFixed(0)}%
**Frames Analyzed:** ${result.frames_analyzed}
**Recommended Action:** \`${result.recommended_action}\`${result.action_detail ? `\n${result.action_detail}` : ''}

### Safety Findings
${findingsSection}`;
}

export function formatDocumentResult(result: DocumentAnalysisResult): string {
  const emoji = riskEmoji[result.overall_severity] || '\u2705';

  const extractionLines = [
    `**Text Layer Pages:** ${result.extraction_summary.text_layer_pages}`,
    result.extraction_summary.ocr_pages > 0 ? `**OCR Pages:** ${result.extraction_summary.ocr_pages}` : '',
    result.extraction_summary.failed_pages > 0 ? `**Skipped Pages:** ${result.extraction_summary.failed_pages}` : '',
  ].filter(Boolean).join('\n');

  const flaggedSection = result.flagged_pages.length > 0
    ? result.flagged_pages
        .map((f: DocumentFlaggedPage) => {
          const fEmoji = riskEmoji[f.severity] || '\u26AA';
          return `- **Page ${f.page_number}** ${fEmoji} ${f.severity} (${(f.risk_score * 100).toFixed(0)}%) \u2014 ${f.detected_endpoints.join(', ')}`;
        })
        .join('\n')
    : '_No flagged pages._';

  const pageResultsSection = result.page_results
    .slice(0, 10)
    .map((p: DocumentPageResult) => {
      const pEmoji = riskEmoji[p.page_severity] || '\u2705';
      const detections = p.results.filter((r) => r.detected);
      const detectionText = detections.length > 0
        ? detections.map((r) => `${r.endpoint}: ${r.rationale ?? r.level}`).join('; ')
        : 'Clear';
      return `- **Page ${p.page_number}** ${pEmoji} ${p.page_severity} \u2014 ${detectionText}`;
    })
    .join('\n');

  return `## \u{1F4C4} Document Analysis

**Overall Severity:** ${emoji} ${result.overall_severity}
**Overall Risk Score:** ${(result.overall_risk_score * 100).toFixed(0)}%
**Document Hash:** \`${result.document_hash}\`
**Total Pages:** ${result.total_pages} | **Analyzed:** ${result.pages_analyzed}
**Credits Used:** ${result.credits_used}
${result.language ? `**Language:** ${result.language}` : ''}

### Extraction Summary
${extractionLines}

### Flagged Pages
${flaggedSection}

### Page Results
${pageResultsSection}${result.page_results.length > 10 ? `\n_...and ${result.page_results.length - 10} more pages_` : ''}

${result.detected_endpoints.length > 0 ? `### Detected Threats\n${result.detected_endpoints.map((e: string) => `- \u26A0\uFE0F ${e}`).join('\n')}` : ''}` + (result.support ? formatSupportText(result.support as any, harmSignals(result)) : '');
}

// =============================================================================
// Synthetic Content Formatters
// =============================================================================

const classificationEmoji: Record<string, string> = {
  confirmed_synthetic: '\u26D4',
  suspected_synthetic: '\u{1F7E0}',
  unknown: '\u26AA',
  confirmed_authentic: '\u2705',
};

const classificationLabel: Record<string, string> = {
  confirmed_synthetic: 'Confirmed Synthetic',
  suspected_synthetic: 'Suspected Synthetic',
  unknown: 'Unknown',
  confirmed_authentic: 'Confirmed Authentic',
};

export function formatSyntheticTextResult(result: SyntheticTextResult): string {
  const emoji = classificationEmoji[result.classification] || '\u26AA';
  const label = classificationLabel[result.classification] || result.classification;

  const categories = result.categories.length > 0
    ? `**Categories:** ${result.categories.map(c => c.tag).join(', ')}`
    : '';

  return `## \u{1F4DD} Synthetic Text Detection

**Classification:** ${emoji} ${label}
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Level:** ${result.level}
${categories}

${formatRationale(result)}

### Recommended Action
\`${result.recommended_action}\`${(result as any).action_detail ? `\n${(result as any).action_detail}` : ''}
${result.credits_used != null ? `\n**Credits Used:** ${result.credits_used}` : ''}`.trim();
}

export function formatSyntheticImageResult(result: SyntheticImageResult): string {
  const emoji = classificationEmoji[result.classification] || '\u26AA';
  const label = classificationLabel[result.classification] || result.classification;

  const categories = result.categories.length > 0
    ? `**Categories:** ${result.categories.map(c => c.tag).join(', ')}`
    : '';

  const visionSection = result.vision ? `### Vision AI Forensics
**Likely Synthetic:** ${result.vision.is_likely_synthetic ? 'Yes' : 'No'} (${(result.vision.synthetic_confidence * 100).toFixed(0)}%)
${result.vision.artifacts.length > 0 ? `**Artifacts:** ${result.vision.artifacts.join(', ')}` : ''}
${result.vision.face_analysis ? `**Face Analysis:** ${result.vision.face_analysis}` : ''}
**Assessment:** ${result.vision.overall_assessment}` : '';

  const metadataSection = result.metadata_analysis ? `### EXIF / Metadata
**Format:** ${result.metadata_analysis.format} (${result.metadata_analysis.dimensions.width}x${result.metadata_analysis.dimensions.height})
**EXIF Present:** ${result.metadata_analysis.has_exif ? 'Yes' : 'No'} | **Camera:** ${result.metadata_analysis.has_camera ? (result.metadata_analysis.camera_model || 'Yes') : 'No'} | **GPS:** ${result.metadata_analysis.has_gps ? 'Yes' : 'No'}
${result.metadata_analysis.ai_generator_detected ? `\u26A0\uFE0F **AI Generator Detected:** ${result.metadata_analysis.ai_generator || 'Yes'}` : ''}
${result.metadata_analysis.suspicious_absence ? '\u26A0\uFE0F **Suspicious:** High-res image with no camera metadata' : ''}` : '';

  const provenanceSection = result.provenance?.has_c2pa ? `### C2PA Content Credentials
**C2PA Manifest:** Found
${result.provenance.claim_generator ? `**Claim Generator:** ${result.provenance.claim_generator}` : ''}
**AI Generated:** ${result.provenance.is_ai_generated ? `Yes${result.provenance.ai_tool ? ` (${result.provenance.ai_tool})` : ''}` : 'No'}` : '';

  const signalsSection = result.forensic_signals ? `### Forensic Signals
**Total Signals:** ${result.forensic_signals.signal_count}
**Combined Boost:** +${(result.forensic_signals.combined_confidence_boost * 100).toFixed(0)}%
${result.forensic_signals.sources.map(s => `- **${s.name}:** ${s.signal_count} signals (+${(s.confidence_boost * 100).toFixed(0)}%)`).join('\n')}` : '';

  const hashSection = result.perceptual_hash ? `**Perceptual Hash:** \`${result.perceptual_hash}\`` : '';

  const matchSection = result.known_synthetic_match ? `\u26A0\uFE0F **Known Synthetic Match:** distance ${result.known_synthetic_match.distance} — category: ${result.known_synthetic_match.category}` : '';

  return `## \u{1F5BC}\uFE0F Synthetic Image Detection

**Classification:** ${emoji} ${label}
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Level:** ${result.level}
${categories}

${visionSection}

${metadataSection}

${provenanceSection}

${signalsSection}

${hashSection}
${matchSection}

${formatRationale(result)}

### Recommended Action
\`${result.recommended_action}\`${(result as any).action_detail ? `\n${(result as any).action_detail}` : ''}
${result.credits_used != null ? `\n**Credits Used:** ${result.credits_used}` : ''}`.replace(/\n{3,}/g, '\n\n').trim();
}

export function formatSyntheticAudioResult(result: SyntheticAudioResult): string {
  const emoji = classificationEmoji[result.classification] || '\u26AA';
  const label = classificationLabel[result.classification] || result.classification;

  const categories = result.categories.length > 0
    ? `**Categories:** ${result.categories.map(c => c.tag).join(', ')}`
    : '';

  const transcriptSection = result.transcription?.text
    ? `### Transcript\n${result.transcription.text}`
    : '';

  const statsSection = result.audio_stats ? `### Audio Statistics
${result.audio_stats.dynamic_range != null ? `**Dynamic Range:** ${result.audio_stats.dynamic_range.toFixed(1)} dB` : ''}
${result.audio_stats.silence_ratio != null ? `**Silence Ratio:** ${(result.audio_stats.silence_ratio * 100).toFixed(1)}%` : ''}
${result.audio_stats.flat_factor != null ? `**Flat Factor:** ${result.audio_stats.flat_factor.toFixed(2)} (higher = more uniform)` : ''}
${result.audio_stats.rms_mean != null ? `**RMS Mean:** ${result.audio_stats.rms_mean.toFixed(1)} dB` : ''}` : '';

  const spectralSection = result.spectral_signals && result.spectral_signals.length > 0
    ? `### Spectral Signals\n${result.spectral_signals.map(s => `- ${s}`).join('\n')}`
    : '';

  return `## \u{1F399}\uFE0F Synthetic Audio Detection

**Classification:** ${emoji} ${label}
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Level:** ${result.level}
${categories}

${transcriptSection}

${statsSection}

${spectralSection}

${formatRationale(result)}

### Recommended Action
\`${result.recommended_action}\`${(result as any).action_detail ? `\n${(result as any).action_detail}` : ''}
${result.credits_used != null ? `\n**Credits Used:** ${result.credits_used}` : ''}`.replace(/\n{3,}/g, '\n\n').trim();
}

export function formatSyntheticVideoResult(result: SyntheticVideoResult): string {
  const emoji = classificationEmoji[result.classification] || '\u26AA';
  const label = classificationLabel[result.classification] || result.classification;

  const categories = result.categories.length > 0
    ? `**Categories:** ${result.categories.map(c => c.tag).join(', ')}`
    : '';

  const videoMeta = result.video ? `**Duration:** ${result.video.duration_seconds.toFixed(1)}s | **Frames Analyzed:** ${result.video.frames_analyzed} | **Audio:** ${result.video.has_audio ? 'Yes' : 'No'}` : '';

  const temporalSection = result.temporal_consistency ? `### Temporal Face Consistency
**Identity Consistency:** ${(result.temporal_consistency.identity_consistency_score * 100).toFixed(0)}%
**Landmark Stability:** ${(result.temporal_consistency.landmark_stability_score * 100).toFixed(0)}%
**Overall Score:** ${(result.temporal_consistency.temporal_consistency_score * 100).toFixed(0)}%
**Faces Detected:** ${result.temporal_consistency.frames_with_faces}/${result.temporal_consistency.total_frames} frames
${result.temporal_consistency.anomalous_frame_pairs.length > 0 ? `**Anomalies:** ${result.temporal_consistency.anomalous_frame_pairs.map(p => `frames ${p.frame_a}\u2013${p.frame_b} (distance: ${p.distance.toFixed(2)})`).join(', ')}` : ''}
${result.temporal_consistency.signals.length > 0 ? `**Signals:** ${result.temporal_consistency.signals.join(', ')}` : ''}` : '';

  const lipSyncSection = result.lip_sync ? `### Lip-Sync Correlation
**Correlation:** ${result.lip_sync.correlation.toFixed(2)} ${result.lip_sync.correlation < 0.3 ? '\u26A0\uFE0F Poor' : result.lip_sync.correlation < 0.5 ? '\u{1F7E0} Weak' : '\u2705 Good'}
${result.lip_sync.has_silent_mouth_movement ? '\u26A0\uFE0F Silent mouth movement detected' : ''}
${result.lip_sync.has_voice_without_movement ? '\u26A0\uFE0F Voice without mouth movement detected' : ''}
${result.lip_sync.signals.length > 0 ? `**Signals:** ${result.lip_sync.signals.join(', ')}` : ''}` : '';

  const spectralSection = result.spectral_signals && result.spectral_signals.length > 0
    ? `### Spectral Audio Signals\n${result.spectral_signals.map(s => `- ${s}`).join('\n')}`
    : '';

  return `## \u{1F3AC} Synthetic Video Detection

**Classification:** ${emoji} ${label}
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Level:** ${result.level}
${videoMeta}
${categories}

${temporalSection}

${lipSyncSection}

${spectralSection}

${formatRationale(result)}

### Recommended Action
\`${result.recommended_action}\`${(result as any).action_detail ? `\n${(result as any).action_detail}` : ''}
${result.credits_used != null ? `\n**Credits Used:** ${result.credits_used}` : ''}`.replace(/\n{3,}/g, '\n\n').trim();
}

export function formatSyntheticProfile(result: SyntheticProfile): string {
  const scoreEmoji = result.account_synthetic_score >= 0.7 ? '\u{1F534}' : result.account_synthetic_score >= 0.4 ? '\u{1F7E0}' : '\u2705';
  const trend = trendEmoji[result.trend] || '';

  const categoryLines = Object.entries(result.category_distribution)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => `- **${cat}:** ${count}`)
    .join('\n');

  return `## \u{1F4CA} Synthetic Content Profile

**Customer:** ${result.customer_id}
**Account Synthetic Score:** ${scoreEmoji} ${(result.account_synthetic_score * 100).toFixed(0)}%
**Trend:** ${trend} ${result.trend}
**Window:** ${result.window_days} days (updated: ${result.last_updated})

### Breakdown
**Total Items:** ${result.total_items}
**Synthetic:** ${result.synthetic_count} | **Authentic:** ${result.authentic_count} | **Unknown:** ${result.unknown_count}
**Avg Confidence:** ${(result.avg_confidence * 100).toFixed(0)}%

### Category Distribution
${categoryLines || '_No categories recorded._'}`.trim();
}

// =============================================================================
// Verification Formatters
// =============================================================================

export function formatVerificationSession(result: VerificationSession, mode: string): string {
  return `## \u2705 Verification Session Created

**Session ID:** \`${result.session_id}\`
**Mode:** ${mode}
**Expires:** ${result.expires_at}

### Verification URL
${result.url}

Open this URL in a browser for the user to complete the verification flow (document capture, liveness check, selfie). Use \`get_verification_session\` to poll for the result.`;
}

export function formatVerificationSessionResult(result: VerificationSessionResult): string {
  const statusEmoji: Record<string, string> = {
    pending: '\u23F3',
    in_progress: '\u{1F504}',
    completed: '\u2705',
    failed: '\u274C',
    expired: '\u23F0',
    cancelled: '\u{1F6AB}',
  };

  const emoji = statusEmoji[result.status] || '\u26AA';
  const lines: string[] = [
    `## ${emoji} Verification Session`,
    '',
    `**Session ID:** \`${result.session_id}\``,
    `**Status:** ${result.status}`,
  ];

  if (result.mode) lines.push(`**Mode:** ${result.mode}`);
  if (result.created_at) lines.push(`**Created:** ${result.created_at}`);
  if (result.expires_at) lines.push(`**Expires:** ${result.expires_at}`);

  if (result.status !== 'completed' || !result.result) {
    if (result.status === 'pending' || result.status === 'in_progress') {
      lines.push('', '_Verification in progress. Poll again to check for completion._');
    }
    return lines.join('\n');
  }

  const r = result.result;
  lines.push('');
  lines.push(`### Result: ${r.status === 'verified' ? '\u2705 Verified' : r.status === 'needs_review' ? '\u{1F7E0} Needs Review' : '\u274C Failed'}`);
  if (r.age != null) lines.push(`**Age:** ${r.age}`);
  if (r.date_of_birth) lines.push(`**Date of Birth:** ${r.date_of_birth}`);
  if (r.is_minor != null) lines.push(`**Is Minor:** ${r.is_minor ? 'Yes' : 'No'}`);

  // Document details
  if (r.document) {
    lines.push('', '### Document');
    lines.push(`**OCR Confidence:** ${r.document.ocr_confidence}%`);
    if (r.document.name_extracted) lines.push(`**Name:** ${r.document.name_extracted}`);
    if (r.document.document_number) lines.push(`**Document Number:** ${r.document.document_number}${r.document.document_number_valid != null ? ` (${r.document.document_number_valid ? '\u2705 valid' : '\u274C invalid'})` : ''}`);
    if (r.document.country_code) lines.push(`**Country:** ${r.document.country_code}`);
    if (r.document.document_type) lines.push(`**Type:** ${r.document.document_type}`);
    if (r.document.expiration_date) lines.push(`**Expires:** ${r.document.expiration_date}${r.document.expired ? ' \u274C Expired' : ''}`);
    if (r.document.mrz_valid != null) lines.push(`**MRZ Valid:** ${r.document.mrz_valid ? '\u2705 Yes' : '\u274C No'}`);
    if (r.document.mrz_fields) {
      const m = r.document.mrz_fields;
      const mrzParts = [m.surname, m.given_names, m.nationality, m.date_of_birth].filter(Boolean);
      if (mrzParts.length > 0) lines.push(`**MRZ Data:** ${mrzParts.join(' | ')}`);
    }
  }

  // Barcode
  if (r.barcode) {
    lines.push('', '### Barcode');
    lines.push(`**Format:** ${r.barcode.format} | **AAMVA:** ${r.barcode.has_aamva ? 'Yes' : 'No'}`);
    if (r.barcode.fields) {
      const f = r.barcode.fields;
      if (f.first_name || f.last_name) lines.push(`**Name:** ${[f.first_name, f.last_name].filter(Boolean).join(' ')}`);
      if (f.state) lines.push(`**State:** ${f.state}`);
    }
  }

  // Document authenticity
  if (r.document_authenticity) {
    const da = r.document_authenticity;
    lines.push('', '### Document Authenticity');
    lines.push(`**Authentic:** ${da.is_authentic ? '\u2705 Yes' : da.is_authentic === false ? '\u274C No' : 'Unknown'} (${(da.confidence * 100).toFixed(0)}%)`);
    if (da.security_features_visible.length > 0) lines.push(`**Security Features:** ${da.security_features_visible.join(', ')}`);
    if (da.anomalies.length > 0) lines.push(`**Anomalies:** ${da.anomalies.join(', ')}`);
    if (da.recapture_detected) lines.push(`\u26A0\uFE0F **Recapture Detected:** ${da.recapture_type || 'Yes'}`);
  }

  // Face match
  if (r.face_match) {
    lines.push('', '### Face Match');
    lines.push(`**Matched:** ${r.face_match.matched ? '\u2705 Yes' : '\u274C No'} | **Confidence:** ${(r.face_match.confidence * 100).toFixed(0)}% | **Distance:** ${r.face_match.distance.toFixed(2)}`);
  }

  // Liveness
  if (r.liveness) {
    lines.push(`**Liveness:** ${r.liveness.valid ? '\u2705 Passed' : `\u274C Failed${r.liveness.reason ? ` (${r.liveness.reason})` : ''}`}`);
  }

  // Failure reasons
  if (r.failure_reasons.length > 0) {
    lines.push('', '### Failure Reasons');
    for (const reason of r.failure_reasons) {
      lines.push(`- ${reason}`);
    }
  }

  return lines.join('\n');
}
