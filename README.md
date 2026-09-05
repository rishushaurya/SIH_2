# MahaLink: Maharashtra Federated Interoperability & Consent Middleware

> **Smart India Hackathon 2026 | Problem Statement SIH26129**  
> **Theme:** Smart Automation | **Category:** Software  
> **Sponsoring Authority:** Government of Maharashtra (DIT / Maha-IT)  
> **Architecture Reference:** IndEA 2.0 Integration RM / DEPA / DPDP Act 2023  

---

## 1. Project Master Context & Purpose

**MahaLink** is a lightweight, high-security federated interoperability middleware built to eliminate fragmented public service delivery across Maharashtra's 20+ government departments. Rather than building a high-risk centralized "mega-database," MahaLink deploys an intelligent gateway with federated adapters that connect directly to heterogeneous departmental databases (PostgreSQL, MySQL, MongoDB, and legacy CSV dumps). 

When a citizen applies for a service on state portals like Aaple Sarkar, MahaLink obtains explicit, DPDP-compliant cryptographic consent, resolves cross-department identity mismatches (e.g. Devanagari vs. English spelling variations, differing address formats), normalizes the data into standard Maharashtra Government API Standard (MGAS) format, auto-fills the application form, and records an immutable, hash-chained audit proof of the exchange.

---

## 2. Complete Repository File Map

```
d:/SIH2/
├── README.md                      # Master Context Map, Handoff Protocol & Runbook
├── PRD.md                         # Product Requirements Document & User Stories
├── TAD.md                         # Technical Architecture & Cryptographic Specs
├── APP_FLOW.md                    # Screen-by-Screen User Journeys & State Logic
├── MENTAL_MODEL.md                # Intuition & Plain-English System Explanations
├── FEATURE_TICKETS.md             # Development Epics & Acceptance Criteria
├── IMPLEMENTATION_PLAN_DETAILED.md# Full Engineering Blueprint & API Catalog
├── CHANGELOG.md                   # Version History & Multi-AI Handoff Ledger
├── COMMANDS.md                    # Human Shortcut Commands for Build/Test/Demo
├── AI_RECOVERY.md                 # LLM Self-Healing, Anti-Hallucination Protocols
├── TEAMMATE_GUIDE.md              # Judge Q&A Scripts & 3-Minute Stage Pitch Deck
├── FRONTEND_SPEC.md               # UI Component Hierarchy, 4-State UI & Theming
├── SECURITY_ACCESS.md             # RBAC Matrix, mTLS, OWASP Defense & Cryptography
├── OBSERVABILITY.md               # Structured JSON Logging & Inspection Console
├── SEO_PERFORMANCE.md             # Core Web Vitals, Performance Budgets & i18n
├── TESTING_STRATEGY.md            # Unit, Integration, E2E & Tamper Test Suites
├── DATABASE_SPEC.md               # Schemas for PostgreSQL, MySQL, MongoDB & CSV
├── SLIDES.html                    # Dark-Themed Print-to-PDF Presentation Deck
│
├── build/                         # Autonomous Build Manifests & Code Chunks
│   ├── MANIFEST.md                # Build Chunk Dependency Graph & Lock Table
│   ├── chunk-00.md                # Diagnostics System & Self-Test Script
│   ├── chunk-01.md                # Project Scaffolding, TypeScript & Docker
│   ├── chunk-02.md                # Core Middleware (Gateway, Consent, Audit)
│   ├── chunk-03.md                # Heterogeneous DB Adapters & Seed Data
│   ├── chunk-04.md                # Identity Resolver & MGAS Normalizer
│   ├── chunk-05.md                # Security Hardening, mTLS & Headers
│   ├── chunk-06.md                # Maharashtra Government Themed UI Shell
│   ├── chunk-07.md                # Dynamic Form Wizard & Inspection Console
│   ├── chunk-08.md                # Live Ingestion Mode & Multi-Journey Flow
│   └── chunk-09.md                # Deployment Manifests & Final Verification
│
├── legal/                         # Regulatory & Compliance Frameworks
│   ├── COMPLIANCE.md              # DPDP Act 2023 & NeSDA Saturation Specs
│   └── DATA_HANDLING.md           # Zero-Persistence Policy & Security Protocols
│
├── design/                        # Visual Identity & Token Architecture
│   ├── DESIGN_TOKENS.md           # CSS Custom Properties (Navy/Saffron/White)
│   └── UI_DESIGN_PROMPTS.md       # Exact Component Specifications
│
└── security/                      # Threat Modeling & Defense Verification
    └── SECURITY_CHECKLIST.md      # 80+ Item Production Security Verification
```

---

## 3. Technology Stack & Operational Matrix

| Layer | Technology | Version | Purpose & Rationale |
|:---|:---|:---|:---|
| **Core Middleware** | Node.js / TypeScript | Node 20 LTS / TS 5.4 | High concurrency, type safety, non-blocking I/O proxying |
| **API Framework** | Express.js | 4.19+ | Lightweight, robust middleware stack with custom guards |
| **Validation Engine**| Zod | 3.22+ | Runtime schema verification preventing injection vulnerabilities |
| **Crypto Subsystem** | Node Native Crypto | LTS | ECDSA P-256 for DEPA consent tokens; SHA-256 hash chains |
| **Database 1 (Revenue)** | PostgreSQL | 16.2 | Simulates Revenue Department (7/12 Land Records, Mutations) |
| **Database 2 (RTO)** | MySQL | 8.0 | Simulates Transport Department (Sarathi DL, Vahan RC) |
| **Database 3 (Certs)** | MongoDB | 7.0 | Simulates Certificate Services (Income, Caste, Domicile) |
| **Database 4 (Legacy)**| CSV Stream Engine | Native | Simulates disconnected legacy educational board systems |
| **Frontend UI** | React + Vite | React 18 / Vite 5 | Fast, responsive, trilingual government-styled portal |
| **Styling** | Vanilla CSS Tokens | CSS Custom Props | Zero external CSS baggage, compliant with maharashtra.gov.in |

---

## 4. Multi-AI & Developer Handoff Protocol

Every AI agent or engineer entering this workspace MUST execute the following sequence:

### On Session Start:
1. Read `README.md` (master context and file map).
2. Read `CHANGELOG.md` (last 3 entries for recent progress, blockers, and next steps).
3. Read `build/MANIFEST.md` (chunk lock status: `DONE`, `IN-PROGRESS`, `READY`, `BLOCKED`).
4. Read the last `NEXT AI SHOULD:` instruction in `CHANGELOG.md`.
5. Announce status: "I am [Model/Role]. Working on Chunk [XX] because [Reason]."

### On Session End:
1. Run automated diagnostics (`node scripts/diagnostics.js` or equivalent).
2. Update `CHANGELOG.md` with files created/modified and specific `NEXT AI SHOULD:` directions.
3. Update `build/MANIFEST.md` to update chunk statuses.
4. List any known issues or environment requirements.

---

## 5. Build Order & Dependency Graph

```
Chunk 00 (Diagnostics & Self-Tests)
   │
   ▼
Chunk 01 (Monorepo Scaffolding & Configs)
   │
   ├───────────────────────────┬───────────────────────────┐
   ▼                           ▼                           ▼
Chunk 02 (Core Middleware)  Chunk 03 (DB Adapters)     Chunk 06 (Frontend Shell)
   │                           │                           │
   └─────────────┬─────────────┘                           │
                 ▼                                         │
Chunk 04 (Resolver & Normalizer)                           │
                 │                                         │
   ┌─────────────┴─────────────┐                           │
   ▼                           ▼                           ▼
Chunk 05 (Security Hardening) Chunk 07 (Dynamic Forms & Console)
   │                           │
   └─────────────┬─────────────┘
                 ▼
Chunk 08 (Live Mode & Multi-Journey Flow)
                 │
                 ▼
Chunk 09 (Production Packaging & Final Verification)
```

---

## 6. Universal Engineering Rules (Strict Mandate)

1. **NO EMOJIS ANYWHERE:** Use standard Lucide/SVG icons. Never embed emojis or raw unicode glyphs in UI or documentation.
2. **4 UI States Everywhere:** Every data component must explicitly handle `Loading (Skeleton)`, `Success`, `Error (with Retry)`, and `Empty (with CTA)`.
3. **Zero PII Central Storage:** The middleware is strictly stateless; no citizen data is stored centrally in databases or persistent caches.
4. **Parameterized Queries Only:** Zero string concatenation in SQL or NoSQL queries. All queries must use parameter placeholders.
5. **Form State Persistence:** All citizen form input is saved to local encrypted storage on every keystroke to survive reloads and errors.
6. **Immutable Hash-Chained Auditing:** Every data interaction must append a cryptographically linked SHA-256 block to the audit ledger.
