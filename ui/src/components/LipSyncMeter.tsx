import React from 'react';
import { colors, fontFamily } from '../theme';

interface LipSyncData {
  correlation: number;
  has_silent_mouth_movement: boolean;
  has_voice_without_movement: boolean;
  signals: string[];
}

interface LipSyncMeterProps {
  data: LipSyncData;
}

function correlationColor(v: number): string {
  if (v >= 0.5) return colors.severity.safe;
  if (v >= 0.3) return colors.severity.medium;
  return colors.severity.high;
}

export function LipSyncMeter({ data }: LipSyncMeterProps) {
  const corr = data.correlation;
  const color = correlationColor(corr);
  // Map -1..+1 to 0..100%
  const pct = ((corr + 1) / 2) * 100;

  const alerts: Array<{ label: string; icon: string }> = [];
  if (data.has_silent_mouth_movement) {
    alerts.push({ label: 'Silent mouth movement detected', icon: 'mouth' });
  }
  if (data.has_voice_without_movement) {
    alerts.push({ label: 'Voice without lip movement', icon: 'voice' });
  }

  return (
    <div style={{ marginBottom: 16, animation: 'synth-fadeSlideUp 0.5s ease 0.45s both' }}>
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
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        Lip Sync Analysis
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
        {/* Correlation meter */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily }}>Correlation</span>
            <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily }}>{corr.toFixed(2)}</span>
          </div>
          {/* Full range bar: -1 to +1 */}
          <div
            style={{
              position: 'relative',
              height: 10,
              borderRadius: 5,
              background: `linear-gradient(90deg, ${colors.severity.high}40, ${colors.severity.medium}40, ${colors.severity.safe}40)`,
              overflow: 'hidden',
            }}
          >
            {/* Marker */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${pct}%`,
                width: 3,
                background: color,
                borderRadius: 2,
                transform: 'translateX(-50%)',
                boxShadow: `0 0 6px ${color}88`,
                animation: `synth-markerSlide 0.8s ease 0.6s both`,
              }}
            />
            {/* Fill from center */}
            <div
              style={{
                position: 'absolute',
                top: 1,
                bottom: 1,
                left: pct >= 50 ? '50%' : `${pct}%`,
                width: `${Math.abs(pct - 50)}%`,
                background: `${color}66`,
                borderRadius: 3,
                animation: 'synth-barGrow 0.6s ease 0.5s both',
                transformOrigin: pct >= 50 ? 'left' : 'right',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: colors.text.muted, marginTop: 3 }}>
            <span>-1.0</span>
            <span>0</span>
            <span>+1.0</span>
          </div>
        </div>

        {/* Alert badges */}
        {alerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alerts.map((alert, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: `${colors.severity.high}12`,
                  border: `1px solid ${colors.severity.high}30`,
                  animation: `synth-fadeSlideRight 0.4s ease ${0.7 + i * 0.1}s both`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.severity.high} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 500, color: colors.severity.high, fontFamily }}>{alert.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Signals */}
        {data.signals.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.signals.map((sig, i) => (
              <span
                key={i}
                style={{
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 500,
                  color: colors.text.secondary,
                  background: colors.bg.secondary,
                  fontFamily,
                  animation: `synth-fadeSlideRight 0.3s ease ${0.8 + i * 0.06}s both`,
                }}
              >
                {sig}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
