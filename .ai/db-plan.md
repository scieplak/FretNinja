# FretNinja Database Schema

## 1. Tables

### 1.1 profiles

Users table is managed by Supabase Auth.

Extends Supabase's built-in `auth.users` with application-specific data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE` | User ID from Supabase Auth |
| `display_name` | `VARCHAR(50)` | `CHECK (length(display_name) >= 2)` | Optional display name (2-50 chars) |
| `current_streak` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (current_streak >= 0)` | Consecutive days with completed quiz |
| `longest_streak` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (longest_streak >= 0)` | Best streak ever achieved |
| `last_activity_date` | `DATE` | | Date of last completed quiz |
| `find_note_count` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (find_note_count >= 0)` | Total "Find the Note" quizzes completed |
| `name_note_count` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (name_note_count >= 0)` | Total "Name the Note" quizzes completed |
| `mark_chord_count` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (mark_chord_count >= 0)` | Total "Mark the Chord" quizzes completed |
| `recognize_interval_count` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (recognize_interval_count >= 0)` | Total "Recognize the Interval" quizzes completed |
| `fretboard_range` | `INTEGER` | `NOT NULL DEFAULT 12, CHECK (fretboard_range IN (12, 24))` | Visible frets (12 or 24) |
| `show_note_names` | `BOOLEAN` | `NOT NULL DEFAULT false` | Display note names on fretboard |
| `tutorial_completed_modes` | `TEXT[]` | `NOT NULL DEFAULT '{}'` | Array of completed tutorial modes |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Profile creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp (via trigger) |

### 1.2 quiz_sessions

Stores metadata for each quiz attempt.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique session identifier |
| `user_id` | `UUID` | `NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE` | Owner of the session |
| `quiz_type` | `quiz_type_enum` | `NOT NULL` | Type of quiz taken |
| `difficulty` | `difficulty_enum` | `NOT NULL` | Difficulty level selected |
| `score` | `INTEGER` | `CHECK (score >= 0 AND score <= 10)` | Final score (0-10) |
| `status` | `session_status_enum` | `NOT NULL DEFAULT 'in_progress'` | Current session state |
| `time_limit_seconds` | `INTEGER` | `CHECK (time_limit_seconds > 0)` | Per-question time limit (Hard mode) |
| `time_taken_seconds` | `INTEGER` | `CHECK (time_taken_seconds >= 0)` | Total session duration |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | When quiz was started |
| `completed_at` | `TIMESTAMPTZ` | | When quiz was finished |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Record creation timestamp |

### 1.3 quiz_answers

Stores individual question responses for analytics and heatmap.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique answer identifier |
| `session_id` | `UUID` | `NOT NULL, REFERENCES quiz_sessions(id) ON DELETE CASCADE` | Parent quiz session |
| `question_number` | `INTEGER` | `NOT NULL, CHECK (question_number >= 1 AND question_number <= 10)` | Question order (1-10) |
| `is_correct` | `BOOLEAN` | `NOT NULL` | Whether answer was correct |
| `time_taken_ms` | `INTEGER` | `CHECK (time_taken_ms >= 0)` | Time to answer in milliseconds |
| `fret_position` | `INTEGER` | `CHECK (fret_position >= 0 AND fret_position <= 24)` | Target/answer fret (0=open) |
| `string_number` | `INTEGER` | `CHECK (string_number >= 1 AND string_number <= 6)` | Target/answer string (1=high E, 6=low E) |
| `target_note` | `note_enum` | | Target note (Find/Name the Note) |
| `target_root_note` | `note_enum` | | Chord root note (Mark the Chord) |
| `target_chord_type` | `chord_type_enum` | | Chord type (Mark the Chord) |
| `target_interval` | `interval_enum` | | Target interval (Recognize the Interval) |
| `reference_fret_position` | `INTEGER` | `CHECK (reference_fret_position >= 0 AND reference_fret_position <= 24)` | Reference note fret (intervals) |
| `reference_string_number` | `INTEGER` | `CHECK (reference_string_number >= 1 AND reference_string_number <= 6)` | Reference note string (intervals) |
| `user_answer_note` | `note_enum` | | User's note answer (Name the Note) |
| `user_answer_interval` | `interval_enum` | | User's interval answer |
| `user_answer_positions` | `JSONB` | | User's marked positions (Mark the Chord) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Record creation timestamp |

### 1.4 achievements

Reference table for all available achievements (seeded in migration).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Fixed UUID (seeded) |
| `name` | `VARCHAR(50)` | `NOT NULL UNIQUE` | Achievement identifier |
| `display_name` | `VARCHAR(100)` | `NOT NULL` | User-facing name |
| `description` | `TEXT` | `NOT NULL` | Achievement description |
| `criteria` | `JSONB` | `NOT NULL` | Programmatic unlock conditions |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Record creation timestamp |

### 1.5 user_achievements

Junction table tracking earned achievements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique record identifier |
| `user_id` | `UUID` | `NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE` | User who earned achievement |
| `achievement_id` | `UUID` | `NOT NULL, REFERENCES achievements(id) ON DELETE CASCADE` | Achievement earned |
| `earned_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | When achievement was unlocked |
| | | `UNIQUE (user_id, achievement_id)` | Prevent duplicate awards |

## 2. Enum Types

### 2.1 quiz_type_enum

```sql
CREATE TYPE quiz_type_enum AS ENUM (
    'find_note',
    'name_note',
    'mark_chord',
    'recognize_interval'
);
```

### 2.2 difficulty_enum

```sql
CREATE TYPE difficulty_enum AS ENUM (
    'easy',
    'medium',
    'hard'
);
```

### 2.3 session_status_enum

```sql
CREATE TYPE session_status_enum AS ENUM (
    'in_progress',
    'completed',
    'abandoned'
);
```

### 2.4 note_enum

```sql
CREATE TYPE note_enum AS ENUM (
    'C', 'C#', 'D', 'D#', 'E', 'F',
    'F#', 'G', 'G#', 'A', 'A#', 'B'
);
```

### 2.5 chord_type_enum

```sql
CREATE TYPE chord_type_enum AS ENUM (
    'major',
    'minor',
    'diminished',
    'augmented'
);
```

### 2.6 interval_enum

```sql
CREATE TYPE interval_enum AS ENUM (
    'minor_2nd',
    'major_2nd',
    'minor_3rd',
    'major_3rd',
    'perfect_4th',
    'tritone',
    'perfect_5th',
    'minor_6th',
    'major_6th',
    'minor_7th',
    'major_7th',
    'octave'
);
```

## 3. Relationships

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

| Relationship | Cardinality | Foreign Key | On Delete |
|--------------|-------------|-------------|-----------|
| auth.users → profiles | 1:1 | profiles.id → auth.users.id | CASCADE |
| profiles → quiz_sessions | 1:N | quiz_sessions.user_id → profiles.id | CASCADE |
| quiz_sessions → quiz_answers | 1:N | quiz_answers.session_id → quiz_sessions.id | CASCADE |
| profiles → user_achievements | 1:N | user_achievements.user_id → profiles.id | CASCADE |
| achievements → user_achievements | 1:N | user_achievements.achievement_id → achievements.id | CASCADE |

## 4. Indexes

### 4.1 Primary Query Indexes

```sql
-- Quiz history: fetch user's sessions ordered by completion date
CREATE INDEX idx_quiz_sessions_user_completed
    ON quiz_sessions (user_id, completed_at DESC);

-- User achievements lookup
CREATE INDEX idx_user_achievements_user
    ON user_achievements (user_id);
```

### 4.2 Heatmap Indexes

```sql
-- Heatmap aggregation: filter by user and correctness, group by position
CREATE INDEX idx_quiz_answers_heatmap
    ON quiz_answers (session_id, is_correct, fret_position, string_number);

-- Optimized partial index for incorrect answers only
CREATE INDEX idx_quiz_answers_errors
    ON quiz_answers (session_id, fret_position, string_number)
    WHERE is_correct = false;
```

### 4.3 Session Lookup Index

```sql
-- Lookup answers by session
CREATE INDEX idx_quiz_answers_session
    ON quiz_answers (session_id);
```

## 5. Views

### 5.1 user_error_heatmap

Aggregates incorrect answers by position for heatmap visualization.

```sql
CREATE VIEW user_error_heatmap AS
SELECT
    qs.user_id,
    qa.fret_position,
    qa.string_number,
    COUNT(*) AS error_count
FROM quiz_answers qa
JOIN quiz_sessions qs ON qs.id = qa.session_id
WHERE qa.is_correct = false
    AND qa.fret_position IS NOT NULL
    AND qa.string_number IS NOT NULL
GROUP BY qs.user_id, qa.fret_position, qa.string_number;
```

## 6. Triggers and Functions

### 6.1 Auto-create Profile on User Registration

```sql
-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

### 6.2 Auto-update updated_at on Profiles

```sql
-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger on profiles update
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 7. Row-Level Security (RLS) Policies

### 7.1 profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
```

### 7.2 quiz_sessions

```sql
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions
CREATE POLICY quiz_sessions_select_own ON quiz_sessions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY quiz_sessions_insert_own ON quiz_sessions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions (for completing/abandoning)
CREATE POLICY quiz_sessions_update_own ON quiz_sessions
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
```

### 7.3 quiz_answers

```sql
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Users can read answers for their own sessions
CREATE POLICY quiz_answers_select_own ON quiz_answers
    FOR SELECT TO authenticated
    USING (
        session_id IN (
            SELECT id FROM quiz_sessions WHERE user_id = auth.uid()
        )
    );

-- Users can insert answers for their own sessions
CREATE POLICY quiz_answers_insert_own ON quiz_answers
    FOR INSERT TO authenticated
    WITH CHECK (
        session_id IN (
            SELECT id FROM quiz_sessions WHERE user_id = auth.uid()
        )
    );
```

### 7.4 achievements

```sql
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Everyone can read achievements (reference data)
CREATE POLICY achievements_select_all ON achievements
    FOR SELECT TO authenticated
    USING (true);

-- Anon users can also read achievements
CREATE POLICY achievements_select_anon ON achievements
    FOR SELECT TO anon
    USING (true);
```

### 7.5 user_achievements

```sql
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can read their own achievements
CREATE POLICY user_achievements_select_own ON user_achievements
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Only service role can insert (achievements granted by backend)
CREATE POLICY user_achievements_insert_service ON user_achievements
    FOR INSERT TO service_role
    WITH CHECK (true);
```

## 8. Seed Data

### 8.1 Achievements

```sql
INSERT INTO achievements (id, name, display_name, description, criteria) VALUES
    ('a1b2c3d4-0001-4000-8000-000000000001', 'first_steps', 'First Steps',
     'Complete your first quiz',
     '{"type": "total_quizzes", "count": 1}'::jsonb),

    ('a1b2c3d4-0002-4000-8000-000000000002', 'perfect_round', 'Perfect Round',
     'Score 10/10 on any quiz',
     '{"type": "perfect_score"}'::jsonb),

    ('a1b2c3d4-0003-4000-8000-000000000003', 'week_warrior', 'Week Warrior',
     'Maintain a 7-day streak',
     '{"type": "streak", "days": 7}'::jsonb),

    ('a1b2c3d4-0004-4000-8000-000000000004', 'string_master', 'String Master',
     'Complete 50 "Find the Note" quizzes',
     '{"type": "quiz_count", "quiz_type": "find_note", "count": 50}'::jsonb),

    ('a1b2c3d4-0005-4000-8000-000000000005', 'chord_ninja', 'Chord Ninja',
     'Complete 50 "Mark the Chord" quizzes',
     '{"type": "quiz_count", "quiz_type": "mark_chord", "count": 50}'::jsonb);
```

## 9. Design Decisions and Notes

### 9.1 Authentication

- Leverages Supabase's built-in `auth.users` table for authentication
- The `profiles` table extends auth with app-specific data
- A trigger automatically creates a profile when a user registers
- Guest mode is handled at the application level (no database storage)

### 9.2 Quiz Data Model

- Normalized into `quiz_sessions` (metadata) and `quiz_answers` (responses)
- Enables granular analytics and heatmap generation
- Polymorphic `quiz_answers` table with nullable type-specific columns
- Different quiz types use different column subsets

### 9.3 Performance Optimizations

- Streak counters denormalized on `profiles` for fast reads
- Quiz mode counters on `profiles` for achievement checking
- Composite and partial indexes for common query patterns
- Regular view for heatmap (not materialized) - optimize later if needed

### 9.4 Data Conventions

| Convention | Value | Notes |
|------------|-------|-------|
| String numbering | 1-6 | 1 = high E, 6 = low E (standard guitar notation) |
| Fret numbering | 0-24 | 0 = open string |
| Note notation | Sharps only | C#, D#, F#, G#, A# (no flats) |
| Timestamps | TIMESTAMPTZ | Timezone-aware, UTC storage |
| Primary keys | UUID | Using `gen_random_uuid()` |

### 9.5 Deletion Strategy

- Hard delete with `ON DELETE CASCADE` for all foreign keys
- Deleting a user cascades to profile → sessions → answers
- Supports GDPR compliance (complete data removal)

### 9.6 Achievement System

- Fixed UUIDs seeded in migration for stable references
- JSONB `criteria` field enables programmatic evaluation
- Service role inserts achievements (backend-controlled grants)
- Users can only read their own earned achievements

### 9.7 Settings Storage

- User settings stored as separate columns (not JSONB)
- Enables type checking and simpler queries
- `tutorial_completed_modes` uses TEXT[] for flexibility

