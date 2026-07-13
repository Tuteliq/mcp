import React from 'react';
import { AppWrapper } from '../App';
import { colors } from '../theme';
import { useViewState } from '../hooks/useViewState';
import type { ToolResultPayload, ActionPlanResult } from '../types';

interface ViewState {
  completedSteps: number[];
}

export function ActionPlanPage({ data, viewUUID }: { data: ToolResultPayload; viewUUID?: string }) {
  const result = data.result as ActionPlanResult;
  const [viewState, setViewState] = useViewState<ViewState>(viewUUID, { completedSteps: [] });

  const toggleStep = (index: number) => {
    setViewState((prev) => {
      const completed = prev.completedSteps.includes(index)
        ? prev.completedSteps.filter((i) => i !== index)
        : [...prev.completedSteps, index];
      return { completedSteps: completed };
    });
  };

  const completedCount = viewState.completedSteps.length;
  const totalSteps = result.steps.length;

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
        {completedCount > 0 && (
          <div style={{ padding: '4px 10px', borderRadius: 8, background: completedCount === totalSteps ? '#D4EDDA' : '#FFF3CD', fontSize: 12, color: completedCount === totalSteps ? '#155724' : '#856404' }}>
            <strong>{completedCount}/{totalSteps}</strong> completed
          </div>
        )}
      </div>

      <div style={{ margin: '12px 0' }}>
        {result.steps.map((step, i) => {
          const completed = viewState.completedSteps.includes(i);
          return (
            <div
              key={i}
              onClick={() => toggleStep(i)}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 0',
                borderBottom: i < result.steps.length - 1 ? `1px solid ${colors.border}` : undefined,
                cursor: 'pointer',
                opacity: completed ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <div
                style={{
                  minWidth: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: completed ? '#95D5AE' : '#2A9D8F',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                {completed ? '\u2713' : i + 1}
              </div>
              <div style={{
                fontSize: 13,
                color: colors.text.secondary,
                lineHeight: 1.6,
                paddingTop: 3,
                textDecoration: completed ? 'line-through' : undefined,
              }}>
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </AppWrapper>
  );
}
