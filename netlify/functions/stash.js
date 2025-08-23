// CommonJS — stores the user's form answers under a session ID
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Use the site ID provided by Netlify; try both common env names.
  const SITE = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  if (!SITE) {
    return { statusCode: 500, body: 'Missing NETLIFY_SITE_ID in env' };
  }
  const store = getStore('sessions', { siteID: SITE });

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
