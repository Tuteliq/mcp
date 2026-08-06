import React from 'react';
import { Panel, MetricBar } from './primitives';

interface EmotionChartProps {
  scores: Record<string, number>;
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

/**
 * Emotion scores, strongest first.
 *
 * No trend line here any more — the banner above already states it, and having
 * both meant the page said "Worsening" twice in the space of two elements.
 * Scores are scaled to 100%, not to the top score: these are independent
 * probabilities, so a 0.81 anxiety reading should look like 81% of the track
 * regardless of what else fired.
 */
export function EmotionChart({ scores }: EmotionChartProps) {
  const sorted = Object.entries(scores || {}).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;

  return (
    <Panel title="Emotion scores">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(([emotion, score]) => {
          const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
          return <MetricBar key={emotion} label={titleCase(emotion)} value={`${pct}%`} pct={pct} />;
        })}
      </div>
    </Panel>
  );
}
