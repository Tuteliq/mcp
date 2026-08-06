import React from 'react';
import { Eyebrow, CategoryChip } from './primitives';

interface CategoryChipsProps {
  categories: Array<string | { tag: string; label?: string }>;
  /**
   * Section label. Pass `null` when nesting inside a card that already names
   * the section — a fan-out view repeating "CATEGORIES" once per detector is
   * noise, not structure.
   */
  label?: React.ReactNode | null;
}

/** The specific behaviours the detector matched. */
export function CategoryChips({ categories, label = 'Categories' }: CategoryChipsProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div>
      {label !== null && <Eyebrow style={{ marginBottom: 10 }}>{label}</Eyebrow>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((c, i) => (
          <CategoryChip key={i}>{typeof c === 'string' ? c : c.label || c.tag}</CategoryChip>
        ))}
      </div>
    </div>
  );
}
