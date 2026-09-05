# AI Recovery & Self-Healing Protocols (AI_RECOVERY): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Purpose: Standard Operating Procedures (SOP) for recovering from LLM context loss, hallucination, or build drift.  

---

## 1. Hallucination Recovery Protocol

If an AI worker attempts to introduce unapproved frameworks (e.g., TailwindCSS, GraphQL, Python backends, or Blockchain nodes), execute this protocol:

```
STEP 1: STOP IMMEDIATELY. Do not write or modify further code.
STEP 2: Read `IMPLEMENTATION_PLAN_DETAILED.md` Section 1 and Section 2.
STEP 3: Verify the strictly approved stack:
        - Backend: Node.js + TypeScript + Express.js
        - Frontend: React + Vite + Vanilla CSS Variables (Tokens)
        - DBs: PostgreSQL, MySQL, MongoDB, CSV
        - Validation: Zod
STEP 4: Remove any unauthorized packages from `package.json`.
STEP 5: Log recovery action in `CHANGELOG.md`.
```

---

## 2. Context Loss & Session Restart Protocol

If an AI loses track of where it is or what to build next:

```
STEP 1: Read `README.md` to re-establish master system identity.
STEP 2: Read the last 3 entries in `CHANGELOG.md` to see recent progress.
STEP 3: Read `build/MANIFEST.md` to inspect chunk statuses:
        - Locate the first chunk marked `READY` or `IN-PROGRESS`.
STEP 4: Read the corresponding chunk file in `build/chunk-XX.md`.
STEP 5: State clearly: "I have recovered context. Current chunk: XX. Proceeding to build."
```

---

## 3. Multi-AI Conflict Resolution Protocol

When multiple AI models or sessions touch overlapping files:

| Discrepancy Type | Source of Truth Document | Action |
|:---|:---|:---|
| **API Route / Path Conflict** | `IMPLEMENTATION_PLAN_DETAILED.md` (Sec 3) | Revert route to exact path specified in Implementation Plan. |
| **Database Schema Discrepancy**| `DATABASE_SPEC.md` | Match column names and data types exactly to Database Spec. |
| **UI Styling / Theme Drift** | `design/DESIGN_TOKENS.md` | Enforce CSS variables (`--gov-navy`, `--gov-saffron`, `--gov-white`). |
| **Security / Crypto Signature**| `SECURITY_ACCESS.md` | Enforce ECDSA P-256 and SHA-256 hash-chain standards. |

---

## 4. Behavior Correction Prompts (For Human Evaluators)

If the AI starts generating placeholders, pseudocode, or skipping 4-state UI rules, paste the corresponding corrective directive:

### Prompt 4.1: Anti-Placeholder Mandate
> *"Stop generating placeholders, ellipses (...), or 'TODO' comments. The Architect Prompt v2.0 mandates 100% complete, production-grade, runnable code for every file in this chunk. Provide the entire file contents."*

### Prompt 4.2: 4-State UI Enforcement
> *"Audit this component against Universal Rule #4: Every data component MUST handle Loading (Skeleton), Success, Error (with retry), and Empty (with CTA). Implement the missing states immediately."*

### Prompt 4.3: Zero PII Persistence Check
> *"Verify that this endpoint does NOT save citizen PII to any central table or persistent cache. Ensure memory buffers are discarded after the HTTP response."*

---

## 5. Emergency Diagnostic & Reset Protocol

If tests fail or dependencies are corrupted:

```bash
# 1. Reset all database volumes to pristine state
npm run db:reset

# 2. Execute system diagnostics to pinpoint failure
npm run diagnostics

# 3. Clean compile check
npx tsc --noEmit
```
