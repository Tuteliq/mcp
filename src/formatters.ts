import type { DetectionResult, AnalyseMultiResult, VideoAnalysisResult, DocumentAnalysisResult, DocumentFlaggedPage, DocumentPageResult } from '@tuteliq/sdk';

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

export function formatDetectionResult(result: DetectionResult): string {
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

**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%
**Level:** ${result.level}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
${categories}

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\`

${evidence}
${messageAnalysis}
${calibration}`.trim() + ((result as any).support ? formatSupportText((result as any).support) : '');
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
${r.rationale}`;
    })
    .join('\n\n');

  return `${summarySection}

---

${perEndpoint}`;
}

export function formatSupportText(support: {
  country_name?: string;
  emergency_number?: string;
  helplines: Array<{ name: string; number: string; available?: string }>;
  response_guide?: { immediateActions: string[]; resources: Array<{ name: string; url?: string }> };
}): string {
  const lines: string[] = [
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

  if (support.helplines.length > 0) {
    lines.push('**Crisis Helplines:**');
    for (const h of support.helplines) {
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
    lines.push('**Resources:**');
    for (const r of support.response_guide.resources) {
      lines.push(r.url ? `- [${r.name}](${r.url})` : `- ${r.name}`);
    }
  }

  return lines.join('\n');
}

export function formatVideoResult(result: VideoAnalysisResult): string {
  const emoji = severityEmoji[result.overall_severity] || '\u2705';

  const findingsSection = result.safety_findings.length > 0
    ? result.safety_findings
        .map(f => {
          const fEmoji = severityEmoji[f.severity <= 0.3 ? 'low' : f.severity <= 0.6 ? 'medium' : f.severity <= 0.85 ? 'high' : 'critical'] || '\u26AA';
          return `- \`${f.timestamp.toFixed(1)}s\` (frame ${f.frame_index}) ${fEmoji} ${f.description}\n  Categories: ${f.categories.join(', ')} | Severity: ${(f.severity * 100).toFixed(0)}%`;
        })
        .join('\n')
    : '_No safety findings._';

  return `## \u{1F3AC} Video Analysis

**Overall Severity:** ${emoji} ${result.overall_severity}
**Overall Risk Score:** ${(result.overall_risk_score * 100).toFixed(0)}%
**Frames Analyzed:** ${result.frames_analyzed}

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
        ? detections.map((r) => `${r.endpoint}: ${r.rationale}`).join('; ')
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

${result.detected_endpoints.length > 0 ? `### Detected Threats\n${result.detected_endpoints.map((e: string) => `- \u26A0\uFE0F ${e}`).join('\n')}` : ''}` + (result.support ? formatSupportText(result.support as any) : '');
}
