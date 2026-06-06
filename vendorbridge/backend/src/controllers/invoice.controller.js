import { supabaseAdmin } from '../config/supabase.js';
import { generateInvoicePDF } from '../services/pdf.service.js';
import { sendInvoiceEmail } from '../services/email.service.js';
import { logActivity } from '../utils/activityLogger.js';

export const getInvoices = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('invoices')
      .select('*, vendors(*), purchase_orders(po_number), profiles!invoices_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.vendor_id) query = query.eq('vendor_id', req.query.vendor_id);
    if (req.query.po_id) query = query.eq('po_id', req.query.po_id);

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
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*, vendors(*), purchase_orders(*, quotations(*, quotation_items(*)))')
      .eq('id', req.params.id)
      .single();
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
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('*, vendors(*), purchase_orders(po_number, quotations(payment_terms, quotation_items(*)))')
      .eq('id', req.params.id)
      .single();

    const items = (invoice.purchase_orders?.quotations?.quotation_items || []).map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit || '',
      unit_price: item.unit_price || 0,
      total_price: item.total_price || (item.quantity * (item.unit_price || 0)),
    }));

    const pdf = await generateInvoicePDF({
      ...invoice,
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
      .select('*, vendors(*), purchase_orders(po_number, quotations(payment_terms, quotation_items(*)))')
      .eq('id', req.params.id)
      .single();

    const items = (invoice.purchase_orders?.quotations?.quotation_items || []).map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit || '',
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
    }));

    const pdfBuffer = await generateInvoicePDF({
      ...invoice,
      po_number: invoice.purchase_orders?.po_number,
      payment_terms: invoice.purchase_orders?.quotations?.payment_terms,
      items,
    });

    await sendInvoiceEmail({
      to,
      cc,
      subject,
      html: message ? `<p>${message.replace(/\n/g, '<br/>')}</p>` : undefined,
      pdfBuffer,
      invoiceNumber: invoice.invoice_number,
    });

    await supabaseAdmin.from('invoices').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_to_email: to,
    }).eq('id', req.params.id);

    await logActivity(supabaseAdmin, {
      userId: req.user.id, action: 'sent', entityType: 'invoice',
      entityId: invoice.id, entityLabel: invoice.invoice_number,
      description: `Sent invoice to ${to}`,
    });

    res.json({ message: 'Invoice sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
