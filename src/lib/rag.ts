import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { type VisaCountry, type VisaType, VISA_RULE_CHUNKS } from "./visaRules";

export interface VisaProfile {
  nationality: string;
  currentCountry: string;
  destinationCountry: VisaCountry;
  visaType: VisaType;
  purpose: string;
  durationMonths?: number;
  age?: number;
  education?: string;
  jobInfo?: string;
  fundsAvailable?: number;
  estimatedCosts?: number;
  studyGapYears?: number;
  priorRejection?: boolean;
}

export interface RetrievedRule {
  id: string;
  title: string;
  text: string;
}

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  modelName: "text-embedding-004",
});

async function embed(text: string): Promise<number[]> {
  return embeddings.embedQuery(text);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveRelevantRules(
  profile: VisaProfile,
  topK = 4,
): Promise<RetrievedRule[]> {
  const filtered = VISA_RULE_CHUNKS.filter(
    (chunk) =>
      chunk.country === profile.destinationCountry &&
      chunk.visaType === profile.visaType,
  );

  if (!filtered.length) return [];

  const queryParts = [
    `Nationality: ${profile.nationality}`,
    `Current country: ${profile.currentCountry}`,
    `Destination: ${profile.destinationCountry}`,
    `Visa type: ${profile.visaType}`,
    `Purpose: ${profile.purpose}`,
    profile.durationMonths
      ? `Planned duration (months): ${profile.durationMonths}`
      : "",
    profile.age ? `Age: ${profile.age}` : "",
    profile.education ? `Education: ${profile.education}` : "",
    profile.jobInfo ? `Job info: ${profile.jobInfo}` : "",
    profile.fundsAvailable
      ? `Funds available: ${profile.fundsAvailable}`
      : "",
    profile.estimatedCosts
      ? `Estimated tuition + living costs: ${profile.estimatedCosts}`
      : "",
    profile.studyGapYears ? `Study gap in years: ${profile.studyGapYears}` : "",
    typeof profile.priorRejection === "boolean"
      ? `Prior visa rejection: ${profile.priorRejection ? "yes" : "no"}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const queryEmbedding = await embed(queryParts);

  const scored = await Promise.all(
    filtered.map(async (chunk) => {
      const embedding = await embed(chunk.text);
      const score = cosineSimilarity(queryEmbedding, embedding);
      return { chunk, score };
    }),
  );

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk }) => ({
      id: chunk.id,
      title: chunk.title,
      text: chunk.text,
    }));
}

