# Build Chunk 07: Dynamic Form Wizard & Inspection Console

> Document Version: 1.0.0  
> Chunk ID: 07  
> Estimated Time: 2.0 hours  
> Dependencies: Chunk 04, Chunk 06  
> Unlocks: Chunk 08 (Live Mode & Multi-Journey Flow)  

---

## 1. Chunk Goal
Build the citizen-facing service application experience: dynamic multi-step form wizard with 4-state asynchronous handling and localStorage keystroke persistence, DPDP consent modal, citizen privacy dashboard with 1-click token revocation, and the real-time split-screen Architecture Inspection Console.

---

## 2. Component Implementation Details

### 2.1 Dynamic Form Wizard (`client/src/pages/FormWizardPage.tsx`)
- Loads workflow requirements dynamically from `/api/v1/workflows/:id`.
- Implements 4 distinct UI states: Shimmer skeleton -> Success (with green Mahabhumi / RTO verification badges) -> Error (with manual fallback) -> Empty.
- Uses `useFormPersist.ts` to debounce and back up form state into browser `localStorage`.

### 2.2 DPDP Consent Modal (`client/src/components/ConsentModal.tsx`)
- Displays exact purpose, participating departments, single-transaction validity, and statutory DPDP notice.
- Triggers cryptographic token minting upon citizen approval.

### 2.3 Citizen Consent Dashboard (`client/src/pages/ConsentPage.tsx`)
- Displays table of active and historical data-sharing grants with live expiration countdowns.
- Features one-click "Revoke Consent" action calling `POST /api/v1/consent/revoke/:jti`.

### 2.4 Real-Time Inspection Console (`client/src/components/InspectionPanel.tsx`)
- Split-screen right-side panel connecting to `GET /api/v1/events/stream` via SSE.
- Displays live scrolling log of token digests, sub-millisecond query latencies, resolver confidence metrics, and mined audit blocks.
- Features one-click "Verify Audit Chain" button that triggers cryptographic hash-chain validation.

---

## 3. Verification Commands
```bash
# Verify end-to-end frontend rendering and state persistence
npm run test:e2e
```
