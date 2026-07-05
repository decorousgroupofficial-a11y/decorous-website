# Decorous Construction ERP — UI / UX Wireframes

## Design Philosophy (Non-Negotiable)

This is **NOT a Dribbble-style dashboard.** It is a tool used by:
- **Site engineers** standing in direct sunlight, gloved fingers, dust on screen
- **Accountants** entering 200+ transactions per day — speed > beauty
- **Owners** who open the app for 45 seconds, twice a day, to check cash burn
- **Vendors / labour contractors** with low literacy, Hindi/regional preference

### Core Design Rules

| # | Rule | Why |
|---|------|-----|
| 1 | **Minimum typing** | Use dropdowns, chips, voice input. Typing on a dusty phone = slow + errors |
| 2 | **Large touch targets (min 56px)** | Gloved hands, small thumbs, rushing workers |
| 3 | **High contrast (WCAG AAA)** | Direct sunlight on Android LCDs = washed out |
| 4 | **Offline-first visual language** | Show sync status on every screen — people distrust data they can't see |
| 5 | **One primary action per screen** | No "25 buttons in a toolbar" syndrome |
| 6 | **Skeleton speed > skeleton polish** | Loads must feel instant (<100ms perceived) |
| 7 | **Bilingual (EN + HI)** from day one | Site staff will default to Hindi |
| 8 | **No modals inside modals** | Mobile back-button hell — kill it |

---

## Product Surface Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DECOROUS ERP — TWO SURFACES                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   SURFACE 1: Web Admin (Next.js)          SURFACE 2: Field App       │
│   ─────────────────────────────           (React Native)             │
│                                           ───────────────            │
│   Users:                                  Users:                     │
│   • Owner / Director                      • Site Engineer            │
│   • Accountant / Finance                  • Supervisor               │
│   • Project Manager (office)              • Foreman                  │
│   • HR / Admin                            • Store-keeper             │
│                                                                      │
│   Primary jobs:                           Primary jobs:              │
│   • Financial control                     • DPR entry                │
│   • P&L, cash-flow                        • Material receipt         │
│   • Approve vendor bills                  • Attendance marking       │
│   • Set project budgets                   • Photo evidence           │
│   • Close books monthly                   • Petty cash expense       │
│                                                                      │
│   Context: Desk, dual monitor             Context: Site, 1 hand,     │
│                                           dust, weak 3G/4G           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

# PART A — WEB ADMIN WIREFRAMES (Next.js)

Target resolution: **1440 × 900** primary, responsive to 1024. No mobile web — mobile users use the native app.

## A1. Global Shell

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [D] Decorous ERP       [Project ▼ Villa-A2]   🔍 Search…    🔔 3   👤 Ravi │ 56px
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐  ┌──────────────────────────────────────────────────────────┐ │
│ │ 📊 Overview │  │                                                          │ │
│ │ 🏗 Projects │  │                                                          │ │
│ │ 💰 Finance  │  │                                                          │ │
│ │  ├ Ledger  │  │                    MAIN CONTENT AREA                     │ │
│ │  ├ Bills   │  │                                                          │ │
│ │  └ P&L     │  │                                                          │ │
│ │ 📦 Material │  │                                                          │ │
│ │ 👷 Labour   │  │                                                          │ │
│ │ 🧾 Vendors  │  │                                                          │ │
│ │ 📑 Reports  │  │                                                          │ │
│ │ ⚙ Settings │  │                                                          │ │
│ │            │  │                                                          │ │
│ │ ──────────  │  │                                                          │ │
│ │ 🟢 Sync OK │  │                                                          │ │
│ │ 2s ago     │  │                                                          │ │
│ └────────────┘  └──────────────────────────────────────────────────────────┘ │
│   240px                                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**
- Left rail = **fixed**, collapses to icons only at 1024px
- Top bar shows **active project context** — everything below is scoped to it
- Sync indicator bottom-left is **always visible** on every screen (trust anchor)
- No breadcrumbs — sidebar active state is enough

---

## A2. Owner Dashboard (Landing)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Overview                                                    Today: 12 Feb │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ CASH IN HAND │ │ THIS MONTH   │ │ PENDING      │ │ ACTIVE       │       │
│ │              │ │ BURN         │ │ BILLS        │ │ PROJECTS     │       │
│ │  ₹ 24.6 L    │ │  ₹ 18.2 L    │ │   ₹ 6.4 L   │ │      7       │       │
│ │              │ │              │ │              │ │              │       │
│ │  ▲ 4.2%      │ │  ▼ 12%       │ │  ⚠ 3 overdue │ │  5 on track  │       │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                            │
│ ┌───────────────────────────────────────┐ ┌──────────────────────────────┐│
│ │ CASH-FLOW — Last 30 days              │ │ TOP COST OVERRUNS            ││
│ │                                       │ │                              ││
│ │    IN  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  48L       │ │ Villa-A2  Cement  ₹ 1.2L ⚠   ││
│ │    OUT ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      41L       │ │ Sharma-H  Labour  ₹ 85K ⚠   ││
│ │    NET ▓▓▓                  7L        │ │ Raj-Plot  Steel   ₹ 62K      ││
│ │                                       │ │                              ││
│ │    [ View ledger → ]                  │ │  [ Full report → ]           ││
│ └───────────────────────────────────────┘ └──────────────────────────────┘│
│                                                                            │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ NEEDS YOUR APPROVAL                                         (4)       │ │
│ │ ─────────────────────────────────────────────────────────────────────│ │
│ │  ₹ 2.4L   Cement — Ultratech (500 bags)    Villa-A2   [Approve][▼]   │ │
│ │  ₹ 45K    Labour advance — Shyam           Sharma-H   [Approve][▼]   │ │
│ │  ₹ 1.1L   Steel TMT — Tata                 Raj-Plot   [Approve][▼]   │ │
│ │  ₹ 32K    Fuel — diesel                    Villa-A2   [Approve][▼]   │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**What this solves**
- Owner opens app for 45 seconds → gets **4 KPIs + 4 pending approvals** in one glance
- All numbers are **tap-through** to full ledger
- "Approve" is one-tap — PIN challenge triggers a modal (A3 below)

---

## A3. Approval Confirmation (PIN / 2FA)

```
                ┌────────────────────────────────────────┐
                │  APPROVE PAYMENT                     ✕ │
                ├────────────────────────────────────────┤
                │                                        │
                │   To:        Ultratech Cement          │
                │   Amount:    ₹ 2,40,000                │
                │   Project:   Villa-A2                  │
                │   Category:  Material → Cement          │
                │   Invoice:   UT-2026-00412 [view PDF]  │
                │                                        │
                │   ─────────────────────────────────    │
                │   This creates journal entry:          │
                │   Dr  Material (Villa-A2)   2,40,000   │
                │   Cr  Ultratech Payable     2,40,000   │
                │   ─────────────────────────────────    │
                │                                        │
                │   Enter 4-digit PIN:                   │
                │   ┌───┐ ┌───┐ ┌───┐ ┌───┐              │
                │   │ • │ │ • │ │ _ │ │ _ │              │
                │   └───┘ └───┘ └───┘ └───┘              │
                │                                        │
                │   [ Cancel ]        [ Approve & Post ] │
                └────────────────────────────────────────┘
```

**Why this matters**
- **Every financial action shows the journal entry** — trains users, enforces audit thinking
- PIN is mandatory for approvals > ₹50K (configurable per org)
- No password re-entry — just PIN (friction kills adoption)

---

## A4. Project Detail — Budget vs Actual

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🏗 Villa-A2  │ Client: R. Sharma │ Start: 01-Oct-2025 │ Due: 30-Jun-2026  │
├────────────────────────────────────────────────────────────────────────────┤
│ Budget: ₹ 82 L   │  Spent: ₹ 48.3 L  │  Remaining: ₹ 33.7 L  │  ✅ 59%    │
│ Planned: 60%     │  Actual: 52%      │  Variance: -8%        │  ⚠ Behind  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ [Overview] [Budget] [Ledger] [Material] [Labour] [DPR] [Photos] [Docs]   │
│ ═══════════                                                                │
│                                                                            │
│ HEAD                 BUDGET      SPENT      REMAINING   %      STATUS     │
│ ─────────────────   ─────────   ─────────  ──────────  ────   ────────    │
│ Foundation          8,00,000    7,82,400      17,600   98%    ✅ Done     │
│ Structure           32,00,000   28,40,100   3,59,900   89%    🟡 Active   │
│ ├ Cement             8,00,000    7,20,000     80,000   90%                │
│ ├ Steel              14,00,000  12,80,100   1,19,900   91%    ⚠ Overrun  │
│ ├ Sand & Aggr.       4,00,000   3,12,000      88,000   78%                │
│ └ Labour             6,00,000   5,28,000      72,000   88%                │
│ Masonry             12,00,000   5,40,000    6,60,000   45%    🟡 Active   │
│ Plumbing             6,00,000         0     6,00,000    0%    ⏸ Pending  │
│ Electrical           5,00,000         0     5,00,000    0%    ⏸ Pending  │
│ Finishing           15,00,000         0    15,00,000    0%    ⏸ Pending  │
│ Contingency          4,00,000      50,000   3,50,000   12%                │
│                                                                            │
│                                              [ Export CSV ]  [ Lock FY ] │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**
- **Variance is the hero number** — green/yellow/red coded, no percentages buried
- Tabs use **pipe architecture**, not cards — denser, faster scan
- Any row → click expands to the underlying ledger entries (drill-down = trust)

---

## A5. Journal Entry (Accountant Screen)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Finance › Ledger › New Entry                           Post as: Ravi (CA) │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ Date      [12-Feb-2026  📅]     Project  [Villa-A2            ▼]          │
│ Reference [UT-2026-00412 ]      Type     [Vendor Bill          ▼]          │
│ Narration [Cement purchase — 500 bags Ultratech OPC 43]                   │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐│
│ │ #  ACCOUNT                           DEBIT         CREDIT     PROJECT  ││
│ │ ──────────────────────────────────  ──────────    ─────────   ────────││
│ │ 1  [Material — Cement        ▼]    2,40,000                   Villa-A2││
│ │ 2  [GST Input @ 18%          ▼]       43,200                  Villa-A2││
│ │ 3  [Ultratech Payable        ▼]                   2,83,200            ││
│ │ +  [Add line]                                                          ││
│ │ ─────────────────────────────────  ──────────    ─────────            ││
│ │                             TOTAL:  2,83,200      2,83,200   ✅ Balanced││
│ └────────────────────────────────────────────────────────────────────────┘│
│                                                                            │
│ Attachments: [📎 invoice-UT-412.pdf  ✕]  [+ Attach]                       │
│                                                                            │
│                          [Save as Draft]    [Post Entry →]                │
└────────────────────────────────────────────────────────────────────────────┘
```

**Hard rules enforced by UI**
- Post button **disabled** until Debit = Credit
- Account dropdown is **typeahead only** (no free-text — COA is fixed)
- Project column is **required** on every line (no "unallocated" overhead leaks)
- Once posted → **immutable**. Corrections = reversing entry (audit trail)

---

## A6. Bills & Payables Inbox

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Bills                         [+ New Bill]  [Bulk Import]  [Filter ▼]     │
├────────────────────────────────────────────────────────────────────────────┤
│ Tabs:  [Draft 2] [Pending 4] [Approved 12] [Paid 48] [Overdue 3]         │
│                                                                            │
│ ┌──┬──────────┬────────────────┬──────────┬─────────┬────────┬─────────┐ │
│ │□ │ DATE     │ VENDOR         │ AMOUNT   │ PROJECT │ DUE    │ STATUS  │ │
│ ├──┼──────────┼────────────────┼──────────┼─────────┼────────┼─────────┤ │
│ │☐ │ 12-Feb   │ Ultratech      │ 2,83,200 │ Villa-A2│ 27-Feb │ 🟡 Pend │ │
│ │☐ │ 11-Feb   │ Tata Steel     │ 1,24,000 │ Raj-Plot│ 26-Feb │ 🟡 Pend │ │
│ │☐ │ 08-Feb   │ Shyam Labour   │   48,000 │ Sharma-H│ 08-Feb │ 🔴 Over │ │
│ │☐ │ 05-Feb   │ ACC Cement     │   92,000 │ Villa-A2│ 20-Feb │ 🟢 Appr │ │
│ │  │ ...      │                │          │         │        │         │ │
│ └──┴──────────┴────────────────┴──────────┴─────────┴────────┴─────────┘ │
│                                                                            │
│  [☐ Select all]  [→ Approve 0]  [→ Mark paid 0]  [→ Reject 0]            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Why this table design**
- **Bulk actions** are vital — accountants approve 30 bills at once end of week
- Status emojis are color-coded but also have text (accessibility + colorblind)
- Overdue sorted to top — urgency bias

---

# PART B — FIELD APP WIREFRAMES (React Native)

Target: Android 7+, 5.5" and up. iOS secondary. **Offline-first.**

## B1. Home — "What do I do now?"

```
┌────────────────────┐
│  D E C O R O U S   │ Top bar 64px
│  🟢 Online • Villa-A2
├────────────────────┤
│                    │
│  Hi, Rajesh        │
│  Tuesday 12 Feb    │
│                    │
│ ┌────────────────┐ │
│ │  + DAILY       │ │  ← primary CTA, 96px tall
│ │     REPORT     │ │     green, bold
│ │  Not submitted │ │
│ └────────────────┘ │
│                    │
│ ┌────────┬───────┐ │
│ │ 📥      │ 👷    │ │
│ │Material │Atten- │ │
│ │receive  │dance  │ │
│ │   3 pend│ done  │ │
│ └────────┴───────┘ │
│                    │
│ ┌────────┬───────┐ │
│ │ 💸      │ 📷    │ │
│ │Petty    │Site   │ │
│ │cash     │photo  │ │
│ │  ₹ 2,400│ 12 new│ │
│ └────────┴───────┘ │
│                    │
│ ─────────────────  │
│ 🔄 7 pending sync  │
│ ──────────────────│
│ [🏠][📋][📦][👤]  │ Bottom nav 72px
└────────────────────┘
```

**Design notes**
- **One giant primary action** — DPR is the mandated ritual, front-and-center
- **Offline-safe**: tiles work without internet, queue locally
- Sync badge is always visible — users trust what they can see queued

---

## B2. Daily Progress Report (DPR) — Step 1 of 3

```
┌────────────────────┐
│ ← DPR — Villa-A2   │
│   12-Feb-2026      │
├────────────────────┤
│ Step 1 of 3: Work  │
│ ●●○ ○              │
├────────────────────┤
│                    │
│ Work done today:   │
│ ┌────────────────┐ │
│ │ 🎤 Tap to speak│ │  ← voice-first entry
│ │                │ │
│ │ "Slab casting  │ │
│ │  of 2nd floor  │ │
│ │  completed,    │ │
│ │  curing started"│ │
│ └────────────────┘ │
│                    │
│ Activity tags:     │
│  [Slab ✓] [Curing ✓]│
│  [+ Add]           │
│                    │
│ Weather:           │
│  [☀ Sunny ] [🌧][☁]│
│                    │
│ Issues / Blockers: │
│ ┌────────────────┐ │
│ │ None           │ │
│ └────────────────┘ │
│                    │
│        [  Next →  ]│
└────────────────────┘
```

## B2b. DPR Step 2 — Labour

```
┌────────────────────┐
│ ← DPR              │
│ Step 2 of 3: Labour│
│ ●●●○               │
├────────────────────┤
│                    │
│ Labour on site:    │
│                    │
│ ┌─── Mason ──────┐│
│ │  Skilled:   5  ││  [-][+]  large buttons
│ │  Helper:    8  ││  [-][+]
│ └────────────────┘│
│                    │
│ ┌─── Steel ──────┐│
│ │  Skilled:   2  ││  [-][+]
│ │  Helper:    3  ││  [-][+]
│ └────────────────┘│
│                    │
│ ┌─── Electrical ─┐│
│ │  Skilled:   0  ││  [-][+]
│ │  Helper:    0  ││  [-][+]
│ └────────────────┘│
│                    │
│ Total: 18 workers  │
│ Yesterday: 21 ↓    │
│                    │
│  [← Back ]  [Next →]│
└────────────────────┘
```

## B2c. DPR Step 3 — Photo Evidence

```
┌────────────────────┐
│ ← DPR              │
│ Step 3 of 3: Photos│
│ ●●●●               │
├────────────────────┤
│                    │
│ Attach photos:     │
│ (min 2, max 10)    │
│                    │
│ ┌─────┐ ┌─────┐   │
│ │     │ │     │   │
│ │ 📷  │ │ 📷  │   │
│ │ ✓   │ │ ✓   │   │
│ └─────┘ └─────┘   │
│                    │
│ ┌─────┐ ┌─────┐   │
│ │     │ │ +   │   │
│ │ 📷  │ │     │   │
│ │ ✓   │ │     │   │
│ └─────┘ └─────┘   │
│                    │
│ 🗺 GPS stamped:    │
│ 28.61°N, 77.23°E   │
│                    │
│ ─────────────────  │
│ [ 📤 SUBMIT DPR ]  │
└────────────────────┘
```

**Design rules**
- **3 steps max.** Anything longer = users fake data or skip
- Photos are **GPS + timestamp stamped** on client side (geofence check on server)
- Voice-to-text uses Android native STT; **works offline** (on-device model)
- On submit, **goes to queue immediately** — no spinners, no waiting

---

## B3. Material Receipt

```
┌────────────────────┐
│ ← Material Receive │
├────────────────────┤
│                    │
│ PO / Challan:      │
│ ┌────────────────┐ │
│ │ 📷 Scan QR/    │ │  ← camera opens directly
│ │    Barcode     │ │
│ └────────────────┘ │
│ or                 │
│ [ Enter manually ] │
│                    │
│ ─── OR picked ───  │
│ PO #1042 · Villa-A2│
│ Ultratech Cement   │
│ Ordered: 500 bags  │
│                    │
│ Received today:    │
│ ┌────────────────┐ │
│ │    500         │ │  ← big numeric
│ │  [-]  [+]      │ │
│ └────────────────┘ │
│                    │
│ Condition:         │
│  [✓ OK] [Damage]   │
│                    │
│ Truck #: DL01AB1234│
│                    │
│ 📷 Unloading photo │
│ ┌─────┐            │
│ │  ✓  │            │
│ └─────┘            │
│                    │
│  [ Confirm receipt]│
└────────────────────┘
```

**Why QR/barcode first**
- Store-keepers **hate typing**. QR scan = 2 seconds. Manual = 45 seconds + errors
- Falls back gracefully to manual entry (offline-safe)
- Photo is **required** — no photo, no receipt (prevents fraud)

---

## B4. Petty Cash Expense

```
┌────────────────────┐
│ ← Petty Cash       │
├────────────────────┤
│                    │
│ Amount (₹):        │
│ ┌────────────────┐ │
│ │    2,400       │ │  ← big numpad-style input
│ └────────────────┘ │
│                    │
│ Category:          │
│ ┌────────────────┐ │
│ │ [🚚 Transport ] │ │ ← horizontal scroll chips
│ │ [⚒ Tools     ]  │ │
│ │ [🍱 Food      ] │ │
│ │ [⚕ Medical   ]  │ │
│ │ [+ Other     ]  │ │
│ └────────────────┘ │
│                    │
│ Purpose:           │
│ ┌────────────────┐ │
│ │ Diesel for     │ │
│ │ JCB             │ │
│ └────────────────┘ │
│                    │
│ 📷 Bill photo:     │
│ ┌─────┐            │
│ │  +  │ required   │
│ └─────┘            │
│                    │
│ Vendor name (opt): │
│ [ HP Petrol Pump ] │
│                    │
│  [   Submit    ]   │
└────────────────────┘
```

**Hardcoded rules**
- Amount > ₹5,000 → requires supervisor approval (goes to queue, not auto-posted)
- Photo always required — no exceptions
- Category chips are **org-configurable** in admin (not free text)

---

## B5. Sync Status Screen (Reached by tapping sync badge)

```
┌────────────────────┐
│ ← Sync Status      │
├────────────────────┤
│                    │
│ 🟢 Online          │
│ Last sync: just now│
│                    │
│ ─── Pending (7) ── │
│                    │
│ ⏳ DPR — 12 Feb    │
│   Queued 2 min ago │
│                    │
│ ⏳ Material receipt│
│   PO #1042 · 500   │
│   Queued 5 min ago │
│                    │
│ ⏳ Petty cash ₹2,400│
│   Queued 8 min ago │
│                    │
│ ⏳ 3 photos         │
│   Uploading... 45% │
│   [▓▓▓▓▓▓▓░░░░░]  │
│                    │
│ ⏳ Attendance x 18  │
│   Queued 1 hr ago  │
│                    │
│ ─── Failed (1) ──  │
│                    │
│ ⚠ Expense ₹8,200   │
│   Needs approval   │
│   [ Tap to resolve]│
│                    │
│ ─────────────────  │
│   [ Force sync ]   │
└────────────────────┘
```

**Non-negotiable**
- Sync status is **never hidden behind a menu** — it's a top-level screen
- Every queued item shows **what data**, not just "queued"
- Failed items show **why** and how to fix
- "Force sync" button — users need a lever when things feel stuck

---

## B6. Offline State (when connection drops)

```
┌────────────────────┐
│  D E C O R O U S   │
│  🟡 Offline · 8 min │ ← amber banner top
├────────────────────┤
│                    │
│  ⚠ No internet.    │
│  Your work is safe.│
│  It will sync when │
│  connection is back.│
│                    │
│  [ Continue →  ]   │
│                    │
├────────────────────┤
│  Normal home tiles │
│  still work here   │
│     ...            │
└────────────────────┘
```

**Trust-first copy**
- First thing user sees: *"Your work is safe"* — kills panic
- App **never blocks** work offline. Only blockers: approvals > ₹X and cross-project transfers
- Amber (not red) — offline is normal, not an error

---

# PART C — ACCESSIBILITY & LOCALIZATION

## C1. Language Toggle

- **Default EN**, one-tap switch to HI (हिंदी)
- Stored per-user, not per-device
- All **domain terms** (ledger, DPR, mason) translated with glossary file
- No Google Translate — human-reviewed strings only

## C2. Touch & Visual

- Minimum hit target: **56×56dp** (Material 3 spec)
- Contrast ratio: **7:1 for body text** (AAA)
- Primary font: **Inter** (but **no Inter fatigue** — deliberate use of weight + density)
- Amount numerals: **tabular figures** (so 2,40,000 and 1,80,000 align vertically)

## C3. Error Prevention > Error Messages

- Disable "Submit" until form is valid (don't wait for user to tap then scold)
- "Are you sure?" **only** for irreversible actions (delete, post, pay)
- For reversible actions: show a 5-second undo toast

---

# PART D — ANIMATIONS & PERFORMANCE BUDGET

| Screen | First paint | Interactive | Animation budget |
|---|---|---|---|
| Web dashboard | <800ms | <1.5s | 200ms fade-ins only |
| Field app home | <400ms (from cold) | <700ms | None — pure snappiness |
| Photo capture → queued | <100ms perceived | instant | Haptic tick |
| Approval PIN modal | <150ms | instant | Subtle scale-up |

**Rule:** If an animation delays work, remove it. Users prefer jank-free speed over smooth delays.

---

# PART E — WHAT WE DELIBERATELY OMIT (for MVP)

These are **excluded by design** from MVP:

- ❌ Gantt charts — not enough data in first 3 projects to be useful
- ❌ AI chat assistant — premature, no grounded training data yet
- ❌ 3D model viewer — adds no value to site execution
- ❌ Multi-language beyond EN+HI — come back after 100 active users
- ❌ Dark mode — not on sites (sunlight readability first)
- ❌ Fancy charts library (d3/recharts with 20 chart types) — 3 chart types are enough
- ❌ Notification center with filters — use simple badge + one list

This is the **MVP discipline clause**. Every "nice to have" lives in the roadmap doc, not here.

---

## Appendix — Design Token Reference

```yaml
colors:
  primary:       "#0B5FFF"     # trust-blue, used on CTAs
  success:       "#0D8A3C"     # balanced ledger, approved
  warning:       "#B25F00"     # overdue, overrun
  danger:        "#B02A37"     # failed sync, rejections
  neutral_900:   "#0F172A"     # body text
  neutral_500:   "#64748B"     # secondary text
  neutral_100:   "#F1F5F9"     # surfaces
  amber_banner:  "#FFB020"     # offline state

typography:
  body:          "Inter 16/24"
  body_tight:    "Inter 14/20"
  heading_lg:    "Inter 24/32 weight-600"
  heading_xl:    "Inter 32/40 weight-700"
  numerals:      "Inter tabular-nums"

spacing:
  grid:          8px base
  section:       32px
  tight:         4px

motion:
  snap:          120ms ease-out    # buttons, toggles
  reveal:        200ms ease-out    # modals, sheets
  never:         pull-to-refresh animation (blocks real work)
```

---

**End of Doc 05 — UI/UX Wireframes**

Next doc: `06-sync-architecture.md` — how the field app works reliably on 2G, what happens when two engineers edit the same DPR, and how the event bus keeps ledger state correct.
