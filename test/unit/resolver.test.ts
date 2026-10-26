import { describe, expect, it } from 'vitest';
import { aadhaarCheckDigit, hashIdentity, isValidAadhaar } from '../../src/services/auth/identity';
import { IdentityResolver } from '../../src/services/resolver/identityResolver';
import { calculateStringSimilarity } from '../../src/services/resolver/levenshtein';
import { normalizeName, transliterateDevanagari } from '../../src/services/resolver/transliteration';

describe('Identity Resolver & Phonetic Transliteration Engine', () => {
  it('should transliterate Marathi Devanagari to Latin phonetics correctly', () => {
    expect(transliterateDevanagari('प्रिया शर्मा')).toBe('priya sharma');
    expect(transliterateDevanagari('राजेश पवार')).toBe('rajesh pawar');
    expect(transliterateDevanagari('अनन्या देशमुख')).toBe('ananya deshmukh');
  });

  it('keeps the inherent vowel for names outside the alias dictionary', () => {
    expect(transliterateDevanagari('कविता')).toBe('kavita');
    expect(transliterateDevanagari('मोरे')).toBe('more');
  });

  it('should normalize strings removing titles and punctuation', () => {
    expect(normalizeName('Smt. Priya R. Sharma')).toBe('priya r sharma');
    expect(normalizeName('Dr. Rajesh Ganpat Pawar')).toBe('rajesh ganpat pawar');
    expect(normalizeName('शर्मा प्रिया रमेश')).toBe('sharma priya ramesh');
  });

  it('should calculate accurate string similarity distance', () => {
    expect(calculateStringSimilarity('priya sharma', 'priya sharma')).toBe(1.0);
    expect(calculateStringSimilarity('priya sharma', 'priya r sharma')).toBeGreaterThan(0.8);
    expect(calculateStringSimilarity('priya sharma', 'amit patel')).toBeLessThan(0.3);
  });

  it('should auto-resolve cross-department records with same Aadhaar hash', () => {
    const primary = { full_name: 'Priya Ramesh Sharma', aadhaar_hash: 'hash_1' };
    const result = IdentityResolver.resolve(primary, { department: 'revenue', source_name: 'शर्मा प्रिया रमेश', source_aadhaar_hash: 'hash_1' });
    expect(result.flag).toBe('AUTO_RESOLVED');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
  });

  it('should flag conflicting names for human verification', () => {
    const primary = { full_name: 'Priya Ramesh Sharma', aadhaar_hash: 'hash_1' };
    const result = IdentityResolver.resolve(primary, { department: 'rto', source_name: 'Rohit Ramesh Sharma', source_aadhaar_hash: 'hash_1' });
    expect(result.flag).toBe('VERIFICATION_REQUIRED');
  });
});

describe('Aadhaar validation & keyed hashing', () => {
  it('validates the UIDAI Verhoeff checksum', () => {
    const valid = `23456789012${aadhaarCheckDigit('23456789012')}`;
    expect(isValidAadhaar(valid)).toBe(true);
    expect(isValidAadhaar(`${valid.slice(0, 11)}${(Number(valid[11]) + 1) % 10}`)).toBe(false);
    expect(isValidAadhaar('123456789012')).toBe(false); // cannot start with 1
    expect(isValidAadhaar('2345678901')).toBe(false);
  });

  it('hashes with a secret pepper (HMAC) and separates namespaces', () => {
    const h = hashIdentity('234567890123', 'aadhaar');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(h).not.toBe(hashIdentity('234567890123', 'oidc'));
  });
});
