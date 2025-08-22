// netlify/functions/stash.js
import { createClient } from '@netlify/blobs';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = await req.json().catch(() => null); // { sessionId, fields: {...} }
  const sessionId = payload?.sessionId;
  const fields = payload?.fields;

  if (!sessionId || !fields) {
    return new Response(JSON.stringify({ error: 'Bad Request: need sessionId and fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ✅ Use the Netlify-provided token automatically (no params needed)
  const store = createClient();

  await store.setJSON(`session:${sessionId}`, {
    fields,
    createdAt: new Date().toISOString()
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
