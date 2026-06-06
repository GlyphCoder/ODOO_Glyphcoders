import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { getApprovals, createApproval, getApproval, approveApproval, rejectApproval } from '../controllers/approval.controller.js';

const router = express.Router();
const internal = ['admin', 'manager', 'procurement_officer'];

router.get('/', auth, requireRoles(...internal), getApprovals);
router.post('/', auth, requireRoles(...internal), createApproval);
router.get('/:id', auth, requireRoles(...internal), getApproval);
router.post('/:id/approve', auth, requireRoles('admin', 'manager'), approveApproval);
router.post('/:id/reject', auth, requireRoles('admin', 'manager'), rejectApproval);

export default router;
