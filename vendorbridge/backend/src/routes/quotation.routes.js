import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { getQuotations, createQuotation, getQuotation, updateQuotation, compareQuotations } from '../controllers/quotation.controller.js';

const router = express.Router();
const internal = ['admin', 'manager', 'procurement_officer'];

router.get('/', auth, requireRoles(...internal, 'vendor'), getQuotations);
router.post('/', auth, requireRoles('vendor'), createQuotation);
router.get('/:id', auth, requireRoles(...internal, 'vendor'), getQuotation);
router.put('/:id', auth, requireRoles('vendor'), updateQuotation);
router.post('/compare', auth, requireRoles(...internal), compareQuotations);

export default router;
