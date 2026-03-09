import React from 'react';
import { AppWrapper } from '../App';
import { SeverityBadge } from '../components/SeverityBadge';
import { CategoryChips } from '../components/CategoryChips';
import { colors } from '../theme';
import type { ToolResultPayload, ReportResult } from '../types';

export function ReportPage({ data }: { data: ToolResultPayload }) {
  const result = data.result as ReportResult;

  return (
    <AppWrapper title="Incident Report">
      <div style={{ marginBottom: 16 }}>
        <SeverityBadge level={result.risk_level} />
      </div>

      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Summary</div>
        <div style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 1.6 }}>{result.summary}</div>
      </div>

      {result.categories.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Categories</div>
          <CategoryChips categories={result.categories} />
        </div>
      )}

      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Recommended Next Steps</div>
        {result.recommended_next_steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 8,
              padding: '6px 0',
              fontSize: 13,
              color: colors.text.secondary,
            }}
          >
            <span style={{ fontWeight: 600, color: colors.brand.primary }}>{i + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

    </AppWrapper>
  );
}
