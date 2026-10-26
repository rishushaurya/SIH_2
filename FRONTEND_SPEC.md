# Frontend Engineering Specification: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink Portal Client (React 18 + Vite + Vanilla CSS Custom Properties)  

---

## 1. UI Design System & Component Hierarchy

The MahaLink frontend replicates the visual gravitas of official Government of Maharashtra portals (`maharashtra.gov.in` and `aaplesarkar.mahaonline.gov.in`) while delivering modern, sub-second client performance and trilingual accessibility.

```
[ App Root / Layout Shell ]
├── Header (Ashoka Emblem, Trilingual Toggle, Meri Pehchaan Identity Badge)
├── Global Navigation Bar (Home, Service Catalog, Consent Ledger, Live Console, Admin)
│
├── ErrorBoundary Wrapper
│   ├── Route: / (Portal Home & Citizen Service Directory)
│   ├── Route: /apply/:serviceId (Dynamic Form Wizard with Auto-Fill)
│   │   ├── StepIndicator
│   │   ├── ConsentModal (DPDP Act Granular Authorization)
│   │   ├── AutoFillSection (With Authoritative Verification Badges)
│   │   └── ManualFallbackSection
│   ├── Route: /consent (Citizen Privacy & Revocation Ledger)
│   └── Route: /admin (Department Admin Scrutiny Desk)
│
├── SplitScreen InspectionPanel (Live Architecture Event Visualizer)
│   ├── EventLogStream (SSE Client)
│   ├── TokenInspector (Decoded ECDSA JWT View)
│   └── HashChainVerifier (One-Click Tamper Verifier)
│
└── Footer (Gov Disclaimers, Accessibility Controls, NIC / Maha-IT Attribution)
```

---

## 2. Universal 4-State UI Specification

Every asynchronous data-fetching component in the client application MUST strictly implement all four distinct states. No blank screens or unhandled empty states are permitted under any condition.

| Component Name | 1. Loading State (Skeleton) | 2. Success State | 3. Error State (With Retry) | 4. Empty State (With CTA) |
|:---|:---|:---|:---|:---|
| **ServiceCatalog** | 6 grid cards with shimmering title, tag pill, and button placeholders. | Full service cards rendered with "Auto-Fill Available" badges. | Red alert box: "Failed to load service directory" + "Retry Now" button. | "No services match your search filter." + "Reset Search" CTA. |
| **LandRecordSection** | Content-shaped rectangular skeleton matching 7/12 land table dimensions. | Land survey number, area, assessment tax, and green Mahabhumi verification badge. | Yellow banner: "Mahabhumi database did not respond in 2s" + "Enter Survey No Manually". | "No land records registered under this Aadhaar hash." + "Search by Gat Number". |
| **VehicleRCSection** | Dual-row skeleton placeholder for registration number & vehicle model. | Vehicle registration, chassis digest, and RTO verified badge. | Warning box: "RTO adapter timeout" + "Retry Verification". | "No vehicles registered under applicant profile." + "Add Vehicle Manually". |
| **ConsentLedgerTable**| 4-row tabular skeleton with pulsating cell placeholders. | Paginated table showing Token ID, Department, Scope, Expiry, and Revoke action. | Error banner: "Unable to retrieve consent history." + "Reload Ledger". | "Zero active consents. You have not authorized any data sharing." + "Explore Services". |
| **InspectionConsole**| Shimmering terminal prompt indicator. | Real-time scrolling color-coded event stream with microsecond timestamps. | "Inspection stream disconnected" + "Reconnect WebSocket/SSE". | "Waiting for citizen workflow triggers..." + "Run Demo Journey". |

---

## 3. Shimmer Skeleton Animation Specification

Skeleton loaders must precisely mimic the dimensions of incoming data blocks to guarantee **Zero Cumulative Layout Shift (CLS < 0.05)**.

```css
/* Shimmer Animation Token */
@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-box {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.05) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite ease-in-out;
  border-radius: var(--radius-sm);
}
```

---

## 4. Form State Persistence Engine (`useFormPersist`)

To guarantee that citizens never lose form input due to network instability, browser crashes, or server errors:

1. **Storage Mechanism:** On every change, form state is saved to browser `sessionStorage` under `mahalink_draft_${maskedId}_${journeyId}`. Session storage is tab-scoped, so personal data never outlives the browser tab; logout clears it.
2. **Restoration Protocol:** When the form mounts, the hook inspects `sessionStorage` and restores any draft (reloads and network errors do not lose input).
3. **Pristine Cleansing:** Upon successful submission receipt (`200 OK`), the draft key is immediately cleared from `sessionStorage`.

---

## 5. Trilingual Localization Architecture (`useTrilingual`)

MahaLink supports true trilingual operations with zero layout breaks:
- **English (`en`)**: Primary administrative baseline.
- **Marathi (`mr` - मराठी)**: Official state language with full Devanagari font rendering.
- **Hindi (`hi` - हिंदी)**: National language localization.

```typescript
// Client Localization Hook Definition
export type SupportedLocale = 'en' | 'mr' | 'hi';

export function useTrilingual() {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    return (localStorage.getItem('mahalink_locale') as SupportedLocale) || 'mr';
  });

  const changeLocale = (newLocale: SupportedLocale) => {
    localStorage.setItem('mahalink_locale', newLocale);
    setLocale(newLocale);
    document.documentElement.lang = newLocale;
  };

  const t = (key: string): string => {
    return dictionaries[locale][key] || dictionaries['en'][key] || key;
  };

  return { locale, changeLocale, t };
}
```

---

## 6. Iconography Mandate (Strict Zero-Emoji Rule)

Emojis and raw unicode glyphs are strictly prohibited in the user interface. All UI indicators must use **Lucide React** SVG icons with explicit `aria-hidden` or `aria-label` accessibility attributes:
- Verification Status: `<CheckCircle2 size={16} className="text-emerald-500" />`
- Warning / Alert: `<AlertTriangle size={16} className="text-amber-500" />`
- Security / Lock: `<ShieldCheck size={16} className="text-blue-500" />`
- Revocation: `<Ban size={16} className="text-rose-500" />`
- Department: `<Building2 size={16} className="text-slate-400" />`

---

## 7. Responsive Breakpoints

| Breakpoint | Pixel Width | Layout Adjustments |
|:---|:---|:---|
| **Mobile (`sm`)** | `360px – 639px` | Single column form layout, stacked header, collapsed inspection drawer. |
| **Tablet (`md`)** | `640px – 1023px` | 2-column form grids, persistent sticky top navigation bar. |
| **Desktop (`lg`)**| `1024px – 1439px`| Full government layout with dual-column application wizard. |
| **Wide (`xl`)**   | `1440px+` | Split-screen active: Left panel citizen portal, right panel Live Inspection Console. |
