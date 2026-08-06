import React from 'react';
import { BrandedLoader } from './BrandedLoader';

interface LoadingScreenProps {
  message?: string;
}

/**
 * @deprecated Use {@link BrandedLoader}.
 *
 * These were two near-identical loaders that had drifted apart — one animated
 * a base64 PNG of the logo, the other an SVG ring. Kept as an alias so older
 * call sites keep working.
 */
export function LoadingScreen({ message }: LoadingScreenProps) {
  return <BrandedLoader message={message} />;
}
