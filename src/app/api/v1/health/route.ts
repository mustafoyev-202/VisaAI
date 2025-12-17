import { NextRequest } from "next/server";
import { createSuccessResponse } from "@/lib/api/middleware";

export async function GET(request: NextRequest) {
  return createSuccessResponse(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        database: "connected", // Placeholder
        llm: process.env.GEMINI_API_KEY ? "configured" : "not_configured",
        rateLimit: "active",
      },
    },
    undefined,
    200,
  );
}

