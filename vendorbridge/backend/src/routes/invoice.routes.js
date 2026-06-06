import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { getInvoices, createInvoice, getInvoice, updateInvoice, getInvoicePDF, sendInvoice } from '../controllers/invoice.controller.js';

const router = express.Router();
const internal = ['admin', 'manager', 'procurement_officer'];
const readRoles = [...internal, 'vendor'];

router.get('/', auth, requireRoles(...readRoles), getInvoices);
router.post('/', auth, requireRoles(...internal), createInvoice);
router.get('/:id', auth, requireRoles(...readRoles), getInvoice);
router.put('/:id', auth, requireRoles(...internal), updateInvoice);
router.get('/:id/pdf', auth, requireRoles(...readRoles), getInvoicePDF);
router.post('/:id/send', auth, requireRoles(...internal), sendInvoice);

export default router;
