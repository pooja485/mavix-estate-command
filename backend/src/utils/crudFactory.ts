import { Router } from 'express';
import { AnyZodObject, ZodSchema } from 'zod';
import { requireAuth, tenantIdOf } from '../middleware/auth';
import { asyncHandler } from './asyncHandler';
import { AppError } from '../utils/AppError';

type PrismaDelegate = {
  findMany: (args: any) => Promise<any[]>;
  findFirst: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  count: (args: any) => Promise<number>;
};

export interface CrudOptions {
  /** The prisma model delegate, e.g. prisma.lead */
  model: PrismaDelegate;
  /** Zod object schema used to validate the body on create (partial-applied for update) */
  createSchema: AnyZodObject;
  updateSchema?: ZodSchema<any>;
  /** Default sort */
  orderBy?: Record<string, 'asc' | 'desc'>;
  /** Max page size */
  maxPageSize?: number;
}

/**
 * Builds a tenant-scoped REST router: GET /, GET /:id, POST /, PATCH /:id, DELETE /:id
 * All queries are automatically filtered/stamped with the caller's tenantId,
 * which is the core of the multi-tenant isolation boundary.
 */
export function buildCrudRouter(opts: CrudOptions): Router {
  const router = Router();
  const { model, createSchema, updateSchema, orderBy, maxPageSize = 500 } = opts;

  router.use(requireAuth);

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const tenantId = tenantIdOf(req);
      const take = Math.min(Number(req.query.limit) || maxPageSize, maxPageSize);
      const skip = Number(req.query.offset) || 0;
      const [items, total] = await Promise.all([
        model.findMany({ where: { tenantId }, orderBy, take, skip }),
        model.count({ where: { tenantId } }),
      ]);
      res.json({ data: serialize(items), total });
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const tenantId = tenantIdOf(req);
      const item = await model.findFirst({ where: { id: req.params.id, tenantId } });
      if (!item) throw AppError.notFound();
      res.json({ data: serialize(item) });
    })
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const tenantId = tenantIdOf(req);
      const body = createSchema.parse(req.body);
      const item = await model.create({ data: { ...body, tenantId } });
      res.status(201).json({ data: serialize(item) });
    })
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const tenantId = tenantIdOf(req);
      const existing = await model.findFirst({ where: { id: req.params.id, tenantId } });
      if (!existing) throw AppError.notFound();
      const schema = updateSchema ?? createSchema.partial();
      const body = schema.parse(req.body);
      const item = await model.update({ where: { id: existing.id }, data: body });
      res.json({ data: serialize(item) });
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const tenantId = tenantIdOf(req);
      const existing = await model.findFirst({ where: { id: req.params.id, tenantId } });
      if (!existing) throw AppError.notFound();
      await model.delete({ where: { id: existing.id } });
      res.status(204).send();
    })
  );

  return router;
}

/** BigInt fields don't serialize to JSON natively — convert to numbers for API responses. */
function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? Number(val) : val))
  );
}

export { serialize };
