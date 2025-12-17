# Security Implementation Documentation

## Overview

Comprehensive security implementation including authentication, authorization, data security, and GDPR compliance.

## Authentication & Authorization

### JWT-Based Authentication

**Registration:**
```
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "consentGiven": true
}
```

**Login:**
```
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "securepassword",
  "totpCode": "123456" // Optional if MFA enabled
}
```

**Token Refresh:**
```
POST /api/v1/auth/refresh
{
  "refreshToken": "refresh_token_here"
}
```

### OAuth2 Integration

**Supported Providers:**
- Google
- Facebook

**Initiate OAuth:**
```
GET /api/v1/auth/oauth?provider=google
```

**Response:**
```json
{
  "authorizationUrl": "https://accounts.google.com/...",
  "state": "state_token"
}
```

### Multi-Factor Authentication (MFA)

**TOTP Support:**
- Time-based One-Time Password (RFC 6238)
- 6-digit codes, 30-second time steps
- Backup codes generation

**SMS OTP:**
- 6-digit codes
- 5-minute expiration
- Integration ready for Twilio/AWS SNS

**Passwordless Authentication:**
- Magic link tokens
- 15-minute expiration
- Email-based login

### Session Management

- Redis-ready session storage
- Session expiration (24 hours)
- Activity tracking
- Session revocation
- IP-based access controls

## Data Security

### Field-Level Encryption

**Encrypted Fields:**
- Email
- Phone Number
- Passport Number
- Account Number
- SSN
- Date of Birth
- Address

**Encryption Algorithm:**
- AES-256-GCM
- Field-specific key derivation
- IV and authentication tag

### Data Masking

**Log Masking:**
- Email: `j***@example.com`
- Phone: `****1234`
- SSN: `***-**-1234`
- Account: `****1234`

### Secure Key Management

- Master key from environment variable
- Key derivation per field
- Key rotation support
- Ready for AWS KMS/HashiCorp Vault integration

### TLS Enforcement

- HTTPS required in production
- HSTS headers
- TLS 1.3 preferred

### CORS Policies

- Configurable allowed origins
- Credential support
- Preflight handling

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
```

### Input Sanitization

- Null byte removal
- Control character filtering
- Whitespace trimming
- HTML encoding
- JSON encoding

## GDPR Compliance

### Right to Access (Data Export)

**Request Export:**
```
POST /api/v1/gdpr/export
Authorization: Bearer <token>
{
  "format": "json" // json, csv, pdf
}
```

**Response:**
```json
{
  "exportId": "uuid",
  "status": "pending",
  "format": "json",
  "requestedAt": "2024-01-01T00:00:00Z",
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

**Get Export:**
```
GET /api/v1/gdpr/export?exportId=uuid
```

### Right to Erasure (Data Deletion)

**Delete User Data:**
- User account deletion
- Session revocation
- Consent record deletion
- Data export deletion
- Audit logging

### Right to Rectification (Data Correction)

**Update User Data:**
- Profile updates
- Email correction
- Data accuracy updates
- Audit logging

### Data Portability

- JSON export format
- Machine-readable format
- Complete user data export

### Consent Management

**Consent Types:**
- Data processing
- Marketing
- Analytics
- Cookies

**Record Consent:**
- Consent history tracking
- Version tracking
- IP address logging
- Timestamp recording

### Audit Logging

**Logged Actions:**
- User registration
- Login/logout
- Data access
- Data modification
- Data deletion
- Consent changes
- Token refresh
- MFA operations

**Audit Log Fields:**
- User ID
- Action
- Resource
- Resource ID
- IP Address
- User Agent
- Timestamp
- Success/Failure
- Error messages

### Data Retention Policies

- Configurable retention periods
- Automatic cleanup
- Consent record retention (7 years)
- Export expiration (30 days)

## Security Headers

All responses include:
- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

## Environment Variables

```bash
# JWT
JWT_SECRET=your_secret_key_here

# Encryption
ENCRYPTION_KEY=your_encryption_key_here

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google

FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/auth/callback/facebook

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Production Considerations

### Database Integration

Replace in-memory stores with database:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  phone_number VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user',
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMP,
  ip_whitelist TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE
);

CREATE TABLE refresh_tokens (
  token VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES sessions(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error TEXT
);

CREATE TABLE consent_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  consent_type VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  version VARCHAR(20),
  ip_address VARCHAR(45)
);

CREATE TABLE data_exports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  format VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  file_url VARCHAR(500),
  requested_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

### Redis Integration

For session and token storage:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Store session
await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));

// Store refresh token
await redis.setex(`refresh:${token}`, 604800, JSON.stringify(refreshToken));
```

### Key Management Service

For encryption keys:

**AWS KMS:**
```typescript
import { KMSClient, GenerateDataKeyCommand } from '@aws-sdk/client-kms';

const kms = new KMSClient({ region: 'us-east-1' });
const command = new GenerateDataKeyCommand({ KeyId: 'alias/visa-encryption' });
const result = await kms.send(command);
```

**HashiCorp Vault:**
```typescript
import vault from 'node-vault';

const client = vault({ endpoint: process.env.VAULT_ADDR });
const secret = await client.read('secret/data/encryption-key');
```

## Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Use strong passwords** (min 8 chars, complexity)
4. **Enable MFA** for sensitive accounts
5. **Log all security events** for audit
6. **Encrypt PII** at rest and in transit
7. **Mask data** in logs
8. **Implement rate limiting** on auth endpoints
9. **Use secure session management**
10. **Regular security audits**

## Security Checklist

- [x] JWT authentication
- [x] OAuth2 integration
- [x] Refresh token rotation
- [x] MFA support (TOTP, SMS)
- [x] Passwordless authentication
- [x] Session management
- [x] IP-based access controls
- [x] Field-level encryption
- [x] Data masking
- [x] Secure key management
- [x] TLS enforcement
- [x] CORS policies
- [x] CSP headers
- [x] Input sanitization
- [x] GDPR compliance
- [x] Audit logging
- [x] Consent management
- [x] Data retention policies

