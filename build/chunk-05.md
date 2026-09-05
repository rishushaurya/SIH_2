# Build Chunk 05: Security Hardening & Cryptographic Guard

> Document Version: 1.0.0  
> Chunk ID: 05  
> Estimated Time: 1.5 hours  
> Dependencies: Chunk 02  
> Unlocks: Chunk 09 (Production Packaging & Final Verification)  

---

## 1. Chunk Goal
Implement defense-in-depth security hardening: Mutual TLS (mTLS) transport security between the gateway and internal adapters, cryptographic HMAC-SHA256 request signing, zero-trust perimeter guards, and automated penetration test verification against OWASP Top 10 vulnerabilities.

---

## 2. Component Implementation Details

### 2.1 Mutual TLS (mTLS) Simulation Engine (`src/security/mtls/`)
- Generates self-signed Root CA and client/server certificates using native Node `crypto`.
- Express interceptor validates client certificate fingerprints before routing to adapter handlers.

### 2.2 Cryptographic Request Signing (`src/security/signer/`)
- Middleware calculating HMAC-SHA256 signature over `(HTTP_METHOD + PATH + TIMESTAMP + BODY_DIGEST)`.
- Injects signature in `x-mahalink-signature` header; rejecting any tampered requests with `401 Unauthorized`.

### 2.3 Automated Security Audit Harness (`scripts/securityAudit.ts`)
- Tests SQL injection injection payloads (`' OR 1=1 --`, `UNION SELECT`).
- Tests NoSQL `$where` and `$gt` injection payloads.
- Tests token expiration, rate-limit flooding, and CSRF attempts.

---

## 3. Verification Commands
```bash
# Execute security verification suite
npm run test:security
```
