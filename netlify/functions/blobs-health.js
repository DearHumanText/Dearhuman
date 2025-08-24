// netlify/functions/blobs-health.js
const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  // Emit a fingerprint so we KNOW this code deployed
  const fingerprint = 'v7-cjs-explicit-opts';

  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_API_TOKEN;

  try {
    // *** FORCE MANUAL MODE ***
    const store = getStore('dearhuman-stash', { siteID, token });

    await store.setJSON('health-check', { ok: true, t: Date.now(), fp: fingerprint });
    const val = await store.get('health-check', { type: 'json' });

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, mode: 'manual', fp: fingerprint, wrote: val }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        fp: fingerprint,
        siteID,
        token: token ? 'present' : 'missing',
        message: err && err.message,
      }),
    };
  }
};
