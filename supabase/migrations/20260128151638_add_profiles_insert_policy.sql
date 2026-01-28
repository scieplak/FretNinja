-- Migration: Add INSERT policy for profiles table
-- Purpose: Allow authenticated users to create their own profile record
-- This handles edge cases where the trigger didn't fire (user created before migration)
-- Affected tables: profiles

-- ----------------------------------------------------------------------------
-- Add INSERT policy for profiles
-- ----------------------------------------------------------------------------
-- Authenticated users can only insert a profile with their own user ID.
-- This is a safety net - normally the trigger creates the profile automatically.

create policy profiles_insert_authenticated on profiles
    for insert
    to authenticated
    with check (auth.uid() = id);

comment on policy profiles_insert_authenticated on profiles is
    'Authenticated users can create their own profile record (safety net for missing trigger)';
