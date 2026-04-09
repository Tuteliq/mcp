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

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\`
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

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\`
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

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\`
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

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\`
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
