import React from 'react';
import { colors, fontFamily, severityColor } from '../theme';
import { IncidentHeader } from '../components/IncidentHeader';

interface IncidentDetail {
  id: string;
  risk_category: string;
  risk_level: string;
  confidence_score: number | null;
  detected_patterns: string[];
  emotional_indicators?: string[];
  recommended_actions?: string[];
  platform: string | null;
  language: string | null;
  source: string;
  file_id: string | null;
  status: string;
  external_id: string | null;
  customer_id: string | null;
  created_at: string;
  summary: string | Record<string, unknown> | null;
  metadata?: string | Record<string, unknown> | null;
  source_data?: Record<string, unknown> | null;
  visual_categories?: string[] | null;
  visual_severity?: string | null;
  visual_confidence?: number | null;
  contains_text?: boolean | null;
  contains_faces?: boolean | null;
  review?: Record<string, unknown> | null;
  _e2e_envelope_fields?: string[];
}

interface Props { data: { result: IncidentDetail } }

function MetaRow({ label, value, code }: { label: string; value: React.ReactNode; code?: boolean }) {
  return (
    <>
      <div style={{ color: colors.text.muted, fontSize: 11 }}>{label}</div>
      <div style={{ fontSize: 12, color: colors.text.primary, fontFamily: code ? 'monospace' : undefined, wordBreak: code ? 'break-all' : undefined }}>{value ?? '—'}</div>
    </>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = color ?? colors.brand.primaryLight;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 500,
        background: `${c}22`,
        color: c,
        border: `1px solid ${c}55`,
        marginRight: 4,
        marginBottom: 4,
      }}
    >
      {children}
    </span>
  );
}

export function IncidentDetailPage({ data }: Props) {
  const i = data.result;
  const sev = severityColor(i.risk_level);
  const envelopeFields = i._e2e_envelope_fields ?? [];

  const renderField = (fieldName: 'summary' | 'metadata', value: string | Record<string, unknown> | null | undefined) => {
    if (envelopeFields.includes(fieldName)) {
      return (
        <div style={{ padding: '10px 12px', background: `${colors.severity.medium}11`, border: `1px dashed ${colors.severity.medium}66`, borderRadius: 8, fontSize: 11, color: colors.text.secondary }}>
          🔒 <strong>Encrypted</strong> — this field is wrapped in a BYOK hybrid envelope. Decrypt client-side with your RSA private key (registered fingerprint visible via <code>get_encryption_key</code>).
        </div>
      );
    }
    if (typeof value === 'string') {
      return <div style={{ fontSize: 12, color: colors.text.primary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{value}</div>;
    }
    if (value == null) return <div style={{ color: colors.text.muted, fontSize: 11 }}>—</div>;
    return (
      <pre style={{ fontSize: 10, background: colors.bg.tertiary, padding: 8, borderRadius: 6, overflowX: 'auto', maxHeight: 200 }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  };

  return (
    <div style={{ fontFamily, color: colors.text.primary }}>
      <IncidentHeader
        title={`${i.risk_category} · ${i.risk_level}`}
        subtitle={`Incident ${i.id}`}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        }
      />

      {/* Top banner with severity */}
      <div
        style={{
          background: `${sev}11`,
          border: `1px solid ${sev}44`,
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ width: 8, height: 36, background: sev, borderRadius: 4 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
            Severity
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: sev, textTransform: 'capitalize' }}>{i.risk_level}</div>
        </div>
        {i.confidence_score != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
              Confidence
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.text.primary }}>{(i.confidence_score * 100).toFixed(0)}%</div>
          </div>
        )}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
            Status
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text.primary, textTransform: 'capitalize' }}>{i.status}</div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
          Summary
        </div>
        {renderField('summary', i.summary)}
      </div>

      {/* Metadata grid */}
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
          Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 16px', alignItems: 'baseline' }}>
          <MetaRow label="Created" value={new Date(i.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'} />
          <MetaRow label="Source" value={i.source} />
          {i.platform && <MetaRow label="Platform" value={i.platform} />}
          {i.language && <MetaRow label="Language" value={i.language} />}
          {i.file_id && <MetaRow label="File ID" value={i.file_id} code />}
          {i.external_id && <MetaRow label="External ID" value={i.external_id} code />}
          {i.customer_id && <MetaRow label="Customer ID" value={i.customer_id} code />}
        </div>
      </div>

      {/* Detected patterns */}
      {i.detected_patterns.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Detected Patterns
          </div>
          <div>{i.detected_patterns.map(p => <Chip key={p} color={sev}>{p}</Chip>)}</div>
        </div>
      )}

      {/* Recommended actions */}
      {i.recommended_actions && i.recommended_actions.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Recommended Actions
          </div>
          <div>{i.recommended_actions.map(a => <Chip key={a} color={colors.brand.primaryLight}>{a}</Chip>)}</div>
        </div>
      )}

      {/* Vision summary (image/video incidents) */}
      {(i.visual_categories?.length || i.visual_severity || i.contains_text != null) && (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Vision Signals
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 16px' }}>
            {i.visual_severity && <MetaRow label="Visual severity" value={i.visual_severity} />}
            {i.visual_confidence != null && <MetaRow label="Visual confidence" value={`${(i.visual_confidence * 100).toFixed(0)}%`} />}
            {i.contains_text != null && <MetaRow label="Contains text" value={i.contains_text ? 'yes' : 'no'} />}
            {i.contains_faces != null && <MetaRow label="Contains faces" value={i.contains_faces ? 'yes' : 'no'} />}
          </div>
          {i.visual_categories && i.visual_categories.length > 0 && (
            <div style={{ marginTop: 8 }}>{i.visual_categories.map(c => <Chip key={c}>{c}</Chip>)}</div>
          )}
        </div>
      )}

      {/* Metadata field (may be hybrid envelope) */}
      {(i.metadata !== undefined && i.metadata !== null) && (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Metadata
          </div>
          {renderField('metadata', i.metadata)}
        </div>
      )}

      {/* Source data (non-content metadata only — V3.15.4 no-user-content enforcement) */}
      {i.source_data && Object.keys(i.source_data).length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Source Metadata <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: colors.text.muted }}>(non-content only)</span>
          </div>
          <pre style={{ fontSize: 10, background: colors.bg.tertiary, padding: 8, borderRadius: 6, overflowX: 'auto' }}>
            {JSON.stringify(i.source_data, null, 2)}
          </pre>
        </div>
      )}

      {/* Review history */}
      {i.review && Object.keys(i.review).length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Moderator Review (Art 14)
          </div>
          <pre style={{ fontSize: 10, background: colors.bg.tertiary, padding: 8, borderRadius: 6, overflowX: 'auto' }}>
            {JSON.stringify(i.review, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
