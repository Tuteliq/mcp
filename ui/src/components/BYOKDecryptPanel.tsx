import React, { useState, useEffect, useRef } from 'react';
import { colors, fontFamily } from '../theme';
import {
  decryptHybridEnvelope,
  fingerprintFromPrivateKey,
  BYOKDecryptError,
  type HybridEnvelope,
} from '../utils/byokDecrypt';

/**
 * V3.15.7 — BYOK paste-in decryption surface.
 *
 * Surfaces when an incident detail contains hybrid-envelope fields the
 * customer must decrypt locally. Three trust-building moves baked in:
 *
 *   1. The "Decrypted locally" banner appears the instant the user
 *      starts pasting a private key — they see the message BEFORE they
 *      submit, not after. That's the moment that converts the privacy
 *      feature into a visible product moment per the V3.15 strategic
 *      audit.
 *
 *   2. The pasted key's fingerprint is computed locally and matched
 *      against `key_fingerprint` on the envelope before we even
 *      attempt decryption. If the fingerprints don't match, we surface
 *      a precise error ("This private key doesn't match the envelope")
 *      instead of a generic crypto failure.
 *
 *   3. The CryptoKey is imported with `extractable: false`, so even if
 *      the page is compromised mid-session, the key bytes can't be
 *      exfiltrated via the Web Crypto API itself. We also never write
 *      the raw PEM to localStorage / sessionStorage / any persistence
 *      tier.
 *
 * On success the decrypted text is passed up via `onDecrypted` so the
 * parent can render it in place of the envelope chip.
 */

interface Envelope {
  field: 'summary' | 'metadata' | 'source_data';
  envelope: HybridEnvelope;
}

interface BYOKDecryptPanelProps {
  envelopes: Envelope[];
  onDecrypted: (field: Envelope['field'], plaintext: string) => void;
}

export function BYOKDecryptPanel({ envelopes, onDecrypted }: BYOKDecryptPanelProps) {
  const [open, setOpen] = useState(false);
  const [pem, setPem] = useState('');
  const [keyFingerprint, setKeyFingerprint] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedFields, setDecryptedFields] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Recompute fingerprint as the user types (debounced via effect).
  useEffect(() => {
    let cancelled = false;
    if (!pem.includes('PRIVATE KEY')) {
      setKeyFingerprint(null);
      return;
    }
    setKeyFingerprint(null);
    const t = setTimeout(async () => {
      const fp = await fingerprintFromPrivateKey(pem);
      if (!cancelled) setKeyFingerprint(fp);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pem]);

  const envelopeFingerprint = envelopes[0]?.envelope.key_fingerprint;
  const fingerprintMatch =
    keyFingerprint && envelopeFingerprint
      ? keyFingerprint === envelopeFingerprint
      : null;

  const remaining = envelopes.filter(e => !decryptedFields.has(e.field));

  async function handleDecrypt() {
    setError(null);
    if (!pem.includes('PRIVATE KEY')) {
      setError('Paste a PEM-formatted private key (begins with "-----BEGIN PRIVATE KEY-----").');
      return;
    }
    if (fingerprintMatch === false) {
      setError(
        `This private key (fingerprint ${keyFingerprint?.slice(0, 16)}…) does not match the envelope (${envelopeFingerprint?.slice(0, 16)}…). Use the matching key.`,
      );
      return;
    }
    setWorking(true);
    try {
      const nextDone = new Set(decryptedFields);
      for (const env of remaining) {
        const plaintext = await decryptHybridEnvelope(env.envelope, pem);
        onDecrypted(env.field, plaintext);
        nextDone.add(env.field);
      }
      setDecryptedFields(nextDone);
      // Clear the textarea immediately — no reason to keep the PEM in the
      // DOM after we've consumed it. CryptoKey objects don't expose their
      // bytes so the key itself is gone too.
      setPem('');
      setKeyFingerprint(null);
      setOpen(false);
    } catch (err) {
      if (err instanceof BYOKDecryptError) {
        const causeMsg = err.cause instanceof Error ? err.cause.message : '';
        setError(`${err.message}. ${causeMsg}`);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setWorking(false);
    }
  }

  if (envelopes.length === 0) return null;
  if (remaining.length === 0) {
    // Everything's been decrypted in this session — show a small
    // confirmation strip instead of the CTA.
    return (
      <div
        style={{
          marginTop: 10,
          padding: '8px 12px',
          background: `${colors.severity.safe}15`,
          border: `1px solid ${colors.severity.safe}55`,
          borderRadius: 8,
          fontSize: 11,
          color: colors.text.secondary,
          fontFamily,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.severity.safe} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>
          <strong>Decrypted locally.</strong> No private key was sent to Tuteliq.
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, fontFamily }}>
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => textareaRef.current?.focus(), 0);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            background: colors.brand.primary,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            fontFamily,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Decrypt {remaining.length} encrypted field{remaining.length > 1 ? 's' : ''} locally
        </button>
      ) : (
        <div
          style={{
            background: '#fff',
            border: `2px solid ${colors.brand.primaryLight}`,
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 4px 12px rgba(27,42,74,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text.primary }}>
              Paste your RSA private key
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPem('');
                setError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 11,
                color: colors.text.muted,
                cursor: 'pointer',
                fontFamily,
              }}
            >
              cancel
            </button>
          </div>

          <div
            style={{
              padding: '8px 10px',
              background: `${colors.severity.safe}15`,
              border: `1px solid ${colors.severity.safe}55`,
              borderRadius: 6,
              fontSize: 11,
              color: colors.text.secondary,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.severity.safe} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span>
              <strong>This key is processed in your browser only.</strong> Decryption happens client-side via the Web Crypto API. The private key is never transmitted to Tuteliq and is wiped from the page as soon as decryption completes.
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={pem}
            onChange={e => setPem(e.target.value)}
            placeholder={'-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----'}
            spellCheck={false}
            autoComplete="off"
            style={{
              width: '100%',
              minHeight: 100,
              padding: '8px 10px',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 10,
              resize: 'vertical',
              color: colors.text.primary,
              background: colors.bg.primary,
            }}
          />

          {keyFingerprint && (
            <div
              style={{
                marginTop: 8,
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 10,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                background:
                  fingerprintMatch === true
                    ? `${colors.severity.safe}15`
                    : fingerprintMatch === false
                      ? `${colors.severity.high}15`
                      : colors.bg.secondary,
                color:
                  fingerprintMatch === true
                    ? colors.severity.safe
                    : fingerprintMatch === false
                      ? colors.severity.high
                      : colors.text.muted,
                border: `1px solid ${
                  fingerprintMatch === true
                    ? colors.severity.safe + '55'
                    : fingerprintMatch === false
                      ? colors.severity.high + '55'
                      : colors.border
                }`,
              }}
            >
              <div>Key fingerprint (SHA-256 of SPKI): {keyFingerprint.slice(0, 32)}…</div>
              {envelopeFingerprint && (
                <div style={{ marginTop: 2 }}>
                  Envelope expects:&nbsp;
                  {envelopeFingerprint.slice(0, 32)}…&nbsp;
                  {fingerprintMatch === true && '✓ match'}
                  {fingerprintMatch === false && '✗ mismatch'}
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                background: `${colors.severity.high}15`,
                border: `1px solid ${colors.severity.high}55`,
                borderRadius: 6,
                color: colors.severity.high,
                fontSize: 11,
                fontFamily,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={working || pem.length === 0 || fingerprintMatch === false}
            onClick={handleDecrypt}
            style={{
              marginTop: 10,
              padding: '8px 14px',
              borderRadius: 8,
              background: working || pem.length === 0 || fingerprintMatch === false
                ? colors.bg.tertiary
                : colors.brand.primary,
              color: working || pem.length === 0 || fingerprintMatch === false
                ? colors.text.muted
                : '#fff',
              border: 'none',
              cursor: working || pem.length === 0 || fingerprintMatch === false ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily,
            }}
          >
            {working ? 'Decrypting…' : `Decrypt ${remaining.length} field${remaining.length > 1 ? 's' : ''} locally`}
          </button>
        </div>
      )}
    </div>
  );
}
