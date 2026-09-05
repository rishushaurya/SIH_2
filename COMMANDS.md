# Human Command Shortcuts (COMMANDS): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Purpose: Copy-Paste command reference for human developers and evaluators.  

---

## 1. Setup & Environment Commands

| Command | Description | What to Expect |
|:---|:---|:---|
| `npm run setup` | Installs dependencies across root, backend, and frontend packages. | All `node_modules` installed cleanly with pinned versions. |
| `npm run env:init` | Copies `.env.example` to `.env` with default developer secrets. | `.env` created with default cryptographic keys and ports. |
| `npm run docker:up` | Boots PostgreSQL, MySQL, and MongoDB container instances. | Containers healthy on ports `5432` (PG), `3306` (MySQL), `27017` (Mongo). |
| `npm run docker:down` | Stops and purges mock database containers and volumes. | Clean teardown of all local storage state. |

---

## 2. Data Seeding & Database Commands

| Command | Description | What to Expect |
|:---|:---|:---|
| `npm run db:seed` | Populates all 4 heterogeneous databases with messy government test personas. | "Seeded 10 citizen records with engineered discrepancies across 4 DBs." |
| `npm run db:reset` | Flushes all tables/collections and re-executes clean seed scripts. | Clean reset to initial benchmark state in `< 5s`. |
| `npm run db:inspect:pg` | CLI query tool into Revenue PostgreSQL database. | Displays raw `revenue_land_records_712` table entries. |
| `npm run db:inspect:my` | CLI query tool into RTO MySQL database. | Displays raw `rto_driving_licenses` and registrations. |
| `npm run db:inspect:mongo`| CLI query tool into Certificate MongoDB collections. | Outputs formatted JSON documents of citizen certificates. |

---

## 3. Server Execution & Demo Commands

| Command | Description | What to Expect |
|:---|:---|:---|
| `npm run dev` | Launches both Backend Gateway (`:5000`) and React Frontend (`:3000`) in parallel. | Full interactive web application available at `http://localhost:3000`. |
| `npm run dev:backend` | Starts only the Node.js TypeScript API Gateway & Middleware core. | Server running on `http://localhost:5000` with active `/health` endpoint. |
| `npm run dev:frontend` | Starts only the React + Vite frontend client. | Web UI running on `http://localhost:3000`. |
| `npm run demo:mode` | Starts system with `DEMO_MODE=true` (zero external dependencies, 1-click personas). | Instant evaluation flow ready for live SIH presentation. |
| `npm run live:mode` | Starts system with `DEMO_MODE=false` (listens for live database insertions). | Evaluator can insert new records into DB and watch middleware resolve live. |

---

## 4. Diagnostics & Testing Commands

| Command | Description | What to Expect |
|:---|:---|:---|
| `npm run diagnostics` | Executes comprehensive system self-test verifying all subsystems and adapters. | Summary report showing `[PASS]` on all 15 system health checkpoints. |
| `npm test` | Runs entire automated test suite (Unit + Integration + Security). | Vitest output verifying resolver accuracy, normalizers, and crypto. |
| `npm run test:security` | Executes OWASP security audit (SQL injection, XSS, rate limiting, auth bypass). | All attack vectors safely rejected with `400` / `403` / `429`. |
| `npm run test:tamper` | Modifies an audit block artificially to demonstrate hash-chain fraud detection. | `AUDIT INTEGRITY COMPROMISED: Block #4 hash mismatch detected!` |

---

## 5. Emergency Fix Shortcuts (Copy-Paste Prompts for AI)

| Scenario | Copy-Paste AI Prompt |
|:---|:---|
| **Backend Crash / Won't Start** | `"The backend failed to start. Read CHANGELOG.md and run diagnostics. Fix any port collision or environment variable mismatch."` |
| **Database Connection Refused** | `"Database connection failed. Verify PostgreSQL (5432), MySQL (3306), and MongoDB (27017) are running. Check src/config/env.ts."` |
| **Resolver Accuracy Drop** | `"The Identity Resolver is failing to match Marathi Devanagari names. Review services/resolver/transliteration.ts against TAD.md specs."` |
| **Reset Everything to Working State**| `"Stop. Revert code to match the specifications in IMPLEMENTATION_PLAN_DETAILED.md and run npm run db:seed."` |
