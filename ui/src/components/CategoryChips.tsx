import React from 'react';
import { colors } from '../theme';
import { Eyebrow, CategoryChip } from './primitives';

interface CategoryChipsProps {
  categories: Array<string | { tag: string; label?: string }>;
  /**
   * Section label. Pass `null` when nesting inside a card that already names
   * the section — a fan-out view repeating the heading once per detector is
   * noise, not structure.
   */
  label?: React.ReactNode | null;
  /**
   * Severity of the result these categories belong to. Chips take their colour
   * from it, so the row reads as "three critical findings" at a glance rather
   * than as three neutral tags.
   */
  tone?: string;
  /**
   * Render a "none" chip instead of nothing when the list is empty.
   *
   * On a detection card an absent section reads as a rendering failure — the
   * reader cannot tell "nothing matched" from "this did not load". A cleared
   * result is a finding and deserves to be stated.
   */
  showEmpty?: boolean;
  /** Hairline above the section, separating it from the score row. */
  divider?: boolean;
}

/** The specific behaviours the detector matched. */
export function CategoryChips({
  categories,
  label = 'Detected categories',
  tone = 'neutral',
  showEmpty = false,
  divider = false,
}: CategoryChipsProps) {
  const items = categories ?? [];
  if (items.length === 0 && !showEmpty) return null;

  return (
    <div
      style={
        divider
          ? { borderTop: `1px solid ${colors.bg.track}`, paddingTop: 22 }
          : undefined
      }
    >
      {label !== null && <Eyebrow style={{ marginBottom: 10 }}>{label}</Eyebrow>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.length === 0 ? (
          <CategoryChip tone="clear">none</CategoryChip>
        ) : (
          items.map((c, i) => (
            <CategoryChip key={i} tone={tone}>
              {typeof c === 'string' ? c : c.label || c.tag}
            </CategoryChip>
          ))
        )}
      </div>
    </div>
  );
}
