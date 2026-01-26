# Database Planning Summary - FretNinja MVP

## Decisions

1. Use Supabase's built-in `auth.users` for authentication; create separate `profiles` table linked via foreign key for app-specific data
2. Normalize quiz data into two tables: `quiz_sessions` (metadata) and `quiz_answers` (individual responses)
3. Store raw answer records for heatmap; create a regular view for aggregated data
4. Use junction table approach for achievements: `achievements` reference table + `user_achievements` junction table
5. Store streak data directly on `profiles`: `current_streak`, `longest_streak`, `last_activity_date`
6. Use PostgreSQL enum types for `quiz_type` and `difficulty`
7. Store user settings as separate columns on `profiles` (not JSONB)
8. Implement specific indexing strategy for quiz history, heatmap, and achievements
9. Use flexible nullable columns in `quiz_answers` for different quiz types
10. Implement RLS policies restricting users to their own data; guest mode stores nothing
11. Use UUID (`gen_random_uuid()`) for all primary keys
12. Add counter columns on `profiles` for quiz mode completion counts (for achievement tracking)
13. Add time tracking columns: `time_limit_seconds`, `time_taken_seconds` on sessions; `time_taken_ms` on answers
14. Add `status` enum to `quiz_sessions`: 'in_progress', 'completed', 'abandoned'
15. Add `created_at` (all tables) and `updated_at` with trigger (profiles only)
16. Create PostgreSQL trigger to auto-create profile on user registration
17. Make `display_name` nullable, no uniqueness constraint, with length check (2-50 chars)
18. Seed achievements in migration with fixed UUIDs; store criteria as JSONB
19. No soft delete for MVP; use hard delete with CASCADE for GDPR compliance
20. Use `ON DELETE CASCADE` for all foreign key relationships
21. Use `note_enum` for musical notes (12 values, sharps only)
22. Use 1-6 string numbering (standard guitar notation: 1=high E, 6=low E)
23. Validate fret position with `CHECK (fret_position BETWEEN 0 AND 24)`
24. Use `chord_type_enum` with separate `target_root_note` and `target_chord_type` columns
25. Use `interval_enum` with 12 interval values; store reference positions for context
26. Use single `quiz_answers` table with nullable type-specific columns (polymorphic)
27. Use regular view for heatmap; consider materialized view only if performance issues arise
28. Store tutorial completion as text array: `tutorial_completed_modes TEXT[] DEFAULT '{}'`
29. No separate daily activity table; derive activity from `quiz_sessions.completed_at`
30. Add `COMMENT ON TABLE` and `COMMENT ON COLUMN` for documentation

## Matched Recommendations

1. **Supabase Auth Integration**: Leverage built-in `auth.users` for secure authentication while extending with custom `profiles` table for application data
2. **Normalized Quiz Data Model**: Separate `quiz_sessions` and `quiz_answers` tables enable granular analytics, heatmap support, and efficient session-level queries
3. **Enum Types for Fixed Values**: PostgreSQL enums for `quiz_type`, `difficulty`, `note`, `chord_type`, `interval`, and `session_status` provide type safety and performance
4. **Streak Denormalization**: Store computed streak values directly on profiles for read performance; update via application logic on quiz completion
5. **Achievement System Design**: Reference table with JSONB criteria enables programmatic evaluation and future extensibility without schema changes
6. **Comprehensive Indexing**: Composite and partial indexes on frequently queried columns (user_id, is_correct, fret_position, string_number) optimize heatmap and history queries
7. **Cascading Deletes**: `ON DELETE CASCADE` on all foreign keys ensures clean data removal and GDPR compliance
8. **Auto-Profile Creation**: Database trigger on `auth.users` insert guarantees every authenticated user has a profile record
9. **Polymorphic Answer Storage**: Single `quiz_answers` table with nullable type-specific columns keeps the schema simple while supporting all four quiz modes
10. **Row-Level Security**: RLS policies ensure users can only access their own data; service role handles achievement grants

## Database Planning Summary

### Main Requirements

The FretNinja MVP requires a PostgreSQL database (via Supabase) supporting:

- User authentication and profile management
- Four quiz modes with progress tracking
- Gamification (streaks and 5 achievements)
- Error heatmap visualization
- User settings persistence

### Key Entities and Relationships

```
auth.users (Supabase built-in)
    │
    └── 1:1 ── profiles
                   │
                   ├── 1:N ── quiz_sessions
                   │              │
                   │              └── 1:N ── quiz_answers
                   │
                   └── N:M ── achievements (via user_achievements)
```

#### profiles

- Links to `auth.users.id` (UUID, CASCADE delete)
- Stores: display_name, current_streak, longest_streak, last_activity_date
- Quiz counters: find_note_count, name_note_count, mark_chord_count, recognize_interval_count
- Settings: fretboard_range (12/24), show_note_names (boolean), tutorial_completed_modes (text[])
- Timestamps: created_at, updated_at (with trigger)

#### quiz_sessions

- Foreign key to profiles.user_id (CASCADE delete)
- Columns: quiz_type (enum), difficulty (enum), score, status (enum)
- Time tracking: time_limit_seconds (nullable), time_taken_seconds
- Timestamps: started_at, completed_at, created_at

#### quiz_answers

- Foreign key to quiz_sessions.id (CASCADE delete)
- Common: question_number, is_correct, time_taken_ms
- Position data: fret_position (0-24), string_number (1-6)
- Type-specific (nullable): target_note, target_root_note, target_chord_type, target_interval, user_answer_note, user_answer_interval, user_answer_positions (JSONB)

#### achievements

- Fixed UUIDs seeded in migration
- Columns: name, description, criteria (JSONB)
- Five MVP achievements: first_steps, perfect_round, week_warrior, string_master, chord_ninja

#### user_achievements

- Junction table: user_id, achievement_id, earned_at
- Foreign keys with CASCADE delete

### Enum Types

| Enum | Values |
|------|--------|
| `quiz_type_enum` | 'find_note', 'name_note', 'mark_chord', 'recognize_interval' |
| `difficulty_enum` | 'easy', 'medium', 'hard' |
| `session_status_enum` | 'in_progress', 'completed', 'abandoned' |
| `note_enum` | 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' |
| `chord_type_enum` | 'major', 'minor', 'diminished', 'augmented' |
| `interval_enum` | 'minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd', 'perfect_4th', 'tritone', 'perfect_5th', 'minor_6th', 'major_6th', 'minor_7th', 'major_7th', 'octave' |

### Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `quiz_sessions` | `(user_id, completed_at DESC)` | Quiz history queries |
| `quiz_answers` | `(user_id, is_correct, fret_position, string_number)` | Heatmap queries |
| `quiz_answers` | Partial index `WHERE is_correct = false` | Heatmap optimization |
| `user_achievements` | `(user_id)` | Achievement lookups |

### Views

#### user_error_heatmap

```sql
CREATE VIEW user_error_heatmap AS
SELECT user_id, fret_position, string_number, COUNT(*) as error_count
FROM quiz_answers
WHERE is_correct = false AND fret_position IS NOT NULL
GROUP BY user_id, fret_position, string_number;
```

### Security (RLS Policies)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | own data | trigger | own data | CASCADE |
| quiz_sessions | own data | own data | — | CASCADE |
| quiz_answers | via session | via session | — | CASCADE |
| user_achievements | own data | service role | — | CASCADE |

### Important Conventions

| Convention | Value | Description |
|------------|-------|-------------|
| String numbering | 1-6 | 1 = high E, 6 = low E |
| Fret numbering | 0-24 | 0 = open string |
| Notation | Sharps only | No flats (C#, not Db) |
| Timestamps | TIMESTAMPTZ | Timezone-aware |
| Guest mode | No persistence | Application-level check |

## Unresolved Issues

None. All database schema questions have been addressed and decisions confirmed. The schema is ready for migration file creation.
