# UI Component Design Prompts & Specifications (UI_DESIGN_PROMPTS): MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink Portal Client  

---

## 1. Top Government Masthead & Header Specification

- **Visual Tone:** Official, formal, authoritative.
- **Top Masthead Strip:** Deep Navy background (`#002244`), height `32px`.
  - Left: "महाराष्ट्र शासन | Government of Maharashtra" (font-size: 12px, color: `#E2E8F0`).
  - Right: Trilingual Switcher buttons (`मराठी` | `English` | `हिंदी`), Screen Reader Access link, Font size adjuster (`A-`, `A`, `A+`).
- **Main Navigation Header:** Crisp White background (`#FFFFFF`), height `72px`, bottom border `2px solid #FF6600` (Maharashtra Saffron).
  - Left: State Emblem (Ashoka Stambh seal) + "MahaLink" logo in bold serif + "आंतर-विभागीय डेटा समन्वय".
  - Center: Nav links (`गृह / Home`, `सेवा सूची / Services`, `माझी संमती / My Consents`, `तपासणी डेस्क / Inspection Console`).
  - Right: Authenticated User Pill: Avatar icon + "Priya Sharma (AA-1234)" + "लॉग आउट / Logout".

---

## 2. Dynamic Application Form Wizard Component

- **Step Indicator:** 3-step breadcrumb bar:
  1. *नागरिक तपशील / Citizen Identity* (Completed - Green checkmark)
  2. *स्वयंचलित डेटा पुनर्प्राप्ती / Auto-Fill Verification* (Active - Saffron highlight)
  3. *अंतिम पुनरावलोकन / Submission* (Pending - Gray)
- **Auto-Populated Attribute Cards:**
  - Container: White card with subtle border (`#E2E8F0`) and light blue left accent border (`3px solid #003366`).
  - Field Layout: 2-column grid displaying Field Label, Populated Value, and **Authoritative Source Badge**.
  - **Source Badge (Verified):** Green background (`#D1FAE5`), dark green text (`#065F46`), border (`#10B981`), icon `<CheckCircle2 size={14} />`, text: *"महाभूमी ७/१२ द्वारे सत्यापित (विश्वासार्हता: ९९.२%)"*.
  - **Source Badge (Partial Match):** Amber background (`#FEF3C7`), text: *"नाव जुळणी पुष्टीकरण आवश्यक"*, with inline confirmation button.

---

## 3. DPDP Granular Consent Modal Component

- **Modal Backdrop:** Semi-transparent dark overlay (`rgba(15, 23, 42, 0.75)` with `backdrop-filter: blur(4px)`).
- **Modal Window:** Centered container (`width: 580px`), rounded corners (`8px`), border `1px solid #CBD5E1`.
- **Header:** Deep Navy header bar with Saffron emblem icon + *"डेटा संमती विनंती / Data Sharing Consent Request"*.
- **Body Content:**
  - *उद्देश / Purpose:* "उत्पन्न प्रमाणपत्र अर्ज #IC-2026-9921 साठी छाननी."
  - *विभाग / Participating Departments:*
    - Revenue Department: Land Ownership Area & Survey Number.
    - RTO Transport Department: Vehicle Registration & Class.
  - *वैधता / Token Validity:* "१५ मिनिटे (एकल व्यवहार / Single Transaction Scope)."
  - *वैधानिक सूचना / Statutory Notice:* "DPDP Act 2023 अंतर्गत, हा डेटा कायमस्वरूपी साठवला जाणार नाही."
- **Action Buttons:**
  - Primary (Affirmative): Solid Saffron button (`#FF6600`) with text *"संमती मंजूर करा / Grant Consent"*.
  - Secondary (Decline): Outline Gray button (`#64748B`) with text *"नकार द्या (मॅन्युअल भरा) / Deny & Fill Manually"*.

---

## 4. Real-Time Architecture Inspection Console (Split Screen)

- **Container:** Dark terminal pane (`#020617`), monospace font (`JetBrains Mono`), right-hand 40% viewport on desktop.
- **Top Control Bar:** "MahaLink Live Switchboard Stream" + Status indicator dot (Pulsing green `#10B981`) + "Verify Ledger" button.
- **Live Stream Item Format:**
  - `[TIMESTAMP]` in `#64748B`.
  - `[EVENT_NAME]` in `#38BDF8` (Cyan).
  - `[PAYLOAD_DIGEST]` in `#A7F3D0` (Mint).
  - `[HASH_CHAIN]` in `#FDE047` (Yellow).
