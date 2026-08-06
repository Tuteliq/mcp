import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import type { App } from '@modelcontextprotocol/ext-apps';
import type { ToolResultPayload } from '../types';

export function useToolResult() {
  const [data, setData] = useState<ToolResultPayload | null>(null);
  const [viewUUID, setViewUUID] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const onAppCreated = useCallback((app: App) => {
    app.ontoolresult = (result) => {
      if (result.structuredContent) {
        setData(result.structuredContent as unknown as ToolResultPayload);
      }
      if (result._meta?.viewUUID) {
        setViewUUID(String(result._meta.viewUUID));
      }
      setLoading(false);
    };
  }, []);

  const { app, isConnected, error } = useApp({
    // Injected from package.json at build time — see vite.config.ts. Hardcoding
    // this is how it ended up stuck at 3.0.0 across eighteen releases.
    appInfo: { name: 'Tuteliq', version: __TUTELIQ_VERSION__ },
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

  return { data, viewUUID, loading, error, isConnected, callTool, app };
}
