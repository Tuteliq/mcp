import React from 'react';
import { colors, fontFamily, severityColor } from '../theme';

/**
 * V3.15.6 — the hero visualization for grooming + multi-turn incidents.
 *
 * Plots per-message risk_score across the conversation as a smooth line
 * (with area fill), overlays severity-coded dots, and annotates each
 * message where new tactic flags appeared. A textbook grooming
 * conversation shows a 0.1 → 0.95 ramp across rapport → secrecy →
 * photo_request → meeting_request — that pattern tells the story
 * faster and more honestly than any JSON or table can.
 */

interface MessageAnalysisEntry {
  message_index: number;
  risk_score: number;
  flags: string[];
}

interface TrajectoryCurveProps {
  entries: MessageAnalysisEntry[];
  /**
   * Top-level tactic flags from the incident; used to label entries
   * where flags first appeared.
   */
  incidentFlags?: string[];
}

function severityFromScore(score: number): string {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.2) return 'low';
  return 'safe';
}

export function TrajectoryCurve({ entries }: TrajectoryCurveProps) {
  if (!entries || entries.length === 0) return null;

  // Sort by index just in case the persistence path didn't preserve order.
  const sorted = [...entries].sort((a, b) => a.message_index - b.message_index);
  const maxIndex = sorted[sorted.length - 1].message_index;
  const minIndex = sorted[0].message_index;
  const indexSpan = Math.max(1, maxIndex - minIndex);

  // SVG viewport (intrinsically sized; CSS will scale).
  const W = 600;
  const H = 200;
  const PAD = { top: 18, right: 18, bottom: 36, left: 32 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xFor = (idx: number) => PAD.left + ((idx - minIndex) / indexSpan) * plotW;
  const yFor = (score: number) => PAD.top + (1 - score) * plotH;

  // Build the area + line path.
  // Catmull-Rom-to-Bezier smoothing for a less jagged look on short series.
  const points = sorted.map(e => ({ x: xFor(e.message_index), y: yFor(e.risk_score) }));
  const linePath = (() => {
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    const parts: string[] = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }
    return parts.join(' ');
  })();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD.top + plotH} L ${points[0].x} ${PAD.top + plotH} Z`;

  // Horizontal severity guide lines (0.2 / 0.4 / 0.6 / 0.8).
  const guideLines = [0.2, 0.4, 0.6, 0.8];

  // Identify "flag introduction" moments: the first occurrence of each flag
  // across the trajectory. These are the annotation pins.
  const seen = new Set<string>();
  const annotations = sorted.flatMap(e => {
    const newFlags = e.flags.filter(f => !seen.has(f));
    newFlags.forEach(f => seen.add(f));
    return newFlags.length > 0 ? [{ entry: e, newFlags }] : [];
  });

  // Peak score for the score-axis emphasis.
  const peak = Math.max(...sorted.map(e => e.risk_score));
  const peakEntry = sorted.find(e => e.risk_score === peak)!;

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '14px 14px 10px 14px',
        marginBottom: 10,
        fontFamily,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: colors.text.muted,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            Risk Trajectory
          </div>
          <div style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>
            {sorted.length} messages · peak {(peak * 100).toFixed(0)}% at #{peakEntry.message_index}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 9, color: colors.text.muted }}>
          {['safe', 'low', 'medium', 'high', 'critical'].map(level => (
            <span key={level} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: severityColor(level),
                }}
              />
              {level}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="curve-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={severityColor('critical')} stopOpacity="0.18" />
            <stop offset="100%" stopColor={severityColor('critical')} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Severity guide lines */}
        {guideLines.map(g => (
          <g key={g}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={yFor(g)}
              y2={yFor(g)}
              stroke={colors.border}
              strokeDasharray="2,3"
              strokeWidth={0.8}
            />
            <text
              x={PAD.left - 6}
              y={yFor(g) + 3}
              fontSize="9"
              textAnchor="end"
              fill={colors.text.muted}
              fontFamily={fontFamily}
            >
              {Math.round(g * 100)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#curve-area-fill)" stroke="none" />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={severityColor('critical')}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Severity-coded dots at every measured point */}
        {sorted.map(e => {
          const x = xFor(e.message_index);
          const y = yFor(e.risk_score);
          return (
            <circle
              key={e.message_index}
              cx={x}
              cy={y}
              r={3.5}
              fill={severityColor(severityFromScore(e.risk_score))}
              stroke="#fff"
              strokeWidth={1.5}
            >
              <title>{`#${e.message_index} · risk ${(e.risk_score * 100).toFixed(0)}%${e.flags.length ? ' · ' + e.flags.join(', ') : ''}`}</title>
            </circle>
          );
        })}

        {/* Flag-introduction annotations */}
        {annotations.map(({ entry, newFlags }, i) => {
          const x = xFor(entry.message_index);
          const y = yFor(entry.risk_score);
          // Alternate above / below to reduce overlap on dense trajectories
          const above = i % 2 === 0;
          const labelY = above ? y - 16 : y + 26;
          return (
            <g key={`ann-${entry.message_index}`}>
              <line
                x1={x}
                x2={x}
                y1={y}
                y2={labelY + (above ? 4 : -10)}
                stroke={colors.text.muted}
                strokeWidth={0.8}
                strokeDasharray="2,2"
              />
              <text
                x={x}
                y={labelY}
                fontSize="9"
                textAnchor="middle"
                fontWeight="600"
                fill={colors.text.primary}
                fontFamily={fontFamily}
              >
                {newFlags[0]}
              </text>
              {newFlags.length > 1 && (
                <text
                  x={x}
                  y={labelY + (above ? -10 : 10)}
                  fontSize="8"
                  textAnchor="middle"
                  fill={colors.text.muted}
                  fontFamily={fontFamily}
                >
                  + {newFlags.length - 1} more
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis tick labels at start / mid / end */}
        {[sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]].map((e, i) => (
          <text
            key={`xt-${i}`}
            x={xFor(e.message_index)}
            y={PAD.top + plotH + 16}
            fontSize="9"
            textAnchor="middle"
            fill={colors.text.muted}
            fontFamily={fontFamily}
          >
            #{e.message_index}
          </text>
        ))}
      </svg>
    </div>
  );
}
