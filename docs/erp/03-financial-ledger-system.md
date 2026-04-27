# Decorous ERP - Financial Ledger System Design

> ⚠️ **STATUS UPDATE (Feb 2026 CTO review):** This document defines the double-entry core. The governance layer (maker-checker approval workflow, period locking, reversal reason codes) is defined in `09-cto-review-amendments.md` §1 and is **mandatory** before any ledger code is written.

## Overview

This is the **CORE BACKBONE** of the entire system. Every financial transaction in the construction business flows through this ledger system.

**Key Principle:** Double-entry bookkeeping - every transaction has equal debits and credits.

---

## 1. CHART OF ACCOUNTS STRUCTURE

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      CHART OF ACCOUNTS HIERARCHY                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1000 - ASSETS                                                              │
│  ├── 1100 - Current Assets                                                  │
│  │   ├── 1110 - Cash                                                        │
│  │   │   ├── 1111 - Petty Cash - Site 1                                    │
│  │   │   ├── 1112 - Petty Cash - Site 2                                    │
│  │   │   └── 1119 - Cash in Hand                                           │
│  │   ├── 1120 - Bank Accounts                                               │
│  │   │   ├── 1121 - HDFC Current Account                                   │
│  │   │   ├── 1122 - ICICI Current Account                                  │
│  │   │   └── 1123 - SBI Savings Account                                    │
│  │   ├── 1130 - Accounts Receivable                                         │
│  │   │   ├── 1131 - Client: ABC Builders                                   │
│  │   │   ├── 1132 - Client: XYZ Developers                                 │
│  │   │   └── [Dynamic client accounts]                                     │
│  │   ├── 1140 - Inventory                                                   │
│  │   │   ├── 1141 - Raw Materials                                          │
│  │   │   └── 1142 - Consumables                                            │
│  │   └── 1150 - Advances                                                    │
│  │       ├── 1151 - Advance to Vendors                                     │
│  │       ├── 1152 - Advance to Contractors                                 │
│  │       └── 1153 - Advance to Employees                                   │
│  │                                                                          │
│  ├── 1200 - Fixed Assets                                                    │
│  │   ├── 1210 - Equipment                                                   │
│  │   ├── 1220 - Vehicles                                                    │
│  │   └── 1230 - Furniture & Fixtures                                        │
│  │                                                                          │
│  2000 - LIABILITIES                                                         │
│  ├── 2100 - Current Liabilities                                             │
│  │   ├── 2110 - Accounts Payable                                            │
│  │   │   ├── 2111 - Vendor: Steel Supplier                                 │
│  │   │   ├── 2112 - Vendor: Cement Dealer                                  │
│  │   │   └── [Dynamic vendor accounts]                                     │
│  │   ├── 2120 - Advances from Clients                                       │
│  │   ├── 2130 - Outstanding Expenses                                        │
│  │   └── 2140 - Tax Payable                                                 │
│  │       ├── 2141 - GST Payable                                            │
│  │       └── 2142 - TDS Payable                                            │
│  │                                                                          │
│  3000 - EQUITY                                                              │
│  ├── 3100 - Capital                                                         │
│  ├── 3200 - Retained Earnings                                               │
│  └── 3300 - Current Year Profit/Loss                                        │
│                                                                             │
│  4000 - REVENUE                                                             │
│  ├── 4100 - Construction Revenue                                            │
│  │   └── [Project-wise revenue accounts]                                   │
│  ├── 4200 - Interior Revenue                                                │
│  └── 4300 - Other Income                                                    │
│                                                                             │
│  5000 - EXPENSES                                                            │
│  ├── 5100 - Direct Costs (Project-wise)                                     │
│  │   ├── 5110 - Material Cost                                              │
│  │   ├── 5120 - Labor Cost                                                 │
│  │   ├── 5130 - Subcontractor Cost                                         │
│  │   └── 5140 - Equipment Rental                                           │
│  ├── 5200 - Indirect Costs                                                  │
│  │   ├── 5210 - Site Overhead                                              │
│  │   ├── 5220 - Transportation                                             │
│  │   └── 5230 - Utilities                                                  │
│  └── 5300 - Administrative Expenses                                         │
│      ├── 5310 - Salaries                                                   │
│      ├── 5320 - Rent                                                       │
│      └── 5330 - Office Expenses                                            │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DATABASE SCHEMA - FINANCIAL TABLES

```sql
-- ============================================
-- CHART OF ACCOUNTS
-- ============================================
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    code            VARCHAR(20) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    
    -- Hierarchy
    parent_id       UUID REFERENCES accounts(id),
    account_type    VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
    
    -- Classification
    is_group        BOOLEAN DEFAULT false,
    is_system       BOOLEAN DEFAULT false, -- System accounts can't be deleted
    
    -- Linked entities (for auto-created accounts)
    linked_entity   VARCHAR(50), -- client, vendor, project, bank
    linked_id       UUID,
    
    -- Balance tracking (denormalized for performance)
    current_balance DECIMAL(15,2) DEFAULT 0,
    
    -- Opening balance
    opening_balance DECIMAL(15,2) DEFAULT 0,
    opening_date    DATE,
    
    is_active       BOOLEAN DEFAULT true,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(org_id, code)
);

CREATE INDEX idx_accounts_org ON accounts(org_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_linked ON accounts(linked_entity, linked_id);

-- ============================================
-- FINANCIAL YEARS
-- ============================================
CREATE TABLE financial_years (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    name            VARCHAR(50) NOT NULL, -- "FY 2024-25"
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    
    is_current      BOOLEAN DEFAULT false,
    is_locked       BOOLEAN DEFAULT false, -- Prevent entries after closing
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOURNAL ENTRIES (Parent of ledger entries)
-- ============================================
CREATE TABLE journal_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    fy_id           UUID NOT NULL REFERENCES financial_years(id),
    
    entry_number    VARCHAR(50) NOT NULL,
    entry_date      DATE NOT NULL,
    
    -- Source document
    voucher_type    VARCHAR(50) NOT NULL, -- payment, receipt, journal, contra
    
    -- Reference to source transaction
    reference_type  VARCHAR(50), -- grn, expense, invoice, payment_receipt, etc.
    reference_id    UUID,
    
    -- Project (if applicable)
    project_id      UUID REFERENCES projects(id),
    
    narration       TEXT,
    
    -- Totals (must match)
    total_debit     DECIMAL(15,2) NOT NULL,
    total_credit    DECIMAL(15,2) NOT NULL,
    
    -- Status
    status          VARCHAR(50) DEFAULT 'posted', -- draft, posted, reversed
    
    -- Reversal
    is_reversed     BOOLEAN DEFAULT false,
    reversed_by     UUID REFERENCES journal_entries(id),
    reversal_of     UUID REFERENCES journal_entries(id),
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    posted_at       TIMESTAMP WITH TIME ZONE,
    posted_by       UUID REFERENCES users(id),
    
    UNIQUE(org_id, entry_number),
    
    -- Ensure balanced entry
    CONSTRAINT balanced_entry CHECK (total_debit = total_credit)
);

CREATE INDEX idx_journal_org_date ON journal_entries(org_id, entry_date);
CREATE INDEX idx_journal_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX idx_journal_project ON journal_entries(project_id);

-- ============================================
-- LEDGER ENTRIES (Individual debit/credit lines)
-- ============================================
CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id      UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    
    account_id      UUID NOT NULL REFERENCES accounts(id),
    
    -- Amount (only one should be non-zero)
    debit_amount    DECIMAL(15,2) DEFAULT 0,
    credit_amount   DECIMAL(15,2) DEFAULT 0,
    
    -- Running balance (updated by trigger)
    running_balance DECIMAL(15,2),
    
    -- Optional: cost center tracking
    project_id      UUID REFERENCES projects(id),
    
    narration       TEXT,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only debit or credit, not both
    CONSTRAINT debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (debit_amount = 0 AND credit_amount > 0)
    )
);

CREATE INDEX idx_ledger_journal ON ledger_entries(journal_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_project ON ledger_entries(project_id);

-- ============================================
-- BANK ACCOUNTS
-- ============================================
CREATE TABLE bank_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    account_id      UUID NOT NULL REFERENCES accounts(id), -- Link to COA
    
    bank_name       VARCHAR(255) NOT NULL,
    branch          VARCHAR(255),
    account_number  VARCHAR(50) NOT NULL,
    ifsc_code       VARCHAR(20),
    account_type    VARCHAR(50), -- current, savings
    
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    
    is_active       BOOLEAN DEFAULT true,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENT RECEIPTS (Money In)
-- ============================================
CREATE TABLE payment_receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    receipt_number  VARCHAR(50) NOT NULL,
    receipt_date    DATE NOT NULL,
    
    -- Payer
    client_id       UUID REFERENCES clients(id),
    payer_name      VARCHAR(255),
    
    -- Project (if applicable)
    project_id      UUID REFERENCES projects(id),
    
    -- Amount
    amount          DECIMAL(15,2) NOT NULL,
    
    -- Payment mode
    payment_mode    VARCHAR(50) NOT NULL, -- cash, bank_transfer, cheque, upi
    
    -- Bank details (if bank)
    bank_account_id UUID REFERENCES bank_accounts(id),
    cheque_number   VARCHAR(50),
    cheque_date     DATE,
    transaction_ref VARCHAR(100),
    
    -- Invoice allocation
    -- (stored separately in payment_allocations)
    
    narration       TEXT,
    
    -- Status
    status          VARCHAR(50) DEFAULT 'posted',
    
    -- Journal link
    journal_id      UUID REFERENCES journal_entries(id),
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    UNIQUE(org_id, receipt_number)
);

CREATE INDEX idx_receipts_client ON payment_receipts(client_id);
CREATE INDEX idx_receipts_project ON payment_receipts(project_id);
CREATE INDEX idx_receipts_date ON payment_receipts(receipt_date);

-- ============================================
-- PAYMENT VOUCHERS (Money Out)
-- ============================================
CREATE TABLE payment_vouchers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    voucher_number  VARCHAR(50) NOT NULL,
    voucher_date    DATE NOT NULL,
    
    -- Payee
    payee_type      VARCHAR(50) NOT NULL, -- vendor, contractor, employee, other
    vendor_id       UUID REFERENCES vendors(id),
    payee_name      VARCHAR(255),
    
    -- Project (if applicable)
    project_id      UUID REFERENCES projects(id),
    
    -- Amount
    amount          DECIMAL(15,2) NOT NULL,
    tds_amount      DECIMAL(15,2) DEFAULT 0,
    net_amount      DECIMAL(15,2) NOT NULL,
    
    -- Payment mode
    payment_mode    VARCHAR(50) NOT NULL, -- cash, bank_transfer, cheque, upi
    
    -- Bank details (if bank)
    bank_account_id UUID REFERENCES bank_accounts(id),
    cheque_number   VARCHAR(50),
    cheque_date     DATE,
    transaction_ref VARCHAR(100),
    
    -- Expense category
    expense_account_id UUID REFERENCES accounts(id),
    
    narration       TEXT,
    
    -- Attachments
    attachments     JSONB DEFAULT '[]',
    
    -- Approval workflow
    status          VARCHAR(50) DEFAULT 'draft', -- draft, pending_approval, approved, rejected, posted
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    
    -- Journal link
    journal_id      UUID REFERENCES journal_entries(id),
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    UNIQUE(org_id, voucher_number)
);

CREATE INDEX idx_payments_vendor ON payment_vouchers(vendor_id);
CREATE INDEX idx_payments_project ON payment_vouchers(project_id);
CREATE INDEX idx_payments_date ON payment_vouchers(voucher_date);
CREATE INDEX idx_payments_status ON payment_vouchers(status);

-- ============================================
-- EXPENSE ENTRIES (Quick expense logging)
-- ============================================
CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    expense_number  VARCHAR(50) NOT NULL,
    expense_date    DATE NOT NULL,
    
    project_id      UUID NOT NULL REFERENCES projects(id),
    
    -- Category
    category        VARCHAR(100) NOT NULL,
    expense_account_id UUID REFERENCES accounts(id),
    
    -- Vendor (optional)
    vendor_id       UUID REFERENCES vendors(id),
    vendor_name     VARCHAR(255),
    
    -- Amount
    amount          DECIMAL(15,2) NOT NULL,
    gst_amount      DECIMAL(15,2) DEFAULT 0,
    total_amount    DECIMAL(15,2) NOT NULL,
    
    -- Payment
    is_paid         BOOLEAN DEFAULT false,
    payment_mode    VARCHAR(50),
    payment_voucher_id UUID REFERENCES payment_vouchers(id),
    
    description     TEXT,
    
    -- Attachments (receipts/bills)
    attachments     JSONB DEFAULT '[]',
    
    -- Approval
    status          VARCHAR(50) DEFAULT 'draft',
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    
    -- Journal link
    journal_id      UUID REFERENCES journal_entries(id),
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    UNIQUE(org_id, expense_number)
);

CREATE INDEX idx_expenses_project ON expenses(project_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
```

---

## 3. DOUBLE-ENTRY TRANSACTION EXAMPLES

### 3.1 Material Purchase (GRN)

```
TRANSACTION: Purchased cement from vendor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRN Amount: ₹1,00,000 + GST ₹18,000 = ₹1,18,000

Journal Entry:
┌─────────────────────────────────────────────────┐
│ Account                    │ Debit    │ Credit  │
├─────────────────────────────────────────────────┤
│ Raw Materials (Inventory)  │ 1,00,000 │         │
│ GST Input Credit           │   18,000 │         │
│ Accounts Payable - Vendor  │          │ 1,18,000│
├─────────────────────────────────────────────────┤
│ TOTAL                      │ 1,18,000 │ 1,18,000│
└─────────────────────────────────────────────────┘
```

### 3.2 Payment to Vendor

```
TRANSACTION: Payment to cement vendor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payment: ₹1,18,000 via Bank

Journal Entry:
┌─────────────────────────────────────────────────┐
│ Account                    │ Debit    │ Credit  │
├─────────────────────────────────────────────────┤
│ Accounts Payable - Vendor  │ 1,18,000 │         │
│ HDFC Bank Account          │          │ 1,18,000│
├─────────────────────────────────────────────────┤
│ TOTAL                      │ 1,18,000 │ 1,18,000│
└─────────────────────────────────────────────────┘
```

### 3.3 Material Issue to Site (Consumption)

```
TRANSACTION: Cement issued to Project Alpha
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue Value: ₹50,000

Journal Entry:
┌─────────────────────────────────────────────────┐
│ Account                    │ Debit    │ Credit  │
├─────────────────────────────────────────────────┤
│ Project Alpha - Material   │   50,000 │         │
│ Raw Materials (Inventory)  │          │   50,000│
├─────────────────────────────────────────────────┤
│ TOTAL                      │   50,000 │   50,000│
└─────────────────────────────────────────────────┘
```

### 3.4 Client Invoice

```
TRANSACTION: Running bill to client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bill Amount: ₹5,00,000 + GST ₹90,000 = ₹5,90,000

Journal Entry:
┌─────────────────────────────────────────────────┐
│ Account                    │ Debit    │ Credit  │
├─────────────────────────────────────────────────┤
│ Accounts Receivable-Client │ 5,90,000 │         │
│ Construction Revenue       │          │ 5,00,000│
│ GST Output Payable         │          │   90,000│
├─────────────────────────────────────────────────┤
│ TOTAL                      │ 5,90,000 │ 5,90,000│
└─────────────────────────────────────────────────┘
```

### 3.5 Payment Received from Client

```
TRANSACTION: Client payment received
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount: ₹5,90,000 via Bank

Journal Entry:
┌─────────────────────────────────────────────────┐
│ Account                    │ Debit    │ Credit  │
├─────────────────────────────────────────────────┤
│ HDFC Bank Account          │ 5,90,000 │         │
│ Accounts Receivable-Client │          │ 5,90,000│
├─────────────────────────────────────────────────┤
│ TOTAL                      │ 5,90,000 │ 5,90,000│
└─────────────────────────────────────────────────┘
```

### 3.6 Labor Payment (Cash)

```
TRANSACTION: Daily labor payment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount: ₹15,000 Cash

Journal Entry:
┌─────────────────────────────────────────────────┐
│ Account                    │ Debit    │ Credit  │
├─────────────────────────────────────────────────┤
│ Project Alpha - Labor Cost │   15,000 │         │
│ Petty Cash - Site 1        │          │   15,000│
├─────────────────────────────────────────────────┤
│ TOTAL                      │   15,000 │   15,000│
└─────────────────────────────────────────────────┘
```

---

## 4. TRIGGERS & PROCEDURES

```sql
-- ============================================
-- TRIGGER: Update account balance after ledger entry
-- ============================================
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the account balance
    UPDATE accounts
    SET current_balance = (
        SELECT 
            CASE 
                WHEN account_type IN ('asset', 'expense') THEN
                    COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0)
                ELSE
                    COALESCE(SUM(credit_amount), 0) - COALESCE(SUM(debit_amount), 0)
            END
        FROM ledger_entries le
        JOIN journal_entries je ON le.journal_id = je.id
        WHERE le.account_id = NEW.account_id
        AND je.status = 'posted'
    ),
    updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance
AFTER INSERT OR UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- ============================================
-- TRIGGER: Validate journal entry is balanced
-- ============================================
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_dr DECIMAL(15,2);
    total_cr DECIMAL(15,2);
BEGIN
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO total_dr, total_cr
    FROM ledger_entries
    WHERE journal_id = NEW.id;
    
    IF total_dr != total_cr THEN
        RAISE EXCEPTION 'Journal entry is not balanced. Debit: %, Credit: %', total_dr, total_cr;
    END IF;
    
    -- Update totals
    UPDATE journal_entries
    SET total_debit = total_dr, total_credit = total_cr
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROCEDURE: Create journal entry from GRN
-- ============================================
CREATE OR REPLACE FUNCTION create_grn_journal(p_grn_id UUID)
RETURNS UUID AS $$
DECLARE
    v_journal_id UUID;
    v_grn RECORD;
    v_org_id UUID;
    v_inventory_account_id UUID;
    v_gst_account_id UUID;
    v_payable_account_id UUID;
BEGIN
    -- Get GRN details
    SELECT g.*, v.id as vendor_id
    INTO v_grn
    FROM grn g
    JOIN vendors v ON g.vendor_id = v.id
    WHERE g.id = p_grn_id;
    
    v_org_id := v_grn.org_id;
    
    -- Get account IDs (or create if needed)
    SELECT id INTO v_inventory_account_id FROM accounts 
    WHERE org_id = v_org_id AND code = '1141';
    
    SELECT id INTO v_gst_account_id FROM accounts 
    WHERE org_id = v_org_id AND code = '1160'; -- GST Input
    
    -- Get vendor payable account
    SELECT id INTO v_payable_account_id FROM accounts 
    WHERE org_id = v_org_id AND linked_entity = 'vendor' AND linked_id = v_grn.vendor_id;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        org_id, fy_id, entry_number, entry_date,
        voucher_type, reference_type, reference_id,
        project_id, narration, total_debit, total_credit,
        created_by
    ) VALUES (
        v_org_id,
        (SELECT id FROM financial_years WHERE org_id = v_org_id AND is_current = true),
        'JE-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'),
        v_grn.grn_date,
        'journal',
        'grn',
        p_grn_id,
        v_grn.project_id,
        'Material purchase - GRN: ' || v_grn.grn_number,
        v_grn.total_amount,
        v_grn.total_amount,
        v_grn.created_by
    ) RETURNING id INTO v_journal_id;
    
    -- Debit: Inventory
    INSERT INTO ledger_entries (journal_id, account_id, debit_amount, project_id)
    VALUES (v_journal_id, v_inventory_account_id, v_grn.subtotal, v_grn.project_id);
    
    -- Debit: GST Input
    IF v_grn.tax_amount > 0 THEN
        INSERT INTO ledger_entries (journal_id, account_id, debit_amount)
        VALUES (v_journal_id, v_gst_account_id, v_grn.tax_amount);
    END IF;
    
    -- Credit: Vendor Payable
    INSERT INTO ledger_entries (journal_id, account_id, credit_amount)
    VALUES (v_journal_id, v_payable_account_id, v_grn.total_amount);
    
    -- Update GRN with journal reference
    UPDATE grn SET journal_id = v_journal_id WHERE id = p_grn_id;
    
    RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. REPORTING QUERIES

### 5.1 Trial Balance

```sql
-- Trial Balance Query
SELECT 
    a.code,
    a.name,
    a.account_type,
    CASE 
        WHEN a.account_type IN ('asset', 'expense') THEN
            GREATEST(a.current_balance, 0)
        ELSE 0
    END as debit_balance,
    CASE 
        WHEN a.account_type IN ('liability', 'equity', 'revenue') THEN
            GREATEST(a.current_balance, 0)
        WHEN a.account_type IN ('asset', 'expense') AND a.current_balance < 0 THEN
            ABS(a.current_balance)
        ELSE 0
    END as credit_balance
FROM accounts a
WHERE a.org_id = :org_id
AND a.is_group = false
AND a.current_balance != 0
ORDER BY a.code;
```

### 5.2 Project P&L

```sql
-- Project-wise Profit & Loss
WITH project_revenue AS (
    SELECT 
        p.id as project_id,
        p.name as project_name,
        COALESCE(SUM(le.credit_amount), 0) as revenue
    FROM projects p
    LEFT JOIN ledger_entries le ON le.project_id = p.id
    LEFT JOIN accounts a ON le.account_id = a.id AND a.account_type = 'revenue'
    WHERE p.org_id = :org_id
    GROUP BY p.id, p.name
),
project_expenses AS (
    SELECT 
        p.id as project_id,
        COALESCE(SUM(le.debit_amount), 0) as expenses
    FROM projects p
    LEFT JOIN ledger_entries le ON le.project_id = p.id
    LEFT JOIN accounts a ON le.account_id = a.id AND a.account_type = 'expense'
    WHERE p.org_id = :org_id
    GROUP BY p.id
)
SELECT 
    pr.project_id,
    pr.project_name,
    pr.revenue,
    COALESCE(pe.expenses, 0) as expenses,
    pr.revenue - COALESCE(pe.expenses, 0) as profit,
    CASE 
        WHEN pr.revenue > 0 THEN
            ROUND(((pr.revenue - COALESCE(pe.expenses, 0)) / pr.revenue) * 100, 2)
        ELSE 0
    END as profit_margin_pct
FROM project_revenue pr
LEFT JOIN project_expenses pe ON pr.project_id = pe.project_id
ORDER BY pr.project_name;
```

### 5.3 Cash Flow Statement

```sql
-- Cash Flow for Period
SELECT 
    DATE_TRUNC('day', je.entry_date) as date,
    SUM(CASE WHEN a.code LIKE '111%' OR a.code LIKE '112%' THEN le.debit_amount ELSE 0 END) as inflow,
    SUM(CASE WHEN a.code LIKE '111%' OR a.code LIKE '112%' THEN le.credit_amount ELSE 0 END) as outflow,
    SUM(CASE WHEN a.code LIKE '111%' OR a.code LIKE '112%' THEN le.debit_amount - le.credit_amount ELSE 0 END) as net_flow
FROM journal_entries je
JOIN ledger_entries le ON je.id = le.journal_id
JOIN accounts a ON le.account_id = a.id
WHERE je.org_id = :org_id
AND je.entry_date BETWEEN :start_date AND :end_date
AND je.status = 'posted'
GROUP BY DATE_TRUNC('day', je.entry_date)
ORDER BY date;
```

---

## Next Document: API Design & Endpoints →
