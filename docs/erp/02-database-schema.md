# Decorous ERP - Database Schema Design

## Design Principles

1. **Strict Referential Integrity** - Foreign keys everywhere
2. **Audit Everything** - Every table has created_at, updated_at, created_by
3. **Soft Deletes** - No hard deletes for financial data
4. **UUID Primary Keys** - For distributed systems compatibility
5. **Indexed for Performance** - Strategic indexes on query patterns

---

## 1. CORE ENTITY RELATIONSHIP DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CORE ERD - DECOROUS ERP                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐                │
│  │ Organization │────────<│    User      │>────────│    Role      │                │
│  │              │ 1     n │              │ n     1 │              │                │
│  └──────────────┘         └──────────────┘         └──────────────┘                │
│         │                        │                                                  │
│         │ 1                      │ n                                                │
│         │                        │                                                  │
│         ▼                        ▼                                                  │
│  ┌──────────────┐         ┌──────────────┐                                         │
│  │   Project    │<────────│ ProjectUser  │                                         │
│  │              │ 1     n │ (Assignment) │                                         │
│  └──────────────┘         └──────────────┘                                         │
│         │                                                                           │
│    ┌────┴────┬────────────┬────────────┬────────────┐                              │
│    │         │            │            │            │                              │
│    ▼         ▼            ▼            ▼            ▼                              │
│ ┌──────┐ ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐                             │
│ │ Task │ │ DPR  │    │ GRN  │    │Expense│    │Invoice│                            │
│ └──────┘ └──────┘    └──────┘    └──────┘    └──────┘                             │
│    │         │            │            │            │                              │
│    │         │            │            │            │                              │
│    │         │            ▼            │            │                              │
│    │         │       ┌──────────┐      │            │                              │
│    │         │       │Stock     │      │            │                              │
│    │         │       │Ledger    │      │            │                              │
│    │         │       └──────────┘      │            │                              │
│    │         │                         │            │                              │
│    └─────────┴─────────────┬───────────┴────────────┘                              │
│                            │                                                        │
│                            ▼                                                        │
│                   ┌─────────────────┐                                              │
│                   │  LEDGER SYSTEM  │                                              │
│                   │  (Double-Entry) │                                              │
│                   └─────────────────┘                                              │
│                            │                                                        │
│              ┌─────────────┼─────────────┐                                         │
│              ▼             ▼             ▼                                         │
│         ┌────────┐   ┌────────┐   ┌────────┐                                       │
│         │Account │   │Journal │   │Ledger  │                                       │
│         │        │   │Entry   │   │Entry   │                                       │
│         └────────┘   └────────┘   └────────┘                                       │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DETAILED TABLE SCHEMAS

### 2.1 Organization & User Management

```sql
-- ============================================
-- ORGANIZATION (Multi-tenant root)
-- ============================================
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    gstin           VARCHAR(15),
    pan             VARCHAR(10),
    address         JSONB,
    logo_url        VARCHAR(500),
    settings        JSONB DEFAULT '{}',
    subscription    VARCHAR(50) DEFAULT 'free',
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_org_slug ON organizations(slug);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    avatar_url      VARCHAR(500),
    
    role            VARCHAR(50) NOT NULL DEFAULT 'viewer',
    permissions     JSONB DEFAULT '[]',
    
    is_active       BOOLEAN DEFAULT true,
    last_login_at   TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    UNIQUE(org_id, email)
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    permissions     JSONB NOT NULL DEFAULT '[]',
    is_system       BOOLEAN DEFAULT false,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(org_id, name)
);

-- Permission examples in JSONB:
-- ["project.read", "project.create", "financial.read", "dpr.create"]
```

### 2.2 Project Management

```sql
-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    
    client_id       UUID REFERENCES clients(id),
    
    -- Location
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    geo_location    POINT,
    
    -- Timeline
    start_date      DATE,
    expected_end    DATE,
    actual_end      DATE,
    
    -- Budget
    estimated_cost  DECIMAL(15,2),
    contract_value  DECIMAL(15,2),
    
    -- Status
    status          VARCHAR(50) DEFAULT 'planning',
    progress_pct    DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    settings        JSONB DEFAULT '{}',
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    deleted_at      TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(org_id, code)
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client ON projects(client_id);

-- ============================================
-- PROJECT USER ASSIGNMENTS
-- ============================================
CREATE TABLE project_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    role            VARCHAR(50) NOT NULL, -- project_manager, site_engineer, etc.
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by     UUID REFERENCES users(id),
    
    is_active       BOOLEAN DEFAULT true,
    
    UNIQUE(project_id, user_id)
);

-- ============================================
-- TASKS / WORK ITEMS
-- ============================================
CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    parent_id       UUID REFERENCES tasks(id),
    
    code            VARCHAR(50),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    
    -- WBS / BOQ Reference
    boq_item_id     UUID REFERENCES boq_items(id),
    
    -- Timeline
    planned_start   DATE,
    planned_end     DATE,
    actual_start    DATE,
    actual_end      DATE,
    
    -- Progress
    progress_pct    DECIMAL(5,2) DEFAULT 0,
    
    -- Budget
    estimated_cost  DECIMAL(15,2),
    actual_cost     DECIMAL(15,2) DEFAULT 0,
    
    -- Dependencies
    dependencies    UUID[] DEFAULT '{}',
    
    -- Assignment
    assigned_to     UUID REFERENCES users(id),
    
    status          VARCHAR(50) DEFAULT 'pending',
    priority        INTEGER DEFAULT 2,
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

-- ============================================
-- BOQ (Bill of Quantities)
-- ============================================
CREATE TABLE boq_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    
    code            VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    
    quantity        DECIMAL(15,3) NOT NULL,
    rate            DECIMAL(15,2) NOT NULL,
    amount          DECIMAL(15,2) GENERATED ALWAYS AS (quantity * rate) STORED,
    
    category        VARCHAR(100),
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_boq_project ON boq_items(project_id);
```

### 2.3 Daily Progress Report (DPR)

```sql
-- ============================================
-- DAILY PROGRESS REPORTS
-- ============================================
CREATE TABLE daily_progress_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    
    report_date     DATE NOT NULL,
    submitted_by    UUID NOT NULL REFERENCES users(id),
    
    -- Weather
    weather         VARCHAR(50),
    weather_impact  TEXT,
    
    -- Summary
    work_summary    TEXT,
    issues          TEXT,
    next_day_plan   TEXT,
    
    -- Counts
    labor_count     INTEGER DEFAULT 0,
    
    -- Status
    status          VARCHAR(50) DEFAULT 'draft',
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, report_date)
);

CREATE INDEX idx_dpr_project_date ON daily_progress_reports(project_id, report_date);

-- ============================================
-- DPR WORK ENTRIES (Task-level progress)
-- ============================================
CREATE TABLE dpr_work_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_id          UUID NOT NULL REFERENCES daily_progress_reports(id),
    task_id         UUID REFERENCES tasks(id),
    
    description     TEXT NOT NULL,
    quantity_done   DECIMAL(15,3),
    unit            VARCHAR(20),
    progress_pct    DECIMAL(5,2),
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DPR LABOR ENTRIES
-- ============================================
CREATE TABLE dpr_labor_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_id          UUID NOT NULL REFERENCES daily_progress_reports(id),
    
    labor_type      VARCHAR(100) NOT NULL, -- mason, helper, carpenter, etc.
    count           INTEGER NOT NULL,
    rate            DECIMAL(10,2),
    amount          DECIMAL(15,2),
    
    contractor_id   UUID REFERENCES vendors(id),
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DPR MATERIAL USAGE
-- ============================================
CREATE TABLE dpr_material_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_id          UUID NOT NULL REFERENCES daily_progress_reports(id),
    material_id     UUID NOT NULL REFERENCES materials(id),
    
    quantity_used   DECIMAL(15,3) NOT NULL,
    unit            VARCHAR(20),
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DPR IMAGES
-- ============================================
CREATE TABLE dpr_images (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_id          UUID NOT NULL REFERENCES daily_progress_reports(id),
    
    image_url       VARCHAR(500) NOT NULL,
    thumbnail_url   VARCHAR(500),
    caption         TEXT,
    
    -- Geo tag (optional)
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    captured_at     TIMESTAMP WITH TIME ZONE,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dpr_images ON dpr_images(dpr_id);
```

### 2.4 Material Management

```sql
-- ============================================
-- MATERIALS MASTER
-- ============================================
CREATE TABLE materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    
    category        VARCHAR(100),
    unit            VARCHAR(20) NOT NULL,
    
    hsn_code        VARCHAR(20),
    gst_rate        DECIMAL(5,2) DEFAULT 18.00,
    
    -- Reorder
    min_stock_level DECIMAL(15,3),
    reorder_qty     DECIMAL(15,3),
    
    is_active       BOOLEAN DEFAULT true,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(org_id, code)
);

CREATE INDEX idx_materials_org ON materials(org_id);

-- ============================================
-- GOODS RECEIPT NOTE (GRN)
-- ============================================
CREATE TABLE grn (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    
    grn_number      VARCHAR(50) NOT NULL,
    grn_date        DATE NOT NULL,
    
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    po_number       VARCHAR(100),
    
    -- Delivery
    delivery_note   VARCHAR(100),
    vehicle_number  VARCHAR(50),
    
    -- Totals
    subtotal        DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    status          VARCHAR(50) DEFAULT 'draft',
    notes           TEXT,
    
    -- Approval
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    UNIQUE(org_id, grn_number)
);

CREATE INDEX idx_grn_project ON grn(project_id);
CREATE INDEX idx_grn_vendor ON grn(vendor_id);
CREATE INDEX idx_grn_date ON grn(grn_date);

-- ============================================
-- GRN LINE ITEMS
-- ============================================
CREATE TABLE grn_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id          UUID NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
    material_id     UUID NOT NULL REFERENCES materials(id),
    
    quantity        DECIMAL(15,3) NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    rate            DECIMAL(15,2) NOT NULL,
    
    amount          DECIMAL(15,2) GENERATED ALWAYS AS (quantity * rate) STORED,
    tax_rate        DECIMAL(5,2) DEFAULT 18.00,
    tax_amount      DECIMAL(15,2),
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STOCK LEDGER (Movement log - never delete)
-- ============================================
CREATE TABLE stock_ledger (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    material_id     UUID NOT NULL REFERENCES materials(id),
    
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Movement type
    movement_type   VARCHAR(20) NOT NULL, -- IN, OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
    
    -- Quantity
    quantity        DECIMAL(15,3) NOT NULL, -- positive for IN, negative for OUT
    unit            VARCHAR(20) NOT NULL,
    rate            DECIMAL(15,2),
    
    -- Running balance (denormalized for performance)
    balance_qty     DECIMAL(15,3) NOT NULL,
    
    -- Reference
    reference_type  VARCHAR(50), -- grn, issue, dpr, transfer, adjustment
    reference_id    UUID,
    
    notes           TEXT,
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_stock_ledger_material ON stock_ledger(material_id);
CREATE INDEX idx_stock_ledger_project ON stock_ledger(project_id);
CREATE INDEX idx_stock_ledger_date ON stock_ledger(transaction_date);

-- ============================================
-- MATERIAL ISSUE (Issue to site/consumption)
-- ============================================
CREATE TABLE material_issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    
    issue_number    VARCHAR(50) NOT NULL,
    issue_date      DATE NOT NULL,
    
    issued_to       VARCHAR(255), -- Contractor name or purpose
    task_id         UUID REFERENCES tasks(id),
    
    notes           TEXT,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    UNIQUE(org_id, issue_number)
);

CREATE TABLE material_issue_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id        UUID NOT NULL REFERENCES material_issues(id) ON DELETE CASCADE,
    material_id     UUID NOT NULL REFERENCES materials(id),
    
    quantity        DECIMAL(15,3) NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INTER-SITE TRANSFER
-- ============================================
CREATE TABLE material_transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    transfer_number VARCHAR(50) NOT NULL,
    transfer_date   DATE NOT NULL,
    
    from_project_id UUID NOT NULL REFERENCES projects(id),
    to_project_id   UUID NOT NULL REFERENCES projects(id),
    
    status          VARCHAR(50) DEFAULT 'pending', -- pending, in_transit, received
    
    notes           TEXT,
    
    -- Dispatch
    dispatched_by   UUID REFERENCES users(id),
    dispatched_at   TIMESTAMP WITH TIME ZONE,
    
    -- Receipt
    received_by     UUID REFERENCES users(id),
    received_at     TIMESTAMP WITH TIME ZONE,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    UNIQUE(org_id, transfer_number)
);

CREATE TABLE material_transfer_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id     UUID NOT NULL REFERENCES material_transfers(id) ON DELETE CASCADE,
    material_id     UUID NOT NULL REFERENCES materials(id),
    
    quantity        DECIMAL(15,3) NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    
    received_qty    DECIMAL(15,3), -- Actual received (may differ)
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.5 Vendor & Client Management

```sql
-- ============================================
-- VENDORS (Suppliers, Contractors)
-- ============================================
CREATE TABLE vendors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    code            VARCHAR(50),
    name            VARCHAR(255) NOT NULL,
    
    type            VARCHAR(50) NOT NULL, -- supplier, contractor, both
    
    -- Contact
    contact_person  VARCHAR(255),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    
    -- Tax
    gstin           VARCHAR(15),
    pan             VARCHAR(10),
    
    -- Banking
    bank_name       VARCHAR(255),
    bank_account    VARCHAR(50),
    ifsc_code       VARCHAR(20),
    
    -- Credit
    credit_limit    DECIMAL(15,2),
    credit_days     INTEGER DEFAULT 30,
    
    is_active       BOOLEAN DEFAULT true,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendors_org ON vendors(org_id);

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    code            VARCHAR(50),
    name            VARCHAR(255) NOT NULL,
    
    -- Contact
    contact_person  VARCHAR(255),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    
    -- Tax
    gstin           VARCHAR(15),
    pan             VARCHAR(10),
    
    is_active       BOOLEAN DEFAULT true,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clients_org ON clients(org_id);
```

---

## Next Document: Financial Ledger System Design →
