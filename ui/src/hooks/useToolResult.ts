import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import type { App } from '@modelcontextprotocol/ext-apps';
import type { ToolResultPayload } from '../types';

export function useToolResult() {
  const [data, setData] = useState<ToolResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const onAppCreated = useCallback((app: App) => {
    app.ontoolresult = (result) => {
      if (result.structuredContent) {
        setData(result.structuredContent as unknown as ToolResultPayload);
      }
      setLoading(false);
    };
  }, []);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'Tuteliq', version: '3.0.0' },
    capabilities: {},
    onAppCreated,
  });

  const callTool = useCallback(
    async (name: string, args: Record<string, unknown> = {}) => {
      if (!app) return null;
      return app.callServerTool({ name, arguments: args });
    },
    [app],
  );

  return { data, loading, error, isConnected, callTool, app };
}
