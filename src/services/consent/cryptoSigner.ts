import crypto from 'crypto';

export class ConsentCryptoSigner {
  private static privateKey: crypto.KeyObject;
  private static publicKey: crypto.KeyObject;
  private static keyId: string = 'mahalink-consent-ca-2026';
  private static initialized: boolean = false;

  public static initialize(): void {
    if (this.initialized) return;

    // Generate or load NIST P-256 (prime256v1) keypair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.initialized = true;
  }

  public static getKeyId(): string {
    return this.keyId;
  }

  public static signArtifact(payload: Record<string, any>): string {
    this.initialize();

    const header = {
      alg: 'ES256',
      typ: 'JWT',
      kid: this.keyId,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const sign = crypto.createSign('SHA256');
    sign.update(signingInput);
    sign.end();

    const signature = sign.sign(this.privateKey, 'base64url');
    return `${signingInput}.${signature}`;
  }

  public static verifyArtifact(token: string): { valid: boolean; payload?: any; error?: string } {
    this.initialize();

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Malformed JWT structure (3 parts required).' };
      }

      const [encodedHeader, encodedPayload, signature] = parts;
      const signingInput = `${encodedHeader}.${encodedPayload}`;

      const verify = crypto.createVerify('SHA256');
      verify.update(signingInput);
      verify.end();

      const isValid = verify.verify(this.publicKey, signature, 'base64url');
      if (!isValid) {
        return { valid: false, error: 'Cryptographic signature verification failed (Tampered token).' };
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

      // Check expiration
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        return { valid: false, error: 'Consent token has expired (Exceeded time validity).' };
      }

      return { valid: true, payload };
    } catch (err: any) {
      return { valid: false, error: `Verification exception: ${err.message}` };
    }
  }
}
