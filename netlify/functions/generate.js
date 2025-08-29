// netlify/functions/generate.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  // Simple health check: /.netlify/functions/generate?ping=1
  if (event.httpMethod === "GET" && event.queryStringParameters?.ping) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, message: "generate is alive" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  try {
    const { message_for, what_to_say, tone, goal, revision } = JSON.parse(event.body || "{}");

    if (!message_for || !what_to_say) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: "Missing fields: message_for and what_to_say are required." }),
      };
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error("Missing OPENAI_API_KEY env var");
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: "Server missing OPENAI_API_KEY." }),
      };
    }

    // Build a clear prompt
    const system = `You are an expert communication coach. 
Write a concise, human, empathetic message tailored for the recipient.
Keep it clear, specific, and in the requested tone. Avoid flowery language.`;

    const user = `
Recipient: ${message_for}
Tone: ${tone || "Neutral"}
Goal: ${goal || "(not specified)"}
Context:
${what_to_say}

${revision ? `Revision request / emphasis: ${revision}` : ""}
Return only the message text (no preamble).
`;

    // Call OpenAI Responses API with GPT-5 mini
const res = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`,
  },
  body: JSON.stringify({
    model: "gpt-5-mini",          // <— the model you wanted
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_output_tokens: 400
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error("OpenAI API error:", res.status, data);
  throw new Error(data?.error?.message || `HTTP ${res.status}`);
}

// Responses API shape — prefer output_text, fall back to the object path
const text =
  data.output_text ??
  data.output?.[0]?.content?.[0]?.text ??
  "";

if (!text) {
  throw new Error("OpenAI returned no text");
}


    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.error("OpenAI returned no text:", data);
      throw new Error("No content from OpenAI");
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, text }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: String(err.message || err) }),
    };
  }
};
