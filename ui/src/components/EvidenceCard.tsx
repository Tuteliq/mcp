import React, { useState } from 'react';
import { colors, fonts, radius } from '../theme';
import { Eyebrow } from './primitives';
import type { DetectionEvidence } from '../types';

interface EvidenceCardProps {
  evidence: DetectionEvidence[];
}

/**
 * The passages the detector scored, with the tactic each one matched.
 *
 * Collapsed to two by default. This is quoted source material — often abusive
 * — and a moderator triaging a queue should choose to read it rather than have
 * it unfurled at them by default.
 */
export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  const shown = expanded ? evidence : evidence.slice(0, 2);
  const remaining = evidence.length - 2;

  return (
    <div>
      <Eyebrow style={{ marginBottom: 10 }}>Evidence</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((e, i) => (
          <div
            key={i}
            style={{
              borderLeft: `3px solid ${colors.teal.base}`,
              background: colors.bg.secondary,
              borderRadius: radius.inset,
              padding: '14px 18px',
            }}
          >
            <blockquote
              style={{
                fontSize: 13.5,
                fontStyle: 'italic',
                color: colors.text.body,
                lineHeight: 1.55,
                margin: '0 0 10px',
              }}
            >
              “{e.text}”
            </blockquote>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: fonts.mono,
                  color: colors.teal.deep,
                  background: 'rgba(25,183,155,0.10)',
                  padding: '2px 8px',
                  borderRadius: radius.xs,
                }}
              >
                {e.tactic}
              </span>
              <span
                className="tq-tabular"
                style={{ fontSize: 11, color: colors.text.muted, fontFamily: fonts.mono }}
              >
                weight {e.weight.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          style={{
            background: 'none',
            border: 'none',
            color: colors.teal.deep,
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: fonts.body,
            cursor: 'pointer',
            padding: '10px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
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
            aria-hidden="true"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {expanded ? 'Show less' : `Show ${remaining} more`}
        </button>
      )}
    </div>
  );
}
