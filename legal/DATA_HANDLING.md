# Data Handling & Zero-Persistence Policy (DATA_HANDLING): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Authority: Maharashtra State Data Authority & Cyber Security Cell  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. Data Classification Matrix

| Data Classification Tier | Attributes Included | Storage Rule | Transmission Rule | Retention Window |
|:---|:---|:---|:---|:---|
| **Tier 1: Public / Open Data** | Service catalogs, departmental schemas, public holiday calendars, RTO office codes. | Local memory cache / Public CDN. | Standard HTTPS (TLS 1.3). | 30 Days |
| **Tier 2: Government Internal** | System latency metrics, aggregate transaction counts, adapter health logs. | Internal Time-Series DB (Prometheus / Elasticsearch). | Encrypted internal VPC. | 90 Days |
| **Tier 3: Confidential PII** | Citizen names, addresses, vehicle registration numbers, survey numbers, caste category. | **ZERO CENTRAL STORAGE.** Origin DB only. | TLS 1.3 (mutual TLS via department Security Servers) + ES256 consent artifact. | **Transient (0s post-HTTP response)** |
| **Tier 4: Restricted Identity** | Aadhaar numbers, biometric indicators, financial tax details. | **NEVER RECEIVED IN PLAINTEXT.** Irreversible SHA-256 hash only. | End-to-End Cryptographic Envelope. | **0 Seconds (No Storage)** |

---

## 2. Zero-Persistence Architecture Mandate

MahaLink enforces an absolute **Zero-Persistence Policy** for all personal citizen data:

1. **Transient Memory Buffering:** When data is retrieved from departmental adapters, it exists solely within volatile Node.js V8 heap buffers allocated for the duration of that specific HTTP request.
2. **Explicit Reference Nullification:** Immediately upon serializing the sanitized MGAS JSON response to the client socket, internal object pointers are dereferenced, making heap memory instantly reclaimable by the V8 Garbage Collector.
3. **No Intermediate Caching of PII:** Redis or memory cache tiers are strictly prohibited from caching citizen attributes. Only public workflow schemas and rate-limiting IP counters may reside in cache layers.

---

## 3. Breach Prevention & Incident Protocol

In the event of an infrastructure anomaly:
- **Zero Data Exposure Risk:** Because MahaLink stores zero citizen records, a physical or network compromise of the middleware gateway yields zero database dumps or stored credentials for adversaries.
- **Immediate Token Revocation:** A revoked consent artifact is refused on the very next request (in-process check, persisted in the audit ledger so it survives restarts); session tokens are revoked server-side on logout.
- **DPDP Act / CERT-In Incident Reporting:** Breach intimation to the Data Protection Board and affected citizens (DPDP Rules 2025) and to CERT-In within 6 hours is an operator process. MahaLink supports it with the tamper-evident ledger, its NDJSON export (`/api/v1/audit/export`) and the per-citizen access history, which identify exactly whose data was accessed, when and under which consent.
