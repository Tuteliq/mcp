import React from 'react';
import { colors } from '../theme';

interface UpsellBannerProps {
  message?: string;
}

export function UpsellBanner({ message }: UpsellBannerProps) {
  const displayMessage = message || 'This feature requires a plan upgrade or additional credits.';

  return (
    <div
      style={{
        border: `1px solid ${colors.brand.primary}`,
        borderRadius: 12,
        padding: 20,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${colors.bg.secondary}, #EEF2FF)`,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{'\u{1F680}'}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary, marginBottom: 6 }}>
        Upgrade Your Plan
      </div>
      <div style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 1.6, marginBottom: 16 }}>
        {displayMessage}
      </div>
      <a
        href="https://tuteliq.ai/dashboard"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          padding: '10px 24px',
          borderRadius: 8,
          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primaryDark})`,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Upgrade on Tuteliq Dashboard
      </a>
      <div style={{ marginTop: 12, fontSize: 11, color: colors.text.muted }}>
        Manage your plan and credits at tuteliq.ai/dashboard
      </div>
    </div>
  );
}
