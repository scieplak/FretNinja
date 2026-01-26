# API Endpoint Implementation Plan: GET /api/profile

## 1. Endpoint Overview

Retrieve the current authenticated user's profile and settings. Returns all profile data including streak information, quiz counts, and user preferences stored in the `profiles` table.

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/profile`
- **Parameters:**
  - Required: None
  - Optional: None
- **Request Body:** None

### Request Headers
- `Authorization: Bearer <access_token>` (required)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Output - maps directly to ProfileEntity
type ProfileDTO = ProfileEntity;

// ProfileEntity structure:
interface ProfileDTO {
  id: string;
  display_name: string | null;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  find_note_count: number;
  name_note_count: number;
  mark_chord_count: number;
  recognize_interval_count: number;
  fretboard_range: number;
  show_note_names: boolean;
  tutorial_completed_modes: string[];
  created_at: string;
  updated_at: string;
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
  "id": "uuid",
  "display_name": "JohnDoe",
  "current_streak": 5,
  "longest_streak": 14,
  "last_activity_date": "2024-01-15",
  "find_note_count": 23,
  "name_note_count": 18,
  "mark_chord_count": 12,
  "recognize_interval_count": 8,
  "fretboard_range": 12,
  "show_note_names": false,
  "tutorial_completed_modes": ["find_note", "name_note"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T12:30:00Z"
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 401 | `UNAUTHORIZED` | Authentication required | Missing or invalid token |
| 404 | `NOT_FOUND` | Profile not found | Profile doesn't exist (edge case) |
| 500 | `SERVER_ERROR` | Failed to fetch profile | Database or server error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌───────────────┐      ┌──────────┐
│   Client    │─────▶│  API Route  │─────▶│ProfileService │─────▶│ Supabase │
│             │      │  (Astro)    │      │               │      │    DB    │
└─────────────┘      └─────────────┘      └───────────────┘      └──────────┘
       │                    │                     │                    │
       │                    ▼                     ▼                    ▼
       │             1. Verify auth        2. Query profile      3. Return row
       └─────────────2. Get user ID        3. Map to DTO            by user_id
        Auth Header  3. Call service       4. Return
```

### Steps:
1. API route receives GET request with Authorization header
2. Verify authentication and extract user ID
3. Call `ProfileService.getProfile(userId)`
4. Service queries `profiles` table by user ID (RLS enforces ownership)
5. Map database row to ProfileDTO
6. Return 200 with profile data

## 6. Security Considerations

### Authentication
- Requires valid access token in Authorization header
- User ID extracted from verified token

### Authorization
- RLS policy ensures users can only read their own profile
- `auth.uid() = id` policy on profiles table

### Data Exposure
- All profile fields are safe to return to the owner
- No sensitive data in profile table

## 7. Error Handling

### Authentication Errors
```typescript
const authResult = await verifyAuth(locals.supabase, authHeader);
if (authResult.error) {
  return new Response(
    JSON.stringify(authResult.error.body),
    { status: authResult.error.status }
  );
}
```

### Profile Not Found
```typescript
if (!profile) {
  return new Response(
    JSON.stringify({ code: 'NOT_FOUND', message: 'Profile not found' }),
    { status: 404 }
  );
}
```

## 8. Performance Considerations

### Optimizations
- Single database query by primary key (fast)
- RLS check is efficient on indexed column

### Caching
- Consider short TTL cache for frequently accessed profiles
- Cache invalidation on profile update

## 9. Implementation Steps

### Step 1: Create Profile Service
Create file: `src/lib/services/profile.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { ProfileDTO, ApiErrorDTO } from '../../types';

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async getProfile(
    userId: string
  ): Promise<{ data?: ProfileDTO; error?: { status: number; body: ApiErrorDTO } }> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          error: {
            status: 404,
            body: { code: 'NOT_FOUND', message: 'Profile not found' }
          }
        };
      }

      console.error('Failed to fetch profile:', error.message);
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Failed to fetch profile' }
        }
      };
    }

    return { data };
  }
}
```

### Step 2: Create API Endpoint
Create file: `src/pages/api/profile/index.ts`
```typescript
import type { APIRoute } from 'astro';
import { ProfileService } from '../../../lib/services/profile.service';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
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
  const profileService = new ProfileService(locals.supabase);
  const result = await profileService.getProfile(authResult.userId);

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

### Step 3: Testing Checklist
- [ ] Valid token returns 200 with profile data
- [ ] Missing Authorization header returns 401
- [ ] Invalid token returns 401
- [ ] All profile fields are present in response
- [ ] tutorial_completed_modes is array (even if empty)
- [ ] Dates are in ISO 8601 format
