import React from 'react';
import { colors } from '../theme';

interface ActionCardProps {
  action: string;
}

export function ActionCard({ action }: ActionCardProps) {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        background: '#EFF6F2',
        border: `1px solid #B5D5C3`,
        margin: '8px 0',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#81B29A', marginBottom: 4 }}>
        Recommended Action
      </div>
      <div style={{ fontSize: 13, color: '#2D5A3F' }}>{action}</div>
    </div>
  );
}
