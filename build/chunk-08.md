# Build Chunk 08: Live Mode Ingestion & Multi-Journey Flow

> Document Version: 1.0.0  
> Chunk ID: 08  
> Estimated Time: 1.5 hours  
> Dependencies: Chunk 04, Chunk 07  
> Unlocks: Chunk 09 (Production Packaging & Final Verification)  

---

## 1. Chunk Goal
Implement the Live Ingestion Mode allowing evaluators to insert new custom citizen records directly into any of the 4 heterogeneous databases and witness immediate real-time auto-filling, alongside multi-journey support across 3 distinct citizen services (Income Certificate, Driving License Renewal, and Scholarship Application).

---

## 2. Component Implementation Details

### 2.1 Multi-Journey Configuration Catalog (`src/services/workflow/journeyConfigs/`)
- **`incomeCert.json`**: Revenue Land Records (7/12) + RTO Vehicle Assets + Certificates.
- **`drivingLic.json`**: RTO Existing DL + Revenue Residential Address + Identity.
- **`scholarApp.json`**: Education Board Marksheets + Caste Certificate + Family Income Verification.

### 2.2 Live Ingestion Engine (`src/services/ingest/liveListener.ts`)
- Implements active polling / write listeners against PostgreSQL, MySQL, and MongoDB.
- Broadcasts ingestion notifications to the Live Inspection Console when new raw records are inserted.

### 2.3 Interactive Demo Persona Switcher
- Fast-action UI widget allowing 1-click evaluation of all 10 edge-case citizen personas (Priya Sharma, Rajesh Pawar, Ananya Deshmukh, etc.).

---

## 3. Verification Commands
```bash
# Verify multi-journey workflow execution
npx vitest run test/integration/journeys.test.ts
```
