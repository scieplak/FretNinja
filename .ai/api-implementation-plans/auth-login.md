# API Endpoint Implementation Plan: POST /api/auth/login

## 1. Endpoint Overview

Authenticate a user and create a session. This endpoint wraps Supabase Auth's signInWithPassword functionality, returning JWT tokens for subsequent authenticated requests. The session includes access and refresh tokens managed by Supabase.

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/auth/login`
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
interface LoginCommand {
  email: string;
  password: string;
}

// Output
interface AuthUserDTO {
  id: string;
  email: string;
}

interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface LoginResponseDTO {
  user: AuthUserDTO;
  session: SessionDTO;
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

export const loginCommandSchema = z.object({
  email: z.string().min(1, 'Email and password are required').email('Invalid email format'),
  password: z.string().min(1, 'Email and password are required'),
});
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1234567890
  }
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Email and password are required | Missing email or password |
| 401 | `INVALID_CREDENTIALS` | Invalid email or password | Wrong credentials |
| 500 | `SERVER_ERROR` | Login failed | Unexpected Supabase or server error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  API Route  │─────▶│ AuthService  │─────▶│Supabase Auth│
│             │      │  (Astro)    │      │              │      │             │
└─────────────┘      └─────────────┘      └──────────────┘      └─────────────┘
                            │                    │                     │
                            ▼                    ▼                     ▼
                     1. Parse JSON        2. Call signIn        3. Verify creds
                     2. Validate input    3. Map errors         4. Create session
                     3. Call service      4. Return DTO         5. Return tokens
```

### Steps:
1. API route receives POST request with JSON body
2. Parse and validate request body using Zod schema
3. Call `AuthService.login()` with validated command
4. AuthService calls Supabase `auth.signInWithPassword()`
5. On success: Supabase verifies credentials and returns session tokens
6. Map Supabase response to `LoginResponseDTO`
7. Return 200 with response body containing user and session

## 6. Security Considerations

### Authentication
- No authentication required (public endpoint for obtaining authentication)

### Rate Limiting
- 10 requests per 15 minutes per IP (as per API spec for auth endpoints)
- Prevents brute force password attacks

### Data Validation
- Validate email format
- Ensure both fields are present

### Sensitive Data
- Never log passwords
- Never log full tokens (only partial for debugging if needed)
- Tokens should be transmitted over HTTPS only

### Credential Security
- Generic error message for invalid credentials (prevents username enumeration)
- Consider implementing account lockout after repeated failures (Supabase feature)

### Token Storage Recommendations (Client-side)
- Access token: Memory or short-lived storage
- Refresh token: HttpOnly cookie (if server-managed) or secure storage

## 7. Error Handling

### Validation Errors
```typescript
// Missing or invalid fields
if (!validation.success) {
  return new Response(
    JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Email and password are required' }),
    { status: 400 }
  );
}
```

### Supabase Error Mapping
```typescript
function mapLoginError(error: AuthError): { status: number; body: ApiErrorDTO } {
  // Supabase returns "Invalid login credentials" for wrong email/password
  if (error.message.includes('Invalid login credentials')) {
    return {
      status: 401,
      body: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    };
  }

  // Email not confirmed (if email confirmation is enabled)
  if (error.message.includes('Email not confirmed')) {
    return {
      status: 401,
      body: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    };
  }

  console.error('Login error:', error.message);
  return {
    status: 500,
    body: { code: 'SERVER_ERROR', message: 'Login failed' }
  };
}
```

## 8. Performance Considerations

### Potential Bottlenecks
- Supabase Auth API latency (external service)
- Password hashing verification (CPU-intensive, handled by Supabase)

### Optimizations
- Input validation before Supabase call (fail fast)
- Connection pooling handled by Supabase SDK

### Caching
- Not applicable for login endpoint (must verify credentials each time)

## 9. Implementation Steps

### Step 1: Add Login Schema to Auth Schemas
Update file: `src/lib/schemas/auth.schemas.ts`
```typescript
import { z } from 'zod';

export const registerCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginCommandSchema = z.object({
  email: z.string().min(1, 'Email and password are required').email('Invalid email format'),
  password: z.string().min(1, 'Email and password are required'),
});

export type RegisterCommandInput = z.infer<typeof registerCommandSchema>;
export type LoginCommandInput = z.infer<typeof loginCommandSchema>;
```

### Step 2: Add Login Method to Auth Service
Update file: `src/lib/services/auth.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type {
  RegisterCommand,
  RegisterResponseDTO,
  LoginCommand,
  LoginResponseDTO,
  ApiErrorDTO
} from '../../types';

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  // ... existing register method ...

  async login(command: LoginCommand): Promise<{ data?: LoginResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: command.email,
      password: command.password,
    });

    if (error) {
      return { error: this.mapLoginError(error) };
    }

    if (!data.user || !data.session) {
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Login failed' }
        }
      };
    }

    return {
      data: {
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at!,
        },
      },
    };
  }

  private mapLoginError(error: Error): { status: number; body: ApiErrorDTO } {
    if (error.message.includes('Invalid login credentials') ||
        error.message.includes('Email not confirmed')) {
      return {
        status: 401,
        body: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      };
    }

    console.error('Login error:', error.message);
    return {
      status: 500,
      body: { code: 'SERVER_ERROR', message: 'Login failed' }
    };
  }

  // ... existing mapAuthError for register ...
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/auth/login.ts`
```typescript
import type { APIRoute } from 'astro';
import { loginCommandSchema } from '../../../lib/schemas/auth.schemas';
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
  const validation = loginCommandSchema.safeParse(body);
  if (!validation.success) {
    // For login, use generic message for missing fields
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Call service
  const authService = new AuthService(locals.supabase);
  const result = await authService.login(validation.data);

  // 4. Return response
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

### Step 4: Testing Checklist
- [ ] Valid credentials return 200 with user and session data
- [ ] Missing email returns 400 with VALIDATION_ERROR
- [ ] Missing password returns 400 with VALIDATION_ERROR
- [ ] Wrong email returns 401 with INVALID_CREDENTIALS
- [ ] Wrong password returns 401 with INVALID_CREDENTIALS
- [ ] Empty body returns 400
- [ ] Access token is valid JWT
- [ ] Refresh token can be used to get new access token
- [ ] expires_at is future timestamp
