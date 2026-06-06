import { supabaseAdmin } from '../config/supabase.js';

export const getVendors = async (req, res) => {
  try {
    let query = supabaseAdmin.from('vendors').select('*').order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.category) query = query.eq('category', req.query.category);
    if (req.query.search) {
      query = query.or(`company_name.ilike.%${req.query.search}%,email.ilike.%${req.query.search}%,gst_number.ilike.%${req.query.search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createVendor = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .insert({ ...req.body, created_by: req.user.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVendor = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('vendors')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVendorStats = async (req, res) => {
  try {
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('total_orders, rating')
      .eq('id', req.params.id)
      .single();

    const { data: pos } = await supabaseAdmin
      .from('purchase_orders')
      .select('total_amount, status')
      .eq('vendor_id', req.params.id);

    const totalValue = (pos || []).reduce((sum, po) => sum + (po.total_amount || 0), 0);
    const completedPOs = (pos || []).filter(p => p.status === 'completed').length;

    res.json({
      data: {
        total_orders: vendor?.total_orders || 0,
        avg_rating: vendor?.rating || 0,
        total_value: totalValue,
        completed_pos: completedPOs,
        on_time_rate: completedPOs > 0 ? Math.round((completedPOs / (pos?.length || 1)) * 100) : 0,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
