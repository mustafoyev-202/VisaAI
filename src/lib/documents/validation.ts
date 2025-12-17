// Document Validation Utilities

import type { DocumentUpload, DocumentMetadata, DocumentValidation } from "./types";

// File type validation
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/pdf",
  "application/pdf",
  "image/tiff",
  "image/bmp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE_PREMIUM = 50 * 1024 * 1024; // 50MB for premium users

export function validateFileType(mimeType: string): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }
  return { valid: true };
}

export function validateFileSize(size: number, isPremium: boolean = false): { valid: boolean; error?: string } {
  const maxSize = isPremium ? MAX_FILE_SIZE_PREMIUM : MAX_FILE_SIZE;
  if (size > maxSize) {
    return {
      valid: false,
      error: `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
    };
  }
  if (size === 0) {
    return {
      valid: false,
      error: "File is empty",
    };
  }
  return { valid: true };
}

export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  // Check for dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    return {
      valid: false,
      error: "File name contains invalid characters",
    };
  }

  // Check length
  if (fileName.length > 255) {
    return {
      valid: false,
      error: "File name is too long (max 255 characters)",
    };
  }

  return { valid: true };
}

// Malware scan simulation (replace with actual antivirus API in production)
export async function scanForMalware(
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ clean: boolean; threat?: string }> {
  // Simulate scan delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Check for suspicious patterns (very basic - use real antivirus in production)
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.vbs$/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fileName)) {
      return { clean: false, threat: "Suspicious file extension" };
    }
  }

  // Check file header (magic numbers)
  const header = fileBuffer.slice(0, 4).toString("hex");
  const validHeaders = [
    "25504446", // PDF
    "ffd8ffe0", // JPEG
    "ffd8ffe1", // JPEG
    "89504e47", // PNG
  ];

  if (!validHeaders.some((h) => header.startsWith(h))) {
    // Allow if it's a text-based format
    const textStart = fileBuffer.slice(0, 100).toString("utf8");
    if (!textStart.includes("%PDF") && !textStart.match(/^\x89PNG/)) {
      return { clean: false, threat: "Invalid file header" };
    }
  }

  return { clean: true };
}

// Field validation patterns
const VALIDATION_PATTERNS: Record<string, RegExp> = {
  passportNumber: /^[A-Z]{1,2}[0-9]{6,9}$/i,
  date: /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-()]+$/,
  amount: /^\$?\d+(?:,\d{3})*(?:\.\d{2})?$/,
  accountNumber: /^\d{4,20}$/,
};

export function validateField(
  fieldName: string,
  value: string,
  pattern?: RegExp,
): { valid: boolean; error?: string } {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const validationPattern = pattern || VALIDATION_PATTERNS[fieldName.toLowerCase()];
  if (validationPattern && !validationPattern.test(value)) {
    return {
      valid: false,
      error: `${fieldName} format is invalid`,
    };
  }

  return { valid: true };
}

export function validateDocumentMetadata(
  metadata: DocumentMetadata,
  expectedFields?: string[],
): DocumentValidation {
  const errors: DocumentValidation["errors"] = [];
  const warnings: string[] = [];

  // Check overall confidence
  if (metadata.confidence < 0.7) {
    warnings.push(`Low overall confidence: ${(metadata.confidence * 100).toFixed(1)}%`);
  }

  // Validate extracted fields
  if (expectedFields) {
    for (const field of expectedFields) {
      const fieldData = metadata.extractedFields[field];
      if (!fieldData) {
        errors.push({
          field,
          error: "Field not found",
          severity: "error",
        });
      } else if (fieldData.confidence < 0.6) {
        errors.push({
          field,
          error: `Low confidence: ${(fieldData.confidence * 100).toFixed(1)}%`,
          severity: "warning",
        });
      } else {
        // Validate field value
        const validation = validateField(field, fieldData.value);
        if (!validation.valid) {
          errors.push({
            field,
            error: validation.error || "Invalid format",
            severity: "error",
          });
        }
      }
    }
  }

  // Check OCR confidence
  if (metadata.ocrConfidence < 0.7) {
    warnings.push(`Low OCR confidence: ${(metadata.ocrConfidence * 100).toFixed(1)}%`);
  }

  // Check if text is too short (might indicate failed OCR)
  if (metadata.ocrText.length < 50) {
    warnings.push("Extracted text is very short - OCR might have failed");
  }

  return {
    documentId: metadata.documentId,
    isValid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    warnings,
    validatedAt: new Date(),
  };
}

// Check if document needs manual review
export function needsManualReview(metadata: DocumentMetadata): boolean {
  // Low confidence
  if (metadata.confidence < 0.6) return true;

  // Low OCR confidence
  if (metadata.ocrConfidence < 0.65) return true;

  // Many low-confidence fields
  const lowConfidenceFields = Object.values(metadata.extractedFields).filter(
    (f) => f.confidence < 0.6,
  ).length;
  if (lowConfidenceFields > 2) return true;

  // Very short text
  if (metadata.ocrText.length < 30) return true;

  return false;
}

