import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const documentSchema = z.object({
  name: z.string(),
  typeHint: z.string().optional(),
  textContent: z.string().min(10),
});

const requestSchema = z.object({
  destinationCountry: z.enum(["canada", "usa"]),
  visaType: z.enum(["student", "tourist"]),
  documents: z.array(documentSchema),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = [
      "You are an expert visa document reviewer. Analyze the provided document text content.",
      "",
      "IMPORTANT: The text content provided is extracted via OCR from the actual document. Even if it contains placeholder-like text or template fields (like [Name], [Date], etc.), analyze the document structure and what information is present or missing.",
      "",
      "For each document, analyze:",
      "1. Document type and classification",
      "2. Key information present (names, dates, amounts, institutions, etc.)",
      "3. Missing critical information for visa applications",
      "4. Potential issues (expired dates, insufficient funds, unclear details)",
      "5. Suggestions for improvement",
      "",
      "Return a JSON array with one object per document containing:",
      " - name: string (document filename)",
      " - inferredType: string (e.g., 'Admission Letter', 'Passport', 'Bank Statement')",
      " - issues: string[] (only flag REAL issues like: expired dates, missing critical fields, insufficient funds, unclear text - DO NOT flag placeholder text as an issue if the document structure is clear)",
      " - suggestions: string[] (actionable suggestions like: 'Ensure all dates are clearly visible', 'Include full institution name', etc.)",
      "",
      "Focus on document completeness and visa requirements, not on OCR quality or placeholder text.",
      "",
      "Documents to analyze:",
      JSON.stringify(parsed.data.documents.map((d: any) => ({
        name: d.name,
        typeHint: d.typeHint,
        textContent: d.textContent.substring(0, 2000), // Limit text to avoid token limits
      }))),
      "",
      "Return ONLY valid JSON array. No markdown, no explanations, just the JSON array.",
    ].join("\n");

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Clean up the response - remove markdown code blocks if present
    text = text.trim();
    if (text.startsWith("```json")) {
      text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (text.startsWith("```")) {
      text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Text:", text);
      // Return a fallback structure
      parsedJson = parsed.data.documents.map((doc: any) => ({
        name: doc.name,
        inferredType: doc.typeHint || "Unknown",
        issues: ["Unable to parse AI response. Please try again."],
        suggestions: ["Re-upload the document with better quality."],
      }));
    }

    // Ensure it's an array
    if (!Array.isArray(parsedJson)) {
      parsedJson = [parsedJson];
    }

    return NextResponse.json(parsedJson);
  } catch (error) {
    console.error("Error in /api/analyze-documents:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}

