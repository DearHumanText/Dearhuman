// CommonJS — handle Gumroad Ping, generate AI message, save by sale_id
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const store = getStore('sessions', { siteID: '2ff4d773-99ce-4241-aa6d-fc0e9e95c39e' });

  const raw = event.body || '';
  const params = new URLSearchParams(raw);

  const saleId = params.get('sale_id') || params.get('order_id') || params.get('id');
  const productName = params.get('product_name') || '';

  // Session ID may come in different keys
  let sessionId = params.get('Session ID') || params.get('custom_fields[Session ID]');
  if (!sessionId) {
    for (const [k, v] of params.entries()) {
      if (k.toLowerCase().includes('session id')) { sessionId = v; break; }
    }
  }

  if (!saleId || !sessionId) {
    // Return 200 so Gumroad doesn’t keep retrying
    return { statusCode: 200, body: 'missing saleId or sessionId' };
  }

  // Load the stashed answers
  const session = await store.get(`session:${sessionId}`, { type: 'json' });
  const f = (session && session.fields) || {};

  // Figure out plan from product name
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

  // Save result for the result page to read later
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
