const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_TOKEN;

    const store = getStore('dearhuman-stash', { siteID, token });

    await store.setJSON('health-check', { ok: true, time: Date.now() });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: "manual", siteID: !!siteID, token: !!token }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        mode: "manual",
        hasSiteID: !!process.env.NETLIFY_SITE_ID,
        hasToken: !!process.env.NETLIFY_API_TOKEN,
        message: error.message,
      }),
    };
  }
};
