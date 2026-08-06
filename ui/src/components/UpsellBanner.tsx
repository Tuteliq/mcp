import React from 'react';
import { colors, fonts, radius } from '../theme';
import { useOpenLink } from './WidgetShell';

interface UpsellBannerProps {
  message?: string;
}

const DASHBOARD_URL = 'https://tuteliq.ai/dashboard';

/**
 * Shown when a tool is gated by plan or credits.
 *
 * Deliberately quiet: no rocket, no gradient, no centred hero. This appears
 * where the user expected an analysis result, and the honest framing is "this
 * tool needs a different plan" — not a promotion.
 */
export function UpsellBanner({ message }: UpsellBannerProps) {
  const openLink = useOpenLink();

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.panel,
        padding: '22px 24px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.chip,
          background: colors.ink.base,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3"
            y="11"
            width="18"
            height="11"
            rx="2"
            stroke={colors.teal.base}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M7 11V7a5 5 0 0110 0v4"
            stroke={colors.teal.base}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 17,
            color: colors.text.primary,
          }}
        >
          This tool isn’t on your plan
        </div>
        <p
          style={{
            fontSize: 13.5,
            color: colors.text.body,
            lineHeight: 1.55,
            margin: '6px 0 14px',
          }}
        >
          {message || 'This feature requires a plan upgrade or additional credits.'}
        </p>
        <a
          href={DASHBOARD_URL}
          onClick={(e) => openLink(DASHBOARD_URL, e)}
          style={{
            display: 'inline-block',
            padding: '9px 18px',
            borderRadius: radius.chip,
            background: colors.ink.base,
            color: colors.text.onDark,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Manage plan and credits
        </a>
      </div>
    </div>
  );
}
