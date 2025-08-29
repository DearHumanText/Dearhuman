// netlify/functions/generate.js
const { getStore } = require('@netlify/blobs');


exports.handler = async (event) => {
try {
if (event.httpMethod !== 'POST') {
return { statusCode: 405, body: 'Method Not Allowed' };
}


const body = JSON.parse(event.body || '{}');
const messageType = body.messageType || 'custom';
const tone = body.tone || 'Warm';
const recipient = body.recipient || '';
const say = body.say || '';
const context = body.context || '';
const clientToken = body.clientToken || null;


// Durable key (for future analytics/history if desired)
const keyBase = (clientToken && `s:${clientToken}`) ||
`ip:${(event.headers['x-forwarded-for'] || 'anon').split(',')[0]}`;


const store = getStore({ name: 'dearhuman-usage' });
let doc = await store.getJSON(keyBase);
if (!doc) { doc = { tier: 'unlimited', createdAt: Date.now() }; }
await store.setJSON(keyBase, doc);


const text = await createMessage({ messageType, tone, recipient, say, context });


return {
statusCode: 200,
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ message: text, meta: { tier: 'unlimited' } })
};
} catch (err) {
console.error(err);
return {
statusCode: 500,
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ error: 'SERVER_ERROR', message: 'Something went wrong.' })
};
}
};


// Replace with your OpenAI call
async function createMessage({ messageType, tone, recipient, say, context }) {
const who = recipient ? `For: ${recipient}\n` : '';
const details = say ? `What you want to say:\n${say}\n\n` : '';
const extra = context ? `Context:\n${context}\n\n` : '';
return `${who}${details}${extra}— Your ${messageType} message in a ${tone} tone will go here.`;
}