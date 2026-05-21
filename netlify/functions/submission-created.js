// Netlify automatically invokes this function whenever a form submission is
// verified (no manual wiring required — the filename "submission-created" is special).
// It formats a branded email and sends it via the Resend API.
//
// Required environment variable (set in Netlify → Project configuration → Environment variables):
//   RESEND_API_KEY   – your Resend API key
// Optional (have sensible defaults):
//   NOTIFY_TO        – inbox that receives the alerts (default below)
//   NOTIFY_FROM      – verified "from" address (default uses Resend's test sender)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_TO = process.env.NOTIFY_TO || 'info@greenwoodcapitalholdings.com';
const NOTIFY_FROM = process.env.NOTIFY_FROM || 'Greenwood Capital Holdings <onboarding@resend.dev>';

const GREEN = '#1f3a2e';
const GOLD = '#b8956a';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const REASON_LABELS = {
  seller: 'Business owner exploring a sale',
  broker: 'Broker / M&A advisor with an opportunity',
  operator: 'Operator interested in partnering',
  investor: 'Investor or capital partner',
  lender: 'Lender or financing source',
  strategic: 'Strategic partnership or referral',
  cfo: 'Chief Financial Officer',
  advisor: 'Strategic Advisor',
  portfolio: 'Portfolio Company Leadership',
  acquisitions: 'Acquisitions / Deal Team',
  other: 'Other'
};

exports.handler = async (event) => {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return { statusCode: 500, body: 'Email service not configured' };
  }

  let data = {};
  let formName = 'contact';
  try {
    const body = JSON.parse(event.body || '{}');
    const payload = body.payload || {};
    data = payload.data || {};
    formName = payload.form_name || 'contact';
  } catch (err) {
    console.error('Could not parse submission payload', err);
    return { statusCode: 400, body: 'Bad payload' };
  }

  const isCareers = formName === 'careers';
  const name = data.name || 'Someone';
  const email = data.email || '';
  const phone = data.phone || '';
  const company = data.company || '';
  const location = data.location || '';
  const linkedin = data.linkedin || '';
  const rawReason = data.reason || data.role || '';
  const reason = REASON_LABELS[rawReason] || rawReason;
  const message = data.message || '';

  const formLabel = isCareers ? 'Careers Inquiry' : 'New Inquiry';
  const subject = `${isCareers ? 'Careers' : 'Contact'} — ${name} has reached out`;

  // Build the detail rows
  const fields = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone],
    ['Company', company],
    ['Location', location],
    [isCareers ? 'Area of Interest' : 'Reason for Inquiry', reason],
    ['LinkedIn / Website', linkedin]
  ];
  const rowsHtml = fields
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #eee;color:#8a8a8a;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #eee;color:#1a1a1a;font-size:15px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  const html = `
  <div style="background:#f7f6f2;padding:32px 0;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e1;">
      <tr>
        <td style="background:${GREEN};padding:28px 32px;">
          <div style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.02em;">Greenwood Capital Holdings</div>
          <div style="color:${GOLD};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;margin-top:4px;">${escapeHtml(formLabel)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 8px;">
          <p style="margin:0 0 4px;font-size:18px;color:#1a1a1a;"><strong>${escapeHtml(name)}</strong> has contacted you.</p>
          <p style="margin:0;color:#5a5a5a;font-size:14px;">Submitted via the ${isCareers ? 'careers' : 'contact'} form on greenwoodcapitalholdings.com</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-collapse:collapse;">
            ${rowsHtml}
          </table>
        </td>
      </tr>
      ${
        message
          ? `<tr><td style="padding:8px 32px 24px;">
              <div style="color:#8a8a8a;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">Message</div>
              <div style="background:#f7f6f2;border-left:3px solid ${GOLD};padding:16px;color:#1a1a1a;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
            </td></tr>`
          : ''
      }
      ${
        email
          ? `<tr><td style="padding:0 32px 28px;">
              <a href="mailto:${escapeHtml(email)}" style="display:inline-block;background:${GREEN};color:#ffffff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:600;">Reply to ${escapeHtml(name)}</a>
            </td></tr>`
          : ''
      }
      <tr>
        <td style="background:#0f1a16;padding:18px 32px;color:rgba(255,255,255,0.6);font-size:12px;">
          You can also just hit “Reply” to this email — it goes straight to ${email ? escapeHtml(email) : 'the sender'}.
        </td>
      </tr>
    </table>
  </div>`;

  const text =
    `${name} has contacted you (${formLabel}).\n\n` +
    fields.filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`).join('\n') +
    (message ? `\n\nMessage:\n${message}` : '');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        reply_to: email || undefined,
        subject,
        html,
        text
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend API error:', res.status, errText);
      return { statusCode: 502, body: 'Email send failed' };
    }

    return { statusCode: 200, body: 'Notification sent' };
  } catch (err) {
    console.error('Error sending notification:', err);
    return { statusCode: 500, body: 'Error sending notification' };
  }
};
