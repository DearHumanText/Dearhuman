// netlify/functions/stash.js
const { getStore } = require('@netlify/blobs');

// 👇 this will show up in the Netlify Function log if THIS file is running
console.log('[stash] starting — hard-wired siteID in use');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Hard-wire your Site ID so Blobs works even without env vars
  const store = getStore('sessions', { siteID: '2ff4d773-99ce-4241-aa6d-fc0e9e95c39e' });

  let payload = null;
  try { payload = JSON.parse(event.body || '{}'); } catch {}

  const sessionId = payload?.sessionId;
  const fields    = payload?.fields;

  if (!sessionId || !fields) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'need sessionId and fields' })
    };
  }

  await store.set(
    `session:${sessionId}`,
    JSON.stringify({ fields, createdAt: new Date().toISOString() }),
    { contentType: 'application/json' }
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
