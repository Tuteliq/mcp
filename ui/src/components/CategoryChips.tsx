import React from 'react';
import { colors } from '../theme';

interface CategoryChipsProps {
  categories: Array<string | { tag: string; label?: string }>;
}

export function CategoryChips({ categories }: CategoryChipsProps) {
  if (categories.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
      {categories.map((c, i) => {
        const label = typeof c === 'string' ? c : (c.label || c.tag);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 500,
              color: colors.brand.primary,
              background: '#E6F5F3',
              border: `1px solid #A7DDD5`,
            }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
