# Build Chunk 02: Core Middleware Stack

> Document Version: 1.0.0  
> Chunk ID: 02  
> Estimated Time: 2.0 hours  
> Dependencies: Chunk 01  
> Unlocks: Chunk 04 (Business Logic), Chunk 05 (Security Hardening)  

---

## 1. Chunk Goal
Build the core Express/TypeScript middleware engine comprising the API Gateway with validation guards, sliding-window rate limiters, Meri Pehchaan SSO stub, DEPA Consent Manager (ECDSA P-256 tokens), dynamic Workflow Orchestration engine, and SHA-256 Hash-Chained Audit Ledger.

---

## 2. Component Implementation Details

### 2.1 API Gateway & Security Interceptors (`src/gateway/`)
- **`validationGuard.ts`**: Middleware function inspecting incoming request bodies against Zod schemas. Emits standardized 400 Bad Request responses with field-level pointers.
- **`rateLimiter.ts`**: Memory-efficient sliding-window limiter enforcing 300 req/min for public routes and 60 req/min for authenticated citizen routes.
- **`securityHeaders.ts`**: Injects CSP, HSTS, X-Frame-Options (`DENY`), and X-Content-Type-Options.
- **`errorHandler.ts`**: Catches unhandled errors, logs full stack context internally with `request_id`, and returns safe, non-leaking error responses.

### 2.2 DEPA Consent Manager (`src/services/consent/`)
- **`cryptoSigner.ts`**: Implements ECDSA P-256 keypair generation, JWT signing, and signature verification.
- **`consentManager.ts`**: Mints machine-readable consent tokens specifying exact purpose, target departments, and 15-minute expiration window. Maintains in-memory revocation blacklist.

### 2.3 Workflow Orchestration Engine (`src/services/workflow/`)
- **`workflowEngine.ts`**: Executes declarative citizen journeys defined in `journeyConfigs/incomeCert.json`. Dispatches parallel async queries to required department adapters with attached consent tokens.

### 2.4 Immutable Audit Ledger (`src/services/audit/`)
- **`hashChain.ts`**: Appends audit blocks with cryptographic linkage: $\text{Hash}_N = \text{SHA256}(\text{Hash}_{N-1} + \text{Data})$. Exposes `verifyChainIntegrity()` method for fraud detection.

---

## 3. Verification Commands
```bash
# Run unit and integration tests for Core Middleware
npx vitest run test/unit/consent.test.ts test/unit/audit.test.ts test/integration/gateway.test.ts
```
