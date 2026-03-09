import React from 'react';
import { AppWrapper } from '../App';
import { colors } from '../theme';
import type { ToolResultPayload, ActionPlanResult } from '../types';

export function ActionPlanPage({ data }: { data: ToolResultPayload }) {
  const result = data.result as ActionPlanResult;

  return (
    <AppWrapper title="Action Plan">
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: '#E6F5F3', fontSize: 12, color: colors.brand.primary }}>
          <strong>Audience:</strong> {result.audience}
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: colors.bg.secondary, fontSize: 12, color: colors.text.secondary }}>
          <strong>Tone:</strong> {result.tone}
        </div>
        {result.reading_level && (
          <div style={{ padding: '4px 10px', borderRadius: 8, background: colors.bg.secondary, fontSize: 12, color: colors.text.secondary }}>
            <strong>Reading Level:</strong> {result.reading_level}
          </div>
        )}
      </div>

      <div style={{ margin: '12px 0' }}>
        {result.steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              padding: '10px 0',
              borderBottom: i < result.steps.length - 1 ? `1px solid ${colors.border}` : undefined,
            }}
          >
            <div
              style={{
                minWidth: 28,
                height: 28,
                borderRadius: '50%',
                background: '#2A9D8F',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 1.6, paddingTop: 3 }}>
              {step}
            </div>
          </div>
        ))}
      </div>
    </AppWrapper>
  );
}
