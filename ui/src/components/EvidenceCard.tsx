import React, { useState } from 'react';
import { colors, fontFamily } from '../theme';
import type { DetectionEvidence } from '../types';

const evidenceKeyframes = `
@keyframes evidence-fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

interface EvidenceCardProps {
  evidence: DetectionEvidence[];
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  const shown = expanded ? evidence : evidence.slice(0, 2);

  return (
    <div style={{ margin: '12px 0' }}>
      <style>{evidenceKeyframes}</style>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 8,
          color: colors.text.primary,
          fontFamily,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        Evidence
      </div>
      {shown.map((e, i) => (
        <div
          key={i}
          style={{
            padding: '10px 14px',
            marginBottom: 6,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            borderLeft: `3px solid ${colors.brand.primaryLight}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            animation: `evidence-fadeIn 0.4s ease ${0.1 + i * 0.08}s both`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontStyle: 'italic',
              color: colors.text.secondary,
              marginBottom: 6,
              lineHeight: 1.6,
              fontFamily,
            }}
          >
            &ldquo;{e.text}&rdquo;
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
              color: colors.text.muted,
              fontFamily,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                padding: '1px 8px',
                borderRadius: 6,
                background: `${colors.brand.primaryLight}15`,
                color: colors.brand.primaryLight,
                fontSize: 10,
              }}
            >
              {e.tactic}
            </span>
            <span style={{ fontSize: 10 }}>
              weight: <strong style={{ color: colors.text.secondary }}>{e.weight.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      ))}
      {evidence.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: colors.brand.primaryLight,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '6px 0',
            fontFamily,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {expanded ? 'Show less' : `Show ${evidence.length - 2} more`}
        </button>
      )}
    </div>
  );
}
