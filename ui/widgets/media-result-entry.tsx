import React from 'react';
import { createRoot } from 'react-dom/client';
import { useToolResult } from '@ui/hooks/useToolResult';
import { AppProvider } from '@ui/context/AppContext';
import { MediaPage } from '@ui/pages/MediaPage';
import { BrandedLoader } from '@ui/components/BrandedLoader';
import { baseStyles } from '@ui/theme';

function Widget() {
  const { data, viewUUID, loading, app } = useToolResult();

  if (loading || !data) {
    return <BrandedLoader message="Analyzing media..." />;
  }

  return (
    <AppProvider app={app}>
      <MediaPage data={data} viewUUID={viewUUID} />
    </AppProvider>
  );
}

const style = document.createElement('style');
style.textContent = baseStyles;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(<Widget />);
