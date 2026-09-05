# Observability & Monitoring Specification: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. Structured JSON Logging Architecture

All log statements emitted by the API Gateway, Workflow Engine, and Database Adapters must be serialized as structured JSON strings conforming to the schema below.

```json
{
  "timestamp": "2026-09-01T17:35:12.894Z",
  "level": "INFO",
  "service": "mahalink-gateway",
  "request_id": "c98f12a0-8a12-4f11-9a28-1b204918e001",
  "actor_id": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "action": "WORKFLOW_EXECUTE",
  "journey_id": "income_certificate",
  "departments_queried": ["revenue", "rto"],
  "duration_ms": 412,
  "status_code": 200,
  "message": "Successfully normalized and aggregated citizen records.",
  "metadata": {
    "resolver_confidence": 0.964,
    "audit_block_index": 1042
  }
}
```

---

## 2. Request Tracing & Correlation Pipeline

1. **Edge Injection:** When an HTTP request enters the gateway, the `requestCorrelation` middleware checks for an incoming `x-request-id` header. If absent, it mints a new UUIDv4.
2. **Context Propagation:** The `request_id` is bound to the async execution context (using Node `AsyncLocalStorage`) and automatically attached to all database adapter queries, audit entries, and SSE inspection events.
3. **Response Header:** The `x-request-id` is returned in the response header so citizens or admins encountering errors can quote the exact trace ID for technical investigation.

---

## 3. Comprehensive Health Check Specification (`/health`)

The `/health` endpoint performs active probing across all internal adapters and runtime metrics:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 84210,
  "memory": {
    "heap_used_mb": 48.2,
    "heap_total_mb": 96.0,
    "rss_mb": 112.5
  },
  "adapters": {
    "revenue_postgres": {
      "status": "up",
      "latency_ms": 14,
      "pool_active_connections": 3,
      "pool_idle_connections": 7
    },
    "rto_mysql": {
      "status": "up",
      "latency_ms": 19,
      "pool_active_connections": 2,
      "pool_idle_connections": 8
    },
    "certificates_mongo": {
      "status": "up",
      "latency_ms": 8,
      "connection_state": "connected"
    },
    "education_csv": {
      "status": "up",
      "files_loaded": 2,
      "records_indexed": 12500
    }
  },
  "audit_ledger": {
    "total_blocks": 1042,
    "chain_integrity": "verified"
  }
}
```

---

## 4. Live Inspection Console Streaming Subsystem (SSE)

For hackathon evaluators to witness internal mechanics in real time:

- **Endpoint:** `GET /api/v1/events/stream`
- **Protocol:** Server-Sent Events (SSE) over HTTP/2 or HTTP/1.1
- **Event Types:**
  - `EVENT_AUTH`: Citizen login and identity validation.
  - `EVENT_CONSENT_MINT`: DEPA consent token cryptographic minting.
  - `EVENT_QUERY_DISPATCH`: Sub-queries dispatched to Revenue/RTO/Mongo/CSV.
  - `EVENT_IDENTITY_MATCH`: Fuzzy reconciliation details and confidence scores.
  - `EVENT_AUDIT_MINED`: New SHA-256 block added to the immutable ledger.
