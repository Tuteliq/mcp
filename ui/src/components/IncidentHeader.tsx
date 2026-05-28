import React from 'react';
import { colors, fontFamily } from '../theme';

/**
 * Branded header for the four dashboard widgets — matches the SyntheticPage
 * styling so the read-only dashboard tools feel like one product alongside
 * the detection widgets, not a separate UI surface.
 */
export function IncidentHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontFamily }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.primaryLight} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        {icon ?? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: colors.text.primary }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      <div style={{ fontSize: 10, color: colors.text.muted, textAlign: 'right' }}>
        Tuteliq — Guardian Intelligence
      </div>
    </div>
  );
}
