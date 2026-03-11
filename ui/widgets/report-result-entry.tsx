import React from 'react';
import { createRoot } from 'react-dom/client';
import { useToolResult } from '@ui/hooks/useToolResult';
import { AppProvider } from '@ui/context/AppContext';
import { ReportPage } from '@ui/pages/ReportPage';
import { BrandedLoader } from '@ui/components/BrandedLoader';
import { baseStyles } from '@ui/theme';

function Widget() {
  const { data, loading, app } = useToolResult();

  if (loading || !data) {
    return <BrandedLoader message="Generating report..." />;
  }

  return (
    <AppProvider app={app}>
      <ReportPage data={data} />
    </AppProvider>
  );
}

const style = document.createElement('style');
style.textContent = baseStyles;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(<Widget />);
