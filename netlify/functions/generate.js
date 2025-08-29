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

    // Call OpenAI Chat Completions (works on Netlify's Node runtime)
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",       // or "gpt-3.5-turbo" if needed
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("OpenAI API error:", res.status, data);
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
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
