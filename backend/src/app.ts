import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { env, corsOrigins } from './config/env';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import tenantsRoutes from './modules/tenants/tenants.routes';
import usersRoutes from './modules/users/users.routes';
import bootstrapRoutes from './modules/bootstrap/bootstrap.routes';
import projectsRoutes from './modules/projects/projects.routes';
import approvalsRoutes from './modules/approvals/approvals.routes';
import leadsRoutes from './modules/leads/leads.routes';
import followupsRoutes from './modules/followups/followups.routes';
import unitsRoutes from './modules/units/units.routes';
import customersRoutes from './modules/customers/customers.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import collectionsRoutes from './modules/collections/collections.routes';
import transactionsRoutes from './modules/transactions/transactions.routes';
import vendorsRoutes from './modules/vendors/vendors.routes';
import employeesRoutes from './modules/employees/employees.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import dprRoutes from './modules/dpr/dpr.routes';
import boqRoutes from './modules/boq/boq.routes';
import materialsRoutes from './modules/materials/materials.routes';
import materialRequestsRoutes from './modules/materialRequests/materialRequests.routes';
import progressRoutes from './modules/progress/progress.routes';
import issuesRoutes from './modules/issues/issues.routes';
import collectionAgentRoutes from './modules/collectionAgent/collectionAgent.routes';
import aiLogsRoutes from './modules/aiLogs/aiLogs.routes';
import auditLogsRoutes from './modules/auditLogs/auditLogs.routes';
import portfolioRoutes from './modules/portfolio/portfolio.routes';
import banksRoutes from './modules/banks/banks.routes';
import reraRoutes from './modules/rera/rera.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== 'test' }));

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Auth endpoints are the prime brute-force target (password guessing,
  // credential stuffing, tenant-slug enumeration). A much stricter,
  // separate limiter here means an attacker gets locked out fast without
  // affecting normal API usage by legitimate logged-in users.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again in 15 minutes.' } },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', env: env.NODE_ENV, time: new Date().toISOString() }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/tenants', tenantsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/bootstrap', bootstrapRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/approvals', approvalsRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/followups', followupsRoutes);
  app.use('/api/units', unitsRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/collections', collectionsRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/vendors', vendorsRoutes);
  app.use('/api/employees', employeesRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/dpr', dprRoutes);
  app.use('/api/boq', boqRoutes);
  app.use('/api/materials', materialsRoutes);
  app.use('/api/material-requests', materialRequestsRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/issues', issuesRoutes);
  app.use('/api/collection-agent', collectionAgentRoutes);
  app.use('/api/ai-logs', aiLogsRoutes);
  app.use('/api/audit-logs', auditLogsRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/banks', banksRoutes);
  app.use('/api/rera', reraRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
