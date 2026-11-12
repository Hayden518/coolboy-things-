export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return res.status(500).json({ error: "API key is missing" });
  }

  const messages = req.body?.messages || [];
  const image = req.body?.image;

  const lastIndex = messages.length - 1;

  const input = messages.slice(-12).map((m, i) => {
    const content = [{
      type: "input_text",
      text: String(m.content).slice(0, 4000)
    }];

    if (
      i === Math.min(lastIndex, 11) &&
      image &&
      /^data:image\/(jpeg|png|webp);base64,/.test(image)
    ) {
      content.push({
        type: "input_image",
        image_url: image
      });
    }

    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content
    };
  });

  try {
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions: "You are a helpful AI assistant. Answer questions and analyze uploaded images.",
          input,
          max_output_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: "The AI service returned an error."
      });
    }

    const reply = (data.output || [])
      .filter(x => x.type === "message")
      .flatMap(x => x.content || [])
      .filter(x => x.type === "output_text")
      .map(x => x.text)
      .join("\n");

    return res.status(200).json({
      reply: reply || "No answer was generated."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Could not connect to AI."
    });
  }
}
