import puppeteer from 'puppeteer';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const buildInvoiceHTML = (d) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:14px;color:#333}
.header{background:#0e1311;color:#fff;padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-end}
.logo{font-size:22px;font-weight:700;letter-spacing:-0.5px}
.invoice-label{font-size:32px;font-weight:800;letter-spacing:-1.5px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:28px 40px;background:#fff;border-bottom:1px solid #f0f0f0}
.meta-block{padding:0}
.meta-label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px}
.meta-value{font-weight:600;color:#0e1311;margin-bottom:4px}
.meta-sub{color:#505050;font-size:13px;line-height:1.5}
.table-wrap{padding:0 40px}
table{width:100%;border-collapse:collapse}
table th{background:#f8f8f8;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #eee;color:#505050}
table td{padding:12px;border-bottom:1px solid #f0f0f0;font-size:13px}
table tr:last-child td{border-bottom:none}
.totals{text-align:right;padding:20px 40px}
.totals p{margin:4px 0;font-size:14px;color:#505050}
.totals .grand{font-size:20px;font-weight:800;color:#000;margin-top:10px;padding-top:10px;border-top:2px solid #0e1311}
.footer{background:#f8f8f8;padding:16px 40px;font-size:11px;color:#888;margin-top:20px;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">VendorBridge</div>
    <div style="font-size:12px;opacity:.6;margin-top:4px">Procurement Platform</div>
  </div>
  <div style="text-align:right">
    <div class="invoice-label">INVOICE</div>
    <div style="font-size:14px;opacity:.8;margin-top:4px">${d.invoice_number}</div>
  </div>
</div>

<div class="meta">
  <div class="meta-block">
    <div class="meta-label">Bill To</div>
    <div class="meta-value">${d.vendor?.company_name || ''}</div>
    <div class="meta-sub">${d.vendor?.address || ''}, ${d.vendor?.city || ''}<br/>GST: ${d.vendor?.gst_number || 'N/A'}</div>
  </div>
  <div class="meta-block">
    <div class="meta-label">Invoice Details</div>
    <div class="meta-sub">
      Invoice #: <strong>${d.invoice_number}</strong><br/>
      Date: ${d.invoice_date}<br/>
      Due Date: ${d.due_date}<br/>
      PO Ref: ${d.po_number || 'N/A'}
    </div>
  </div>
</div>

<div class="table-wrap">
<table>
  <thead>
    <tr>
      <th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>
    ${(d.items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.product_name}</td>
      <td>${item.quantity} ${item.unit || ''}</td>
      <td>${fmt(item.unit_price)}</td>
      <td style="text-align:right">${fmt(item.total_price)}</td>
    </tr>`).join('')}
  </tbody>
</table>
</div>

<div class="totals">
  <p>Subtotal: ${fmt(d.subtotal)}</p>
  <p>GST (${d.tax_percentage || 18}%): ${fmt(d.tax_amount)}</p>
  <p class="grand">Total: ${fmt(d.total_amount)}</p>
</div>

<div class="footer">
  VendorBridge Procurement Platform &nbsp;|&nbsp; ${d.invoice_number} &nbsp;|&nbsp;
  Payment terms: ${d.payment_terms || 'Net 30 days'}
</div>
</body>
</html>`;

export const generateInvoicePDF = async (invoiceData) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(buildInvoiceHTML(invoiceData), { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  });
  await browser.close();
  return pdf;
};

export const generatePOHTML = (d) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:14px;color:#333}
.header{background:#0e1311;color:#fff;padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-end}
.logo{font-size:22px;font-weight:700}
.po-label{font-size:28px;font-weight:800}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:28px 40px;border-bottom:1px solid #f0f0f0}
.meta-label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px}
.meta-value{font-weight:600;color:#0e1311}
.meta-sub{color:#505050;font-size:13px;line-height:1.5}
.ref-row{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:16px 40px;background:#f8f8f8;border-bottom:1px solid #eee;font-size:13px}
.table-wrap{padding:0 40px}
table{width:100%;border-collapse:collapse}
table th{background:#f8f8f8;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #eee;color:#505050}
table td{padding:12px;border-bottom:1px solid #f0f0f0;font-size:13px}
.totals{text-align:right;padding:20px 40px}
.totals p{margin:4px 0;font-size:14px;color:#505050}
.totals .grand{font-size:20px;font-weight:800;color:#000;margin-top:10px;padding-top:10px;border-top:2px solid #0e1311}
.footer{background:#f8f8f8;padding:16px 40px;font-size:11px;color:#888;margin-top:20px}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">VendorBridge</div>
    <div style="font-size:12px;opacity:.6;margin-top:4px">Procurement Platform</div>
  </div>
  <div style="text-align:right">
    <div class="po-label">PURCHASE ORDER</div>
    <div style="font-size:14px;opacity:.8;margin-top:4px">${d.po_number}</div>
  </div>
</div>

<div class="meta">
  <div>
    <div class="meta-label">Bill To</div>
    <div class="meta-value">Your Organisation</div>
    <div class="meta-sub">VendorBridge ERP</div>
  </div>
  <div>
    <div class="meta-label">Vendor</div>
    <div class="meta-value">${d.vendor?.company_name || ''}</div>
    <div class="meta-sub">${d.vendor?.address || ''}, ${d.vendor?.city || ''}<br/>GST: ${d.vendor?.gst_number || 'N/A'}</div>
  </div>
</div>

<div class="ref-row">
  <div><strong>PO Reference:</strong> ${d.po_number}</div>
  <div><strong>Expected Delivery:</strong> ${d.expected_delivery || 'TBD'}</div>
  <div><strong>RFQ Reference:</strong> ${d.rfq_number || 'N/A'}</div>
  <div><strong>Payment Terms:</strong> ${d.payment_terms || 'Net 30 days'}</div>
</div>

<div class="table-wrap">
<table>
  <thead>
    <tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Total</th></tr>
  </thead>
  <tbody>
    ${(d.items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.product_name}</td>
      <td>${item.quantity} ${item.unit || ''}</td>
      <td>₹${Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="text-align:right">₹${Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('')}
  </tbody>
</table>
</div>

<div class="totals">
  <p>Subtotal: ₹${Number(d.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
  <p>GST (${d.tax_percentage || 18}%): ₹${Number(d.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
  <p class="grand">Total: ₹${Number(d.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
</div>

<div class="footer">
  VendorBridge Procurement Platform &nbsp;|&nbsp; ${d.po_number} &nbsp;|&nbsp; Date: ${d.created_at?.split('T')[0] || ''}
</div>
</body>
</html>`;
