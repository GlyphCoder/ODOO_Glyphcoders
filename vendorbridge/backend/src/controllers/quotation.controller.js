import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/activityLogger.js';
import { assertVendorScope, requireVendorIdForUser } from '../utils/vendorAccess.js';

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
      const vendorId = await assertVendorScope(supabaseAdmin, req, res, req.query.vendor_id || null);
      if (!vendorId) return;
      query = query.eq('vendor_id', vendorId);
    } else if (req.query.vendor_id) {
      query = query.eq('vendor_id', req.query.vendor_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createQuotation = async (req, res) => {
  try {
    const { rfq_id, delivery_days, payment_terms, validity_days, notes, items = [], tax_percentage: globalTaxPct = 0 } = req.body;

    let vendorId;
    if (req.user.role === 'vendor') {
      vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
      if (!vendorId) return;
    } else {
      vendorId = req.body.vendor_id;
      if (!vendorId) return res.status(400).json({ error: 'vendor_id is required when submitting on behalf of a vendor' });
    }

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('rfq_vendors')
      .select('id, rfqs(status)')
      .eq('rfq_id', rfq_id)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (invitationError) throw invitationError;
    if (!invitation) return res.status(403).json({ error: 'You are not invited to this RFQ' });
    if (invitation.rfqs?.status !== 'open') return res.status(400).json({ error: 'RFQ is not open for quotations' });
    if (!items.length) return res.status(400).json({ error: 'Quotation must include at least one item' });
    if (items.some(item => !item.product_name?.trim() || Number(item.quantity) <= 0 || Number(item.unit_price) <= 0)) {
      return res.status(400).json({ error: 'Each quotation item needs a product name, quantity, and unit price' });
    }

    const normalizedItems = items.map(item => {
      const subtotal = Number(item.unit_price) * Number(item.quantity);
      const tax_percentage = Number(item.tax_percentage ?? globalTaxPct ?? 0);
      const tax_amount = (subtotal * tax_percentage) / 100;
      return {
        ...item,
        subtotal,
        tax_percentage,
        tax_amount,
        total_price: subtotal + tax_amount,
      };
    });

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax_amount = normalizedItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const total_amount = subtotal + tax_amount;
    // Use the global tax_percentage sent from frontend; fallback to derived value
    const tax_percentage = Number(globalTaxPct) || (subtotal > 0 ? Number(((tax_amount / subtotal) * 100).toFixed(2)) : 0);

    // Calculate maximum delivery days from items, fallback to global delivery_days
    const computedDeliveryDays = items.length > 0
      ? Math.max(...items.map(i => Number(i.delivery_days || 0)))
      : Number(delivery_days || 0);

    const { data: quotation, error } = await supabaseAdmin
      .from('quotations')
      .insert({
        rfq_id, vendor_id: vendorId,
        delivery_days: computedDeliveryDays || delivery_days, payment_terms, validity_days, notes,
        tax_percentage, subtotal, tax_amount, total_amount,
      })
      .select()
      .single();
    if (error) throw error;

    if (items.length > 0) {
      const itemPayload = normalizedItems.map(item => ({
        quotation_id: quotation.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        notes: item.notes || null,
      }));

      const { error: itemError } = await supabaseAdmin.from('quotation_items').insert(itemPayload);
      if (itemError) throw itemError;
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
    let query = supabaseAdmin
      .from('quotations')
      .select('*, vendors(*), rfqs(*, rfq_items(*)), quotation_items(*)')
      .eq('id', req.params.id);

    if (req.user.role === 'vendor') {
      const vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
      if (!vendorId) return;
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateQuotation = async (req, res) => {
  try {
    const { items, ...quotData } = req.body;
    let vendorId = null;

    if (req.user.role === 'vendor') {
      vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
      if (!vendorId) return;

      const blockedFields = ['vendor_id', 'rfq_id', 'status', 'accepted_at'];
      if (blockedFields.some(field => Object.prototype.hasOwnProperty.call(quotData, field))) {
        return res.status(403).json({ error: 'Vendors cannot change quotation ownership or workflow status' });
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from('quotations')
        .select('id')
        .eq('id', req.params.id)
        .eq('vendor_id', vendorId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return res.status(404).json({ error: 'Quotation not found' });
    }

    if (quotData.items !== undefined) delete quotData.items;

    // Recalculate totals if items provided
    if (items && items.length > 0) {
      const globalTaxPct = Number(quotData.tax_percentage ?? 0);
      const normalizedItems = items.map(item => {
        const subtotal = Number(item.unit_price) * Number(item.quantity);
        const tax_percentage = Number(item.tax_percentage ?? globalTaxPct ?? 0);
        const tax_amount = (subtotal * tax_percentage) / 100;
        return {
          ...item,
          subtotal,
          tax_percentage,
          tax_amount,
          total_price: subtotal + tax_amount,
        };
      });

      // Recalculate max delivery days from items
      const maxDeliveryDays = Math.max(...items.map(i => Number(i.delivery_days || 0)));
      quotData.delivery_days = maxDeliveryDays;

      quotData.subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
      quotData.tax_amount = normalizedItems.reduce((sum, item) => sum + item.tax_amount, 0);
      quotData.total_amount = quotData.subtotal + quotData.tax_amount;
      quotData.tax_percentage = quotData.subtotal > 0 ? Number(((quotData.tax_amount / quotData.subtotal) * 100).toFixed(2)) : 0;
      await supabaseAdmin.from('quotation_items').delete().eq('quotation_id', req.params.id);
      const itemPayload = normalizedItems.map(item => ({
        quotation_id: req.params.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        notes: item.notes || null,
      }));

      const { error: itemError } = await supabaseAdmin.from('quotation_items').insert(itemPayload);
      if (itemError) throw itemError;
    }

    let query = supabaseAdmin
      .from('quotations')
      .update({ ...quotData, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (vendorId) query = query.eq('vendor_id', vendorId);

    const { data, error } = await query.select().single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const withdrawQuotation = async (req, res) => {
  try {
    const vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
    if (!vendorId) return;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('quotations')
      .select('id, rfq_id, status')
      .eq('id', req.params.id)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });
    if (['accepted', 'rejected', 'withdrawn'].includes(existing.status)) {
      return res.status(400).json({ error: 'This quotation can no longer be withdrawn' });
    }

    const { data, error } = await supabaseAdmin
      .from('quotations')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('vendor_id', vendorId)
      .select()
      .single();
    if (error) throw error;

    await supabaseAdmin
      .from('rfq_vendors')
      .update({ responded: false })
      .eq('rfq_id', existing.rfq_id)
      .eq('vendor_id', vendorId);

    await logActivity(supabaseAdmin, {
      userId: req.user.id,
      action: 'withdrawn',
      entityType: 'quotation',
      entityId: existing.id,
      entityLabel: 'Quotation',
      description: 'Withdrew quotation',
    });

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
