import React from 'react';
import { colors, radius } from '../theme';
import type { AgeCalibration as AgeCalType } from '../types';

interface AgeCalibrationProps {
  calibration?: AgeCalType;
}

/**
 * Flags that the score was adjusted for the subject's age band.
 *
 * Worth surfacing rather than hiding: the same message scores differently for
 * a 12-year-old than for an adult, and a moderator comparing two results needs
 * to know when that adjustment is in play.
 */
export function AgeCalibration({ calibration }: AgeCalibrationProps) {
  if (!calibration?.applied) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: radius.tag,
        fontSize: 11.5,
        color: colors.text.secondary,
        background: colors.bg.tertiary,
      }}
      title="Score calibrated for the subject's age band"
    >
      <span style={{ fontWeight: 700, color: colors.text.primary }}>Age</span>
      <span>{calibration.age_group}</span>
      {calibration.multiplier && (
        <span style={{ color: colors.text.muted }}>×{calibration.multiplier}</span>
      )}
    </span>
  );
}
