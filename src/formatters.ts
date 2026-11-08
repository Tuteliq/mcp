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
  VerificationConfig,
  RecommendedAction,
  UsageQuota,
  NicknameResult,
  SafetyClassificationResult,
  ApiStatus,
  ComponentPing,
  FleetResult,
  FleetDevice,
  DsaTransparencyReport,
} from '@tuteliq/sdk';
import { isActionable } from '@tuteliq/sdk';
import { harmSignals, relevantHelplines } from './support-relevance.js';

export const severityEmoji: Record<string, string> = {
  low: '\u{1F7E1}',
  medium: '\u{1F7E0}',
  moderate: '\u{1F7E0}',
  high: '\u{1F534}',
  critical: '\u26D4',
};

export const riskEmoji: Record<string, string> = {
  safe: '\u2705',
  none: '\u2705',
  low: '\u{1F7E1}',
  medium: '\u{1F7E0}',
  moderate: '\u{1F7E0}',
  high: '\u{1F534}',
  critical: '\u26D4',
};

export const trendEmoji: Record<string, string> = {
  improving: '\u{1F4C8}',
  stable: '\u27A1\uFE0F',
  worsening: '\u{1F4C9}',
};

/**
 * `is_bullying` / `unsafe` clear for a reporter relaying someone else's real
 * abuse (the HOC-HELP-11 carve-out) while `recommended_action` correctly
 * stays live -- keying a header on the raw boolean alone produced a green
 * "No Bullying Detected" / "Content is Safe" heading sitting directly above
 * a `flag_for_review` verdict. A third, amber state covers that gap: the
 * speaker wasn't the one flagged, but the content still needs a look.
 */
function verdictState(flagged: boolean, recommendedAction: RecommendedAction): 'flagged' | 'review' | 'clear' {
  if (flagged) return 'flagged';
  return isActionable(recommendedAction) ? 'review' : 'clear';
}

export function verdictHeader(
  flagged: boolean,
  recommendedAction: RecommendedAction,
  detectedLabel: string,
  clearLabel: string,
): string {
  switch (verdictState(flagged, recommendedAction)) {
    case 'flagged': return `\u26A0\uFE0F ${detectedLabel}`;
    case 'review': return '\u{1F7E0} Flagged for Review';
    default: return `\u2705 ${clearLabel}`;
  }
}

/**
 * The analysis engine could not produce a verdict. The API then returns a
 * zeroed result (`grooming_risk: none`, `risk_score: 0`) with
 * `recommended_action: flag_for_review`, and the zeros are not a finding.
 * Printing them under a green "No Grooming Detected" turned an engine failure
 * into an all-clear; an independent evaluation saw exactly that (2026-09).
 *
 * `out_of_scope_adults` is the same hazard from the other side: the declared
 * participants put the conversation outside the grooming detector's scope, so
 * nothing was analysed, and the zeros are again not a finding.
 */
export function analysisIncomplete(result: object): boolean {
  const status = (result as { analysis_status?: unknown } | undefined)?.analysis_status;
  return status === 'engine_error' || status === 'out_of_scope_adults';
}

function outOfScope(result: object): boolean {
  return (result as { analysis_status?: unknown } | undefined)?.analysis_status === 'out_of_scope_adults';
}

export const INCOMPLETE_HEADER = '\u{1F7E0} Analysis Incomplete: Flagged for Review';
export const INCOMPLETE_SCORES = '**Risk Score:** not available, the analysis did not complete. This is not a result: treat the content as unresolved and route it to a moderator.';
export const OUT_OF_SCOPE_HEADER = '\u26AA Not Analysed: Outside This Detector\'s Scope';
export const OUT_OF_SCOPE_SCORES = '**Risk Score:** not available, the conversation was not analysed: the declared participants put it outside this detector\'s scope. This is not a finding that the conversation is safe; if a participant may be a minor, correct the declared participants and analyse it again.';

/** The header for a result that is not a verdict. */
export function incompleteHeader(result: object): string {
  return outOfScope(result) ? OUT_OF_SCOPE_HEADER : INCOMPLETE_HEADER;
}

/** The score lines for a result that is not a verdict. */
export function incompleteScores(result: object): string {
  return outOfScope(result) ? OUT_OF_SCOPE_SCORES : INCOMPLETE_SCORES;
}

/** The verdict header, with the not-a-verdict cases ahead of the others. */
export function resultHeader(
  result: object,
  flagged: boolean,
  recommendedAction: RecommendedAction,
  detectedLabel: string,
  clearLabel: string,
): string {
  return analysisIncomplete(result) ? incompleteHeader(result) : verdictHeader(flagged, recommendedAction, detectedLabel, clearLabel);
}

const SPEAKER_ROLE_MEANING: Record<string, string> = {
  enacting: 'the speaker is the one doing it',
  experiencing: 'the speaker is the person it is happening to',
  reporting_other: 'the speaker is reporting it happening to someone else',
  self_directed: 'the speaker is speaking about themselves',
  unclear: 'not clear from the text',
};

const SPEAKER_STANCE_MEANING: Record<string, string> = {
  deploying: 'the speaker is using these tactics in this exchange',
  describing_third_party: 'the speaker is describing someone else doing it (a disclosure or a report)',
  unclear: 'not clear from the text',
};

const CONVERSATION_TYPE_SOURCE: Record<string, string> = {
  request: 'declared on this request',
  participants: 'from the declared participants',
  account_default: 'the account default',
};

const reasonText = (v: unknown): string => (typeof v === 'string' && v.trim() ? ` ${v.trim()}` : '');

/**
 * Who is speaking, and what the API did with what the platform declared.
 *
 * `speaker_role` / `speaker_stance` are what tell a bystander's report or a
 * child's disclosure from the harm itself, and are what a platform routes a
 * report to a victim-protection queue on. They were in `structuredContent`
 * only, which a host does not show the assistant. `conversation_type_applied`
 * is the API confirming a declared setting changed routing.
 *
 * The routing outcomes below change who a result is about or where it should
 * go (a report rather than the harm, a child telling someone about a risk to
 * somebody else, a person telling their own story). Each is printed with the
 * API's own reason text, never a reason of ours. The other adjustment fields
 * the API reports stay in `structuredContent`.
 */
export function formatSpeakerAndRouting(result: Record<string, unknown>): string {
  const lines: string[] = [];
  const r = result ?? {};
  const role = r.speaker_role;
  if (typeof role === 'string') lines.push(`**Speaker role:** \`${role}\`${SPEAKER_ROLE_MEANING[role] ? ` (${SPEAKER_ROLE_MEANING[role]})` : ''}`);
  const stance = r.speaker_stance;
  if (typeof stance === 'string') lines.push(`**Speaker stance:** \`${stance}\`${SPEAKER_STANCE_MEANING[stance] ? ` (${SPEAKER_STANCE_MEANING[stance]})` : ''}`);
  if (typeof r.conversation_type_in_effect === 'string' && typeof r.conversation_type_source === 'string') {
    lines.push(`**Conversation type in effect:** \`${r.conversation_type_in_effect}\` (${CONVERSATION_TYPE_SOURCE[r.conversation_type_source] ?? r.conversation_type_source})`);
  }
  if (typeof r.conversation_type_applied === 'string') {
    lines.push(`**Conversation type applied:** \`${r.conversation_type_applied}\` (the declared setting changed the recommended action; the score is unchanged)`);
  }
  const applied = r.participants_applied as { conversation_type?: string; age_group?: string; child_age?: number } | undefined;
  if (applied && typeof applied === 'object') {
    const parts = [
      applied.conversation_type ? `conversation type \`${applied.conversation_type}\`` : '',
      applied.age_group ? `age group ${applied.age_group}` : '',
      typeof applied.child_age === 'number' ? `child age ${applied.child_age}` : '',
    ].filter(Boolean);
    if (parts.length > 0) lines.push(`**Declared participants applied:** ${parts.join(', ')}`);
  }
  if (r.declared_age_overridden === true) lines.push(`**Declared age overridden:**${reasonText(r.declared_age_overridden_reason) || ' the declared age was not used for this result.'}`);
  const disclosure = r.minor_disclosure as { detected?: boolean; suggested_age_group?: string; reason?: string } | undefined;
  if (disclosure && typeof disclosure === 'object') {
    lines.push(disclosure.detected
      ? `**Minor disclosure:** the speaker indicates they are a minor${disclosure.suggested_age_group ? ` (suggested age group ${disclosure.suggested_age_group})` : ''}.${reasonText(disclosure.reason)}`
      : '**Minor disclosure:** none found.');
  }
  if (r.minor_on_adult_platform_raised === true) lines.push(`**Minor on an adult platform:**${reasonText(r.minor_on_adult_platform_raised_reason) || ' the result was raised.'}`);
  if (r.bullying_reported === true) {
    const by = r.bullying_reported_by === 'target' ? ' by the person it is happening to' : r.bullying_reported_by === 'bystander' ? ' by a bystander' : '';
    lines.push(`**Bullying reported:** the speaker is reporting bullying${by}, not doing it.${reasonText(r.bullying_reported_reason)}`);
  }
  if (r.third_party_concern === true) lines.push(`**Third-party concern:** route this to your safeguarding process.${reasonText(r.third_party_concern_reason)}`);
  if (r.disclosure_capped === true) lines.push(`**Disclosure:** the writer is telling their own story; offer support rather than opening a moderation case.${reasonText(r.disclosure_capped_reason)}`);
  if (r.priority_review === true) lines.push(`**Priority review:** review this ahead of other results.${reasonText(r.priority_review_reason)}`);
  if (r.target_report === true) lines.push(`**Target report:** the writer is the person being defrauded, reporting it.${reasonText(r.target_report_reason)}`);
  if (r.support_suggested === true) lines.push('**Support suggested:** a supportive check-in is suggested rather than a moderation case.');
  if (r.action_capped === true && typeof r.action_capped_reason === 'string') {
    lines.push(`**Action capped:** ${r.action_capped_reason}`);
  }
  if (r.attestation && typeof r.attestation === 'object') {
    lines.push('**Attestation:** signed attestation attached (`structuredContent.result.attestation`).');
  } else if (r.attestation === null) {
    lines.push(`**Attestation:** not produced${typeof r.attestation_reason === 'string' ? ` (\`${r.attestation_reason}\`)` : ''}.`);
  }
  return lines.join('\n');
}

/**
 * Renders the additive, deterministic `profanity`/`risk_terms` fields when
 * present. Both are opt-in (flag_profanity/flag_risk_terms or the account
 * defaults) and never affect severity/risk_score/recommended_action, so this
 * is purely informational, omitted entirely when neither fired.
 */
export function formatDeterministicFlags(result: { profanity?: { detected: boolean; matches: string[] } | null; risk_terms?: { detected: boolean; matches: Array<{ term: string; category: string }> } | null }): string {
  const lines: string[] = [];
  if (result.profanity?.detected) lines.push(`**Profanity:** ${result.profanity.matches.join(', ')}`);
  if (result.risk_terms?.detected) lines.push(`**Risk Terms:** ${result.risk_terms.matches.map(m => `${m.term} (${m.category})`).join(', ')}`);
  return lines.length ? `\n${lines.join('\n')}\n` : '';
}

export function verdictStatus(flagged: boolean, recommendedAction: RecommendedAction): string {
  switch (verdictState(flagged, recommendedAction)) {
    case 'flagged': return '\u26A0\uFE0F Detected';
    case 'review': return '\u{1F7E0} Flagged for Review';
    default: return '\u2705 Clear';
  }
}

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

  // Nothing detected with a live action (a report the detector routes to
  // review) is "Flagged for Review", not a green all-clear.
  const header = analysisIncomplete(result)
    ? `## ${incompleteHeader(result)}`
    : detected
      ? `## ${levelEmoji} ${label} Detected`
      : `## ${verdictHeader(false, result.recommended_action, `${label} Detected`, `No ${label} Detected`)}`;
  const scores = analysisIncomplete(result)
    ? incompleteScores(result)
    : `**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%${riskScoreScope(result)}
**Level:** ${result.level}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%`;

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

${scores}
${categories}
${formatSpeakerAndRouting(result as unknown as Record<string, unknown>)}
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

/**
 * The multi-endpoint result.
 *
 * A partial run (`summary.analysis_status: partial`) goes first: a detector
 * that did not answer is not one that found nothing, and a run that reads
 * "Threats Detected: 0" above a missing grooming result is the missed harm
 * this server must never print. The API then sets a summary
 * `recommended_action`, which is the one to route on.
 */
export function formatMultiResult(result: AnalyseMultiResult): string {
  const s = result.summary;
  const overallEmoji = riskEmoji[s.overall_risk_level] || '\u26AA';
  const failed = s.failed_endpoints ?? [];
  const partial = s.analysis_status === 'partial' || failed.length > 0;

  const incomplete = partial
    ? `## ${INCOMPLETE_HEADER}

**Analysis status:** partial, ${failed.length} of ${s.total_endpoints} detectors did not answer. A detector that did not answer has not cleared the content.
${failed.length > 0 ? `**Did not answer:** ${failed.map(f => `${f.endpoint} (\`${f.code}\`)`).join(', ')}` : ''}
${s.recommended_action ? `**Recommended Action:** \`${s.recommended_action}\`${s.action_detail ? `\n${s.action_detail}` : ''}` : ''}

`
    : '';

  const closeCalls = s.highest_risk.close_calls ?? [];
  const summarySection = `${incomplete}## Multi-Endpoint Analysis

**Overall Risk:** ${overallEmoji} ${s.overall_risk_level}
**Endpoints Analyzed:** ${s.total_endpoints}
**Threats Detected:** ${s.detected_count}
**Highest Risk:** ${s.highest_risk.endpoint} (${(s.highest_risk.risk_score * 100).toFixed(0)}%)
${closeCalls.length > 0 ? `**Read together with:** ${closeCalls.map(c => c.endpoint).join(', ')} (scored about the same; part of the same finding)` : ''}
${s.skipped_endpoints?.length ? `**Skipped:** ${s.skipped_endpoints.join(', ')}${s.skipped_reason ? ` (${s.skipped_reason})` : ''}` : ''}
${result.cross_endpoint_modifier ? `**Cross-Endpoint Modifier:** ${result.cross_endpoint_modifier.toFixed(2)}x` : ''}`.replace(/\n{3,}/g, '\n\n');

  const perEndpoint = result.results
    .map(r => {
      const emoji = r.detected ? (riskEmoji[r.level ?? ''] || '\u26AA') : '\u2705';
      const routing = formatSpeakerAndRouting(r as unknown as Record<string, unknown>);
      return `### ${emoji} ${r.endpoint}
**Detected:** ${r.detected ? 'Yes' : 'No'} | **Risk:** ${(r.risk_score * 100).toFixed(0)}% | **Level:** ${r.level ?? 'n/a'} | **Action:** \`${r.recommended_action}\`
${r.categories.length > 0 ? `**Categories:** ${r.categories.map(c => c.tag).join(', ')}` : ''}
${routing}
${r.rationale ?? '_No written analysis returned for this endpoint._'}`.replace(/\n{2,}/g, '\n');
    })
    .join('\n\n');

  const signals = result.results.filter(r => r.detected).flatMap(r => harmSignals(r));
  return `${summarySection}

---

${perEndpoint}` + (result.support ? formatSupportText(result.support, signals) : '');
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
${findingsSection}
${formatDeterministicFlags(result)}`.trim();
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

  // `semantic_analysis` is what the API serves; `vision` was its old name and
  // is read only as a fallback for an older deployment.
  const semantic = result.semantic_analysis ?? result.vision;
  const visionSection = semantic ? `### Image Analysis
**Likely Synthetic:** ${semantic.is_likely_synthetic ? 'Yes' : 'No'} (${(semantic.synthetic_confidence * 100).toFixed(0)}%)
${semantic.artifacts?.length > 0 ? `**Artifacts:** ${semantic.artifacts.join(', ')}` : ''}
${semantic.face_analysis ? `**Face Analysis:** ${semantic.face_analysis}` : ''}
**Assessment:** ${semantic.overall_assessment}` : '';

  const screenshotSection = result.screenshot_detection?.is_screenshot
    ? `**Screen Capture:** looks like a screenshot (${(result.screenshot_detection.confidence * 100).toFixed(0)}%)`
    : '';

  const metadataSection = result.metadata_analysis ? `### EXIF / Metadata
**Format:** ${result.metadata_analysis.format} (${result.metadata_analysis.dimensions.width}x${result.metadata_analysis.dimensions.height})
**EXIF Present:** ${result.metadata_analysis.has_exif ? 'Yes' : 'No'} | **Camera:** ${result.metadata_analysis.has_camera ? (result.metadata_analysis.camera_model || 'Yes') : 'No'} | **GPS:** ${result.metadata_analysis.has_gps ? 'Yes' : 'No'}
${result.metadata_analysis.ai_generator_detected ? `\u26A0\uFE0F **AI Generator Detected:** ${result.metadata_analysis.ai_generator || 'Yes'}` : ''}
${result.metadata_analysis.suspicious_absence ? '\u26A0\uFE0F **Suspicious:** High-res image with no camera metadata' : ''}` : '';

  const provenanceSection = result.provenance?.has_c2pa ? `### C2PA Content Credentials
**C2PA Manifest:** Found
${result.provenance.claim_generator ? `**Claim Generator:** ${result.provenance.claim_generator}` : ''}
**AI Generated:** ${result.provenance.is_ai_generated ? `Yes${result.provenance.ai_tool ? ` (${result.provenance.ai_tool})` : ''}` : 'No'}` : '';

  // A count only: which checks fired and how much each moved the result is
  // how the detector works, not something a reader acts on.
  const signalsSection = result.forensic_signals?.signal_count
    ? `**Forensic Signals:** ${result.forensic_signals.signal_count} independent signals found`
    : '';

  const hashSection = result.perceptual_hash ? `**Perceptual Hash:** \`${result.perceptual_hash}\`` : '';

  const matchSection = result.known_synthetic_match ? `\u26A0\uFE0F **Known Synthetic Match:** distance ${result.known_synthetic_match.distance} — category: ${result.known_synthetic_match.category}` : '';

  return `## \u{1F5BC}\uFE0F Synthetic Image Detection

**Classification:** ${emoji} ${label}
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Level:** ${result.level}
${categories}

${visionSection}
${screenshotSection}

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

  // `rms_level` is what the API serves; `rms_mean` is an older name.
  const rms = result.audio_stats?.rms_level ?? result.audio_stats?.rms_mean;
  const statsSection = result.audio_stats ? `### Audio Statistics
${result.audio_stats.dynamic_range != null ? `**Dynamic Range:** ${result.audio_stats.dynamic_range.toFixed(1)} dB` : ''}
${result.audio_stats.silence_ratio != null ? `**Silence Ratio:** ${(result.audio_stats.silence_ratio * 100).toFixed(1)}%` : ''}
${result.audio_stats.flat_factor != null ? `**Flat Factor:** ${result.audio_stats.flat_factor.toFixed(2)} (higher = more uniform)` : ''}
${rms != null ? `**RMS Level:** ${rms.toFixed(1)} dB` : ''}` : '';

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

  // The served names first; the older ones are read only as a fallback.
  const tc = result.temporal_consistency;
  const pctOf = (v: number | undefined) => (typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : 'n/a');
  const anomalies = tc ? (tc.anomalous_pairs ?? tc.anomalous_frame_pairs ?? []) : [];
  const temporalSection = tc ? `### Temporal Face Consistency
**Identity Consistency:** ${pctOf(tc.identity_consistency ?? tc.identity_consistency_score)}
**Landmark Stability:** ${pctOf(tc.landmark_stability ?? tc.landmark_stability_score)}
**Overall Score:** ${pctOf(tc.score ?? tc.temporal_consistency_score)}
**Frames With Faces:** ${tc.frames_with_faces}${result.video?.frames_analyzed != null ? ` of ${result.video.frames_analyzed}` : ''}
${anomalies.length > 0 ? `**Anomalies:** ${anomalies.map(p => `frames ${p.frame_a}\u2013${p.frame_b}`).join(', ')}` : ''}` : '';

  const lipSyncSection = result.lip_sync ? `### Lip-Sync Correlation
**Correlation:** ${result.lip_sync.correlation.toFixed(2)} ${result.lip_sync.correlation < 0.3 ? '\u26A0\uFE0F Poor' : result.lip_sync.correlation < 0.5 ? '\u{1F7E0} Weak' : '\u2705 Good'}
${result.lip_sync.has_silent_mouth_movement ? '\u26A0\uFE0F Silent mouth movement detected' : ''}
${result.lip_sync.has_voice_without_movement ? '\u26A0\uFE0F Voice without mouth movement detected' : ''}` : '';

  const driftSection = result.drift_signature && result.drift_signature !== 'stable'
    ? `**Drift Signature:** ${result.drift_signature}`
    : '';

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
${driftSection}

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

/** An epoch-millisecond timestamp as ISO 8601; anything else as given. */
function isoTime(v: unknown): string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
  return typeof v === 'string' && v ? v : undefined;
}

export function formatVerificationSession(result: VerificationSession, mode: string, notices: string[] = []): string {
  const lines = [
    '## \u2705 Verification Session Created',
    '',
    `**Session ID:** \`${result.session_id}\``,
    `**Mode:** ${mode}`,
  ];
  if (result.verification_mode) lines.push(`**Check:** ${result.verification_mode === 'liveness_only' ? 'live face only' : 'document and live face'}`);
  if (result.chip_policy) lines.push(`**Chip policy:** ${result.chip_policy}`);
  const expires = isoTime(result.expires_at);
  if (expires) lines.push(`**Expires:** ${expires}`);
  lines.push(
    '',
    '### Verification URL',
    result.url,
    '',
    'Open this URL in a browser for the user to complete the verification flow. Use `get_verification_session` to poll for the result.',
  );
  for (const n of notices) lines.push('', `> ${n}`);
  return lines.join('\n');
}

const SESSION_STATUS_EMOJI: Record<string, string> = {
  pending: '\u23F3',
  in_progress: '\u{1F504}',
  document_required: '\u{1F4C4}',
  completed: '\u2705',
  failed: '\u274C',
  expired: '\u23F0',
};

/**
 * A verification session poll.
 *
 * The extracted document fields, `date_of_birth` and `failure_reasons` are
 * released once, to the first authenticated poll after the session finishes;
 * later polls carry the decision alone, so every one of those reads is
 * optional here. A `failed` session renders its result too: why it failed is
 * the part a reader needs.
 */
export function formatVerificationSessionResult(result: VerificationSessionResult): string {
  const emoji = SESSION_STATUS_EMOJI[result.status] || '\u26AA';
  const lines: string[] = [
    `## ${emoji} Verification Session`,
    '',
    `**Session ID:** \`${result.session_id}\``,
    `**Status:** ${result.status}`,
  ];

  if (result.verification_mode) lines.push(`**Check:** ${result.verification_mode === 'liveness_only' ? 'live face only' : 'document and live face'}`);
  if (result.chip_policy) lines.push(`**Chip policy:** ${result.chip_policy}`);
  const created = isoTime(result.created_at);
  const expires = isoTime(result.expires_at);
  if (created) lines.push(`**Created:** ${created}`);
  if (expires) lines.push(`**Expires:** ${expires}`);

  const finished = result.status === 'completed' || result.status === 'failed';
  if (!finished || !result.result) {
    if (result.status === 'pending' || result.status === 'in_progress') {
      lines.push('', `_Verification in progress${result.step_progress ? ` (step: ${result.step_progress})` : ''}. Poll again to check for completion._`);
    } else if (result.status === 'document_required') {
      lines.push('', '_Waiting for the user to add a document photo. Poll again later._');
    }
    return lines.join('\n');
  }

  const r = result.result;
  lines.push('');
  lines.push(`### Result: ${r.status === 'verified' ? '\u2705 Verified' : r.status === 'needs_review' ? '\u{1F7E0} Needs Review' : '\u274C Failed'}`);
  if (r.age != null) lines.push(`**Age:** ${r.age}`);
  if (r.age_range) lines.push(`**Age Range:** ${r.age_range.low} to ${r.age_range.high} (estimated from the live face)`);
  if (r.date_of_birth) lines.push(`**Date of Birth:** ${r.date_of_birth}`);
  if (r.is_minor != null) lines.push(`**Is Minor:** ${r.is_minor ? 'Yes' : 'No'}`);
  const evidence = r.document_evidence ?? result.document_evidence;
  if (evidence) lines.push(`**Document Evidence:** ${evidence.replace(/_/g, ' ')}`);

  const d = r.document;
  if (d) {
    lines.push('', '### Document');
    lines.push(`**OCR Confidence:** ${d.ocr_confidence}%`);
    const name = d.name_extracted || [d.first_name, d.last_name].filter(Boolean).join(' ');
    if (name) lines.push(`**Name:** ${name}`);
    if (d.document_number) lines.push(`**Document Number:** ${d.document_number}${d.document_number_valid != null ? ` (${d.document_number_valid ? '\u2705 valid' : '\u274C invalid'})` : ''}`);
    if (d.nationality) lines.push(`**Nationality:** ${d.nationality}`);
    if (d.country_code) lines.push(`**Country:** ${d.country_code}`);
    if (d.document_type) lines.push(`**Type:** ${d.document_type}`);
    if (d.expiration_date) lines.push(`**Expires:** ${d.expiration_date}${d.expired ? ' \u274C Expired' : ''}`);
    if (d.chip_verified) lines.push(`**Chip:** read and verified${d.chip_issuer_trusted === false ? ' (issuer not trusted)' : d.chip_issuer_trusted ? ' (trusted issuer)' : ''}`);
  }

  if (r.face_match) {
    lines.push('', '### Face Match');
    lines.push(`**Matched:** ${r.face_match.matched ? '\u2705 Yes' : '\u274C No'} | **Confidence:** ${(r.face_match.confidence * 100).toFixed(0)}%`);
  }

  if (r.liveness) {
    lines.push(`**Liveness:** ${r.liveness.valid ? '\u2705 Passed' : `\u274C Failed${r.liveness.reason ? ` (${r.liveness.reason})` : ''}`}`);
  }

  const reasons = r.failure_reasons ?? [];
  if (reasons.length > 0) {
    lines.push('', '### Failure Reasons');
    for (const reason of reasons) lines.push(`- ${reason}`);
  } else if (r.status === 'failed' && r.failure_reasons == null) {
    lines.push('', '_Failure reasons are released once, to the first poll after the session finished, and are not repeated here._');
  }

  return lines.join('\n');
}

/**
 * The quota tool's text, from whatever shape the API returns.
 *
 * The API's GET /usage/quota answers `{ tier, limits: { requestsPerMinute,
 * ... }, current: { requestsThisMinute, ... }, remaining: { requestsThisMinute,
 * ... }, resetsInSeconds }`. This tool (and the SDK's `UsageQuota` type) had
 * assumed flat `rate_limit` / `remaining` / `reset_in_seconds` fields that the
 * API never sent, which rendered as "undefined/min", "[object Object]" and
 * "undefineds" (customer report, 2026-09-21). Read the real fields, keep the
 * old names as a fallback, and never print an undefined.
 */
/**
 * Per-message rows as text, with the two things a reader needs and the
 * structured result does not say (customer report, 2026-09-22): rows cover
 * only the messages the model judged relevant, so a message without a row
 * carried no per-message finding, not a zero; and a tactic the API withdrew
 * from a row (`unsupported_flags`) is shown as withdrawn, not dropped.
 */
export function formatMessageRows(
  rows: ReadonlyArray<{ message_index: number; risk_score: number; flags: string[]; summary: string; unsupported_flags?: string[] }> | undefined,
  messageCount: number,
): string {
  if (!rows || rows.length === 0) return '';
  const coverage = rows.length < messageCount
    ? `${rows.length} of ${messageCount} messages have a row; a message without a row carried no per-message finding.\n`
    : '';
  const lines = rows.map(m => {
    const flags = m.flags.length > 0 ? ` [${m.flags.join(', ')}]` : '';
    const withdrawn = m.unsupported_flags && m.unsupported_flags.length > 0 ? ` (withdrawn: ${m.unsupported_flags.join(', ')})` : '';
    return `- **Message ${m.message_index}** (risk: ${(m.risk_score * 100).toFixed(0)}%)${flags}${withdrawn} — ${m.summary}`;
  });
  return `### Message Analysis\n${coverage}${lines.join('\n')}`;
}

export function formatQuota(quota: UsageQuota): string {
  // Typed against the SDK's UsageQuota (2.33.0, the wire shape of
  // GET /usage/quota). Field reads stay guarded: the connector can face an
  // API deployment older than the field it wants (resetsInSeconds arrived
  // on 2026-09-21), and this text must never print "undefined" or
  // "[object Object]" again, which is what the customer saw.
  const q = (quota ?? {}) as Partial<UsageQuota>;
  const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const show = (v: number | undefined, unit = ''): string => (v === undefined ? 'n/a' : `${v}${unit}`);

  const tier = typeof q.tier === 'string' ? q.tier : 'n/a';
  const perMinute = num(q.limits?.requestsPerMinute);
  const usedThisMinute = num(q.current?.requestsThisMinute);
  const remainingThisMinute = num(q.remaining?.requestsThisMinute);
  const remainingToday = num(q.remaining?.requestsToday);
  const perDay = num(q.limits?.requestsPerDay);
  const resets = num(q.resetsInSeconds);

  const lines = [
    '## Rate Limit Quota',
    '',
    `**Tier:** ${tier}`,
    `**Rate Limit:** ${show(perMinute, '/min')}`,
    `**Used This Minute:** ${show(usedThisMinute)}`,
    `**Remaining This Minute:** ${show(remainingThisMinute)}`,
    `**Resets In:** ${show(resets, 's')}`,
  ];
  if (perDay !== undefined && perDay !== -1) {
    // Completed requests: the per-minute figure counts requests as they
    // start, the daily one as they finish, so a quota read while calls are
    // in flight shows them in the first and not yet in the second (customer
    // report, 2026-09-22).
    lines.push(`**Remaining Today:** ${show(remainingToday)} of ${perDay} (completed requests; calls still in flight are counted when they finish)`);
  }
  return lines.join('\n');
}

export function formatUsageSummary(summary: unknown): string {
  // GET /usage/summary returns one day: { tier, date, usage: { totalRequests,
  // successRequests, errorRequests }, quota: { requestsPerMinute,
  // requestsPerDay, remainingToday } }, which is what the SDK's UsageSummary
  // declares since 3.0.0. Reads stay guarded: this text must never print
  // "n/a" as "undefined", whatever an older deployment omits. It never throws.
  const s = (summary && typeof summary === 'object' ? summary : {}) as Record<string, unknown>;
  const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {});
  const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
  const show = (v: number | undefined, unit = ''): string => (v === undefined ? 'n/a' : `${v}${unit}`);
  const usage = obj(s.usage);
  const quota = obj(s.quota);

  const lines = ['## Usage Summary', ''];
  const tier = str(s.tier);
  if (tier) lines.push(`**Tier:** ${tier}`);

  const total = num(usage.totalRequests);
  const ok = num(usage.successRequests);
  const failed = num(usage.errorRequests);
  const perDay = num(quota.requestsPerDay);
  const remainingToday = num(quota.remainingToday);
  const perMinute = num(quota.requestsPerMinute);
  const date = str(s.date);
  if (date) lines.push(`**Date:** ${date}`);
  const split = ok !== undefined && failed !== undefined ? ` (${ok} succeeded, ${failed} failed)` : '';
  lines.push(`**Requests:** ${show(total)}${split}`);
  const remaining = perDay === -1 || remainingToday === -1
    ? 'unlimited'
    : `${show(remainingToday)}${perDay === undefined ? '' : ` of ${perDay}`}`;
  lines.push(`**Remaining Today:** ${remaining}`);
  lines.push(`**Rate Limit:** ${show(perMinute, '/min')}`);
  lines.push('', 'For the billing period (used, limit, days left) use get_usage_monthly.');
  return lines.join('\n');
}

// =============================================================================
// Nickname, safety classification, status, fleet, verification config
// =============================================================================

const NICKNAME_RECOMMENDATION: Record<string, string> = {
  allow: '\u2705 Allow',
  allow_and_watch: '\u{1F7E1} Allow and watch',
  ask_to_rename: '\u{1F7E0} Ask to rename',
  hold_for_review: '\u{1F534} Hold for review',
};

/**
 * A display-name reading. It is a signal about the name, not a verdict on the
 * person, and its `recommendation` is a different vocabulary from
 * `recommended_action`, so it never goes through `verdictHeader`.
 *
 * `reading_complete: false` means nothing was analysed (and nothing charged):
 * the `none` signal that comes with it is not a clean reading.
 */
export function formatNicknameResult(result: NicknameResult): string {
  if (result.reading_complete === false) {
    return [
      '## \u{1F7E0} Not Analysed: Retry',
      '',
      '**Signal:** not available, the name was not analysed and the call was not charged. This is not a clean reading: retry before showing the name.',
    ].join('\n');
  }
  const lines = [
    `## Display Name: ${NICKNAME_RECOMMENDATION[result.recommendation] ?? result.recommendation}`,
    '',
    `**Signal:** ${result.signal}`,
    `**Confidence:** ${(result.confidence * 100).toFixed(0)}%`,
    `**Strictness:** ${result.strictness}`,
  ];
  if (result.categories.length > 0) lines.push(`**Categories:** ${result.categories.join(', ')}`);
  if (result.recommendation_detail) lines.push('', `**Recommendation:** \`${result.recommendation}\``, result.recommendation_detail);
  const flagged = result.parts.filter(p => p.reading !== 'ordinary');
  if (flagged.length > 0) {
    lines.push('', '### Parts of the name');
    for (const p of flagged) lines.push(`- \`${p.text}\`: ${p.reading}${p.category ? ` (${p.category})` : ''}`);
  }
  if (result.rationale) lines.push('', '### Rationale', result.rationale);
  return lines.join('\n');
}

export function formatSafetyClassification(result: SafetyClassificationResult): string {
  if (!result.exists) {
    return '## Safety Classification\n\nThis account has not been classified yet. That is not a score of zero: a classification appears once the account has enough activity.';
  }
  const c = result.classification;
  const lines = ['## Safety Classification', '', `**Date:** ${c.date}`];
  if (c.insufficient_data || c.score === null) {
    lines.push(`**Score:** not available yet, too little activity to classify. This is not a bad score.${c.reason ? ` ${c.reason}` : ''}`);
  } else {
    lines.push(`**Score:** ${c.score} / 100${c.band ? ` (${c.band.replace(/_/g, ' ')})` : ''}`);
  }
  if (c.components.length > 0) {
    lines.push('', '### Components');
    for (const k of c.components) lines.push(`- **${k.label}:** ${k.points} / ${k.max}${k.tip ? `. ${k.tip}` : ''}`);
  }
  lines.push('', `_${c.disclaimer}_`);
  return lines.join('\n');
}

const STATUS_EMOJI: Record<string, string> = {
  operational: '\u2705',
  degraded: '\u{1F7E0}',
  outage: '\u{1F534}',
  major_outage: '\u{1F534}',
};

export function formatApiStatus(status: ApiStatus): string {
  const lines = [
    `## ${STATUS_EMOJI[status.status] ?? '\u26AA'} Service Status: ${status.status.replace(/_/g, ' ')}`,
    '',
    `**Updated:** ${status.updated_at}`,
    '',
    '### Components',
  ];
  for (const [name, c] of Object.entries(status.components ?? {})) {
    lines.push(`- **${name.replace(/_/g, ' ')}:** ${STATUS_EMOJI[c.status] ?? ''} ${c.status}${c.message ? ` (${c.message})` : ''}`);
  }
  if (status.uptime) lines.push('', `**Uptime:** ${status.uptime.last_24h}% (24h), ${status.uptime.last_7d}% (7d), ${status.uptime.last_30d}% (30d)`);
  const recent = status.incidents?.recent ?? [];
  if (status.incidents?.active || recent.length > 0) {
    lines.push('', `### Incidents (${status.incidents.active} active)`);
    for (const i of recent) lines.push(`- ${i.title} (${i.status}, ${i.created_at})`);
  }
  return lines.join('\n');
}

export function formatComponentPing(ping: ComponentPing): string {
  const state = ping.skipped ? '\u26AA not checked on this deployment' : ping.healthy ? '\u2705 healthy' : '\u{1F534} not healthy';
  return [
    `## Component: ${ping.component}`,
    '',
    `**State:** ${state}`,
    ...(ping.latency_ms != null ? [`**Latency:** ${ping.latency_ms} ms`] : []),
    ...(ping.message ? [`**Message:** ${ping.message}`] : []),
    `**Checked:** ${ping.timestamp}`,
  ].join('\n');
}

function fleetDeviceLines(d: FleetDevice): string[] {
  const failedRules = d.results.filter(r => !r.passed);
  return [
    `### ${d.passed ? '\u2705' : '\u274C'} ${d.device_id}`,
    `**Platform:** ${d.platform} | **Agent:** ${d.agent_version} | **Policy:** ${d.policy_id}`,
    `**Attested:** ${d.attested_at} | **Expires:** ${d.expires_at}`,
    ...failedRules.map(r => `- \u274C ${typeof r.rule?.name === 'string' ? r.rule.name : JSON.stringify(r.rule)}${r.detail ? `: ${r.detail}` : ''}`),
  ];
}

export function formatFleet(result: FleetResult): string {
  const s = result.summary;
  const lines = [
    '## Device Fleet',
    '',
    `**Devices:** ${s.total} | **Compliant:** ${s.compliant} | **Not compliant:** ${s.non_compliant} (${s.compliance_pct}% compliant)`,
    `**Credits Used:** ${result.credits_used}`,
  ];
  for (const d of result.devices.slice(0, 25)) lines.push('', ...fleetDeviceLines(d));
  if (result.devices.length > 25) lines.push('', `_...and ${result.devices.length - 25} more devices in \`structuredContent\`._`);
  return lines.join('\n');
}

export function formatFleetDevice(device: FleetDevice, creditsUsed: number): string {
  return ['## Device Attestation', '', ...fleetDeviceLines(device), '', `**Credits Used:** ${creditsUsed}`].join('\n');
}

export function formatVerificationConfig(config: VerificationConfig): string {
  return [
    '## Verification Settings',
    '',
    ...(config.country ? [`**Country:** ${config.country}${config.market ? ` (market: ${config.market})` : ''}`] : []),
    `**Check:** ${config.mode === 'liveness_only' ? 'live face only' : 'document and live face'}`,
    `**Adult from age:** ${config.age_threshold}`,
  ].join('\n');
}

/** Markdown summary for the assistant; the full report rides in structuredContent. */
export function formatDsaReportSummary(report: DsaTransparencyReport & { credits_used?: number }): string {
  const notHeld = report.sections.flatMap((s) => s.fields).filter((f) => f.availability === 'not_held_by_tuteliq').length;
  const categories = report.own_initiative_by_category.map((row) => {
    const ref = row.dsa_subcategory ? `${row.dsa_subcategory.template_ref} ${row.dsa_subcategory.label}` : `${row.dsa_category.template_ref} ${row.dsa_category.label}`;
    const c = row.counts;
    return `| ${ref} | ${c.automated_detections} | ${c.human_reviewed} | ${c.upheld_after_human_review} | ${c.dismissed_after_human_review} |`;
  });
  const unmapped = report.unmapped_categories.map((row) => `- **${row.tuteliq_category}**: ${row.counts.automated_detections}`);
  return [
    '## DSA transparency report data',
    '',
    `**Reporting period:** ${report.reporting_period.from} to ${report.reporting_period.to}`,
    `**Template:** ${report.template.regulation}`,
    `**Incidents counted:** ${report.scope.incidents_counted} (test traffic excluded: ${report.scope.test_incidents_excluded})`,
    ...(report.credits_used === undefined ? [] : [`**Credits used:** ${report.credits_used}`]),
    '',
    '### Own-initiative detections by template category',
    categories.length
      ? ['| Category | Detections | Human reviewed | Upheld | Dismissed |', '|---|---|---|---|---|', ...categories].join('\n')
      : '_(none)_',
    '',
    '### Detections for the platform to classify',
    unmapped.length ? unmapped.join('\n') : '_(none)_',
    '',
    `${notHeld} template fields are not held by Tuteliq and must be supplied by the platform; they are returned as null with reason not_held_by_tuteliq.`,
    '',
    `_${report.notice}_`,
  ].join('\n');
}
