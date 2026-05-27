import React from 'react';
import { colors, fontFamily } from '../theme';

interface ForensicSource {
  name: string;
  signal_count: number;
  confidence_boost: number;
}

interface ForensicSignalGridProps {
  sources: ForensicSource[];
  totalSignals: number;
  combinedBoost: number;
}

function VisionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MetadataIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function PixelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="6" height="6" />
      <rect x="9" y="2" width="6" height="6" />
      <rect x="16" y="2" width="6" height="6" />
      <rect x="2" y="9" width="6" height="6" />
      <rect x="9" y="9" width="6" height="6" />
      <rect x="16" y="9" width="6" height="6" />
      <rect x="2" y="16" width="6" height="6" />
      <rect x="9" y="16" width="6" height="6" />
      <rect x="16" y="16" width="6" height="6" />
    </svg>
  );
}

function C2PAIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function WatermarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

const sourceIcons: Record<string, React.FC> = {
  'vision_ai': VisionIcon,
  'metadata': MetadataIcon,
  'exif': MetadataIcon,
  'pixel_stats': PixelIcon,
  'c2pa': C2PAIcon,
  'watermark': WatermarkIcon,
  'phash': HashIcon,
};

function getIcon(name: string): React.FC {
  const lower = name.toLowerCase().replace(/[\s/]+/g, '_');
  for (const key of Object.keys(sourceIcons)) {
    if (lower.includes(key)) return sourceIcons[key];
  }
  return VisionIcon;
}

function strengthColor(boost: number): string {
  if (boost >= 0.15) return colors.severity.high;
  if (boost >= 0.08) return colors.severity.medium;
  if (boost >= 0.03) return colors.severity.low;
  return colors.severity.safe;
}

export function ForensicSignalGrid({ sources, totalSignals, combinedBoost }: ForensicSignalGridProps) {
  return (
    <div style={{ marginBottom: 16, animation: 'synth-fadeSlideUp 0.5s ease 0.3s both' }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: colors.text.primary,
          fontFamily,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Forensic Signals
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 500,
            color: colors.text.muted,
          }}
        >
          {totalSignals} signal{totalSignals !== 1 ? 's' : ''} detected | +{Math.round(combinedBoost * 100)}% boost
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 8,
        }}
      >
        {sources.map((src, i) => {
          const Icon = getIcon(src.name);
          const borderColor = strengthColor(src.confidence_boost);
          return (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                borderRadius: 10,
                padding: '12px 14px',
                borderLeft: `3px solid ${borderColor}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                animation: `synth-fadeSlideRight 0.4s ease ${0.4 + i * 0.08}s both`,
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${colors.bg.secondary}, ${colors.bg.tertiary})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.brand.primary,
                    flexShrink: 0,
                  }}
                >
                  <Icon />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily, lineHeight: 1.2 }}>
                    {src.name}
                  </div>
                  <div style={{ fontSize: 10, color: colors.text.muted, fontFamily }}>
                    {src.signal_count} signal{src.signal_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.text.muted, marginBottom: 3 }}>
                  <span>Confidence boost</span>
                  <span>+{Math.round(src.confidence_boost * 100)}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: colors.bg.tertiary, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 2,
                      background: borderColor,
                      width: `${Math.min(src.confidence_boost * 500, 100)}%`,
                      animation: `synth-barGrow 0.6s ease ${0.5 + i * 0.1}s both`,
                      transformOrigin: 'left',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
