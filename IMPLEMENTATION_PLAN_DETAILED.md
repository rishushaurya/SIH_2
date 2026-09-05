# Detailed Implementation Plan: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Author: Lead Systems Architect & Tech Lead  
> Target System: MahaLink — Federated Interoperability & Consent Middleware (SIH26129)  

---

## 1. Project Identity & Operational Specs

| Parameter | Specification |
|:---|:---|
| **Project Code** | SIH26129 |
| **System Name** | MahaLink (महाराष्ट्र इंटरऑपरेबिलिटी व संमती मिडलवेअर) |
| **Theme & Category** | Smart Automation / Software |
| **Sponsor** | Government of Maharashtra (DIT / Maha-IT) |
| **Target Scale** | 125 Million Residents / 20+ Departmental Silos |
| **Target Architecture** | Federated Adapter + Central Gateway (IndEA 2.0 / DEPA compliant) |
| **Core Languages** | TypeScript (Backend & Frontend), SQL, BSON |

---

## 2. Monorepo Directory Structure

```
d:/SIH2/
├── package.json                   # Root workspace orchestration script
├── tsconfig.base.json             # Root TypeScript strict compiler settings
├── docker-compose.yml             # Orchestration for Postgres, MySQL, Mongo & Node
├── .env.example                   # Pinned environment configuration template
├── .gitignore                     # Git exclusion rules (excluding secrets, node_modules)
│
├── src/                           # Backend Middleware Core Services
│   ├── index.ts                   # Main server entrypoint & graceful shutdown
│   ├── config/                    # Environment variables & runtime constants
│   │   └── env.ts                 # Zod-validated environment config
│   │
│   ├── gateway/                   # API Gateway & Reverse Proxy Subsystem
│   │   ├── routes.ts              # Master route dispatcher
│   │   ├── rateLimiter.ts         # Sliding window in-memory rate limiter
│   │   ├── securityHeaders.ts     # Helmet-equivalent CSP, HSTS, CORS middleware
│   │   ├── validationGuard.ts     # Zod payload inspection middleware
│   │   └── errorHandler.ts        # Central structured error handler & logger
│   │
│   ├── services/                  # Core Business & Cryptographic Engines
│   │   ├── auth/                  # Authentication & SSO Bridge
│   │   │   ├── ssoBridge.ts       # Meri Pehchaan OAuth 2.0 stub & JWT issuer
│   │   │   └── rbacGuard.ts       # Citizen vs DeptAdmin vs SysAdmin validator
│   │   │
│   │   ├── consent/               # DEPA Consent Management Subsystem
│   │   │   ├── consentManager.ts  # Token minting, validation & revocation logic
│   │   │   ├── cryptoSigner.ts    # ECDSA P-256 keypair & signature algorithms
│   │   │   └── consentSchemas.ts  # Machine-readable consent artifact definitions
│   │   │
│   │   ├── workflow/              # Dynamic Journey Orchestration
│   │   │   ├── workflowEngine.ts  # Parallel/Sequential DAG execution engine
│   │   │   └── journeyConfigs/    # JSON definitions of citizen workflows
│   │   │       ├── incomeCert.json# Income Certificate data requirements
│   │   │       ├── drivingLic.json# Driving License renewal requirements
│   │   │       └── scholarApp.json# Student Scholarship verification flow
│   │   │
│   │   ├── resolver/              # Identity Reconciliation Subsystem
│   │   │   ├── identityResolver.ts# Master matching pipeline (Aadhaar + Heuristics)
│   │   │   ├── transliteration.ts # Devanagari to Latin phonetic normalizer
│   │   │   └── levenshtein.ts     # Normalized edit-distance computation
│   │   │
│   │   ├── normalizer/            # MGAS Schema Transformation Engine
│   │   │   ├── mgasNormalizer.ts  # Department-to-MGAS JSON-Schema transformer
│   │   │   └── mgasSchemas.ts     # Canonical Maharashtra Government API schemas
│   │   │
│   │   └── audit/                 # Cryptographic Ledger
│   │       ├── hashChain.ts       # SHA-256 block linking & verification engine
│   │       └── auditStore.ts      # Append-only audit store with query capabilities
│   │
│   ├── adapters/                  # Federated Department Database Adapters
│   │   ├── types.ts               # Shared DepartmentAdapter TypeScript interface
│   │   ├── revenueAdapter.ts      # PostgreSQL client for 7/12 Land Records
│   │   ├── rtoAdapter.ts          # MySQL client for Driving License & Vehicle RC
│   │   ├── certificateAdapter.ts  # MongoDB client for Income & Caste certificates
│   │   └── educationAdapter.ts    # CSV stream parser for Marksheet flat files
│   │
│   └── db/                        # Mock Heterogeneous Database Environments
│       ├── seed.ts                # Deterministic seed runner for all 4 databases
│       ├── postgres/              # PostgreSQL schema & migration scripts
│       ├── mysql/                 # MySQL schema & migration scripts
│       ├── mongo/                 # MongoDB collections & initialization
│       └── files/                 # Legacy CSV flat files (Education data)
│
├── client/                        # Trilingual React Frontend Application
│   ├── index.html                 # HTML5 entry with government metadata
│   ├── vite.config.ts             # Vite bundler configuration
│   ├── src/
│   │   ├── main.tsx               # React DOM bootstrap
│   │   ├── App.tsx                # Master routing & layout shell
│   │   ├── styles/
│   │   │   ├── tokens.css         # Government CSS Custom Properties design system
│   │   │   └── global.css         # Reset & typography styles
│   │   ├── components/
│   │   │   ├── Header.tsx         # Ashoka emblem & trilingual navigation bar
│   │   │   ├── Footer.tsx         # Government disclaimers & accessibility links
│   │   │   ├── SkeletonLoader.tsx # Content-shaped shimmering loading blocks
│   │   │   ├── ConsentModal.tsx   # DPDP Act compliant consent request popup
│   │   │   ├── InspectionPanel.tsx# Live split-screen architecture visualizer
│   │   │   └── ErrorBoundary.tsx  # React route error boundary & reload fallback
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # Aaple Sarkar portal landing simulation
│   │   │   ├── ServicesPage.tsx   # Service directory with auto-fill badges
│   │   │   ├── FormWizardPage.tsx # Dynamic form populator with auto-fill
│   │   │   ├── ConsentPage.tsx    # Citizen consent inspection & revocation
│   │   │   └── AdminConsolePage.tsx# Department admin scrutiny dashboard
│   │   └── hooks/
│   │       ├── useFormPersist.ts  # LocalStorage keystroke persistence hook
│   │       ├── useTrilingual.ts   # English / Marathi / Hindi string hook
│   │       └── useLiveEvents.ts   # WebSocket / SSE live terminal event hook
│   └── locales/                   # Translation Dictionaries
│       ├── en.json                # English dictionary
│       ├── mr.json                # Marathi (मराठी) dictionary
│       └── hi.json                # Hindi (हिंदी) dictionary
│
└── scripts/                       # DevOps, Diagnostics & Verification Scripts
    ├── diagnostics.ts             # Comprehensive self-testing script
    └── seedDemoData.ts            # One-click demo data population
```

---

## 3. Master API Endpoint Catalog

| HTTP Method | API Path | Description | Auth Required | Rate Limit | Response Format |
|:---|:---|:---|:---|:---|:---|
| `GET` | `/health` | System health, adapter connectivity & memory check | None (Public) | 300 / min | `{"status":"healthy","adapters":{...}}` |
| `POST` | `/api/v1/auth/sso/login` | Citizen / Admin login via Meri Pehchaan stub | None | 30 / min | `{"token":"jwt...","user":{...}}` |
| `GET` | `/api/v1/workflows` | List available citizen workflows & requirements | Bearer JWT | 100 / min | `{"workflows":[{"id":"income_cert"...}]}`|
| `POST` | `/api/v1/consent/request`| Generate machine-readable consent scope | Bearer JWT | 60 / min | `{"consent_request_id":"...","scope":[]}`|
| `POST` | `/api/v1/consent/grant` | Sign and mint DEPA JWT consent artifact | Bearer JWT | 60 / min | `{"consent_artifact":"jwt...","jti":"..."}`|
| `POST` | `/api/v1/consent/revoke/:jti`| Invalidate active consent artifact immediately | Bearer JWT | 30 / min | `{"status":"revoked","timestamp":...}` |
| `GET` | `/api/v1/consent/history`| Retrieve citizen's active & historical consents | Bearer JWT | 60 / min | `{"consents":[{"jti":"...","dept":"..."}]}`|
| `POST` | `/api/v1/workflows/:id/execute`| Fetch multi-department data with consent & auto-fill | Bearer + Consent JWT | 30 / min | `{"status":"complete","mgas_data":{...}}` |
| `GET` | `/api/v1/audit/ledger` | Retrieve cryptographic hash-chain ledger entries | Admin JWT | 100 / min | `{"blocks":[{"index":104,"hash":"..."}]}`|
| `POST` | `/api/v1/audit/verify` | Run mathematical verification of entire hash chain | Admin JWT | 10 / min | `{"valid":true,"blocks_verified":104}` |
| `GET` | `/api/v1/events/stream`| Server-Sent Events (SSE) stream for Live Inspection Panel | Bearer JWT | 100 / min | `event: log\ndata: {...}\n\n` |

---

## 4. Canonical Database Schemas

### 4.1 Revenue Department (PostgreSQL 16)
```sql
CREATE TABLE revenue_land_records_712 (
    id SERIAL PRIMARY KEY,
    survey_number VARCHAR(64) NOT NULL,
    sub_division VARCHAR(32) NOT NULL,
    district VARCHAR(64) NOT NULL,
    taluka VARCHAR(64) NOT NULL,
    village VARCHAR(64) NOT NULL,
    owner_name_marathi VARCHAR(255) NOT NULL,
    owner_name_english VARCHAR(255) NOT NULL,
    aadhaar_hash CHAR(64) NOT NULL,
    land_area_hectares NUMERIC(10, 4) NOT NULL,
    assessment_tax_inr NUMERIC(10, 2) NOT NULL,
    crop_details JSONB DEFAULT '{}',
    encumbrances TEXT,
    last_mutation_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rev_aadhaar ON revenue_land_records_712(aadhaar_hash);
CREATE INDEX idx_rev_survey ON revenue_land_records_712(district, taluka, village, survey_number);
```

### 4.2 RTO Transport Department (MySQL 8.0)
```sql
CREATE TABLE rto_driving_licenses (
    dl_number VARCHAR(32) PRIMARY KEY,
    aadhaar_hash CHAR(64) NOT NULL,
    holder_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    vehicle_classes VARCHAR(64) NOT NULL,
    rto_code VARCHAR(16) NOT NULL,
    status ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED') DEFAULT 'ACTIVE',
    INDEX idx_rto_aadhaar (aadhaar_hash)
) ENGINE=InnoDB;

CREATE TABLE rto_vehicle_registrations (
    registration_number VARCHAR(32) PRIMARY KEY,
    aadhaar_hash CHAR(64) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    vehicle_make_model VARCHAR(128) NOT NULL,
    chassis_number VARCHAR(64) UNIQUE NOT NULL,
    fuel_type VARCHAR(32) NOT NULL,
    commercial_flag BOOLEAN DEFAULT FALSE,
    fitness_validity DATE NOT NULL,
    insurance_validity DATE NOT NULL,
    INDEX idx_rto_veh_aadhaar (aadhaar_hash)
) ENGINE=InnoDB;
```

### 4.3 Certificate Services (MongoDB 7.0 Document Models)
```javascript
// Database: maha_certificates, Collection: citizen_certificates
{
  "_id": ObjectId("66c100000000000000000001"),
  "certificate_id": "MH-INC-2025-009182",
  "aadhaar_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "certificate_type": "INCOME_CERTIFICATE",
  "applicant_details": {
    "full_name_english": "Priya Ramesh Sharma",
    "full_name_marathi": "प्रिया रमेश शर्मा",
    "father_or_husband_name": "Ramesh Sharma",
    "address_line": "Flat 101, Ganesh Krupa, Rambaug",
    "district": "Pune",
    "pincode": "411030"
  },
  "financial_assessment": {
    "annual_income_inr": 340000,
    "assessment_year": "2025-2026",
    "issuing_authority": "Tahsildar Haveli, Pune",
    "issue_date": ISODate("2025-04-12T00:00:00Z"),
    "valid_until": ISODate("2028-03-31T00:00:00Z")
  },
  "verification_hash": "8f49a2...",
  "status": "APPROVED"
}
```

### 4.4 Education Department (Legacy CSV Record Structure)
```csv
student_roll_no,aadhaar_hash,candidate_name_en,board_name,passing_year,marks_obtained,total_marks,percentage,grade,institution_code
MH-HSC-2021-9821,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855,Priya R Sharma,Maharashtra State Board of Secondary and Higher Secondary Education,2021,582,650,89.54,A+,INST-PUN-094
```

---

## 5. Security & Cryptographic Checklist

1. **Strict Zero-Trust Boundary:** All internal communication between API Gateway and department adapters enforces TLS 1.3 encryption.
2. **Deterministic Cryptographic Hashing:** Aadhaar numbers are never transmitted in plaintext. All lookups utilize irreversible SHA-256 digests salted with state secret seeds.
3. **ECDSA P-256 Token Signing:** Consent tokens utilize Elliptic Curve Cryptography providing high cryptographic strength with minimal payload size.
4. **Parameter Binding Exclusivity:** Raw SQL string concatenation is strictly prohibited across all database adapters.
5. **Rate Limiting with Sliding Windows:** Memory-efficient per-IP and per-user limiting prevents DDoS and credential stuffing attacks.
6. **Strict Content Security Policy (CSP):** Disables unsafe inline scripts, restricts object embeds, and enforces HTTPS-only asset loading.
7. **Ephemeral PII Processing:** Citizen records retrieved from adapters exist in Node.js heap memory only during the lifecycle of the single HTTP request, followed by immediate garbage collection.
