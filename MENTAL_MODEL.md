# Mental Model & System Intuition: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Author: Software Architecture Team  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. Core Philosophy in Plain English

Most government software projects fail because they attempt to build a single "Master Mega-Database" that copies all citizen data into one giant warehouse. This creates massive single-point-of-failure security risks, triggers inter-departmental turf wars over data ownership, and violates modern data privacy legislation (DPDP Act 2023).

**MahaLink operates on the exact opposite principle:**
1. **Data Stays Where It Lives:** The Revenue Department keeps its PostgreSQL database. The RTO keeps its MySQL database. The Certificates Department keeps its MongoDB. MahaLink NEVER copies or permanently stores citizen records.
2. **We Are the Switchboard, Not the Warehouse:** MahaLink is an intelligent, secure routing and translation layer. When a citizen is applying for a government service, MahaLink asks their permission, queries the relevant department databases on the fly, translates their messy and conflicting data into clean standard JSON, populates the application form, logs an immutable proof of the transaction, and immediately purges the PII from memory.
3. **Federation Beats Centralization:** Inspired by Estonia's X-Road and India's IndEA 2.0 framework, MahaLink connects independent systems through standardized adapters rather than centralized consolidation.

---

## 2. "When X Happens, the System Does Y Because Z"

### 2.1 Citizen Login
- **When:** A citizen clicks "Login with Meri Pehchaan" on the portal.
- **The System:** Authenticates the citizen's Aadhaar/MahaID via an OAuth 2.0 bridge and issues a short-lived JSON Web Token (JWT) in a protected HTTP-only cookie.
- **Because:** The frontend must never handle raw citizen credentials; short-lived tokens prevent session hijacking while providing verifiable identity context to downstream requests.

### 2.2 Selecting a Service Form
- **When:** A citizen selects "Apply for Income Certificate".
- **The System:** Looks up the `income_certificate` workflow configuration file. It discovers that this application requires two external data attributes: Land Ownership from Mahabhumi and Vehicle Registration from RTO.
- **Because:** Workflow requirements are configuration-driven, not hardcoded into application logic. New government services can be introduced by publishing a JSON definition without redeploying code.

### 2.3 Consent Granting
- **When:** The citizen clicks "Grant Consent" on the DPDP Consent Modal.
- **The System:** Calls the Consent Manager service, which generates a cryptographically signed JWT consent artifact containing the exact transaction ID, requested departments, permitted fields, and an expiration timestamp (15 minutes).
- **Because:** Under Section 6 of the DPDP Act 2023, data processing must have verifiable, machine-readable proof of consent that can be checked by data providers before releasing records.

### 2.4 Querying Heterogeneous Databases
- **When:** The Workflow Engine dispatches requests to the Revenue and RTO Adapters.
- **The System:** 
  - The Revenue Adapter speaks SQL to a PostgreSQL instance.
  - The RTO Adapter speaks SQL to a MySQL instance.
  - The Certificate Adapter speaks BSON/MQL to MongoDB.
  - The Education Adapter reads a raw CSV stream from a disk mount.
- **Because:** Real government departments use diverse technologies spanning three decades of IT procurement. The adapters isolate this complexity so the core middleware only ever deals with uniform REST/JSON interfaces.

### 2.5 Handling Messy and Conflicting Data
- **When:** Revenue returns `"SHARMA PRIYA RAMESH"` while RTO returns `"Priya R. Sharma"` and Certificate DB has `"प्रिया रमेश शर्मा"`.
- **The System:** Passes the candidate records to the Identity Resolver. It strips titles, runs Devanagari-Latin phonetic transliteration, computes Levenshtein edit distance, and verifies the Aadhaar cryptographic hash. If confidence exceeds 90%, it declares a match.
- **Because:** Real-world government databases are rife with typos, regional script transliterations, and differing naming conventions. A rigid exact-string comparison would fail 40%+ of legitimate citizen queries.

### 2.6 Form Auto-Population & Memory Cleanup
- **When:** The cleaned and verified data payload reaches the frontend form wizard.
- **The System:** Injects values into the form fields, renders green "Authoritative Source Verified" badges, and immediately releases the transient backend memory buffers.
- **Because:** Zero central persistence ensures that even a total compromise of the middleware server yields zero stored citizen records for attackers to steal.

### 2.7 Immutable Audit Logging
- **When:** Any data exchange completes (or fails).
- **The System:** Generates an audit record, computes `SHA-256(Previous_Block_Hash + Record_Details)`, appends it to the immutable ledger, and broadcasts the event to the Live Inspection Console.
- **Because:** Section 8 of the DPDP Act and CAG audit standards require non-repudiable proof of data access. A hash-chain ensures that any retroactive database tampering breaks the cryptographic continuity of the ledger.

---

## 3. Where the "Smart" Logic Lives

1. **`services/resolver/IdentityResolver.ts`**: Contains the phonetic transliteration, string normalization, and multi-factor fuzzy scoring algorithms that reconcile messy cross-department citizen identities.
2. **`services/normalizer/MGASNormalizer.ts`**: Contains declarative schema transformation rules that map arbitrary legacy database columns (`tbl_land_rec_712.gat_vistar_hec`) to canonical Maharashtra Government API Standard definitions (`mgas.land.area_hectares`).
3. **`services/consent/ConsentManager.ts`**: Houses the ECDSA P-256 cryptographic keypair management, JWT artifact minting, expiration validation, and revocation blacklists.
4. **`services/audit/HashChainLedger.ts`**: Implements the append-only SHA-256 cryptographic block-linking algorithm and ledger verification diagnostics.

---

## 4. Demo Mode vs. Live Production Mode

| Capability | Demo Mode (`DEMO_MODE=true`) | Live Production Mode (`DEMO_MODE=false`) |
|:---|:---|:---|
| **Department Data Source** | Pre-seeded databases with 10 deterministic citizen personas containing engineered edge-case discrepancies (name typos, missing phone numbers, Marathi strings). | Live network connections to departmental production databases and replica instances. |
| **Meri Pehchaan Auth** | Simulated SSO stub allowing instant 1-click login as any of the pre-seeded citizen personas or custom inputs. | Real OAuth 2.0 / OpenID Connect redirect flow with National Informatics Centre (NIC) Meri Pehchaan servers. |
| **Inspection Console** | Split-screen visualizer active, exposing internal token digests, sub-second latency timers, and live audit blocks. | Background logging to enterprise SIEM (Splunk / Elasticsearch) with anonymized telemetry. |
| **External Dependencies** | Zero external API keys or cloud connections required; runs 100% self-contained locally. | Deployed across Maharashtra State Data Centre (MSDC) with hardware security module (HSM) key storage. |
