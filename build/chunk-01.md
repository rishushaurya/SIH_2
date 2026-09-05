# Build Chunk 01: Project Scaffolding & Configuration

> Document Version: 1.0.0  
> Chunk ID: 01  
> Estimated Time: 45 minutes  
> Dependencies: Chunk 00  
> Unlocks: Chunk 02 (Core Middleware), Chunk 03 (Data Layer), Chunk 06 (Frontend Shell)  

---

## 1. Chunk Goal
Scaffold the monorepo root structure, initialize pinned dependencies in `package.json`, establish strict TypeScript configuration, provide `.env.example`, configure `docker-compose.yml` for the 3 database containers, and implement runtime Zod environment validation in `src/config/env.ts`.

---

## 2. File Implementation Specifications

### 2.1 `package.json` (Pinned Dependencies)
```json
{
  "name": "mahalink-monorepo",
  "version": "1.0.0",
  "description": "Maharashtra Federated Interoperability & Consent Middleware",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "tsx watch src/index.ts",
    "dev:frontend": "cd client && npm run dev",
    "build": "tsc -b && cd client && npm run build",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down -v",
    "db:seed": "tsx src/db/seed.ts",
    "diagnostics": "tsx scripts/diagnostics.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "4.19.2",
    "cors": "2.8.5",
    "helmet": "7.1.0",
    "zod": "3.22.4",
    "jsonwebtoken": "9.0.2",
    "pg": "8.11.5",
    "mysql2": "3.9.7",
    "mongodb": "6.5.0",
    "csv-parser": "3.0.0",
    "winston": "3.13.0",
    "uuid": "9.0.1",
    "dotenv": "16.4.5"
  },
  "devDependencies": {
    "@types/node": "20.12.7",
    "@types/express": "4.17.21",
    "@types/cors": "2.8.17",
    "@types/jsonwebtoken": "9.0.6",
    "@types/pg": "8.11.5",
    "@types/uuid": "9.0.8",
    "typescript": "5.4.5",
    "tsx": "4.7.2",
    "concurrently": "8.2.2",
    "vitest": "1.5.0"
  }
}
```

### 2.2 `docker-compose.yml`
Configures PostgreSQL 16 (Port 5432), MySQL 8.0 (Port 3306), and MongoDB 7.0 (Port 27017) with pinned versions, default credentials, health checks, and volume mounts.

### 2.3 `src/config/env.ts`
Loads `.env` and parses via Zod schema (`PORT`, `JWT_SECRET`, `PG_URI`, `MYSQL_URI`, `MONGO_URI`, `DEMO_MODE`). Rejects boot immediately if any secret or configuration parameter is missing or invalid.

---

## 3. Verification Commands
```bash
npm install
npm run docker:up
npm run diagnostics
```
