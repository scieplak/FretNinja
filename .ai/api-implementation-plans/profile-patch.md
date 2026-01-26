# API Endpoint Implementation Plan: PATCH /api/profile

## 1. Endpoint Overview

Update the current authenticated user's profile and settings. Supports partial updates - only provided fields will be modified. Returns the complete updated profile.

## 2. Request Details

- **HTTP Method:** PATCH
- **URL Structure:** `/api/profile`
- **Parameters:**
  - Required: None
  - Optional: None
- **Request Body (all fields optional):**
```json
{
  "display_name": "NinjaGuitarist",
  "fretboard_range": 24,
  "show_note_names": true,
  "tutorial_completed_modes": ["find_note", "name_note", "explorer"]
}
```

### Request Headers
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Input
interface UpdateProfileCommand {
  display_name?: string | null;
  fretboard_range?: number;
  show_note_names?: boolean;
  tutorial_completed_modes?: string[];
}

// Output
type ProfileDTO = ProfileEntity;

// Errors
interface ApiErrorDTO {
  code: string;
  message: string;
}
```

### Zod Validation Schema
```typescript
import { z } from 'zod';

const validTutorialModes = ['find_note', 'name_note', 'mark_chord', 'recognize_interval', 'explorer'];

export const updateProfileCommandSchema = z.object({
  display_name: z.string().min(2).max(50).nullable().optional(),
  fretboard_range: z.union([z.literal(12), z.literal(24)]).optional(),
  show_note_names: z.boolean().optional(),
  tutorial_completed_modes: z.array(z.enum(validTutorialModes as [string, ...string[]])).optional(),
}).strict();
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "id": "uuid",
  "display_name": "NinjaGuitarist",
  "current_streak": 5,
  "longest_streak": 14,
  "last_activity_date": "2024-01-15",
  "find_note_count": 23,
  "name_note_count": 18,
  "mark_chord_count": 12,
  "recognize_interval_count": 8,
  "fretboard_range": 24,
  "show_note_names": true,
  "tutorial_completed_modes": ["find_note", "name_note", "explorer"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T14:00:00Z"
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | display_name must be 2-50 characters | Invalid display name |
| 400 | `VALIDATION_ERROR` | fretboard_range must be 12 or 24 | Invalid fretboard range |
| 400 | `VALIDATION_ERROR` | Invalid tutorial mode in tutorial_completed_modes | Invalid mode value |
| 401 | `UNAUTHORIZED` | Authentication required | Missing or invalid token |
| 500 | `SERVER_ERROR` | Failed to update profile | Database or server error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌───────────────┐      ┌──────────┐
│   Client    │─────▶│  API Route  │─────▶│ProfileService │─────▶│ Supabase │
│             │      │  (Astro)    │      │               │      │    DB    │
└─────────────┘      └─────────────┘      └───────────────┘      └──────────┘
       │                    │                     │                    │
       │                    ▼                     ▼                    ▼
       │             1. Verify auth        2. Update profile     3. UPDATE row
       │             2. Validate body      3. Return updated     4. Trigger updates
       └─────────────3. Call service          profile               updated_at
```

### Steps:
1. API route receives PATCH request with Authorization header
2. Verify authentication and extract user ID
3. Parse and validate request body
4. Call `ProfileService.updateProfile(userId, command)`
5. Service updates `profiles` table (RLS enforces ownership)
6. Database trigger updates `updated_at` timestamp
7. Return 200 with complete updated profile

## 6. Security Considerations

### Authentication
- Requires valid access token in Authorization header

### Authorization
- RLS policy ensures users can only update their own profile
- `auth.uid() = id` policy on profiles table

### Input Validation
- Strict schema validation - reject unknown fields
- display_name: 2-50 chars (or null)
- fretboard_range: exactly 12 or 24
- tutorial_completed_modes: only valid mode strings

### Protected Fields
- Cannot update: id, current_streak, longest_streak, last_activity_date, quiz counts, created_at, updated_at
- These are system-managed fields

## 7. Error Handling

### Validation Errors
```typescript
if (!validation.success) {
  const issue = validation.error.issues[0];
  let message = 'Invalid input';

  if (issue.path.includes('display_name')) {
    message = 'display_name must be 2-50 characters';
  } else if (issue.path.includes('fretboard_range')) {
    message = 'fretboard_range must be 12 or 24';
  } else if (issue.path.includes('tutorial_completed_modes')) {
    message = 'Invalid tutorial mode in tutorial_completed_modes';
  }

  return new Response(
    JSON.stringify({ code: 'VALIDATION_ERROR', message }),
    { status: 400 }
  );
}
```

## 8. Performance Considerations

### Optimizations
- Single UPDATE query with RETURNING
- Only updates provided fields
- RLS check is efficient

### Caching
- Invalidate profile cache on update

## 9. Implementation Steps

### Step 1: Create Profile Validation Schema
Create file: `src/lib/schemas/profile.schemas.ts`
```typescript
import { z } from 'zod';

const validTutorialModes = [
  'find_note',
  'name_note',
  'mark_chord',
  'recognize_interval',
  'explorer'
] as const;

export const updateProfileCommandSchema = z.object({
  display_name: z
    .string()
    .min(2, 'display_name must be 2-50 characters')
    .max(50, 'display_name must be 2-50 characters')
    .nullable()
    .optional(),
  fretboard_range: z
    .union([z.literal(12), z.literal(24)], {
      errorMap: () => ({ message: 'fretboard_range must be 12 or 24' })
    })
    .optional(),
  show_note_names: z.boolean().optional(),
  tutorial_completed_modes: z
    .array(z.enum(validTutorialModes, {
      errorMap: () => ({ message: 'Invalid tutorial mode in tutorial_completed_modes' })
    }))
    .optional(),
}).strict();

export type UpdateProfileCommandInput = z.infer<typeof updateProfileCommandSchema>;
```

### Step 2: Add Update Method to Profile Service
Update file: `src/lib/services/profile.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { ProfileDTO, UpdateProfileCommand, ApiErrorDTO } from '../../types';

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  // ... existing getProfile method ...

  async updateProfile(
    userId: string,
    command: UpdateProfileCommand
  ): Promise<{ data?: ProfileDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    if (command.display_name !== undefined) updates.display_name = command.display_name;
    if (command.fretboard_range !== undefined) updates.fretboard_range = command.fretboard_range;
    if (command.show_note_names !== undefined) updates.show_note_names = command.show_note_names;
    if (command.tutorial_completed_modes !== undefined) {
      updates.tutorial_completed_modes = command.tutorial_completed_modes;
    }

    // If no fields to update, just return current profile
    if (Object.keys(updates).length === 0) {
      return this.getProfile(userId);
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update profile:', error.message);
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Failed to update profile' }
        }
      };
    }

    return { data };
  }
}
```

### Step 3: Add PATCH Handler to API Endpoint
Update file: `src/pages/api/profile/index.ts`
```typescript
import type { APIRoute } from 'astro';
import { ProfileService } from '../../../lib/services/profile.service';
import { updateProfileCommandSchema } from '../../../lib/schemas/profile.schemas';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

// ... existing GET handler ...

export const PATCH: APIRoute = async ({ request, locals }) => {
  // 1. Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader);

  if (authResult.error) {
    return new Response(
      JSON.stringify(authResult.error.body),
      { status: authResult.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Validate input
  const validation = updateProfileCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0].message
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Call service
  const profileService = new ProfileService(locals.supabase);
  const result = await profileService.updateProfile(authResult.userId, validation.data);

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

### Step 4: Testing Checklist
- [ ] Valid update returns 200 with full profile
- [ ] Partial update (single field) works
- [ ] Empty body returns current profile (no changes)
- [ ] display_name < 2 chars returns 400
- [ ] display_name > 50 chars returns 400
- [ ] display_name = null works (clears value)
- [ ] fretboard_range = 12 works
- [ ] fretboard_range = 24 works
- [ ] fretboard_range = 15 returns 400
- [ ] Invalid tutorial mode returns 400
- [ ] Unknown field in body returns 400 (strict mode)
- [ ] updated_at is changed after update
- [ ] Missing Authorization returns 401
