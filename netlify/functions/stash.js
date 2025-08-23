// netlify/functions/stash.js
import { getStore } from '@netlify/blobs';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = await req.json().catch(() => null);
  const sessionId = payload?.sessionId;
  const fields = payload?.fields;

  if (!sessionId || !fields) {
    return new Response(JSON.stringify({ error: 'Bad Request: need sessionId and fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get (or auto-create) a store named "sessions"
  const store = getStore('sessions');  // ← this is the correct API

  await store.set(
  `session:${sessionId}`,
  JSON.stringify({ fields, createdAt: new Date().toISOString() }),
  { contentType: 'application/json' }
);


  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
