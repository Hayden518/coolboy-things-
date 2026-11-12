export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is missing from Vercel."
      });
    }

    const { messages = [], image = null } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please send a message."
      });
    }

    const contents = messages.map((message, index) => {
      const parts = [{ text: String(message.content || "") }];

      if (index === messages.length - 1 && image) {
        const match = String(image).match(
          /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/
        );

        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }

      return {
        role: message.role === "assistant" ? "model" : "user",
        parts
      };
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error: "Gemini could not answer. Check the API setup and usage limits."
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({
      error: "Something went wrong on the server."
    });
  }
}
