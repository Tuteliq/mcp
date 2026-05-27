/**
 * Adds a viewUUID to a tool result's _meta, enabling client-side
 * view state persistence (collapsed sections, checked steps, etc.).
 *
 * @see https://apps.extensions.modelcontextprotocol.io/api/documents/patterns.html#persisting-view-state
 */
export function withViewId<T extends { structuredContent: Record<string, unknown>; content: unknown[] }>(
  result: T,
): T & { _meta: { viewUUID: string } } {
  return { ...result, _meta: { viewUUID: crypto.randomUUID() } };
}
