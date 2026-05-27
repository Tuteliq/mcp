import React from 'react';
import { fontFamily } from '../theme';

type Classification = 'confirmed_synthetic' | 'suspected_synthetic' | 'unknown' | 'confirmed_authentic';

interface ClassificationBannerProps {
  classification: Classification;
}

const config: Record<Classification, { gradient: string; label: string; iconColor: string }> = {
  confirmed_synthetic: {
    gradient: 'linear-gradient(135deg, #D94F3D 0%, #B5543D 50%, #922B2B 100%)',
    label: 'Confirmed Synthetic',
    iconColor: '#FEE2E2',
  },
  suspected_synthetic: {
    gradient: 'linear-gradient(135deg, #E8A85C 0%, #D97706 50%, #B45309 100%)',
    label: 'Suspected Synthetic',
    iconColor: '#FEF3C7',
  },
  unknown: {
    gradient: 'linear-gradient(135deg, #94A3B8 0%, #64748B 50%, #475569 100%)',
    label: 'Inconclusive',
    iconColor: '#E2E8F0',
  },
  confirmed_authentic: {
    gradient: 'linear-gradient(135deg, #81B29A 0%, #2A9D8F 50%, #1E7A6D 100%)',
    label: 'Confirmed Authentic',
    iconColor: '#D1FAE5',
  },
};

function ShieldXIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function QuestionIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ShieldCheckIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

const iconMap: Record<Classification, React.FC<{ color: string }>> = {
  confirmed_synthetic: ShieldXIcon,
  suspected_synthetic: WarningIcon,
  unknown: QuestionIcon,
  confirmed_authentic: ShieldCheckIcon,
};

const isSynthetic = (c: Classification) => c === 'confirmed_synthetic' || c === 'suspected_synthetic';

export function ClassificationBanner({ classification }: ClassificationBannerProps) {
  const c = config[classification] || config.unknown;
  const Icon = iconMap[classification] || QuestionIcon;
  const pulse = isSynthetic(classification);

  return (
    <div
      className={pulse ? 'synth-banner-pulse' : undefined}
      style={{
        background: c.gradient,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        animation: 'synth-fadeSlideDown 0.5s ease both',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glass shimmer overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.06) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon color={c.iconColor} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            fontFamily,
            letterSpacing: '-0.01em',
          }}
        >
          {c.label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.75)',
            fontFamily,
            marginTop: 2,
          }}
        >
          Forensic analysis complete
        </div>
      </div>
    </div>
  );
}
