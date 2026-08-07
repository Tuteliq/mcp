import React from 'react';
import { colors, fonts, radius, severityColor } from '../theme';
import { WidgetShell } from '../components/WidgetShell';
import {
  CardHeader,
  BrandLockup,
  StatTile,
  Panel,
  Eyebrow,
  Callout,
  EmptyState,
} from '../components/primitives';

/**
 * Moderator triage console.
 *
 * Two data sources meet here, and the card is careful about which is which:
 * the queue and the item under review come from the Tuteliq API, while the
 * analysis trace, reasoning and recommendation are the calling assistant's own
 * working, passed in as tool parameters. A moderator signing off on an
 * escalation needs to know which parts are measurements and which are an
 * assistant's argument.
 */

interface AnalysisStep {
  tool: string;
  note?: string;
  status: 'complete' | 'running' | 'pending';
}

interface QueueItem {
  id: string;
  content?: string | null;
  user?: string | null;
  platform?: string | null;
  age_group?: string | null;
  status: string;
  risk_category?: string | null;
  risk_level?: string | null;
  encrypted?: boolean;
}

interface ModerationQueueResult {
  /** Supplied by the caller. Never defaulted to a brand name. */
  operator_name?: string | null;
  in_queue: number;
  /** True when the queue is deeper than one page, so `in_queue` is a floor. */
  in_queue_is_partial?: boolean;
  reviewed_count?: number | null;
  avg_review_seconds?: number | null;
  next_item?: QueueItem | null;
  analysis?: AnalysisStep[];
  reasoning?: string | null;
  recommended_action?: string | null;
  confidence?: number | null;
  risk_level?: string | null;
  pattern_match?: string | null;
}

interface Props {
  data: { result: ModerationQueueResult };
}

// ── Analysis trace ───────────────────────────────────────────────────────────

function StepIndicator({ status }: { status: AnalysisStep['status'] }) {
  if (status === 'complete') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="complete" role="img">
        <path
          d="M20 6L9 17l-5-5"
          stroke={colors.teal.base}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === 'running') {
    // Three dots rather than a spinner: the transcript is static by the time a
    // human reads it, so a spinning element would imply live progress that
    // isn't happening.
    return (
      <span
        aria-label="running"
        role="img"
        style={{ color: colors.warningOnDark, fontWeight: 700, letterSpacing: 1, fontSize: 14 }}
      >
        •••
      </span>
    );
  }
  return (
    <span
      aria-label="pending"
      role="img"
      style={{ color: colors.chrome.dim, fontWeight: 700, letterSpacing: 1, fontSize: 14 }}
    >
      •••
    </span>
  );
}

function AnalysisTrace({ steps }: { steps: AnalysisStep[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <>
      <Eyebrow style={{ marginBottom: 10 }}>Analysis in progress</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => (
          <div
            key={`${s.tool}-${i}`}
            style={{
              background: colors.ink.base,
              borderRadius: radius.inset,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="tq-break"
                style={{
                  fontFamily: fonts.mono,
                  fontWeight: 600,
                  fontSize: 14,
                  color: colors.text.onDark,
                }}
              >
                {s.tool}
              </div>
              {s.note && (
                <div style={{ fontSize: 13, color: colors.text.onDarkMuted, marginTop: 3 }}>
                  {s.note}
                </div>
              )}
            </div>
            <span style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
              <StepIndicator status={s.status} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Queue item ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: colors.locked,
        background: 'rgba(180,134,63,0.10)',
        border: '1px solid rgba(180,134,63,0.30)',
        padding: '4px 12px',
        borderRadius: radius.pill,
        whiteSpace: 'nowrap',
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function NextItem({ item }: { item: QueueItem }) {
  const meta = [
    item.user && `User: ${item.user}`,
    item.platform && `Platform: ${item.platform}`,
    item.age_group && `Age: ${item.age_group}`,
  ].filter(Boolean);

  return (
    <>
      <Eyebrow style={{ marginBottom: 10 }}>Next item for review</Eyebrow>
      <div
        style={{
          background: colors.bg.secondary,
          borderRadius: radius.inset,
          padding: '18px 20px',
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <span
            className="tq-break"
            style={{ fontFamily: fonts.mono, fontSize: 13.5, color: colors.text.primary }}
          >
            ID: {item.id}
          </span>
          <StatusChip status={item.status} />
        </div>

        {item.encrypted ? (
          <div style={{ fontSize: 14, color: colors.locked, fontStyle: 'italic' }}>
            Encrypted — decrypt client-side to review the content.
          </div>
        ) : item.content ? (
          <blockquote style={{ fontSize: 15, lineHeight: 1.55, color: colors.text.primary, margin: 0 }}>
            “{item.content}”
          </blockquote>
        ) : (
          <div style={{ fontSize: 14, color: colors.text.muted }}>No content preview available.</div>
        )}

        {meta.length > 0 && (
          <div style={{ fontSize: 13, color: colors.text.muted, marginTop: 12 }}>
            {meta.join(' · ')}
          </div>
        )}
      </div>
    </>
  );
}

// ── Decision ─────────────────────────────────────────────────────────────────

/**
 * Action buttons.
 *
 * Rendered as buttons because the design calls for them, but they do not
 * mutate anything — widgets are read-only renderers, and a moderation decision
 * must go through the host so the human-in-the-loop approval step is preserved.
 * Each copies the exact `review_incident` call to run instead.
 */
function DecisionActions({ incidentId, action }: { incidentId?: string; action?: string | null }) {
  const [copied, setCopied] = React.useState<string | null>(null);

  if (!incidentId) return null;

  const call = (a: string) =>
    `review_incident(incident_id="${incidentId}", action="${a}")`;

  const copy = (a: string) => {
    navigator.clipboard
      ?.writeText(call(a))
      .then(() => {
        setCopied(a);
        setTimeout(() => setCopied(null), 1800);
      })
      .catch(() => {});
  };

  const primary = action || 'escalate';
  const options: Array<{ key: string; label: string; primary?: boolean }> = [
    { key: primary, label: `Copy ${primary} call`, primary: true },
    { key: 'confirm', label: 'Copy confirm call' },
    { key: 'dismiss', label: 'Copy dismiss call' },
  ];

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginTop: 20,
        }}
      >
        {options.map((o) => {
          const isCopied = copied === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => copy(o.key)}
              style={{
                padding: '13px 18px',
                borderRadius: radius.inset,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: fonts.body,
                cursor: 'pointer',
                border: o.primary ? 'none' : `1px solid ${colors.border}`,
                background: o.primary
                  ? isCopied
                    ? colors.teal.deep
                    : severityColor('high')
                  : isCopied
                    ? colors.bg.tertiary
                    : colors.bg.primary,
                color: o.primary ? '#fff' : colors.text.primary,
                transition: 'background 0.15s',
              }}
            >
              {isCopied ? 'Copied' : o.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 10, lineHeight: 1.5 }}>
        Decisions are not applied from this card. Copying runs nothing — paste the call so your
        host can ask you to approve it.
      </div>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

export function ModerationQueuePage({ data }: Props) {
  const r = data.result;
  const item = r.next_item;

  // The operator name is caller-supplied and frequently absent. It is never
  // defaulted to a placeholder — an unbranded header is correct, an invented
  // company name is not.
  const title = r.operator_name ? `${r.operator_name} Moderator` : 'Moderation Queue';

  const avgTime =
    r.avg_review_seconds != null && Number.isFinite(r.avg_review_seconds)
      ? r.avg_review_seconds >= 60
        ? `${(r.avg_review_seconds / 60).toFixed(1)}m`
        : `${r.avg_review_seconds.toFixed(1)}s`
      : '—';

  return (
    <WidgetShell tool="moderation_queue">
      <CardHeader
        title={title}
        subtitle="Powered by Tuteliq MCP for content safety analysis"
        icon={null}
        right={<BrandLockup />}
      />

      <div className="tq-kpi-grid" style={{ marginBottom: 26 }}>
        {/* A deeper-than-one-page queue reports its floor, not a false exact count. */}
        <StatTile
          label="In queue"
          value={r.in_queue_is_partial ? `${r.in_queue}+` : r.in_queue}
          hint={r.in_queue_is_partial ? 'more behind this page' : undefined}
          accent={colors.ink.base}
        />
        <StatTile
          label="Reviewed"
          value={r.reviewed_count ?? '—'}
          accent={colors.ink.base}
        />
        <StatTile label="Avg time" value={avgTime} accent={colors.teal.base} />
      </div>

      {item ? (
        <Panel style={{ marginBottom: 26 }}>
          <NextItem item={item} />
          <AnalysisTrace steps={r.analysis ?? []} />
        </Panel>
      ) : (
        <EmptyState>Queue is clear — nothing is waiting for review.</EmptyState>
      )}

      {(r.recommended_action || r.reasoning) && (
        <>
          <Eyebrow style={{ marginBottom: 10 }}>Recommended decision</Eyebrow>

          {r.recommended_action && (
            <div
              style={{
                background: 'rgba(194,84,58,0.07)',
                border: '1px solid rgba(194,84,58,0.20)',
                borderRadius: radius.inset,
                padding: '18px 22px',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: 19,
                  color: severityColor(r.risk_level || 'high'),
                }}
              >
                {titleCase(r.recommended_action)}
              </div>
              {r.confidence != null && (
                <div className="tq-tabular" style={{ fontSize: 13.5, color: colors.text.body, marginTop: 3 }}>
                  Confidence: {Math.round(r.confidence * 100)}%
                </div>
              )}
            </div>
          )}

          {/* Labelled as the assistant's argument, not a Tuteliq measurement. */}
          {r.reasoning && (
            <Callout title="Assistant reasoning" style={{ marginBottom: 20 }}>
              {r.reasoning}
            </Callout>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 16,
            }}
          >
            {r.risk_level && (
              <div>
                <Eyebrow style={{ marginBottom: 4 }}>Risk level</Eyebrow>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: 18,
                    color: severityColor(r.risk_level),
                  }}
                >
                  {titleCase(r.risk_level)}
                </div>
              </div>
            )}
            {r.pattern_match && (
              <div>
                <Eyebrow style={{ marginBottom: 4 }}>Pattern match</Eyebrow>
                <div
                  className="tq-tabular"
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: 18,
                    color: colors.text.primary,
                  }}
                >
                  {r.pattern_match}
                </div>
              </div>
            )}
            {r.recommended_action && (
              <div>
                <Eyebrow style={{ marginBottom: 4 }}>Action</Eyebrow>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: 18,
                    color: colors.text.primary,
                  }}
                >
                  {titleCase(r.recommended_action)}
                </div>
              </div>
            )}
          </div>

          <DecisionActions incidentId={item?.id} action={r.recommended_action} />
        </>
      )}
    </WidgetShell>
  );
}
