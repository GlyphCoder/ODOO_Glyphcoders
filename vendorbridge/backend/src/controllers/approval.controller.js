import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/activityLogger.js';
import { notifyUsers } from '../utils/notifyUsers.js';

export const getApprovals = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('approvals')
      .select(`*, rfqs(rfq_number, title), quotations(total_amount, vendors(*)),
               profiles!approvals_approver_id_fkey(full_name),
               profiles!approvals_requested_by_fkey(full_name)`)
      .order('created_at', { ascending: false });

    if (req.query.status && req.query.status !== 'all') {
      query = query.eq('status', req.query.status);
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
      .select(`*, rfqs(*, rfq_items(*)), quotations(*, vendors(*), quotation_items(*)),
               profiles!approvals_approver_id_fkey(full_name, email),
               profiles!approvals_requested_by_fkey(full_name, email)`)
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
    const { data: approval } = await supabaseAdmin
      .from('approvals')
      .select('*, rfqs(*), quotations(*, vendors(*))')
      .eq('id', approvalId)
      .single();

    // Update approval
    await supabaseAdmin.from('approvals').update({
      status: 'approved', remarks, approved_at: new Date().toISOString()
    }).eq('id', approvalId);

    // Update quotation status
    await supabaseAdmin.from('quotations').update({ status: 'accepted' }).eq('id', approval.quotation_id);

    // Auto-generate Purchase Order
    const quot = approval.quotations;
    const { data: po, error: poErr } = await supabaseAdmin
      .from('purchase_orders')
      .insert({
        rfq_id: approval.rfq_id,
        quotation_id: approval.quotation_id,
        vendor_id: quot.vendor_id,
        approval_id: approvalId,
        delivery_address: 'To be specified',
        expected_delivery: new Date(Date.now() + (quot.delivery_days || 30) * 86400000).toISOString().split('T')[0],
        payment_terms: quot.payment_terms,
        subtotal: quot.subtotal,
        tax_percentage: quot.tax_percentage,
        tax_amount: quot.tax_amount,
        total_amount: quot.total_amount,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (poErr) throw poErr;

    // Update vendor total_orders
    await supabaseAdmin.from('vendors')
      .update({ total_orders: supabaseAdmin.raw('total_orders + 1') })
      .eq('id', quot.vendor_id)
      .catch(() => {});

    // Notify requester
    await notifyUsers(supabaseAdmin, {
      userIds: [approval.requested_by],
      title: 'Quotation Approved',
      message: `Your approval request has been approved. PO ${po.po_number} has been generated.`,
      type: 'approval',
      entityType: 'purchase_order',
      entityId: po.id,
    });

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
