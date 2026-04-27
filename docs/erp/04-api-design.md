# Decorous ERP - API Design & Endpoints

## API Design Principles

1. **RESTful** - Resource-based URLs
2. **Versioned** - `/api/v1/` prefix
3. **Consistent Response Format** - Standard envelope
4. **Proper HTTP Status Codes**
5. **Pagination** - Cursor-based for large datasets
6. **Rate Limited** - Prevent abuse

---

## 1. RESPONSE ENVELOPE

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "hasNext": true,
      "nextCursor": "abc123"
    }
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "amount", "message": "Amount must be positive" }
    ]
  }
}
```

---

## 2. AUTHENTICATION ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION MODULE                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ POST   /api/v1/auth/register              Register new organization         │
│ POST   /api/v1/auth/login                 Login with email/password         │
│ POST   /api/v1/auth/refresh               Refresh access token              │
│ POST   /api/v1/auth/logout                Logout (invalidate refresh)       │
│ POST   /api/v1/auth/forgot-password       Request password reset            │
│ POST   /api/v1/auth/reset-password        Reset password with token         │
│ GET    /api/v1/auth/me                    Get current user profile          │
│ PATCH  /api/v1/auth/me                    Update current user profile       │
│ POST   /api/v1/auth/change-password       Change password                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request/Response Examples

```typescript
// POST /api/v1/auth/login
// Request
{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "organization": {
        "id": "org_uuid",
        "name": "ABC Builders",
        "slug": "abc-builders"
      }
    },
    "tokens": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG...",
      "expiresIn": 900
    }
  }
}
```

---

## 3. PROJECT MANAGEMENT ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PROJECTS MODULE                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ GET    /api/v1/projects                   List all projects                 │
│ POST   /api/v1/projects                   Create new project                │
│ GET    /api/v1/projects/:id               Get project details               │
│ PATCH  /api/v1/projects/:id               Update project                    │
│ DELETE /api/v1/projects/:id               Archive project                   │
│                                                                              │
│ GET    /api/v1/projects/:id/dashboard     Project dashboard stats           │
│ GET    /api/v1/projects/:id/timeline      Project timeline/Gantt data       │
│ GET    /api/v1/projects/:id/cost-summary  Cost analysis                     │
│                                                                              │
│ -- Tasks --                                                                  │
│ GET    /api/v1/projects/:id/tasks         List project tasks                │
│ POST   /api/v1/projects/:id/tasks         Create task                       │
│ PATCH  /api/v1/projects/:id/tasks/:taskId Update task                       │
│ DELETE /api/v1/projects/:id/tasks/:taskId Delete task                       │
│                                                                              │
│ -- BOQ --                                                                    │
│ GET    /api/v1/projects/:id/boq           Get BOQ items                     │
│ POST   /api/v1/projects/:id/boq           Add BOQ item                      │
│ POST   /api/v1/projects/:id/boq/import    Import BOQ from Excel             │
│ PATCH  /api/v1/projects/:id/boq/:itemId   Update BOQ item                   │
│                                                                              │
│ -- Team --                                                                   │
│ GET    /api/v1/projects/:id/team          Get project team                  │
│ POST   /api/v1/projects/:id/team          Assign user to project            │
│ DELETE /api/v1/projects/:id/team/:userId  Remove user from project          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request/Response Examples

```typescript
// POST /api/v1/projects
// Request
{
  "code": "PRJ-2024-001",
  "name": "Luxury Villa - Patia",
  "clientId": "client_uuid",
  "address": "Plot 123, Patia, Bhubaneswar",
  "city": "Bhubaneswar",
  "state": "Odisha",
  "startDate": "2024-04-01",
  "expectedEnd": "2025-03-31",
  "estimatedCost": 15000000,
  "contractValue": 18000000
}

// Response
{
  "success": true,
  "data": {
    "id": "proj_uuid",
    "code": "PRJ-2024-001",
    "name": "Luxury Villa - Patia",
    "status": "planning",
    "progressPct": 0,
    ...
  }
}

// GET /api/v1/projects/:id/dashboard
// Response
{
  "success": true,
  "data": {
    "project": { ... },
    "progress": {
      "overall": 45.5,
      "byMilestone": [
        { "name": "Foundation", "progress": 100 },
        { "name": "Structure", "progress": 80 },
        { "name": "Finishing", "progress": 10 }
      ]
    },
    "budget": {
      "estimated": 15000000,
      "spent": 7500000,
      "committed": 2000000,
      "remaining": 5500000,
      "variance": -500000,
      "variancePct": -3.33
    },
    "timeline": {
      "startDate": "2024-04-01",
      "expectedEnd": "2025-03-31",
      "projectedEnd": "2025-04-15",
      "daysRemaining": 280,
      "isDelayed": true,
      "delayDays": 15
    },
    "recentActivity": [ ... ]
  }
}
```

---

## 4. DAILY PROGRESS REPORT (DPR) ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DPR MODULE                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ GET    /api/v1/projects/:id/dpr           List DPRs for project             │
│ POST   /api/v1/projects/:id/dpr           Create new DPR                    │
│ GET    /api/v1/projects/:id/dpr/:date     Get DPR by date                   │
│ PATCH  /api/v1/projects/:id/dpr/:dprId    Update DPR                        │
│ POST   /api/v1/projects/:id/dpr/:dprId/submit    Submit for approval        │
│ POST   /api/v1/projects/:id/dpr/:dprId/approve   Approve DPR                │
│                                                                              │
│ -- DPR Entries --                                                            │
│ POST   /api/v1/dpr/:dprId/work            Add work entry                    │
│ POST   /api/v1/dpr/:dprId/labor           Add labor entry                   │
│ POST   /api/v1/dpr/:dprId/material        Add material usage                │
│ POST   /api/v1/dpr/:dprId/images          Upload images                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request/Response Examples

```typescript
// POST /api/v1/projects/:id/dpr
// Request
{
  "reportDate": "2024-03-15",
  "weather": "clear",
  "workSummary": "Completed RCC work for second floor slab",
  "issues": "Minor delay due to material delivery",
  "nextDayPlan": "Start brickwork on second floor",
  "workEntries": [
    {
      "taskId": "task_uuid",
      "description": "RCC slab casting",
      "quantityDone": 150,
      "unit": "sqft",
      "progressPct": 100
    }
  ],
  "laborEntries": [
    { "laborType": "mason", "count": 8, "rate": 800 },
    { "laborType": "helper", "count": 12, "rate": 500 }
  ],
  "materialEntries": [
    { "materialId": "mat_uuid", "quantityUsed": 50, "unit": "bags" }
  ]
}

// Response
{
  "success": true,
  "data": {
    "id": "dpr_uuid",
    "reportDate": "2024-03-15",
    "status": "draft",
    "summary": {
      "totalLabor": 20,
      "totalLaborCost": 12400,
      "materialsUsed": 1,
      "workEntriesCount": 1
    },
    ...
  }
}
```

---

## 5. MATERIAL MANAGEMENT ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MATERIAL MODULE                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ -- Materials Master --                                                       │
│ GET    /api/v1/materials                  List all materials                │
│ POST   /api/v1/materials                  Create material                   │
│ GET    /api/v1/materials/:id              Get material details              │
│ PATCH  /api/v1/materials/:id              Update material                   │
│                                                                              │
│ -- GRN (Goods Receipt) --                                                    │
│ GET    /api/v1/projects/:id/grn           List GRNs for project             │
│ POST   /api/v1/projects/:id/grn           Create GRN                        │
│ GET    /api/v1/grn/:grnId                 Get GRN details                   │
│ PATCH  /api/v1/grn/:grnId                 Update GRN (if draft)             │
│ POST   /api/v1/grn/:grnId/approve         Approve GRN → update stock        │
│                                                                              │
│ -- Material Issue --                                                         │
│ GET    /api/v1/projects/:id/issues        List material issues              │
│ POST   /api/v1/projects/:id/issues        Create material issue             │
│ GET    /api/v1/issues/:issueId            Get issue details                 │
│                                                                              │
│ -- Stock --                                                                  │
│ GET    /api/v1/projects/:id/stock         Get current stock                 │
│ GET    /api/v1/projects/:id/stock-ledger  Get stock movement history        │
│ GET    /api/v1/stock/alerts               Get low stock alerts              │
│                                                                              │
│ -- Transfer --                                                               │
│ GET    /api/v1/transfers                  List all transfers                │
│ POST   /api/v1/transfers                  Create transfer request           │
│ POST   /api/v1/transfers/:id/dispatch     Mark as dispatched                │
│ POST   /api/v1/transfers/:id/receive      Receive transfer                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request/Response Examples

```typescript
// POST /api/v1/projects/:id/grn
// Request
{
  "grnDate": "2024-03-15",
  "vendorId": "vendor_uuid",
  "poNumber": "PO-2024-0123",
  "deliveryNote": "DN-5678",
  "vehicleNumber": "OD-02-AB-1234",
  "items": [
    {
      "materialId": "mat_cement_uuid",
      "quantity": 500,
      "unit": "bags",
      "rate": 380,
      "taxRate": 28
    },
    {
      "materialId": "mat_steel_uuid",
      "quantity": 5000,
      "unit": "kg",
      "rate": 65,
      "taxRate": 18
    }
  ],
  "notes": "Quality checked and approved"
}

// GET /api/v1/projects/:id/stock
// Response
{
  "success": true,
  "data": {
    "projectId": "proj_uuid",
    "projectName": "Luxury Villa - Patia",
    "asOf": "2024-03-15T10:30:00Z",
    "items": [
      {
        "materialId": "mat_uuid",
        "materialCode": "CEM-OPC-53",
        "materialName": "OPC Cement 53 Grade",
        "unit": "bags",
        "currentStock": 250,
        "minStockLevel": 100,
        "avgDailyUsage": 25,
        "daysOfStock": 10,
        "stockValue": 95000,
        "status": "adequate" // low, critical, adequate
      },
      ...
    ],
    "summary": {
      "totalItems": 45,
      "totalValue": 850000,
      "lowStockItems": 3,
      "criticalStockItems": 1
    }
  }
}
```

---

## 6. FINANCIAL ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FINANCIAL MODULE                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ -- Accounts --                                                               │
│ GET    /api/v1/accounts                   List chart of accounts            │
│ POST   /api/v1/accounts                   Create account                    │
│ PATCH  /api/v1/accounts/:id               Update account                    │
│ GET    /api/v1/accounts/:id/ledger        Get account ledger                │
│                                                                              │
│ -- Payment Receipts (Money In) --                                            │
│ GET    /api/v1/receipts                   List all receipts                 │
│ POST   /api/v1/receipts                   Create receipt                    │
│ GET    /api/v1/receipts/:id               Get receipt details               │
│ DELETE /api/v1/receipts/:id               Cancel receipt (creates reversal) │
│                                                                              │
│ -- Payment Vouchers (Money Out) --                                           │
│ GET    /api/v1/payments                   List all payments                 │
│ POST   /api/v1/payments                   Create payment                    │
│ GET    /api/v1/payments/:id               Get payment details               │
│ POST   /api/v1/payments/:id/approve       Approve payment                   │
│ DELETE /api/v1/payments/:id               Cancel payment                    │
│                                                                              │
│ -- Expenses --                                                               │
│ GET    /api/v1/projects/:id/expenses      List project expenses             │
│ POST   /api/v1/projects/:id/expenses      Create expense                    │
│ GET    /api/v1/expenses/:id               Get expense details               │
│ PATCH  /api/v1/expenses/:id               Update expense                    │
│ POST   /api/v1/expenses/:id/approve       Approve expense                   │
│                                                                              │
│ -- Journal Entries --                                                        │
│ GET    /api/v1/journals                   List journal entries              │
│ POST   /api/v1/journals                   Create manual journal             │
│ GET    /api/v1/journals/:id               Get journal details               │
│ POST   /api/v1/journals/:id/reverse       Reverse journal entry             │
│                                                                              │
│ -- Bank Reconciliation --                                                    │
│ GET    /api/v1/bank-accounts              List bank accounts                │
│ GET    /api/v1/bank-accounts/:id/statement  Get bank statement              │
│ POST   /api/v1/bank-accounts/:id/reconcile  Reconcile transactions          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request/Response Examples

```typescript
// POST /api/v1/receipts
// Request
{
  "receiptDate": "2024-03-15",
  "clientId": "client_uuid",
  "projectId": "proj_uuid",
  "amount": 500000,
  "paymentMode": "bank_transfer",
  "bankAccountId": "bank_uuid",
  "transactionRef": "NEFT-123456",
  "narration": "Advance payment for Phase 2",
  "allocations": [
    { "invoiceId": "inv_uuid", "amount": 300000 },
    { "type": "advance", "amount": 200000 }
  ]
}

// POST /api/v1/projects/:id/expenses
// Request (Mobile-friendly quick expense)
{
  "expenseDate": "2024-03-15",
  "category": "transportation",
  "vendorName": "Local Transport",
  "amount": 2500,
  "description": "Material transport from godown to site",
  "attachments": [
    { "type": "receipt", "url": "s3://bucket/receipts/xyz.jpg" }
  ]
}
```

---

## 7. BILLING ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BILLING MODULE                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ -- Invoices --                                                               │
│ GET    /api/v1/projects/:id/invoices      List project invoices             │
│ POST   /api/v1/projects/:id/invoices      Create invoice / running bill     │
│ GET    /api/v1/invoices/:id               Get invoice details               │
│ GET    /api/v1/invoices/:id/pdf           Generate PDF                      │
│ POST   /api/v1/invoices/:id/send          Send invoice to client            │
│                                                                              │
│ -- Running Bills --                                                          │
│ GET    /api/v1/projects/:id/running-bills List running bills                │
│ POST   /api/v1/projects/:id/running-bills Create running bill               │
│ GET    /api/v1/running-bills/:id          Get running bill details          │
│                                                                              │
│ -- Receivables --                                                            │
│ GET    /api/v1/receivables                List outstanding receivables      │
│ GET    /api/v1/receivables/aging          Aging analysis                    │
│                                                                              │
│ -- Payables --                                                               │
│ GET    /api/v1/payables                   List outstanding payables         │
│ GET    /api/v1/payables/aging             Aging analysis                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. REPORTS ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ REPORTS MODULE                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ -- Financial Reports --                                                      │
│ GET    /api/v1/reports/trial-balance      Trial balance                     │
│ GET    /api/v1/reports/profit-loss        P&L statement                     │
│ GET    /api/v1/reports/balance-sheet      Balance sheet                     │
│ GET    /api/v1/reports/cash-flow          Cash flow statement               │
│ GET    /api/v1/reports/day-book           Day book                          │
│                                                                              │
│ -- Project Reports --                                                        │
│ GET    /api/v1/reports/project-summary    All projects summary              │
│ GET    /api/v1/reports/project/:id/cost   Project cost report               │
│ GET    /api/v1/reports/project/:id/progress  Progress report                │
│ GET    /api/v1/reports/project/:id/variance  Budget variance                │
│                                                                              │
│ -- Material Reports --                                                       │
│ GET    /api/v1/reports/stock-summary      Stock summary all projects        │
│ GET    /api/v1/reports/material-consumption  Consumption analysis           │
│ GET    /api/v1/reports/grn-register       GRN register                      │
│                                                                              │
│ -- Analytics --                                                              │
│ GET    /api/v1/analytics/dashboard        Main dashboard data               │
│ GET    /api/v1/analytics/trends           Trend analysis                    │
│ GET    /api/v1/analytics/alerts           Active alerts                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. SYNC ENDPOINTS (Mobile Offline Support)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SYNC MODULE                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ POST   /api/v1/sync/pull                  Pull changes since last sync      │
│ POST   /api/v1/sync/push                  Push local changes                │
│ GET    /api/v1/sync/status                Get sync status                   │
│ POST   /api/v1/sync/resolve-conflict      Resolve sync conflict             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sync Protocol

```typescript
// POST /api/v1/sync/pull
// Request
{
  "lastSyncTimestamp": "2024-03-14T10:30:00Z",
  "projectIds": ["proj_1_uuid", "proj_2_uuid"],
  "entities": ["tasks", "materials", "dpr", "expenses"]
}

// Response
{
  "success": true,
  "data": {
    "serverTimestamp": "2024-03-15T10:30:00Z",
    "changes": {
      "tasks": {
        "created": [...],
        "updated": [...],
        "deleted": ["task_uuid_1"]
      },
      "materials": { ... },
      "dpr": { ... }
    },
    "conflicts": [
      {
        "entity": "dpr",
        "id": "dpr_uuid",
        "serverVersion": { ... },
        "clientVersion": { ... },
        "conflictType": "update_update"
      }
    ]
  }
}

// POST /api/v1/sync/push
// Request
{
  "clientTimestamp": "2024-03-15T10:25:00Z",
  "changes": {
    "dpr": {
      "create": [...],
      "update": [...]
    },
    "expenses": {
      "create": [...]
    }
  }
}
```

---

## 10. WEBHOOKS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEBHOOKS (Outgoing Events)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Events:                                                                      │
│ ├── project.created                                                          │
│ ├── project.updated                                                          │
│ ├── dpr.submitted                                                            │
│ ├── dpr.approved                                                             │
│ ├── expense.created                                                          │
│ ├── expense.approved                                                         │
│ ├── payment.received                                                         │
│ ├── payment.made                                                             │
│ ├── invoice.created                                                          │
│ ├── stock.low_alert                                                          │
│ └── budget.overrun_alert                                                     │
│                                                                              │
│ POST   /api/v1/webhooks                   Register webhook                  │
│ GET    /api/v1/webhooks                   List webhooks                     │
│ DELETE /api/v1/webhooks/:id               Delete webhook                    │
│ GET    /api/v1/webhooks/:id/logs          Get delivery logs                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Next Document: UI Wireframes & User Flows →
