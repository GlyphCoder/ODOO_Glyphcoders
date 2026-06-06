import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const createTransporter = async () => {
  // If Gmail credentials not set, use a test transporter
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
    });
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const { token } = await oauth2.getAccessToken();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: token,
    },
  });
};

export const sendInvoiceEmail = async ({ to, cc, subject, html, pdfBuffer, invoiceNumber }) => {
  const transport = await createTransporter();
  await transport.sendMail({
    from: `"VendorBridge" <${process.env.GMAIL_USER || 'noreply@vendorbridge.com'}>`,
    to,
    cc,
    subject: subject || `Invoice ${invoiceNumber} from VendorBridge`,
    html: html || `<p>Please find attached invoice <strong>${invoiceNumber}</strong>.</p>`,
    attachments: pdfBuffer
      ? [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      : [],
  });
};

export const sendRFQInvitation = async ({ to, rfqNumber, rfqTitle, deadline, submissionLink }) => {
  const transport = await createTransporter();
  await transport.sendMail({
    from: `"VendorBridge" <${process.env.GMAIL_USER || 'noreply@vendorbridge.com'}>`,
    to,
    subject: `RFQ Invitation: ${rfqTitle} [${rfqNumber}]`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f8f8f8; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 600px; margin: 0 auto; }
    .logo { font-size: 22px; font-weight: 700; color: #0e1311; margin-bottom: 24px; }
    h2 { color: #0e1311; margin-bottom: 8px; }
    .info-box { background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: 600; width: 160px; color: #505050; }
    .btn { display: inline-block; background: #0e1311; color: #fff; padding: 14px 28px;
           border-radius: 10px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { margin-top: 32px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">VendorBridge</div>
    <h2>You have a new RFQ Invitation</h2>
    <p style="color:#505050;">You have been invited to submit a quotation for the following procurement request:</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">RFQ Title:</span><span>${rfqTitle}</span></div>
      <div class="info-row"><span class="info-label">RFQ Number:</span><span>${rfqNumber}</span></div>
      <div class="info-row"><span class="info-label">Deadline:</span><span>${deadline}</span></div>
    </div>
    <a href="${submissionLink}" class="btn">Submit Quotation →</a>
    <div class="footer">
      This is an automated invitation from VendorBridge Procurement Platform.<br/>
      Please do not reply to this email.
    </div>
  </div>
</body>
</html>`,
  });
};
