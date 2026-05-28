import React from 'react';
import { createRoot } from 'react-dom/client';
import { useToolResult } from '@ui/hooks/useToolResult';
import { IncidentsListPage } from '@ui/pages/IncidentsListPage';
import { BrandedLoader } from '@ui/components/BrandedLoader';
import { baseStyles } from '@ui/theme';

function Widget() {
  const { data, loading } = useToolResult();
  if (loading || !data) return <BrandedLoader message="Loading incidents..." />;
  return <IncidentsListPage data={data as any} />;
}

const style = document.createElement('style');
style.textContent = baseStyles;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(<Widget />);
