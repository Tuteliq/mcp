import React, { createContext, useContext } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';

const AppContext = createContext<App | null>(null);

export function AppProvider({ app, children }: { app: App | null; children: React.ReactNode }) {
  return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}

export function useAppContext(): App | null {
  return useContext(AppContext);
}
