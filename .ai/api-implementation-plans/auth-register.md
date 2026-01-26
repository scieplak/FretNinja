# API Endpoint Implementation Plan: POST /api/auth/register

## 1. Endpoint Overview

Register a new user account in the FretNinja application. This endpoint wraps Supabase Auth's signUp functionality with consistent error handling and validation. Upon successful registration, a trigger in the database automatically creates a corresponding profile record.

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/auth/register`
- **Parameters:**
  - Required: None (all data in body)
  - Optional: None
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Request Headers
- `Content-Type: application/json`

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Input
interface RegisterCommand {
  email: string;
  password: string;
}

// Output
interface AuthUserDTO {
  id: string;
  email: string;
}

interface RegisterResponseDTO {
  user: AuthUserDTO;
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

export const registerCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

## 4. Response Details

### Success Response (201 Created)
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "message": "Registration successful. Please check your email for confirmation."
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Invalid email format | Email doesn't match email pattern |
| 400 | `VALIDATION_ERROR` | Password must be at least 8 characters | Password too short |
| 409 | `EMAIL_EXISTS` | An account with this email already exists | Supabase returns user_already_exists |
| 500 | `SERVER_ERROR` | Registration failed | Unexpected Supabase or server error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  API Route  │─────▶│ AuthService  │─────▶│Supabase Auth│
│             │      │  (Astro)    │      │              │      │             │
└─────────────┘      └─────────────┘      └──────────────┘      └─────────────┘
                            │                    │                     │
                            ▼                    ▼                     ▼
                     1. Parse JSON        2. Call signUp        3. Create user
                     2. Validate input    3. Map errors         4. Trigger creates
                     3. Call service      4. Return DTO            profile
```

### Steps:
1. API route receives POST request with JSON body
2. Parse and validate request body using Zod schema
3. Call `AuthService.register()` with validated command
4. AuthService calls Supabase `auth.signUp()` with email and password
5. On success: Supabase creates user in `auth.users`, database trigger creates profile
6. Map Supabase response to `RegisterResponseDTO`
7. Return 201 with response body

## 6. Security Considerations

### Authentication
- No authentication required (public endpoint)

### Rate Limiting
- 10 requests per 15 minutes per IP (as per API spec)
- Implement using middleware or external service

### Data Validation
- Validate email format strictly
- Enforce minimum password length (8 characters)
- Sanitize input to prevent injection attacks (handled by Supabase)

### Sensitive Data
- Never log passwords
- Never return password in responses
- Use HTTPS for all communications

### Email Enumeration Protection
- The 409 response reveals email existence, which is acceptable per spec
- Consider rate limiting to prevent enumeration attacks

## 7. Error Handling

### Validation Errors
```typescript
// Zod validation failed
return new Response(
  JSON.stringify({ code: 'VALIDATION_ERROR', message: error.issues[0].message }),
  { status: 400 }
);
```

### Supabase Error Mapping
```typescript
// Map Supabase auth errors to API errors
function mapSupabaseAuthError(error: AuthError): { status: number; body: ApiErrorDTO } {
  if (error.message.includes('User already registered')) {
    return {
      status: 409,
      body: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' }
    };
  }

  // Log unexpected errors for debugging
  console.error('Registration error:', error.message);
  return {
    status: 500,
    body: { code: 'SERVER_ERROR', message: 'Registration failed' }
  };
}
```

## 8. Performance Considerations

### Potential Bottlenecks
- Supabase Auth API latency (external service)
- Email sending (handled by Supabase, non-blocking)

### Optimizations
- Input validation before Supabase call (fail fast)
- No database queries needed (trigger handles profile creation)

### Caching
- Not applicable for registration endpoint

## 9. Implementation Steps

### Step 1: Create Zod Validation Schemas
Create file: `src/lib/schemas/auth.schemas.ts`
```typescript
import { z } from 'zod';

export const registerCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterCommandInput = z.infer<typeof registerCommandSchema>;
```

### Step 2: Create Auth Service
Create file: `src/lib/services/auth.service.ts`
```typescript
import type { SupabaseClient } from '../db/supabase.client';
import type { RegisterCommand, RegisterResponseDTO, ApiErrorDTO } from '../../types';

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  async register(command: RegisterCommand): Promise<{ data?: RegisterResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    const { data, error } = await this.supabase.auth.signUp({
      email: command.email,
      password: command.password,
    });

    if (error) {
      return { error: this.mapAuthError(error) };
    }

    if (!data.user) {
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Registration failed' }
        }
      };
    }

    return {
      data: {
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
        message: 'Registration successful. Please check your email for confirmation.',
      },
    };
  }

  private mapAuthError(error: Error): { status: number; body: ApiErrorDTO } {
    if (error.message.includes('User already registered')) {
      return {
        status: 409,
        body: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' }
      };
    }

    console.error('Registration error:', error.message);
    return {
      status: 500,
      body: { code: 'SERVER_ERROR', message: 'Registration failed' }
    };
  }
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/auth/register.ts`
```typescript
import type { APIRoute } from 'astro';
import { registerCommandSchema } from '../../../lib/schemas/auth.schemas';
import { AuthService } from '../../../lib/services/auth.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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
  const validation = registerCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0].message
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Call service
  const authService = new AuthService(locals.supabase);
  const result = await authService.register(validation.data);

  // 4. Return response
  if (result.error) {
    return new Response(
      JSON.stringify(result.error.body),
      { status: result.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(result.data),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### Step 4: Add Rate Limiting (Optional - Future Enhancement)
Consider implementing rate limiting middleware:
- Track requests by IP address
- Limit to 10 requests per 15 minutes
- Return 429 status when limit exceeded

### Step 5: Testing Checklist
- [ ] Valid registration creates user and returns 201
- [ ] Invalid email format returns 400 with VALIDATION_ERROR
- [ ] Password < 8 chars returns 400 with VALIDATION_ERROR
- [ ] Duplicate email returns 409 with EMAIL_EXISTS
- [ ] Empty body returns 400
- [ ] Profile is auto-created via database trigger
