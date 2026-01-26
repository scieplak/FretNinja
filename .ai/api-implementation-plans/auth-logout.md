# API Endpoint Implementation Plan: POST /api/auth/logout

## 1. Endpoint Overview

Terminate the current user session. This endpoint wraps Supabase Auth's signOut functionality, invalidating the user's access and refresh tokens. After logout, the tokens can no longer be used for authenticated requests.

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/auth/logout`
- **Parameters:**
  - Required: None
  - Optional: None
- **Request Body:** None (empty)

### Request Headers
- `Authorization: Bearer <access_token>` (required)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Output
interface LogoutResponseDTO {
  message: string;
}

// Errors
interface ApiErrorDTO {
  code: string;
  message: string;
}
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "message": "Logged out successfully"
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 401 | `UNAUTHORIZED` | No active session | Missing or invalid token |
| 500 | `SERVER_ERROR` | Logout failed | Unexpected Supabase or server error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  API Route  │─────▶│ AuthService  │─────▶│Supabase Auth│
│             │      │  (Astro)    │      │              │      │             │
└─────────────┘      └─────────────┘      └──────────────┘      └─────────────┘
       │                    │                    │                     │
       │                    ▼                    ▼                     ▼
       │             1. Extract token     2. Call signOut       3. Invalidate
       │             2. Verify session    3. Map errors            session
       └─────────────3. Call service      4. Return DTO
        Auth Header
```

### Steps:
1. API route receives POST request with Authorization header
2. Extract and verify the access token from header
3. Get current session from Supabase to verify user is authenticated
4. Call `AuthService.logout()`
5. AuthService calls Supabase `auth.signOut()`
6. On success: Supabase invalidates the session
7. Return 200 with success message

## 6. Security Considerations

### Authentication
- Requires valid access token in Authorization header
- Must verify token before attempting logout

### Rate Limiting
- 10 requests per 15 minutes per IP (as per API spec for auth endpoints)

### Token Handling
- Token is extracted from `Authorization: Bearer <token>` header
- After logout, client should discard stored tokens
- Server invalidates tokens on Supabase side

### Session Scope
- `signOut()` by default signs out from current session only
- Consider using `scope: 'global'` to sign out from all devices if needed

## 7. Error Handling

### Missing/Invalid Token
```typescript
// No Authorization header or invalid format
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(
    JSON.stringify({ code: 'UNAUTHORIZED', message: 'No active session' }),
    { status: 401 }
  );
}
```

### No Active Session
```typescript
// Token provided but no valid session
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return new Response(
    JSON.stringify({ code: 'UNAUTHORIZED', message: 'No active session' }),
    { status: 401 }
  );
}
```

### Supabase Error Mapping
```typescript
function mapLogoutError(error: AuthError): { status: number; body: ApiErrorDTO } {
  // Session already expired or invalid
  if (error.message.includes('session') || error.message.includes('token')) {
    return {
      status: 401,
      body: { code: 'UNAUTHORIZED', message: 'No active session' }
    };
  }

  console.error('Logout error:', error.message);
  return {
    status: 500,
    body: { code: 'SERVER_ERROR', message: 'Logout failed' }
  };
}
```

## 8. Performance Considerations

### Potential Bottlenecks
- Supabase Auth API latency (external service)
- Token verification before logout

### Optimizations
- Single Supabase call for signOut
- No database queries needed

### Caching
- Not applicable for logout endpoint

## 9. Implementation Steps

### Step 1: Create Auth Helper for Token Extraction
Create file: `src/lib/helpers/auth.helper.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { ApiErrorDTO } from '../../types';

export interface AuthResult {
  userId: string;
  error?: never;
}

export interface AuthError {
  userId?: never;
  error: { status: number; body: ApiErrorDTO };
}

export type AuthCheckResult = AuthResult | AuthError;

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Verify user is authenticated and return user ID
 */
export async function verifyAuth(
  supabase: SupabaseClient,
  authHeader: string | null
): Promise<AuthCheckResult> {
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      error: {
        status: 401,
        body: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }
    };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      error: {
        status: 401,
        body: { code: 'UNAUTHORIZED', message: 'No active session' }
      }
    };
  }

  return { userId: user.id };
}
```

### Step 2: Add Logout Method to Auth Service
Update file: `src/lib/services/auth.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type {
  RegisterCommand,
  RegisterResponseDTO,
  LoginCommand,
  LoginResponseDTO,
  LogoutResponseDTO,
  ApiErrorDTO
} from '../../types';

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  // ... existing register and login methods ...

  async logout(): Promise<{ data?: LogoutResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return { error: this.mapLogoutError(error) };
    }

    return {
      data: {
        message: 'Logged out successfully'
      }
    };
  }

  private mapLogoutError(error: Error): { status: number; body: ApiErrorDTO } {
    if (error.message.includes('session') ||
        error.message.includes('token') ||
        error.message.includes('JWT')) {
      return {
        status: 401,
        body: { code: 'UNAUTHORIZED', message: 'No active session' }
      };
    }

    console.error('Logout error:', error.message);
    return {
      status: 500,
      body: { code: 'SERVER_ERROR', message: 'Logout failed' }
    };
  }

  // ... existing error mapping methods ...
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/auth/logout.ts`
```typescript
import type { APIRoute } from 'astro';
import { AuthService } from '../../../lib/services/auth.service';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader);

  if (authResult.error) {
    return new Response(
      JSON.stringify(authResult.error.body),
      { status: authResult.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Call service
  const authService = new AuthService(locals.supabase);
  const result = await authService.logout();

  // 3. Return response
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
- [ ] Valid token returns 200 with success message
- [ ] Missing Authorization header returns 401 UNAUTHORIZED
- [ ] Invalid token format returns 401 UNAUTHORIZED
- [ ] Expired token returns 401 UNAUTHORIZED
- [ ] After logout, using same token returns 401 on protected endpoints
- [ ] Multiple logout attempts with same token handled gracefully
- [ ] Request body is ignored (endpoint doesn't require body)
