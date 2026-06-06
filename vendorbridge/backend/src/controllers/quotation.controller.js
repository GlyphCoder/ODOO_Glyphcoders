import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/activityLogger.js';

export const getQuotations = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('quotations')
      .select('*, vendors(*), rfqs(id, rfq_number, title, deadline), quotation_items(*)')
      .order('submitted_at', { ascending: false });

    if (req.query.rfq_id) query = query.eq('rfq_id', req.query.rfq_id);
    if (req.query.status) query = query.eq('status', req.query.status);

    // Vendor sees only their own
    if (req.user.role === 'vendor') {
      const { data: vendorUser } = await supabaseAdmin
        .from('vendor_users').select('vendor_id').eq('user_id', req.user.id).limit(1).maybeSingle();
      if (vendorUser) query = query.eq('vendor_id', vendorUser.vendor_id);
      else return res.json({ data: [] });
    }

    if (req.query.vendor_id) query = query.eq('vendor_id', req.query.vendor_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createQuotation = async (req, res) => {
  try {
    const { rfq_id, delivery_days, payment_terms, validity_days, notes, items = [], tax_percentage = 18 } = req.body;

    // Get vendor_id for this user or request body
    let vendorId;
    if (req.user.role === 'vendor') {
      const { data: vendorUser } = await supabaseAdmin
        .from('vendor_users').select('vendor_id').eq('user_id', req.user.id).limit(1).maybeSingle();
      if (!vendorUser) return res.status(400).json({ error: 'No vendor linked to this user' });
      vendorId = vendorUser.vendor_id;
    } else {
      vendorId = req.body.vendor_id;
      if (!vendorId) return res.status(400).json({ error: 'vendor_id is required when submitting on behalf of a vendor' });
    }

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax_amount = (subtotal * tax_percentage) / 100;
    const total_amount = subtotal + tax_amount;

    // Calculate maximum delivery days from items, fallback to global delivery_days
    const computedDeliveryDays = items.length > 0
      ? Math.max(...items.map(i => Number(i.delivery_days || 0)))
      : Number(delivery_days || 0);

    const { data: quotation, error } = await supabaseAdmin
      .from('quotations')
      .insert({
        rfq_id, vendor_id: vendorId,
        delivery_days: computedDeliveryDays, payment_terms, validity_days, notes,
        tax_percentage, subtotal, tax_amount, total_amount,
      })
      .select()
      .single();
    if (error) throw error;

    if (items.length > 0) {
      await supabaseAdmin.from('quotation_items').insert(
        items.map(item => ({ ...item, quotation_id: quotation.id }))
      );
    }

    // Mark vendor as responded
    await supabaseAdmin.from('rfq_vendors')
      .update({ responded: true })
      .eq('rfq_id', rfq_id)
      .eq('vendor_id', vendorId);

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'created', entityType: 'quotation',
      entityId: quotation.id, entityLabel: `Quotation for RFQ`,
      description: `Submitted quotation worth ₹${total_amount.toFixed(2)}`,
    });

    res.status(201).json({ data: quotation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getQuotation = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('quotations')
      .select('*, vendors(*), rfqs(*, rfq_items(*)), quotation_items(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateQuotation = async (req, res) => {
  try {
    const { items, ...quotData } = req.body;

    if (quotData.items !== undefined) delete quotData.items;

    // Recalculate totals if items provided
    if (items && items.length > 0) {
      const tax_percentage = quotData.tax_percentage || 18;
      const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const tax_amount = (subtotal * tax_percentage) / 100;
      quotData.subtotal = subtotal;
      quotData.tax_amount = tax_amount;
      quotData.total_amount = subtotal + tax_amount;

      // Recalculate max delivery days from items
      const maxDeliveryDays = Math.max(...items.map(i => Number(i.delivery_days || 0)));
      quotData.delivery_days = maxDeliveryDays;

      // Replace items
      await supabaseAdmin.from('quotation_items').delete().eq('quotation_id', req.params.id);
      await supabaseAdmin.from('quotation_items').insert(
        items.map(item => ({ ...item, quotation_id: req.params.id }))
      );
    }

    const { data, error } = await supabaseAdmin
      .from('quotations')
      .update({ ...quotData, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const compareQuotations = async (req, res) => {
  try {
    const { rfq_id } = req.body;
    const { data: quotations, error } = await supabaseAdmin
      .from('quotations')
      .select('*, vendors(*), quotation_items(*)')
      .eq('rfq_id', rfq_id)
      .in('status', ['submitted', 'under_review', 'accepted'])
      .order('total_amount', { ascending: true });
    if (error) throw error;
    res.json({ data: quotations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
