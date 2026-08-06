import React, { useState } from 'react';
import { colors, fonts, radius } from '../theme';
import { WidgetShell } from '../components/WidgetShell';
import {
  CardHeader,
  BrandLockup,
  SeverityChip,
  StatusPill,
  Tag,
  EmptyState,
} from '../components/primitives';

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

interface Props {
  data: { result: ListResult };
}

// ── Formatting ───────────────────────────────────────────────────────────────

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
};

/**
 * Relative age next to the absolute timestamp.
 *
 * A moderator triaging a queue reasons in "how stale is this", not in wall
 * clock — but the absolute time still has to be there for the case notes.
 */
function relativeAge(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(mins) || mins < 0) return '';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = Boolean(indeterminate);
      }}
      onChange={onChange}
      aria-label={label}
      style={{ width: 15, height: 15, accentColor: colors.ink.base, cursor: 'pointer', flex: '0 0 auto' }}
    />
  );
}

/** Envelope fields arrive encrypted; the widget can't and shouldn't decrypt them. */
function SummaryCell({ summary, envelopeFields }: { summary: IncidentRow['summary']; envelopeFields?: string[] }) {
  if (envelopeFields?.includes('summary')) {
    return (
      <div style={{ fontSize: 13, color: colors.locked, fontStyle: 'italic' }}>
        Encrypted — decrypt client-side
      </div>
    );
  }
  if (typeof summary === 'string' && summary) {
    return (
      <div style={{ fontSize: 13, color: colors.text.body, lineHeight: 1.45 }}>
        {summary.length > 160 ? `${summary.slice(0, 160)}…` : summary}
      </div>
    );
  }
  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function IncidentsListPage({ data }: Props) {
  const r = data.result;

  // Widgets are read-only renderers by design — mutating calls go through the
  // host so the human-in-the-loop approval step is preserved. Selection here
  // just assembles the ID list for a `batch_review_incidents` call the
  // moderator fires themselves.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => (prev.size === r.incidents.length ? new Set() : new Set(r.incidents.map((i) => i.id))));

  const allSelected = selected.size > 0 && selected.size === r.incidents.length;
  const someSelected = selected.size > 0;

  const copyIds = () => {
    navigator.clipboard
      ?.writeText(Array.from(selected).join(','))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };

  const avgConfidence = (() => {
    const scores = r.incidents.map((i) => i.confidence_score).filter((s): s is number => s != null);
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
  })();

  const subtitle = [
    `${r.total_returned} returned`,
    r.next_cursor ? 'more pages available' : 'final page',
    avgConfidence != null ? `avg. confidence ${avgConfidence}%` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <WidgetShell tool="list_incidents">
      <CardHeader title="Incidents" subtitle={subtitle} icon={null} right={<BrandLockup />} />

      {r.incidents.length === 0 ? (
        <EmptyState>No incidents matched the filters.</EmptyState>
      ) : (
        <>
          {someSelected && (
            <div
              style={{
                background: colors.ink.base,
                color: colors.text.onDark,
                padding: '10px 16px',
                borderRadius: radius.inset,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                fontSize: 12.5,
              }}
            >
              <span style={{ fontWeight: 700 }}>{selected.size} selected</span>
              <span style={{ flex: 1, minWidth: 200, color: colors.text.onDarkMuted }}>
                Pass these IDs to{' '}
                <code style={{ fontFamily: fonts.mono, color: colors.teal.soft }}>batch_review_incidents</code> to
                dismiss, confirm or escalate in one call.
              </span>
              <button
                type="button"
                onClick={copyIds}
                style={{
                  padding: '5px 12px',
                  background: copied ? colors.teal.deep : 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: radius.chip,
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: fonts.body,
                  cursor: 'pointer',
                }}
              >
                {copied ? 'Copied' : `Copy ${selected.size} IDs`}
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                style={{
                  padding: '5px 12px',
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: radius.chip,
                  fontSize: 11.5,
                  fontFamily: fonts.body,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 4px',
                color: colors.text.muted,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleAll}
                label="Select all incidents on this page"
              />
              {someSelected
                ? allSelected
                  ? 'All on this page selected · click to deselect'
                  : `${selected.size} of ${r.incidents.length} selected`
                : 'Select all on this page'}
            </label>

            {r.incidents.map((inc) => {
              const age = relativeAge(inc.created_at);
              return (
                <div
                  key={inc.id}
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '16px 4px',
                    borderTop: `1px solid ${colors.borderSubtle}`,
                    alignItems: 'flex-start',
                    background: selected.has(inc.id) ? 'rgba(25,183,155,0.05)' : undefined,
                  }}
                >
                  <div style={{ marginTop: 3 }}>
                    <Checkbox
                      checked={selected.has(inc.id)}
                      onChange={() => toggle(inc.id)}
                      label={`Select incident ${inc.id}`}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <SeverityChip level={inc.risk_level} />
                      <span style={{ fontWeight: 700, color: colors.text.primary, fontSize: 14.5 }}>
                        {inc.risk_category}
                      </span>
                      <StatusPill>{inc.status}</StatusPill>
                      <span style={{ fontSize: 12.5, color: colors.text.muted }}>
                        · {inc.source}
                        {inc.platform ? ` · ${inc.platform}` : ''} · {shortDate(inc.created_at)}
                        {age ? ` (${age})` : ''}
                      </span>
                    </div>

                    <SummaryCell summary={inc.summary} envelopeFields={inc._e2e_envelope_fields} />

                    {inc.detected_patterns.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
                        {inc.detected_patterns.slice(0, 4).map((p) => (
                          <Tag key={p}>{p}</Tag>
                        ))}
                        {inc.detected_patterns.length > 4 && (
                          <Tag>+{inc.detected_patterns.length - 4}</Tag>
                        )}
                      </div>
                    )}

                    {(inc.external_id || inc.customer_id) && (
                      <div className="tq-break" style={{ fontSize: 11, color: colors.text.faint, fontFamily: fonts.mono }}>
                        {inc.external_id && <>ext: {inc.external_id}&nbsp;&nbsp;</>}
                        {inc.customer_id && <>cust: {inc.customer_id}</>}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      textAlign: 'right',
                      flex: '0 0 auto',
                      fontSize: 12,
                      color: colors.text.faint,
                      fontFamily: fonts.mono,
                    }}
                  >
                    {inc.id.slice(0, 8)}…
                    {inc.confidence_score != null && (
                      <div className="tq-tabular" style={{ color: colors.text.muted, marginTop: 2 }}>
                        {Math.round(inc.confidence_score * 100)}% confidence
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {r.next_cursor && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                background: colors.bg.tertiary,
                borderRadius: radius.inset,
                fontSize: 11,
                color: colors.text.muted,
                fontFamily: fonts.mono,
                wordBreak: 'break-all',
              }}
            >
              <strong style={{ color: colors.text.secondary }}>next_cursor:</strong> {r.next_cursor}
            </div>
          )}
        </>
      )}
    </WidgetShell>
  );
}
