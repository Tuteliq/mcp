import React from 'react';
import { AppWrapper } from '../App';
import { EmotionChart } from '../components/EmotionChart';
import { CategoryChips } from '../components/CategoryChips';
import { ActionCard } from '../components/ActionCard';
import { colors, fontFamily } from '../theme';
import type { ToolResultPayload, EmotionsResult } from '../types';

// ── Keyframes ────────────────────────────────────────────────────────────────

const emotionsKeyframes = `
@keyframes emo-fadeSlideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes emo-fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes emo-arrowBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
`;

// ── Trend Banner ─────────────────────────────────────────────────────────────

const trendConfig: Record<string, { gradient: string; label: string; iconColor: string; arrow: string }> = {
  improving: {
    gradient: 'linear-gradient(135deg, #81B29A 0%, #2A9D8F 50%, #1E7A6D 100%)',
    label: 'Improving Trend',
    iconColor: '#D1FAE5',
    arrow: 'up',
  },
  stable: {
    gradient: 'linear-gradient(135deg, #94A3B8 0%, #64748B 50%, #475569 100%)',
    label: 'Stable Trend',
    iconColor: '#E2E8F0',
    arrow: 'right',
  },
  worsening: {
    gradient: 'linear-gradient(135deg, #E8A85C 0%, #D97706 50%, #B45309 100%)',
    label: 'Worsening Trend',
    iconColor: '#FEF3C7',
    arrow: 'down',
  },
};

function TrendArrow({ direction, color }: { direction: string; color: string }) {
  if (direction === 'up') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'emo-arrowBounce 2s ease-in-out infinite' }}
      >
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    );
  }
  if (direction === 'down') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'emo-arrowBounce 2s ease-in-out infinite' }}
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function TrendBanner({ trend }: { trend: string }) {
  const cfg = trendConfig[trend] || trendConfig.stable;

  return (
    <div
      style={{
        background: cfg.gradient,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        animation: 'emo-fadeSlideDown 0.5s ease both',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glass shimmer */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
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
        <TrendArrow direction={cfg.arrow} color={cfg.iconColor} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily, letterSpacing: '-0.01em' }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily, marginTop: 2 }}>
          Emotional state analysis complete
        </div>
      </div>
    </div>
  );
}

// ── Dominant Emotions Header ─────────────────────────────────────────────────

function DominantEmotionsSection({ emotions }: { emotions: string[] }) {
  if (!emotions || emotions.length === 0) return null;
  return (
    <div style={{ animation: 'emo-fadeSlideUp 0.5s ease 0.15s both' }}>
      <CategoryChips categories={emotions} />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function EmotionsPage({ data, viewUUID }: { data: ToolResultPayload; viewUUID?: string }) {
  const result = data.result as EmotionsResult;

  return (
    <AppWrapper title="Emotion Analysis">
      <style>{emotionsKeyframes}</style>

      {/* Trend Banner */}
      {result.trend && <TrendBanner trend={result.trend} />}

      {/* Dominant Emotions */}
      <DominantEmotionsSection emotions={result.dominant_emotions} />

      {/* Emotion Chart */}
      <div style={{ animation: 'emo-fadeSlideUp 0.5s ease 0.25s both' }}>
        <EmotionChart scores={result.emotion_scores} trend={result.trend} />
      </div>

      {/* Summary */}
      {result.summary && (
        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            borderLeft: `3px solid ${colors.brand.primaryLight}`,
            marginBottom: 12,
            animation: 'emo-fadeSlideUp 0.5s ease 0.35s both',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.text.primary,
              fontFamily,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Summary
          </div>
          <p style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 1.7, fontFamily, margin: 0 }}>
            {result.summary}
          </p>
        </div>
      )}

      {/* Followup Action */}
      {result.recommended_followup && result.recommended_followup.toLowerCase() !== 'none' && (
        <div style={{ animation: 'emo-fadeSlideUp 0.5s ease 0.45s both' }}>
          <ActionCard action={result.recommended_followup} />
        </div>
      )}
    </AppWrapper>
  );
}
