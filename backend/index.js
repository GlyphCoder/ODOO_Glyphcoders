import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Resolve directory paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_12345';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: '*', // Allow requests from any origin for ease of local testing
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Support base64 uploads as well
app.use('/uploads', express.static(uploadsDir));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// ==========================================
// Database / Data Store Configuration
// ==========================================
let pool = null;
let supabase = null;
let isMockDb = true;
let dbModeLabel = 'In-Memory Fallback';

// Pre-seeded Mock Database (fallback if no DB connection is configured)
// Default password for all seeded users is: 'Password123'
const defaultHashedPassword = await bcrypt.hash('Password123', 10);
const mockUsers = [
  {
    id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    first_name: 'Alice',
    last_name: 'Manager',
    email: 'admin@vendorbridge.com',
    phone: '+15550100',
    password_hash: defaultHashedPassword,
    role: 'Admin',
    country: 'United States',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice',
    additional_info: 'System administrator for VendorBridge ERP.',
    created_at: new Date().toISOString()
  },
  {
    id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
    first_name: 'John',
    last_name: 'Officer',
    email: 'officer@vendorbridge.com',
    phone: '+15550101',
    password_hash: defaultHashedPassword,
    role: 'Procurement Officer',
    country: 'United Kingdom',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=John',
    additional_info: 'Procurement agent specializing in global parts supply.',
    created_at: new Date().toISOString()
  },
  {
    id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    first_name: 'Apex',
    last_name: 'Suppliers',
    email: 'vendor@vendorbridge.com',
    phone: '+15550102',
    password_hash: defaultHashedPassword,
    role: 'Vendor',
    country: 'Germany',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Apex',
    additional_info: 'Primary metal fabrication and components supplier.',
    created_at: new Date().toISOString()
  },
  {
    id: '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
    first_name: 'Sarah',
    last_name: 'Approver',
    email: 'manager@vendorbridge.com',
    phone: '+15550103',
    password_hash: defaultHashedPassword,
    role: 'Manager / Approver',
    country: 'Canada',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah',
    additional_info: 'Head of financial operations & procurement approvals.',
    created_at: new Date().toISOString()
  }
];

if (process.env.DATABASE_URL) {
  try {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
    });
    // Test connection
    const res = await pool.query('SELECT NOW()');
    console.log(`[Database] Connected to PostgreSQL via pool successfully at: ${res.rows[0].now}`);
    isMockDb = false;
    dbModeLabel = 'PostgreSQL Connection Pool';
  } catch (error) {
    console.error('[Database] Failed to connect to PostgreSQL pool.', error.message);
  }
}

// Fallback to Supabase API Client if no PG Pool is active
if (isMockDb && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log('[Database] Connected to Supabase REST API client successfully!');
    isMockDb = false;
    dbModeLabel = 'Supabase REST API Client';
  } catch (error) {
    console.error('[Database] Failed to initialize Supabase client:', error.message);
  }
}

if (isMockDb) {
  console.log('[Database] ⚠️ Operating in in-memory mock database mode. Changes will not persist.');
}

// Pre-seeded fallback mock vendors
const mockVendors = [
  { id: 'v1', name: 'Infra Supplies Pvt Ltd', category: 'Constructions', gst_no: '27AAICS1429B1Z0', contact_no: '+91 9876543210', status: 'Active', created_at: new Date().toISOString() },
  { id: 'v2', name: 'Tech Core LTD', category: 'IT', gst_no: '27AAICS1429B1Z0', contact_no: '+91 8765432109', status: 'Active', created_at: new Date().toISOString() },
  { id: 'v3', name: 'FastLog Transport', category: 'Logistics', gst_no: '27AAICS1429B1Z0', contact_no: '+91 7654321098', status: 'Blocked', created_at: new Date().toISOString() },
  { id: 'v4', name: 'Global Materials Co', category: 'Raw Materials', gst_no: '27AAICS1429B1Z0', contact_no: '+91 6543210987', status: 'Pending', created_at: new Date().toISOString() }
];

// Pre-seeded fallback mock POs
const mockPurchaseOrders = [
  { id: 'p1', po_number: 'PO-001', vendor_name: 'Infra Supplies Pvt Ltd', amount: 87000.00, status: 'Approved', created_at: new Date().toISOString() },
  { id: 'p2', po_number: 'PO-002', vendor_name: 'Tech Core LTD', amount: 140000.00, status: 'Pending', created_at: new Date().toISOString() },
  { id: 'p3', po_number: 'PO-003', vendor_name: 'OfficeWood Co', amount: 34900.00, status: 'Draft', created_at: new Date().toISOString() }
];

// Pre-seeded fallback mock RFQs
const mockRfqs = [
  {
    id: 'rfq-001',
    title: 'Office Furniture procurement Q2',
    category: 'Furniture',
    deadline: '2025-06-15',
    description: 'Ergonomic chairs and standing desks for 3rd floor',
    items: [
      { item: 'Ergonomic chair', qty: 25, unit: 'NOS' },
      { item: 'Standing desks', qty: 10, unit: 'NOS' }
    ],
    assigned_vendors: ['Infra Supplies Pvt Ltd', 'Tech Core LTD'],
    status: 'Sent',
    created_by: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    created_at: new Date().toISOString()
  }
];

// Pre-seeded fallback mock Quotations
const mockQuotations = [
  {
    id: 'q-001',
    rfq_id: 'rfq-001',
    rfq_title: 'Office Furniture procurement Q2',
    vendor_id: '3b4c5d6e-7f8a-9b0c-1d2e-3f4a5b6c7d8e',
    vendor_name: 'Tech Core LTD',
    items: [
      { item: 'Ergonomic chair', qty: 25, unit_price: 3500, total: 87500, delivery_days: 7 },
      { item: 'Standing desks', qty: 10, unit_price: 8200, total: 82000, delivery_days: 14 }
    ],
    tax_gst_percent: 18.00,
    note_terms: 'Payment terms: 20 days net...',
    subtotal: 169500.00,
    gst_amount: 30510.00,
    grand_total: 200010.00,
    status: 'Submitted',
    created_at: new Date().toISOString()
  }
];


// Helper database functions
const db = {
  getUserByEmail: async (email) => {
    if (pool) {
      const result = await pool.query('SELECT * FROM public.users WHERE LOWER(email) = LOWER($1)', [email]);
      return result.rows[0];
    } else if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (error) {
        console.error('[Supabase DB Error] getUserByEmail:', error.message);
        throw error;
      }
      return data;
    } else {
      return mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    }
  },
  getUserById: async (id) => {
    if (pool) {
      const result = await pool.query('SELECT * FROM public.users WHERE id = $1', [id]);
      return result.rows[0];
    } else if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('[Supabase DB Error] getUserById:', error.message);
        throw error;
      }
      return data;
    } else {
      return mockUsers.find(u => u.id === id);
    }
  },
  createUser: async (user) => {
    if (pool) {
      const query = `
        INSERT INTO public.users (first_name, last_name, email, phone, password_hash, role, country, avatar_url, additional_info)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        user.first_name,
        user.last_name,
        user.email,
        user.phone,
        user.password_hash,
        user.role,
        user.country,
        user.avatar_url,
        user.additional_info
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } else if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          password_hash: user.password_hash,
          role: user.role,
          country: user.country,
          avatar_url: user.avatar_url,
          additional_info: user.additional_info
        }])
        .select()
        .single();
      if (error) {
        console.error('[Supabase DB Error] createUser:', error.message);
        throw error;
      }
      return data;
    } else {
      const newUser = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...user
      };
      mockUsers.push(newUser);
      return newUser;
    }
  },
  getVendors: async (search, status) => {
    if (pool) {
      let query = 'SELECT * FROM public.vendors WHERE 1=1';
      const values = [];
      let paramIdx = 1;
      if (search) {
        query += ` AND (LOWER(name) LIKE LOWER($${paramIdx}) OR LOWER(category) LIKE LOWER($${paramIdx}) OR LOWER(gst_no) LIKE LOWER($${paramIdx}))`;
        values.push(`%${search}%`);
        paramIdx++;
      }
      if (status && status !== 'All') {
        query += ` AND status = $${paramIdx}`;
        values.push(status);
      }
      query += ' ORDER BY created_at DESC';
      const result = await pool.query(query, values);
      return result.rows;
    } else if (supabase) {
      let query = supabase.from('vendors').select('*');
      if (search) {
        query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,gst_no.ilike.%${search}%`);
      }
      if (status && status !== 'All') {
        query = query.eq('status', status);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('[Supabase DB Error] getVendors:', error.message);
        throw error;
      }
      return data;
    } else {
      let result = [...mockVendors];
      if (search) {
        const s = search.toLowerCase();
        result = result.filter(v => v.name.toLowerCase().includes(s) || v.category.toLowerCase().includes(s) || v.gst_no.toLowerCase().includes(s));
      }
      if (status && status !== 'All') {
        result = result.filter(v => v.status === status);
      }
      return result;
    }
  },
  createVendor: async (vendor) => {
    if (pool) {
      const query = `
        INSERT INTO public.vendors (name, category, gst_no, contact_no, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [vendor.name, vendor.category, vendor.gst_no, vendor.contact_no, vendor.status || 'Pending'];
      const result = await pool.query(query, values);
      return result.rows[0];
    } else if (supabase) {
      const { data, error } = await supabase
        .from('vendors')
        .insert([{
          name: vendor.name,
          category: vendor.category,
          gst_no: vendor.gst_no,
          contact_no: vendor.contact_no,
          status: vendor.status || 'Pending'
        }])
        .select()
        .single();
      if (error) {
        console.error('[Supabase DB Error] createVendor:', error.message);
        throw error;
      }
      return data;
    } else {
      const newVendor = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...vendor,
        status: vendor.status || 'Pending'
      };
      mockVendors.push(newVendor);
      return newVendor;
    }
  },
  getPurchaseOrders: async () => {
    if (pool) {
      const result = await pool.query('SELECT * FROM public.purchase_orders ORDER BY created_at DESC');
      return result.rows;
    } else if (supabase) {
      const { data, error } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[Supabase DB Error] getPurchaseOrders:', error.message);
        throw error;
      }
      return data;
    } else {
      return [...mockPurchaseOrders];
    }
  },
  getRfqs: async () => {
    if (pool) {
      const result = await pool.query('SELECT * FROM public.rfqs ORDER BY created_at DESC');
      return result.rows;
    } else if (supabase) {
      const { data, error } = await supabase.from('rfqs').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[Supabase DB Error] getRfqs:', error.message);
        throw error;
      }
      return data;
    } else {
      return [...mockRfqs];
    }
  },
  createRfq: async (rfq) => {
    if (pool) {
      const query = `
        INSERT INTO public.rfqs (title, category, deadline, description, items, assigned_vendors, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [
        rfq.title,
        rfq.category,
        rfq.deadline,
        rfq.description,
        JSON.stringify(rfq.items),
        JSON.stringify(rfq.assigned_vendors),
        rfq.status || 'Draft',
        rfq.created_by
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } else if (supabase) {
      const { data, error } = await supabase
        .from('rfqs')
        .insert([{
          title: rfq.title,
          category: rfq.category,
          deadline: rfq.deadline,
          description: rfq.description,
          items: rfq.items,
          assigned_vendors: rfq.assigned_vendors,
          status: rfq.status || 'Draft',
          created_by: rfq.created_by
        }])
        .select()
        .single();
      if (error) {
        console.error('[Supabase DB Error] createRfq:', error.message);
        throw error;
      }
      return data;
    } else {
      const newRfq = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...rfq,
        status: rfq.status || 'Draft'
      };
      mockRfqs.push(newRfq);
      return newRfq;
    }
  },
  getQuotations: async () => {
    if (pool) {
      const result = await pool.query('SELECT * FROM public.quotations ORDER BY created_at DESC');
      return result.rows;
    } else if (supabase) {
      const { data, error } = await supabase.from('quotations').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[Supabase DB Error] getQuotations:', error.message);
        throw error;
      }
      return data;
    } else {
      return [...mockQuotations];
    }
  },
  createQuotation: async (q) => {
    if (pool) {
      const query = `
        INSERT INTO public.quotations (rfq_id, rfq_title, vendor_id, vendor_name, items, tax_gst_percent, note_terms, subtotal, gst_amount, grand_total, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const values = [
        q.rfq_id,
        q.rfq_title,
        q.vendor_id,
        q.vendor_name,
        JSON.stringify(q.items),
        q.tax_gst_percent,
        q.note_terms,
        q.subtotal,
        q.gst_amount,
        q.grand_total,
        q.status || 'Draft'
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } else if (supabase) {
      const { data, error } = await supabase
        .from('quotations')
        .insert([{
          rfq_id: q.rfq_id,
          rfq_title: q.rfq_title,
          vendor_id: q.vendor_id,
          vendor_name: q.vendor_name,
          items: q.items,
          tax_gst_percent: q.tax_gst_percent,
          note_terms: q.note_terms,
          subtotal: q.subtotal,
          gst_amount: q.gst_amount,
          grand_total: q.grand_total,
          status: q.status || 'Draft'
        }])
        .select()
        .single();
      if (error) {
        console.error('[Supabase DB Error] createQuotation:', error.message);
        throw error;
      }
      return data;
    } else {
      const newQ = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...q,
        status: q.status || 'Draft'
      };
      mockQuotations.push(newQ);
      return newQ;
    }
  }
};


// ==========================================
// Authentication Middleware
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==========================================
// API Routes
// ==========================================

// Health Check / Connection Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    databaseMode: dbModeLabel,
    timestamp: new Date().toISOString()
  });
});

// Get all vendors (with search & filters)
app.get('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    const vendorsList = await db.getVendors(search, status);
    res.json(vendorsList);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Error fetching vendors list', error: error.message });
  }
});

// Create new vendor
app.post('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const { name, category, gst_no, contact_no, status } = req.body;
    if (!name || !category || !gst_no || !contact_no) {
      return res.status(400).json({ message: 'Missing required vendor fields' });
    }
    const newVendor = await db.createVendor({ name, category, gst_no, contact_no, status });
    res.status(201).json(newVendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ message: 'Error creating vendor record', error: error.message });
  }
});

// Get Purchase Orders
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await db.getPurchaseOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ message: 'Error fetching purchase orders', error: error.message });
  }
});

// Get Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const orders = await db.getPurchaseOrders();
    
    // Calculate dashboard statistics dynamically based on PO records
    const approvedPos = orders.filter(o => o.status === 'Approved');
    const totalPoSpend = approvedPos.reduce((sum, o) => sum + parseFloat(o.amount), 0);
    
    res.json({
      activeRfqs: 12,
      pendingApprovals: orders.filter(o => o.status === 'Pending').length + 3,
      posAmountMonth: totalPoSpend || 230000.00,
      overdueInvoices: 3,
      recentPurchaseOrders: orders.slice(0, 5),
      spendingTrends: [
        { month: 'Jan', amount: 45000 },
        { month: 'Feb', amount: 80000 },
        { month: 'Mar', amount: 55000 },
        { month: 'Apr', amount: 110000 },
        { month: 'May', amount: 95000 },
        { month: 'Jun', amount: totalPoSpend || 230000 }
      ]
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error getting dashboard stats', error: error.message });
  }
});

// Register Route
app.post('/api/auth/register', upload.single('avatar'), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role, country, additional_info } = req.body;

    // Simple backend validation
    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required registration fields' });
    }

    // Check if email already registered
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already in use' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Resolve avatar URL: Uploaded file path OR base64 OR default Dicebear avatar
    let avatar_url = null;
    if (req.file) {
      // Save full server URL to access image
      avatar_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    } else if (req.body.avatar_base64) {
      // If client sent base64 image (alternative)
      avatar_url = req.body.avatar_base64;
    } else {
      // Default placeholder avatar based on user initials or seed name
      avatar_url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(first_name + last_name)}`;
    }

    // Create user object
    const user = await db.createUser({
      first_name,
      last_name,
      email,
      phone: phone || '',
      password_hash,
      role,
      country: country || '',
      avatar_url,
      additional_info: additional_info || ''
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove sensitive data before sending user response
    const { password_hash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration', error: error.message });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove sensitive data
    const { password_hash: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Get Current User Profile (Auth validation check)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password_hash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Internal server error fetching profile' });
  }
});

// Get RFQs list
app.get('/api/rfqs', authenticateToken, async (req, res) => {
  try {
    const rfqs = await db.getRfqs();
    res.json(rfqs);
  } catch (error) {
    console.error('Error fetching RFQs:', error);
    res.status(500).json({ message: 'Error fetching RFQs list', error: error.message });
  }
});

// Create RFQ
app.post('/api/rfqs', authenticateToken, async (req, res) => {
  try {
    const { title, category, deadline, description, items, assigned_vendors } = req.body;
    if (!title || !category || !deadline || !description || !items || !assigned_vendors) {
      return res.status(400).json({ message: 'Missing required RFQ fields' });
    }
    const newRfq = await db.createRfq({
      title,
      category,
      deadline,
      description,
      items,
      assigned_vendors,
      status: 'Sent',
      created_by: req.user.id
    });
    res.status(201).json(newRfq);
  } catch (error) {
    console.error('Error creating RFQ:', error);
    res.status(500).json({ message: 'Error creating RFQ record', error: error.message });
  }
});

// Get Quotations list
app.get('/api/quotations', authenticateToken, async (req, res) => {
  try {
    const quotations = await db.getQuotations();
    // If user is a Vendor, only return their own bids
    if (req.user.role === 'Vendor') {
      const filtered = quotations.filter(q => q.vendor_id === req.user.id);
      return res.json(filtered);
    }
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: 'Error fetching quotations list', error: error.message });
  }
});

// Create Quotation
app.post('/api/quotations', authenticateToken, async (req, res) => {
  try {
    const { rfq_id, rfq_title, vendor_name, items, tax_gst_percent, note_terms, subtotal, gst_amount, grand_total } = req.body;
    if (!rfq_id || !rfq_title || !vendor_name || !items || !subtotal || !grand_total) {
      return res.status(400).json({ message: 'Missing required quotation fields' });
    }
    const newQuotation = await db.createQuotation({
      rfq_id,
      rfq_title,
      vendor_id: req.user.id,
      vendor_name,
      items,
      tax_gst_percent: tax_gst_percent || 18.00,
      note_terms,
      subtotal,
      gst_amount,
      grand_total,
      status: 'Submitted'
    });
    res.status(201).json(newQuotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ message: 'Error creating quotation record', error: error.message });
  }
});

// Serve health index page

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>VendorBridge ERP Auth Backend</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; text-align: center; padding-top: 100px; }
          .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
          h1 { color: #818cf8; margin-bottom: 10px; }
          p { color: #9ca3af; margin-bottom: 30px; }
          .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85em; background: #10b981; color: #fff; }
          .badge.mock { background: #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>VendorBridge ERP Auth Backend</h1>
          <p>The Express.js / Supabase authentication server is running.</p>
          <div class="badge ${isMockDb ? 'mock' : ''}">
            Database: \${dbModeLabel}
          </div>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
