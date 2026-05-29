import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import auditRoutes from './audit.routes.js';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import donorsRoutes from './donors.routes.js';
import healthRoutes from './health.routes.js';
import historyRoutes from './history.routes.js';
import inventoryRoutes from './inventory.routes.js';
import patientsRoutes from './patients.routes.js';
import requestsRoutes from './requests.routes.js';
import usersRoutes from './users.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/audit-logs', requireAuth, auditRoutes);
router.use('/dashboard', requireAuth, dashboardRoutes);
router.use('/donors', requireAuth, donorsRoutes);
router.use('/history', requireAuth, historyRoutes);
router.use('/patients', requireAuth, patientsRoutes);
router.use('/inventory', requireAuth, inventoryRoutes);
router.use('/requests', requireAuth, requestsRoutes);
router.use('/users', requireAuth, usersRoutes);

export default router;
