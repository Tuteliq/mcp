import React from 'react';
import { colors, fontFamily } from '../theme';

interface BrandedLoaderProps {
  message?: string;
}

export function BrandedLoader({ message = 'Analyzing...' }: BrandedLoaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily,
      }}
    >
      <div style={{ position: 'relative', width: 48, height: 48, marginBottom: 16 }}>
        <svg width={48} height={48} viewBox="0 0 48 48">
          <circle
            cx={24} cy={24} r={20}
            fill="none"
            stroke={colors.bg.tertiary}
            strokeWidth={4}
          />
          <circle
            cx={24} cy={24} r={20}
            fill="none"
            stroke={`url(#tuteliq-gradient)`}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="80 45"
            style={{ animation: 'tuteliq-spin 1s linear infinite' }}
          />
          <defs>
            <linearGradient id="tuteliq-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.brand.primary} />
              <stop offset="100%" stopColor={colors.brand.primaryLight} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: colors.text.secondary,
          marginBottom: 4,
        }}
      >
        {message}
      </div>
      <div style={{ fontSize: 11, color: colors.text.muted }}>Powered by Tuteliq AI</div>
      <style>{`
        @keyframes tuteliq-spin {
          from { transform: rotate(0deg); transform-origin: 24px 24px; }
          to { transform: rotate(360deg); transform-origin: 24px 24px; }
        }
      `}</style>
    </div>
  );
}
