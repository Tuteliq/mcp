import React from 'react';
import { createRoot } from 'react-dom/client';
import { useToolResult } from '@ui/hooks/useToolResult';
import { DetectionPage } from '@ui/pages/DetectionPage';
import { LoadingScreen } from '@ui/components/LoadingScreen';
import { baseStyles } from '@ui/theme';

function Widget() {
  const { data, loading } = useToolResult();

  if (loading || !data) {
    return <LoadingScreen message="Analyzing content..." />;
  }

  return <DetectionPage data={data} />;
}

const style = document.createElement('style');
style.textContent = baseStyles;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(<Widget />);
