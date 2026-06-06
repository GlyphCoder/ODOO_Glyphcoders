import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  getVendors, createVendor, getVendor, updateVendor, deleteVendor, getVendorStats
} from '../controllers/vendor.controller.js';

const router = express.Router();
const internal = ['admin', 'manager', 'procurement_officer'];

router.get('/', auth, requireRoles(...internal), getVendors);
router.post('/', auth, requireRoles(...internal), createVendor);
router.get('/:id', auth, requireRoles(...internal), getVendor);
router.put('/:id', auth, requireRoles(...internal), updateVendor);
router.delete('/:id', auth, requireRoles('admin'), deleteVendor);
router.get('/:id/stats', auth, requireRoles(...internal), getVendorStats);

export default router;
