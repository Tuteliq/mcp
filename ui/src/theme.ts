export const colors = {
  brand: {
    primary: '#1B2A4A',
    primaryLight: '#2A9D8F',
    primaryDark: '#1B2A4A',
  },
  severity: {
    safe: '#81B29A',
    low: '#F2CC8F',
    medium: '#E8A85C',
    high: '#D94F3D',
    critical: '#B5543D',
  },
  bg: {
    primary: '#F7F9FC',
    secondary: '#F0F4F8',
    tertiary: '#E8ECF0',
  },
  text: {
    primary: '#1B2A4A',
    secondary: '#4A5568',
    muted: '#94A3B8',
  },
  border: '#E2E8F0',
} as const;

export function severityColor(level: string): string {
  const map: Record<string, string> = {
    safe: colors.severity.safe,
    none: colors.severity.safe,
    low: colors.severity.low,
    medium: colors.severity.medium,
    high: colors.severity.high,
    critical: colors.severity.critical,
  };
  return map[level] || colors.text.muted;
}

export const fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ${fontFamily};
    color: ${colors.text.primary};
    background: ${colors.bg.primary};
    font-size: 14px;
    line-height: 1.5;
    padding: 16px;
  }
`;
