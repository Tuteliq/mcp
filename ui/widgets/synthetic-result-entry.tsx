import React from 'react';
import { createRoot } from 'react-dom/client';
import { useToolResult } from '@ui/hooks/useToolResult';
import { SyntheticPage } from '@ui/pages/SyntheticPage';
import { BrandedLoader } from '@ui/components/BrandedLoader';
import { baseStyles } from '@ui/theme';

function Widget() {
  const { data, viewUUID, loading } = useToolResult();

  if (loading || !data) {
    return <BrandedLoader message="Analyzing synthetic content..." />;
  }

  return <SyntheticPage data={data} viewUUID={viewUUID} />;
}

const style = document.createElement('style');
style.textContent = baseStyles;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(<Widget />);
