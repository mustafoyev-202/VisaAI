# Document Processing Pipeline Architecture

## Overview

The VisaAI document processing pipeline handles document uploads, validation, OCR, analysis, and storage with comprehensive features for production use.

## Architecture Flow

```
1. Client Upload → API Gateway
2. Validate (type, size, malware)
3. Store in Cloud Storage (S3/Azure/GCP)
4. Generate Thumbnail/Preview
5. Queue for OCR Processing
6. Extract Metadata & Index
7. Run Validation Rules
8. Update Database & Notify User
```

## Components

### 1. Upload Pipeline

**API Endpoint:** `POST /api/v1/documents/upload`

**Process:**
1. **File Validation**
   - File type validation (JPEG, PNG, PDF)
   - File size validation (10MB default, 50MB premium)
   - File name validation (sanitization)
   - Malware scanning

2. **Storage**
   - Encrypted storage in S3/Cloud Storage
   - Generate unique storage key
   - Store metadata

3. **Processing Queue**
   - Queue document for processing
   - Priority-based processing (low/normal/high)
   - Retry logic (max 3 retries)

**Request:**
```typescript
FormData {
  file: File
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "fileName": "passport.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "status": "processing",
    "jobId": "uuid",
    "uploadedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. OCR & Analysis Pipeline

**Multi-Stage Processing:**

1. **Preprocessing**
   - Image normalization
   - Format conversion

2. **Deskew**
   - Correct image rotation
   - Align text horizontally

3. **Denoise**
   - Remove noise
   - Clean up artifacts

4. **Enhance**
   - Adjust contrast
   - Improve brightness
   - Sharpen text

5. **OCR**
   - Extract text using Tesseract/Cloud OCR
   - Generate bounding boxes
   - Calculate confidence scores

6. **Field Extraction**
   - Extract structured fields
   - Confidence scoring per field
   - Pattern validation

7. **Classification**
   - Classify document type
   - ML-based classification
   - Confidence scoring

8. **Validation**
   - Validate extracted fields
   - Check against expected patterns
   - Flag low-confidence extractions

**Supported Document Types:**
- Passport
- Bank Statement
- Admission Letter
- Transcript
- Visa/Permit
- Other

### 3. Storage Strategy

**Tiered Storage:**

- **Hot Storage**: Frequently accessed documents (< 30 days)
- **Warm Storage**: Occasionally accessed documents (30-90 days)
- **Cold Storage**: Archived documents (> 90 days)

**Features:**
- Automatic archival after 90 days
- Object versioning
- CDN for document delivery
- Signed URLs with expiration
- Watermarking for sensitive documents
- Automated backup and replication

**Storage Providers:**
- Local (development)
- S3 (production)
- Azure Blob Storage
- Google Cloud Storage

### 4. API Endpoints

#### Upload Document
```
POST /api/v1/documents/upload
Content-Type: multipart/form-data

FormData:
- file: File
```

#### Get Document Status
```
GET /api/v1/documents/status?documentId=uuid
GET /api/v1/documents/status?jobId=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "status": "processing",
    "currentStage": 3,
    "stages": [
      {
        "stage": "validation",
        "status": "completed",
        "startedAt": "2024-01-01T00:00:00Z",
        "completedAt": "2024-01-01T00:00:01Z"
      },
      {
        "stage": "ocr",
        "status": "processing",
        "startedAt": "2024-01-01T00:00:02Z"
      }
    ],
    "progress": 50
  }
}
```

#### Download Document
```
GET /api/v1/documents/download?key=storage-key&token=token&expires=timestamp
GET /api/v1/documents/download?key=storage-key&watermark=true&watermarkText=CONFIDENTIAL
```

**Query Parameters:**
- `key`: Storage key (required)
- `token`: Signed URL token
- `expires`: Expiration timestamp
- `watermark`: Add watermark (true/false)
- `watermarkText`: Watermark text

## Validation Rules

### File Validation

- **Allowed Types**: JPEG, PNG, PDF, TIFF, BMP
- **Max Size**: 10MB (default), 50MB (premium)
- **Malware Scan**: Automatic scanning on upload
- **File Name**: Sanitized, max 255 characters

### Field Validation

**Passport:**
- Passport number: `[A-Z]{1,2}[0-9]{6,9}`
- Expiry date: Date format
- Date of birth: Date format

**Bank Statement:**
- Balance: Currency format
- Account number: 4-20 digits
- Date: Date format

### Confidence Thresholds

- **High Confidence**: > 0.8
- **Medium Confidence**: 0.6 - 0.8
- **Low Confidence**: < 0.6 (requires manual review)

## Processing Stages

1. **Validation**: File type, size, malware
2. **Storage**: Upload to cloud storage
3. **Thumbnail**: Generate thumbnail
4. **OCR**: Extract text
5. **Extraction**: Extract structured fields
6. **Classification**: Classify document type
7. **Validation**: Validate extracted data
8. **Indexing**: Index for search

## Error Handling

**Error Types:**
- `VALIDATION_ERROR`: Invalid file or data
- `SECURITY_ERROR`: Malware detected
- `NOT_FOUND`: Document not found
- `PROCESSING_ERROR`: OCR/processing failed
- `STORAGE_ERROR`: Storage operation failed

**Retry Logic:**
- Automatic retry (max 3 attempts)
- Exponential backoff
- Failed jobs logged for manual review

## Security Features

1. **Malware Scanning**: Automatic scan on upload
2. **Encryption**: Files encrypted at rest
3. **Signed URLs**: Time-limited access
4. **Watermarking**: Optional watermark for sensitive docs
5. **Access Control**: User-based access (future)

## Performance Optimization

1. **Async Processing**: Non-blocking pipeline
2. **Queue System**: Priority-based processing
3. **Caching**: Thumbnail and preview caching
4. **CDN**: Fast document delivery
5. **Tiered Storage**: Cost optimization

## Production Considerations

### Cloud Storage Migration

Replace local storage with cloud storage:

```typescript
import { S3StorageProvider } from "@/lib/documents/storage";

const storageProvider = new S3StorageProvider({
  provider: "s3",
  bucket: "visa-documents",
  region: "us-east-1",
  accessKey: process.env.AWS_ACCESS_KEY,
  secretKey: process.env.AWS_SECRET_KEY,
});
```

### OCR Service Integration

Replace mock OCR with real service:

**Tesseract.js (Server-side):**
```typescript
import Tesseract from 'tesseract.js';

const { data } = await Tesseract.recognize(imageBuffer, 'eng');
```

**Google Cloud Vision:**
```typescript
import { ImageAnnotatorClient } from '@google-cloud/vision';

const client = new ImageAnnotatorClient();
const [result] = await client.textDetection({ image: { content: imageBuffer } });
```

**AWS Textract:**
```typescript
import { TextractClient } from '@aws-sdk/client-textract';

const client = new TextractClient({});
const result = await client.detectDocumentText({ Document: { Bytes: imageBuffer } });
```

### Queue System Migration

Replace in-memory queue with Redis/BullMQ:

```typescript
import Queue from 'bull';

const documentQueue = new Queue('document-processing', {
  redis: { host: 'localhost', port: 6379 }
});

documentQueue.process(async (job) => {
  // Process document
});
```

### Database Integration

Store document metadata in database:

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  user_id UUID,
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  file_size BIGINT,
  mime_type VARCHAR(100),
  status VARCHAR(20),
  storage_tier VARCHAR(10),
  storage_location VARCHAR(500),
  thumbnail_url VARCHAR(500),
  preview_url VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE document_processing_jobs (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  status VARCHAR(20),
  current_stage INTEGER,
  stages JSONB,
  priority VARCHAR(10),
  retry_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Monitoring

**Metrics to Track:**
- Upload success rate
- Processing time per stage
- OCR accuracy
- Storage usage
- Error rates
- Queue depth

**Alerts:**
- High error rate
- Slow processing
- Storage quota exceeded
- OCR failures

## Best Practices

1. **Always validate** files before processing
2. **Use async processing** for long operations
3. **Implement retry logic** for transient failures
4. **Monitor processing times** and optimize slow stages
5. **Archive old documents** to reduce costs
6. **Use CDN** for document delivery
7. **Implement watermarking** for sensitive documents
8. **Track metrics** for performance optimization
9. **Use signed URLs** for secure access
10. **Implement backup** and replication

## Future Enhancements

- [ ] Real-time processing status updates (WebSocket)
- [ ] Batch upload support
- [ ] Advanced ML models for classification
- [ ] Multi-language OCR support
- [ ] Document comparison and diff
- [ ] Automated form filling
- [ ] Integration with external verification services
- [ ] Advanced watermarking (image-based)
- [ ] Document compression and optimization
- [ ] AI-powered document quality scoring

