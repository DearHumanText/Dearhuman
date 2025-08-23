// CommonJS — handles Gumroad Ping, generates AI message, saves by sale_id
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const SITE = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  if (!SITE) {
    return { statusCode: 500, body: 'Missing NETLIFY_SITE_ID in env' };
  }
  const store = getStore('sessions', { siteID: SITE });

  const raw = event.body || '';
  const params = new URLSearchParams(raw);

  const saleId = params.get('sale_id') || params.get('order_id') || params.get('id');
  const productName = params.get('product_name') || '';

  // Session ID may be in different keys depending on Gumroad/custom fields
  let sessionId = params.get('Session ID') || params.get('custom_fields[Session ID]');
  if (!sessionId) {
    for (const [k, v] of params.entries()) {
      if (k.toLowerCase().includes('session id')) { sessionId = v; break; }
    }
  }

  if (!saleId || !sessionId) {
    // Gracefully OK so Gumroad doesn’t retry endlessly
    return { statusCode: 200, body: 'missing saleId or sessionId' };
  }

  // Load stashed answers
  const session = await store.get(`session:${sessionId}`, { type: 'json' });
  const f = (session && session.fields) || {};

  // Plan logic from product name
  const name = (productName || '').toLowerCase();
  const plan = name.includes('unlimited') ? 'unlimited'
            : name.includes('premium')   ? 'premium'
            : 'basic';
  const remaining = plan === 'unlimited' ? 9999 : plan === 'premium' ? 1 : 0;

  // Build the prompt
  const prompt = `
You are DearHuman, an expert at crafting emotionally intelligent messages.
Write a ${f.tone || 'Gentle'} message to ${f.recipient || 'the recipient'} (${f.relationship || 'relationship'}).
Context: ${f.situation || 'No situation provided'}.
Must include: ${f.include || 'the key points the buyer provided'}.
Avoid: ${f.exclude || 'N/A'}.
Keep it sincere, humane, and specific. Return plain text only.
`.trim();

  // Call OpenAI
  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  const aiData = await aiRes.json();
  const message = aiData?.choices?.[0]?.message?.content?.trim()
                  || 'Sorry — please tap Regenerate.';

  // Save result by sale id
  await store.set(
    `sale:${saleId}`,
    JSON.stringify({
      plan,
      remaining_regens: remaining,
      message,
      meta: { sessionId, productName, fields: f, createdAt: new Date().toISOString() }
    }),
    { contentType: 'application/json' }
  );

  return { statusCode: 200, body: 'ok' };
};
