import React from 'react';
import { colors } from '../theme';
import { useAppContext } from '../context/AppContext';
import type { SupportData } from '../types';

interface SupportCardProps {
  support: SupportData;
}

const warmMessages: Record<string, string> = {
  self_harm: "You're not alone. Reaching out is a sign of strength, and help is always available.",
  mental_health: "It's okay to not be okay. Support is just a call away — you matter.",
  eating_disorder: "Recovery is possible, and you deserve support on this journey.",
  substance_abuse: "Asking for help takes courage. There are people who care and want to help.",
  violence: "You deserve to feel safe. Confidential support is available right now.",
  sexual_abuse: "What happened is not your fault. Trained professionals are here to listen.",
  bullying: "Nobody deserves to be treated this way. You have the right to feel safe.",
  grooming: "Trust your instincts. If something feels wrong, it's important to talk to someone you trust.",
  default: "If you or someone you know needs support, help is available. You are not alone.",
};

function getWarmMessage(category?: string): string {
  if (category && warmMessages[category]) return warmMessages[category];
  return warmMessages.default;
}

function copyToClipboard(text: string, event: React.MouseEvent) {
  event.preventDefault();
  navigator.clipboard.writeText(text).then(() => {
    const el = event.currentTarget as HTMLElement;
    const original = el.innerHTML;
    el.textContent = '✓ Copied!';
    setTimeout(() => { el.innerHTML = original; }, 1500);
  }).catch(() => {
    const range = document.createRange();
    range.selectNodeContents(event.currentTarget as Node);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  });
}

export function SupportCard({ support }: SupportCardProps) {
  const app = useAppContext();
  const guideCategory = support.response_guide?.category;
  const warmMessage = getWarmMessage(guideCategory);

  const handleOpenLink = (url: string, event: React.MouseEvent) => {
    event.preventDefault();
    if (app) {
      app.openLink({ url }).catch(() => {
        // Fallback: copy URL to clipboard
        navigator.clipboard.writeText(url).catch(() => {});
      });
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <div
      style={{
        margin: '12px 0',
        borderRadius: 10,
        border: '1px solid #BFDBFE',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Warm message header */}
      <div
        style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>💙</span> You Are Not Alone
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.95 }}>
          {warmMessage}
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* Emergency number */}
        {support.emergency_number && (
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🚨</span>
            <div style={{ fontSize: 12, color: colors.text.secondary }}>
              Emergency:{' '}
              <a
                href="#"
                onClick={(e) => copyToClipboard(support.emergency_number!, e)}
                style={{ color: '#DC2626', fontWeight: 700, fontSize: 14, textDecoration: 'none', cursor: 'pointer' }}
                title="Click to copy number"
              >
                {support.emergency_number}
              </a>
              {support.country_name && (
                <span style={{ color: colors.text.muted }}> ({support.country_name})</span>
              )}
            </div>
          </div>
        )}

        {/* Helplines */}
        {support.helplines.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Crisis Helplines
            </div>
            {support.helplines.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: i % 2 === 0 ? '#fff' : '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  marginBottom: 4,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.text.primary }}>{h.name}</div>
                  {h.description && (
                    <div style={{ fontSize: 11, color: colors.text.muted, marginTop: 1 }}>{h.description}</div>
                  )}
                  {h.available && (
                    <div style={{ fontSize: 10, color: colors.text.muted, marginTop: 1 }}>⏰ {h.available}</div>
                  )}
                </div>
                <a
                  href="#"
                  onClick={(e) => copyToClipboard(h.number, e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#2563EB',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                  title="Click to copy number"
                >
                  📞 {h.number}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Response guide - immediate actions */}
        {support.response_guide && support.response_guide.immediateActions.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              What You Can Do Now
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: colors.text.secondary, lineHeight: 1.7 }}>
              {support.response_guide.immediateActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Response guide - resources */}
        {support.response_guide && support.response_guide.resources.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Helpful Resources
            </div>
            {support.response_guide.resources.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 3 }}>
                {r.url ? (
                  <a
                    href={r.url}
                    onClick={(e) => handleOpenLink(r.url!, e)}
                    style={{ color: '#2563EB', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}
                  >
                    {r.name}
                  </a>
                ) : (
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                )}
                {r.description && <span> — {r.description}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
