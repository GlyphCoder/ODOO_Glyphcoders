import express from 'express';
import { auth } from '../middleware/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();
const adminManager = ['admin', 'manager'];

// Auth routes
router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password,
      user_metadata: { full_name },
      email_confirm: true,
    });
    if (error) return res.status(400).json({ error: error.message });

    // Update profile with role and phone
    await supabaseAdmin.from('profiles').update({ role: role || 'procurement_officer', phone, full_name }).eq('id', data.user.id);

    res.status(201).json({ message: 'User created', userId: data.user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({ data: req.user });
});

router.put('/me', auth, async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, phone, avatar_url, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activity logs
router.get('/activity-logs', auth, async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('activity_logs')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (req.query.entity_type) query = query.eq('entity_type', req.query.entity_type);
    if (req.query.date_from) query = query.gte('created_at', req.query.date_from);
    if (req.query.date_to) query = query.lte('created_at', req.query.date_to);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
