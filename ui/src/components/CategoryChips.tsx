import React from 'react';
import { colors, fontFamily } from '../theme';

const chipKeyframes = `
@keyframes chip-slideIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
`;

interface CategoryChipsProps {
  categories: Array<string | { tag: string; label?: string }>;
}

export function CategoryChips({ categories }: CategoryChipsProps) {
  if (categories.length === 0) return null;

  return (
    <div style={{ margin: '8px 0' }}>
      <style>{chipKeyframes}</style>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: colors.text.primary,
          fontFamily,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        Categories
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {categories.map((c, i) => {
          const label = typeof c === 'string' ? c : (c.label || c.tag);
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 500,
                color: colors.brand.primary,
                background: '#E6F5F3',
                border: '1px solid #A7DDD5',
                fontFamily,
                animation: `chip-slideIn 0.3s ease ${0.1 + i * 0.06}s both`,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
