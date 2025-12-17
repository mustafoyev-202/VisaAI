import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const bodySchema = z.object({
  question: z.string().min(1, "Please provide a question."),
  language: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      // Fall back to a generic, friendly message instead of hard failing.
      return NextResponse.json(
        {
          answer:
            "I couldn't read your question properly. Please type a short question about a Canada or USA student / visitor visa and try again.",
        },
        { status: 200 },
      );
    }

    const { question, language } = parsed.data;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = [
      "You are an AI visa assistant.",
      "Explain in calm, simple language (around 8th-grade reading level).",
      "Focus on Canada & USA student and visitor visa journeys.",
      "If the question is outside that scope, say so politely.",
      "Do NOT give legal advice; you only explain and clarify.",
      language
        ? `Answer in ${language}, but keep terms clear and simple.`
        : "Answer in clear English.",
      "",
      "User question:",
      question,
    ].join("\n");

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ answer: text });
  } catch (error) {
    console.error("Error in /api/assistant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}


