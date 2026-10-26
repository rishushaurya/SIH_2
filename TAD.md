# Technical Architecture Document (TAD): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Author: Lead Software Architect & DevOps Lead  
> Target Problem Statement: SIH26129 (Smart Automation / Govt of Maharashtra)  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. High-Level System Architecture

MahaLink uses a **Federated Adapter + Central Gateway** pattern aligned with IndEA 2.0 Integration Reference Model and Estonia's X-Road principles. The system does not maintain a central database of citizen records. Data remains strictly with source departments; only query requests, consent verifications, and normalized JSON responses traverse the secure middleware layer.

```
+----------------------------------------------------------------------------------------------------+
|                                      CITIZEN / CONSUMER LAYER                                      |
|   +--------------------------------------------------------------------------------------------+   |
|   |                  Maharashtra Aaple Sarkar Integration Stub (React 18 + Vite)                |   |
|   |    [ Trilingual UI (EN/HI/MR) ]  [ Live Inspection Console ]  [ Dynamic Auto-Fill Engine ]  |   |
|   +----------------------------------------------+---------------------------------------------+   |
+--------------------------------------------------|-------------------------------------------------+
                                                   | HTTPS / WSS / TLS 1.3
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                    AUTHENTICATION & SSO LAYER                                      |
|   +--------------------------------------------------------------------------------------------+   |
|   |                       Meri Pehchaan SSO Gateway (OAuth 2.0 / OIDC Bridge)                   |   |
|   |       Tokens: Short-Lived Access JWT (15m) + Encrypted Refresh Token (HttpOnly Cookie)      |   |
|   +----------------------------------------------+---------------------------------------------+   |
+--------------------------------------------------|-------------------------------------------------+
                                                   | Bearer Token (Sub: Aadhaar Hash / MahaID)
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                 MAHALINK CORE MIDDLEWARE ENGINE                                    |
|                                                                                                    |
|   +--------------------------------------------------------------------------------------------+   |
|   |                              API GATEWAY (Reverse Proxy & Guard)                            |   |
|   |   * Rate Limiting (Sliding Window)   * Request Correlation ID Injector (UUIDv4)            |   |
|   |   * Zod Schema Validation Guard      * Security Headers (CSP, HSTS, X-Frame, CORS)          |   |
|   +--------------------+------------------------------+-----------------------------+----------+   |
|                        |                              |                             |              |
|                        v                              v                             v              |
|   +----------------------------+  +---------------------------+  +-----------------------------+   |
|   |   DEPA CONSENT MANAGER     |  | WORKFLOW ORCHESTRATOR     |  | IDENTITY RESOLVER & MATCHER |   |
|   | * Consent Artifact Minting |  | * Async/Sync Step Engine  |  | * Aadhaar Primary Index     |   |
|   | * ECDSA P-256 Signatures   |  | * JSON-Driven DAG Exec    |  | * Levenshtein + Phonetic    |   |
|   | * Scope / Expiry Enforcer  |  | * Fail-Soft Circuit Break |  | * Multi-Script Devanagari   |   |
|   +--------------+-------------+  +-------------+-------------+  +--------------+--------------+   |
|                  |                              |                               |                  |
|                  +------------------------------+-------------------------------+                  |
|                                                 |                                                  |
|                                                 v                                                  |
|   +--------------------------------------------------------------------------------------------+   |
|   |                    HASH-CHAINED IMMUTABLE AUDIT LEDGER (SHA-256 Chain)                     |   |
|   |      Entry(N) = SHA256( Entry(N-1) + Timestamp + Actor + Purpose + TargetDept + Digest )   |   |
|   +---------------------------------------------+----------------------------------------------+   |
+-------------------------------------------------|--------------------------------------------------+
                                                  | Internal Private Network / mTLS
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                   FEDERATED ADAPTER LAYER                                          |
|                                                                                                    |
|   +--------------------+  +--------------------+  +--------------------+  +--------------------+   |
|   |  Revenue Adapter   |  |    RTO Adapter     |  | Certificate Adapt. |  | Education Adapter  |   |
|   | (PostgreSQL Client)|  |   (MySQL Client)   |  |  (MongoDB Client)  |  | (CSV Stream Engine)|  |
|   | * 7/12 Land Record |  | * Driving License  |  | * Income / Domicile|  | * Marksheet Sheets |   |
|   | * Mutation Deeds   |  | * Vehicle RC Data  |  | * Caste Certs      |  | * Enrollment Rolls |   |
|   | * MGAS Transformer |  | * MGAS Transformer |  | * MGAS Transformer |  | * MGAS Transformer |   |
|   +---------+----------+  +---------+----------+  +---------+----------+  +---------+----------+   |
+-------------|-----------------------|-----------------------|-----------------------|--------------+
              | SQL (Param)           | SQL (Param)           | BSON / MQL (Sanitize) | File Stream
              v                       v                       v                       v
+----------------------------------------------------------------------------------------------------+
|                         DEPARTMENT STORAGE NODES (HETEROGENEOUS ENVs)                              |
|   +--------------------+  +--------------------+  +--------------------+  +--------------------+   |
|   |  PostgreSQL 16 DB  |  |    MySQL 8.0 DB    |  |   MongoDB 7.0 DB   |  | Legacy CSV Archive |   |
|   | [Revenue Records]  |  |   [Sarathi / Vahan]|  |  [MahaOnline Certs]|  |  [Board Data Dumps]|   |
|   +--------------------+  +--------------------+  +--------------------+  +--------------------+   |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Component Inventory & Technology Matrix

| Subsystem Component | Technology Selected | Version | Architectural Rationale |
|:---|:---|:---|:---|
| **Core Runtime** | Node.js + TypeScript | TS 5.4 / Node 20 LTS | Strict static typing eliminates runtime type coercion vulnerabilities; non-blocking asynchronous event loop delivers maximum concurrency for I/O-bound proxying. |
| **API Framework** | Express.js | 4.19+ | Minimalist, unopinionated routing middleware allowing custom interceptors for mTLS, Zod validation, and context propagation. |
| **Data Validation** | Zod | 3.22+ | Compile-time and runtime schema synchronization preventing malicious payload injection before handler execution. |
| **Cryptographic Engine** | Node Crypto (WebCrypto) | Native LTS | High-performance ECDSA P-256 for signing DEPA consent tokens; HMAC-SHA256 for request non-repudiation. |
| **Fuzzy String Matching** | Custom Levenshtein + Metaphone | TypeScript Native | Sub-millisecond deterministic similarity computation across Devanagari and Latin script variants without external API latency. |
| **Relational Storage 1** | PostgreSQL | 16.2 | Simulates Revenue Department legacy SQL engine with complex relation queries (7/12 and mutations). |
| **Relational Storage 2** | MySQL | 8.0 | Simulates Transport Department (Sarathi/Vahan) schemas with unique date format conventions. |
| **Document Storage** | MongoDB | 7.0 | Simulates modern Certificate Management systems with schema-flexible nested application histories. |
| **Flat File Ingestion** | Node `stream` + CSV Parser | Native | Simulates disconnected legacy educational board systems producing tabular CSV dumps. |
| **Frontend Framework** | React + Vite | React 18 / Vite 5 | Fast hot-module-replacement, modular component hierarchy, and zero layout shift during asynchronous data population. |
| **CSS Architecture** | Vanilla CSS Tokens | CSS Variables | Zero third-party CSS overhead, native design tokens for theme swapping and strict compliance with government accessibility guidelines. |

---

## 3. Data Flow & Transaction Sequences

### 3.1 End-to-End Consent and Auto-Fill Flow

```
Citizen              Frontend Portal          API Gateway          Consent Manager      Workflow Engine       Dept Adapters
   |                        |                      |                      |                     |                   |
   |--- 1. Login (SSO) ---->|                      |                      |                     |                   |
   |<-- 2. JWT Issued ------|                      |                      |                     |                   |
   |                        |                      |                      |                     |                   |
   |--- 3. Apply Service -->|                      |                      |                     |                   |
   |    (Income Cert)       |--- 4. Request Req -->|                      |                     |                   |
   |                        |<-- 5. Scope Schema --|                      |                     |                   |
   |                        |                      |                      |                     |                   |
   |<-- 6. Consent Modal ---|                      |                      |                     |                   |
   |    ("Share 7/12 & RC?")|                      |                      |                     |                   |
   |--- 7. Grant Consent -->|--- 8. Submit Grant ->|--- 9. Mint Token --->|                     |                   |
   |                        |                      |<-- 10. Signed JWT ---|                     |                   |
   |                        |                      |                                            |                   |
   |                        |--- 11. Execute Journey (Bearer + Consent JWT) ------------------->|                   |
   |                        |                      |                                            |--- 12. Dispatch ->|
   |                        |                      |                                            |    (Revenue)      |
   |                        |                      |                                            |<-- 13. Raw 7/12 --|
   |                        |                      |                                            |                   |
   |                        |                      |                                            |--- 14. Dispatch ->|
   |                        |                      |                                            |    (RTO)          |
   |                        |                      |                                            |<-- 15. Raw RC ----|
   |                        |                      |                                            |                   |
   |                        |                      |                                            |-- 16. Normalize & |
   |                        |                      |                                            |   Fuzzy Resolve --|
   |                        |<-- 17. Consolidated Clean JSON (Status: Verified) ----------------|                   |
   |                        |                      |                                            |-- 18. Write Log -> [Audit Ledger]
   |<-- 19. Form Auto-Filled|                      |                      |                     |                   |
```

---

## 4. Identity Resolution Architecture

Government databases suffer from structural data entropy. To link records safely without a centralized master database:

### 4.1 Two-Tier Matching Pipeline
1. **Primary Key Match (Tier 1):** Exact matching on deterministic cryptographic identifier (`Aadhaar SHA-256 Hash` or `MahaID`).
2. **Secondary Heuristic Match (Tier 2 - Fuzzy Resolution):**
   - **Name Normalization:** Strips honorifics (Shri, Smt, Dr, Mr), resolves initials (`Priya R. Sharma` -> `Priya Ramesh Sharma`), and transliterates Marathi Devanagari to Latin phonetics (`प्रिया शर्मा` -> `Priya Sharma`).
   - **Levenshtein Distance Matrix:** Normalized distance score $S_{name} \in [0, 1]$.
   - **Address Tokenization:** Compares sub-district, pincode, and house numbers independently.
   - **Composite Confidence Score:**
     $$\text{Confidence} = 0.50 \times S_{\text{Aadhaar}} + 0.30 \times S_{\text{Name}} + 0.20 \times S_{\text{Address}}$$
   - **Decision Boundary:**
     - $\text{Confidence} \ge 0.90$: **Auto-Resolved & Linked**
     - $0.70 \le \text{Confidence} < 0.90$: **Flagged for Citizen Verification in UI**
     - $\text{Confidence} < 0.70$: **Record Skipped (Fallback to Manual Entry)**

---

## 5. Security & Cryptographic Architecture

### 5.1 Mutual TLS (mTLS) Transport Security
When a department hosts its own adapter (Department Security Server mode, `src/securityServer.ts`, compose profile `mtls`), the gateway reaches it only over mutual TLS 1.3 with P-256 ECDSA certificates issued by the MahaLink interop CA (`npm run certs:mtls` for development; State PKI in production). The security server accepts only the gateway's client certificate (pinned CA + CN) and independently verifies each ES256 consent artifact against the published JWKS (audience = its department, subject = the requested citizen) before querying its database with a SELECT-only account. Adapters co-located with the gateway connect to department databases over optionally verified TLS (`PG_SSL`, `MYSQL_SSL`, `?tls=true`).

### 5.2 DEPA Consent Artifact Format
Consent artifacts are structured as tamper-proof JSON Web Tokens (JWT) signed via ECDSA (Curve P-256 with SHA-256):

```json
{
  "header": {
    "alg": "ES256",
    "typ": "JWT",
    "kid": "mahalink-consent-ca-2026"
  },
  "payload": {
    "jti": "urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "iss": "https://consent.mahalink.maharashtra.gov.in",
    "sub": "sha256_hash_of_aadhaar_citizen_id",
    "aud": ["dept:revenue", "dept:rto", "dept:certificates"],
    "purpose": "GOV_SERVICE_INCOME_CERT_APPLICATION",
    "scope": [
      "revenue:7_12:read",
      "rto:vehicle_rc:read"
    ],
    "iat": 1788280000,
    "exp": 1788281800,
    "revocation_url": "/api/v1/consent/revoke/f81d4fae",
    "statutory_basis": "DPDP_ACT_2023_SEC_6"
  }
}
```

### 5.3 Cryptographic Hash-Chain Audit Logging
Every data interaction generates an immutable audit record stored in an append-only structure. The cryptographic linkage guarantees that any retroactive record tampering breaks downstream verification:

$$\text{BlockHash}_n = \text{SHA-256}\left( \text{BlockHash}_{n-1} \parallel \text{Timestamp} \parallel \text{ActorID} \parallel \text{Action} \parallel \text{ConsentID} \parallel \text{PayloadDigest} \right)$$

---

## 6. Scaling & High-Availability Plan

### 6.1 Horizontal Scaling
- **Stateless Gateway Instances:** Gateway nodes sit behind an L4/L7 load balancer (HAProxy or AWS ALB) with auto-scaling triggered at 70% CPU or 5,000 active connections.
- **In-Memory Caching Tier:** Redis 7 cluster handles rate-limiting counters (sliding window logs) and public schema definitions with 60-second TTL. **PII is never cached in Redis.**
- **Adapter Concurrency:** Each departmental adapter uses a connection pool sized according to the backend database capacity (Min: 5, Max: 30 connections per pod) with idle timeout cleanup.

### 6.2 Resiliency & Fault Isolation
- **Circuit Breakers:** If a department backend (e.g., legacy CSV reader or MySQL RTO DB) fails 5 consecutive times within 30 seconds, its circuit opens. The Workflow Engine gracefully marks that section as `UNAVAILABLE_DEGRADED` and permits the citizen to manually fill only that missing section rather than failing the entire application.
