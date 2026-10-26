import crypto from 'crypto';
import { env } from '../../config/env';

// Verhoeff tables: UIDAI uses the Verhoeff checksum for the 12th Aadhaar digit.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

const reversedDigits = (s: string) => s.split('').reverse().map(Number);

export function aadhaarCheckDigit(first11: string): number {
  const c = reversedDigits(first11).reduce((acc, digit, i) => D[acc][P[(i + 1) % 8][digit]], 0);
  return INV[c];
}

// 12 digits, cannot start with 0 or 1, valid Verhoeff checksum.
export function isValidAadhaar(value: string): boolean {
  if (!/^[2-9]\d{11}$/.test(value)) return false;
  return reversedDigits(value).reduce((acc, digit, i) => D[acc][P[i % 8][digit]], 0) === 0;
}

export const maskAadhaar = (aadhaar: string) => `XXXX-XXXX-${aadhaar.slice(-4)}`;

// Keyed hash (HMAC-SHA256 with a state-held pepper): the raw identifier never leaves the gateway and
// the digest cannot be brute-forced from the 10^11 Aadhaar space without the pepper.
export function hashIdentity(value: string, namespace: 'aadhaar' | 'oidc'): string {
  return crypto.createHmac('sha256', env.AADHAAR_PEPPER).update(`${namespace}:${value}`).digest('hex');
}
