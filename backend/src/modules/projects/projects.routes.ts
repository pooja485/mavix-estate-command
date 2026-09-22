import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  physicalPct: z.number().int().min(0).max(100).default(0),
  financialPct: z.number().int().min(0).max(100).default(0),
  manpower: z.number().int().min(0).default(0),
  delayedTasks: z.number().int().min(0).default(0),
  safetyScore: z.number().int().min(0).max(100).default(0),
  qualityScore: z.number().int().min(0).max(100).default(0),
  contractors: z.number().int().min(0).default(0),
  openIssues: z.number().int().min(0).default(0),
});

export default buildCrudRouter({ model: prisma.project, createSchema: schema, orderBy: { code: 'asc' } });
