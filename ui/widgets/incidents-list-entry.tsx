import React from 'react';
import { createRoot } from 'react-dom/client';
import { useToolResult } from '@ui/hooks/useToolResult';
import { AppProvider } from '@ui/context/AppContext';
import { IncidentsListPage } from '@ui/pages/IncidentsListPage';
import { BrandedLoader } from '@ui/components/BrandedLoader';
import { baseStyles } from '@ui/theme';

function Widget() {
  const { data, loading, app } = useToolResult();
  if (loading || !data) return <BrandedLoader message="Loading incidents..." />;
  return (
    <AppProvider app={app}>
      <IncidentsListPage data={data as any} />
    </AppProvider>
  );
}

const style = document.createElement('style');
style.textContent = baseStyles;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(<Widget />);
