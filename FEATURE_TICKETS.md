# Development Feature Tickets: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## Ticket Overview Matrix

| Ticket ID | Title | Priority | Chunk | Target Module |
|:---|:---|:---|:---|:---|
| TCK-01 | API Gateway, Routing & Security Middleware Stack | P0 | Chunk 02 | `gateway/` |
| TCK-02 | DEPA Consent Manager & JWT Artifact Engine | P0 | Chunk 02 | `services/consent/` |
| TCK-03 | Dynamic Workflow Orchestration Engine | P0 | Chunk 02 | `services/workflow/` |
| TCK-04 | SHA-256 Hash-Chained Audit Ledger | P0 | Chunk 02 | `services/audit/` |
| TCK-05 | Revenue Department Adapter (PostgreSQL) | P0 | Chunk 03 | `adapters/revenue/` |
| TCK-06 | RTO Transport Department Adapter (MySQL) | P0 | Chunk 03 | `adapters/rto/` |
| TCK-07 | Certificate Services Adapter (MongoDB) | P0 | Chunk 03 | `adapters/certificates/` |
| TCK-08 | Education Board Adapter (Legacy CSV Streams) | P0 | Chunk 03 | `adapters/education/` |
| TCK-09 | Multi-Factor Identity Resolver & Transliteration Engine | P0 | Chunk 04 | `services/resolver/` |
| TCK-10 | MGAS Canonical Data Normalizer & Schema Transformer | P0 | Chunk 04 | `services/normalizer/` |
| TCK-11 | Heterogeneous Mock Database Seed Engine | P0 | Chunk 03 | `db/seeds/` |
| TCK-12 | Maharashtra Government Themed UI Shell & i18n | P1 | Chunk 06 | `frontend/src/` |
| TCK-13 | Dynamic Application Form Wizard with Auto-Fill | P1 | Chunk 07 | `frontend/src/forms/` |
| TCK-14 | Citizen Consent Dashboard & Revocation Portal | P1 | Chunk 07 | `frontend/src/consent/` |
| TCK-15 | Real-Time Architecture Inspection Console | P1 | Chunk 07 | `frontend/src/console/` |
| TCK-16 | Missing Document Rules Engine & Citizen Guidance | P1 | Chunk 04 | `services/rules/` |
| TCK-17 | Mutual TLS & Request Header Signing Interceptors | P2 | Chunk 05 | `security/` |
| TCK-18 | Live Database Ingestion & Change-Data Listener | P2 | Chunk 08 | `services/ingest/` |

---

## Detailed Feature Specifications

### TCK-01: API Gateway, Routing & Security Middleware Stack
- **Assigned Chunk:** Chunk 02
- **Priority:** P0 (Core Foundation)
- **Description:** Build the central Express/TypeScript reverse proxy that receives citizen traffic, performs IP/User sliding-window rate limiting, validates all request bodies with Zod, injects correlation request IDs (`x-request-id`), enforces security headers (CSP, HSTS, X-Frame-Options), and routes traffic to downstream internal micro-modules.
- **Acceptance Criteria:**
  1. Rejects unvalidated payload shapes with `400 Bad Request` and field-level error messages.
  2. Enforces 100 req/min sliding-window rate limit per IP, returning `429 Too Many Requests`.
  3. Propagates a unique UUIDv4 `x-request-id` header across all internal asynchronous logs.
  4. Returns `/health` status verifying memory, uptime, and database adapter connectivity.
- **Security Considerations:** Prevent parameter pollution, enforce strict JSON content-type verification, strip unlisted object properties.

---

### TCK-02: DEPA Consent Manager & JWT Artifact Engine
- **Assigned Chunk:** Chunk 02
- **Priority:** P0 (DPDP Compliance)
- **Description:** Implement the Data Empowerment and Protection Architecture (DEPA) consent pipeline. Exposes endpoints to request consent, generate ECDSA-signed JWT artifacts containing granular purpose and scope parameters, verify tokens, and manage revocation blacklists.
- **Acceptance Criteria:**
  1. `POST /api/v1/consent/grant` mints an ES256-signed JWT with claims: `sub`, `aud`, `purpose`, `scope`, `iat`, `exp` (15m).
  2. Verifies cryptographic signature and expiry before releasing any departmental data.
  3. `POST /api/v1/consent/revoke/:id` invalidates token immediately and records event in audit ledger.
- **Edge Cases:** Clock skew tolerance (max 30s), replay attack prevention via unique nonce/jti tracking.

---

### TCK-05 through TCK-08: Federated Department Adapters
- **Assigned Chunk:** Chunk 03
- **Priority:** P0 (Heterogeneous Integration)
- **Description:** Develop 4 discrete database adapter modules:
  - **TCK-05 (Revenue):** PostgreSQL adapter querying `land_records_712` and `property_tax` via parameterized SQL.
  - **TCK-06 (RTO):** MySQL adapter querying `driving_license` and `vehicle_registration` tables.
  - **TCK-07 (Certificates):** MongoDB adapter querying `caste_certs` and `income_records` collections.
  - **TCK-08 (Education):** Node stream adapter parsing legacy `marksheets.csv` and `enrollment.csv` files.
- **Acceptance Criteria:**
  1. Each adapter exposes a uniform TypeScript interface: `queryCitizenData(citizenHash, consentToken): Promise<RawDeptPayload>`.
  2. Zero raw SQL/MQL string concatenation. 100% parameterized bindings.
  3. Connection pooling with automatic reconnection and graceful timeout (2000ms max).
- **UI States Handled:** Loading skeleton, Success, Error banner with manual fallback, Empty record notification.

---

### TCK-09: Multi-Factor Identity Resolver & Transliteration Engine
- **Assigned Chunk:** Chunk 04
- **Priority:** P0 (Intelligence Layer)
- **Description:** Construct the matching engine capable of reconciling records across departments where names are spelled differently, translated to Marathi Devanagari, or formatted inconsistently.
- **Acceptance Criteria:**
  1. Uses Aadhaar hash as primary anchor.
  2. Implements Levenshtein string distance + Soundex/Metaphone phonetic algorithms.
  3. Supports Marathi Devanagari transliteration dictionary for common Maharashtra names and surnames.
  4. Returns composite confidence score: $\ge 0.90$ (Auto-Match), $0.70 - 0.89$ (Verification Prompt), $< 0.70$ (Unmatched).

---

### TCK-12 & TCK-13: Maharashtra Portal UI & Dynamic Form Wizard
- **Assigned Chunk:** Chunk 06 & Chunk 07
- **Priority:** P1 (Citizen Experience)
- **Description:** Build the citizen-facing web application using React, Vite, and native CSS variables modeled strictly on the official Government of Maharashtra aesthetic (Ashoka emblem, Navy `#003366`, Saffron `#FF6600`, official typography). Includes trilingual toggle (English / मराठी / हिंदी) and dynamic auto-filling form wizard.
- **Acceptance Criteria:**
  1. 4 UI States for every asynchronous data element: Loading (content-shaped skeleton), Success (verified data + source badge), Error (informative retry banner), Empty (call-to-action).
  2. Form persistence: Saves input state to encrypted `localStorage` on every keystroke, restoring seamlessly after browser reload or network interruption.
  3. Zero emojis in the UI; utilizes accessible Lucide SVG icons exclusively.
  4. Responsive across mobile (360px) to desktop (1920px) screens.
