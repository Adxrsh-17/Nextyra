import dotenv from "dotenv";

dotenv.config();

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0]?.message?.content ?? "No response received from Groq.";
    } catch (e) {
      console.error("Groq invocation failed:", e);
      return `[System: Fallback Mode] Groq API failed. Error: ${(e as Error).message}`;
    }
  }

  if (anthropicKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${errText}`);
      }

      const data = await response.json() as { content: Array<{ text: string }> };
      return data.content[0]?.text ?? "No response received from Claude.";
    } catch (e) {
      console.error("Claude invocation failed:", e);
      return `[System: Fallback Mode] Claude API failed. Error: ${(e as Error).message}`;
    }
  }

  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\nUser Question:\n${userPrompt}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const data = await response.json() as {
        candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      };
      return data.candidates[0]?.content?.parts[0]?.text ?? "No response received from Gemini.";
    } catch (e) {
      console.error("Gemini invocation failed:", e);
      return `[System: Fallback Mode] Gemini API failed. Error: ${(e as Error).message}`;
    }
  }

  // Fallback if no keys are provided
  return `[System Alert] No AI API Key detected! Please configure GROQ_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY in your backend/.env to enable the live AI Coach.

Here is a quick diagnostic response based on your request:
I noticed you asked: "${userPrompt.length > 60 ? userPrompt.slice(0, 60) + "..." : userPrompt}".
To unlock my full context-aware workouts and progression tracking, connect an LLM key in the backend environment file!`;
}
