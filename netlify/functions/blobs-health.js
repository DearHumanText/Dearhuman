// CommonJS function for Netlify
const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_API_TOKEN;

  // Decide mode based on env vars
  const opts = (siteID && token)
    ? { siteID, token }    // Manual mode
    : undefined;           // Auto mode (requires Netlify-injected context)

  try {
    const store = getStore('dearhuman-stash', opts);
    await store.set('health', 'ok');
    const val = await store.get('health', { type: 'text' });
    return {
      statusCode: 200,
      body: `ok:${opts ? 'manual' : 'auto'}`,
      headers: { 'content-type': 'text/plain' }
    };
  } catch (err) {
    // Surface exactly what mode failed and what envs were detected
    const details = {
      mode: opts ? 'manual' : 'auto',
      hasSiteID: Boolean(siteID),
      hasToken: Boolean(token),
      message: err && err.message
    };
    return {
      statusCode: 500,
      body: JSON.stringify(details, null, 2),
      headers: { 'content-type': 'application/json' }
    };
  }
};
