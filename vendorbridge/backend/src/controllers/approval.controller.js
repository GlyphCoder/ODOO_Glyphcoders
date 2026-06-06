import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/activityLogger.js';
import { notifyUsers } from '../utils/notifyUsers.js';

export const getApprovals = async (req, res) => {
  try {
    // Note: We select approver and requester profiles separately to avoid Supabase
    // "table name specified more than once" error with dual FK joins to profiles.
    let query = supabaseAdmin
      .from('approvals')
      .select(`
        id, rfq_id, quotation_id, approver_id, requested_by, status, remarks, approved_at, created_at,
        rfqs(rfq_number, title),
        quotations(total_amount, delivery_days, vendor_id, vendors(company_name, rating)),
        approver:profiles!approvals_approver_id_fkey(full_name),
        requester:profiles!approvals_requested_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (req.query.status && req.query.status !== 'all') {
      query = query.eq('status', req.query.status);
    }

    // Filter by approver for managers — they only see what's assigned to them
    if (req.user.role === 'manager') {
      query = query.eq('approver_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createApproval = async (req, res) => {
  try {
    const { rfq_id, quotation_id, approver_id } = req.body;

    const { data, error } = await supabaseAdmin
      .from('approvals')
      .insert({ rfq_id, quotation_id, approver_id, requested_by: req.user.id })
      .select()
      .single();
    if (error) throw error;

    // Update quotation to under_review
    await supabaseAdmin.from('quotations').update({ status: 'under_review' }).eq('id', quotation_id);

    // Notify approver
    if (approver_id) {
      await notifyUsers(supabaseAdmin, {
        userIds: [approver_id],
        title: 'New Approval Request',
        message: 'A quotation requires your approval',
        type: 'approval',
        entityType: 'approval',
        entityId: data.id,
      });
    }

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'created', entityType: 'approval',
      entityId: data.id, description: 'Submitted approval request',
    });

    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getApproval = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('approvals')
      .select(`
        id, rfq_id, quotation_id, approver_id, requested_by, status, remarks, approved_at, created_at,
        rfqs(*, rfq_items(*)),
        quotations(*, vendors(*), quotation_items(*)),
        approver:profiles!approvals_approver_id_fkey(full_name, email),
        requester:profiles!approvals_requested_by_fkey(full_name, email)
      `)
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const approveApproval = async (req, res) => {
  try {
    const { remarks } = req.body;
    const approvalId = req.params.id;

    // Get approval details
    const { data: approval, error: fetchErr } = await supabaseAdmin
      .from('approvals')
      .select('*, rfqs(*), quotations(*, vendors(*))')
      .eq('id', approvalId)
      .single();
    if (fetchErr) throw fetchErr;
    if (!approval) return res.status(404).json({ error: 'Approval not found' });

    const quot = approval.quotations;
    if (!quot) return res.status(400).json({ error: 'Approval has no linked quotation' });

    // Update approval status
    await supabaseAdmin.from('approvals').update({
      status: 'approved', remarks: remarks || '', approved_at: new Date().toISOString()
    }).eq('id', approvalId);

    // Update quotation status to accepted
    await supabaseAdmin.from('quotations').update({ status: 'accepted' }).eq('id', approval.quotation_id);

    // Reject other pending/under_review approvals for the same RFQ (only one vendor can win)
    await supabaseAdmin.from('approvals')
      .update({ status: 'rejected', remarks: 'Another vendor was selected' })
      .eq('rfq_id', approval.rfq_id)
      .neq('id', approvalId)
      .in('status', ['pending', 'under_review']);

    // Auto-generate Purchase Order
    const { data: po, error: poErr } = await supabaseAdmin
      .from('purchase_orders')
      .insert({
        rfq_id: approval.rfq_id,
        quotation_id: approval.quotation_id,
        vendor_id: quot.vendor_id,
        approval_id: approvalId,
        delivery_address: 'To be specified',
        expected_delivery: new Date(Date.now() + (quot.delivery_days || 30) * 86400000).toISOString().split('T')[0],
        terms_conditions: quot.payment_terms || quot.notes || 'Standard payment terms apply',
        subtotal: quot.subtotal || 0,
        tax_percentage: quot.tax_percentage || 18,
        tax_amount: quot.tax_amount || 0,
        total_amount: quot.total_amount || 0,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (poErr) throw poErr;

    // Increment vendor total_orders (non-critical, ignore failure)
    try {
      await supabaseAdmin.rpc('increment_vendor_orders', { vendor_id_param: quot.vendor_id });
    } catch (_) {}

    // Notify requester
    await notifyUsers(supabaseAdmin, {
      userIds: [approval.requested_by],
      title: 'Quotation Approved ✅',
      message: `Your approval request has been approved. PO ${po.po_number} has been generated.`,
      type: 'approval',
      entityType: 'purchase_order',
      entityId: po.id,
    });

    // Also notify the vendor
    if (quot.vendor_id) {
      const { data: vendorUser } = await supabaseAdmin
        .from('vendor_users').select('user_id').eq('vendor_id', quot.vendor_id).single();
      if (vendorUser) {
        await notifyUsers(supabaseAdmin, {
          userIds: [vendorUser.user_id],
          title: 'Your Quotation was Accepted! 🎉',
          message: `Your quotation has been approved. PO ${po.po_number} has been raised.`,
          type: 'approval', entityType: 'purchase_order', entityId: po.id,
        });
      }
    }

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'approved', entityType: 'approval',
      entityId: approvalId, description: `Approved quotation, generated ${po.po_number}`,
    });

    res.json({ data: { approval: approvalId, po } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const rejectApproval = async (req, res) => {
  try {
    const { remarks } = req.body;
    const approvalId = req.params.id;

    const { data: approval } = await supabaseAdmin
      .from('approvals').select('rfq_id, quotation_id, requested_by').eq('id', approvalId).single();

    await supabaseAdmin.from('approvals').update({ status: 'rejected', remarks }).eq('id', approvalId);
    await supabaseAdmin.from('quotations').update({ status: 'rejected' }).eq('id', approval.quotation_id);
    await supabaseAdmin.from('rfqs').update({ status: 'open' }).eq('id', approval.rfq_id);

    await notifyUsers(supabaseAdmin, {
      userIds: [approval.requested_by],
      title: 'Approval Rejected',
      message: `Your approval request was rejected. Remarks: ${remarks || 'N/A'}`,
      type: 'approval',
      entityType: 'approval',
      entityId: approvalId,
    });

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'rejected', entityType: 'approval',
      entityId: approvalId, description: `Rejected: ${remarks || 'No remarks'}`,
    });

    res.json({ message: 'Approval rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
