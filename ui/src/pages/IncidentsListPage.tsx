import React, { useState } from 'react';
import { colors, fontFamily, severityColor } from '../theme';
import { IncidentHeader } from '../components/IncidentHeader';

interface IncidentRow {
  id: string;
  risk_category: string;
  risk_level: string;
  confidence_score: number | null;
  detected_patterns: string[];
  platform: string | null;
  source: string;
  status: string;
  external_id: string | null;
  customer_id: string | null;
  created_at: string;
  summary?: string | Record<string, unknown> | null;
  _e2e_envelope_fields?: string[];
}

interface ListResult {
  incidents: IncidentRow[];
  next_cursor: string | null;
  total_returned: number;
}

interface Props { data: { result: ListResult } }

const severityChip = (level: string) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.4,
  background: `${severityColor(level)}22`,
  color: severityColor(level),
  border: `1px solid ${severityColor(level)}55`,
});

const statusChip = (status: string) => {
  const c = status === 'new' ? colors.severity.medium
    : status === 'reviewing' ? colors.severity.low
    : status === 'escalated' ? colors.severity.high
    : status === 'resolved' ? colors.severity.safe
    : status === 'dismissed' ? colors.text.muted
    : colors.text.muted;
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    background: `${c}22`,
    color: c,
    border: `1px solid ${c}55`,
  };
};

const shortDate = (iso: string) => {
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} ${time}`;
};

const summaryPreview = (s: IncidentRow['summary'], envelopeFields?: string[]) => {
  const isEnvelope = envelopeFields?.includes('summary');
  if (isEnvelope) {
    return (
      <span style={{ color: colors.text.muted, fontStyle: 'italic' }}>
        🔒 Encrypted — decrypt client-side
      </span>
    );
  }
  if (typeof s === 'string') {
    return s.length > 120 ? s.slice(0, 120) + '…' : s;
  }
  if (s == null) return <span style={{ color: colors.text.muted }}>—</span>;
  return <span style={{ color: colors.text.muted }}>(object)</span>;
};

export function IncidentsListPage({ data }: Props) {
  const r = data.result;
  const hasSummaryColumn = r.incidents.some(i => i.summary !== undefined);

  // V3.15.8 — multi-select state. Builds the input for batch_review_incidents
  // when the moderator hits a bulk action. We don't actually call the API
  // from the widget (MCP widgets are read-only renderers by design); we
  // surface the selected ids as a copy-ready batch_review_incidents call
  // the moderator can fire from their MCP host. That preserves the
  // host-side approval flow (human-in-the-loop on every mutating call).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected(prev =>
      prev.size === r.incidents.length ? new Set() : new Set(r.incidents.map(i => i.id)),
    );
  };
  const allSelected = selected.size > 0 && selected.size === r.incidents.length;
  const someSelected = selected.size > 0;

  return (
    <div style={{ fontFamily, color: colors.text.primary }}>
      <IncidentHeader
        title="Incidents"
        subtitle={`${r.total_returned} returned${r.next_cursor ? ' · more pages available' : ' · final page'}`}
      />

      {/* V3.15.8 — bulk action bar. Hidden when nothing is selected so the
          empty-queue case stays clean. */}
      {someSelected && (
        <div
          style={{
            background: colors.brand.primary,
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 10,
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 700 }}>
            {selected.size} selected
          </span>
          <span style={{ flex: 1, fontSize: 11, opacity: 0.8 }}>
            Use these IDs with <code style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: 3, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>batch_review_incidents</code> to dismiss / confirm / escalate in one call:
          </span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(Array.from(selected).join(','))}
            style={{
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              fontSize: 10,
              cursor: 'pointer',
              fontFamily,
              fontWeight: 600,
            }}
          >
            Copy {selected.size} IDs
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              fontSize: 10,
              cursor: 'pointer',
              fontFamily,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {r.incidents.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '24px', textAlign: 'center', color: colors.text.muted, fontSize: 13 }}>
          No incidents matched the filters.
        </div>
      ) : (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Select-all toggle header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderBottom: `1px solid ${colors.border}`,
              background: colors.bg.secondary,
              fontSize: 11,
              color: colors.text.muted,
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={toggleAll}
              style={{ cursor: 'pointer' }}
              aria-label="Select all incidents on this page"
            />
            <span>
              {someSelected
                ? allSelected
                  ? 'All on this page selected · click to deselect'
                  : `${selected.size} of ${r.incidents.length} selected`
                : 'Select all on this page'}
            </span>
          </div>

          {r.incidents.map((inc, idx) => (
            <div
              key={inc.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 12,
                padding: '12px 14px',
                borderBottom: idx < r.incidents.length - 1 ? `1px solid ${colors.border}` : 'none',
                alignItems: 'start',
                background: selected.has(inc.id) ? `${colors.brand.primaryLight}08` : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(inc.id)}
                onChange={() => toggle(inc.id)}
                style={{ marginTop: 3, cursor: 'pointer' }}
                aria-label={`Select incident ${inc.id}`}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={severityChip(inc.risk_level)}>{inc.risk_level}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary }}>{inc.risk_category}</span>
                  <span style={statusChip(inc.status)}>{inc.status}</span>
                  <span style={{ fontSize: 10, color: colors.text.muted }}>
                    · {inc.source} · {shortDate(inc.created_at)}
                  </span>
                  {inc.platform && (
                    <span style={{ fontSize: 10, color: colors.text.muted }}>· {inc.platform}</span>
                  )}
                </div>
                {hasSummaryColumn && (
                  <div style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 4, lineHeight: 1.4 }}>
                    {summaryPreview(inc.summary, inc._e2e_envelope_fields)}
                  </div>
                )}
                {inc.detected_patterns.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {inc.detected_patterns.slice(0, 4).map(p => (
                      <span key={p} style={{ fontSize: 9, padding: '1px 6px', background: colors.bg.secondary, color: colors.text.secondary, borderRadius: 4 }}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                {(inc.external_id || inc.customer_id) && (
                  <div style={{ fontSize: 10, color: colors.text.muted, marginTop: 4 }}>
                    {inc.external_id && <>ext: <code style={{ background: colors.bg.tertiary, padding: '0 4px', borderRadius: 3 }}>{inc.external_id}</code> </>}
                    {inc.customer_id && <>cust: <code style={{ background: colors.bg.tertiary, padding: '0 4px', borderRadius: 3 }}>{inc.customer_id}</code></>}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: colors.text.muted, fontFamily: 'monospace', textAlign: 'right' }}>
                {inc.id.slice(0, 8)}…
                {inc.confidence_score != null && (
                  <div style={{ marginTop: 4 }}>conf {(inc.confidence_score * 100).toFixed(0)}%</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {r.next_cursor && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: colors.bg.secondary, borderRadius: 8, fontSize: 10, color: colors.text.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          <strong style={{ color: colors.text.secondary }}>Next cursor:</strong> {r.next_cursor}
        </div>
      )}
    </div>
  );
}
