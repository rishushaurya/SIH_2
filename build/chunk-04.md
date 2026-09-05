# Build Chunk 04: Business Logic, Identity Resolver & Normalizer

> Document Version: 1.0.0  
> Chunk ID: 04  
> Estimated Time: 2.0 hours  
> Dependencies: Chunk 02, Chunk 03  
> Unlocks: Chunk 07 (Dynamic Forms & Console), Chunk 08 (Live Mode & Multi-Journey Flow)  

---

## 1. Chunk Goal
Build the intelligence and data harmonization pipeline: the multi-factor Identity Resolver (Devanagari transliteration + phonetic Levenshtein matching), the Maharashtra Government API Standard (MGAS) canonical schema normalizer, and the missing document rules engine.

---

## 2. Component Implementation Details

### 2.1 Identity Resolver Subsystem (`src/services/resolver/`)
- **`transliteration.ts`**: Maps Devanagari characters, Matras, and common Marathi name prefixes to Latin phonetic equivalents (`प्रिया` -> `Priya`, `देशमुख` -> `Deshmukh`).
- **`levenshtein.ts`**: Calculates normalized Levenshtein similarity distance $S \in [0, 1]$ between candidate name strings.
- **`identityResolver.ts`**: Combines primary deterministic Aadhaar hash matching with secondary phonetic and address scoring to output composite confidence scores:
  - $\ge 0.90$: Auto-Resolved
  - $0.70 - 0.89$: Flagged for Citizen Confirmation
  - $< 0.70$: Discarded (Mismatch)

### 2.2 Canonical MGAS Normalizer (`src/services/normalizer/`)
- **`mgasNormalizer.ts`**: Declarative transformer mapping heterogeneous raw adapter outputs (`gat_vistar_hec`, `dl_no_val`) into unified Maharashtra Government API Standard (MGAS) JSON payloads.

### 2.3 Missing Document Detector (`src/services/rules/`)
- **`missingDocDetector.ts`**: Analyzes journey requirements against retrieved records. If a mandatory certificate or record is missing, returns step-by-step administrative instructions for obtaining it.

---

## 3. Verification Commands
```bash
# Execute unit tests for resolver, transliteration, and normalizers
npx vitest run test/unit/resolver.test.ts test/unit/normalizer.test.ts
```
