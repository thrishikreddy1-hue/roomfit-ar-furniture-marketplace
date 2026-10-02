const DEFAULT_GRAPH_API_VERSION = 'v22.0';

function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

async function notifyShopOfEnquiry(shop, enquiry, {
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (shop.whatsappNotifications !== true) return { sent: false, reason: 'consent_required' };

  const recipient = normalizePhone(shop.phone);
  if (!recipient) return { sent: false, reason: 'invalid_shop_phone' };

  const { WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_TEMPLATE_NAME } = env;
  if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID || !WA_TEMPLATE_NAME) {
    return { sent: false, reason: 'not_configured' };
  }
  if (typeof fetchImpl !== 'function') throw new Error('WhatsApp notifications require fetch support');

  const version = env.WA_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
  const response = await fetchImpl(
    `https://graph.facebook.com/${version}/${encodeURIComponent(WA_PHONE_NUMBER_ID)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: WA_TEMPLATE_NAME,
          language: { code: env.WA_TEMPLATE_LANGUAGE || 'en_US' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: String(enquiry.productName).slice(0, 256) },
              { type: 'text', text: String(enquiry.name).slice(0, 256) },
              { type: 'text', text: String(enquiry.phone).slice(0, 256) },
              { type: 'text', text: String(enquiry.message).slice(0, 900) },
              { type: 'text', text: String(enquiry.id).slice(0, 256) },
            ],
          }],
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Meta WhatsApp API returned ${response.status}: ${details.slice(0, 500)}`);
  }

  return { sent: true };
}

module.exports = { notifyShopOfEnquiry };
