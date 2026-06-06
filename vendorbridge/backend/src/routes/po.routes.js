import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { getPOs, createPO, getPO, updatePOStatus, getPOPDF } from '../controllers/po.controller.js';

const router = express.Router();
const internal = ['admin', 'manager', 'procurement_officer'];
const readRoles = [...internal, 'vendor'];

router.get('/', auth, requireRoles(...readRoles), getPOs);
router.post('/', auth, requireRoles(...internal), createPO);
router.get('/:id', auth, requireRoles(...readRoles), getPO);
router.put('/:id/status', auth, requireRoles(...internal), updatePOStatus);
router.get('/:id/pdf', auth, requireRoles(...readRoles), getPOPDF);

export default router;
