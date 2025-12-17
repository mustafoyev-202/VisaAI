// OCR Processing Pipeline

import type { OCRResult, ProcessingStage } from "./types";

// Image preprocessing utilities
export async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  // In production, use sharp or similar library
  // For MVP, return as-is
  return imageBuffer;
}

export async function deskewImage(imageBuffer: Buffer): Promise<Buffer> {
  // Deskew logic (in production, use image processing library)
  return imageBuffer;
}

export async function denoiseImage(imageBuffer: Buffer): Promise<Buffer> {
  // Denoise logic
  return imageBuffer;
}

export async function enhanceImage(imageBuffer: Buffer): Promise<Buffer> {
  // Enhance contrast, brightness, etc.
  return imageBuffer;
}

// OCR processing using Tesseract.js (client-side) or cloud OCR
export async function extractTextOCR(
  imageBuffer: Buffer,
  language: string = "eng",
): Promise<OCRResult> {
  // In production, use Tesseract.js server-side or cloud OCR (Google Vision, AWS Textract)
  // For MVP, simulate OCR extraction

  // Simulate OCR processing
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock OCR result based on file content
  const text = imageBuffer.toString("utf8", 0, Math.min(1000, imageBuffer.length));
  const mockText = text.includes("PASSPORT")
    ? "PASSPORT\nName: John Doe\nPassport Number: AB123456\nDate of Birth: 01/01/1990\nExpiry Date: 01/01/2030"
    : text.includes("BANK")
      ? "BANK STATEMENT\nAccount Holder: John Doe\nAccount Number: ****1234\nBalance: $50,000\nDate: 01/15/2024"
      : "Document text extracted successfully. This is a preview of the OCR results.";

  // Simulate bounding boxes
  const lines = mockText.split("\n");
  const boundingBoxes = lines.map((line, idx) => ({
    text: line,
    x: 10,
    y: 20 + idx * 30,
    width: line.length * 10,
    height: 25,
    confidence: 0.85 + Math.random() * 0.1,
  }));

  return {
    text: mockText,
    confidence: 0.85,
    boundingBoxes,
    pages: [
      {
        pageNumber: 1,
        text: mockText,
        confidence: 0.85,
      },
    ],
  };
}

// Multi-stage OCR pipeline
export async function processOCR(
  imageBuffer: Buffer,
  stages: ProcessingStage[] = [],
): Promise<OCRResult> {
  const processingStages: ProcessingStage[] = [
    { stage: "preprocessing", status: "processing", startedAt: new Date() },
    { stage: "deskew", status: "pending" },
    { stage: "denoise", status: "pending" },
    { stage: "enhance", status: "pending" },
    { stage: "ocr", status: "pending" },
  ];

  try {
    // Stage 1: Preprocessing
    let processedBuffer = imageBuffer;
    processingStages[0].status = "processing";
    processedBuffer = await preprocessImage(processedBuffer);
    processingStages[0].status = "completed";
    processingStages[0].completedAt = new Date();

    // Stage 2: Deskew
    processingStages[1].status = "processing";
    processingStages[1].startedAt = new Date();
    processedBuffer = await deskewImage(processedBuffer);
    processingStages[1].status = "completed";
    processingStages[1].completedAt = new Date();

    // Stage 3: Denoise
    processingStages[2].status = "processing";
    processingStages[2].startedAt = new Date();
    processedBuffer = await denoiseImage(processedBuffer);
    processingStages[2].status = "completed";
    processingStages[2].completedAt = new Date();

    // Stage 4: Enhance
    processingStages[3].status = "processing";
    processingStages[3].startedAt = new Date();
    processedBuffer = await enhanceImage(processedBuffer);
    processingStages[3].status = "completed";
    processingStages[3].completedAt = new Date();

    // Stage 5: OCR
    processingStages[4].status = "processing";
    processingStages[4].startedAt = new Date();
    const ocrResult = await extractTextOCR(processedBuffer);
    processingStages[4].status = "completed";
    processingStages[4].completedAt = new Date();

    return ocrResult;
  } catch (error) {
    const failedStage = processingStages.find((s) => s.status === "processing");
    if (failedStage) {
      failedStage.status = "failed";
      failedStage.error = error instanceof Error ? error.message : String(error);
      failedStage.completedAt = new Date();
    }
    throw error;
  }
}

// Field extraction with confidence scoring
export function extractFields(
  ocrText: string,
  documentType: string,
): Record<string, { value: string; confidence: number }> {
  const fields: Record<string, { value: string; confidence: number }> = {};

  if (documentType === "passport") {
    const passportMatch = ocrText.match(/Passport Number[:\s]+([A-Z0-9]+)/i);
    if (passportMatch) {
      fields["passportNumber"] = {
        value: passportMatch[1],
        confidence: 0.9,
      };
    }

    const expiryMatch = ocrText.match(/Expiry Date[:\s]+(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (expiryMatch) {
      fields["expiryDate"] = {
        value: expiryMatch[1],
        confidence: 0.85,
      };
    }

    const dobMatch = ocrText.match(/Date of Birth[:\s]+(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dobMatch) {
      fields["dateOfBirth"] = {
        value: dobMatch[1],
        confidence: 0.85,
      };
    }
  }

  if (documentType === "bank_statement") {
    const balanceMatch = ocrText.match(/Balance[:\s]+\$?([\d,]+\.?\d*)/i);
    if (balanceMatch) {
      fields["balance"] = {
        value: `$${balanceMatch[1]}`,
        confidence: 0.8,
      };
    }

    const accountMatch = ocrText.match(/Account Number[:\s]+([\d*]+)/i);
    if (accountMatch) {
      fields["accountNumber"] = {
        value: accountMatch[1],
        confidence: 0.75,
      };
    }
  }

  return fields;
}

// Document classification
export async function classifyDocument(
  ocrText: string,
  fileName: string,
): Promise<{ type: string; confidence: number }> {
  const text = (ocrText + " " + fileName).toLowerCase();

  const patterns: Array<{ type: string; keywords: string[]; weight: number }> = [
    {
      type: "passport",
      keywords: ["passport", "passport number", "expiry date", "date of birth"],
      weight: 1.0,
    },
    {
      type: "bank_statement",
      keywords: ["bank", "statement", "balance", "account", "transaction"],
      weight: 1.0,
    },
    {
      type: "admission_letter",
      keywords: ["admission", "acceptance", "university", "college", "program"],
      weight: 0.9,
    },
    {
      type: "transcript",
      keywords: ["transcript", "grade", "gpa", "credit", "semester"],
      weight: 0.9,
    },
    {
      type: "visa",
      keywords: ["visa", "permit", "entry", "valid until"],
      weight: 0.8,
    },
  ];

  let bestMatch = { type: "unknown", confidence: 0 };

  for (const pattern of patterns) {
    const matches = pattern.keywords.filter((keyword) => text.includes(keyword)).length;
    const confidence = (matches / pattern.keywords.length) * pattern.weight;

    if (confidence > bestMatch.confidence) {
      bestMatch = { type: pattern.type, confidence };
    }
  }

  return bestMatch;
}

