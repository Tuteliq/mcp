import React from 'react';
import { WidgetShell } from '../components/WidgetShell';
import { CardHeader } from '../components/primitives';
import { RiskGauge } from '../components/RiskGauge';
import { SeverityBadge } from '../components/SeverityBadge';
import { TimelineFindings } from '../components/TimelineFindings';
import { CategoryChips } from '../components/CategoryChips';
import { colors } from '../theme';
import type { ToolResultPayload, VoiceAnalysisResult, ImageAnalysisResult, VideoAnalysisResult, DocumentAnalysisResult, DocumentFlaggedPage } from '../types';

function VoiceView({ result }: { result: VoiceAnalysisResult }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <RiskGauge score={result.overall_risk_score} level={result.overall_severity} />
        <div>
          <SeverityBadge level={result.overall_severity} />
          <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 4 }}>
            Language: {result.transcription.language} | Duration: {result.transcription.duration.toFixed(1)}s
          </div>
        </div>
      </div>

      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Transcript</div>
        <div style={{ fontSize: 12, color: colors.text.secondary, background: colors.bg.secondary, padding: 10, borderRadius: 8, maxHeight: 200, overflow: 'auto' }}>
          {result.transcription.text}
        </div>
      </div>

      {result.transcription.segments.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Segments</div>
          {result.transcription.segments.slice(0, 10).map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: colors.text.secondary, marginBottom: 2 }}>
              <span style={{ fontFamily: 'monospace', color: colors.text.muted }}>{s.start.toFixed(1)}s-{s.end.toFixed(1)}s</span>{' '}
              {s.text}
            </div>
          ))}
          {result.transcription.segments.length > 10 && (
            <div style={{ fontSize: 11, color: colors.text.muted, fontStyle: 'italic' }}>
              ...and {result.transcription.segments.length - 10} more segments
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ImageView({ result }: { result: ImageAnalysisResult }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <RiskGauge score={result.overall_risk_score} level={result.overall_severity} />
        <div>
          <SeverityBadge level={result.overall_severity} />
          <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 4 }}>
            {result.vision.contains_text ? 'Contains text' : 'No text detected'}
            {result.vision.contains_faces ? ' | Faces detected' : ''}
          </div>
        </div>
      </div>

      <div style={{ margin: '12px 0', fontSize: 13, color: colors.text.secondary }}>
        {result.vision.visual_description}
      </div>

      {result.vision.visual_categories.length > 0 && <CategoryChips categories={result.vision.visual_categories} />}

      {result.vision.extracted_text && (
        <div style={{ margin: '12px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Extracted Text (OCR)</div>
          <div style={{ fontSize: 12, color: colors.text.secondary, background: colors.bg.secondary, padding: 10, borderRadius: 8 }}>
            {result.vision.extracted_text}
          </div>
        </div>
      )}
    </>
  );
}

function VideoView({ result }: { result: VideoAnalysisResult }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <RiskGauge score={result.overall_risk_score} level={result.overall_severity} />
        <div>
          <SeverityBadge level={result.overall_severity} />
          <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 4 }}>
            {result.frames_analyzed} frames analyzed
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Safety Findings</div>
      <TimelineFindings findings={result.safety_findings} />
    </>
  );
}

function DocumentView({ result }: { result: DocumentAnalysisResult }) {
  const hashShort = result.document_hash ? result.document_hash.replace(/^sha256:/, '').slice(0, 12) : '';
  const flagged = result.flagged_pages || [];
  const detected = result.detected_endpoints || [];
  const extraction = result.extraction_summary || { text_layer_pages: 0, ocr_pages: 0, failed_pages: 0 };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <RiskGauge score={result.overall_risk_score} level={result.overall_severity} />
        <div>
          <SeverityBadge level={result.overall_severity} />
          <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 4 }}>
            {result.pages_analyzed} of {result.total_pages} pages analyzed
            {result.language ? ` • ${result.language}` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '12px 0' }}>
        <div style={{ background: colors.bg.secondary, padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Text Layer</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: colors.text.primary }}>{extraction.text_layer_pages}</div>
        </div>
        <div style={{ background: colors.bg.secondary, padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>OCR</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: colors.text.primary }}>{extraction.ocr_pages}</div>
        </div>
        <div style={{ background: colors.bg.secondary, padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Failed</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: extraction.failed_pages > 0 ? colors.severity.high : colors.text.primary }}>{extraction.failed_pages}</div>
        </div>
      </div>

      {detected.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Detected Endpoints</div>
          <CategoryChips categories={detected} />
        </div>
      )}

      {flagged.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Flagged Pages ({flagged.length})</div>
          <div style={{ maxHeight: 220, overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: 8 }}>
            {flagged.slice(0, 25).map((p: DocumentFlaggedPage) => (
              <div key={p.page_number} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: colors.text.muted, minWidth: 40 }}>p.{p.page_number}</div>
                <SeverityBadge level={p.severity} />
                <div style={{ fontSize: 11, color: colors.text.secondary, flex: 1 }}>
                  {(p.detected_endpoints || []).join(', ') || '—'}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: colors.text.muted }}>
                  {(p.risk_score * 100).toFixed(0)}%
                </div>
              </div>
            ))}
            {flagged.length > 25 && (
              <div style={{ fontSize: 11, color: colors.text.muted, fontStyle: 'italic', padding: '6px 10px' }}>
                …and {flagged.length - 25} more flagged page(s)
              </div>
            )}
          </div>
        </div>
      )}

      {flagged.length === 0 && (
        <div style={{ margin: '12px 0', padding: 10, background: colors.bg.secondary, borderRadius: 8, fontSize: 12, color: colors.text.secondary }}>
          No pages flagged above the threshold. Document analysis completed cleanly.
        </div>
      )}

      {hashShort && (
        <div style={{ marginTop: 12, fontSize: 11, color: colors.text.muted, fontFamily: 'monospace' }}>
          chain-of-custody · sha256:{hashShort}…
        </div>
      )}
    </>
  );
}

export function MediaPage({ data, viewUUID }: { data: ToolResultPayload; viewUUID?: string }) {
  const { toolName, result } = data;

  const titleMap: Record<string, { title: string; subtitle: string }> = {
    analyze_voice: { title: 'Voice Analysis', subtitle: 'Speech, sentiment and acoustic signals' },
    analyze_image: { title: 'Image Analysis', subtitle: 'Visual content and safety classification' },
    analyze_video: { title: 'Video Analysis', subtitle: 'Frame-level content and safety classification' },
    analyze_document: { title: 'Document Analysis', subtitle: 'Page-level content and safety classification' },
  };
  const meta = titleMap[toolName] || { title: 'Media Analysis', subtitle: 'Content and safety classification' };

  return (
    <WidgetShell tool={toolName}>
      <CardHeader title={meta.title} subtitle={meta.subtitle} />
      {toolName === 'analyze_voice' && <VoiceView result={result as VoiceAnalysisResult} />}
      {toolName === 'analyze_image' && <ImageView result={result as ImageAnalysisResult} />}
      {toolName === 'analyze_video' && <VideoView result={result as VideoAnalysisResult} />}
      {toolName === 'analyze_document' && <DocumentView result={result as DocumentAnalysisResult} />}
    </WidgetShell>
  );
}
