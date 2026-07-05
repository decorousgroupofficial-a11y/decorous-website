# Decorous Construction ERP — CTO Review Amendments (Feb 2026)

> **Status:** BINDING AMENDMENTS.  
> This document was produced after CTO review of Docs 01-08.  
> Where this doc conflicts with earlier docs, **this doc wins.**  
> Phase 0 kickoff is contingent on completing the three mandatory gates below.

---

## Executive Summary

The architecture design (Docs 01-08) passed CTO review with three mandatory corrections and three strategic corrections. This amendment codifies them.

| Change | Type | Status |
|---|---|---|
| 1. Ledger approval workflow + locking + reason codes | Mandatory | Must design before Phase 2 code |
| 2. Offline sync moved to Phase 2 (post-GA) | Mandatory | Applied in roadmap below |
| 3. CA shortlist required before Phase 0 code | Mandatory | Owner action — see §4 |
| 4. Budget bands (lean / strong / full) | Strategic | Applied in roadmap below |
| 5. Bus-factor risk upgraded to 16 | Strategic | Applied in risk matrix |
| 6. Internal-use 90-day rule before external sale | Strategic | Added to launch gate |

---

## 1. MANDATORY FIX — LEDGER GOVERNANCE LAYER

Doc 03 defined immutable entries + reversing entries. That is necessary but **not sufficient.** In Indian construction, fraud is internal, not hacking. We add three governance mechanisms.

### 1.1 Maker-Checker Approval Workflow

Every journal entry and every bill flows through two roles:

```
┌─────────────────────────────────────────────────────────────┐
│                    MAKER-CHECKER FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MAKER (Engineer / Junior Accountant / Site Supervisor)    │
│     │                                                       │
│     │ creates entry                                         │
│     ▼                                                       │
│   ┌────────────────────────┐                                │
│   │  Draft / Pending       │   ← not posted                │
│   │  (no ledger impact)    │                                │
│   └────────┬───────────────┘                                │
│            │                                                │
│            │ routed by amount + category                    │
│            ▼                                                │
│  CHECKER (Accountant / PM / Owner — depends on threshold)   │
│            │                                                │
│            │ reviews, must supply PIN + reason              │
│            ▼                                                │
│   ┌────────────────────────┐                                │
│   │  Posted (immutable)    │   ← hits ledger               │
│   └────────────────────────┘                                │
│                                                             │
│   Rejection path:                                           │
│      Pending → Rejected (with reason) → back to Maker      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Approval matrix (configurable per org, sensible defaults):**

| Transaction type | Amount | Maker | Required checker |
|---|---|---|---|
| Petty cash expense | ≤ ₹5,000 | Site engineer | Auto-approve |
| Petty cash expense | ₹5,001 – ₹25,000 | Site engineer | PM |
| Vendor bill | Any | Accountant | PM (if ≤ ₹50k), Owner (> ₹50k) |
| Payment release | ≤ ₹1,00,000 | Accountant | PM |
| Payment release | > ₹1,00,000 | Accountant | Owner |
| Journal entry (manual) | Any | Accountant | Senior accountant / Owner |
| Reversing entry | Any | Accountant | Owner (always, regardless of amount) |

**Hard rules:**
- Maker and Checker **cannot be the same user** — enforced at DB level (check constraint + trigger)
- Checker must supply PIN (not password) for every approval
- Approval action is logged with user + timestamp + IP + device

### 1.2 Ledger Period Locking (Month / FY Close)

Posted entries are immutable, but without period close an accountant can still post **new entries into a past month** to distort prior P&L. This is the classic "back-date" fraud pattern.

**Solution:**

```
┌──────────────────────────────────────────────────────────────┐
│                 PERIOD STATE MACHINE                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   OPEN ──────────► SOFT-CLOSE ──────────► LOCKED            │
│   (current month)   (review window)       (frozen forever)  │
│                                                              │
│   Who can post:      Who can post:         Who can post:    │
│   • Everyone (per   • Accountant + Owner  • Nobody          │
│     approval matrix)   only, with reason   (except reopen   │
│                        tag                  by Owner, rare)  │
│                                                              │
│   Transition by:                                             │
│   • Owner clicks "Close Month" after book reconciliation    │
│   • Auto-transition SOFT-CLOSE → LOCKED on day +15 unless   │
│     explicitly reopened                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**DB enforcement:**
- `periods` table with state column: `open | soft_close | locked`
- DB trigger: journal_entry INSERT blocked if target period is `locked`
- Reopening a locked period requires Owner PIN + written reason + audit entry

### 1.3 Reversal Reason Codes

Free-text reasons are audit-useless ("correction", "adjustment"). We enforce a **fixed vocabulary:**

| Code | Label | Example |
|---|---|---|
| `DUP_ENTRY` | Duplicate entry — same bill posted twice | Accidentally posted UT-412 twice |
| `WRONG_VENDOR` | Assigned to wrong vendor account | Bill meant for ACC Cement posted to Ultratech |
| `WRONG_PROJECT` | Assigned to wrong project | Steel for Villa-A2 posted to Raj-Plot |
| `RATE_MISMATCH` | Amount differs from invoice | Posted ₹2,80,000 — invoice was ₹2,83,200 |
| `GST_CORRECTION` | GST rate / HSN correction | Posted at 12% — actual 18% |
| `QTY_CORRECTION` | Received qty differs from booked | GRN 480 bags, invoice 500 |
| `CANCELLED_BILL` | Vendor cancelled after posting | Supplier issued credit note |
| `FY_CLOSING_ADJ` | FY closing adjustment per CA | Provision / deferral as advised |
| `OTHER` | Everything else (requires free-text + Owner approval) | Catch-all with extra friction |

Every reversal captures: reason_code + free-text note + approver_user_id + PIN + attached supporting doc (mandatory for `OTHER`).

### 1.4 Updated Phase 2 Gate

Doc 07 Phase 2 gate was "external CA audits the ledger model and signs off." Amended:

> **Phase 2 gate (revised):** External CA audits and signs off:  
> (a) chart of accounts,  
> (b) maker-checker approval matrix,  
> (c) period-close mechanism,  
> (d) reversal reason codes,  
> (e) 100-test CA-authored scenario pack (must all pass).

No exceptions. No "ship now, audit later."

---

## 2. MANDATORY FIX — OFFLINE SYNC DEFERRED TO PHASE 2 (post-GA)

### 2.1 What changes

Doc 06 ("Offline Sync & Event Architecture") is **not discarded** — it remains the design reference. But its **implementation moves out of the MVP.**

**MVP behaviour (v1.0):**
- Web admin: online-only (already the plan)
- Field app: **online-first** with local draft autosave + retry-on-failure
  - User opens a DPR → drafted locally in SQLite
  - App tries to send immediately
  - On failure (network / 5xx), shows banner "Saved locally — will retry" + manual retry button
  - Background retry every 30s while app is foreground, every 15 min while backgrounded
  - **No complex conflict resolution, no event bus, no multi-device merge**

**Phase 7 / v2.0 behaviour:**
- Full offline-first with the outbox pattern, event bus, conflict resolution (Doc 06 as written)

### 2.2 Why this is correct

| Factor | Online-first MVP | Full offline-first MVP |
|---|---|---|
| Engineering effort | 1 sprint | 6-8 sprints |
| Conflict-resolution bugs | ~0 | High risk |
| Field UX under real 3G | "Saved locally, retrying" banner | Seamless |
| Fraud surface | Lower (everything hits server sooner) | Higher (queued events can be manipulated) |
| Time to ship | Month 4 | Month 6+ |
| Validates adoption | Yes | Yes |

We can launch, validate usage, and **then** invest in full offline if the site-reality demands it. Many construction sites do have 4G now; the hypothesis that offline is critical is untested.

### 2.3 Trade-off we accept

- Workers on sites with **no connectivity** (rare but real — basements, interior rural plots) will be blocked from submitting in real time
- Mitigation: **local-draft autosave.** User can still fill the DPR offline; it syncs as soon as they step outside or reach 4G. The UX is "save now, send later" rather than "queue into a magic outbox."
- Communicate this limitation clearly in onboarding

### 2.4 Updated roadmap

Phase 4 scope changes:
- ❌ Remove: full sync-outbox, event bus publish, conflict resolution UI, tus resumable uploads, device enrollment tokens for offline auth
- ✅ Keep: SQLite draft cache, auto-save on blur, retry queue (simple, memory + SQLite persisted), photo upload with resume-on-open, basic device fingerprint (not JWT-offline)

This cuts Phase 4 effort by roughly **40%**, freeing the team for hardening in Phase 5.

---

## 3. MANDATORY FIX — CA IDENTIFICATION IS A CRITICAL-PATH DEPENDENCY

### 3.1 Upgraded status

Previously treated as a Phase 0 item. **Upgraded to pre-Phase-0 blocker.**

**Rule:** No ledger code is written until a CA is identified and engaged. Period.

### 3.2 CA shortlist criteria

The right CA for this project must:

1. **Have worked with construction companies** for at least 3 years (typical COA, GST, TDS nuances)
2. **Be comfortable reviewing software systems**, not just spreadsheets — they will sign off DB triggers, approval workflows, period-close rules
3. **Be willing to author the 100-test scenario pack** mentioned in §1.4 (paid engagement)
4. **Be reachable for a 2-hour review** every sprint in Phases 2 and 3
5. **Understand DPDP Act implications** for financial data (bonus, not required)

### 3.3 Action items (owner only — I cannot find CAs)

| # | Action | Owner | Deadline |
|---|---|---|---|
| 1 | List 3-5 CA candidates (referrals from peer construction firms) | Decorous owner | Week 0, day 3 |
| 2 | 30-min intro call with each — use criteria above as checklist | Decorous owner + tech lead | Week 0, day 7 |
| 3 | Finalize 1 primary CA + 1 backup | Decorous owner | Week 0, day 10 |
| 4 | Sign engagement letter (scope, fees, deliverables) | Decorous owner + CA | Week 0, day 14 |
| 5 | Kickoff COA design workshop (2 sessions of 3 hrs) | CA + tech lead | Week 1 |

**If step 1-4 take longer than 2 weeks, Phase 0 coding still begins** (scaffolding, auth, tenancy — Phase 1 work can proceed in parallel because it doesn't touch the ledger). **Phase 2 cannot start** until the CA is engaged.

### 3.4 Budget implication

CA engagement reserved: **₹1,50,000** (increased from ₹1L):
- ₹50,000 COA design workshop
- ₹50,000 100-test scenario pack authorship
- ₹50,000 sprint reviews + period-close sign-off through Phase 6

This is a **line-item increase** to the one-time cost in Doc 07.

---

## 4. STRATEGIC — BUDGET BANDS

Doc 07 listed a single ₹73 L estimate + a lean ₹45-50 L note. We formalize into three bands that map to different outcomes:

### 4.1 Band Table

| Band | Budget (6 mo) | Scope | Outcome | When to choose |
|---|---|---|---|---|
| **Lean MVP** | ₹35-50 L | Internal Decorous use only. Web-only. No field app. Basic ledger + bills. | Replaces Excel internally. Not sellable. | Budget is tight; want to prove value internally first. |
| **Strong MVP** (recommended) | ₹60-80 L | Full MVP per Doc 07 (web + field app, ledger + material + DPR) **minus full offline sync**. Online-first with local drafts. | Internally used 90 days → sellable to 5 pilot firms. | You want a sellable product within 6-7 months. |
| **Full SaaS-ready** | ₹1 Cr+ | Everything in Strong MVP + full offline sync + multi-tenant billing + SSO + public API. | True SaaS; onboarding 10+ customers. | You're committed to a construction-tech SaaS as a business. |

### 4.2 Recommendation

Start with **Strong MVP (₹60-80 L)** with strict discipline. This is the sweet spot:
- Enough rigor to ship something professional and sellable
- Not so ambitious that we build features Decorous won't use
- Leaves room in contingency for CA iterations and field-app learning

Upgrade to Full SaaS-ready only after internal use validates adoption (see §6).

---

## 5. STRATEGIC — BUS-FACTOR RISK UPGRADED

### 5.1 Change to Doc 08 §B5.1

**Was:**
- B5.1 Key developer leaves mid-project — L:3 × I:4 = 🟥 12

**Now:**
- B5.1 Key developer leaves mid-project — L:4 × I:4 = 🟥 **16**

### 5.2 Revised mitigation (additions bold)

- No solo-author modules; every critical path touched by ≥ 2 engineers
- Detailed Architecture Decision Records (ADRs) in `/app/erp/docs/adr/`
- Pair programming for ledger + sync code
- Quarterly knowledge-share sessions recorded
- **NEW: Ledger Playbook** — a mandatory living document explaining every DB trigger, every invariant, every reversal path, with worked examples. Authored by the lead during Phase 2. Required reading for every new engineer's first week.
- **NEW: Inline code comments** required on every file under `packages/ledger-core/` and `apps/api/src/modules/ledger/`. Linter rule enforces it.
- **NEW: Ledger module code review** requires ≥ 2 approvals, at least 1 from someone who has worked on it for ≥ 3 months.
- **NEW: Shadow-engineer rule** — no single engineer can be the only person who has shipped changes to the ledger module in any 6-week window.

### 5.3 Updated heatmap position

B5.1 moves from "🟨 plan mitigation" into the "🟥 immediate mitigation" quadrant on the heatmap.

---

## 6. STRATEGIC — 90-DAY INTERNAL-USE RULE (LAUNCH GATE)

### 6.1 The rule

> **No external customer — paid or free — onboards Decorous ERP until the Decorous in-house team has used it exclusively for 90 consecutive days in real production.**

"Exclusively" means:
- No parallel Excel tracking of the same data
- No parallel WhatsApp DPR reporting
- No manual petty-cash vouchers
- No email-based bill approval

If Decorous's own site engineers prefer WhatsApp over the app on day 45, the product has failed and we fix it before anyone else sees it.

### 6.2 Why this is a hard gate

- Self-dogfooding uncovers 10x more bugs than QA
- It forces UX honesty (we cannot ignore complaints from our own team)
- It builds a testimonial pipeline: "we run on it" is the strongest SaaS sell for construction
- It prevents reputation damage from a half-baked launch to peers

### 6.3 Metrics for "the 90 days worked"

All must be ≥ targets for **30 consecutive days** before external onboarding:

- ≥ 80% of active site supervisors submit DPR by 9 PM daily
- ≥ 95% of bills (by count) posted in the ERP (not WhatsApp/email)
- ≥ 100% of petty-cash > ₹2,000 captured in the app
- Crash-free sessions (mobile) ≥ 99%
- Zero unresolved P0 bugs
- Owner NPS of the system ≥ 8/10

### 6.4 Updated Phase 6 (GA)

Phase 6 previously = "Launch publicly." Amended:

- Phase 6.0 = **Internal GA** (Decorous-only, 90 days, metrics above)
- Phase 6.1 = **External pilot** (5 friendly contractors, free, 30 days)
- Phase 6.2 = **Paid SaaS** (only if Strong MVP band is upgraded to Full SaaS-ready)

---

## 7. REVISED PHASE 0 CHECKLIST

Before ANY code is written under `/app/erp/`:

- [ ] **Decision points (Doc 07 §9) answered** — repo strategy, hosting region, DNS ownership, budget band, pilot project
- [ ] **CA identified and engaged** (§3 of this doc)
- [ ] **COA design workshop scheduled** with CA
- [ ] **Cloudflare DNS** configured for `app.decorous.in` (pointer only)
- [ ] **Tech Lead hired** (or confirmed internal)
- [ ] **Repo created** (monorepo with Turborepo, recommend new Git org for isolation)
- [ ] **CI/CD pipeline** green on "hello world" commit
- [ ] **Staging infrastructure** provisioned (Postgres, Redis, S3)
- [ ] **Ledger governance design** (§1 of this doc) reviewed with CA before Phase 2

Phase 0 timebox: **2 weeks.** Anything longer indicates a planning problem, not an execution problem.

---

## 8. SUMMARY OF CONFLICTS WITH PRIOR DOCS

| Prior doc | What it said | Amendment |
|---|---|---|
| Doc 03 | Immutable entries + reversal | Add maker-checker + period lock + reason codes (§1) |
| Doc 06 | Full offline-first with outbox + event bus for MVP | Deferred to Phase 7; MVP is online-first with local drafts (§2) |
| Doc 07 Phase 0 | CA engagement listed as one line item | Upgraded to pre-Phase-0 blocker (§3) |
| Doc 07 §4 | Single ₹73 L budget | Three bands: Lean / Strong / Full (§4) |
| Doc 07 Phase 6 | "Launch publicly" | Split into 6.0 internal / 6.1 pilot / 6.2 SaaS (§6) |
| Doc 08 §B5.1 | Bus factor L:3 × I:4 = 12 | Upgraded to L:4 × I:4 = **16** (§5) |

---

## 9. WHAT IS STILL TRUE (not changed by this amendment)

- Stack choice: NestJS + Next.js + RN + PostgreSQL (Doc 08)
- MVP 3-pillar cut-line: Financial / Material / DPR (Doc 07)
- API design and REST-not-GraphQL (Doc 04)
- Database schema (Doc 02)
- Wireframes and UX principles (Doc 05) — unchanged, still correct
- Infrastructure isolation from marketing site (Doc 01) — sacred
- Security rules, DR, kill switches (Doc 08)

---

## 10. GREEN-LIGHT SIGN-OFF

This amendment represents the CTO's green-light for Phase 0, conditional on the three mandatory gates being closed:

- [ ] Ledger governance design reviewed (§1)
- [ ] Offline sync moved to Phase 7 (§2) — **this amendment closes this** ✅
- [ ] CA identified and engaged (§3)

Once §1 and §3 are satisfied, Phase 0 scaffolding can begin under `/app/erp/`.

---

**End of Doc 09 — CTO Review Amendments.**

**Decision now with the owner:**
1. Answer the 6 Doc 07 decision points
2. Start CA shortlist this week
3. Confirm Strong MVP budget band (₹60-80 L)
4. Then: green light to scaffold `/app/erp/`
