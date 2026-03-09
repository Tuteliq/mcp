import React from 'react';
import { colors, fontFamily } from '../theme';

const LOGO_BASE64 = 'data:image/png;base64,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';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Analyzing' }: LoadingScreenProps) {
  return (
    <div style={{
      fontFamily,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 16px',
      gap: 16,
    }}>
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <img
          src={LOGO_BASE64}
          alt="Tuteliq"
          width={48}
          height={48}
          style={{ borderRadius: 8, animation: 'pulse 1.8s ease-in-out infinite' }}
        />
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: colors.text.primary }}>
        {message}
      </div>
      <div style={{
        width: 120,
        height: 3,
        borderRadius: 2,
        background: colors.bg.tertiary,
        overflow: 'hidden',
      }}>
        <div style={{
          width: '40%',
          height: '100%',
          borderRadius: 2,
          background: '#2A9D8F',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
