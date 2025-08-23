// netlify/functions/ping.js
import { getStore } from '@netlify/blobs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  const params = new URLSearchParams(raw);

  const saleId = params.get('sale_id') || params.get('order_id') || params.get('id');
  const productName = params.get('product_name') || '';

  let sessionId = params.get('Session ID') || params.get('custom_fields[Session ID]');
  if (!sessionId) {
    for (const [k, v] of params.entries()) {
      if (k.toLowerCase().includes('session id')) { sessionId = v; break; }
    }
  }

  if (!saleId || !sessionId) {
    return new Response('missing saleId or sessionId', { status: 200 });
  }

  const store = getStore('sessions');
  const session = await store.get(`session:${sessionId}`, { type: 'json' });
  const f = session?.fields || {};

  const name = (productName || '').toLowerCase();
  const plan = name.includes('unlimited') ? 'unlimited'
            : name.includes('premium')   ? 'premium'
            : 'basic';
  const remaining = plan === 'unlimited' ? 9999 : plan === 'premium' ? 1 : 0;

  const prompt = `
You are DearHuman, an expert at crafting emotionally intelligent messages.
Write a ${f.tone || 'Gentle'} message to ${f.recipient || 'the recipient'} (${f.relationship || 'relationship'}).
Context: ${f.situation || 'No situation provided'}.
Must include: ${f.include || 'the key points the buyer provided'}.
Avoid: ${f.exclude || 'N/A'}.
Keep it sincere, humane, and specific. Return plain text only.
`.trim();

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
  const message = aiData?.choices?.[0]?.message?.content?.trim() || 'Sorry — please tap Regenerate.';

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

  });

  return new Response('ok', { status: 200 });
};
