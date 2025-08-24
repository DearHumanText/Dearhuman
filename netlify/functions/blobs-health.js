// netlify/functions/blobs-health.js
const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    // Pull values directly from Netlify environment variables
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_TOKEN;

    // Use those values to connect to your Blob store
    const store = getStore('dearhuman-stash', { siteID, token });

    // Simple test: write a health-check JSON blob
    await store.setJSON('health-check', { ok: true, time: Date.now() });

    // Return confirmation that things are working
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: "manual",
        siteID: !!siteID,
        token: !!token,
        message: "Blob store connection successful"
      }),
    };
  } catch (error) {
    // Catch and return any errors so you can debug
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
