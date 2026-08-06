import React from 'react';
import { colors, fonts, radius } from '../theme';
import { WidgetShell } from '../components/WidgetShell';
import { CardHeader, Tag, StatusPill } from '../components/primitives';
import { useViewState } from '../hooks/useViewState';
import type { ToolResultPayload, ActionPlanResult } from '../types';

interface ViewState {
  completedSteps: number[];
}

/**
 * A checklist the reader works through.
 *
 * Progress persists in view state, so the ticks survive a re-render of the
 * transcript — someone half-way through a safeguarding plan shouldn't lose
 * their place because the conversation scrolled.
 */
export function ActionPlanPage({ data, viewUUID }: { data: ToolResultPayload; viewUUID?: string }) {
  const result = data.result as ActionPlanResult;
  const [viewState, setViewState] = useViewState<ViewState>(viewUUID, { completedSteps: [] });

  const toggleStep = (index: number) =>
    setViewState((prev) => ({
      completedSteps: prev.completedSteps.includes(index)
        ? prev.completedSteps.filter((i) => i !== index)
        : [...prev.completedSteps, index],
    }));

  const completedCount = viewState.completedSteps.length;
  const totalSteps = result.steps.length;
  const allDone = totalSteps > 0 && completedCount === totalSteps;

  return (
    <WidgetShell tool="get_action_plan">
      <CardHeader
        title="Action Plan"
        subtitle={`${totalSteps} step${totalSteps === 1 ? '' : 's'} · written for ${result.audience}`}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
              stroke={colors.teal.base}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        right={completedCount > 0 ? <StatusPill>{completedCount}/{totalSteps} done</StatusPill> : undefined}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Tag>Audience · {result.audience}</Tag>
        <Tag>Tone · {result.tone}</Tag>
        {result.reading_level && <Tag>Reading level · {result.reading_level}</Tag>}
      </div>

      {/* Completion bar. Reads as momentum on a long list, and gives the
          "all done" state somewhere definite to land. */}
      {totalSteps > 0 && (
        <div
          style={{ height: 5, background: colors.bg.track, borderRadius: 3, marginBottom: 20 }}
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-label="Steps completed"
        >
          <div
            style={{
              height: '100%',
              width: `${(completedCount / totalSteps) * 100}%`,
              background: colors.teal.base,
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {result.steps.map((step, i) => {
          const completed = viewState.completedSteps.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleStep(i)}
              aria-pressed={completed}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                textAlign: 'left',
                width: '100%',
                padding: '14px 4px',
                background: 'none',
                // Explicit on every edge. A `borderTop: undefined` here lets
                // the UA's default `2px outset` button border through, because
                // React removes the declaration rather than blanking it.
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                borderTop: i === 0 ? 'none' : `1px solid ${colors.borderSubtle}`,
                cursor: 'pointer',
                fontFamily: fonts.body,
              }}
            >
              <span
                style={{
                  minWidth: 26,
                  width: 26,
                  height: 26,
                  borderRadius: radius.chip,
                  background: completed ? colors.teal.base : colors.ink.base,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12.5,
                  fontWeight: 700,
                  flex: '0 0 auto',
                  marginTop: 1,
                  transition: 'background 0.15s',
                }}
              >
                {completed ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: completed ? colors.text.muted : colors.text.body,
                  lineHeight: 1.55,
                  textDecoration: completed ? 'line-through' : undefined,
                }}
              >
                {step}
              </span>
            </button>
          );
        })}
      </div>

      {allDone && (
        <div
          style={{
            marginTop: 18,
            fontSize: 13,
            fontWeight: 600,
            color: colors.teal.deep,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              stroke={colors.teal.deep}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          All steps complete.
        </div>
      )}
    </WidgetShell>
  );
}
