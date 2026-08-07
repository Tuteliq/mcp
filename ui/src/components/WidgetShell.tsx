import React from 'react';
import { colors, fonts, radius, shadow } from '../theme';
import { useAppContext } from '../context/AppContext';

/**
 * The Tuteliq brand mark, inline.
 *
 * Replaces the 8KB base64 PNG this used to be: vector stays sharp at any DPI,
 * inherits colour, and costs ~700 bytes in every widget bundle.
 */
export function TuteliqMark({ size = 20, dark = false }: { size?: number; dark?: boolean }) {
  const stroke = dark ? colors.ink.base : colors.text.onDark;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flex: '0 0 auto', display: 'block' }}
    >
      <path
        d="M 50 6 C 62 6.2 76 7.6 83.3 11.2 C 90 14.6 93.6 19 93.6 25.2 C 93.6 34 92 44 88.9 53.2 C 86.5 60.3 84 65.6 80.7 70.7 C 77.5 75.8 74 80.5 69.1 84.7 C 63.5 89.4 57 93 50 94 C 43 93 36.5 89.4 30.9 84.7 C 26 80.5 22.5 75.8 19.3 70.7 C 16 65.6 13.5 60.3 11.1 53.2 C 8 44 6.4 34 6.4 25.2 C 6.4 19 10 14.6 16.7 11.2 C 24 7.6 38 6.2 50 6 Z"
        fill="none"
        stroke={stroke}
        strokeWidth="6"
      />
      <g stroke={stroke} strokeWidth="3">
        <line x1="38.4" y1="50.2" x2="46.3" y2="38.5" />
        <line x1="61.6" y1="50.2" x2="53.7" y2="38.5" />
        <line x1="43.5" y1="59" x2="56.5" y2="59" />
      </g>
      <circle cx="50" cy="29.3" r="8" fill={colors.teal.base} />
      <circle cx="34" cy="58" r="7.5" fill={stroke} />
      <circle cx="66" cy="58" r="7.5" fill={stroke} />
    </svg>
  );
}

/**
 * Open a URL through the MCP host so the link lands in the user's browser
 * rather than inside the sandboxed widget iframe. Falls back to copying the
 * URL, which is the most useful thing we can still do when the host declines.
 */
export function useOpenLink() {
  const app = useAppContext();
  return React.useCallback(
    (url: string, event?: React.MouseEvent) => {
      event?.preventDefault();
      const copy = () => navigator.clipboard?.writeText(url).catch(() => {});
      if (app) app.openLink({ url }).catch(copy);
      else copy();
    },
    [app],
  );
}

// ── Chrome bar ───────────────────────────────────────────────────────────────

/**
 * Names the tool that produced this card.
 *
 * A transcript can hold a dozen widgets from a dozen tools; without this the
 * user has to scroll back to their own prompt to work out which is which. The
 * tool name is mono because it is a literal API identifier the user may want
 * to copy into their own code.
 */
function ChromeBar({ tool, version }: { tool: React.ReactNode; version: string }) {
  return (
    <div
      style={{
        background: colors.ink.black,
        // Longhand, NOT `padding: '14px 0'`. The shorthand sets all four sides
        // inline, which beats the horizontal padding the gutter class supplies
        // — that is what left the logo flush against the card edge.
        paddingTop: 14,
        paddingBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
      className="tq-chrome-gutter"
    >
      <TuteliqMark size={20} />
      <span style={{ fontSize: 13, color: colors.chrome.label, fontWeight: 500 }}>Tuteliq</span>
      <span style={{ width: 1, height: 14, background: colors.ink.border }} />
      <span
        style={{
          fontSize: 13,
          color: colors.text.secondary,
          fontFamily: fonts.mono,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {tool}
      </span>
      <span
        style={{
          fontSize: 10,
          color: colors.chrome.mid,
          fontFamily: fonts.mono,
          border: `1px solid ${colors.ink.border}`,
          borderRadius: radius.xs,
          padding: '1px 6px',
          flex: '0 0 auto',
        }}
      >
        {version}
      </span>
      <span
        aria-hidden="true"
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: colors.chrome.dim,
          fontFamily: fonts.mono,
          flex: '0 0 auto',
        }}
      >
        &lt;/&gt;
      </span>
    </div>
  );
}

// ── Footer bar ───────────────────────────────────────────────────────────────

/**
 * The Trust Center. Single canonical URL — every widget footer points here.
 *
 * Deliberately not deep-linked per tool: earlier revisions pointed at
 * `/trust/detections`, `/trust/incidents` and friends, which were paths from a
 * design mockup that don't exist. A working link to the front page beats a
 * plausible-looking 404.
 */
const DEFAULT_TRUST_HREF = 'https://trust.tuteliq.ai/';

function FooterBar({
  note,
  trustHref,
  trustLabel,
}: {
  note: React.ReactNode;
  trustHref: string;
  trustLabel: string;
}) {
  const openLink = useOpenLink();
  return (
    <div
      style={{
        paddingTop: 14,
        paddingBottom: 14,
        borderTop: `1px solid ${colors.bg.track}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        fontSize: 11.5,
        color: colors.text.muted,
      }}
      className="tq-gutter"
    >
      <span style={{ minWidth: 0 }}>{note}</span>
      <a
        href={trustHref}
        onClick={(e) => openLink(trustHref, e)}
        style={{
          fontWeight: 600,
          color: colors.teal.deep,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flex: '0 0 auto',
        }}
      >
        {trustLabel}
      </a>
    </div>
  );
}

/**
 * Provenance line for the footer's left slot: which model produced this result
 * and the ID to quote in a support ticket. The ID is one click to copy because
 * transcribing a hex string by hand is where support threads go to die.
 */
export function AnalysisProvenance({
  model,
  analysisId,
}: {
  model?: string;
  analysisId?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  if (!model && !analysisId) return null;

  const copy = () => {
    if (!analysisId) return;
    navigator.clipboard
      ?.writeText(analysisId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: fonts.mono,
        fontSize: 11,
      }}
    >
      {model && <span>Model {model}</span>}
      {model && analysisId && <span aria-hidden="true">·</span>}
      {analysisId && (
        <>
          <span>analysis_id: {analysisId}</span>
          <button
            type="button"
            onClick={copy}
            title="Copy analysis ID"
            aria-label="Copy analysis ID"
            style={{
              border: 'none',
              background: 'none',
              padding: 2,
              cursor: 'pointer',
              color: copied ? colors.teal.deep : colors.text.muted,
              display: 'inline-flex',
            }}
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            )}
          </button>
        </>
      )}
    </span>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────

interface WidgetShellProps {
  /**
   * The MCP tool that produced this result, e.g. `detect_bullying`. Accepts a
   * node so the loading state can put a skeleton in the slot before the tool
   * name is known.
   */
  tool: React.ReactNode;
  /** Tool schema version shown in the chrome pill. */
  version?: string;
  /**
   * Render the dark chrome bar naming the tool.
   *
   * On by default, as the design specifies.
   *
   * Note that MCP hosts also draw their own header above the widget iframe,
   * naming the server and the tool, so both are visible at once. There is no
   * way to ask the host whether it has chrome; set this to false where that
   * duplication is unwanted.
   */
  showChrome?: boolean;
  /** Footer left slot. Defaults to the standing data-handling assurance. */
  footerNote?: React.ReactNode;
  /** Trust Center deep link — point it at the section relevant to this tool. */
  trustHref?: string;
  trustLabel?: string;
  children: React.ReactNode;
}

/**
 * The frame every Tuteliq widget renders inside.
 *
 * Previously each page brought its own header — `AppWrapper` for detection
 * widgets, `IncidentHeader` for the dashboard ones — so two cards in the same
 * transcript looked like two products. This is the single shell: white body and
 * a footer carrying the data-handling assurance and a route out to the Trust
 * Center, with the tool-naming chrome left to the host.
 */
export function WidgetShell({
  tool,
  version = 'v1',
  showChrome = true,
  footerNote = 'Encrypted · SOC-aligned handling',
  trustHref = DEFAULT_TRUST_HREF,
  trustLabel = 'View Trust Center →',
  children,
}: WidgetShellProps) {
  return (
    <div
      style={{
        fontFamily: fonts.body,
        color: colors.text.primary,
        borderRadius: radius.card,
        overflow: 'hidden',
        background: colors.bg.primary,
        boxShadow: shadow.card,
        border: '1px solid rgba(255,255,255,0.06)',
        // `width: 100%` is load-bearing. Without it, the auto side margins make
        // this shrink to fit-content whenever the host renders the widget as a
        // flex or grid child — which several of them do.
        width: '100%',
        maxWidth: 920,
        margin: '0 auto',
      }}
    >
      {showChrome && <ChromeBar tool={tool} version={version} />}
      <div
        className="tq-gutter"
        style={{ paddingTop: showChrome ? 32 : 30, paddingBottom: 34 }}
      >
        {children}
      </div>
      <FooterBar note={footerNote} trustHref={trustHref} trustLabel={trustLabel} />
    </div>
  );
}
