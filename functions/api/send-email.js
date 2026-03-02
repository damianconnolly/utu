/**
 * Cloudflare Pages Function: POST /api/send-email
 *
 * Required environment variables (set in Cloudflare Pages dashboard):
 *   MAILERSEND_API_KEY - Your MailerSend API token
 *   CONTACT_EMAIL_FROM - A verified sender address on your MailerSend domain
 *
 * Optional environment variables:
 *   CONTACT_EMAIL_TO   - Recipient address (defaults to upminstertownunitedfc@gmail.com)
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { fullname = '', email = '', subject = '', message = '' } = body;

    // Basic validation
    if (!fullname.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      return jsonResponse({ success: false, error: 'All fields are required.' }, 400);
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ success: false, error: 'Please enter a valid email address.' }, 400);
    }

    const apiKey = env.MAILERSEND_API_KEY;
    const fromEmail = env.CONTACT_EMAIL_FROM;
    const toEmail = env.CONTACT_EMAIL_TO || 'upminstertownunitedfc@gmail.com';

    if (!apiKey || !fromEmail) {
      console.error('Missing MAILERSEND_API_KEY or CONTACT_EMAIL_FROM environment variables');
      return jsonResponse({ success: false, error: 'Email service is not configured. Please contact us directly.' }, 500);
    }

    const emailBody = [
      `Name:    ${fullname}`,
      `Email:   ${email}`,
      `Subject: ${subject}`,
      '',
      'Message:',
      message,
    ].join('\n');

    const msResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: 'UTU Website' },
        to: [{ email: toEmail }],
        reply_to: { email: email.trim(), name: fullname.trim() },
        subject: `[UTU Website] ${subject.trim()}`,
        text: emailBody,
      }),
    });

    // MailerSend returns 202 Accepted on success
    if (msResponse.status === 202) {
      return jsonResponse({ success: true });
    }

    const errorText = await msResponse.text();
    console.error('MailerSend error', msResponse.status, errorText);
    return jsonResponse({ success: false, error: 'Failed to send your message. Please try again later.' }, 502);
  } catch (err) {
    console.error('Unexpected error in send-email function:', err);
    return jsonResponse({ success: false, error: 'An unexpected error occurred. Please try again later.' }, 500);
  }
}

// Only allow POST; return 405 for everything else
export async function onRequest(context) {
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  return new Response('Method Not Allowed', { status: 405 });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
