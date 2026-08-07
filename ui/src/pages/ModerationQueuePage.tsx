import React from 'react';
import { colors, fonts, radius, severityColor } from '../theme';
import { WidgetShell } from '../components/WidgetShell';
import { useAppContext } from '../context/AppContext';
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

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

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
  skip?: number;
  filters?: Record<string, unknown>;
}

interface Props {
  data: { result: ModerationQueueResult };
}

// ── Analysis trace ───────────────────────────────────────────────────────────

function StepIndicator({ status }: { status: AnalysisStep['status'] }) {
  if (status === 'complete') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-label="complete" role="img" style={{ flex: '0 0 auto' }}>
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
  // An ellipsis rather than a spinner: by the time a human reads the
  // transcript the work has stopped, so an animation would imply live progress
  // that isn't happening.
  return (
    <span
      aria-label={status}
      role="img"
      style={{
        fontSize: 16,
        letterSpacing: 1,
        flex: '0 0 auto',
        color: status === 'running' ? colors.severity.medium : colors.chrome.dim,
      }}
    >
      …
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
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="tq-break"
                style={{
                  fontFamily: fonts.mono,
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: colors.text.onDark,
                }}
              >
                {s.tool}
              </div>
              {s.note && (
                <div style={{ fontSize: 12, color: colors.text.onDarkMuted, marginTop: 2 }}>
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
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: '#7E6524',
        background: '#FCF3E4',
        border: '1px solid #EEDCBB',
        padding: '3px 10px',
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
          borderRadius: radius.tile,
          padding: '18px 20px',
          marginBottom: 18,
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
 * Reason codes accepted by `review_incident`, in the order a moderator is most
 * likely to want them for an escalation.
 */
const REASON_CODES: Array<{ value: string; label: string }> = [
  { value: 'confirmed_accurate', label: 'Confirmed accurate' },
  { value: 'requires_law_enforcement', label: 'Requires law enforcement' },
  { value: 'parent_notified', label: 'Parent notified' },
  { value: 'false_positive', label: 'False positive' },
  { value: 'out_of_context', label: 'Out of context' },
  { value: 'insufficient_severity', label: 'Insufficient severity' },
  { value: 'incorrect_category', label: 'Incorrect category' },
  { value: 'other', label: 'Other' },
];

const buttonBase: React.CSSProperties = {
  flex: 1,
  minWidth: 150,
  borderRadius: radius.inset,
  padding: '13px 0',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: fonts.body,
  cursor: 'pointer',
};

/**
 * Moderator decision controls.
 *
 * These really do call `review_incident` — the moderator clicking the button is
 * the human decision, and routing that through copy-and-paste would have added
 * friction without adding oversight.
 *
 * What it will not do is fire on a single click. `review_incident` is a
 * destructive call that persists an override and emits a signed Art 12 audit
 * receipt, and it requires a `reason_code`. Defaulting that silently would put
 * a value the moderator never chose into a document that is legal evidence, so
 * the button opens a reason picker and the second click commits.
 */
function DecisionActions({
  incidentId,
  action,
  riskLevel,
  onSkip,
}: {
  incidentId?: string;
  action?: string | null;
  riskLevel?: string | null;
  onSkip?: () => void;
}) {
  // The app from context — NOT useToolResult(), which would open a second
  // connection to the host for the same widget.
  const app = useAppContext();
  const callTool = React.useCallback(
    (name: string, args: Record<string, unknown>) =>
      app
        ? app.callServerTool({ name, arguments: args })
        : Promise.reject(new Error('Not connected to the MCP host.')),
    [app],
  );
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState(REASON_CODES[0].value);
  const [state, setState] = React.useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  if (!incidentId) return null;

  const primaryAction = action || 'escalate';

  const commit = async () => {
    if (!pendingAction) return;
    setState('sending');
    setError(null);
    try {
      const args: Record<string, unknown> = {
        incident_id: incidentId,
        action: pendingAction,
        reason_code: reason,
      };
      // The API requires a target level for these two.
      if (pendingAction === 'escalate' || pendingAction === 'downgrade') {
        args.new_risk_level = riskLevel || 'critical';
      }
      await callTool('review_incident', args);
      setState('done');
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : 'The review could not be submitted.');
    }
  };

  if (state === 'done') {
    return (
      <div
        style={{
          marginTop: 20,
          padding: '14px 18px',
          borderRadius: radius.inset,
          background: 'rgba(25,183,155,0.10)',
          border: '1px solid rgba(25,183,155,0.25)',
          fontSize: 13.5,
          fontWeight: 600,
          color: colors.teal.deep,
        }}
        role="status"
      >
        Recorded — {pendingAction} submitted with a signed audit receipt.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setPendingAction(primaryAction)}
          style={{
            ...buttonBase,
            border: 'none',
            background: pendingAction === primaryAction ? colors.ink.base : severityColor('critical'),
            color: '#fff',
          }}
        >
          {titleCase(primaryAction)}
        </button>
        <button
          type="button"
          onClick={() => callTool('get_incident', { incident_id: incidentId })}
          style={{
            ...buttonBase,
            border: `1px solid ${colors.border}`,
            background: colors.bg.primary,
            color: colors.text.primary,
          }}
        >
          View full analysis
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={!onSkip}
          style={{
            ...buttonBase,
            border: `1px solid ${colors.border}`,
            background: colors.bg.primary,
            color: onSkip ? colors.text.primary : colors.text.faint,
            cursor: onSkip ? 'pointer' : 'not-allowed',
          }}
        >
          Skip to next
        </button>
      </div>

      {pendingAction && (
        <div
          style={{
            marginTop: 14,
            padding: '16px 18px',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.inset,
            background: colors.bg.secondary,
          }}
        >
          <Eyebrow style={{ marginBottom: 8 }}>Reason for {pendingAction}</Eyebrow>
          <p style={{ fontSize: 12.5, color: colors.text.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
            This is recorded on a signed audit receipt, so it has to be your choice rather than a
            default.
          </p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Reason code"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: radius.chip,
              border: `1px solid ${colors.border}`,
              background: colors.bg.primary,
              color: colors.text.primary,
              fontSize: 13.5,
              fontFamily: fonts.body,
              marginBottom: 12,
            }}
          >
            {REASON_CODES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={commit}
              disabled={state === 'sending'}
              style={{
                ...buttonBase,
                flex: '0 0 auto',
                minWidth: 0,
                padding: '10px 18px',
                border: 'none',
                background: severityColor('critical'),
                color: '#fff',
                opacity: state === 'sending' ? 0.7 : 1,
              }}
            >
              {state === 'sending' ? 'Submitting…' : `Confirm ${pendingAction}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingAction(null);
                setState('idle');
              }}
              style={{
                ...buttonBase,
                flex: '0 0 auto',
                minWidth: 0,
                padding: '10px 18px',
                border: `1px solid ${colors.border}`,
                background: colors.bg.primary,
                color: colors.text.primary,
              }}
            >
              Cancel
            </button>
          </div>
          {error && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: severityColor('high') }} role="alert">
              {error}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ModerationQueuePage({ data }: Props) {
  const r = data.result;
  const app = useAppContext();
  const callTool = React.useCallback(
    (name: string, args: Record<string, unknown>) =>
      app ? app.callServerTool({ name, arguments: args }) : Promise.resolve(null),
    [app],
  );
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

      <div className="tq-stat-grid-3" style={{ marginBottom: 22 }}>
        {/* A deeper-than-one-page queue reports its floor, not a false exact count. */}
        <StatTile
          centered
          label="In queue"
          value={r.in_queue_is_partial ? `${r.in_queue}+` : r.in_queue}
          hint={r.in_queue_is_partial ? 'more behind this page' : undefined}
        />
        <StatTile centered label="Reviewed" value={r.reviewed_count ?? '—'} />
        <StatTile centered label="Avg time" value={avgTime} valueColor={colors.teal.deep} />
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
                background: '#FBEDE8',
                border: '1px solid #F2D6CC',
                borderRadius: radius.tile,
                padding: '16px 20px',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: 16,
                  color: severityColor(r.risk_level || 'critical'),
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

          <DecisionActions
            incidentId={item?.id}
            action={r.recommended_action}
            riskLevel={r.risk_level}
            onSkip={() =>
              callTool('moderation_queue', {
                ...(r.filters ?? {}),
                operator_name: r.operator_name ?? undefined,
                skip: (r.skip ?? 0) + 1,
              })
            }
          />
        </>
      )}
    </WidgetShell>
  );
}
