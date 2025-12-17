// Document utility functions

export interface DocumentMetadata {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

// Check file size and warn if too large
export function checkFileSize(file: File, maxSizeMB: number = 10): { valid: boolean; warning?: string } {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      warning: `File size (${sizeMB.toFixed(1)}MB) exceeds maximum allowed size (${maxSizeMB}MB). Please compress or use a smaller file.`,
    };
  }
  if (sizeMB > maxSizeMB * 0.8) {
    return {
      valid: true,
      warning: `File size is large (${sizeMB.toFixed(1)}MB). Upload may take longer.`,
    };
  }
  return { valid: true };
}

// Generate preview URL for image files
export function generatePreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      // For PDFs, create a data URL from the first page or use a placeholder
      // In a real app, you'd use a PDF.js library to render the first page
      // For now, create a data URL with a PDF icon placeholder
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw a simple PDF placeholder
        ctx.fillStyle = "#f3f4f6";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#6b7280";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("PDF Document", canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = "16px Arial";
        ctx.fillText(file.name, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 48px Arial";
        ctx.fillText("📄", canvas.width / 2, canvas.height / 2 - 60);
      }
      resolve(canvas.toDataURL());
    } else {
      reject(new Error("Unsupported file type"));
    }
  });
}

// Simulate OCR text extraction (in real app, use Tesseract.js or cloud OCR)
export async function extractTextFromImage(file: File): Promise<string> {
  // Simulate OCR processing
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  const fileName = file.name.toLowerCase();
  
  // Generate realistic mock text based on document type
  if (fileName.includes("passport")) {
    return `PASSPORT
REPUBLIC OF [COUNTRY]
PASSPORT

Surname: DOE
Given Names: JOHN MICHAEL
Nationality: [NATIONALITY]
Date of Birth: 01 JAN 1990
Place of Birth: [CITY], [COUNTRY]
Sex: M
Passport No: AB123456
Date of Issue: 01 JAN 2020
Date of Expiry: 01 JAN 2030
Authority: [PASSPORT AUTHORITY]

Signature of Bearer: _________________`;
  }
  
  if (fileName.includes("bank") || fileName.includes("statement")) {
    return `BANK STATEMENT
[Bank Name]
Account Statement

Account Holder: John Michael Doe
Account Number: ****1234
Statement Period: January 1, 2024 - January 31, 2024

Opening Balance: $45,000.00
Deposits: $5,000.00
Withdrawals: $0.00
Closing Balance: $50,000.00

Transaction History:
01/15/2024 - Deposit - $5,000.00
01/10/2024 - Interest - $50.00

This statement is provided for visa application purposes.`;
  }
  
  if (fileName.includes("admission") || fileName.includes("offer") || fileName.includes("acceptance")) {
    return `LETTER OF ADMISSION

[University Name]
[University Address]
[Date]

Dear [Student Name],

We are pleased to inform you that you have been accepted for admission to [University Name] for the academic year 2024-2025.

PROGRAM DETAILS:
Program: Master of Science in Computer Science
Start Date: September 1, 2024
Duration: 2 years
Tuition Fee: $25,000 per year

CONDITIONS OF ADMISSION:
1. You must maintain a minimum GPA of 3.0
2. You must provide proof of financial support
3. You must submit all required documents before the deadline

We look forward to welcoming you to our campus.

Sincerely,
[Admissions Office]
[University Name]`;
  }
  
  if (fileName.includes("transcript") || fileName.includes("diploma")) {
    return `ACADEMIC TRANSCRIPT

[Institution Name]
[Institution Address]

Student Name: John Michael Doe
Student ID: STU123456
Degree: Bachelor of Science
Major: Computer Science
Graduation Date: May 2023

GPA: 3.75/4.0
Cumulative Credits: 120

Course List:
- Data Structures: A
- Algorithms: A-
- Database Systems: A
- Software Engineering: B+
- Operating Systems: A`;
  }
  
  if (fileName.includes("employment") || fileName.includes("job")) {
    return `EMPLOYMENT LETTER

[Company Name]
[Company Address]
[Date]

To Whom It May Concern,

This letter confirms that John Michael Doe has been employed with [Company Name] since January 1, 2020.

Position: Software Engineer
Employment Status: Full-time
Annual Salary: $75,000
Employment Duration: 4 years

Mr. Doe is a valued employee and we support his application for further studies.

Sincerely,
[Manager Name]
[Company Name]`;
  }
  
  if (fileName.includes("invitation") || fileName.includes("invite")) {
    return `INVITATION LETTER

[Host Name]
[Host Address]
[Date]

To Whom It May Concern,

I am writing to invite [Guest Name] to visit me in [Country] from [Start Date] to [End Date].

Purpose of Visit: Tourism/Family Visit
Relationship: [Relationship]
Accommodation: [Address]
Financial Support: I will provide accommodation and meals

I confirm that I will be responsible for the visitor during their stay.

Sincerely,
[Host Name]
[Host Contact Information]`;
  }
  
  if (fileName.includes("visa") || fileName.includes("permit")) {
    return `VISA / PERMIT DOCUMENT

Document Type: [Visa Type]
Issuing Country: [Country]
Document Number: V123456789
Issue Date: [Date]
Expiry Date: [Date]
Status: Valid

Holder Information:
Name: John Michael Doe
Date of Birth: [Date]
Nationality: [Nationality]

Conditions: [Any conditions or restrictions]`;
  }
  
  // Generic document text that looks realistic
  return `OFFICIAL DOCUMENT

[Document Title]
[Issuing Authority]
[Date]

This document certifies the following information:

Document Number: DOC-${Math.random().toString(36).substring(2, 10).toUpperCase()}
Issue Date: ${new Date().toLocaleDateString()}
Expiry Date: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Holder Information:
Name: [Name]
Date of Birth: [Date]
Identification Number: [ID Number]

This document has been verified and is valid for official purposes.

[Authorized Signature]
[Issuing Authority]`;
}

// Detect document type based on filename and content
export function detectDocumentType(file: File, ocrText?: string): string {
  const name = file.name.toLowerCase();
  
  if (name.includes("passport")) return "Passport";
  if (name.includes("bank") || name.includes("statement")) return "Bank Statement";
  if (name.includes("admission") || name.includes("offer") || name.includes("acceptance")) return "Admission Letter";
  if (name.includes("visa") || name.includes("permit")) return "Visa/Permit";
  if (name.includes("transcript") || name.includes("diploma")) return "Academic Document";
  if (name.includes("employment") || name.includes("job")) return "Employment Letter";
  if (name.includes("invitation") || name.includes("invite")) return "Invitation Letter";
  
  return "Other Document";
}

// Calculate quality score (mock implementation)
export function calculateQualityScore(file: File, ocrText?: string): number {
  let score = 70; // Base score
  
  // File size factor (larger files might be higher quality)
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > 1) score += 10;
  
  // OCR text length factor
  if (ocrText && ocrText.length > 50) score += 10;
  
  // File type factor
  if (file.type === "application/pdf") score += 10;
  
  return Math.min(100, score);
}

// Extract fields from OCR text (mock implementation)
export function extractFields(ocrText: string, documentType: string): Record<string, { value: string; confidence: number }> {
  const fields: Record<string, { value: string; confidence: number }> = {};
  
  if (documentType === "Passport") {
    const passportMatch = ocrText.match(/Passport No[:\s]+([A-Z0-9]+)/i) || ocrText.match(/Passport Number[:\s]+([A-Z0-9]+)/i);
    if (passportMatch) {
      fields["Passport Number"] = { value: passportMatch[1], confidence: 85 };
    }
    
    const expiryMatch = ocrText.match(/Date of Expiry[:\s]+(\d{2}\s+[A-Z]{3}\s+\d{4})/i) || 
                          ocrText.match(/Expiry Date[:\s]+(\d{2}\/\d{2}\/\d{4})/i) ||
                          ocrText.match(/Expiry Date[:\s]+(\d{2}\s+[A-Z]{3}\s+\d{4})/i);
    if (expiryMatch) {
      fields["Expiry Date"] = { value: expiryMatch[1], confidence: 90 };
    }
    
    const nameMatch = ocrText.match(/Surname[:\s]+([A-Z]+)/i);
    if (nameMatch) {
      fields["Surname"] = { value: nameMatch[1], confidence: 88 };
    }
  }
  
  if (documentType === "Bank Statement") {
    const balanceMatch = ocrText.match(/Closing Balance[:\s]+\$?([\d,]+\.?\d*)/i) || 
                         ocrText.match(/Balance[:\s]+\$?([\d,]+\.?\d*)/i);
    if (balanceMatch) {
      fields["Balance"] = { value: `$${balanceMatch[1]}`, confidence: 80 };
    }
    
    const accountMatch = ocrText.match(/Account Number[:\s]+([*0-9]+)/i);
    if (accountMatch) {
      fields["Account Number"] = { value: accountMatch[1], confidence: 75 };
    }
  }
  
  if (documentType === "Admission Letter") {
    const programMatch = ocrText.match(/Program[:\s]+([^\n]+)/i);
    if (programMatch) {
      fields["Program"] = { value: programMatch[1].trim(), confidence: 85 };
    }
    
    const startDateMatch = ocrText.match(/Start Date[:\s]+([^\n]+)/i);
    if (startDateMatch) {
      fields["Start Date"] = { value: startDateMatch[1].trim(), confidence: 80 };
    }
    
    const institutionMatch = ocrText.match(/\[University Name\]|([A-Z][a-z]+ University)/i);
    if (institutionMatch && !institutionMatch[0].includes("[")) {
      fields["Institution"] = { value: institutionMatch[0], confidence: 70 };
    }
  }
  
  if (documentType === "Academic Document") {
    const gpaMatch = ocrText.match(/GPA[:\s]+([\d.]+)/i);
    if (gpaMatch) {
      fields["GPA"] = { value: gpaMatch[1], confidence: 85 };
    }
    
    const degreeMatch = ocrText.match(/Degree[:\s]+([^\n]+)/i);
    if (degreeMatch) {
      fields["Degree"] = { value: degreeMatch[1].trim(), confidence: 80 };
    }
  }
  
  if (documentType === "Employment Letter") {
    const salaryMatch = ocrText.match(/Annual Salary[:\s]+\$?([\d,]+)/i);
    if (salaryMatch) {
      fields["Salary"] = { value: `$${salaryMatch[1]}`, confidence: 80 };
    }
    
    const positionMatch = ocrText.match(/Position[:\s]+([^\n]+)/i);
    if (positionMatch) {
      fields["Position"] = { value: positionMatch[1].trim(), confidence: 85 };
    }
  }
  
  return fields;
}

// Simulate document processing with progress
export function simulateProcessing(
  onProgress: (progress: number) => void,
  onComplete: (result: any) => void
): () => void {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    onProgress(progress);
    
    if (progress >= 100) {
      clearInterval(interval);
      onComplete({
        status: "verified",
        qualityScore: 85,
        processingTime: 3.5,
      });
    }
  }, 300);
  
  return () => clearInterval(interval);
}

// Check for missing information
export function checkMissingInformation(
  documentType: string,
  detectedFields: Record<string, { value: string; confidence: number }>
): string[] {
  const issues: string[] = [];
  const requiredFields: Record<string, string[]> = {
    Passport: ["Passport Number", "Expiry Date", "Name"],
    "Bank Statement": ["Balance", "Account Holder", "Date"],
    "Admission Letter": ["Institution", "Program", "Start Date"],
  };
  
  const required = requiredFields[documentType] || [];
  required.forEach((field) => {
    if (!detectedFields[field] || detectedFields[field].confidence < 70) {
      issues.push(`Missing or unclear: ${field}`);
    }
  });
  
  return issues;
}

// Generate smart suggestions
export function generateSuggestions(
  documentType: string,
  issues: string[]
): string[] {
  const suggestions: string[] = [];
  
  if (issues.some((i) => i.includes("Missing"))) {
    suggestions.push("Ensure all required information is clearly visible");
  }
  
  if (documentType === "Passport") {
    suggestions.push("Make sure passport expiry date is at least 6 months from travel date");
  }
  
  if (documentType === "Bank Statement") {
    suggestions.push("Statement should show sufficient funds for at least 3 months");
  }
  
  return suggestions;
}

