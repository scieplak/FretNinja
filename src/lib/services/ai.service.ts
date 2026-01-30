import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type {
  AIHintCommand,
  AIHintResponseDTO,
  PersonalizedTipsCommand,
  PersonalizedTipsResponseDTO,
  ApiErrorDTO,
} from "../../types";

type SupabaseClientType = SupabaseClient<Database>;

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ServiceResult<T> {
  data?: T;
  error?: { status: number; body: ApiErrorDTO };
}

export class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.OPENROUTER_API_KEY || "";
  }

  async generateHint(command: AIHintCommand): Promise<ServiceResult<AIHintResponseDTO>> {
    if (!this.apiKey) {
      console.error("OpenRouter API key not configured");
      return {
        error: { status: 503, body: { code: "AI_UNAVAILABLE", message: "AI service not configured" } },
      };
    }

    const prompt = this.buildHintPrompt(command);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": import.meta.env.SITE_URL || "https://fretninja.com",
          "X-Title": "FretNinja",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-haiku",
          messages: [
            {
              role: "system",
              content: this.getHintSystemPrompt(),
            },
            {
              role: "user",
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
              body: { code: "RATE_LIMITED", message: "Too many hint requests. Please wait before trying again." },
            },
          };
        }

        console.error("OpenRouter API error:", response.status);
        return {
          error: { status: 503, body: { code: "AI_UNAVAILABLE", message: "AI service temporarily unavailable" } },
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          error: { status: 500, body: { code: "SERVER_ERROR", message: "Failed to generate hint" } },
        };
      }

      const parsed = this.parseHintResponse(content);
      return { data: parsed };
    } catch (error) {
      console.error("AI service error:", error);
      return {
        error: { status: 503, body: { code: "AI_UNAVAILABLE", message: "AI service temporarily unavailable" } },
      };
    }
  }

  private getHintSystemPrompt(): string {
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

    prompt += "\n\nPlease provide a helpful hint for learning this.";

    return prompt;
  }

  private parseHintResponse(content: string): AIHintResponseDTO {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          hint: parsed.hint || content,
          related_positions: parsed.related_positions || [],
          memorization_tip: parsed.memorization_tip || "",
        };
      }
    } catch {
      // Fallback if not valid JSON
    }

    return {
      hint: content,
      related_positions: [],
      memorization_tip: "",
    };
  }

  async generatePersonalizedTips(
    supabase: SupabaseClientType,
    userId: string,
    command: PersonalizedTipsCommand
  ): Promise<ServiceResult<PersonalizedTipsResponseDTO>> {
    if (!this.apiKey) {
      console.error("OpenRouter API key not configured");
      return {
        error: { status: 503, body: { code: "AI_UNAVAILABLE", message: "AI service not configured" } },
      };
    }

    // 1. Fetch error data
    const query = supabase
      .from("quiz_answers")
      .select(
        `
        fret_position,
        string_number,
        target_note,
        quiz_sessions!inner (
          user_id,
          quiz_type
        )
      `
      )
      .eq("is_correct", false)
      .not("fret_position", "is", null);

    const { data: errors, error: errorsError } = await query.limit(100);

    if (errorsError) {
      console.error("Failed to fetch error data:", errorsError.message);
      return {
        error: { status: 500, body: { code: "SERVER_ERROR", message: "Failed to generate tips" } },
      };
    }

    // Filter by user_id and optionally quiz_type in JS (Supabase join filter limitation)
    const filteredErrors = (errors || []).filter((row) => {
      const session = row.quiz_sessions as unknown as { user_id: string; quiz_type: string };
      if (session.user_id !== userId) return false;
      if (command.quiz_type && session.quiz_type !== command.quiz_type) return false;
      return true;
    });

    // 2. Check minimum data
    if (filteredErrors.length < 5) {
      return {
        error: {
          status: 404,
          body: { code: "INSUFFICIENT_DATA", message: "Not enough quiz data to generate personalized tips" },
        },
      };
    }

    // 3. Aggregate error patterns
    const errorPatterns = this.aggregateErrorPatterns(filteredErrors);

    // 4. Build AI prompt
    const prompt = this.buildPersonalizedTipsPrompt(errorPatterns, command.limit || 3);

    // 5. Call OpenRouter
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": import.meta.env.SITE_URL || "https://fretninja.com",
          "X-Title": "FretNinja",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-haiku",
          messages: [
            {
              role: "system",
              content: this.getPersonalizedTipsSystemPrompt(),
            },
            {
              role: "user",
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
              body: { code: "RATE_LIMITED", message: "Too many requests. Please wait before trying again." },
            },
          };
        }

        return {
          error: { status: 503, body: { code: "AI_UNAVAILABLE", message: "AI service temporarily unavailable" } },
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          error: { status: 500, body: { code: "SERVER_ERROR", message: "Failed to generate tips" } },
        };
      }

      const parsed = this.parsePersonalizedTipsResponse(content);
      return { data: parsed };
    } catch (error) {
      console.error("AI service error:", error);
      return {
        error: { status: 503, body: { code: "AI_UNAVAILABLE", message: "AI service temporarily unavailable" } },
      };
    }
  }

  private aggregateErrorPatterns(
    errors: { fret_position: number | null; string_number: number | null; target_note: string | null }[]
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

    const topStrings = Object.entries(patterns.byString).sort((a, b) => b[1] - a[1]);

    return `Analyze these error patterns and provide ${limit} personalized tips:

Most frequent error positions:
${topPositions.map(([pos, count]) => `- ${pos}: ${count} errors`).join("\n")}

Most frequently missed notes:
${topNotes.map(([note, count]) => `- ${note}: ${count} errors`).join("\n")}

Errors by string:
${topStrings.map(([string, count]) => `- String ${string}: ${count} errors`).join("\n")}

Please provide ${limit} specific, actionable tips based on these patterns.`;
  }

  private parsePersonalizedTipsResponse(content: string): PersonalizedTipsResponseDTO {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tips: parsed.tips || [],
          overall_recommendation: parsed.overall_recommendation || "",
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
