import { supabaseAdmin } from '../config/supabase.js';
import { generateInvoicePDF } from '../services/pdf.service.js';
import { sendInvoiceEmail } from '../services/email.service.js';
import { logActivity } from '../utils/activityLogger.js';
import { assertVendorScope, requireVendorIdForUser } from '../utils/vendorAccess.js';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatCurrency = (value = 0) => `&#8377;${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const mapInvoiceItems = (invoice) => (
  invoice.purchase_orders?.quotations?.quotation_items || []
).map(item => ({
  product_name: item.product_name,
  quantity: item.quantity,
  unit: item.unit || '',
  unit_price: item.unit_price || 0,
  total_price: item.total_price || (item.quantity * (item.unit_price || 0)),
}));

const buildInvoiceEmailHTML = ({ invoice, items, note }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin: 0; padding: 24px; background: #f6f7f8; color: #111827; font-family: Arial, sans-serif; }
    .card { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
    .header { padding: 28px 32px; border-bottom: 1px solid #eef0f2; display: flex; justify-content: space-between; gap: 24px; }
    .brand { font-size: 22px; font-weight: 700; }
    .muted { color: #6b7280; font-size: 13px; line-height: 1.5; }
    .title { font-size: 28px; font-weight: 800; text-align: right; }
    .section { padding: 24px 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .label { color: #9ca3af; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 8px; }
    .strong { font-weight: 700; }
    .meta { margin: 0 32px 24px; padding: 16px 18px; background: #f9fafb; border-radius: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    table { width: calc(100% - 64px); margin: 0 32px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    th { padding: 12px 14px; background: #f9fafb; color: #4b5563; font-size: 12px; text-align: left; text-transform: uppercase; }
    td { padding: 14px; border-top: 1px solid #eef0f2; font-size: 14px; }
    .right { text-align: right; }
    .totals { width: 280px; margin: 24px 32px 32px auto; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand { border-top: 1px solid #111827; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 800; }
    .note { margin: 0 32px 24px; padding: 14px 16px; background: #f9fafb; border-left: 3px solid #111827; color: #374151; }
    .footer { padding: 18px 32px; background: #f9fafb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="brand">VendorBridge</div>
        <div class="muted">Procurement Platform</div>
      </div>
      <div>
        <div class="title">INVOICE</div>
        <div class="muted right">${escapeHtml(invoice.invoice_number)}</div>
        <div class="muted right">${formatDate(invoice.invoice_date)}</div>
      </div>
    </div>

    <div class="section grid">
      <div>
        <div class="label">From Procurement Officer</div>
        <div class="strong">${escapeHtml(invoice.profiles?.full_name || 'Procurement Officer')}</div>
        <div class="muted">Your Organisation</div>
        <div class="muted">VendorBridge ERP</div>
      </div>
      <div>
        <div class="label">Bill To (Vendor)</div>
        <div class="strong">${escapeHtml(invoice.vendors?.company_name || 'Vendor')}</div>
        <div class="muted">${escapeHtml(invoice.vendors?.address || '')}</div>
        ${invoice.vendors?.gst_number ? `<div class="muted">GST: ${escapeHtml(invoice.vendors.gst_number)}</div>` : ''}
      </div>
    </div>

    <div class="meta">
      <div><span class="muted">PO Reference:</span> <span class="strong">${escapeHtml(invoice.purchase_orders?.po_number || 'N/A')}</span></div>
      <div><span class="muted">Due Date:</span> <span class="strong">${formatDate(invoice.due_date)}</span></div>
    </div>

    ${note ? `<div class="note">${escapeHtml(note).replace(/\n/g, '<br/>')}</div>` : ''}

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.product_name)}</td>
            <td>${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td class="right strong">${formatCurrency(item.total_price)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span class="muted">Subtotal:</span><span class="strong">${formatCurrency(invoice.subtotal)}</span></div>
      <div class="total-row"><span class="muted">Tax (${escapeHtml(invoice.tax_percentage || 0)}%):</span><span class="strong">${formatCurrency(invoice.tax_amount)}</span></div>
      <div class="total-row grand"><span>Total:</span><span>${formatCurrency(invoice.total_amount)}</span></div>
    </div>

    <div class="footer">
      This invoice is attached as a PDF. Please review the details and process it as per your payment terms.
    </div>
  </div>
</body>
</html>`;

export const getInvoices = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('invoices')
      .select('*, vendors(*), purchase_orders(po_number), profiles!invoices_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.po_id) query = query.eq('po_id', req.query.po_id);
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

export const createInvoice = async (req, res) => {
  try {
    const { po_id, invoice_date, due_date, tax_percentage = 18 } = req.body;

    const { data: po } = await supabaseAdmin
      .from('purchase_orders')
      .select('*, quotations(*, quotation_items(*))')
      .eq('id', po_id)
      .single();

    const subtotal = po.subtotal || 0;
    const tax_amount = (subtotal * tax_percentage) / 100;
    const total_amount = subtotal + tax_amount;

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .insert({
        po_id,
        vendor_id: po.vendor_id,
        invoice_date: invoice_date || new Date().toISOString().split('T')[0],
        due_date: due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        subtotal,
        tax_percentage,
        tax_amount,
        total_amount,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (error) throw error;

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'created', entityType: 'invoice',
      entityId: data.id, entityLabel: data.invoice_number,
      description: `Generated invoice for PO ${po.po_number}`,
    });

    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('invoices')
      .select('*, vendors(*), purchase_orders(*, quotations(*, quotation_items(*))), profiles!invoices_created_by_fkey(full_name)')
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

export const updateInvoice = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
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

export const getInvoicePDF = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('invoices')
      .select('*, vendors(*), purchase_orders(po_number, quotations(payment_terms, quotation_items(*))), profiles!invoices_created_by_fkey(full_name)')
      .eq('id', req.params.id);

    if (req.user.role === 'vendor') {
      const vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
      if (!vendorId) return;
      query = query.eq('vendor_id', vendorId);
    }

    const { data: invoice, error } = await query.single();
    if (error) throw error;

    const items = mapInvoiceItems(invoice);

    const pdf = await generateInvoicePDF({
      ...invoice,
      vendor: invoice.vendors,
      po_number: invoice.purchase_orders?.po_number,
      payment_terms: invoice.purchase_orders?.quotations?.payment_terms,
      items,
    });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(Buffer.from(pdf));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const sendInvoice = async (req, res) => {
  try {
    const { to, cc, subject, message } = req.body;
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('*, vendors(*), purchase_orders(po_number, quotations(payment_terms, quotation_items(*))), profiles!invoices_created_by_fkey(full_name)')
      .eq('id', req.params.id)
      .single();

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const recipient = to || invoice.vendors?.email;
    if (!recipient) {
      return res.status(400).json({ error: 'Vendor email is missing. Add an email to the vendor or enter one before sending.' });
    }

    const items = mapInvoiceItems(invoice);

    const pdfBuffer = await generateInvoicePDF({
      ...invoice,
      vendor: invoice.vendors,
      po_number: invoice.purchase_orders?.po_number,
      payment_terms: invoice.purchase_orders?.quotations?.payment_terms,
      items,
    });

    await sendInvoiceEmail({
      to: recipient,
      cc,
      subject: subject || `Invoice ${invoice.invoice_number} from VendorBridge`,
      html: buildInvoiceEmailHTML({ invoice, items, note: message }),
      pdfBuffer,
      invoiceNumber: invoice.invoice_number,
    });

    await supabaseAdmin.from('invoices').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_to_email: recipient,
    }).eq('id', req.params.id);

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'sent', entityType: 'invoice',
      entityId: invoice.id, entityLabel: invoice.invoice_number,
      description: `Sent invoice to ${recipient}`,
    });

    res.json({ message: 'Invoice sent successfully' });
  } catch (err) {
    if (err.message?.includes('Gmail OAuth client is invalid')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};
