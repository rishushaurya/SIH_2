# Build Chunk 00: Diagnostics & Self-Test System

> Document Version: 1.0.0  
> Chunk ID: 00  
> Estimated Time: 30 minutes  
> Dependencies: None  
> Unlocks: Chunk 01 (Project Scaffolding)  

---

## 1. Chunk Goal
Establish the autonomous diagnostics harness and self-test scripts capable of validating environment configurations, database adapter socket availability, cryptographic key integrity, schema compliance, and hash-chain verification with explicit `[PASS]` / `[FAIL]` status indicators.

---

## 2. File Implementation Specifications

### 2.1 `scripts/diagnostics.ts`
Self-contained validation runner executing the following 8 checkpoints:
1. **Node.js Environment Check:** Verify Node >= 20.0.0 and TypeScript >= 5.0.0.
2. **Configuration Validation:** Load and validate `.env` using Zod schema.
3. **Cryptographic Subsystem:** Validate ECDSA P-256 keypair generation and signing benchmark (< 5ms).
4. **PostgreSQL Adapter Socket:** Probe port `5432` / `maha_revenue` connection.
5. **MySQL Adapter Socket:** Probe port `3306` / `maha_rto` connection.
6. **MongoDB Adapter Socket:** Probe port `27017` / `maha_certificates` connection.
7. **CSV Flat-File Access:** Verify read permissions and record parsing for `db/files/education_marksheets.csv`.
8. **Audit Ledger Hash Chain:** Run genesis-to-tip hash verification test.

---

## 3. Verification Commands
```bash
# Execute Chunk 00 verification
npx ts-node scripts/diagnostics.ts
```

**Expected Output:**
```text
============================================================
              MAHALINK SYSTEM DIAGNOSTIC REPORT
============================================================
[PASS] 1. Node.js & TypeScript Runtime Environment (v20.x / TS 5.4)
[PASS] 2. Environment Variables & Zod Schema Integrity
[PASS] 3. ECDSA P-256 Cryptographic Subsystem (Latency: 1.8ms)
[PASS] 4. PostgreSQL Revenue Adapter Connectivity (maha_revenue)
[PASS] 5. MySQL RTO Transport Adapter Connectivity (maha_rto)
[PASS] 6. MongoDB Certificate Adapter Connectivity (maha_certificates)
[PASS] 7. Legacy CSV Stream Engine & File Read Permissions
[PASS] 8. SHA-256 Hash-Chain Audit Ledger Verification
============================================================
DIAGNOSTIC STATUS: 8/8 CHECKS PASSED. SYSTEM OPERATIONAL.
============================================================
```
