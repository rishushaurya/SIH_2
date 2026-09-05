# Performance Budgets & Web Vitals Specification: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink Portal Client & Middleware  

---

## 1. Core Web Vitals Performance Targets

The citizen-facing application is optimized for low-bandwidth 3G/4G connectivity across rural Maharashtra.

| Metric | Target SLA | Benchmark Strategy |
|:---|:---|:---|
| **Largest Contentful Paint (LCP)** | `< 1.2 seconds` | Pre-rendered static shell, zero render-blocking CSS, preloaded Devanagari typography. |
| **First Input Delay (FID)** | `< 50 milliseconds` | Pure lightweight React components, zero heavy UI frameworks, tree-shaken Lucide icons. |
| **Cumulative Layout Shift (CLS)**| `< 0.02` | Exact dimension-matched skeleton placeholders for all asynchronous form sections. |
| **Time to Interactive (TTI)** | `< 1.5 seconds` | Dynamic route code-splitting with Vite. |

---

## 2. Asset & Bundle Size Budgets

| Asset Category | Maximum Budget (Gzipped) | Implementation Strategy |
|:---|:---|:---|
| **JavaScript Main Bundle** | `< 180 KB` | Direct dependency pruning; zero Lodash or Moment.js; native browser APIs exclusively. |
| **CSS Stylesheet Bundle** | `< 25 KB` | Single native CSS custom property token file; zero Tailwind CSS runtime overhead. |
| **Webfonts (Devanagari/Inter)**| `< 85 KB` | WOFF2 format with `font-display: swap` and unicode subsetting. |
| **SVG Icons** | `< 15 KB` | Granular named imports from `lucide-react`. |

---

## 3. SEO & OpenGraph Meta Tag Specification

```html
<!-- Canonical Maharashtra Government Portal Metadata -->
<title>MahaLink — Maharashtra Government Interoperability & Citizen Consent Middleware</title>
<meta name="description" content="Official Maharashtra Government interoperability middleware enabling unified, once-only citizen service applications with DPDP-compliant consent management.">
<meta name="keywords" content="MahaLink, Aaple Sarkar, Maharashtra e-Governance, SIH26129, IndEA, DEPA, Income Certificate, 7/12 Land Records">
<meta name="theme-color" content="#003366">

<!-- OpenGraph / Social Sharing -->
<meta property="og:type" content="website">
<meta property="og:title" content="MahaLink — Unified Maharashtra Citizen Services Middleware">
<meta property="og:description" content="Connecting 20+ government departments through secure, consent-based digital pipelines.">
<meta property="og:image" content="/assets/gov-emblem-og.png">
<meta property="og:locale" content="mr_IN">
<meta property="og:locale:alternate" content="en_IN">
<meta property="og:locale:alternate" content="hi_IN">
```
