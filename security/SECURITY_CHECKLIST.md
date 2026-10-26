# Production Security & Threat Model Checklist (SECURITY_CHECKLIST): MahaLink

> Document Version: 2.0.0 (2026-10-26) — every ticked item names the code that implements it and the test that proves it.
> `[ ]` = not built in this codebase (needs infrastructure or government onboarding); see IMPROVEMENT_PLAN.md "Later".
> Run the proofs: `npm run test:security`, `npm run test:tamper`, `npm run diagnostics`, `npm audit --omit=dev`.

---

### 1. Gateway & transport
- [x] Strict CSP `default-src 'self'`, no `unsafe-eval`, no third-party origins (fonts self-hosted) — `src/gateway/securityHeaders.ts`, test `api.test.ts › security headers`
- [x] HSTS `max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, no `X-Powered-By` — same
- [x] CORS allow-list from `CORS_ORIGINS`, never `*` — `src/app.ts`
- [x] 1 MB request body cap — `src/app.ts`
- [x] `Cache-Control: no-store` on every API response (personal data never cached) — `src/app.ts`, test `full citizen flow`
- [x] TLS 1.3 termination (nginx, `ssl_protocols TLSv1.3`) — `nginx/default.conf`, `docker compose --profile tls`
- [x] Department database ports bound to `127.0.0.1` only — `docker-compose.yml`
- [x] Optional TLS to department databases (`PG_SSL`, `MYSQL_SSL`, `?tls=true`) with certificate verification — `src/config/env.ts`
- [x] Mutual TLS 1.3 between gateway and department Security Servers (X-Road pattern): pinned interop CA, gateway client-certificate CN check, independent ES256 consent verification at the department — `src/securityServer.ts`, `remoteAdapter.ts`, test `mtls.test.ts`, compose profile `mtls`

### 2. Authentication & sessions
- [x] Meri Pehchaan / DigiLocker OAuth 2.0 authorization code + PKCE (S256), `state` single-use, OIDC `nonce`, ID token verified against provider JWKS (`iss`, `aud`, `exp`, 30 s skew) — `src/services/auth/oidc.ts`, test `oidc.test.ts`
- [x] Session JWT HS256 with pinned algorithm, `iss`/`aud`/`jti`, 15-minute lifetime, sliding renewal, 8-hour absolute cap — `src/services/auth/jwt.ts`
- [x] Session in `HttpOnly; SameSite=Strict` cookie, `Secure` over HTTPS; no token readable by JavaScript — `rbacGuard.ts`, test `HttpOnly SameSite=Strict`
- [x] Logout revokes the session `jti` server-side — test `invalidates the session on logout`
- [x] Demo personas exist only when `DEMO_MODE=true`; custom demo logins can never self-assign a role — test `never lets a custom login self-assign a role`
- [x] Aadhaar format + UIDAI Verhoeff checksum validation — `src/services/auth/identity.ts`, test `resolver.test.ts`
- [x] Production refuses to start with placeholder secrets — `src/config/env.ts`

### 3. Authorization (RBAC matrix, SECURITY_ACCESS.md §1)
- [x] Consent grant / revoke / execute / submit: `CITIZEN` only — `src/gateway/routes.ts`, test `RBAC matrix`
- [x] Full ledger + export: `SYS_ADMIN`; department-scoped ledger: `DEPT_ADMIN` — test `Revenue desk officer sees Revenue entries only`
- [x] Citizens read only their own access history (`/audit/me`), never the cross-department ledger
- [x] Live event stream requires a session; events reach only their data principal and admins; names only to the data principal — `eventBroadcaster.ts`

### 4. DEPA consent artifacts
- [x] ES256 (P-256) in RFC 7518 JOSE format, verifiable by any standard JWT library — test `verifiable by any standard JWT library`
- [x] Public key published at `/.well-known/jwks.json` (RFC 7517), `kid` = RFC 7638 thumbprint
- [x] Signing key persisted (`0600`) or mounted from a secret store; separate from the session secret
- [x] Departments, scope, purpose, statutory basis and validity come from the journey config, never the client — test `Client-supplied scope is ignored`
- [x] Verification binds `sub` (data principal) and `journey_id` (purpose) and checks expiry + revocation — test `does not let one citizen use ... another citizen's consent`
- [x] Revocation is immediate, owner-only, audit-logged, and survives restarts (registry rebuilt from the ledger) — test `revocation survives a restart`
- [x] Purpose limitation: only MGAS sections covered by the consented scope are returned — test `returns only sections covered by the consent scope`

### 5. Injection & input validation
- [x] 100% parameterised SQL (PostgreSQL `$n`, MySQL `?`); typed equality filter in MongoDB — `src/adapters/*`
- [x] Citizen hash validated as 64-hex at every adapter boundary — `assertCitizenHash`
- [x] Zod validation on every request body, unknown keys stripped; application fields restricted to the journey's form fields — test `unknownField`
- [x] Request IDs validated before echoing (header-injection safe) — `requestContext`
- [x] CSV header-sequence check, 10 MB cap, formula-injection sanitisation — `educationAdapter.ts`
- [ ] Lint rule banning string interpolation in query calls (enforced by review only)

### 6. CSRF & XSS
- [x] `SameSite=Strict` cookie + Origin verification on state-changing requests (OWASP CSRF cheat sheet) — test `rejects cross-origin state-changing requests`
- [x] React output encoding; zero `dangerouslySetInnerHTML`

### 7. Personal data & privacy (DPDP Act 2023)
- [x] No citizen records stored by the middleware; adapters read just-in-time
- [x] Aadhaar never stored or logged; HMAC-SHA256 with a secret pepper (`AADHAAR_PEPPER`)
- [x] Adapters select only the columns MGAS needs (data minimisation); records whose name does not match are withheld — test `withholds records whose name does not match`
- [x] No fabricated records: unknown citizens get missing-record guidance — test `gives missing-record and expiry guidance`
- [x] Structured JSON logs carry masked actor IDs, no query strings, no bodies — `src/gateway/logger.ts`
- [x] Browser drafts in `sessionStorage`, cleared on submit and logout
- [x] Citizen access passbook (DPDP s.11) and one-click withdrawal (s.6(4))

### 8. Audit ledger
- [x] Append-only JSONL, every field incl. nested metadata under a canonical SHA-256 hash — test `covers metadata with the hash`
- [x] Full-chain verification at startup; gateway refuses to start on tamper — `src/index.ts`, `npm run test:tamper`
- [x] One `DATA_FETCH` block per department per journey, including misses and outages (DPDP Rules 2025 r.6 log retention) — test `logs one DATA_FETCH block per department`
- [x] Receipt proof endpoint and NDJSON export for regulators — `/api/v1/audit/proof/:hash`, `/api/v1/audit/export`
- [ ] Signed checkpoints published to an external witness (protects against a full-chain rewrite by someone holding the file)

### 9. Availability
- [x] Sliding-window rate limits: 300/min per IP, 30/min auth, 60/min per citizen, 10/min verify; bounded memory — `rateLimiter.ts`
- [x] Per-department 3 s timeout + circuit breaker (5 failures / 30 s), fail-soft manual sections — `workflowEngine.ts`
- [x] 2 s statement timeouts on PostgreSQL/MySQL/MongoDB; pool errors cannot crash the process
- [ ] Shared (Redis) rate-limit and breaker state for multi-instance deployments

### 10. Least privilege & supply chain
- [x] Adapters use SELECT-only database accounts created by the seeder (`mahalink_reader`); DBA credentials only in the one-shot seed job
- [x] Non-root container (`USER node`), multi-stage build, Node 22 LTS Alpine, `.dockerignore` excludes `.env`, data and certs
- [x] Gateway mounts the board's CSV share read-only
- [x] Exact-pinned backend runtime dependencies; `npm audit --omit=dev` = 0 vulnerabilities (2026-10-26)
