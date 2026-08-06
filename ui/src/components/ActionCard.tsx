import React from 'react';
import { colors, fontFamily } from '../theme';

interface ActionCardProps {
  action: string;
  /** Human-readable expansion of the action, when the API supplies one. */
  detail?: string;
}

export function ActionCard({ action, detail }: ActionCardProps) {
  // Don't render for empty or "none" actions
  if (!action || action.toLowerCase() === 'none') return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: `linear-gradient(135deg, ${colors.brand.primary}08, ${colors.brand.primaryLight}12)`,
        border: `1px solid ${colors.brand.primaryLight}30`,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primaryLight})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: colors.text.muted,
            fontFamily,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Recommended Action
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily }}>
          {action}
        </div>
        {detail && (
          <div style={{ fontSize: 11, color: colors.text.muted, fontFamily, marginTop: 3, lineHeight: 1.4 }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
