# API Endpoint Implementation Plan: POST /api/ai/personalized-tips

## 1. Endpoint Overview

Get personalized learning tips based on the user's error patterns. Analyzes the user's quiz history and error heatmap to provide targeted suggestions for improvement.

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/ai/personalized-tips`
- **Request Body:**
```json
{
  "quiz_type": "find_note",
  "limit": 3
}
```

### Request Headers
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Input
interface PersonalizedTipsCommand {
  quiz_type?: QuizTypeEnum | null;
  limit?: number | null;
}

// Output
interface PracticePositionDTO {
  fret: number;
  string: number;
  note: NoteEnum;
}

interface PersonalizedTipDTO {
  focus_area: string;
  observation: string;
  suggestion: string;
  practice_positions: PracticePositionDTO[];
}

interface PersonalizedTipsResponseDTO {
  tips: PersonalizedTipDTO[];
  overall_recommendation: string;
}
```

### Zod Validation Schema
```typescript
export const personalizedTipsCommandSchema = z.object({
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval']).nullable().optional(),
  limit: z.number().int().min(1, 'limit must be between 1 and 5').max(5, 'limit must be between 1 and 5').nullable().optional().default(3),
});
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "tips": [
    {
      "focus_area": "5th string, frets 1-5",
      "observation": "You frequently miss notes on the A string in the first position.",
      "suggestion": "Practice identifying notes from A to D on the 5th string.",
      "practice_positions": [
        {"fret": 1, "string": 5, "note": "A#"},
        {"fret": 2, "string": 5, "note": "B"},
        {"fret": 3, "string": 5, "note": "C"}
      ]
    }
  ],
  "overall_recommendation": "Based on your error patterns, consider spending more time in Explorer mode reviewing the first 5 frets."
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Invalid quiz_type | Bad quiz type |
| 400 | `VALIDATION_ERROR` | limit must be between 1 and 5 | Invalid limit |
| 401 | `UNAUTHORIZED` | Authentication required | Missing token |
| 404 | `INSUFFICIENT_DATA` | Not enough quiz data to generate personalized tips | No quiz history |
| 429 | `RATE_LIMITED` | Too many requests. Please wait before trying again. | Rate limit exceeded |
| 503 | `AI_UNAVAILABLE` | AI service temporarily unavailable | OpenRouter error |
| 500 | `SERVER_ERROR` | Failed to generate tips | Other errors |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌────────────────┐    ┌──────────────┐
│ Client  │───▶│API Route│───▶│   AIService    │───▶│ OpenRouter   │
└─────────┘    └─────────┘    └────────────────┘    └──────────────┘
                    │                │                     │
                    ▼                ▼                     ▼
             1. Auth          2. Fetch error data    3. Analyze errors
             2. Validate      3. Check minimum data  4. Generate tips
             3. Call svc      4. Build AI prompt        via AI
                              5. Parse response
```

### Steps:
1. Verify authentication
2. Fetch user's error heatmap data
3. Check if sufficient data exists
4. Build prompt with error patterns
5. Call OpenRouter for personalized analysis
6. Parse and return tips

## 6. Security Considerations

### Authentication
- Requires valid token

### Rate Limiting
- 5 requests per hour per user (more restrictive than hints)

### Data Privacy
- Only user's own data used for analysis
- No PII sent to AI service

## 7. Implementation Steps

### Step 1: Add Personalized Tips Schema
Update file: `src/lib/schemas/ai.schemas.ts`
```typescript
export const personalizedTipsCommandSchema = z.object({
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval'], {
    errorMap: () => ({ message: 'Invalid quiz_type' })
  }).nullable().optional(),
  limit: z
    .number()
    .int()
    .min(1, 'limit must be between 1 and 5')
    .max(5, 'limit must be between 1 and 5')
    .nullable()
    .optional()
    .default(3),
});

export type PersonalizedTipsCommandInput = z.infer<typeof personalizedTipsCommandSchema>;
```

### Step 2: Add Method to AI Service
Update file: `src/lib/services/ai.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { PersonalizedTipsCommand, PersonalizedTipsResponseDTO } from '../../types';

export class AIService {
  // ... existing code ...

  async generatePersonalizedTips(
    supabase: SupabaseClient,
    userId: string,
    command: PersonalizedTipsCommand
  ): Promise<{ data?: PersonalizedTipsResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // 1. Fetch error data
    let query = supabase
      .from('quiz_answers')
      .select(`
        fret_position,
        string_number,
        target_note,
        quiz_sessions!inner (
          user_id,
          quiz_type
        )
      `)
      .eq('is_correct', false)
      .eq('quiz_sessions.user_id', userId)
      .not('fret_position', 'is', null);

    if (command.quiz_type) {
      query = query.eq('quiz_sessions.quiz_type', command.quiz_type);
    }

    const { data: errors, error: errorsError } = await query.limit(100);

    if (errorsError) {
      console.error('Failed to fetch error data:', errorsError.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to generate tips' } }
      };
    }

    // 2. Check minimum data
    if (!errors || errors.length < 5) {
      return {
        error: {
          status: 404,
          body: { code: 'INSUFFICIENT_DATA', message: 'Not enough quiz data to generate personalized tips' }
        }
      };
    }

    // 3. Aggregate error patterns
    const errorPatterns = this.aggregateErrorPatterns(errors);

    // 4. Build AI prompt
    const prompt = this.buildPersonalizedTipsPrompt(errorPatterns, command.limit || 3);

    // 5. Call OpenRouter
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': import.meta.env.SITE_URL || 'https://fretninja.com',
          'X-Title': 'FretNinja',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            {
              role: 'system',
              content: this.getPersonalizedTipsSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: {
              status: 429,
              body: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait before trying again.' }
            }
          };
        }

        return {
          error: {
            status: 503,
            body: { code: 'AI_UNAVAILABLE', message: 'AI service temporarily unavailable' }
          }
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to generate tips' } }
        };
      }

      const parsed = this.parsePersonalizedTipsResponse(content);
      return { data: parsed };

    } catch (error) {
      console.error('AI service error:', error);
      return {
        error: {
          status: 503,
          body: { code: 'AI_UNAVAILABLE', message: 'AI service temporarily unavailable' }
        }
      };
    }
  }

  private aggregateErrorPatterns(
    errors: Array<{ fret_position: number | null; string_number: number | null; target_note: string | null }>
  ): { byPosition: Record<string, number>; byNote: Record<string, number>; byString: Record<number, number> } {
    const byPosition: Record<string, number> = {};
    const byNote: Record<string, number> = {};
    const byString: Record<number, number> = {};

    for (const error of errors) {
      if (error.fret_position !== null && error.string_number !== null) {
        const posKey = `fret${error.fret_position}-string${error.string_number}`;
        byPosition[posKey] = (byPosition[posKey] || 0) + 1;
        byString[error.string_number] = (byString[error.string_number] || 0) + 1;
      }

      if (error.target_note) {
        byNote[error.target_note] = (byNote[error.target_note] || 0) + 1;
      }
    }

    return { byPosition, byNote, byString };
  }

  private getPersonalizedTipsSystemPrompt(): string {
    return `You are a guitar teaching assistant analyzing a student's error patterns.

Based on the error data provided, generate personalized learning tips.

Format your response as JSON:
{
  "tips": [
    {
      "focus_area": "Description of area to focus on",
      "observation": "What you observed about their errors",
      "suggestion": "Specific practice suggestion",
      "practice_positions": [{"fret": 3, "string": 5, "note": "C"}]
    }
  ],
  "overall_recommendation": "General advice based on all patterns"
}

Use sharp notation (C#, not Db). String numbers: 1=high E, 6=low E.`;
  }

  private buildPersonalizedTipsPrompt(
    patterns: { byPosition: Record<string, number>; byNote: Record<string, number>; byString: Record<number, number> },
    limit: number
  ): string {
    const topPositions = Object.entries(patterns.byPosition)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topNotes = Object.entries(patterns.byNote)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topStrings = Object.entries(patterns.byString)
      .sort((a, b) => b[1] - a[1]);

    return `Analyze these error patterns and provide ${limit} personalized tips:

Most frequent error positions:
${topPositions.map(([pos, count]) => `- ${pos}: ${count} errors`).join('\n')}

Most frequently missed notes:
${topNotes.map(([note, count]) => `- ${note}: ${count} errors`).join('\n')}

Errors by string:
${topStrings.map(([string, count]) => `- String ${string}: ${count} errors`).join('\n')}

Please provide ${limit} specific, actionable tips based on these patterns.`;
  }

  private parsePersonalizedTipsResponse(content: string): PersonalizedTipsResponseDTO {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tips: parsed.tips || [],
          overall_recommendation: parsed.overall_recommendation || '',
        };
      }
    } catch {
      // Fallback
    }

    return {
      tips: [],
      overall_recommendation: content,
    };
  }
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/ai/personalized-tips.ts`
```typescript
import type { APIRoute } from 'astro';
import { AIService } from '../../../lib/services/ai.service';
import { personalizedTipsCommandSchema } from '../../../lib/schemas/ai.schemas';
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

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Empty body is allowed - use defaults
    body = {};
  }

  const validation = personalizedTipsCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: validation.error.issues[0].message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. TODO: Check rate limit (5 requests/hour)

  // 4. Call service
  const aiService = new AIService();
  const result = await aiService.generatePersonalizedTips(
    locals.supabase,
    authResult.userId,
    validation.data
  );

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
- [ ] Valid request returns 200 with tips
- [ ] Empty body uses defaults (limit=3)
- [ ] quiz_type filter works
- [ ] limit parameter respected
- [ ] limit > 5 returns 400
- [ ] User with < 5 errors returns 404 INSUFFICIENT_DATA
- [ ] Response includes tips array and overall_recommendation
- [ ] Rate limiting returns 429
- [ ] OpenRouter error returns 503
- [ ] Missing Authorization returns 401
