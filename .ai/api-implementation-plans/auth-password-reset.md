# API Endpoint Implementation Plan: POST /api/auth/password-reset

## 1. Endpoint Overview

Request a password reset email for a user account. This endpoint wraps Supabase Auth's resetPasswordForEmail functionality. For security, the response is always the same whether the email exists or not, preventing email enumeration attacks.

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/auth/password-reset`
- **Parameters:**
  - Required: None (all data in body)
  - Optional: None
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Request Headers
- `Content-Type: application/json`

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Input
interface PasswordResetCommand {
  email: string;
}

// Output
interface PasswordResetResponseDTO {
  message: string;
}

// Errors
interface ApiErrorDTO {
  code: string;
  message: string;
}
```

### Zod Validation Schema (to create)
```typescript
import { z } from 'zod';

export const passwordResetCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
});
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Note:** This response is returned regardless of whether the email exists in the system to prevent email enumeration.

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Invalid email format | Email doesn't match email pattern |
| 500 | `SERVER_ERROR` | Password reset request failed | Unexpected Supabase or server error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  API Route  │─────▶│ AuthService  │─────▶│Supabase Auth│
│             │      │  (Astro)    │      │              │      │             │
└─────────────┘      └─────────────┘      └──────────────┘      └─────────────┘
                            │                    │                     │
                            ▼                    ▼                     ▼
                     1. Parse JSON        2. Call reset         3. Check email
                     2. Validate email    3. Return success     4. Send email
                     3. Call service         (always)              (if exists)
```

### Steps:
1. API route receives POST request with JSON body
2. Parse and validate request body using Zod schema
3. Call `AuthService.requestPasswordReset()` with validated email
4. AuthService calls Supabase `auth.resetPasswordForEmail()`
5. Supabase sends reset email if account exists (silently does nothing if not)
6. Always return 200 with generic success message
7. Client shows confirmation message

## 6. Security Considerations

### Authentication
- No authentication required (public endpoint for account recovery)

### Rate Limiting
- 10 requests per 15 minutes per IP (as per API spec for auth endpoints)
- Critical to prevent abuse of email sending

### Email Enumeration Prevention
- Always return the same response whether email exists or not
- Do not reveal if account exists in any error message
- Supabase handles this gracefully

### Email Security
- Reset link contains secure, time-limited token
- Token expires (typically 1 hour, configured in Supabase)
- Link should use HTTPS

### Redirect URL Configuration
- Configure `redirectTo` to point to password update page
- Must be in allowed redirect URLs in Supabase settings

## 7. Error Handling

### Validation Errors
```typescript
// Invalid email format
if (!validation.success) {
  return new Response(
    JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid email format' }),
    { status: 400 }
  );
}
```

### Supabase Error Handling
```typescript
// Most Supabase errors should be hidden from user for security
// Only expose server errors
function handlePasswordResetError(error: AuthError): { status: number; body: ApiErrorDTO } | null {
  // Log for debugging but don't expose to user
  console.error('Password reset error:', error.message);

  // Rate limiting from Supabase
  if (error.message.includes('rate') || error.message.includes('limit')) {
    return {
      status: 500,
      body: { code: 'SERVER_ERROR', message: 'Password reset request failed' }
    };
  }

  // For most errors, return null to indicate we should still return success
  // This prevents enumeration attacks
  return null;
}
```

## 8. Performance Considerations

### Potential Bottlenecks
- Supabase Auth API latency
- Email sending (handled asynchronously by Supabase)

### Optimizations
- Email sending is non-blocking (Supabase handles async)
- Input validation before Supabase call

### Caching
- Not applicable for password reset endpoint

## 9. Implementation Steps

### Step 1: Add Password Reset Schema
Update file: `src/lib/schemas/auth.schemas.ts`
```typescript
import { z } from 'zod';

// ... existing schemas ...

export const passwordResetCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export type PasswordResetCommandInput = z.infer<typeof passwordResetCommandSchema>;
```

### Step 2: Add Password Reset Method to Auth Service
Update file: `src/lib/services/auth.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type {
  // ... existing imports ...
  PasswordResetCommand,
  PasswordResetResponseDTO,
  ApiErrorDTO
} from '../../types';

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  // ... existing methods ...

  async requestPasswordReset(
    command: PasswordResetCommand,
    redirectTo?: string
  ): Promise<{ data?: PasswordResetResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(command.email, {
      redirectTo: redirectTo || `${import.meta.env.SITE_URL}/auth/password-update`,
    });

    if (error) {
      // Log error but check if we should expose it
      const mappedError = this.handlePasswordResetError(error);
      if (mappedError) {
        return { error: mappedError };
      }
      // For most errors, still return success to prevent enumeration
    }

    // Always return success message
    return {
      data: {
        message: 'If an account exists with this email, a password reset link has been sent.'
      }
    };
  }

  private handlePasswordResetError(error: Error): { status: number; body: ApiErrorDTO } | null {
    console.error('Password reset error:', error.message);

    // Only expose actual server errors
    if (error.message.includes('rate') ||
        error.message.includes('limit') ||
        error.message.includes('server') ||
        error.message.includes('network')) {
      return {
        status: 500,
        body: { code: 'SERVER_ERROR', message: 'Password reset request failed' }
      };
    }

    // For "user not found" or similar, return null to still show success
    return null;
  }

  // ... existing methods ...
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/auth/password-reset.ts`
```typescript
import type { APIRoute } from 'astro';
import { passwordResetCommandSchema } from '../../../lib/schemas/auth.schemas';
import { AuthService } from '../../../lib/services/auth.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, url }) => {
  // 1. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Validate input
  const validation = passwordResetCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Build redirect URL (password update page on same domain)
  const redirectTo = `${url.origin}/auth/password-update`;

  // 4. Call service
  const authService = new AuthService(locals.supabase);
  const result = await authService.requestPasswordReset(validation.data, redirectTo);

  // 5. Return response
  if (result.error) {
    return new Response(
      JSON.stringify(result.error.body),
      { status: result.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(result.data),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### Step 4: Configure Supabase Redirect URLs
In Supabase Dashboard:
1. Go to Authentication → URL Configuration
2. Add `https://yourdomain.com/auth/password-update` to Redirect URLs
3. For development, add `http://localhost:4321/auth/password-update`

### Step 5: Testing Checklist
- [ ] Valid email (existing user) returns 200 and sends email
- [ ] Valid email (non-existing user) returns 200 (no email sent, but same response)
- [ ] Invalid email format returns 400 with VALIDATION_ERROR
- [ ] Empty email returns 400
- [ ] Empty body returns 400
- [ ] Reset email contains valid link to password update page
- [ ] Reset link works and redirects properly
- [ ] Response time is similar for existing vs non-existing emails (timing attack prevention)
