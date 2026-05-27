import React from 'react';
import { colors, fontFamily } from '../theme';

interface AudioStats {
  rms_mean?: number;
  dynamic_range?: number;
  silence_ratio?: number;
  flat_factor?: number;
}

interface AudioStatsPanelProps {
  stats: AudioStats;
  spectralSignals?: string[];
  transcription?: { text: string; language: string; duration: number };
}

interface MeterDef {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  description: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function AudioStatsPanel({ stats, spectralSignals, transcription }: AudioStatsPanelProps) {
  const meters: MeterDef[] = [];

  if (stats.dynamic_range != null) {
    meters.push({
      label: 'Dynamic Range',
      value: stats.dynamic_range,
      max: 60,
      unit: 'dB',
      color: colors.brand.primaryLight,
      description: 'Range between quietest and loudest',
    });
  }
  if (stats.rms_mean != null) {
    meters.push({
      label: 'RMS Level',
      value: Math.abs(stats.rms_mean),
      max: 1,
      unit: '',
      color: '#6366F1',
      description: 'Average signal energy',
    });
  }
  if (stats.silence_ratio != null) {
    meters.push({
      label: 'Silence Ratio',
      value: stats.silence_ratio,
      max: 1,
      unit: '%',
      color: stats.silence_ratio > 0.6 ? colors.severity.medium : colors.brand.primaryLight,
      description: 'Proportion of silence in audio',
    });
  }
  if (stats.flat_factor != null) {
    meters.push({
      label: 'Flatness Factor',
      value: stats.flat_factor,
      max: 1,
      unit: '',
      color: stats.flat_factor > 0.5 ? colors.severity.high : '#8B5CF6',
      description: 'Spectral flatness (high = synthetic-like)',
    });
  }

  const [transcriptOpen, setTranscriptOpen] = React.useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Audio Stats Meters */}
      {meters.length > 0 && (
        <div style={{ animation: 'synth-fadeSlideUp 0.5s ease 0.3s both' }}>
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
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Audio Analysis
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
            {meters.map((m, i) => {
              const pct = Math.min((m.value / m.max) * 100, 100);
              const displayVal = m.unit === '%' ? `${Math.round(m.value * 100)}%` : m.unit ? `${m.value.toFixed(1)} ${m.unit}` : m.value.toFixed(3);
              return (
                <div key={i} style={{ marginBottom: i < meters.length - 1 ? 14 : 0, animation: `synth-fadeSlideRight 0.4s ease ${0.4 + i * 0.1}s both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily }}>{m.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: m.color, fontFamily }}>{displayVal}</span>
                  </div>
                  <div style={{ fontSize: 10, color: colors.text.muted, marginBottom: 4, fontFamily }}>{m.description}</div>
                  <div style={{ height: 6, borderRadius: 3, background: colors.bg.tertiary, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 3,
                        background: `linear-gradient(90deg, ${m.color}, ${m.color}BB)`,
                        width: `${pct}%`,
                        animation: `synth-barGrow 0.6s ease ${0.5 + i * 0.12}s both`,
                        transformOrigin: 'left',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spectral Signals */}
      {spectralSignals && spectralSignals.length > 0 && (
        <div style={{ marginTop: 12, animation: 'synth-fadeSlideUp 0.5s ease 0.5s both' }}>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.severity.medium} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Spectral Anomalies
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {spectralSignals.map((sig, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  color: colors.severity.medium,
                  background: 'rgba(232,168,92,0.12)',
                  border: '1px solid rgba(232,168,92,0.25)',
                  fontFamily,
                  animation: `synth-fadeSlideRight 0.3s ease ${0.6 + i * 0.06}s both`,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors.severity.medium, flexShrink: 0 }} />
                {sig}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      {transcription && (
        <div style={{ marginTop: 12, animation: 'synth-fadeSlideUp 0.5s ease 0.6s both' }}>
          <button
            onClick={() => setTranscriptOpen(!transcriptOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 600,
              color: colors.text.primary,
              fontFamily,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: transcriptOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Transcription
            <span style={{ fontSize: 10, color: colors.text.muted, fontWeight: 400 }}>
              {transcription.language.toUpperCase()} | {formatDuration(transcription.duration)}
            </span>
          </button>
          {transcriptOpen && (
            <div
              style={{
                background: colors.bg.secondary,
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                color: colors.text.secondary,
                fontFamily,
                lineHeight: 1.6,
                maxHeight: 120,
                overflowY: 'auto',
                animation: 'synth-fadeSlideDown 0.3s ease both',
              }}
            >
              {transcription.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
