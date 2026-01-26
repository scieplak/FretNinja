-- ============================================================================
-- Migration: Initial FretNinja Database Schema
-- ============================================================================
-- Purpose: Create the complete database schema for the FretNinja application
--
-- This migration creates:
--   - 6 custom enum types for quiz data
--   - 5 tables: profiles, quiz_sessions, quiz_answers, achievements, user_achievements
--   - Indexes for query optimization
--   - Views for analytics
--   - Triggers for automated profile creation and timestamp updates
--   - Row-level security policies for data protection
--   - Seed data for achievements
--
-- Tables affected: profiles, quiz_sessions, quiz_answers, achievements, user_achievements
-- Dependencies: Supabase auth.users table (built-in)
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================
-- Create all custom enum types before tables that reference them.
-- These enums provide type safety and performance benefits over text columns.

-- quiz_type_enum: Identifies the four quiz modes available in the application
create type quiz_type_enum as enum (
    'find_note',           -- User finds a note position on the fretboard
    'name_note',           -- User identifies the note name at a position
    'mark_chord',          -- User marks all notes of a chord triad
    'recognize_interval'   -- User identifies the interval between two notes
);

comment on type quiz_type_enum is 'The four quiz modes available in FretNinja';

-- difficulty_enum: Quiz difficulty levels affecting fretboard scope and timing
create type difficulty_enum as enum (
    'easy',    -- Limited strings (1-3), no time limit
    'medium',  -- Full fretboard (frets 0-12), no time limit
    'hard'     -- Full fretboard, with countdown timer
);

comment on type difficulty_enum is 'Quiz difficulty levels: easy (limited area), medium (full board), hard (timed)';

-- session_status_enum: Tracks the lifecycle state of a quiz session
create type session_status_enum as enum (
    'in_progress',  -- Quiz is currently being taken
    'completed',    -- Quiz was finished normally
    'abandoned'     -- Quiz was left incomplete
);

comment on type session_status_enum is 'Lifecycle states for quiz sessions';

-- note_enum: The 12 chromatic notes using sharp notation only (no flats)
create type note_enum as enum (
    'C', 'C#', 'D', 'D#', 'E', 'F',
    'F#', 'G', 'G#', 'A', 'A#', 'B'
);

comment on type note_enum is 'The 12 chromatic notes in sharp notation (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)';

-- chord_type_enum: The four basic triad types supported in chord quizzes
create type chord_type_enum as enum (
    'major',       -- Major triad (1-3-5)
    'minor',       -- Minor triad (1-b3-5)
    'diminished',  -- Diminished triad (1-b3-b5)
    'augmented'    -- Augmented triad (1-3-#5)
);

comment on type chord_type_enum is 'Basic triad types: major, minor, diminished, augmented';

-- interval_enum: All intervals within one octave for interval recognition quizzes
create type interval_enum as enum (
    'minor_2nd',    -- 1 semitone
    'major_2nd',    -- 2 semitones
    'minor_3rd',    -- 3 semitones
    'major_3rd',    -- 4 semitones
    'perfect_4th',  -- 5 semitones
    'tritone',      -- 6 semitones (augmented 4th / diminished 5th)
    'perfect_5th',  -- 7 semitones
    'minor_6th',    -- 8 semitones
    'major_6th',    -- 9 semitones
    'minor_7th',    -- 10 semitones
    'major_7th',    -- 11 semitones
    'octave'        -- 12 semitones
);

comment on type interval_enum is 'Musical intervals from minor 2nd to octave (12 values)';


-- ============================================================================
-- SECTION 2: TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: profiles
-- ----------------------------------------------------------------------------
-- Extends Supabase auth.users with application-specific user data.
-- One-to-one relationship with auth.users via shared UUID primary key.
-- Contains: display name, streak tracking, quiz counters, and user settings.

create table profiles (
    -- Primary key links directly to Supabase auth.users
    id uuid primary key references auth.users(id) on delete cascade,

    -- User display name (optional, 2-50 characters if provided)
    display_name varchar(50) check (display_name is null or length(display_name) >= 2),

    -- Streak tracking for gamification
    current_streak integer not null default 0 check (current_streak >= 0),
    longest_streak integer not null default 0 check (longest_streak >= 0),
    last_activity_date date,

    -- Quiz completion counters for achievement tracking
    find_note_count integer not null default 0 check (find_note_count >= 0),
    name_note_count integer not null default 0 check (name_note_count >= 0),
    mark_chord_count integer not null default 0 check (mark_chord_count >= 0),
    recognize_interval_count integer not null default 0 check (recognize_interval_count >= 0),

    -- User preferences/settings
    fretboard_range integer not null default 12 check (fretboard_range in (12, 24)),
    show_note_names boolean not null default false,
    tutorial_completed_modes text[] not null default '{}',

    -- Timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table profiles is 'User profiles extending Supabase auth with app-specific data including streaks, quiz counts, and settings';
comment on column profiles.id is 'User ID from Supabase Auth (foreign key to auth.users)';
comment on column profiles.display_name is 'Optional user display name (2-50 characters)';
comment on column profiles.current_streak is 'Consecutive days with at least one completed quiz';
comment on column profiles.longest_streak is 'Best streak ever achieved by this user';
comment on column profiles.last_activity_date is 'Date of last completed quiz for streak calculation';
comment on column profiles.find_note_count is 'Total completed Find the Note quizzes (for String Master achievement)';
comment on column profiles.name_note_count is 'Total completed Name the Note quizzes';
comment on column profiles.mark_chord_count is 'Total completed Mark the Chord quizzes (for Chord Ninja achievement)';
comment on column profiles.recognize_interval_count is 'Total completed Recognize the Interval quizzes';
comment on column profiles.fretboard_range is 'Visible frets setting: 12 (default) or 24';
comment on column profiles.show_note_names is 'Whether to display note names on the fretboard';
comment on column profiles.tutorial_completed_modes is 'Array of quiz mode names for which tutorial has been completed';

-- Enable RLS (policies defined in Section 5)
alter table profiles enable row level security;


-- ----------------------------------------------------------------------------
-- Table: quiz_sessions
-- ----------------------------------------------------------------------------
-- Stores metadata for each quiz attempt.
-- One-to-many relationship with profiles (user can have many sessions).
-- Contains: quiz type, difficulty, score, timing, and session status.

create table quiz_sessions (
    id uuid primary key default gen_random_uuid(),

    -- Owner of this quiz session
    user_id uuid not null references profiles(id) on delete cascade,

    -- Quiz configuration
    quiz_type quiz_type_enum not null,
    difficulty difficulty_enum not null,

    -- Results (score is null while in_progress)
    score integer check (score >= 0 and score <= 10),
    status session_status_enum not null default 'in_progress',

    -- Timing information
    time_limit_seconds integer check (time_limit_seconds > 0),  -- Per-question limit for Hard mode
    time_taken_seconds integer check (time_taken_seconds >= 0), -- Total session duration

    -- Session lifecycle timestamps
    started_at timestamptz not null default now(),
    completed_at timestamptz,  -- Set when status changes to completed/abandoned
    created_at timestamptz not null default now()
);

comment on table quiz_sessions is 'Quiz session metadata including type, difficulty, score, and timing';
comment on column quiz_sessions.id is 'Unique session identifier';
comment on column quiz_sessions.user_id is 'Reference to the user who took this quiz';
comment on column quiz_sessions.quiz_type is 'Type of quiz: find_note, name_note, mark_chord, or recognize_interval';
comment on column quiz_sessions.difficulty is 'Difficulty level: easy, medium, or hard';
comment on column quiz_sessions.score is 'Final score from 0-10 (null while in progress)';
comment on column quiz_sessions.status is 'Session state: in_progress, completed, or abandoned';
comment on column quiz_sessions.time_limit_seconds is 'Per-question time limit in seconds (Hard mode only)';
comment on column quiz_sessions.time_taken_seconds is 'Total time spent on the quiz in seconds';
comment on column quiz_sessions.started_at is 'When the quiz was started';
comment on column quiz_sessions.completed_at is 'When the quiz was finished (completed or abandoned)';

-- Enable RLS (policies defined in Section 5)
alter table quiz_sessions enable row level security;


-- ----------------------------------------------------------------------------
-- Table: quiz_answers
-- ----------------------------------------------------------------------------
-- Stores individual question responses within a quiz session.
-- Used for: immediate feedback, heatmap generation, and detailed analytics.
-- Polymorphic design: different quiz types use different column subsets.

create table quiz_answers (
    id uuid primary key default gen_random_uuid(),

    -- Parent session reference
    session_id uuid not null references quiz_sessions(id) on delete cascade,

    -- Common fields for all quiz types
    question_number integer not null check (question_number >= 1 and question_number <= 10),
    is_correct boolean not null,
    time_taken_ms integer check (time_taken_ms >= 0),

    -- Position data (used for heatmap and most quiz types)
    fret_position integer check (fret_position >= 0 and fret_position <= 24),
    string_number integer check (string_number >= 1 and string_number <= 6),

    -- Target information (what the question asked for)
    target_note note_enum,                  -- Find/Name the Note: the note to find/identify
    target_root_note note_enum,             -- Mark the Chord: chord root note
    target_chord_type chord_type_enum,      -- Mark the Chord: type of chord
    target_interval interval_enum,          -- Recognize the Interval: correct interval

    -- Reference position for interval questions (the first/reference note)
    reference_fret_position integer check (reference_fret_position >= 0 and reference_fret_position <= 24),
    reference_string_number integer check (reference_string_number >= 1 and reference_string_number <= 6),

    -- User's answer
    user_answer_note note_enum,             -- Name the Note: user's selected note
    user_answer_interval interval_enum,     -- Recognize the Interval: user's selected interval
    user_answer_positions jsonb,            -- Mark the Chord: array of {fret, string} positions

    -- Timestamp
    created_at timestamptz not null default now()
);

comment on table quiz_answers is 'Individual quiz question responses for analytics and heatmap generation';
comment on column quiz_answers.session_id is 'Reference to the parent quiz session';
comment on column quiz_answers.question_number is 'Question order within session (1-10)';
comment on column quiz_answers.is_correct is 'Whether the user answered correctly';
comment on column quiz_answers.time_taken_ms is 'Time to answer in milliseconds';
comment on column quiz_answers.fret_position is 'Target or answer fret position (0=open string, 1-24)';
comment on column quiz_answers.string_number is 'Target or answer string (1=high E, 6=low E)';
comment on column quiz_answers.target_note is 'The note being asked about (Find/Name the Note quizzes)';
comment on column quiz_answers.target_root_note is 'Chord root note (Mark the Chord quiz)';
comment on column quiz_answers.target_chord_type is 'Type of chord to mark (Mark the Chord quiz)';
comment on column quiz_answers.target_interval is 'The correct interval (Recognize the Interval quiz)';
comment on column quiz_answers.reference_fret_position is 'Reference note fret for interval questions';
comment on column quiz_answers.reference_string_number is 'Reference note string for interval questions';
comment on column quiz_answers.user_answer_note is 'Note name selected by user (Name the Note quiz)';
comment on column quiz_answers.user_answer_interval is 'Interval selected by user (Recognize the Interval quiz)';
comment on column quiz_answers.user_answer_positions is 'JSON array of positions marked by user (Mark the Chord quiz)';

-- Enable RLS (policies defined in Section 5)
alter table quiz_answers enable row level security;


-- ----------------------------------------------------------------------------
-- Table: achievements
-- ----------------------------------------------------------------------------
-- Reference table for all available achievements (seeded with fixed UUIDs).
-- Criteria stored as JSONB for flexible programmatic evaluation.

create table achievements (
    id uuid primary key,  -- Fixed UUIDs seeded in migration
    name varchar(50) not null unique,
    display_name varchar(100) not null,
    description text not null,
    criteria jsonb not null,  -- Programmatic unlock conditions
    created_at timestamptz not null default now()
);

comment on table achievements is 'Reference table of available achievements with unlock criteria';
comment on column achievements.id is 'Fixed UUID for stable references';
comment on column achievements.name is 'Unique machine-readable identifier (e.g., first_steps)';
comment on column achievements.display_name is 'User-facing achievement name';
comment on column achievements.description is 'Description of how to earn the achievement';
comment on column achievements.criteria is 'JSONB object defining unlock conditions for programmatic evaluation';

-- Enable RLS (policies defined in Section 5)
alter table achievements enable row level security;


-- ----------------------------------------------------------------------------
-- Table: user_achievements
-- ----------------------------------------------------------------------------
-- Junction table tracking which achievements users have earned.
-- Many-to-many relationship between profiles and achievements.

create table user_achievements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    achievement_id uuid not null references achievements(id) on delete cascade,
    earned_at timestamptz not null default now(),

    -- Prevent duplicate achievement awards
    unique (user_id, achievement_id)
);

comment on table user_achievements is 'Junction table tracking earned achievements per user';
comment on column user_achievements.user_id is 'User who earned the achievement';
comment on column user_achievements.achievement_id is 'Reference to the achievement earned';
comment on column user_achievements.earned_at is 'When the achievement was unlocked';

-- Enable RLS (policies defined in Section 5)
alter table user_achievements enable row level security;


-- ============================================================================
-- SECTION 3: INDEXES
-- ============================================================================
-- Indexes optimized for common query patterns:
-- - Quiz history (user's sessions ordered by date)
-- - Heatmap generation (incorrect answers grouped by position)
-- - Achievement lookups

-- Quiz history: fetch user's sessions ordered by completion date (most recent first)
create index idx_quiz_sessions_user_completed
    on quiz_sessions (user_id, completed_at desc);

-- User achievements lookup: quickly find all achievements for a user
create index idx_user_achievements_user
    on user_achievements (user_id);

-- Session lookup: find all answers for a specific session
create index idx_quiz_answers_session
    on quiz_answers (session_id);

-- Heatmap aggregation: filter by correctness, group by position
-- Used when joining with sessions to filter by user
create index idx_quiz_answers_heatmap
    on quiz_answers (session_id, is_correct, fret_position, string_number);

-- Partial index for incorrect answers only (heatmap optimization)
-- Only indexes rows where is_correct = false, saving space and improving query speed
create index idx_quiz_answers_errors
    on quiz_answers (session_id, fret_position, string_number)
    where is_correct = false;


-- ============================================================================
-- SECTION 4: VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: user_error_heatmap
-- ----------------------------------------------------------------------------
-- Aggregates incorrect answers by fret position for heatmap visualization.
-- Shows error frequency per position to identify problem areas.

create view user_error_heatmap as
select
    qs.user_id,
    qa.fret_position,
    qa.string_number,
    count(*) as error_count
from quiz_answers qa
join quiz_sessions qs on qs.id = qa.session_id
where qa.is_correct = false
    and qa.fret_position is not null
    and qa.string_number is not null
group by qs.user_id, qa.fret_position, qa.string_number;

comment on view user_error_heatmap is 'Aggregates incorrect answers by fretboard position for heatmap visualization';


-- ============================================================================
-- SECTION 5: TRIGGERS AND FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function & Trigger: Auto-create profile on user registration
-- ----------------------------------------------------------------------------
-- When a new user signs up via Supabase Auth, automatically create their
-- profile record. Uses SECURITY DEFINER to run with elevated privileges.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id)
    values (new.id);
    return new;
end;
$$;

comment on function handle_new_user is 'Automatically creates a profile when a new user registers via Supabase Auth';

-- Trigger fires after a new row is inserted into auth.users
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function handle_new_user();


-- ----------------------------------------------------------------------------
-- Function & Trigger: Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
-- Automatically updates the updated_at column when a profile is modified.

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

comment on function update_updated_at_column is 'Sets updated_at to current timestamp on row update';

-- Trigger fires before any update to the profiles table
create trigger update_profiles_updated_at
    before update on profiles
    for each row
    execute function update_updated_at_column();


-- ============================================================================
-- SECTION 6: ROW-LEVEL SECURITY POLICIES
-- ============================================================================
-- RLS policies ensure users can only access their own data.
-- Each table has granular policies per operation (SELECT, INSERT, UPDATE, DELETE).
-- Policies are defined separately for 'authenticated' and 'anon' roles.

-- ----------------------------------------------------------------------------
-- Policies: profiles
-- ----------------------------------------------------------------------------
-- Users can only read and update their own profile.
-- Profile creation is handled by the on_auth_user_created trigger.
-- Profile deletion cascades from auth.users deletion.

-- Authenticated users can read their own profile
create policy profiles_select_authenticated on profiles
    for select to authenticated
    using (auth.uid() = id);

-- Authenticated users can update their own profile
create policy profiles_update_authenticated on profiles
    for update to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Anon users cannot access profiles
-- (No policy = no access due to RLS being enabled)


-- ----------------------------------------------------------------------------
-- Policies: quiz_sessions
-- ----------------------------------------------------------------------------
-- Users can read, insert, and update their own quiz sessions.
-- Sessions are deleted via CASCADE when profile is deleted.

-- Authenticated users can read their own sessions
create policy quiz_sessions_select_authenticated on quiz_sessions
    for select to authenticated
    using (user_id = auth.uid());

-- Authenticated users can insert sessions for themselves
create policy quiz_sessions_insert_authenticated on quiz_sessions
    for insert to authenticated
    with check (user_id = auth.uid());

-- Authenticated users can update their own sessions (complete/abandon)
create policy quiz_sessions_update_authenticated on quiz_sessions
    for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Anon users cannot access quiz_sessions
-- (No policy = no access due to RLS being enabled)


-- ----------------------------------------------------------------------------
-- Policies: quiz_answers
-- ----------------------------------------------------------------------------
-- Users can read and insert answers for sessions they own.
-- Access is controlled via session ownership (subquery check).

-- Authenticated users can read answers for their own sessions
create policy quiz_answers_select_authenticated on quiz_answers
    for select to authenticated
    using (
        session_id in (
            select id from quiz_sessions where user_id = auth.uid()
        )
    );

-- Authenticated users can insert answers for their own sessions
create policy quiz_answers_insert_authenticated on quiz_answers
    for insert to authenticated
    with check (
        session_id in (
            select id from quiz_sessions where user_id = auth.uid()
        )
    );

-- Anon users cannot access quiz_answers
-- (No policy = no access due to RLS being enabled)


-- ----------------------------------------------------------------------------
-- Policies: achievements
-- ----------------------------------------------------------------------------
-- Achievements are reference data - readable by everyone.
-- No insert/update/delete for regular users (managed via migrations).

-- Authenticated users can read all achievements
create policy achievements_select_authenticated on achievements
    for select to authenticated
    using (true);

-- Anon users can also read achievements (for display in guest mode)
create policy achievements_select_anon on achievements
    for select to anon
    using (true);


-- ----------------------------------------------------------------------------
-- Policies: user_achievements
-- ----------------------------------------------------------------------------
-- Users can read their own earned achievements.
-- Insert is restricted to service_role (backend grants achievements).

-- Authenticated users can read their own achievements
create policy user_achievements_select_authenticated on user_achievements
    for select to authenticated
    using (user_id = auth.uid());

-- Only service_role can insert achievements (backend-controlled)
-- This prevents users from granting themselves achievements
create policy user_achievements_insert_service on user_achievements
    for insert to service_role
    with check (true);

-- Anon users cannot access user_achievements
-- (No policy = no access due to RLS being enabled)


-- ============================================================================
-- SECTION 7: SEED DATA
-- ============================================================================
-- Insert the 5 MVP achievements with fixed UUIDs for stable references.
-- Criteria is stored as JSONB for programmatic evaluation in the application.

insert into achievements (id, name, display_name, description, criteria) values
    (
        'a1b2c3d4-0001-4000-8000-000000000001',
        'first_steps',
        'First Steps',
        'Complete your first quiz',
        '{"type": "total_quizzes", "count": 1}'::jsonb
    ),
    (
        'a1b2c3d4-0002-4000-8000-000000000002',
        'perfect_round',
        'Perfect Round',
        'Score 10/10 on any quiz',
        '{"type": "perfect_score"}'::jsonb
    ),
    (
        'a1b2c3d4-0003-4000-8000-000000000003',
        'week_warrior',
        'Week Warrior',
        'Maintain a 7-day streak',
        '{"type": "streak", "days": 7}'::jsonb
    ),
    (
        'a1b2c3d4-0004-4000-8000-000000000004',
        'string_master',
        'String Master',
        'Complete 50 "Find the Note" quizzes',
        '{"type": "quiz_count", "quiz_type": "find_note", "count": 50}'::jsonb
    ),
    (
        'a1b2c3d4-0005-4000-8000-000000000005',
        'chord_ninja',
        'Chord Ninja',
        'Complete 50 "Mark the Chord" quizzes',
        '{"type": "quiz_count", "quiz_type": "mark_chord", "count": 50}'::jsonb
    );
