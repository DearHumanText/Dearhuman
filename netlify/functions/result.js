// CommonJS version
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const saleId = (event.queryStringParameters && event.queryStringParameters.sale_id) || '';
  if (!saleId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing sale_id' })
    };
  }

  const store = getStore('sessions', { siteID: process.env.SITE_ID });
  const data = await store.get(`sale:${saleId}`, { type: 'json' });

  if (!data) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ready', ...data })
  };
};
