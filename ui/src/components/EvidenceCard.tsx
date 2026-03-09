import React, { useState } from 'react';
import { colors } from '../theme';
import type { DetectionEvidence } from '../types';

interface EvidenceCardProps {
  evidence: DetectionEvidence[];
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  const shown = expanded ? evidence : evidence.slice(0, 2);

  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: colors.text.primary }}>
        Evidence
      </div>
      {shown.map((e, i) => (
        <div
          key={i}
          style={{
            padding: '8px 12px',
            marginBottom: 6,
            borderRadius: 8,
            background: colors.bg.secondary,
            borderLeft: `3px solid ${colors.brand.primaryLight}`,
          }}
        >
          <div style={{ fontSize: 12, fontStyle: 'italic', color: colors.text.secondary, marginBottom: 4 }}>
            "{e.text}"
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.text.muted }}>
            <span style={{ fontWeight: 600 }}>{e.tactic}</span>
            <span>weight: {e.weight.toFixed(2)}</span>
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
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          {expanded ? 'Show less' : `Show ${evidence.length - 2} more`}
        </button>
      )}
    </div>
  );
}
