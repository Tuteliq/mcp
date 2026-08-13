import React from 'react';
import {
  StatusBanner,
  ShieldAlertIcon,
  WarningIcon,
  QuestionIcon,
  ShieldCheckIcon,
} from './StatusBanner';

type Classification =
  | 'confirmed_synthetic'
  | 'suspected_synthetic'
  | 'unknown'
  | 'confirmed_authentic';

/**
 * Synthetic-media verdict.
 *
 * Mapped onto the same severity ramp as every detection result so that a
 * forensics card and a grooming card can sit in one transcript and be ranked
 * against each other. `unknown` deliberately lands on `low` rather than a
 * neutral grey of its own: inconclusive is a real outcome that should recede,
 * not a fourth colour family.
 */
const config: Record<
  Classification,
  { level: string; label: string; subtitle: string; icon: React.FC<{ color: string; size?: number }> }
> = {
  confirmed_synthetic: {
    level: 'critical',
    label: 'Confirmed synthetic',
    subtitle: 'Forensic signals indicate this media was generated or manipulated',
    icon: ShieldAlertIcon,
  },
  suspected_synthetic: {
    level: 'medium',
    label: 'Suspected synthetic',
    subtitle: 'Some signals suggest manipulation. Review before relying on this media',
    icon: WarningIcon,
  },
  unknown: {
    level: 'low',
    label: 'Inconclusive',
    subtitle: 'Not enough signal to reach a verdict either way',
    icon: QuestionIcon,
  },
  confirmed_authentic: {
    level: 'safe',
    label: 'Confirmed authentic',
    subtitle: 'No indicators of generation or manipulation found',
    icon: ShieldCheckIcon,
  },
};

export function ClassificationBanner({ classification }: { classification: Classification }) {
  const c = config[classification] || config.unknown;
  return (
    <StatusBanner
      level={c.level}
      title={c.label}
      subtitle={c.subtitle}
      icon={c.icon}
      style={{ marginBottom: 26 }}
    />
  );
}
