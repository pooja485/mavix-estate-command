import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { serialize } from '../../utils/crudFactory';

const router = Router();

/**
 * Single call that hydrates the whole app's initial state, shaped to mirror
 * the original DEFAULT_DATA object so the existing frontend render functions
 * need minimal changes. Everything here is tenant-scoped via requireAuth.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const where = { tenantId };

    const [
      projects,
      approvals,
      leads,
      followups,
      units,
      customers,
      bookings,
      collections,
      transactions,
      vendors,
      employees,
      tasks,
      notifications,
      dprRecords,
      boqItems,
      materialItems,
      progressItems,
      issues,
      collectionAgent,
      aiLogs,
      auditLog,
      portfolioItems,
      bankAccounts,
      reraAccounts,
    ] = await Promise.all([
      prisma.project.findMany({ where }),
      prisma.approval.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.followup.findMany({ where, orderBy: { date: 'asc' } }),
      prisma.unit.findMany({ where }),
      prisma.customer.findMany({ where }),
      prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.collection.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.vendor.findMany({ where }),
      prisma.employee.findMany({ where }),
      prisma.task.findMany({ where }),
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.dprRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.boqItem.findMany({ where }),
      prisma.materialItem.findMany({ where }),
      prisma.progressItem.findMany({ where }),
      prisma.issue.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.collectionAgentRecord.findMany({ where }),
      prisma.aiLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.portfolioItem.findMany({ where }),
      prisma.bankAccount.findMany({ where }),
      prisma.reraAccount.findMany({ where }),
    ]);

    res.json({
      data: serialize({
        projects,
        approvals,
        leads,
        followups,
        units,
        customers,
        bookings,
        collections,
        transactions,
        vendors,
        employees,
        tasks,
        notifications,
        dprRecords,
        boqData: boqItems,
        materialData: materialItems,
        progressData: progressItems,
        issues,
        collectionAgent,
        aiLogs,
        auditLog,
        portfolio: portfolioItems,
        bankAccounts,
        reraAccounts,
      }),
    });
  })
);

/** Lightweight recomputed KPI summary for the command-centre header cards. */
router.get(
  '/kpis',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const where = { tenantId };

    const [pendingApprovals, activeLeads, openIssues, overdueCustomers, employeeCount] = await Promise.all([
      prisma.approval.count({ where: { ...where, status: 'pending' } }),
      prisma.lead.count({ where: { ...where, status: 'Active' } }),
      prisma.issue.count({ where: { ...where, status: 'Open' } }),
      prisma.customer.count({ where: { ...where, overdue: { gt: 0 } } }),
      prisma.employee.count({ where }),
    ]);

    res.json({ data: { pendingApprovals, activeLeads, openIssues, overdueCustomers, employeeCount } });
  })
);

export default router;
