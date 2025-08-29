// netlify/functions/generate.js
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing OPENAI_API_KEY in Netlify env.' }),
    };
  }

  let payloadIn;
  try {
    payloadIn = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON body' }) };
  }

  const {
    message_for = '',
    tone = 'Neutral',
    goal = '',
    what_to_say = '',
    revision = '',
    plan,
  } = payloadIn;

  const system =
    `You are DearHuman, a helpful assistant that writes kind, clear messages. ` +
    `Write in the requested tone and keep it concise and human. Output only the message text.`;

  const user =
`Recipient: ${message_for}
Tone: ${tone}
Goal: ${goal}
Context: ${what_to_say}
${revision ? `Revision request / emphasis: ${revision}` : ''}`;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const body = {
    model,
    temperature: 0.7,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  try {
    const data = await callOpenAI(body, key, 2); // up to 2 retries on 502/503/504
    if (data.error) {
      return { statusCode: 502, body: JSON.stringify({ error: data.error }) };
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No text in response', raw: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, text }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}

async function callOpenAI(body, key, retries = 2) {
  const url = 'https://api.openai.com/v1/chat/completions';

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    if (res.ok) return json;

    // Retry on upstream/gateway issues
    if ([502, 503, 504].includes(res.status) && attempt < retries) {
      await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt))); // 400ms, 800ms
      continue;
    }

    const detail = json?.error?.message || text || res.statusText;
    return { error: `HTTP ${res.status}: ${detail}` };
  }

  return { error: 'Upstream 502/503/504 after retries' };
}
