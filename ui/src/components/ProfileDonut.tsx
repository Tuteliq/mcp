import React from 'react';
import { colors, fontFamily } from '../theme';

interface SyntheticProfile {
  customer_id: string;
  total_items: number;
  synthetic_count: number;
  authentic_count: number;
  unknown_count: number;
  avg_confidence: number;
  category_distribution: Record<string, number>;
  account_synthetic_score: number;
  trend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
  last_updated: string;
  window_days: number;
}

interface ProfileDonutProps {
  profile: SyntheticProfile;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'increasing') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.severity.high} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }
  if (trend === 'decreasing') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.severity.safe} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.text.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function trendLabel(t: string): string {
  if (t === 'increasing') return 'Increasing';
  if (t === 'decreasing') return 'Decreasing';
  if (t === 'stable') return 'Stable';
  return 'Unknown';
}

function trendColor(t: string): string {
  if (t === 'increasing') return colors.severity.high;
  if (t === 'decreasing') return colors.severity.safe;
  return colors.text.muted;
}

export function ProfileDonut({ profile }: ProfileDonutProps) {
  const total = profile.total_items || 1;
  const segments = [
    { label: 'Synthetic', count: profile.synthetic_count, color: colors.severity.high },
    { label: 'Authentic', count: profile.authentic_count, color: colors.severity.safe },
    { label: 'Unknown', count: profile.unknown_count, color: colors.text.muted },
  ];

  // SVG donut
  const cx = 60, cy = 60, r = 48, stroke = 14;
  const circumference = 2 * Math.PI * r;
  let accum = 0;

  const categoryEntries = Object.entries(profile.category_distribution).sort((a, b) => b[1] - a[1]);
  const maxCat = categoryEntries.length > 0 ? categoryEntries[0][1] : 1;

  const score = Math.round(profile.account_synthetic_score * 100);
  const scoreColor = score >= 60 ? colors.severity.high : score >= 30 ? colors.severity.medium : colors.severity.safe;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Donut + Score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          marginBottom: 16,
          animation: 'synth-fadeSlideUp 0.5s ease 0.2s both',
        }}
      >
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            {/* Background circle */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.bg.tertiary} strokeWidth={stroke} />
            {/* Segments */}
            {segments.map((seg, i) => {
              const fraction = seg.count / total;
              const dashLength = fraction * circumference;
              const gap = circumference - dashLength;
              const rotation = (accum / total) * 360 - 90;
              accum += seg.count;
              if (fraction === 0) return null;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${dashLength} ${gap}`}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                  style={{
                    animation: `synth-donutSegment 0.8s ease ${0.3 + i * 0.15}s both`,
                    opacity: 0,
                  }}
                />
              );
            })}
          </svg>
          {/* Center label */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor, fontFamily, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 8, fontWeight: 500, color: colors.text.muted, fontFamily, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Risk Score
            </div>
          </div>
        </div>

        {/* Legend + Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                animation: `synth-fadeSlideRight 0.4s ease ${0.4 + i * 0.1}s both`,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.primary, fontFamily }}>{seg.count}</div>
                <div style={{ fontSize: 9, color: colors.text.muted, fontFamily }}>{seg.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 16,
          animation: 'synth-fadeSlideUp 0.5s ease 0.4s both',
        }}
      >
        {[
          { label: 'Total Items', value: profile.total_items },
          { label: 'Avg Confidence', value: `${Math.round(profile.avg_confidence * 100)}%` },
          { label: 'Window', value: `${profile.window_days}d` },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
              padding: '12px 14px',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.text.primary, fontFamily }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: colors.text.muted, fontFamily }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Trend indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          marginBottom: 16,
          animation: 'synth-fadeSlideUp 0.5s ease 0.5s both',
        }}
      >
        <TrendIcon trend={profile.trend} />
        <span style={{ fontSize: 12, fontWeight: 600, color: trendColor(profile.trend), fontFamily }}>
          {trendLabel(profile.trend)}
        </span>
        <span style={{ fontSize: 11, color: colors.text.muted, fontFamily }}>
          synthetic activity trend
        </span>
        {profile.last_updated && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.text.muted, fontFamily }}>
            Updated {new Date(profile.last_updated).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Category distribution */}
      {categoryEntries.length > 0 && (
        <div style={{ animation: 'synth-fadeSlideUp 0.5s ease 0.6s both' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.text.primary,
              fontFamily,
              marginBottom: 8,
            }}
          >
            Category Distribution
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
              padding: 14,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            {categoryEntries.map(([cat, count], i) => {
              const pct = Math.round((count / maxCat) * 100);
              return (
                <div key={cat} style={{ marginBottom: i < categoryEntries.length - 1 ? 10 : 0, animation: `synth-fadeSlideRight 0.4s ease ${0.7 + i * 0.08}s both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily, marginBottom: 3 }}>
                    <span style={{ color: colors.text.secondary, fontWeight: 500 }}>{cat}</span>
                    <span style={{ color: colors.text.primary, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: colors.bg.tertiary, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 3,
                        background: `linear-gradient(90deg, ${colors.brand.primary}, ${colors.brand.primaryLight})`,
                        width: `${pct}%`,
                        animation: `synth-barGrow 0.6s ease ${0.8 + i * 0.1}s both`,
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
    </div>
  );
}
