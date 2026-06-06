import { supabaseAdmin } from '../config/supabase.js';
import { sendRFQInvitation } from '../services/email.service.js';
import { logActivity } from '../utils/activityLogger.js';
import { notifyUsers } from '../utils/notifyUsers.js';
import { requireVendorIdForUser, redactRFQForVendor } from '../utils/vendorAccess.js';

export const getRFQs = async (req, res) => {
  try {
    let vendorId = null;
    let query = supabaseAdmin
      .from('rfqs')
      .select(
        req.user.role === 'vendor'
          ? '*, rfq_items(*), rfq_vendors(id, rfq_id, vendor_id, responded), profiles!rfqs_created_by_fkey(full_name)'
          : '*, rfq_items(*), rfq_vendors(vendor_id, vendors(company_name)), profiles!rfqs_created_by_fkey(full_name)'
      )
      .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.search) query = query.ilike('title', `%${req.query.search}%`);

    // Vendors only see their assigned RFQs
    if (req.user.role === 'vendor') {
      vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
      if (!vendorId) return;

      const { data: rv } = await supabaseAdmin
        .from('rfq_vendors')
        .select('rfq_id')
        .eq('vendor_id', vendorId);
      const rfqIds = (rv || []).map(r => r.rfq_id);
      if (rfqIds.length === 0) return res.json({ data: [] });
      query = query.in('id', rfqIds).eq('status', 'open');
    }

    const { data, error } = await query;
    if (error) throw error;
    const safeData = req.user.role === 'vendor'
      ? (data || []).map(rfq => redactRFQForVendor(rfq, vendorId))
      : data;
    res.json({ data: safeData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createRFQ = async (req, res) => {
  try {
    const { title, description, deadline, priority, category, items = [], vendor_ids = [] } = req.body;

    const { data: rfq, error: rfqErr } = await supabaseAdmin
      .from('rfqs')
      .insert({ title, description, deadline, priority, category, created_by: req.user.id })
      .select()
      .single();
    if (rfqErr) throw rfqErr;

    if (items.length > 0) {
      await supabaseAdmin.from('rfq_items').insert(
        items.map((item, i) => ({ ...item, rfq_id: rfq.id, sort_order: i }))
      );
    }

    if (vendor_ids.length > 0) {
      await supabaseAdmin.from('rfq_vendors').insert(
        vendor_ids.map(vid => ({ rfq_id: rfq.id, vendor_id: vid }))
      );
    }

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'created', entityType: 'rfq',
      entityId: rfq.id, entityLabel: rfq.rfq_number,
      description: `Created RFQ "${title}"`,
    });

    res.status(201).json({ data: rfq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRFQ = async (req, res) => {
  try {
    let vendorId = null;
    if (req.user.role === 'vendor') {
      vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
      if (!vendorId) return;

      const { data: invite, error: inviteError } = await supabaseAdmin
        .from('rfq_vendors')
        .select('id')
        .eq('rfq_id', req.params.id)
        .eq('vendor_id', vendorId)
        .maybeSingle();
      if (inviteError) throw inviteError;
      if (!invite) return res.status(404).json({ error: 'RFQ not found' });
    }

    const { data: rfq, error } = await supabaseAdmin
      .from('rfqs')
      .select(
        req.user.role === 'vendor'
          ? '*, rfq_items(*), rfq_vendors(id, rfq_id, vendor_id, responded), rfq_attachments(*), profiles!rfqs_created_by_fkey(full_name)'
          : '*, rfq_items(*), rfq_vendors(*, vendors(*)), rfq_attachments(*), profiles!rfqs_created_by_fkey(full_name, email)'
      )
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    res.json({ data: req.user.role === 'vendor' ? redactRFQForVendor(rfq, vendorId) : rfq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateRFQ = async (req, res) => {
  try {
    const { items, vendor_ids, ...rfqData } = req.body;
    const { data, error } = await supabaseAdmin
      .from('rfqs')
      .update({ ...rfqData, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteRFQ = async (req, res) => {
  try {
    const { data: rfq } = await supabaseAdmin.from('rfqs').select('status').eq('id', req.params.id).single();
    if (rfq?.status !== 'draft') return res.status(400).json({ error: 'Only draft RFQs can be deleted' });
    await supabaseAdmin.from('rfqs').delete().eq('id', req.params.id);
    res.json({ message: 'RFQ deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const publishRFQ = async (req, res) => {
  try {
    const { data: rfq } = await supabaseAdmin
      .from('rfqs')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, rfq_items(*), rfq_vendors(*, vendors(*))')
      .single();

    if (!rfq?.rfq_items || rfq.rfq_items.length === 0) {
      return res.status(400).json({ error: 'RFQ must have at least one line item before publishing' });
    }

    // Send emails to invited vendors
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    for (const rv of rfq.rfq_vendors || []) {
      if (rv.vendors?.email) {
        try {
          await sendRFQInvitation({
            to: rv.vendors.email,
            rfqNumber: rfq.rfq_number,
            rfqTitle: rfq.title,
            deadline: rfq.deadline,
            submissionLink: `${baseUrl}/quotations/submit/${rfq.id}`,
          });
        } catch (emailErr) {
          console.error('Email send failed:', emailErr.message);
        }
      }
    }

    // Notify internal users
    const { data: internalUsers } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'manager', 'procurement_officer'])
      .neq('id', req.user.id);

    await notifyUsers(supabaseAdmin, {
      userIds: (internalUsers || []).map(u => u.id),
      title: `RFQ Published: ${rfq.rfq_number}`,
      message: `${rfq.title} has been published and sent to vendors`,
      type: 'rfq',
      entityType: 'rfq',
      entityId: rfq.id,
    });

    const invitedVendorIds = (rfq.rfq_vendors || []).map(rv => rv.vendor_id).filter(Boolean);
    if (invitedVendorIds.length > 0) {
      const { data: vendorUsers } = await supabaseAdmin
        .from('vendor_users')
        .select('user_id')
        .in('vendor_id', invitedVendorIds);

      await notifyUsers(supabaseAdmin, {
        userIds: (vendorUsers || []).map(u => u.user_id),
        title: `New RFQ Invitation: ${rfq.rfq_number}`,
        message: `${rfq.title} is open for your quotation`,
        type: 'rfq',
        entityType: 'rfq',
        entityId: rfq.id,
      });
    }

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'updated', entityType: 'rfq',
      entityId: rfq.id, entityLabel: rfq.rfq_number,
      description: `Published RFQ "${rfq.title}"`,
    });

    res.json({ data: rfq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const closeRFQ = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('rfqs')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRFQQuotations = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('quotations')
      .select('*, vendors(*), quotation_items(*)')
      .eq('rfq_id', req.params.id)
      .order('total_amount', { ascending: true });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
