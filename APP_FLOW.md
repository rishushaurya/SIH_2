# Application Flow (APP_FLOW): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> Author: UX Architect & System Engineer  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. Global Navigation Graph

```
                                 [ Landing Page / Portal Entry ]
                                                |
                               +----------------+---------------+
                               |                                |
                 [ Citizen Authentication ]          [ Admin / Demo Console ]
                 (Meri Pehchaan SSO Bridge)                     |
                               |                                |
                               v                                v
                  [ Citizen Main Dashboard ]        [ System Inspection Desk ]
                               |                    * Real-Time API Stream
         +---------------------+--------------------+ * Consent Ledger
         |                     |                    * Tamper Verifier
         v                     v                    * Live DB Ingestion
  [ Service Catalog ]   [ Consent History ]
  * Income Certificate  * View Active Grants
  * Driving License     * Audit Logs
  * Scholarship Form    * Revoke Token
         |
         v
  [ Dynamic Form Wizard ]
         |
         v
  [ DPDP Consent Modal ]
         |
    +----+----+
    |         |
 (Accept)  (Decline)
    |         |
    v         v
[Auto-Fill] [Manual Fallback]
    |         |
    +----+----+
         |
         v
[ Verification & Submission ]
         |
         v
[ Application Ack & Tracking ]
```

---

## 2. Detailed Screen-by-Screen User Journeys

### 2.1 Citizen Journey: Applying for an Income Certificate (Once-Only Flow)

#### Step 1: Authentication (Meri Pehchaan SSO)
- **UI State:** Standard Maharashtra Government Login portal with SSO option.
- **Action:** Citizen selects "Login with Meri Pehchaan / DigiLocker".
- **Backend Flow:** Redirects to `/api/v1/auth/sso/login` -> validates OAuth 2.0 callback -> issues secure session JWT containing `citizen_id` and Aadhaar hash.
- **Transitions:**
  - *Success:* Redirects to Citizen Dashboard with active identity banner ("Logged in as Priya Sharma / AA-XXXX-1234").
  - *Error:* Displays standard alert: "Authentication server timed out. Please retry with mobile OTP."

#### Step 2: Selecting Service & Workflow Initialization
- **UI State:** Service directory displaying available citizen services with badges showing "MahaLink Auto-Fill Enabled".
- **Action:** Citizen clicks "Apply for Income Certificate".
- **Backend Flow:** Frontend queries `GET /api/v1/workflows/income_certificate/requirements`. Middleware returns required data dependencies:
  - Revenue Department: Land Ownership (7/12 Extract)
  - RTO Department: Vehicle Registration
  - Labour/Certificates: Previous Income Verification Records

#### Step 3: Granular DPDP Consent Request Modal
- **UI State:** High-contrast government modal displaying exact data requirements:
  - *Purpose:* Income Certificate Verification (#IC-2026-9921)
  - *Data Requested:* Land records from Mahabhumi, Vehicle asset details from RTO.
  - *Validity:* 30 minutes (single transaction scope).
  - *Statutory Notice:* "Under DPDP Act 2023 Sec 6, your data will be fetched in real-time and not stored permanently by the middleware."
- **Transitions:**
  - *Citizen clicks "Grant Consent":* Dispatches `POST /api/v1/consent/grant`. Consent Manager mints an ES256-signed JWT token. UI transitions to Step 4.
  - *Citizen clicks "Deny":* Modal closes; UI presents standard blank form with manual document upload dropzones.

#### Step 4: Middleware Execution & Real-Time Auto-Population
- **UI State:** Skeleton loader showing shimmering data blocks corresponding to form sections.
- **Backend Flow:**
  1. Gateway forwards request with Consent JWT to Workflow Orchestrator.
  2. Orchestrator issues parallel asynchronous calls to Revenue Adapter and RTO Adapter.
  3. Adapters query underlying PostgreSQL and MySQL databases using parameterized queries.
  4. Identity Resolver calculates phonetic and Levenshtein confidence score.
  5. Data Normalizer formats data into unified JSON payload.
  6. Transaction hash is appended to the SHA-256 Audit Ledger.
- **Transitions:**
  - *Success:* Form fields auto-populate in under 600ms. A green verification badge appears next to each pulled attribute: "Verified via Mahabhumi 7/12 (Confidence: 99.4%)".
  - *Partial Mismatch (70% - 90%):* Field is highlighted in yellow: "Name in RTO is 'Priya R Sharma'. Please confirm if this is your record." Citizen clicks "Confirm".
  - *Adapter Timeout:* Circuit breaker triggers; the specific section shows an informative banner: "Revenue server did not respond within 2s. You may enter land survey number manually."

#### Step 5: Final Review & Submission
- **UI State:** Form populated with verified fields (Land Value: ₹1,80,000, Vehicles: MH-12-AB-1234, Total Assessed Income: ₹3,20,000).
- **Action:** Citizen clicks "Submit Application".
- **Backend Flow:** `POST /api/v1/applications/submit` generates official receipt and writes final confirmation block to audit trail.
- **UI Transition:** Success screen displaying Application Tracking ID `MH-REV-2026-88129` with PDF download option.

---

## 3. Citizen Consent & Audit Dashboard Flow

```
[ Citizen Dashboard ] ---> Click "My Data Sharing & Consents"
                                |
                                v
                +-------------------------------+
                |  Active Consents Table        |
                |  * Token ID                   |
                |  * Department Accessed        |
                |  * Purpose                    |
                |  * Timestamp                  |
                |  * Expiry Countdown           |
                +---------------+---------------+
                                |
                  [ Revoke Consent Button ]
                                |
                                v
                    POST /api/v1/consent/revoke
                                |
        +-----------------------+-----------------------+
        |                                               |
  (200 OK)                                        (Token Expired)
        |                                               |
  UI updates badge:                              UI shows notice:
  "REVOKED (Access Terminated)"                  "Token already inactive"
```

---

## 4. Live Under-The-Hood Inspection Console Flow (For Hackathon Demonstration)

To provide evaluators with transparent architectural validation:

1. **Split-Screen Layout:**
   - Left Panel: Citizen Form UI.
   - Right Panel: Real-Time Middleware Terminal.
2. **Terminal Stream Event Sequence:**
   - `EVENT 1: [AUTH_SSO]` Issued User Token `sub=sha256(AA-9988-1234)`.
   - `EVENT 2: [DEPA_MINT]` Minted Consent JWT `jti=urn:uuid:c102... exp=15m`.
   - `EVENT 3: [GATEWAY_ROUTING]` Dispatching to `adapter:revenue:5432` & `adapter:rto:3306`.
   - `EVENT 4: [IDENTITY_RESOLVER]` Name Matching: `'Priya R Sharma'` <-> `'प्रिया शर्मा'` (Score: 0.94 - MATCH).
   - `EVENT 5: [NORMALIZER]` Converted `land_712.gat_no_45` to `mgas.land_asset.survey_number`.
   - `EVENT 6: [AUDIT_LEDGER]` Block #1042 Mined: `SHA256: 7f83b165...` Previous: `SHA256: a1b2c3...`.
3. **Interactive Verification Trigger:**
   - Evaluator clicks "Verify Audit Integrity".
   - System recalculates full blockchain/hash-chain integrity from Genesis Block to Block #N.
   - UI flashes Green: `AUDIT CHAIN INTACT: 1042 BLOCKS VALIDATED (0 TAMPERING DETECTED)`.

---

## 5. Comprehensive Error State Matrix

| Error Trigger | System Response | User-Facing UI Manifestation | Recovery / Fallback Action |
|:---|:---|:---|:---|
| **Database Connection Failure** | Adapter caught socket error; circuit breaker increments failure count. | "Transport Department (RTO) is temporarily unreachable." | Form leaves Vehicle section empty and enables manual text field entry with scan upload. |
| **Invalid/Expired Consent Token** | Adapter middleware intercepts request; returns `403 Forbidden` (`TOKEN_EXPIRED`). | "Consent window expired for security. Please authorize again." | One-click button: "Re-authorize Data Pull". |
| **Severe Name Mismatch (< 70%)** | Identity Resolver marks record as `LOW_CONFIDENCE`. | "Record found under different family name. Auto-fill omitted for privacy." | Citizen prompted to provide proof manually or search by alternate identifier. |
| **Client Network Disconnect** | Form state saved to `sessionStorage` (tab-scoped, cleared on submit and logout; personal data never outlives the browser tab) on every change. | Persistent top banner: "Working offline. Your entered data is safely backed up." | Seamless background resynchronization upon network restoration. |
| **Rate Limit Exceeded** | API Gateway returns `429 Too Many Requests` with `Retry-After: 30`. | "Too many requests. Please wait 30 seconds." | UI disables button and displays real-time countdown timer. |
