# MahaLink — Reality Audit & Improvement Plan

> Date: 2026-10-24
> Scope: make every claim in README / PRD / TAD / SECURITY_ACCESS / security/SECURITY_CHECKLIST / legal/* true in code.
> **Status 2026-10-26:** Phases 1–7 implemented, plus the Department Security Server (mTLS) and the OpenAPI document; 43 automated tests; live paths verified on real PostgreSQL / MySQL / MongoDB engines. Items under "Later" remain.
>
> What MahaLink is: **interoperability + consent middleware software** that state portals (Aaple Sarkar) and
> departments integrate with. It is not a citizen platform. The React client in `client/` is the
> "Aaple Sarkar integration stub" that demonstrates the middleware.

---

## 1. Audit: claims vs. code (before this pass)

| # | Claim (doc) | Reality found in code | Severity |
|:--|:--|:--|:--|
| A1 | `npm run build` / Docker produce a deployable image (chunk-09) | Backend did not compile (`tsc` errors in `workflowEngine.ts`); Express never served `client/dist`; CSV path hard-coded to `src/` so education adapter was DOWN inside the image | Blocker |
| A2 | RBAC matrix: citizens get 403 on cross-dept ledger (SECURITY_ACCESS §1) | `requireRole` existed but was never used; any citizen could read the whole ledger | Critical |
| A3 | Meri Pehchaan SSO / OAuth 2.0 (US-01, F-13) | Anyone could POST `persona_id: "ADMIN-01"` and get a `SYS_ADMIN` token, in any environment. `/api/v1/auth/personas` returned raw Aadhaar numbers and mobiles. OTP modal accepted any value (pre-filled) | Critical |
| A4 | Consent artifact authorises specific citizen + purpose + scope (TAD §5.2, DPDP s.6) | Client chose `departments`/`scope`/`purpose` freely; `sub` was never compared with the caller, so one citizen's token worked for another; audit stored the literal string `DEPA_CONSENT_VALIDATED` instead of the `jti` | Critical |
| A5 | "Verified via authoritative source" auto-fill | Custom SSO users got **fabricated** 7/12, RTO, caste and marksheet records (random numbers) labelled "Authoritative"; on DB failure, adapters silently returned fixtures even with `DEMO_MODE=false` | Critical (integrity) |
| A6 | Zero-PII observability; SSE behind Bearer JWT (IMPLEMENTATION_PLAN §3) | `/api/v1/events/stream` was unauthenticated and broadcast names, JTIs and identity matches to anyone | High |
| A7 | ES256 consent JWT verifiable by departments (US-05) | Signature was DER-encoded (not RFC 7518 JOSE `r‖s`), so no standard JWT library could verify it; key regenerated every restart; no published public key | High |
| A8 | Immutable audit ledger, verified on startup, DPDP log retention | In-memory only (wiped on restart); `metadata` not covered by the hash; no startup verification. DPDP Rules 2025 Rule 6(1)(e) requires access logs to be retained for **one year** | High |
| A9 | Access JWT ≤ 15 min, HttpOnly cookies, anti-CSRF, jti replay tracking | 1 h tokens in `localStorage`, algorithms not pinned, no logout revocation, no CSRF control | High |
| A10 | Zero high/critical `npm audit` findings | express 4.19.2 (body-parser/path-to-regexp/send/qs), mysql2 3.9.7 high/critical advisories; uuid moderate | High |
| A11 | Rate limit: 60/min per citizen token, sliding window | Keyed by IP only, map grew without bound (memory DoS), proxy IPs ignored | Medium |
| A12 | Circuit breaker, 2 s adapter timeouts, fail-soft section (TAD §6.2) | Not implemented; one slow DB stalled the whole journey | Medium |
| A13 | Identity resolver withholds low-confidence records (APP_FLOW §5) | `MISMATCH` records were still normalised and auto-filled | Medium (privacy) |
| A14 | Purpose limitation / data minimisation | Every department section returned regardless of consent scope (e.g. DL returned under an income-cert consent) | Medium |
| A15 | Application submission writes audit block + receipt (APP_FLOW step 5) | Submit was client-only; reference number was `Math.random()` | Medium |
| A16 | Zero external CDNs; DPDP-friendly | Google Fonts loaded from `fonts.googleapis.com` (leaks citizen IPs to a third party, blocked by our own CSP) | Low |
| A17 | Aadhaar salted hash with state secret | Static salt string hard-coded in source | Medium |
| A18 | Language switch updates the whole UI | Each component had its own locale state; pages did not re-render on switch | Low |
| A19 | Admin console shows live metrics | "4 / 4 Active", "< 15 ms" and "Chain Verified" were hard-coded strings | Low |

---

## 2. Plan (phased, each phase leaves the system runnable)

### Phase 1 — Build, configuration, supply chain
- Fix `tsc` errors; split `src/app.ts` (Express app) from `src/index.ts` (listen, startup checks) so the API is testable over HTTP.
- `env.ts`: add `CORS_ORIGINS`, `TRUST_PROXY`, `AADHAAR_PEPPER`, `CONSENT_KEY_FILE`, `AUDIT_LOG_PATH`, `PG_SSL`/`MYSQL_SSL`, `OIDC_*`; refuse to start in production with example secrets.
- Upgrade express → 4.22.x, mysql2 → 3.24.x; replace `uuid` with `crypto.randomUUID`; drop unused `winston`; use the already-installed `helmet` instead of hand-set headers.

### Phase 2 — Identity & sessions (A3, A9, A17)
- Session = HS256 JWT (15 min, sliding renewal, 8 h absolute cap, pinned algorithm, `aud`, `jti`) in an `HttpOnly; SameSite=Strict` cookie (`Secure` in production). Bearer header still accepted for server-to-server integrators.
- `POST /api/v1/auth/logout` revokes the `jti`.
- CSRF: SameSite=Strict + Origin verification on state-changing cookie requests (OWASP CSRF cheat sheet).
- Demo persona/custom login exists **only** when `DEMO_MODE=true`; custom logins are always `CITIZEN`; persona list exposes masked Aadhaar only.
- **Meri Pehchaan / DigiLocker OAuth 2.0 + PKCE** (authorization-code flow, as in the DigiLocker partner spec): `/api/v1/auth/oidc/start` → provider → `/api/v1/auth/oidc/callback`; `state`, `nonce`, S256 PKCE; `id_token` verified against the provider JWKS (or `userinfo` fallback). Works with any OIDC provider (Keycloak for local testing) by configuration only.
- Aadhaar / identity keys hashed with HMAC-SHA256 and a secret pepper (`AADHAAR_PEPPER`).

### Phase 3 — DEPA consent that departments can verify (A4, A7, A14)
- Server derives departments, scope, purpose, statutory basis and validity from the journey config; the client only says which journey.
- ES256 signatures in JOSE format; persistent P-256 key in `data/` (auto-created, `0600`) or a mounted secret; `kid` = RFC 7638 thumbprint.
- `GET /.well-known/jwks.json` publishes the public key so any department can verify artifacts with a standard JWT library.
- Verification checks signature, `alg`/`kid`, expiry, revocation, `sub` == caller, `journey_id`, department audience.
- Consent registry is rebuilt from the persistent audit ledger on startup, so revocations survive restarts.
- Normaliser returns only MGAS sections covered by the consented scope.

### Phase 4 — Audit ledger (A8, A6)
- Append-only JSONL (`AUDIT_LOG_PATH`), every field (incl. metadata) in a canonical SHA-256 hash; full chain verified on startup — server refuses to start on tamper.
- One `DATA_FETCH` block per department per journey (citizen "privacy passbook"), plus `CONSENT_GRANT/REVOKE`, `WORKFLOW_EXECUTE`, `FORM_SUBMIT`.
- Endpoints: `/audit/ledger` (SYS_ADMIN all, DEPT_ADMIN own department), `/audit/me` (citizen's own access history), `/audit/verify`, `/audit/proof/:hash` (receipt verification), `/audit/export` (NDJSON for regulators).
- SSE stream requires a session; each event is delivered only to its data principal and to admins, with name fields sent only to the data principal.

### Phase 5 — Adapters & workflow (A5, A12, A13, A15)
- One fixture module (`src/db/fixtures.ts`) used by the seeder and by demo fallback; fixtures only when `DEMO_MODE=true`; health reports `source: live | demo-fixture` without leaking hosts/IPs.
- No fabricated records: an unknown citizen gets a "missing record" guidance banner instead.
- Hash-format validation at adapter boundary (NoSQL/SQL defence in depth), 2 s statement timeouts, optional TLS to department DBs, CSV size cap + header check + formula-injection sanitisation, multi-document certificate lookup.
- Workflow: per-department timeout + circuit breaker (5 failures / 30 s → open 30 s), `UNAVAILABLE` sections fall back to manual entry; `MISMATCH` records withheld; `VERIFICATION_REQUIRED` flagged for citizen confirmation.
- Server-side form mapping (`form_values`) so any integrating portal gets form-ready values; computed fields from configurable rules in journey JSON.
- `POST /api/v1/applications`: submission proof (digest only, no PII stored) → reference derived from the audit block.

### Phase 6 — Integration stub UI (A16, A18, A19)
- Login screen (Meri Pehchaan button when configured, demo personas when demo); no auto-login.
- One i18n context; role-based nav; real admin metrics; consent page shows access history; real submission receipt with audit hash and print.
- Remove the fake OTP modal; drafts in `sessionStorage` (cleared on tab close/logout); self-hosted fonts.

### Phase 7 — Packaging, data, docs, tests
- Dockerfile builds; image serves UI + API; `docker-compose.yml` includes the app, DB ports bound to `127.0.0.1`, data volume.
- Seeder idempotent, seeds all personas with spec indexes and the Mongo JSON-schema validator.
- HTTP-level integration tests for every security claim above; ES256/JWKS interop test; OIDC flow test against an in-process mock IdP; ledger persistence/tamper test.
- Update SECURITY_CHECKLIST, README, CHANGELOG to the true status.

### Later (needs infrastructure or government onboarding; designed, not built in this pass)
- Read-only database roles per adapter (`GRANT SELECT` only) created by department DBAs.
- Shared append-only store (Postgres table with UPDATE/DELETE revoked) + Redis rate limits for multi-instance deployments; signed ledger checkpoints published to an external witness.
- Real Meri Pehchaan client registration (client_id/secret from NeGD) and Aadhaar reference-key linking per UIDAI Aadhaar Data Vault rules.
- API Setu registration of `/openapi.json` (document exists; registration needs a government account).

---

## 3. References used
- DigiLocker Authorized Partner API Specification v1.11 — OAuth 2.0 authorization code + PKCE: https://img1.digitallocker.gov.in/assets/img/Digital%20Locker%20Authorized%20Partner%20API%20Specification%20v1.11.pdf
- DPDP Rules 2025, Rule 6 (security safeguards, one-year log retention): https://dpdpa.com/dpdparules/rule6.html
- RFC 7518 §3.4 (ES256 signature format), RFC 7517 (JWK/JWKS), RFC 7638 (JWK thumbprint), RFC 7636 (PKCE)
- OWASP Cross-Site Request Forgery Prevention Cheat Sheet (SameSite + Origin verification)
