import React from 'react';
import { colors, fonts, radius } from '../theme';
import { useOpenLink } from './WidgetShell';
import type { SupportData } from '../types';

/**
 * Crisis support resources.
 *
 * This is the one card a person in difficulty may actually act on, so it is
 * built to be *used*, not decorated:
 *
 *   - Ink header, not the alarm ramp. Someone reading this has already been
 *     told the bad news by the status banner; restating it in red here would
 *     make the help feel like part of the emergency.
 *   - Phone numbers are the largest, highest-contrast targets on the card and
 *     copy on a single click. Under stress, transcribing digits is a failure
 *     point.
 *   - No emoji. The previous version led with 💙 🚨 📞; emoji render
 *     inconsistently across hosts, are read aloud by screen readers as their
 *     CLDR names mid-sentence, and set a tone this material cannot carry.
 */

const warmMessages: Record<string, string> = {
  self_harm: "You're not alone. Reaching out is a sign of strength, and help is always available.",
  mental_health: "It's okay to not be okay. Support is just a call away. You matter.",
  eating_disorder: 'Recovery is possible, and you deserve support on this journey.',
  substance_abuse: 'Asking for help takes courage. There are people who care and want to help.',
  violence: 'You deserve to feel safe. Confidential support is available right now.',
  sexual_abuse: 'What happened is not your fault. Trained professionals are here to listen.',
  bullying: 'Nobody deserves to be treated this way. You have the right to feel safe.',
  grooming: "Trust your instincts. If something feels wrong, it's important to talk to someone you trust.",
  default: 'If you or someone you know needs support, help is available. You are not alone.',
};

/** Copy a phone number, confirming in place so the click has a visible result. */
function CopyableNumber({ number }: { number: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    navigator.clipboard
      ?.writeText(number)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${number}`}
      aria-label={`Copy phone number ${number}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: fonts.body,
        color: colors.text.onDark,
        background: copied ? colors.teal.deep : colors.ink.base,
        border: 'none',
        padding: '6px 12px',
        borderRadius: radius.chip,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        flex: '0 0 auto',
        transition: 'background 0.2s ease',
      }}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {copied ? 'Copied' : number}
    </button>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.teal.deep,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SupportCard({ support }: { support: SupportData }) {
  const openLink = useOpenLink();
  const guide = support.response_guide;
  const warmMessage = warmMessages[guide?.category ?? ''] || warmMessages.default;

  return (
    <div style={{ background: colors.ink.base, borderRadius: radius.panel, overflow: 'hidden' }}>
      {/* Reassurance first — set apart on ink so it reads as a change of voice. */}
      <div
        style={{
          padding: '20px 24px',
          background: `linear-gradient(135deg, ${colors.ink.base}, ${colors.ink.raised})`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: '0 0 auto' }}>
            <path
              d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 12c-2.5 4.65-9.5 9-9.5 9z"
              stroke={colors.teal.soft}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 17,
              color: colors.text.onDark,
            }}
          >
            Support is available
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: colors.text.fainter, margin: 0, lineHeight: 1.5 }}>
          {warmMessage}
        </p>
      </div>

      <div style={{ background: colors.bg.secondary, padding: '22px 24px' }}>
        {support.emergency_number && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13.5,
              color: colors.text.body,
              marginBottom: 16,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: '0 0 auto' }}>
              <path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke={colors.severity.high}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="12" y1="9" x2="12" y2="13" stroke={colors.severity.high} strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" stroke={colors.severity.high} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>
              Emergency: <strong style={{ color: colors.severity.high }}>{support.emergency_number}</strong>
              {support.country_name && <span style={{ color: colors.text.muted }}> ({support.country_name})</span>}
            </span>
          </div>
        )}

        {support.helplines.length > 0 && (
          <>
            <SectionLabel style={{ marginBottom: 10 }}>Crisis helplines</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {support.helplines.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: colors.bg.primary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.inset,
                    padding: '11px 16px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.text.primary }}>
                      {h.name}
                    </div>
                    {(h.description || h.available) && (
                      <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 1 }}>
                        {[h.description, h.available].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <CopyableNumber number={h.number} />
                </div>
              ))}
            </div>
          </>
        )}

        {guide && guide.immediateActions.length > 0 && (
          <>
            <SectionLabel style={{ margin: '18px 0 8px' }}>What you can do now</SectionLabel>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                lineHeight: 1.6,
                color: colors.text.body,
              }}
            >
              {guide.immediateActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </>
        )}

        {guide && guide.resources.length > 0 && (
          <>
            <SectionLabel style={{ margin: '18px 0 8px' }}>Helpful resources</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {guide.resources.map((r, i) => (
                <div key={i} style={{ fontSize: 13, color: colors.text.body, lineHeight: 1.5 }}>
                  {r.url ? (
                    <a
                      href={r.url}
                      onClick={(e) => openLink(r.url!, e)}
                      style={{ color: colors.teal.deep, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {r.name}
                    </a>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                  )}
                  {r.description && <span style={{ color: colors.text.muted }}> — {r.description}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
