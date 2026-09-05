# Build Chunk 06: Maharashtra Portal Themed Frontend Shell

> Document Version: 1.0.0  
> Chunk ID: 06  
> Estimated Time: 1.5 hours  
> Dependencies: Chunk 01  
> Unlocks: Chunk 07 (Dynamic Forms & Console)  

---

## 1. Chunk Goal
Scaffold the React 18 + Vite frontend client, initialize the Maharashtra Government visual identity system in `tokens.css` (Navy `#003366`, Saffron `#FF6600`), build accessible Header, Footer, and ErrorBoundary components, and implement full trilingual localization (`useTrilingual` supporting Marathi, English, and Hindi).

---

## 2. Component Implementation Details

### 2.1 Client Scaffolding (`client/`)
- Vite React TypeScript configuration with tree-shaken Lucide icons.
- `src/styles/tokens.css`: Native CSS custom properties enforcing government typography and spacing.
- Zero external CSS libraries or frameworks (Tailwind/Bootstrap excluded).

### 2.2 Shell Components (`client/src/components/`)
- **`Header.tsx`**: State seal, "महाराष्ट्र शासन | Government of Maharashtra", trilingual switcher button group, font resize controls, and SSO identity badge.
- **`Footer.tsx`**: Government copyright, privacy policy links, DPDP Act notices, and NIC/Maha-IT credits.
- **`ErrorBoundary.tsx`**: React route-level error boundary with reload action and technical trace copy button.

### 2.3 Localization Dictionaries (`client/locales/`)
- `mr.json` (मराठी), `en.json` (English), `hi.json` (हिंदी) covering all navigation, button, and alert labels.

---

## 3. Verification Commands
```bash
# Build frontend bundle and verify zero type/lint errors
cd client && npm run build
```
