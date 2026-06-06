import { supabaseAdmin } from '../config/supabase.js';
import { sendRFQInvitation } from '../services/email.service.js';
import { logActivity } from '../utils/activityLogger.js';
import { notifyUsers } from '../utils/notifyUsers.js';

export const getRFQs = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('rfqs')
      .select('*, rfq_items(*), rfq_vendors(vendor_id, vendors(company_name)), profiles!rfqs_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.search) query = query.ilike('title', `%${req.query.search}%`);

    // Vendors only see their assigned RFQs
    if (req.user.role === 'vendor') {
      const { data: vendorUser, error: vuErr } = await supabaseAdmin
        .from('vendor_users').select('vendor_id').eq('user_id', req.user.id).limit(1).maybeSingle();
      console.log('[RFQ vendor filter] user_id:', req.user.id, '| vendorUser:', vendorUser, '| error:', vuErr?.message);
      if (vendorUser) {
        const { data: rv, error: rvErr } = await supabaseAdmin
          .from('rfq_vendors').select('rfq_id').eq('vendor_id', vendorUser.vendor_id);
        console.log('[RFQ vendor filter] vendor_id:', vendorUser.vendor_id, '| rfq_vendors:', rv?.length, '| error:', rvErr?.message);
        const rfqIds = (rv || []).map(r => r.rfq_id);
        if (rfqIds.length === 0) return res.json({ data: [] });
        query = query.in('id', rfqIds);
      } else {
        return res.json({ data: [] });
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
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
    const { data: rfq, error } = await supabaseAdmin
      .from('rfqs')
      .select('*, rfq_items(*), rfq_vendors(*, vendors(*)), rfq_attachments(*), profiles!rfqs_created_by_fkey(full_name, email)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    res.json({ data: rfq });
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
      .select('*, rfq_vendors(*, vendors(*))')
      .single();

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
