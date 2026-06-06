import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import rfqRoutes from './routes/rfq.routes.js';
import quotationRoutes from './routes/quotation.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import poRoutes from './routes/po.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins in development (Vite ports can change)
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// Activity logs (also mounted under auth routes, alias here)
app.use('/api/activity-logs', (req, res, next) => {
  req.url = '/activity-logs' + req.url;
  authRoutes(req, res, next);
});

app.use(errorHandler);

export default app;
