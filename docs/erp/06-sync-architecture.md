# Decorous Construction ERP — Offline Sync & Event Architecture

> ⚠️ **STATUS UPDATE (Feb 2026 CTO review):** The full offline-first implementation described in this document has been **deferred to Phase 7 (post-GA)**. MVP uses a simpler "online-first with local drafts + retry" model. See `09-cto-review-amendments.md` §2 for the revised MVP behaviour and rationale.  
> This document remains the reference design for the Phase 7 upgrade and should not be discarded.

## Why This Document Exists

Construction sites fail the "healthy internet" assumption that web apps are built on:

- **Bad 3G/4G** — tower saturation, concrete basements, remote plots
- **Multi-device** — one DPR may be edited by engineer + supervisor on different phones
- **Power failures** — device dies mid-upload
- **Tampering pressure** — someone "adjusts" a DPR at 11 PM to hide a mistake
- **Time skew** — field phones often have wrong system time

The sync architecture must handle all of this **without losing a single financial record**.

> **Golden rule:** The ledger must always be correct. Everything else (photos, notes, attendance) may be late — but the ledger **cannot be wrong**.

---

## 1. MENTAL MODEL — Three Data Tiers

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     DATA CLASSIFICATION                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  TIER A — FINANCIAL TRUTH  (strict, server-side authoritative)             │
│  ─────────────────────────                                                 │
│  • Journal entries / ledger                                                │
│  • Vendor bills (posted)                                                   │
│  • Payments & receipts                                                     │
│  • Approvals (>= ₹ threshold)                                              │
│                                                                            │
│  Behavior: Write to server OR queue + sign. Never auto-post from mobile.   │
│            Conflict: server always wins. Audit trail mandatory.            │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  TIER B — OPERATIONAL DATA  (sync merge, last-write-wins w/ field rules)   │
│  ───────────────────────                                                   │
│  • DPR narrative & labour counts                                           │
│  • Material receipts (qty + condition)                                     │
│  • Petty cash requests (pre-approval)                                      │
│  • Attendance                                                              │
│                                                                            │
│  Behavior: Offline-first. Queue + retry. Server resolves conflicts.        │
│            Tier B feeds Tier A via approved workflows.                     │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  TIER C — MEDIA & NOTES   (eventually consistent, huge payload)             │
│  ─────────────────────                                                     │
│  • Photos (site progress, bill scans)                                      │
│  • Voice notes                                                             │
│  • Documents (PDFs, drawings)                                              │
│                                                                            │
│  Behavior: Background upload, resumable, Wi-Fi preferred.                  │
│            Never blocks Tier A/B actions.                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Rule of thumb:** A file can be re-uploaded. A bill **cannot** be "re-posted."

---

## 2. OUTBOX PATTERN — CLIENT SIDE

The field app treats every user action as an **event**, written to a local outbox first.

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FIELD APP (React Native)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   User action (save DPR)                                   │
│         │                                                   │
│         ▼                                                   │
│   ┌──────────────────┐                                     │
│   │  UI / ViewModel  │ ←─ Optimistic update (show as done)│
│   └────────┬─────────┘                                     │
│            │                                                │
│            ▼                                                │
│   ┌──────────────────────────────┐                         │
│   │   Local SQLite (WatermelonDB) │                         │
│   │   + Event Outbox table        │                         │
│   └────────┬──────────────────────┘                         │
│            │                                                │
│            │   (triggers, transactional)                    │
│            ▼                                                │
│   ┌──────────────────┐       ┌──────────────────┐          │
│   │  Outbox Worker   │──────▶│  Sync Dispatcher │          │
│   │  (background)    │       │  (priority queue)│          │
│   └──────────────────┘       └────────┬─────────┘          │
│                                       │                     │
│                                       │ HTTP POST + JWT     │
│                                       │ signed + batched    │
│                                       ▼                     │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Server     │
                         │  /v1/sync    │
                         └──────────────┘
```

### 2.2 Event Envelope (what gets queued)

Every event the client sends looks like this:

```typescript
interface SyncEvent {
  event_id:       string;           // ULID, client-generated, idempotency key
  event_type:     string;           // "dpr.submitted", "material.received", ...
  aggregate_id:   string;           // e.g. project_id or bill_id
  payload:        object;           // the actual data
  actor: {
    user_id:      string;
    device_id:    string;
    signed_jwt:   string;           // proves identity offline
  };
  client_ts:      string;           // ISO-8601 — when user tapped
  queued_at:      string;           // when outbox stored it
  schema_version: number;           // for future migrations
  attempt_count:  number;
  priority:       "A" | "B" | "C";  // tier from §1
  geo?: {
    lat: number;
    lng: number;
    accuracy_m: number;
  };
}
```

**Why ULID instead of UUID:**
- Sortable by time → server debugging is trivial
- Collision-resistant across thousands of devices
- Still 128-bit

**Why `client_ts` AND `queued_at`:**
- `client_ts` = when the user claims the event happened (can be tampered)
- `queued_at` = device system clock at queue time (also not trusted)
- `server_received_ts` = assigned on arrival — **this is authoritative for audit**

---

## 3. DISPATCH STRATEGY

### 3.1 Priority Queue

Events are not sent FIFO. They're sent by tier:

```
 TIER A events  ──► sent immediately when online, batch size 1
 TIER B events  ──► batch up to 20, flush every 30s
 TIER C uploads ──► Wi-Fi preferred, chunked, resumable
```

Rationale: a ₹2 L payment request shouldn't wait behind 40 attendance records.

### 3.2 Retry with Jittered Exponential Back-off

```
 Attempt  Delay
 ─────────────────
 1        0s
 2        5s     (± 2s jitter)
 3        15s
 4        60s
 5        5 min
 6        30 min
 7        2 hr
 8+       6 hr   (persists across app restart)
```

After 10 failed attempts, event moves to **"Needs attention"** tab in sync screen. User must tap to resolve (edit or discard).

### 3.3 Network-aware Behavior

```typescript
if (connectionType === "wifi")        flush all queues immediately
else if (connectionType === "4g")     flush A + B (photos queued)
else if (connectionType === "3g")     flush A only, compress B
else if (connectionType === "2g")     flush A only, tiny payload mode
else                                  stay queued
```

Detected via `NetInfo` + effective bandwidth estimation. Photos are automatically deferred to Wi-Fi.

---

## 4. IDEMPOTENCY — THE HEART OF CORRECTNESS

> The same event must produce the same result whether received once, twice, or twenty times.

### 4.1 Server Contract

Every POST to `/v1/sync/events` must include:

```
POST /v1/sync/events
Idempotency-Key: 01HQZ8K9X3JV7MFAV21PFN3RC5    ← event_id from client
Authorization: Bearer <jwt>
Content-Type: application/json
```

Server flow:

```
1. Open transaction.
2. INSERT INTO event_log (event_id, ...) — UNIQUE constraint on event_id.
3. If constraint fails → event already processed → return 200 with cached response.
4. Otherwise:
     a. Validate schema (zod / joi).
     b. Execute handler for event_type.
     c. Write to ledger / projections / derived tables.
     d. Cache response body for future duplicates.
5. Commit.
6. Return 200/201.
```

**Key invariant:** a journal entry is NEVER written without a corresponding `event_log` row with the same ID.

### 4.2 Why Idempotency Beats "De-duplication"

- Device retries after partial failure → same event_id arrives again
- Two sync workers in parallel (race) → DB constraint enforces single-writer semantics
- User hits "resubmit" manually → still safe

No application-level "have we seen this?" checks. The database does it.

---

## 5. CONFLICT RESOLUTION POLICIES

### 5.1 Tier-Specific Rules

| Entity | Conflict Rule | Example |
|---|---|---|
| **Journal entry** | Server-only creation after approval. No conflict possible. | Accountant posts; field cannot overwrite |
| **DPR (narrative)** | Last-writer-wins by `server_received_ts` | Two supervisors edit same DPR — latest save wins, both versions kept in history |
| **DPR (labour count)** | Field = supervisor only; 2nd edit prompts merge UI | Engineer submits 18 workers; supervisor edits to 20 — both recorded, flagged for review |
| **Material receipt qty** | First writer wins, 2nd gets warning | Can't have two different "received" quantities for same PO line |
| **Petty cash request** | Immutable after server accept | Once queued, user edits create new request |
| **Photos / docs** | All versions kept, no overwrites | Never a conflict — just more data |
| **Attendance** | Merge by worker_id + date; latest wins | Multiple supervisors marking overlapping lists |

### 5.2 Field-Level Merge UI (for DPR-like entities)

When server detects a conflict, it returns:

```json
{
  "status": "conflict",
  "entity": "dpr",
  "id": "dpr_01HQ...",
  "base_version": 3,
  "your_changes":   { "activity": "slab cast", "labour": { "mason_skilled": 5 } },
  "server_state":   { "activity": "slab cast",  "labour": { "mason_skilled": 7 } },
  "conflicting_fields": ["labour.mason_skilled"]
}
```

Client opens a **diff screen**:

```
┌──────────────────────────────┐
│ Conflict detected            │
├──────────────────────────────┤
│ Labour → Mason skilled:      │
│                              │
│  Your entry:      5          │
│  On server:       7          │
│                              │
│  [ Use yours ] [ Use server ]│
│  [ Merge: ___  ]             │
└──────────────────────────────┘
```

**Default policy:** server wins if user ignores for 24h (automatic resolution with audit record).

---

## 6. EVENT BUS — SERVER SIDE

### 6.1 Why We Need One

The ERP has many side-effects:

- A bill is approved → ledger updated → project budget recalculated → notification sent → vendor balance refreshed → P&L cache invalidated

Wiring this with direct calls is a maintenance nightmare. Use an **outbox → bus → handlers** pattern.

### 6.2 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         NESTJS BACKEND                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   /v1/bills/:id/approve                                             │
│         │                                                            │
│         ▼                                                            │
│   ┌────────────────────────────┐                                    │
│   │  Command Handler           │                                    │
│   │  (transactional)           │                                    │
│   │                            │                                    │
│   │  1. Validate               │                                    │
│   │  2. Update bill state      │                                    │
│   │  3. Write journal entries  │  ◄── same DB tx                   │
│   │  4. Insert OUTBOX row:     │                                    │
│   │     "bill.approved"        │                                    │
│   │  5. COMMIT                 │                                    │
│   └──────────┬─────────────────┘                                    │
│              │                                                       │
│              ▼                                                       │
│   ┌─────────────────────────┐                                       │
│   │  Outbox Relay (worker)  │                                       │
│   │  (polls every 1s)       │                                       │
│   └──────────┬──────────────┘                                       │
│              │                                                       │
│              ▼                                                       │
│   ┌─────────────────────────┐                                       │
│   │  BullMQ / Redis Queue   │                                       │
│   └──────────┬──────────────┘                                       │
│              │                                                       │
│     ┌────────┼─────────┬──────────┬───────────┐                    │
│     ▼        ▼         ▼          ▼           ▼                    │
│   project  vendor   p&l       notifi     audit                     │
│   budget   balance  cache     cation     log                        │
│   handler  handler  invalidr  handler    handler                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Transactional outbox pattern:**
- Step 3 and 4 happen in the **same DB transaction** → either both happen or neither
- The relay worker picks up the outbox row **later** and publishes to the queue
- No double-writes, no lost events, no dual-commit problems

### 6.3 Core Events

```
Financial:
  bill.created
  bill.approved
  bill.paid
  payment.received
  ledger.entry.posted
  ledger.period.closed

Execution:
  project.created
  project.status.changed
  dpr.submitted
  material.received
  material.consumed
  labour.attendance.recorded

Governance:
  user.invited
  role.changed
  approval.requested
  approval.granted
  approval.rejected
```

Each event is versioned (`v1.bill.approved`) — future changes don't break old handlers.

---

## 7. CLOCK SKEW & TIME HONESTY

Field phones lie about time. Our rules:

1. **Client time is for display only** — never for financial ordering
2. Every event captures 3 timestamps: `client_ts`, `queued_at`, `server_received_ts`
3. For **Tier A** ordering (ledger date, payment date) → **server clock only**
4. For **Tier B** (DPR date) → client claim is accepted IF within ±12 hours of server time, else flagged
5. Field devices hit `/v1/time` on launch to compute drift; drift > 30 min → warn user

### Why this matters

A DPR with `client_ts = 2026-02-12` submitted on server at `2026-02-15` is suspicious — someone edited device clock or offline-padded the record. Our system catches this and marks it `time_drift_flagged=true` in audit.

---

## 8. PHOTO & FILE PIPELINE

### 8.1 Client Side

```
User taps camera
      │
      ▼
Capture at native resolution
      │
      ▼
Resize to 1920px longest edge (client-side, jpeg q=80)
      │
      ▼
Embed EXIF: GPS, device_id, user_id, app_version
      │
      ▼
Save to device storage + outbox row
      │
      ▼
Show in gallery immediately (local URI)
      │
      ▼
Background upload (Wi-Fi preferred, resumable, tus protocol)
      │
      ▼
On success: replace local URI with server URL, delete local cache after 7 days
```

### 8.2 Upload Protocol: tus

We use **tus.io resumable upload** because:
- Networks drop mid-upload routinely
- 5 MB photos on 2G = 90 s per upload — resume is essential
- Open standard, libraries exist for both RN and NestJS

### 8.3 De-duplication

Server computes **SHA-256** of each uploaded file. If hash matches an existing object:
- Skip upload, return existing URL
- Reduces storage costs for duplicate bill scans etc.

---

## 9. OFFLINE CAPABILITY MATRIX

| Action | Fully offline? | Queued? | Needs server? |
|---|---|---|---|
| View projects list | ✅ Yes (cached) | — | ❌ |
| View budget vs actual | ✅ Yes (last sync) | — | ❌ |
| Submit DPR | ✅ Yes | Yes, Tier B | On sync |
| Receive material | ✅ Yes | Yes, Tier B | On sync |
| Record petty cash | ✅ Yes | Yes, Tier B | On sync |
| Request expense approval | ✅ Yes | Yes, Tier B | Server approves |
| Mark attendance | ✅ Yes | Yes, Tier B | On sync |
| Capture photo | ✅ Yes | Yes, Tier C | Uploaded later |
| View ledger details | ⚠ Last 7 days cached | — | Deeper data online only |
| Post journal entry | ❌ No | — | **Online only** |
| Approve bill > ₹50K | ❌ No | — | **Online only + PIN** |
| Close month books | ❌ No | — | **Online only** |

**Core principle:** Field work is **always** possible offline. Financial authority is **always** online.

---

## 10. SECURITY UNDER SYNC

### 10.1 Signed Payloads

Each outbox event is signed with user's JWT **before** storage. So even if device is stolen and SQLite dumped, events can't be forged because the server re-verifies:

- JWT signature (backend secret)
- `user_id` matches JWT claim
- `device_id` matches user's registered devices
- `event_type` allowed for user's role

### 10.2 Rate Limiting

Per device:
- Tier A: 10/min
- Tier B: 100/min
- Tier C: 20/min
- Total: 200/min

Anything above → 429, client backs off. Prevents malicious / broken clients from flooding.

### 10.3 Device Enrollment

Each device gets a long-lived **device token** tied to user+device fingerprint. Admin can revoke from web panel:

```
Settings → Devices
  Rajesh (iPhone 13 — last seen 12 min ago)   [ Revoke ]
  Rajesh (Android tablet — last seen 2h ago)  [ Revoke ]
```

Revoked device gets 401 on next sync → wipes local cache, logs out.

---

## 11. OBSERVABILITY

### 11.1 Event Tracking

Every sync event logs:

- `event_id`, `event_type`, `user_id`, `device_id`
- `client_ts`, `queued_at`, `server_received_ts`, `processed_at`
- `attempt_count`, `final_status`, `error_message`
- `payload_size_bytes`
- `network_type` (wifi/4g/3g)

Stored in `sync_audit` table (partitioned by day, retained 1 year).

### 11.2 Dashboards (Grafana / Metabase)

Key metrics on a single page:

- **Event backlog per device** (p50, p95, p99) — above 5 min p95 = investigate
- **Failed events rate** — above 0.5% = alert
- **Time drift histogram** — identifies misconfigured devices
- **Conflict rate per entity** — if DPR conflicts > 2% = UX problem

### 11.3 Alerts

- 🟥 Event stuck > 1 hour for any user → page on-call
- 🟨 Conflict rate spike → Slack to product team
- 🟩 All clear if p99 sync latency < 10 min on 4G

---

## 12. TESTING STRATEGY

### 12.1 Chaos Tests (must pass before GA)

```
 Test                                             Expected result
 ─────────────────────────────────────────────   ───────────────────
 Submit 50 DPRs offline → go online              All arrive, 0 duplicates
 Kill app mid-upload 10 times                    Resumed on next open
 Two devices same DPR, offline, sync later       Conflict screen appears
 Device clock set to 2027 offline                Server flags time drift
 Post same event_id 5 times                      Exactly 1 DB row
 Approve bill from 2 accountants in parallel     2nd gets 409 conflict
 50 MB photo upload on 2G                        Completes or resumes
 Airplane mode toggle 20 times in 1 min          No data loss, no crash
 JWT expires mid-sync                            Silent refresh, retries
 Revoke device during active sync                401, local wipe, re-login
```

### 12.2 Synthetic Device Lab

Weekly automated runs with:
- Android 7, 10, 14 (low-end + flagship)
- iOS 15, 17
- Network shaping: 2G, 3G, 4G, flaky (10% packet loss)

Any regression = release blocker.

---

## 13. ROLLOUT PLAN (specific to sync)

| Phase | What | Gate |
|---|---|---|
| Pilot (internal) | 3 devices, 1 project, staff only | 0 data loss over 30 days |
| Beta | 10 devices, 3 projects, picked engineers | < 1% conflict rate, p95 sync < 2 min |
| GA | Full roll-out | Chaos suite green + observability dashboards live |

---

## 14. OPEN QUESTIONS (deferred to Phase 2)

- **Peer-to-peer LAN sync** — useful when site has local Wi-Fi but no internet. Not in MVP.
- **End-to-end encryption of payloads** — TLS is enough for MVP. E2E needed if we ever host tenant keys.
- **Replica database for read-heavy reports** — when query latency > 2s on P&L.
- **CRDT-based DPR editing** — if multi-user real-time editing becomes a customer demand.

---

## 15. DECISION LOG

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Local DB | WatermelonDB (SQLite) | Realm, Pouch | Best React Native perf + schema migrations |
| Upload protocol | tus | S3 multipart | Works offline, open standard, RN support |
| Queue | BullMQ + Redis | RabbitMQ, Kafka | Simpler, enough for <1M events/day |
| Event store | Transactional outbox in Postgres | Event-sourced from day 1 | YAGNI for MVP; outbox upgrades cleanly later |
| Conflict UX | Manual merge for DPRs | Auto-merge only | Construction data has real semantic conflicts |
| Clock trust | Server-authoritative | Allow client timestamps | One fake DPR destroys audit credibility |

---

**End of Doc 06 — Sync Architecture**

Next doc: `07-roadmap-and-costs.md` — phased delivery, team, timeline, and ruthless MVP scope.
