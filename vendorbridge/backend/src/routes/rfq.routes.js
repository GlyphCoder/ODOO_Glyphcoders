import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  getRFQs, createRFQ, getRFQ, updateRFQ, deleteRFQ,
  publishRFQ, closeRFQ, getRFQQuotations
} from '../controllers/rfq.controller.js';

const router = express.Router();
const internal = ['admin', 'manager', 'procurement_officer'];
const allRoles = ['admin', 'manager', 'procurement_officer', 'vendor'];

router.get('/', auth, requireRoles(...allRoles), getRFQs);
router.post('/', auth, requireRoles(...internal), createRFQ);
router.get('/:id', auth, requireRoles(...allRoles), getRFQ);
router.put('/:id', auth, requireRoles(...internal), updateRFQ);
router.delete('/:id', auth, requireRoles('admin'), deleteRFQ);
router.post('/:id/publish', auth, requireRoles(...internal), publishRFQ);
router.post('/:id/close', auth, requireRoles(...internal), closeRFQ);
router.get('/:id/quotations', auth, requireRoles(...internal), getRFQQuotations);

export default router;
