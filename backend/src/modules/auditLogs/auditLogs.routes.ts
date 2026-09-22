import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  user: z.string().min(1),
  role: z.string().min(1),
  module: z.string().min(1),
  action: z.string().min(1),
  desc: htmlSafeString(z.string()).default(''),
  ip: z.string().default(''),
});

// Audit logs are append-only; most entries are written server-side by other
// modules (e.g. approvals), but this lets the frontend log manual actions too.
export default buildCrudRouter({ model: prisma.auditLog, createSchema: schema, orderBy: { createdAt: 'desc' } });
