// netlify/functions/blobs-health.js
const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_TOKEN;

    // FORCE manual mode by passing siteID + token explicitly
    const store = getStore('dearhuman-stash', {
      siteID: siteID,
      token: token,
    });

    // Write a test value into the Blob store
    await store.setJSON('health-check', { ok: true, time: Date.now() });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: "manual",
        siteID,
        token: token ? "present" : "missing",
        message: "Blob store connection successful ✅"
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN ? "present" : "missing",
        message: error.message,
      }),
    };
  }
};
