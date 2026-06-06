import { supabaseAdmin } from '../config/supabase.js';
import { generateInvoicePDF, generatePOHTML } from '../services/pdf.service.js';
import { assertVendorScope, requireVendorIdForUser } from '../utils/vendorAccess.js';
import puppeteer from 'puppeteer';

export const getPOs = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('purchase_orders')
      .select('*, vendors(*), rfqs(rfq_number, title), quotations(payment_terms), profiles!purchase_orders_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);
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

export const createPO = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('purchase_orders')
      .insert({ ...req.body, created_by: req.user.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPO = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('purchase_orders')
      .select('*, vendors(*), rfqs(*, rfq_items(*)), quotations(*, quotation_items(*), vendors(*)), profiles!purchase_orders_created_by_fkey(full_name)')
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

export const updatePOStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabaseAdmin
      .from('purchase_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPOPDF = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('purchase_orders')
      .select('*, vendors(*), rfqs(rfq_number, rfq_items(*)), quotations(quotation_items(*), payment_terms)')
      .eq('id', req.params.id);

    if (req.user.role === 'vendor') {
      const vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
      if (!vendorId) return;
      query = query.eq('vendor_id', vendorId);
    }

    const { data: po, error } = await query.single();
    if (error) throw error;

    const items = (po.quotations?.quotation_items || po.rfqs?.rfq_items || []).map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit || '',
      unit_price: item.unit_price || 0,
      total_price: item.total_price || (item.quantity * (item.unit_price || 0)),
    }));

    const html = generatePOHTML({
      ...po,
      rfq_number: po.rfqs?.rfq_number,
      payment_terms: po.quotations?.payment_terms,
      items,
    });

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    await browser.close();

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${po.po_number}.pdf"`);
    res.send(Buffer.from(pdf));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
