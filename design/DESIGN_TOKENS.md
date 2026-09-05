# CSS Design Tokens & Variable System (DESIGN_TOKENS): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink Portal Client  

---

## 1. CSS Custom Properties Master Definition

```css
:root {
  /* ==========================================================================
     Government of Maharashtra Canonical Color Palette
     ========================================================================== */
  --gov-navy-900: #002244;
  --gov-navy-800: #003366; /* Official Header Navy */
  --gov-navy-700: #004080;
  --gov-navy-100: #E6F0FA;

  --gov-saffron-600: #E65C00;
  --gov-saffron-500: #FF6600; /* Official Accent Saffron */
  --gov-saffron-100: #FFF0E6;

  --gov-white: #FFFFFF;
  --gov-slate-50: #F8FAFC;
  --gov-slate-100: #F1F5F9;
  --gov-slate-200: #E2E8F0;
  --gov-slate-300: #CBD5E1;
  --gov-slate-400: #94A3B8;
  --gov-slate-500: #64748B;
  --gov-slate-700: #334155;
  --gov-slate-800: #1E293B;
  --gov-slate-900: #0F172A;

  --gov-emerald-500: #10B981; /* Authoritative Source Verified */
  --gov-emerald-100: #D1FAE5;
  --gov-amber-500: #F59E0B;   /* Partial Match / Confirmation */
  --gov-amber-100: #FEF3C7;
  --gov-rose-500: #EF4444;    /* Revoked / Error */
  --gov-rose-100: #FEE2E2;

  /* ==========================================================================
     Typography Tokens
     ========================================================================== */
  --font-sans: 'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* ==========================================================================
     Spacing Tokens (4px Grid)
     ========================================================================== */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;

  /* ==========================================================================
     Elevation & Radii
     ========================================================================== */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

  /* ==========================================================================
     Animation Durations
     ========================================================================== */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```
