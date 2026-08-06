import React from 'react';
import { WidgetShell } from '../components/WidgetShell';
import { CardHeader, Callout } from '../components/primitives';
import { EmotionChart } from '../components/EmotionChart';
import { CategoryChips } from '../components/CategoryChips';
import { ActionCard } from '../components/ActionCard';
import { StatusBanner } from '../components/StatusBanner';
import type { ToolResultPayload, EmotionsResult } from '../types';

// ── Keyframes ────────────────────────────────────────────────────────────────

const emotionsKeyframes = `
@keyframes emo-fadeSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

// ── Trend Banner ─────────────────────────────────────────────────────────────

/**
 * Direction of travel in the subject's emotional state.
 *
 * Mapped onto the shared severity ramp so this banner is the same object as
 * every other verdict in the product. Worsening lands on `medium`, not `high`:
 * a downward trend is a reason to look closer, not an incident on its own.
 */
const trendConfig: Record<
  string,
  { level: string; label: string; subtitle: string; arrow: 'up' | 'right' | 'down' }
> = {
  improving: {
    level: 'safe',
    label: 'Improving trend',
    subtitle: 'Emotional state is trending more positive over the analysed window',
    arrow: 'up',
  },
  stable: {
    level: 'low',
    label: 'Stable trend',
    subtitle: 'No meaningful change across the analysed window',
    arrow: 'right',
  },
  worsening: {
    level: 'medium',
    label: 'Worsening trend',
    subtitle: 'Emotional state is trending more negative — worth a closer look',
    arrow: 'down',
  },
};

const arrowPaths: Record<string, React.ReactNode> = {
  up: (
    <>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </>
  ),
  down: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </>
  ),
  right: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
};

/** Builds a StatusBanner-compatible glyph for a trend direction. */
function makeArrow(direction: string) {
  return function Arrow({ color, size = 26 }: { color: string; size?: number }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {arrowPaths[direction]}
      </svg>
    );
  };
}

function TrendBanner({ trend }: { trend: string }) {
  const cfg = trendConfig[trend] || trendConfig.stable;
  return (
    <StatusBanner
      level={cfg.level}
      title={cfg.label}
      subtitle={cfg.subtitle}
      icon={makeArrow(cfg.arrow)}
      style={{ marginBottom: 24 }}
    />
  );
}

// ── Dominant Emotions Header ─────────────────────────────────────────────────

function DominantEmotionsSection({ emotions }: { emotions: string[] }) {
  if (!emotions || emotions.length === 0) return null;
  return (
    <div style={{ marginBottom: 20, animation: 'emo-fadeSlideUp 0.5s ease 0.15s both' }}>
      <CategoryChips categories={emotions} label="Dominant emotions" />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function EmotionsPage({ data, viewUUID }: { data: ToolResultPayload; viewUUID?: string }) {
  const result = data.result as EmotionsResult;

  return (
    <WidgetShell tool="analyze_emotions">
      <style>{emotionsKeyframes}</style>

      <CardHeader
        title="Emotion Analysis"
        subtitle="Affective signals across the analysed content"
      />

      {/* Trend Banner */}
      {result.trend && <TrendBanner trend={result.trend} />}

      {/* Dominant Emotions */}
      <DominantEmotionsSection emotions={result.dominant_emotions} />

      {/* Emotion Chart */}
      <div style={{ animation: 'emo-fadeSlideUp 0.5s ease 0.25s both' }}>
        <EmotionChart scores={result.emotion_scores} />
      </div>

      {/* Summary */}
      {result.summary && (
        <div style={{ marginBottom: 16, animation: 'emo-fadeSlideUp 0.5s ease 0.35s both' }}>
          <Callout title="Summary">{result.summary}</Callout>
        </div>
      )}

      {/* Followup Action */}
      {result.recommended_followup && result.recommended_followup.toLowerCase() !== 'none' && (
        <div style={{ animation: 'emo-fadeSlideUp 0.5s ease 0.45s both' }}>
          <ActionCard action={result.recommended_followup} />
        </div>
      )}
    </WidgetShell>
  );
}
