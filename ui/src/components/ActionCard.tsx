import React from 'react';
import { colors, fonts, radius } from '../theme';

interface ActionCardProps {
  action: string;
  /** Human-readable expansion of the action, when the API supplies one. */
  detail?: string;
}

/**
 * The recommended next step.
 *
 * The action itself is set in mono because it is a literal enum value from the
 * API (`flag_for_review`, `escalate`), not prose — a moderator wiring this into
 * their own pipeline needs the exact token, and mono signals it is one.
 */
export function ActionCard({ action, detail }: ActionCardProps) {
  if (!action || action.toLowerCase() === 'none') return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: colors.bg.tertiary,
        borderRadius: radius.inset,
        padding: '14px 18px',
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: radius.chip,
          background: colors.ink.base,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 6L9 17l-5-5"
            stroke={colors.teal.base}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: colors.text.muted,
          }}
        >
          Recommended action
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: colors.text.primary,
            fontFamily: fonts.mono,
            marginTop: 1,
          }}
        >
          {action}
        </div>
        {detail && (
          <div style={{ fontSize: 12.5, color: colors.text.muted, marginTop: 4, lineHeight: 1.45 }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
