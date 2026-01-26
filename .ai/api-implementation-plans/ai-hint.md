# API Endpoint Implementation Plan: POST /api/ai/hint

## 1. Endpoint Overview

Request an AI-powered learning hint from OpenRouter.ai. Returns a contextual hint based on the quiz type, target note/interval/chord, and user's error patterns. Includes related positions and memorization tips.

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/ai/hint`
- **Request Body:**
```json
{
  "context": "quiz",
  "quiz_type": "find_note",
  "target_note": "C",
  "fret_position": 3,
  "string_number": 5,
  "user_error_positions": [
    {"fret": 5, "string": 5},
    {"fret": 8, "string": 6}
  ]
}
```

### Request Headers
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Input
type AIHintContextEnum = 'quiz' | 'explorer';

interface AIHintCommand {
  context: AIHintContextEnum;
  quiz_type?: QuizTypeEnum | null;
  target_note?: NoteEnum | null;
  target_interval?: IntervalEnum | null;
  target_chord_type?: ChordTypeEnum | null;
  target_root_note?: NoteEnum | null;
  fret_position?: number | null;
  string_number?: number | null;
  user_error_positions?: FretPositionDTO[] | null;
}

// Output
interface RelatedPositionDTO {
  fret: number;
  string: number;
  note: NoteEnum;
}

interface AIHintResponseDTO {
  hint: string;
  related_positions: RelatedPositionDTO[];
  memorization_tip: string;
}
```

### Zod Validation Schema
```typescript
export const aiHintCommandSchema = z.object({
  context: z.enum(['quiz', 'explorer']),
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval']).nullable().optional(),
  target_note: noteEnum.nullable().optional(),
  target_interval: intervalEnum.nullable().optional(),
  target_chord_type: chordTypeEnum.nullable().optional(),
  target_root_note: noteEnum.nullable().optional(),
  fret_position: z.number().int().min(0).max(24).nullable().optional(),
  string_number: z.number().int().min(1).max(6).nullable().optional(),
  user_error_positions: z.array(fretPositionSchema).nullable().optional(),
}).refine(
  (data) => {
    if (data.context === 'quiz') {
      return data.quiz_type != null;
    }
    return true;
  },
  { message: 'quiz_type required for quiz context' }
);
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "hint": "The note C appears on fret 3 of the A string (5th string). A helpful way to remember this: starting from the open A string, count up 3 half-steps (A → A# → B → C).",
  "related_positions": [
    {"fret": 3, "string": 5, "note": "C"},
    {"fret": 8, "string": 6, "note": "C"},
    {"fret": 1, "string": 2, "note": "C"}
  ],
  "memorization_tip": "Think of the 3rd fret of the A string as your 'anchor C' - it's the lowest C in the first position."
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Invalid context | Bad context value |
| 400 | `VALIDATION_ERROR` | quiz_type required for quiz context | Missing quiz_type |
| 401 | `UNAUTHORIZED` | Authentication required | Missing token |
| 429 | `RATE_LIMITED` | Too many hint requests. Please wait before trying again. | Rate limit exceeded |
| 503 | `AI_UNAVAILABLE` | AI service temporarily unavailable | OpenRouter error |
| 500 | `SERVER_ERROR` | Failed to generate hint | Other errors |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌────────────────┐    ┌─────────────┐
│ Client  │───▶│API Route│───▶│   AIService    │───▶│ OpenRouter  │
└─────────┘    └─────────┘    └────────────────┘    └─────────────┘
                    │                │                     │
                    ▼                ▼                     ▼
             1. Auth          2. Check rate limit    3. Chat completion
             2. Validate      3. Build prompt           API call
             3. Call svc      4. Call OpenRouter
                              5. Parse response
```

## 6. Security Considerations

### Authentication
- Requires valid token

### Rate Limiting
- 20 requests per hour per user
- Track in database or cache

### API Key Security
- OpenRouter API key stored in environment variables
- Never expose to client

### Input Sanitization
- Validate all enum values
- Sanitize user input before including in prompt

## 7. Implementation Steps

### Step 1: Create AI Schemas
Create file: `src/lib/schemas/ai.schemas.ts`
```typescript
import { z } from 'zod';

const noteEnum = z.enum(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
const chordTypeEnum = z.enum(['major', 'minor', 'diminished', 'augmented']);
const intervalEnum = z.enum([
  'minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd',
  'perfect_4th', 'tritone', 'perfect_5th', 'minor_6th',
  'major_6th', 'minor_7th', 'major_7th', 'octave'
]);

const fretPositionSchema = z.object({
  fret: z.number().int().min(0).max(24),
  string: z.number().int().min(1).max(6),
});

export const aiHintCommandSchema = z.object({
  context: z.enum(['quiz', 'explorer'], {
    errorMap: () => ({ message: 'Invalid context' })
  }),
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval']).nullable().optional(),
  target_note: noteEnum.nullable().optional(),
  target_interval: intervalEnum.nullable().optional(),
  target_chord_type: chordTypeEnum.nullable().optional(),
  target_root_note: noteEnum.nullable().optional(),
  fret_position: z.number().int().min(0).max(24).nullable().optional(),
  string_number: z.number().int().min(1).max(6).nullable().optional(),
  user_error_positions: z.array(fretPositionSchema).nullable().optional(),
}).refine(
  (data) => {
    if (data.context === 'quiz') {
      return data.quiz_type != null;
    }
    return true;
  },
  { message: 'quiz_type required for quiz context' }
);

export type AIHintCommandInput = z.infer<typeof aiHintCommandSchema>;
```

### Step 2: Create AI Service
Create file: `src/lib/services/ai.service.ts`
```typescript
import type { AIHintCommand, AIHintResponseDTO, ApiErrorDTO } from '../../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.OPENROUTER_API_KEY;
  }

  async generateHint(
    command: AIHintCommand
  ): Promise<{ data?: AIHintResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    const prompt = this.buildHintPrompt(command);

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
          model: 'anthropic/claude-3-haiku', // Fast and cost-effective
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: {
              status: 429,
              body: { code: 'RATE_LIMITED', message: 'Too many hint requests. Please wait before trying again.' }
            }
          };
        }

        console.error('OpenRouter API error:', response.status);
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
          error: {
            status: 500,
            body: { code: 'SERVER_ERROR', message: 'Failed to generate hint' }
          }
        };
      }

      // Parse the AI response
      const parsed = this.parseHintResponse(content, command);
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

  private getSystemPrompt(): string {
    return `You are a helpful guitar teacher assistant for FretNinja, an app that helps guitarists learn the fretboard.

When asked for a hint, provide:
1. A clear, educational explanation
2. Related positions on the fretboard
3. A memorable tip for memorization

Format your response as JSON:
{
  "hint": "Your educational explanation here",
  "related_positions": [{"fret": 3, "string": 5, "note": "C"}],
  "memorization_tip": "A memorable tip"
}

Use sharp notation only (C#, not Db). String numbers: 1=high E, 6=low E.`;
  }

  private buildHintPrompt(command: AIHintCommand): string {
    let prompt = `Context: ${command.context}`;

    if (command.quiz_type) {
      prompt += `\nQuiz type: ${command.quiz_type}`;
    }

    if (command.target_note) {
      prompt += `\nTarget note: ${command.target_note}`;
    }

    if (command.fret_position !== null && command.fret_position !== undefined) {
      prompt += `\nFret position: ${command.fret_position}`;
    }

    if (command.string_number !== null && command.string_number !== undefined) {
      prompt += `\nString number: ${command.string_number}`;
    }

    if (command.target_interval) {
      prompt += `\nTarget interval: ${command.target_interval}`;
    }

    if (command.target_chord_type && command.target_root_note) {
      prompt += `\nTarget chord: ${command.target_root_note} ${command.target_chord_type}`;
    }

    if (command.user_error_positions && command.user_error_positions.length > 0) {
      prompt += `\nUser's recent error positions: ${JSON.stringify(command.user_error_positions)}`;
    }

    prompt += '\n\nPlease provide a helpful hint for learning this.';

    return prompt;
  }

  private parseHintResponse(content: string, command: AIHintCommand): AIHintResponseDTO {
    try {
      // Try to parse as JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          hint: parsed.hint || content,
          related_positions: parsed.related_positions || [],
          memorization_tip: parsed.memorization_tip || '',
        };
      }
    } catch {
      // Fallback if not valid JSON
    }

    // Fallback response
    return {
      hint: content,
      related_positions: [],
      memorization_tip: '',
    };
  }
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/ai/hint.ts`
```typescript
import type { APIRoute } from 'astro';
import { AIService } from '../../../lib/services/ai.service';
import { aiHintCommandSchema } from '../../../lib/schemas/ai.schemas';
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
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const validation = aiHintCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: validation.error.issues[0].message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. TODO: Check rate limit (20 requests/hour)
  // Implementation depends on chosen rate limiting strategy

  // 4. Call service
  const aiService = new AIService();
  const result = await aiService.generateHint(validation.data);

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

### Step 4: Environment Variables
Add to `.env`:
```
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Step 5: Testing Checklist
- [ ] Valid request returns 200 with hint
- [ ] context=quiz without quiz_type returns 400
- [ ] Invalid context returns 400
- [ ] Response includes hint, related_positions, memorization_tip
- [ ] Rate limiting returns 429
- [ ] OpenRouter error returns 503
- [ ] Missing Authorization returns 401
