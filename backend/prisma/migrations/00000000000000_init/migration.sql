-- MAVIX Estate Command — initial schema
-- Generated to match backend/prisma/schema.prisma exactly.
-- Verified by applying it to a real PostgreSQL 16 instance during development.

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'MANAGING_DIRECTOR', 'CFO', 'PROJECT_DIRECTOR', 'SALES_HEAD', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'CRM_MANAGER', 'SITE_ENGINEER', 'EMPLOYEE');
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

CREATE TABLE "projects" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "physicalPct" INTEGER NOT NULL DEFAULT 0,
    "financialPct" INTEGER NOT NULL DEFAULT 0,
    "manpower" INTEGER NOT NULL DEFAULT 0,
    "delayedTasks" INTEGER NOT NULL DEFAULT 0,
    "safetyScore" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "contractors" INTEGER NOT NULL DEFAULT 0,
    "openIssues" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "projects_tenantId_code_key" ON "projects"("tenantId", "code");

CREATE TABLE "approvals" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📄',
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "project" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "approvals_tenantId_code_key" ON "approvals"("tenantId", "code");

CREATE TABLE "leads" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "exec" TEXT NOT NULL,
    "last" TEXT NOT NULL,
    "next" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'New',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leads_tenantId_code_key" ON "leads"("tenantId", "code");

CREATE TABLE "followups" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "exec" TEXT NOT NULL,
    "last" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "followups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "units" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "tower" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "unitNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "carpet" INTEGER NOT NULL,
    "base" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "customer" TEXT NOT NULL DEFAULT '',
    "bookDate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "units_tenantId_code_key" ON "units"("tenantId", "code");

CREATE TABLE "customers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "agreement" BIGINT NOT NULL,
    "received" BIGINT NOT NULL,
    "pending" BIGINT NOT NULL,
    "nextDemand" TEXT NOT NULL,
    "overdue" BIGINT NOT NULL DEFAULT 0,
    "daysOD" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bookings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "exec" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collections" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "mode" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Cleared',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "debit" BIGINT NOT NULL DEFAULT 0,
    "credit" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "transactions_tenantId_code_key" ON "transactions"("tenantId", "code");

CREATE TABLE "vendors" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "projects" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "outstanding" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "delivery" INTEGER NOT NULL,
    "risk" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vendors_tenantId_code_key" ON "vendors"("tenantId", "code");

CREATE TABLE "employees" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "design" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "tasks" INTEGER NOT NULL DEFAULT 0,
    "perf" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employees_tenantId_code_key" ON "employees"("tenantId", "code");

CREATE TABLE "tasks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emp" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "due" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Assigned',
    "update" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tasks_tenantId_code_key" ON "tasks"("tenantId", "code");

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dpr_records" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "tower" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "contractor" TEXT NOT NULL,
    "planned" INTEGER NOT NULL,
    "actual" INTEGER NOT NULL,
    "labour" INTEGER NOT NULL,
    "weather" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dpr_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "boq_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "budget" BIGINT NOT NULL,
    "committed" BIGINT NOT NULL,
    "actual" BIGINT NOT NULL,
    "paid" BIGINT NOT NULL,
    "remaining" BIGINT NOT NULL,
    "variance" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "boq_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "boq_items_tenantId_code_key" ON "boq_items"("tenantId", "code");

CREATE TABLE "material_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "mat" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "opening" INTEGER NOT NULL,
    "received" INTEGER NOT NULL,
    "consumed" INTEGER NOT NULL,
    "closing" INTEGER NOT NULL,
    "min" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "alert" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "material_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "progress_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "tower" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "contractor" TEXT NOT NULL,
    "planned" INTEGER NOT NULL,
    "actual" INTEGER NOT NULL,
    "delay" INTEGER NOT NULL DEFAULT 0,
    "eng" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "progress_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issues" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "impact" INTEGER NOT NULL DEFAULT 0,
    "delay" INTEGER NOT NULL DEFAULT 0,
    "owner" TEXT NOT NULL,
    "due" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collection_agent_records" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "due" BIGINT NOT NULL,
    "days" INTEGER NOT NULL,
    "last" TEXT NOT NULL,
    "promise" TEXT NOT NULL DEFAULT '',
    "risk" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "collection_agent_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" BIGINT NOT NULL,
    "project" TEXT NOT NULL DEFAULT 'Corporate',
    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rera_accounts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "reraNo" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "balance" BIGINT NOT NULL,
    "withdrawable" BIGINT NOT NULL,
    CONSTRAINT "rera_accounts_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (all cascade on tenant delete)
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "followups" ADD CONSTRAINT "followups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collections" ADD CONSTRAINT "collections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dpr_records" ADD CONSTRAINT "dpr_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_items" ADD CONSTRAINT "material_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_items" ADD CONSTRAINT "progress_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issues" ADD CONSTRAINT "issues_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_agent_records" ADD CONSTRAINT "collection_agent_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rera_accounts" ADD CONSTRAINT "rera_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
