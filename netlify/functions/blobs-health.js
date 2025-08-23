const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  const store = getStore('dearhuman-stash'); // no siteID/token here
  await store.set('health', 'ok');
  const val = await store.get('health', { type: 'text' });
  return {
    statusCode: 200,
    body: val,
    headers: { 'content-type': 'text/plain' }
  };
};
