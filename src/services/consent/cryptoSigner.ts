import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';

// Consent Authority signing key (P-256). Persisted so artifacts stay verifiable across restarts;
// mount it from a secret store / HSM in production. '' keeps an ephemeral key (tests).
function loadSigningKey(file: string): crypto.KeyObject {
  if (!file) return crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
  if (fs.existsSync(file)) return crypto.createPrivateKey(fs.readFileSync(file));
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  return privateKey;
}

const privateKey = loadSigningKey(env.CONSENT_KEY_FILE);
const publicKey = crypto.createPublicKey(privateKey);
const { crv, kty, x, y } = publicKey.export({ format: 'jwk' });
// RFC 7638 JWK thumbprint (required members in lexicographic order) — changes automatically on key rotation.
const kid = crypto.createHash('sha256').update(JSON.stringify({ crv, kty, x, y })).digest('base64url');

const b64json = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

// ES256 per RFC 7518 §3.4: raw r||s signature (ieee-p1363), so any standard JOSE/JWT library can verify it.
export class ConsentCryptoSigner {
  public static getKeyId(): string {
    return kid;
  }

  public static getJwks() {
    return { keys: [{ kty, crv, x, y, kid, alg: 'ES256', use: 'sig' }] };
  }

  public static signArtifact(payload: Record<string, unknown>): string {
    const signingInput = `${b64json({ alg: 'ES256', typ: 'JWT', kid })}.${b64json(payload)}`;
    const signature = crypto.sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });
    return `${signingInput}.${signature.toString('base64url')}`;
  }

  public static verifyArtifact(token: string): { valid: boolean; payload?: any; error?: string } {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed JWT structure (3 parts required).' };

    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      if (header.alg !== 'ES256' || header.kid !== kid) {
        return { valid: false, error: 'Unsupported algorithm or unknown signing key.' };
      }

      const isValid = crypto.verify(
        'sha256',
        Buffer.from(`${parts[0]}.${parts[1]}`),
        { key: publicKey, dsaEncoding: 'ieee-p1363' },
        Buffer.from(parts[2], 'base64url')
      );
      if (!isValid) return { valid: false, error: 'Cryptographic signature verification failed (Tampered token).' };

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp) {
        return { valid: false, error: 'Consent token has expired (Exceeded time validity).' };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false, error: 'Malformed consent token.' };
    }
  }
}
