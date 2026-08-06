import React from 'react';
import { colors } from '../theme';
import { WidgetShell } from '../components/WidgetShell';
import { CardHeader, Callout, Eyebrow } from '../components/primitives';
import { SeverityBadge } from '../components/SeverityBadge';
import { CategoryChips } from '../components/CategoryChips';
import type { ToolResultPayload, ReportResult } from '../types';

export function ReportPage({ data }: { data: ToolResultPayload; viewUUID?: string }) {
  const result = data.result as ReportResult;

  return (
    <WidgetShell tool="generate_report">
      <CardHeader
        title="Incident Report"
        subtitle="Generated summary for case notes and escalation"
        right={<SeverityBadge level={result.risk_level} />}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
              stroke={colors.teal.base}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M14 2v6h6" stroke={colors.teal.base} strokeWidth="2" strokeLinejoin="round" />
            <path
              d="M16 13H8M16 17H8"
              stroke={colors.teal.base}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Callout title="Summary">{result.summary}</Callout>

        {result.categories.length > 0 && <CategoryChips categories={result.categories} />}

        <div>
          <Eyebrow style={{ marginBottom: 12 }}>Recommended next steps</Eyebrow>
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {result.recommended_next_steps.map((step, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${colors.borderSubtle}`,
                  fontSize: 14,
                  color: colors.text.body,
                  lineHeight: 1.55,
                }}
              >
                <span
                  className="tq-tabular"
                  style={{ fontWeight: 700, color: colors.teal.deep, flex: '0 0 auto' }}
                >
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </WidgetShell>
  );
}
