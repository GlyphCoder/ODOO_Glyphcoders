import { supabaseAdmin } from '../config/supabase.js';
import { requireVendorIdForUser } from '../utils/vendorAccess.js';

export const getReportDashboard = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    if (req.user.role === 'vendor') {
      const vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
      if (!vendorId) return;

      const { data: invitedRFQs } = await supabaseAdmin
        .from('rfq_vendors')
        .select('rfq_id, rfqs(status)')
        .eq('vendor_id', vendorId);

      const [monthPOs, monthInvoices, recentTrend] = await Promise.all([
        supabaseAdmin
          .from('purchase_orders')
          .select('id', { count: 'exact' })
          .eq('vendor_id', vendorId)
          .gte('created_at', monthStart),
        supabaseAdmin
          .from('invoices')
          .select('total_amount')
          .eq('vendor_id', vendorId)
          .gte('created_at', monthStart),
        supabaseAdmin
          .from('invoices')
          .select('total_amount, created_at')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const totalInvoicedMonth = (monthInvoices.data || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const trendMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        trendMap[key] = 0;
      }
      (recentTrend.data || []).forEach(inv => {
        const d = new Date(inv.created_at);
        const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        if (trendMap[key] !== undefined) trendMap[key] += inv.total_amount || 0;
      });

      return res.json({
        data: {
          pending_approvals: 0,
          active_rfqs: (invitedRFQs || []).filter(row => row.rfqs?.status === 'open').length,
          total_pos_month: monthPOs.count || 0,
          total_invoiced_month: totalInvoicedMonth,
          trends: Object.entries(trendMap).map(([month, amount]) => ({ month, amount })),
        },
      });
    }

    const [pendingApprovals, activeRFQs, monthPOs, monthInvoices, recentTrend] = await Promise.all([
      supabaseAdmin.from('approvals').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabaseAdmin.from('rfqs').select('id', { count: 'exact' }).eq('status', 'open'),
      supabaseAdmin.from('purchase_orders').select('id', { count: 'exact' }).gte('created_at', monthStart),
      supabaseAdmin.from('invoices').select('total_amount').gte('created_at', monthStart),
      supabaseAdmin.from('invoices').select('total_amount, created_at').order('created_at', { ascending: false }).limit(30),
    ]);

    const totalInvoicedMonth = (monthInvoices.data || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    // Build 6-month trend
    const trendMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      trendMap[key] = 0;
    }
    (recentTrend.data || []).forEach(inv => {
      const d = new Date(inv.created_at);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (trendMap[key] !== undefined) trendMap[key] += inv.total_amount || 0;
    });
    const trends = Object.entries(trendMap).map(([month, amount]) => ({ month, amount }));

    res.json({
      data: {
        pending_approvals: pendingApprovals.count || 0,
        active_rfqs: activeRFQs.count || 0,
        total_pos_month: monthPOs.count || 0,
        total_invoiced_month: totalInvoicedMonth,
        trends,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVendorPerformance = async (req, res) => {
  try {
    const { data: vendors } = await supabaseAdmin
      .from('vendors')
      .select('id, company_name, rating, total_orders');

    const { data: pos } = await supabaseAdmin
      .from('purchase_orders')
      .select('vendor_id, total_amount, status');

    const result = (vendors || []).map(v => {
      const vpos = (pos || []).filter(p => p.vendor_id === v.id);
      return {
        ...v,
        total_value: vpos.reduce((s, p) => s + (p.total_amount || 0), 0),
        po_count: vpos.length,
        completed: vpos.filter(p => p.status === 'completed').length,
      };
    }).sort((a, b) => b.total_value - a.total_value);

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSpending = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const from = new Date();
    from.setMonth(from.getMonth() - months);

    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('total_amount, created_at')
      .gte('created_at', from.toISOString())
      .order('created_at');

    const map = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      map[key] = 0;
    }
    (invoices || []).forEach(inv => {
      const d = new Date(inv.created_at);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (map[key] !== undefined) map[key] += inv.total_amount || 0;
    });

    res.json({ data: Object.entries(map).map(([month, amount]) => ({ month, amount })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCategorySpending = async (req, res) => {
  try {
    const { data: pos } = await supabaseAdmin
      .from('purchase_orders')
      .select('total_amount, rfqs(category)');

    const map = {};
    (pos || []).forEach(po => {
      const cat = po.rfqs?.category || 'Uncategorised';
      map[cat] = (map[cat] || 0) + (po.total_amount || 0);
    });

    res.json({ data: Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getFunnel = async (req, res) => {
  try {
    const [rfqs, quotations, approvals, pos] = await Promise.all([
      supabaseAdmin.from('rfqs').select('id', { count: 'exact' }),
      supabaseAdmin.from('quotations').select('id', { count: 'exact' }),
      supabaseAdmin.from('approvals').select('id', { count: 'exact' }).eq('status', 'approved'),
      supabaseAdmin.from('purchase_orders').select('id', { count: 'exact' }),
    ]);

    res.json({
      data: [
        { stage: 'RFQs Created', count: rfqs.count || 0 },
        { stage: 'Quotations Received', count: quotations.count || 0 },
        { stage: 'Approvals Approved', count: approvals.count || 0 },
        { stage: 'POs Generated', count: pos.count || 0 },
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const exportReport = async (req, res) => {
  try {
    const { type } = req.query;
    let data = [];
    let filename = 'export.csv';
    let headers = [];

    if (type === 'vendors') {
      const { data: rows } = await supabaseAdmin.from('vendors').select('company_name,category,email,phone,status,rating,total_orders');
      data = rows || [];
      headers = ['Company Name', 'Category', 'Email', 'Phone', 'Status', 'Rating', 'Total Orders'];
      filename = 'vendors.csv';
    } else if (type === 'invoices') {
      const { data: rows } = await supabaseAdmin.from('invoices').select('invoice_number,invoice_date,due_date,subtotal,tax_amount,total_amount,status,sent_to_email');
      data = rows || [];
      headers = ['Invoice #', 'Date', 'Due Date', 'Subtotal', 'Tax', 'Total', 'Status', 'Sent To'];
      filename = 'invoices.csv';
    } else if (type === 'rfqs') {
      const { data: rows } = await supabaseAdmin.from('rfqs').select('rfq_number,title,category,priority,deadline,status');
      data = rows || [];
      headers = ['RFQ #', 'Title', 'Category', 'Priority', 'Deadline', 'Status'];
      filename = 'rfqs.csv';
    }

    const csv = [headers.join(','), ...data.map(row => Object.values(row).map(v => `"${v ?? ''}"`).join(','))].join('\n');
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
