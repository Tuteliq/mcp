import React from 'react';
import { colors } from '../theme';
import { useAppContext } from '../context/AppContext';

const links = [
  { label: 'tuteliq.ai', href: 'https://tuteliq.ai' },
  { label: 'Trust Center', href: 'https://trust.tuteliq.ai' },
  { label: 'Documentation', href: 'https://docs.tuteliq.ai' },
];

export function FooterLinks() {
  const app = useAppContext();

  const handleClick = (url: string, event: React.MouseEvent) => {
    event.preventDefault();
    if (app) {
      app.openLink({ url }).catch(() => {
        navigator.clipboard.writeText(url).catch(() => {});
      });
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        marginTop: 20,
        paddingTop: 12,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          onClick={(e) => handleClick(link.href, e)}
          style={{
            fontSize: 11,
            color: colors.brand.primary,
            textDecoration: 'none',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
