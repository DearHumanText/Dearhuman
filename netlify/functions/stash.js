// CommonJS — save the user's form answers under a session ID
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Hard-wire your site ID so Blobs always works
  const store = getStore('sessions', { siteID: '2ff4d773-99ce-4241-aa6d-fc0e9e95c39e' });

  // Parse JSON body
  let payload = null;
  try { payload = JSON.parse(event.body || '{}'); } catch (_) {}
  const sessionId = payload && payload.sessionId;
  const fields = payload && payload.fields;

  if (!sessionId || !fields) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Bad Request: need sessionId and fields' })
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
