import React from 'react';
import { colors, fonts, radius } from '../theme';
import { WidgetShell } from './WidgetShell';

const loaderKeyframes = `
@keyframes tq-skeleton {
  0%   { opacity: 0.55; }
  50%  { opacity: 1; }
  100% { opacity: 0.55; }
}
@keyframes tq-sweep {
  from { transform: translateX(-100%); }
  to   { transform: translateX(320%); }
}
`;

function Skeleton({ width, height = 12, radius: r = 4 }: { width: number | string; height?: number; radius?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: r,
        background: colors.bg.track,
        animation: 'tq-skeleton 1.4s ease-in-out infinite',
      }}
    />
  );
}

interface BrandedLoaderProps {
  message?: string;
}

/**
 * Loading state, rendered *inside* the real shell.
 *
 * The card frame, chrome bar and footer are final from the first paint, so
 * when the result arrives only the body swaps — nothing reflows and the
 * transcript doesn't jump under the user's cursor. The tool slot carries a
 * skeleton rather than a placeholder name because the entrypoint serves many
 * tools and we don't yet know which one ran.
 */
export function BrandedLoader({ message = 'Analysing…' }: BrandedLoaderProps) {
  return (
    <>
      <style>{loaderKeyframes}</style>
      <WidgetShell tool={<Skeleton width={110} height={11} />} footerNote="Encrypted · SOC-aligned handling">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.tile,
              background: colors.ink.base,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 50 50" aria-hidden="true">
              <circle cx="25" cy="25" r="19" fill="none" stroke={colors.ink.raised} strokeWidth="5" />
              <circle
                cx="25"
                cy="25"
                r="19"
                fill="none"
                stroke={colors.teal.base}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="38 82"
                style={{ animation: 'tq-spin 1s linear infinite', transformOrigin: '25px 25px' }}
              />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: 18,
                color: colors.text.primary,
              }}
              role="status"
            >
              {message}
            </div>
            <div style={{ fontSize: 13, color: colors.text.muted, marginTop: 3 }}>
              Tuteliq — Guardian Intelligence
            </div>
          </div>
        </div>

        {/* Sweep bar: a single honest "work in progress" signal. We have no
            real progress figure from the API, so we don't fake a percentage. */}
        <div
          style={{
            height: 3,
            borderRadius: 2,
            background: colors.bg.track,
            overflow: 'hidden',
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: '30%',
              height: '100%',
              borderRadius: 2,
              background: colors.teal.base,
              animation: 'tq-sweep 1.4s ease-in-out infinite',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton width="100%" height={64} radius={radius.tile} />
          <Skeleton width="82%" />
          <Skeleton width="64%" />
        </div>

        <style>{`@keyframes tq-spin { to { transform: rotate(360deg); } }`}</style>
      </WidgetShell>
    </>
  );
}
