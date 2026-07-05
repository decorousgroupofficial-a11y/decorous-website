# Decorous Construction ERP - System Architecture

## Executive Summary

**Product Name:** Decorous ERP  
**Domain:** app.decorous.in (isolated subdomain)  
**Type:** Construction Execution & Financial Management Platform  
**Architecture:** Multi-tenant SaaS-ready, Event-driven, Offline-first

---

## 1. INFRASTRUCTURE ISOLATION STRATEGY

### DNS-Level Separation (Zero Risk to Main Site)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE DNS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  www.decorous.in ──────► Existing Server (UNTOUCHED)           │
│       A Record            - Current website                     │
│                           - Current database                    │
│                           - Zero modifications                  │
│                                                                 │
│  app.decorous.in ──────► NEW Isolated Infrastructure           │
│       A Record            - Separate VPS/Cloud                  │
│                           - Separate PostgreSQL                 │
│                           - Separate Object Storage             │
│                           - Complete isolation                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Infrastructure Components (app.decorous.in)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION INFRASTRUCTURE                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│  │   Vercel    │    │ DigitalOcean│    │   AWS S3    │                    │
│  │  (Frontend) │    │  (Backend)  │    │  (Storage)  │                    │
│  │             │    │             │    │             │                    │
│  │ - Next.js   │    │ - NestJS    │    │ - Images    │                    │
│  │ - Admin     │    │ - API       │    │ - Documents │                    │
│  │ - Dashboard │    │ - Workers   │    │ - Backups   │                    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
│         │                  │                  │                            │
│         └────────┬─────────┴─────────┬───────┘                            │
│                  │                   │                                     │
│         ┌───────▼───────┐   ┌───────▼───────┐                             │
│         │  PostgreSQL   │   │    Redis      │                             │
│         │   (Primary)   │   │   (Cache)     │                             │
│         │               │   │               │                             │
│         │ - Core Data   │   │ - Sessions    │                             │
│         │ - Ledgers     │   │ - Queue       │                             │
│         │ - Audit Trail │   │ - Real-time   │                             │
│         └───────────────┘   └───────────────┘                             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. HIGH-LEVEL SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          DECOROUS ERP - SYSTEM ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           CLIENT LAYER                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │    │
│  │  │   Web App    │  │  Mobile App  │  │   PWA        │                   │    │
│  │  │   (Admin)    │  │ (Field Eng)  │  │  (Offline)   │                   │    │
│  │  │              │  │              │  │              │                   │    │
│  │  │  Next.js 14  │  │ React Native │  │  Next.js     │                   │    │
│  │  │  TypeScript  │  │ Expo         │  │  Workbox     │                   │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │    │
│  │         │                 │                 │                            │    │
│  └─────────┼─────────────────┼─────────────────┼────────────────────────────┘    │
│            │                 │                 │                                  │
│            └────────────────┬┴─────────────────┘                                  │
│                             │                                                     │
│                    ┌────────▼────────┐                                           │
│                    │   API Gateway   │                                           │
│                    │   (Kong/Nginx)  │                                           │
│                    │                 │                                           │
│                    │ - Rate Limiting │                                           │
│                    │ - Auth Check    │                                           │
│                    │ - Load Balance  │                                           │
│                    └────────┬────────┘                                           │
│                             │                                                     │
│  ┌──────────────────────────┼──────────────────────────────────────────────┐    │
│  │                    SERVICE LAYER                                         │    │
│  ├──────────────────────────┼──────────────────────────────────────────────┤    │
│  │                          │                                               │    │
│  │  ┌───────────────────────▼───────────────────────────────────────────┐  │    │
│  │  │                      NestJS API Server                             │  │    │
│  │  ├───────────────────────────────────────────────────────────────────┤  │    │
│  │  │                                                                    │  │    │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │  │    │
│  │  │  │   Auth      │ │  Financial  │ │  Material   │ │  Project    │  │  │    │
│  │  │  │   Module    │ │   Module    │ │   Module    │ │   Module    │  │  │    │
│  │  │  │             │ │             │ │             │ │             │  │  │    │
│  │  │  │ - JWT       │ │ - Ledger    │ │ - GRN       │ │ - Tasks     │  │  │    │
│  │  │  │ - RBAC      │ │ - Payments  │ │ - Stock     │ │ - DPR       │  │  │    │
│  │  │  │ - Sessions  │ │ - Invoices  │ │ - Transfer  │ │ - Progress  │  │  │    │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │  │    │
│  │  │                                                                    │  │    │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │  │    │
│  │  │  │  Billing    │ │  Analytics  │ │   Sync      │ │  Reporting  │  │  │    │
│  │  │  │   Module    │ │   Module    │ │   Module    │ │   Module    │  │  │    │
│  │  │  │             │ │             │ │             │ │             │  │  │    │
│  │  │  │ - Invoices  │ │ - Dashboard │ │ - Offline   │ │ - PDF Gen   │  │  │    │
│  │  │  │ - GST       │ │ - P&L       │ │ - Conflict  │ │ - Excel     │  │  │    │
│  │  │  │ - Receipts  │ │ - Alerts    │ │ - Queue     │ │ - Charts    │  │  │    │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │  │    │
│  │  │                                                                    │  │    │
│  │  └────────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                          │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER                                        │   │
│  ├──────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │   │
│  │  │   PostgreSQL    │  │     Redis       │  │   BullMQ        │           │   │
│  │  │                 │  │                 │  │                 │           │   │
│  │  │ - Core Tables   │  │ - Cache Layer   │  │ - Job Queues    │           │   │
│  │  │ - Ledger        │  │ - Sessions      │  │ - Email         │           │   │
│  │  │ - Audit Log     │  │ - Real-time     │  │ - Reports       │           │   │
│  │  │ - Transactions  │  │ - Pub/Sub       │  │ - Sync Jobs     │           │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘           │   │
│  │                                                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                                │   │
│  │  │   AWS S3        │  │   CloudWatch    │                                │   │
│  │  │                 │  │                 │                                │   │
│  │  │ - Documents     │  │ - Logs          │                                │   │
│  │  │ - Images        │  │ - Metrics       │                                │   │
│  │  │ - Backups       │  │ - Alerts        │                                │   │
│  │  └─────────────────┘  └─────────────────┘                                │   │
│  │                                                                           │   │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. EVENT-DRIVEN ARCHITECTURE

### Event Flow Design

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         EVENT-DRIVEN FLOW                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER ACTION           EVENT                    SIDE EFFECTS                │
│  ───────────           ─────                    ────────────                │
│                                                                             │
│  Material GRN    ──►   MaterialReceived   ──►   ✓ Update Stock Ledger      │
│  Entry                                          ✓ Update Project Cost       │
│                                                 ✓ Create Audit Entry        │
│                                                 ✓ Send Notification         │
│                                                                             │
│  Expense         ──►   ExpenseCreated     ──►   ✓ Create Ledger Entry      │
│  Entry                                          ✓ Update Cash/Bank Balance  │
│                                                 ✓ Update Project Cost       │
│                                                 ✓ Check Budget Alert        │
│                                                                             │
│  Payment         ──►   PaymentReceived    ──►   ✓ Create Ledger Entry      │
│  Received                                       ✓ Update Client Balance     │
│                                                 ✓ Reconcile Invoice         │
│                                                 ✓ Update Cash Flow          │
│                                                                             │
│  DPR             ──►   ProgressUpdated    ──►   ✓ Update Task Progress     │
│  Submitted                                      ✓ Recalculate % Complete   │
│                                                 ✓ Check Milestone           │
│                                                 ✓ Trigger Billing (if due)  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Event Bus Implementation

```typescript
// Event Types
enum DomainEvent {
  // Financial Events
  LEDGER_ENTRY_CREATED = 'financial.ledger.created',
  PAYMENT_RECEIVED = 'financial.payment.received',
  PAYMENT_MADE = 'financial.payment.made',
  INVOICE_GENERATED = 'financial.invoice.generated',
  
  // Material Events
  MATERIAL_RECEIVED = 'material.grn.created',
  MATERIAL_ISSUED = 'material.issue.created',
  MATERIAL_TRANSFERRED = 'material.transfer.created',
  STOCK_ALERT = 'material.stock.alert',
  
  // Project Events
  PROJECT_CREATED = 'project.created',
  TASK_UPDATED = 'project.task.updated',
  DPR_SUBMITTED = 'project.dpr.submitted',
  MILESTONE_REACHED = 'project.milestone.reached',
  
  // Billing Events
  RUNNING_BILL_GENERATED = 'billing.runningbill.generated',
  COLLECTION_RECEIVED = 'billing.collection.received'
}
```

---

## 4. SECURITY ARCHITECTURE

### Authentication & Authorization Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY ARCHITECTURE                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │  User   │────►│   Login     │────►│   JWT       │────►│   Access    │  │
│  │         │     │   Request   │     │   + Refresh │     │   Granted   │  │
│  └─────────┘     └─────────────┘     └─────────────┘     └─────────────┘  │
│                                                                             │
│  Token Structure:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                    │   │
│  │   "sub": "user_uuid",                                               │   │
│  │   "email": "user@company.com",                                      │   │
│  │   "org_id": "organization_uuid",                                    │   │
│  │   "role": "SITE_ENGINEER",                                          │   │
│  │   "permissions": ["project.read", "dpr.create", "expense.create"],  │   │
│  │   "projects": ["project_1_uuid", "project_2_uuid"],                 │   │
│  │   "exp": 1234567890                                                 │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RBAC Matrix:                                                               │
│  ┌──────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐   │
│  │ Permission       │ Owner   │ Admin   │ Manager │ Engineer│ Viewer  │   │
│  ├──────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤   │
│  │ Organization     │ CRUD    │ RU      │ R       │ R       │ R       │   │
│  │ Projects         │ CRUD    │ CRUD    │ CRUD    │ R       │ R       │   │
│  │ Financial Data   │ CRUD    │ CRUD    │ R       │ -       │ R       │   │
│  │ Material         │ CRUD    │ CRUD    │ CRUD    │ CRU     │ R       │   │
│  │ DPR              │ CRUD    │ CRUD    │ CRUD    │ CRU     │ R       │   │
│  │ Reports          │ CRUD    │ CRUD    │ R       │ R       │ R       │   │
│  │ Users            │ CRUD    │ CRUD    │ R       │ -       │ -       │   │
│  └──────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. OFFLINE-FIRST SYNC ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    OFFLINE-FIRST SYNC ARCHITECTURE                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MOBILE APP (Field)                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │   │
│  │  │   UI Layer   │───►│  Local DB    │───►│  Sync Queue  │           │   │
│  │  │              │    │  (SQLite/    │    │              │           │   │
│  │  │  - Forms     │    │   WatermelonDB)   │  - Pending   │           │   │
│  │  │  - Lists     │    │              │    │  - Failed    │           │   │
│  │  │  - Reports   │    │  - DPR       │    │  - Synced    │           │   │
│  │  └──────────────┘    │  - Expenses  │    └───────┬──────┘           │   │
│  │                      │  - Material  │            │                   │   │
│  │                      └──────────────┘            │                   │   │
│  │                                                  │                   │   │
│  └──────────────────────────────────────────────────┼───────────────────┘   │
│                                                     │                       │
│                                                     │ SYNC (when online)    │
│                                                     ▼                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         SYNC ENGINE                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  1. Check Connectivity                                               │   │
│  │  2. Get Pending Changes (client_updated_at > last_sync)             │   │
│  │  3. Send to Server                                                   │   │
│  │  4. Receive Server Changes                                           │   │
│  │  5. Conflict Resolution:                                             │   │
│  │     - Server Wins (for financial data)                               │   │
│  │     - Last Write Wins (for DPR)                                      │   │
│  │     - Manual Resolution (for conflicts)                              │   │
│  │  6. Update Local DB                                                  │   │
│  │  7. Mark as Synced                                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Conflict Resolution Strategy:                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Data Type          │ Strategy           │ Reason                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Financial Entries  │ Server Wins        │ Data integrity critical   │   │
│  │ DPR Reports        │ Last Write Wins    │ Latest info most relevant │   │
│  │ Material Stock     │ Server Wins        │ Prevent negative stock    │   │
│  │ Task Updates       │ Merge              │ Combine progress updates  │   │
│  │ Images/Documents   │ Keep Both          │ No data loss              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. TECH STACK JUSTIFICATION

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend (Admin)** | Next.js 14 + TypeScript | SSR for SEO, App Router for better DX, Type safety |
| **Frontend (Mobile)** | React Native + Expo | Cross-platform, offline capability, fast iteration |
| **Backend** | NestJS + TypeScript | Enterprise patterns (DI, Modules), TypeORM integration, Scalable |
| **Database** | PostgreSQL | ACID compliance critical for financial data, Strong relational integrity |
| **Cache** | Redis | Session management, Real-time updates, Queue backend |
| **Queue** | BullMQ | Reliable job processing, Retries, Delayed jobs |
| **Object Storage** | AWS S3 | Cost-effective, CDN integration, Lifecycle policies |
| **API Style** | REST + WebSocket | REST for CRUD, WebSocket for real-time updates |

---

## 7. DEPLOYMENT ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT TOPOLOGY                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Production Environment (app.decorous.in)                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Load Balancer (Nginx)                         │  │
│  │                         SSL Termination                               │  │
│  └────────────────────────────────┬─────────────────────────────────────┘  │
│                                   │                                         │
│           ┌───────────────────────┼───────────────────────┐                │
│           │                       │                       │                │
│           ▼                       ▼                       ▼                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   API Server 1  │    │   API Server 2  │    │   API Server 3  │        │
│  │   (NestJS)      │    │   (NestJS)      │    │   (NestJS)      │        │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘        │
│           │                      │                      │                  │
│           └──────────────────────┼──────────────────────┘                  │
│                                  │                                         │
│           ┌──────────────────────┼──────────────────────┐                  │
│           │                      │                      │                  │
│           ▼                      ▼                      ▼                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   PostgreSQL    │    │     Redis       │    │     S3          │        │
│  │   Primary       │    │   Cluster       │    │   Bucket        │        │
│  │   + Read Replica│    │                 │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  Worker Nodes:                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                                │
│  │  Queue Worker 1 │    │  Queue Worker 2 │                                │
│  │  - Reports      │    │  - Emails       │                                │
│  │  - Sync Jobs    │    │  - Notifications│                                │
│  └─────────────────┘    └─────────────────┘                                │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. MONITORING & OBSERVABILITY

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY STACK                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Metrics:     Prometheus + Grafana                                          │
│  Logging:     Winston + CloudWatch / Loki                                   │
│  Tracing:     OpenTelemetry                                                 │
│  Alerting:    PagerDuty / Slack Integration                                 │
│                                                                             │
│  Key Metrics to Track:                                                      │
│  ├── API Response Time (p50, p95, p99)                                     │
│  ├── Error Rate                                                             │
│  ├── Database Query Time                                                    │
│  ├── Queue Depth                                                            │
│  ├── Sync Success/Failure Rate                                              │
│  └── Active Users (Real-time)                                               │
│                                                                             │
│  Critical Alerts:                                                           │
│  ├── API Error Rate > 1%                                                    │
│  ├── Database Connection Pool Exhausted                                     │
│  ├── Queue Backlog > 1000 jobs                                              │
│  ├── Disk Usage > 80%                                                       │
│  └── Ledger Imbalance Detected                                              │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Next Document: Database Schema Design →
