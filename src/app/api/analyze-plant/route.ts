import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { imageUrl, imageBase64 } = await request.json();

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: "Image URL or base64 data required" },
        { status: 400 }
      );
    }

    const imageContent = imageBase64
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert plant pathologist and horticulturist. Analyze plant images for diseases, pests, nutrient deficiencies, or other issues. Always respond with valid JSON in this exact format:
{
  "diagnosis": "Brief description of what you observe",
  "confidence_score": 0.0 to 1.0,
  "issues_found": ["list", "of", "issues"],
  "suggested_treatment": "Detailed treatment recommendations",
  "plant_health": "healthy" | "minor_issues" | "moderate_issues" | "severe_issues",
  "additional_notes": "Any other observations"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this plant image for any diseases, pests, or nutrient deficiencies. Provide a diagnosis and treatment recommendations.",
              },
              imageContent,
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from response (handle markdown code blocks)
    let diagnosis;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      diagnosis = JSON.parse(jsonStr);
    } catch {
      diagnosis = {
        diagnosis: content,
        confidence_score: 0.5,
        issues_found: [],
        suggested_treatment: "Please consult the AI response above",
        plant_health: "unknown",
        additional_notes: "Could not parse structured response",
      };
    }

    return NextResponse.json(diagnosis);
  } catch (error) {
    console.error("Plant analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
