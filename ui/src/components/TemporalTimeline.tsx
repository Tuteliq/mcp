import React from 'react';
import { colors, fontFamily } from '../theme';

interface AnomalousFramePair {
  frame_a: number;
  frame_b: number;
  distance: number;
}

interface TemporalConsistency {
  identity_consistency_score: number;
  landmark_stability_score: number;
  temporal_consistency_score: number;
  frames_with_faces: number;
  total_frames: number;
  anomalous_frame_pairs: AnomalousFramePair[];
  signals: string[];
}

interface TemporalTimelineProps {
  data: TemporalConsistency;
}

function scoreColor(score: number): string {
  if (score >= 0.8) return colors.severity.safe;
  if (score >= 0.5) return colors.severity.medium;
  return colors.severity.high;
}

export function TemporalTimeline({ data }: TemporalTimelineProps) {
  const totalFrames = data.total_frames;
  const anomalousFrameSet = new Set<number>();
  data.anomalous_frame_pairs.forEach(p => {
    anomalousFrameSet.add(p.frame_a);
    anomalousFrameSet.add(p.frame_b);
  });

  // Generate representative frame dots
  const maxDots = Math.min(totalFrames, 40);
  const step = totalFrames / maxDots;
  const dots: Array<{ index: number; isAnomaly: boolean; hasFace: boolean }> = [];
  for (let i = 0; i < maxDots; i++) {
    const frameIdx = Math.round(i * step);
    dots.push({
      index: frameIdx,
      isAnomaly: anomalousFrameSet.has(frameIdx),
      hasFace: frameIdx < data.frames_with_faces,
    });
  }

  const scores = [
    { label: 'Identity Consistency', value: data.identity_consistency_score },
    { label: 'Landmark Stability', value: data.landmark_stability_score },
    { label: 'Temporal Consistency', value: data.temporal_consistency_score },
  ];

  return (
    <div style={{ marginBottom: 16, animation: 'synth-fadeSlideUp 0.5s ease 0.35s both' }}>
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
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Temporal Analysis
        <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.text.muted, fontWeight: 400 }}>
          {data.frames_with_faces}/{totalFrames} frames with faces
        </span>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          padding: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Timeline strip */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: colors.text.muted, fontFamily, marginBottom: 6 }}>Frame Timeline</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '6px 0',
              position: 'relative',
            }}
          >
            {/* Connecting line */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 4,
                right: 4,
                height: 2,
                background: `linear-gradient(90deg, ${scoreColor(data.temporal_consistency_score)}88, ${scoreColor(data.temporal_consistency_score)}44)`,
                transform: 'translateY(-50%)',
                borderRadius: 1,
              }}
            />
            {dots.map((dot, i) => (
              <div
                key={i}
                title={`Frame ${dot.index}${dot.isAnomaly ? ' (anomaly)' : ''}`}
                style={{
                  width: dot.isAnomaly ? 8 : 5,
                  height: dot.isAnomaly ? 8 : 5,
                  borderRadius: '50%',
                  background: dot.isAnomaly
                    ? colors.severity.high
                    : dot.hasFace
                      ? colors.brand.primaryLight
                      : colors.bg.tertiary,
                  border: dot.isAnomaly ? `2px solid ${colors.severity.high}44` : 'none',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: dot.isAnomaly ? 2 : 1,
                  animation: dot.isAnomaly
                    ? 'synth-pulseGlow 2s ease-in-out infinite'
                    : `synth-dotAppear 0.3s ease ${0.5 + i * 0.02}s both`,
                  cursor: 'default',
                }}
              />
            ))}
          </div>
          {data.anomalous_frame_pairs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 10, color: colors.text.muted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.brand.primaryLight }} />
                Normal
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.severity.high }} />
                Anomaly ({data.anomalous_frame_pairs.length} pair{data.anomalous_frame_pairs.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>

        {/* Score bars */}
        {scores.map((s, i) => {
          const pct = Math.round(s.value * 100);
          const color = scoreColor(s.value);
          return (
            <div key={i} style={{ marginBottom: i < scores.length - 1 ? 10 : 0, animation: `synth-fadeSlideRight 0.4s ease ${0.5 + i * 0.1}s both` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily, marginBottom: 3 }}>
                <span style={{ color: colors.text.secondary, fontWeight: 500 }}>{s.label}</span>
                <span style={{ color, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: colors.bg.tertiary, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                    width: `${pct}%`,
                    animation: `synth-barGrow 0.6s ease ${0.6 + i * 0.12}s both`,
                    transformOrigin: 'left',
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Signals */}
        {data.signals.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.signals.map((sig, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 500,
                  color: colors.severity.medium,
                  background: 'rgba(232,168,92,0.12)',
                  border: '1px solid rgba(232,168,92,0.25)',
                  fontFamily,
                  animation: `synth-fadeSlideRight 0.3s ease ${0.7 + i * 0.06}s both`,
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: colors.severity.medium }} />
                {sig}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
