import { describe, expect, it } from 'vitest';
import { calculateStringSimilarity } from '../../src/services/resolver/levenshtein';
import { normalizeName, transliterateDevanagari } from '../../src/services/resolver/transliteration';
import { IdentityResolver } from '../../src/services/resolver/identityResolver';

describe('Identity Resolver & Phonetic Transliteration Engine', () => {
  it('should transliterate Marathi Devanagari to Latin phonetics correctly', () => {
    expect(transliterateDevanagari('प्रिया शर्मा')).toBe('priya sharma');
    expect(transliterateDevanagari('राजेश पवार')).toBe('rajesh pawar');
    expect(transliterateDevanagari('अनन्या देशमुख')).toBe('ananya deshmukh');
  });

  it('should normalize strings removing titles and punctuation', () => {
    expect(normalizeName('Smt. Priya R. Sharma')).toBe('priya r sharma');
    expect(normalizeName('Dr. Rajesh Ganpat Pawar')).toBe('rajesh ganpat pawar');
    expect(normalizeName('शर्मा प्रिया रमेश')).toBe('sharma priya ramesh');
  });

  it('should calculate accurate string similarity distance', () => {
    expect(calculateStringSimilarity('priya sharma', 'priya sharma')).toBe(1.0);
    expect(calculateStringSimilarity('priya sharma', 'priya r sharma')).toBeGreaterThan(0.80);
    expect(calculateStringSimilarity('priya sharma', 'amit patel')).toBeLessThan(0.30);
  });

  it('should auto-resolve cross-department records with same Aadhaar hash', () => {
    const primary = {
      full_name: 'Priya Ramesh Sharma',
      aadhaar_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    const candidateMarathi = {
      department: 'revenue',
      source_name: 'शर्मा प्रिया रमेश',
      source_aadhaar_hash: primary.aadhaar_hash,
    };

    const result = IdentityResolver.resolve(primary, candidateMarathi);
    expect(result.isMatch).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.90);
    expect(result.flag).toBe('AUTO_RESOLVED');
  });

  it('should flag conflicting names for human verification', () => {
    const primary = {
      full_name: 'Priya Ramesh Sharma',
      aadhaar_hash: 'hash_123',
    };

    const candidateConflict = {
      department: 'rto',
      source_name: 'Rohit Ramesh Sharma', // Brother with similar name / initial
      source_aadhaar_hash: primary.aadhaar_hash,
    };

    const result = IdentityResolver.resolve(primary, candidateConflict);
    expect(result.flag).toBe('VERIFICATION_REQUIRED');
  });
});
