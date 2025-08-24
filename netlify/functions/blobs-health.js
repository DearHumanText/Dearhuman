// netlify/functions/blobs-health.js
const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_TOKEN;

    // Explicitly pass siteID + token to getStore
    const store = getStore('dearhuman-stash', { siteID, token });

    // Write a test value
    await store.setJSON('health-check', { ok: true, time: Date.now() });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: "manual",
        siteID,
        token: token ? "present" : "missing",
        message: "Blob store connection successful"
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        mode: "manual",
        siteID: process.env.NETLIFY_SITE_ID || null,
        token: process.env.NETLIFY_API_TOKEN ? "present" : "missing",
        message: error.message,
      }),
    };
  }
};
