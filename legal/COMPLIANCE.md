# Regulatory & Legal Compliance Framework (COMPLIANCE): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Authority: Government of Maharashtra / State Data Authority  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. Digital Personal Data Protection (DPDP) Act 2023 Compliance Matrix

| DPDP Act Section | Statutory Requirement | MahaLink Technical Implementation | Compliance Verification |
|:---|:---|:---|:---:|
| **Section 6 (Consent)** | Consent must be free, specific, informed, unconditional, unambiguous, and revocable via clear affirmative action. | DEPA-style granular consent modal specifying exact purpose, target departments, and data scopes. Mints short-lived (15m) ECDSA P-256 signed JWT tokens. | **100% Compliant** |
| **Section 6(4) (Withdrawal)** | Data principal has the right to withdraw consent with the same ease with which it was given. | Dedicated Citizen Consent Dashboard with 1-click revocation API (`POST /api/v1/consent/revoke/:jti`) invalidating downstream adapter tokens. | **100% Compliant** |
| **Section 7 (Legitimate Uses)** | Government may process personal data without fresh consent for statutory welfare benefits and state services. | "Statutory Basis" workflow flag: system logs the legal enactment (e.g. RTS Act / Food Security) in the audit ledger without requiring an interactive popup. | **100% Compliant** |
| **Section 8 (Data Security & Audit)** | Data Fiduciaries must implement reasonable security safeguards and maintain immutable processing logs. | Zero Central Persistence Policy + SHA-256 cryptographic hash-chained audit ledger with mathematical tamper verification. | **100% Compliant** |
| **Section 12 (Grievance Redressal)** | Data Principal must have accessible mechanisms for data correction and dispute escalation. | Field-level mismatch verification flag in UI allowing citizens to report discrepancies back to originating departments. | **100% Compliant** |

---

## 2. National Framework Alignment (IndEA 2.0 & DEPA)

1. **India Enterprise Architecture (IndEA 2.0):** MahaLink fully implements the **Integration Reference Model (IRM)** by establishing federated gateway and adapter interfaces between state administrative tiers.
2. **Data Empowerment and Protection Architecture (DEPA):** Implements machine-readable electronic consent artifacts modeled on India's financial Account Aggregator ecosystem, adapted for G2G (Government-to-Government) and G2C (Government-to-Citizen) exchanges.
3. **API Setu Publication Pipeline:** Standardized adapter endpoints conform to OpenAPI 3.0 specifications, allowing immediate registration in national API Setu catalogs.

---

## 3. Maharashtra State Data Policy (MSDP-2024) Governance Integration

Under Maharashtra State Data Policy (MSDP-2024), the **State Data Authority (SDA)** is empowered to enforce state-wide data exchange standards:
- MahaLink acts as the **technical enforcement switchboard** for the State Data Authority.
- Inter-departmental data-sharing agreements are standardized under unified Government Resolutions (GR), eliminating the need for bilateral point-to-point MoUs.
- Departmental adapters enforce data ownership: **The issuing department remains the sole legal custodian of its records.**
