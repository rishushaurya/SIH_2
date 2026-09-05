# Security Architecture & Access Control Specification: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. Authentication & Role-Based Access Control (RBAC)

All identity claims are verified exclusively on the backend. The frontend is treated as an untrusted client environment.

### 1.1 RBAC Permission Matrix

| User Role | Service Directory | Apply & Grant Consent | View Own Audit History | Revoke Own Consent | View Cross-Dept Audit Ledger | Manage Adapters & System Config |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Citizen (`CITIZEN`)** | Read | Execute | Read (Scoped to `sub`) | Execute | Denied (403) | Denied (403) |
| **Department Admin (`DEPT_ADMIN`)** | Read | Denied | Read (Scoped to Dept) | Denied | Read (Dept Scope) | Read / Test |
| **State System Admin (`SYS_ADMIN`)** | Read | Denied | Read (Full) | Denied | Read (Full Global) | Full (CRUD) |
| **Unauthenticated Guest (`ANONYMOUS`)** | Read Public | Denied | Denied (401) | Denied (401) | Denied (401) | Denied (401) |

---

## 2. Cryptographic Specifications

### 2.1 DEPA Consent Artifact Minting (ECDSA P-256)
Consent artifacts are cryptographically signed using the NIST P-256 elliptic curve (`secp256r1`) with the SHA-256 hash algorithm (`ES256`).

```
+-------------------------------------------------------------------------+
|                           DEPA JWT STRUCTURE                            |
|                                                                         |
|  HEADER:  {"alg": "ES256", "typ": "JWT", "kid": "mahalink-ca-2026"}     |
|                                                                         |
|  PAYLOAD: {                                                             |
|    "jti": "urn:uuid:8b3e813a-59b4-4b57-8b01-1b779a1f9e21",              |
|    "iss": "https://consent.mahalink.maharashtra.gov.in",                |
|    "sub": "sha256_salted_hash_of_aadhaar",                             |
|    "aud": ["dept:revenue", "dept:rto"],                                 |
|    "purpose": "INCOME_CERTIFICATE_APPLICATION",                         |
|    "scope": ["revenue:7_12:read", "rto:rc:read"],                       |
|    "iat": 1788280000,                                                   |
|    "exp": 1788280900,                                                   |
|    "revocation_url": "/api/v1/consent/revoke/8b3e813a"                  |
|  }                                                                      |
|                                                                         |
|  SIGNATURE: ECDSA-P256-SHA256( Base64(Header) + "." + Base64(Payload) ) |
+-------------------------------------------------------------------------+
```

### 2.2 SHA-256 Cryptographic Hash-Chained Audit Ledger
To detect any internal administrative tampering with audit logs, each entry $N$ encapsulates the SHA-256 digest of entry $N-1$:

$$\text{Digest}_N = \text{SHA-256}\left( \text{Digest}_{N-1} \parallel \text{Timestamp} \parallel \text{ActorHash} \parallel \text{Department} \parallel \text{Purpose} \parallel \text{ConsentJTI} \parallel \text{PayloadChecksum} \right)$$

---

## 3. Defense-in-Depth Security Controls

### 3.1 Parameterized Query Mandate (Zero Injection Tolerance)
All database adapters are architecturally barred from raw string formatting.

```typescript
// Strict Parameterized SQL Pattern (PostgreSQL / MySQL)
// CORRECT:
const result = await pgClient.query(
  'SELECT * FROM revenue_land_records_712 WHERE aadhaar_hash = $1 AND district = $2',
  [sanitizedAadhaarHash, districtName]
);

// BANNED (Will fail CI security build):
// const result = await pgClient.query(`SELECT * FROM revenue WHERE id = '${userInput}'`);
```

### 3.2 Sliding-Window Rate Limiting
- **Public Endpoints (`/health`, `/auth`):** 300 requests / 60 seconds per IP.
- **Workflow & Consent Operations:** 60 requests / 60 seconds per Citizen Token.
- **Adapter Micro-Endpoints:** 1,000 requests / 60 seconds (Service-to-Service pool).
- **HTTP 429 Payload:**
  ```json
  {
    "error": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please wait before retrying.",
    "retry_after_seconds": 28,
    "request_id": "8f4a10e2-76b3-4c91-a889-10928bbcf101"
  }
  ```

### 3.3 Security Headers Specification
Every HTTP response issued by the API Gateway includes the following strict headers:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:; frame-ancestors 'none';
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 3.4 Input Validation Rules (Zod Schemas)
Every request payload is validated at the gateway perimeter before invoking controller handlers:

```typescript
export const GrantConsentSchema = z.object({
  citizen_hash: z.string().length(64).regex(/^[a-f0-9]+$/i),
  journey_id: z.enum(['income_certificate', 'driving_license', 'scholarship_application']),
  departments: z.array(z.enum(['revenue', 'rto', 'certificates', 'education'])).min(1),
  validity_minutes: z.number().int().min(5).max(30).default(15)
});
```
