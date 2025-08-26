// netlify/functions/generate.js
const SYSTEM = `You are DearHuman, a concise, human-sounding writing assistant.
Write one message the user can copy/paste. Keep it specific, warm, and clear.
Avoid fluff and corporate tone.`;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { message_for, what_to_say, tone, goal, plan = 'basic', revision_note = '' } =
      JSON.parse(event.body || '{}');

    if (!process.env.OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_API_KEY missing' }) };
    }
    if (!what_to_say) {
      return { statusCode: 400, body: JSON.stringify({ error: 'what_to_say is required' }) };
    }

    const limits = { basic: 140, premium: 220, unlimited: 280 };
    const maxWords = limits[plan] || limits.basic;

    const userPrompt = [
      `Recipient: ${message_for || '—'}`,
      `Tone: ${tone || 'Compassionate'}`,
      `Goal: ${goal || 'Communicate clearly'}`,
      revision_note ? `Revision guidance: ${revision_note}` : null,
      '',
      'Write ONE message they can send.',
      `Target length: up to ${maxWords} words.`,
      'No preamble. If a greeting/sign-off is essential, keep it short.',
      '',
      'User context:',
      `"""${what_to_say}"""`,
    ].filter(Boolean).join('\n');

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'OpenAI error', detail: txt }) };
    }

    const data = await r.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || 'Sorry—no answer generated.';

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answer }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: String(err?.message || err) }),
    };
  }
};
