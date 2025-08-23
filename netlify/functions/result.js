// CommonJS — return the generated message by sale_id for result.html
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const store = getStore('sessions', { siteID: '2ff4d773-99ce-4241-aa6d-fc0e9e95c39e' });

  const saleId = (event.queryStringParameters && event.queryStringParameters.sale_id) || '';
  if (!saleId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing sale_id' })
    };
  }

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
