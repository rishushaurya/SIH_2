# Build Chunk 03: Data Layer & Heterogeneous Adapters

> Document Version: 1.0.0  
> Chunk ID: 03  
> Estimated Time: 2.0 hours  
> Dependencies: Chunk 01  
> Unlocks: Chunk 04 (Business Logic & Resolver)  

---

## 1. Chunk Goal
Implement 4 heterogeneous departmental database adapters (PostgreSQL, MySQL, MongoDB, and CSV Stream Engine) enforcing parameterized queries and connection pooling, alongside a deterministic seed engine (`src/db/seed.ts`) that populates test databases with engineered government data inconsistencies.

---

## 2. Component Implementation Details

### 2.1 Department Adapters (`src/adapters/`)
- **`types.ts`**: Defines standard `DepartmentAdapter` interface:
  ```typescript
  export interface DepartmentAdapter {
    departmentId: string;
    ping(): Promise<boolean>;
    queryCitizenRecord(aadhaarHash: string, consentToken: string): Promise<RawDepartmentRecord>;
  }
  ```
- **`revenueAdapter.ts`**: Connects to PostgreSQL 16 via `pg.Pool`. Queries `revenue_land_records_712` with parameterized SQL bindings.
- **`rtoAdapter.ts`**: Connects to MySQL 8.0 via `mysql2/promise`. Queries `rto_driving_licenses` and `rto_vehicle_registrations`.
- **`certificateAdapter.ts`**: Connects to MongoDB 7.0 via `mongodb.MongoClient`. Queries `citizen_certificates` collection with strict BSON sanitization.
- **`educationAdapter.ts`**: Reads legacy tabular stream `db/files/education_marksheets.csv` using `csv-parser` with header validation.

### 2.2 Deterministic Database Seeder (`src/db/seed.ts`)
Creates tables, indexes, and populates 10 citizen personas with engineered real-world discrepancies (Devanagari vs English script mismatch, middle name abbreviations, missing fields).

---

## 3. Verification Commands
```bash
# Seed all 4 databases
npm run db:seed

# Verify adapters connect and query successfully
npx vitest run test/integration/adapters.test.ts
```
