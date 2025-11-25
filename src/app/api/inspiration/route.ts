import { NextResponse } from "next/server";
import OpenAI from "openai";

// Cache inspiration in memory (resets on server restart)
let cachedInspiration: { date: string; message: string } | null = null;

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  // Return cached if same day
  if (cachedInspiration && cachedInspiration.date === today) {
    return NextResponse.json({ message: cachedInspiration.message, cached: true });
  }

  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    // Fallback messages if no API key
    const fallbacks = [
      "Every seed planted is a vote for the future.",
      "In the garden, patience always yields the sweetest fruit.",
      "Watch your garden grow, one day at a time.",
      "The best time to plant was yesterday. The second best time is now.",
      "Gardens teach us that growth happens in seasons.",
      "Nurture your plants and they'll nurture your soul.",
      "A garden is a friend you can visit anytime.",
    ];
    const idx = Math.floor(Date.now() / 86400000) % fallbacks.length;
    return NextResponse.json({ message: fallbacks[idx], cached: false });
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a wise gardening mentor. Generate a single unique, inspiring message about gardening, growing plants, or nurturing life.
The message should be:
- Uplifting and motivational
- Related to gardening, plants, growth, patience, or nature
- Between 10-25 words
- Original and thoughtful (not a famous quote)
- Encouraging for someone tending their greenhouse

Just return the message text, nothing else.`
        },
        {
          role: "user",
          content: `Today's date is ${today}. Generate today's unique gardening inspiration.`
        }
      ],
      temperature: 0.9,
      max_tokens: 100,
    });

    const message = response.choices[0]?.message?.content?.trim() ||
      "Every day in the garden brings new possibilities.";

    // Cache for the day
    cachedInspiration = { date: today, message };

    return NextResponse.json({ message, cached: false });
  } catch (error) {
    console.error("Inspiration API error:", error);
    return NextResponse.json({
      message: "May your garden flourish as beautifully as your dedication to it.",
      error: true
    });
  }
}
