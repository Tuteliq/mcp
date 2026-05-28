/**
 * V3.15.7 — client-side BYOK decryption.
 *
 * Tuteliq stores incident summary / metadata / source_data as hybrid
 * envelopes (`TLQ-HYBRID-RSA-OAEP-AES-256-GCM-v1`) when the customer
 * has registered a public key. Tuteliq cannot decrypt — only the
 * holder of the matching RSA private key can. This utility does the
 * decryption entirely in the browser using the Web Crypto API; no
 * private key material ever leaves the page.
 *
 * Crypto details (must match `hybridEncryptForCustomer` server-side):
 *
 *   1. Decode `encrypted_key` (base64) → RSA-OAEP-decrypt with the
 *      caller's PEM private key (SHA-256 hash for OAEP).
 *   2. Result is a 32-byte AES-256 key.
 *   3. Decode `iv` (base64, 12 bytes) and `ciphertext`+`auth_tag`
 *      (base64) — Web Crypto's AES-GCM concatenates ciphertext + tag
 *      while the envelope keeps them separate, so we concat at the
 *      boundary.
 *   4. AES-GCM-256 decrypt → UTF-8 plaintext.
 */

export interface HybridEnvelope {
  scheme: 'TLQ-HYBRID-RSA-OAEP-AES-256-GCM-v1';
  key_fingerprint: string;
  encrypted_key: string;
  iv: string;
  ciphertext: string;
  auth_tag: string;
}

export class BYOKDecryptError extends Error {
  constructor(public step: string, public cause?: unknown) {
    super(`BYOK decryption failed at step: ${step}`);
    this.name = 'BYOKDecryptError';
  }
}

function base64ToBytes(b64: string): Uint8Array {
  // atob handles standard base64; envelope uses standard base64 from Node's
  // Buffer.toString('base64'). No URL-safe variant in the envelope.
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pemToBinaryDer(pem: string): Uint8Array {
  // Accept PKCS#8 ("-----BEGIN PRIVATE KEY-----") which is what Web Crypto
  // wants via importKey('pkcs8', …). RSA PKCS#1 ("BEGIN RSA PRIVATE KEY")
  // would need a separate path; we surface a clear error for it instead of
  // silently failing.
  const trimmed = pem.trim();
  if (/-----BEGIN RSA PRIVATE KEY-----/.test(trimmed)) {
    throw new BYOKDecryptError(
      'unsupported-key-format',
      new Error('Web Crypto requires a PKCS#8 PEM ("-----BEGIN PRIVATE KEY-----"). Convert with: openssl pkcs8 -topk8 -nocrypt -in input.pem -out output.pem'),
    );
  }
  const match = trimmed.match(/-----BEGIN [^-]+-----([\s\S]+?)-----END [^-]+-----/);
  if (!match) {
    throw new BYOKDecryptError(
      'pem-parse',
      new Error('Could not find a PEM block. Expected "-----BEGIN PRIVATE KEY-----" header.'),
    );
  }
  const b64 = match[1].replace(/\s+/g, '');
  return base64ToBytes(b64);
}

async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  const der = pemToBinaryDer(pem);
  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      der,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt'],
    );
  } catch (err) {
    throw new BYOKDecryptError('import-key', err);
  }
}

async function unwrapAesKey(
  envelope: HybridEnvelope,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const wrappedAes = base64ToBytes(envelope.encrypted_key);
  let aesRaw: ArrayBuffer;
  try {
    aesRaw = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      wrappedAes,
    );
  } catch (err) {
    throw new BYOKDecryptError(
      'rsa-decrypt',
      new Error('RSA-OAEP unwrap failed. The private key likely does not match the key fingerprint on this envelope.'),
    );
  }
  if (aesRaw.byteLength !== 32) {
    throw new BYOKDecryptError(
      'aes-key-length',
      new Error(`Unwrapped AES key has wrong length (${aesRaw.byteLength} bytes; expected 32).`),
    );
  }
  return crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM' }, false, ['decrypt']);
}

async function aesGcmDecrypt(
  envelope: HybridEnvelope,
  aesKey: CryptoKey,
): Promise<string> {
  const iv = base64ToBytes(envelope.iv);
  const ct = base64ToBytes(envelope.ciphertext);
  const tag = base64ToBytes(envelope.auth_tag);
  // Web Crypto's AES-GCM API expects the auth tag appended to the ciphertext
  // bytes; our envelope keeps them separate (server-side Node crypto uses
  // setAuthTag()). We concat at the boundary.
  const ctWithTag = new Uint8Array(ct.length + tag.length);
  ctWithTag.set(ct, 0);
  ctWithTag.set(tag, ct.length);
  let plaintextBuf: ArrayBuffer;
  try {
    plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      ctWithTag,
    );
  } catch (err) {
    throw new BYOKDecryptError(
      'aes-gcm-decrypt',
      new Error('AES-GCM decryption failed. The envelope may be tampered or the unwrapped key is wrong.'),
    );
  }
  return new TextDecoder('utf-8').decode(plaintextBuf);
}

/**
 * Decrypt a single hybrid envelope using the caller's RSA private key.
 * Returns the UTF-8 plaintext. Throws BYOKDecryptError with a `.step`
 * tag on any failure so the UI can surface specific guidance.
 *
 * NEVER persist the private key. Treat the CryptoKey object as
 * session-only — `crypto.subtle.importKey(extractable: false)` enforces
 * that the imported key is not exfiltrable through the API surface.
 */
export async function decryptHybridEnvelope(
  envelope: HybridEnvelope,
  privateKeyPem: string,
): Promise<string> {
  if (envelope.scheme !== 'TLQ-HYBRID-RSA-OAEP-AES-256-GCM-v1') {
    throw new BYOKDecryptError(
      'unsupported-scheme',
      new Error(`Unexpected envelope scheme: ${envelope.scheme}`),
    );
  }
  const privateKey = await importRsaPrivateKey(privateKeyPem);
  const aesKey = await unwrapAesKey(envelope, privateKey);
  return aesGcmDecrypt(envelope, aesKey);
}

/**
 * Compute the SHA-256 of the SPKI public key bytes derived from the
 * provided PRIVATE key PEM, hex-encoded. The result should equal the
 * `key_fingerprint` returned by /account/keys when the customer
 * registered the corresponding public key — useful for letting the
 * user verify which key is loaded before they paste a sensitive
 * envelope. Returns null if the PEM can't be parsed.
 */
export async function fingerprintFromPrivateKey(privateKeyPem: string): Promise<string | null> {
  try {
    const der = pemToBinaryDer(privateKeyPem);
    const privKey = await crypto.subtle.importKey(
      'pkcs8',
      der,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['decrypt'],
    );
    // Derive the public key SPKI by re-exporting via JWK then importing as public.
    const jwk = await crypto.subtle.exportKey('jwk', privKey);
    const pubJwk = { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RSA-OAEP-256', ext: true };
    const pubKey = await crypto.subtle.importKey(
      'jwk',
      pubJwk as JsonWebKey,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt'],
    );
    const spki = await crypto.subtle.exportKey('spki', pubKey);
    const digest = await crypto.subtle.digest('SHA-256', spki);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}
