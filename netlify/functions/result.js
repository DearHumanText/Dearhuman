// netlify/functions/result.js
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const saleId = url.searchParams.get('sale_id');
  if (!saleId) {
    return new Response(JSON.stringify({ error: 'missing sale_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const store = getStore('sessions');
  const data = await store.getJSON(`sale:${saleId}`);

  if (!data) {
    return new Response(JSON.stringify({ status: 'pending' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ status: 'ready', ...data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
