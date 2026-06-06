import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { getReportDashboard, getVendorPerformance, getSpending, getCategorySpending, getFunnel, exportReport } from '../controllers/report.controller.js';

const router = express.Router();
const internal = ['admin', 'manager', 'procurement_officer'];

router.get('/dashboard', auth, requireRoles(...internal), getReportDashboard);
router.get('/vendor-performance', auth, requireRoles(...internal), getVendorPerformance);
router.get('/spending', auth, requireRoles(...internal), getSpending);
router.get('/category-spending', auth, requireRoles(...internal), getCategorySpending);
router.get('/funnel', auth, requireRoles(...internal), getFunnel);
router.get('/export', auth, requireRoles(...internal), exportReport);

export default router;
