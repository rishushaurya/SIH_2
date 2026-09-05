# Testing Strategy & Quality Assurance Plan: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. Testing Pyramid & Coverage Targets

| Test Level | Scope | Framework | Coverage Target |
|:---|:---|:---|:---:|
| **Unit Tests** | Resolver algorithms, Devanagari transliteration, MGAS normalizer, ECDSA signer, Hash-chain math | Vitest | 95%+ |
| **Integration Tests**| Express API Gateway routes, Zod validation guards, Rate limiters, DB Adapters (PostgreSQL, MySQL, Mongo, CSV) | Supertest + Vitest | 90%+ |
| **E2E Journeys** | Full citizen flow: Login -> Consent Modal -> Multi-DB Fetch -> Auto-Fill -> Audit Ledger verification | Vitest E2E Suite | 100% Core Flows |
| **Security & Tamper**| OWASP Injection attacks, Token expiration, Cross-tenant data isolation, Hash-chain break detection | Custom Security Runner | 100% Attack Vectors |

---

## 2. Automated Test Commands

```bash
# Execute entire test suite
npm test

# Run unit tests only
npm run test:unit

# Run integration tests against database adapters
npm run test:integration

# Run full end-to-end citizen workflow tests
npm run test:e2e

# Run OWASP security & injection defenses test suite
npm run test:security

# Run cryptographic audit ledger tamper detection test
npm run test:tamper
```

---

## 3. Key Test Cases Specification

### 3.1 Unit: Identity Resolver & Transliteration Test
```typescript
describe('IdentityResolver Engine', () => {
  it('should match Devanagari Marathi name to English variant with >90% confidence', () => {
    const result = resolveIdentity(
      { name: 'प्रिया रमेश शर्मा', aadhaarHash: 'hash123' },
      { name: 'Priya R. Sharma', aadhaarHash: 'hash123' }
    );
    expect(result.isMatch).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.90);
  });

  it('should flag conflicting names with identical Aadhaar for human verification', () => {
    const result = resolveIdentity(
      { name: 'Amit Rajesh Patel', aadhaarHash: 'hash123' },
      { name: 'Priya R. Sharma', aadhaarHash: 'hash123' }
    );
    expect(result.isMatch).toBe(false);
    expect(result.flag).toBe('SUSPICIOUS_IDENTITY_MISMATCH');
  });
});
```

### 3.2 Security: Hash-Chain Ledger Tamper Detection Test
```typescript
describe('HashChainLedger Integrity', () => {
  it('should detect retroactive block manipulation immediately', () => {
    const ledger = new HashChainLedger();
    ledger.append({ actor: 'user1', action: 'FETCH_712', dataDigest: 'abc' });
    ledger.append({ actor: 'user2', action: 'FETCH_RC', dataDigest: 'def' });
    ledger.append({ actor: 'user3', action: 'FETCH_CERT', dataDigest: 'ghi' });

    expect(ledger.verifyChainIntegrity().isValid).toBe(true);

    // Artificially tamper with Block #2 payload
    ledger.blocks[1].dataDigest = 'TAMPERED_MALICIOUS_DATA';

    const auditCheck = ledger.verifyChainIntegrity();
    expect(auditCheck.isValid).toBe(false);
    expect(auditCheck.corruptedBlockIndex).toBe(1);
  });
});
```
