/**
 * KnowledgePaat Branded Transactional Email Templates
 * Standardized with KnowledgePaat Design System:
 * - Brand Deep Indigo: #1D1855
 * - Accent Violet: #6F42DD
 * - Warm Gold: #FFCB35
 * - Pale Lavender: #F8F7FF
 * - Navy Text: #18143F
 */

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

/**
 * 1. Supabase Auth Active Template: "Confirm signup"
 * GoTrue Template Variables:
 * - {{ .Token }}           -> The 8-digit verification OTP code
 * - {{ .ConfirmationURL }} -> Direct confirmation URL fallback
 * - {{ .Email }}           -> User email address
 * - {{ .SiteURL }}         -> Application site URL
 */
export function getSupabaseConfirmSignupTemplate(): EmailRenderOutput {
  const subject = 'Your KnowledgePaat verification code';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, p, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #F8F7FF; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18143F; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { padding: 0; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    .wrapper { width: 100%; max-width: 580px; margin: 32px auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E8E5F5; overflow: hidden; box-shadow: 0 4px 24px -2px rgba(29, 24, 85, 0.06); }
    .header { background: linear-gradient(135deg, #1D1855 0%, #2D2175 55%, #6F42DD 100%); padding: 32px 28px; text-align: center; }
    .header-logo { display: block; max-width: 170px; margin: 0 auto; }
    .header-text { color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; margin-top: 6px; }
    .header-sub { color: #FFCB35; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .content { padding: 36px 32px; background-color: #FFFFFF; }
    .heading { font-size: 22px; font-weight: 700; color: #18143F; margin-top: 0; margin-bottom: 12px; text-align: center; }
    .instruction { font-size: 15px; line-height: 1.6; color: #4D4775; margin-bottom: 24px; text-align: center; }
    .code-box { background-color: #F8F7FF; border: 2px dashed #6F42DD; border-radius: 12px; padding: 20px 24px; text-align: center; margin: 24px auto; max-width: 360px; }
    .code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6F42DD; margin-bottom: 8px; }
    .code-value { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Monaco, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1D1855; margin: 0; user-select: all; -webkit-user-select: all; }
    .expiry { font-size: 13px; line-height: 1.5; color: #4D4775; text-align: center; margin-top: 16px; margin-bottom: 8px; }
    .security { font-size: 13px; font-weight: 600; color: #18143F; text-align: center; margin-bottom: 20px; }
    .notice { font-size: 12px; line-height: 1.5; color: #756F99; text-align: center; padding-top: 20px; border-top: 1px solid #E8E5F5; margin-top: 20px; }
    .fallback-link { font-size: 12px; line-height: 1.5; color: #756F99; text-align: center; margin-top: 12px; }
    .fallback-link a { color: #6F42DD; text-decoration: underline; }
    .footer { background-color: #F8F7FF; padding: 22px 32px; text-align: center; font-size: 12px; color: #756F99; border-top: 1px solid #E8E5F5; }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7FF; width: 100%; margin: 0; padding: 16px 0;">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <img src="https://knowledgepaat.com/brand/knowledgepaat_logo.png" alt="KnowledgePaat" width="160" class="header-logo" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" />
            <div class="header-text">KnowledgePaat</div>
            <div class="header-sub">Technical Library &amp; Career Intelligence</div>
          </div>
          <div class="content">
            <h1 class="heading">Verify your email</h1>
            <p class="instruction">Enter this code on KnowledgePaat to finish creating your account.</p>
            
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <div class="code-box">
                    <div class="code-label">Verification Code</div>
                    <div class="code-value">{{ .Token }}</div>
                  </div>
                </td>
              </tr>
            </table>

            <p class="expiry">This code is valid for <strong>60 minutes</strong>.</p>
            <p class="security">Never share this code with anyone.</p>
            
            <div class="notice">
              If you did not request this, you can ignore this email.
            </div>

            <div class="fallback-link">
              Alternatively, you can <a href="{{ .ConfirmationURL }}">confirm directly via this link</a>.
            </div>
          </div>
          <div class="footer">
            KnowledgePaat &middot; Automated email
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Verify your email

Enter this code on KnowledgePaat to finish creating your account:

{{ .Token }}

This code is valid for 60 minutes.
Never share this code with anyone.

If you did not request this, you can ignore this email.

Alternatively, you can confirm directly via this link:
{{ .ConfirmationURL }}

KnowledgePaat · Automated email`;

  return { subject, html, text };
}

/**
 * 2. In-App Rendered Verification Code Email (Used for direct transport dispatch)
 */
export function renderVerificationCodeEmail(params: {
  email: string;
  code: string;
  userName?: string;
  expiresInMinutes?: number;
}): EmailRenderOutput {
  const { email, code, userName, expiresInMinutes = 60 } = params;
  const greeting = userName ? `Hello ${userName},` : 'Hello,';

  const subject = 'Your KnowledgePaat verification code';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #F8F7FF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18143F; }
    .wrapper { width: 100%; max-width: 580px; margin: 32px auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E8E5F5; overflow: hidden; box-shadow: 0 4px 24px -2px rgba(29, 24, 85, 0.06); }
    .header { background: linear-gradient(135deg, #1D1855 0%, #2D2175 55%, #6F42DD 100%); padding: 32px 28px; text-align: center; }
    .header-logo { display: block; max-width: 170px; margin: 0 auto; }
    .header-text { color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; margin-top: 6px; }
    .header-sub { color: #FFCB35; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .content { padding: 36px 32px; background-color: #FFFFFF; }
    .heading { font-size: 22px; font-weight: 700; color: #18143F; margin-top: 0; margin-bottom: 12px; text-align: center; }
    .instruction { font-size: 15px; line-height: 1.6; color: #4D4775; margin-bottom: 24px; text-align: center; }
    .code-box { background-color: #F8F7FF; border: 2px dashed #6F42DD; border-radius: 12px; padding: 20px 24px; text-align: center; margin: 24px auto; max-width: 360px; }
    .code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6F42DD; margin-bottom: 8px; }
    .code-value { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Monaco, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1D1855; margin: 0; user-select: all; -webkit-user-select: all; }
    .expiry { font-size: 13px; line-height: 1.5; color: #4D4775; text-align: center; margin-top: 16px; margin-bottom: 8px; }
    .security { font-size: 13px; font-weight: 600; color: #18143F; text-align: center; margin-bottom: 20px; }
    .notice { font-size: 12px; line-height: 1.5; color: #756F99; text-align: center; padding-top: 20px; border-top: 1px solid #E8E5F5; margin-top: 20px; }
    .footer { background-color: #F8F7FF; padding: 22px 32px; text-align: center; font-size: 12px; color: #756F99; border-top: 1px solid #E8E5F5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://knowledgepaat.com/brand/knowledgepaat_logo.png" alt="KnowledgePaat" width="160" class="header-logo" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" />
      <div class="header-text">KnowledgePaat</div>
      <div class="header-sub">Technical Library &amp; Career Intelligence</div>
    </div>
    <div class="content">
      <h1 class="heading">Verify your email</h1>
      <p class="instruction">Enter this code on KnowledgePaat to finish creating your account.</p>
      
      <div class="code-box">
        <div class="code-label">Verification Code</div>
        <div class="code-value">${code}</div>
      </div>

      <p class="expiry">This code is valid for <strong>${expiresInMinutes} minutes</strong>.</p>
      <p class="security">Never share this code with anyone.</p>
      
      <div class="notice">
        If you did not request this, you can ignore this email.
      </div>
    </div>
    <div class="footer">
      KnowledgePaat &middot; Automated email
    </div>
  </div>
</body>
</html>`;

  const text = `Verify your email

${greeting}

Enter this code on KnowledgePaat to finish creating your account:

${code}

This code is valid for ${expiresInMinutes} minutes.
Never share this code with anyone.

If you did not request this, you can ignore this email.

KnowledgePaat · Automated email`;

  return { subject, html, text };
}

/**
 * 2. Purchase Receipt & eBook Access Email
 */
export function renderEBookReceiptEmail(params: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  bookTitle: string;
  editionNumber: number;
  planLabel: string;
  formattedAmount: string;
  readUrl: string;
  canDownloadPdf: boolean;
  downloadUrl?: string;
}): EmailRenderOutput {
  const {
    orderNumber,
    customerName,
    bookTitle,
    editionNumber,
    planLabel,
    formattedAmount,
    readUrl,
    canDownloadPdf,
    downloadUrl,
  } = params;

  const subject = `Your receipt for order ${orderNumber} — ${bookTitle}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F7FF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18143F; }
    .wrapper { width: 100%; max-width: 580px; margin: 32px auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E8E5F5; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(29, 24, 85, 0.05); }
    .header { background: linear-gradient(135deg, #1D1855 0%, #2D2175 50%, #6F42DD 100%); padding: 32px 28px; text-align: center; }
    .header-logo { color: #FFFFFF; font-size: 22px; font-weight: 800; }
    .content { padding: 36px 32px; }
    .receipt-badge { display: inline-block; background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; border: 1px solid #A7F3D0; margin-bottom: 12px; }
    .order-details { background: #F8F7FF; border: 1px solid #E8E5F5; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .detail-label { color: #756F99; }
    .detail-val { font-weight: 600; color: #18143F; text-align: right; }
    .btn { display: inline-block; background-color: #6F42DD; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; text-align: center; margin-top: 16px; }
    .footer { background: #F8F7FF; padding: 24px 32px; text-align: center; font-size: 12px; color: #756F99; border-top: 1px solid #E8E5F5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">KnowledgePaat</div>
    </div>
    <div class="content">
      <div class="receipt-badge">Payment Successful</div>
      <h1 style="font-size: 20px; color: #18143F; margin-top: 0;">Thank you for your purchase, ${customerName}!</h1>
      <p style="font-size: 14px; color: #4D4775; line-height: 1.6;">Your order <strong>${orderNumber}</strong> has been fulfilled and your eBook entitlement is now active in your library.</p>
      
      <div class="order-details">
        <div class="detail-row"><span class="detail-label">Book</span><span class="detail-val">${bookTitle} (Ed. ${editionNumber})</span></div>
        <div class="detail-row"><span class="detail-label">Access Plan</span><span class="detail-val">${planLabel}</span></div>
        <div class="detail-row" style="margin-bottom: 0; padding-top: 8px; border-top: 1px solid #E8E5F5;"><span class="detail-label" style="font-weight: 700; color: #18143F;">Total Paid</span><span class="detail-val" style="font-size: 16px; color: #18143F;">${formattedAmount}</span></div>
      </div>

      <a href="${readUrl}" class="btn">Open eBook Reader</a>
      ${canDownloadPdf && downloadUrl ? `<div style="margin-top: 12px;"><a href="${downloadUrl}" style="color: #6F42DD; font-size: 13px; font-weight: 600; text-decoration: none;">Download Offline PDF Copy &rarr;</a></div>` : ''}
    </div>
    <div class="footer">
      KnowledgePaat &bull; <a href="https://knowledgepaat.com/student/dashboard" style="color: #6F42DD;">Student Dashboard</a> &bull; <a href="https://knowledgepaat.com/contact" style="color: #6F42DD;">Support</a>
    </div>
  </div>
</body>
</html>`;

  const text = `KnowledgePaat — Purchase Receipt

Thank you for your purchase, ${customerName}!

Order Number: ${orderNumber}
Book: ${bookTitle} (Edition ${editionNumber})
Access Plan: ${planLabel}
Total Amount: ${formattedAmount}

You can access and read your eBook immediately at:
${readUrl}

${canDownloadPdf && downloadUrl ? `Download Offline PDF: ${downloadUrl}\n` : ''}
© ${new Date().getFullYear()} KnowledgePaat. All rights reserved.`;

  return { subject, html, text };
}
