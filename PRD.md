# Product Requirement Document (PRD): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Author: Senior Software Architect & Product Lead  
> Target Project: SIH 2026 — Problem Statement SIH26129  
> Sponsoring Authority: Government of Maharashtra (DIT / Maha-IT)  
> System: MahaLink — Federated Government Interoperability & Consent Middleware  

---

## 1. Executive Summary

MahaLink is a federated interoperability and consent-management middleware engineered specifically for the Government of Maharashtra to eliminate fragmented service delivery across 20+ departmental systems without requiring centralized database consolidation. By implementing India Enterprise Architecture (IndEA 2.0) Integration Reference Models and Data Empowerment and Protection Architecture (DEPA) protocols at the state layer, MahaLink securely bridges heterogeneous departmental databases (PostgreSQL, MySQL, MongoDB, and legacy flat files) using lightweight federated adapters, automated identity resolution, and cryptographic consent artifacts. The solution enables true Once-Only citizen service delivery on public portals like Aaple Sarkar while maintaining absolute compliance with the Digital Personal Data Protection (DPDP) Act 2023.

---

## 2. Problem Statement & Root Cause

### 2.1 The Core Contradiction
Maharashtra operates the Aaple Sarkar portal offering 500+ services as a front-end single window. However, state audits show that approximately 67% of key citizen services remain functionally fragmented at the backend. Citizens are repeatedly forced to submit identical identity, land ownership, income, caste, and educational certificates across separate departmental applications (Mahabhumi, Vahan/Sarathi, Labour, and Social Welfare).

### 2.2 Root Causes
1. **Architectural Silos (NeGP Legacy):** Departments developed independent monolithic systems with bespoke schemas, conflicting datatypes, and closed networks.
2. **Lack of State Middleware:** National directories like API Setu provide cataloging but do not orchestrate multi-department citizen journeys, manage granular DPDP consent, or wrap non-REST legacy interfaces.
3. **Data Quality & Schema Discordance:** Citizen records contain slight spelling variations in English/Marathi, divergent address structures, and incompatible date formats across departments.
4. **Legal & Privacy Vulnerabilities:** Ad-hoc point-to-point data transfers lack tamper-evident audit logs and machine-readable consent artifacts mandated under the DPDP Act.

---

## 3. Target User Personas

### Persona 1: Citizen (e.g., Priya Sharma / प्रिया शर्मा)
- **Role:** Resident of Maharashtra applying for government certificates, licenses, or welfare schemes.
- **Goals:** Submit an application in under 3 minutes without uploading physical scans or duplicate affidavits; maintain full control over personal data sharing.
- **Frustrations:** Repeated document submissions, rejection due to minor typographical discrepancies across records, lack of visibility into who views personal information.

### Persona 2: Department Desk Officer / Scrutiny Clerk
- **Role:** Verification official at Revenue, Transport, or Social Welfare Department.
- **Goals:** Rapidly verify applicant claims against authoritative source databases with zero manual paperwork verification.
- **Frustrations:** Manual back-and-forth cross-verification, fraud risk from forged PDF attachments, slow processing turnaround times.

### Persona 3: Maha-IT / State Data Authority Administrator
- **Role:** State systems oversight engineer.
- **Goals:** Onboard new departments quickly, monitor real-time API latency and throughput, audit compliance, detect abnormal access spikes.
- **Frustrations:** Fragile point-to-point integration maintenance, vendor lock-in, unstandardized error handling across legacy vendors.

---

## 4. User Stories

### 4.1 Citizen Epics
- **US-01:** As a Citizen, I want to authenticate once via Meri Pehchaan (OAuth 2.0 / SSO) so that I do not need individual credentials for each departmental sub-portal.
- **US-02:** As a Citizen applying for an Income Certificate, I want MahaLink to request explicit, granular consent for my 7/12 Land Record and Vehicle Details so that I control how my personal data is shared.
- **US-03:** As a Citizen, I want MahaLink to auto-populate application forms by pulling data directly from verified departmental source databases so that I don't have to upload redundant scanned certificates.
- **US-04:** As a Citizen, I want a Consent & Access Dashboard so that I can inspect every historical data pull and revoke active consent artifacts whenever desired.

### 4.2 Department & System Administration Epics
- **US-05:** As a Department Officer, I want data requests to be backed by signed cryptographic JWT consent artifacts so that our department only exposes records under legal and authenticated citizen authorization.
- **US-06:** As a System Administrator, I want heterogeneous database adapters (PostgreSQL, MySQL, MongoDB, CSV) that normalize dissimilar payloads into a unified Maharashtra Government API Standard (MGAS) schema.
- **US-07:** As a Security Auditor, I want an immutable, hash-chained audit log for every transaction so that tampering is mathematically detectable.

---

## 5. Feature Requirements & Priority Matrix

| Feature ID | Feature Name | Description | Priority | Assigned Chunk |
|:---|:---|:---|:---|:---|
| F-01 | API Gateway & Routing | Central reverse proxy handling routing, rate limiting, and API authentication | P0 | Chunk 02 |
| F-02 | DEPA Consent Manager | Generates, signs, caches, and verifies machine-readable JWT consent artifacts | P0 | Chunk 02 |
| F-03 | Workflow Orchestration Engine | Sequences multi-step asynchronous and synchronous data-pulls for citizen journeys | P0 | Chunk 02 |
| F-04 | Hash-Chained Audit Logger | Append-only ledger recording timestamp, actor, purpose, hash-chain, and payload digest | P0 | Chunk 02 |
| F-05 | Revenue Adapter (PostgreSQL) | Connects to PostgreSQL database; extracts and normalizes 7/12 land records and property tax | P0 | Chunk 03 |
| F-06 | RTO Adapter (MySQL) | Connects to MySQL database; extracts and normalizes Driving License & Vehicle RC data | P0 | Chunk 03 |
| F-07 | Certificate Adapter (MongoDB) | Connects to MongoDB; retrieves historical caste, domicile, and income records | P0 | Chunk 03 |
| F-08 | Education Adapter (CSV) | Reads and normalizes legacy flat-file CSV dumps (marksheets and enrollment) | P0 | Chunk 03 |
| F-09 | Identity Resolver Engine | Links cross-department records using Aadhaar hash primary index + phonetic/Levenshtein matching | P0 | Chunk 04 |
| F-10 | Data Normalizer (MGAS) | JSON-Schema transformation mapping divergent departmental structures to standard format | P0 | Chunk 04 |
| F-11 | Mock Heterogeneous DBs | 4 operational database environments pre-seeded with intentional real-world discrepancies | P0 | Chunk 03 |
| F-12 | Maharashtra Portal Web UI | Trilingual (EN/HI/MR) government interface mirroring maharashtra.gov.in styling | P1 | Chunk 06, 07 |
| F-13 | Meri Pehchaan SSO Stub | OAuth 2.0 standard authentication bridge for citizen identity verification | P1 | Chunk 02 |
| F-14 | Citizen Consent Dashboard | Citizen UI for auditing active consents, access timestamps, and one-click revocation | P1 | Chunk 07 |
| F-15 | Real-Time Inspection Console | Live split-screen visualizer displaying raw API calls, signed JWTs, and audit events | P1 | Chunk 07 |
| F-16 | Automated Form Population | Dynamic client/server auto-fill pipeline populating complex nested form fields | P1 | Chunk 04, 07 |
| F-17 | Missing Document Guide | Rules engine identifying missing statutory data with exact official remediation steps | P1 | Chunk 04 |
| F-18 | Trilingual Localization | Full English, Marathi (मराठी), and Hindi (हिंदी) string localization | P1 | Chunk 06 |
| F-19 | Deterministic Demo Engine | Self-contained, zero-external-dependency mode populated with 10+ edge-case citizen personas | P1 | Chunk 01, 08 |
| F-20 | Live Ingestion Mode | Real-time database write listener allowing live data entry and immediate middleware fetching | P1 | Chunk 08 |
| F-21 | Service-to-Service mTLS | Department Security Server mode: adapters inside department networks, mutual TLS 1.3 with the gateway, independent consent verification (`src/securityServer.ts`) | P2 | Chunk 05 |
| F-22 | Cryptographic Request Signing | Superseded by F-21: mTLS 1.3 already gives mutual authentication and transit integrity, and every department request carries an ES256-signed consent artifact | P2 | Chunk 05 |
| F-23 | Multi-Journey Engine | JSON configuration parser supporting arbitrary multi-department citizen service flows | P2 | Chunk 04 |
| F-24 | Department Admin Console | Scrutiny dashboard for department officers to view consent utilization and metrics | P2 | Chunk 07 |
| F-25 | Containerized Cloud Deploy | Production-ready multi-stage Docker Compose and deployment manifests for Cloud Run/Railway | P2 | Chunk 09 |

---

## 6. Non-Functional Requirements (NFRs)

### 6.1 Performance & Scalability
- **Sub-Second Response Budget:** End-to-end multi-department data retrieval and form auto-population must complete in `< 800ms` under normal network conditions.
- **Throughput:** Middleware architecture must support horizontally scalable worker nodes capable of processing `10,000 requests/minute`.
- **Stateless Core:** API Gateway and Workflow Engine must maintain no sticky in-memory sessions, allowing zero-downtime rolling updates.

### 6.2 Security & Compliance
- **Zero Central Storage:** MahaLink must never store citizen PII centrally. Data is fetched just-in-time, rendered into form state, and cached only in transient memory during active session execution.
- **DPDP Act Compliance:** All non-statutory data transfers require signed machine-readable consent artifacts specifying purpose, scope, expiry, and revocation endpoints.
- **Cryptographic Tamper-Evidence:** Audit logs must utilize SHA-256 block hash-chaining where each entry embeds the hash of the preceding record.
- **OWASP Top 10 Defense:** 100% of endpoints protected by strict Zod schema validation, parameter binding (preventing SQL/NoSQL injection), CSP headers, and anti-CSRF token verification.

### 6.3 Accessibility & Usability
- **WCAG 2.1 Level AA Compliance:** High-contrast color ratios, full keyboard navigable forms, screen-reader semantic markup.
- **Graceful Error Recovery:** Client forms must persist state across network drops or backend 500 errors via tab-scoped session storage (cleared on submit and logout).

---

## 7. Out of Scope (Explicitly Excluded)
1. **Replacing Departmental Legacy Systems:** MahaLink does not rewrite or replace existing departmental ERPs; it wraps them non-invasively.
2. **Central Citizen Data Warehousing:** MahaLink explicitly rejects monolithic data lakes holding citizen PII to avoid systemic breach vulnerabilities.
3. **Automated Legal Adjudication:** The middleware fetches and verifies authoritative data; final statutory grant decisions remain the prerogative of competent government officers.

---

## 8. Success Metrics & Key Performance Indicators (KPIs)
- **Time-to-Fill Reduction:** Reduce average citizen application time from 45 minutes to `< 2 minutes`.
- **Zero Scanned Document Uploads:** Eliminate 100% of physical document upload requirements for integrated departments.
- **Identity Resolution Accuracy:** Achieve `> 98.5%` precision in cross-department citizen record matching despite language and format discrepancies.
- **Audit Traceability:** 100% of inter-departmental data queries linked to an immutable hash-chained audit identifier.
