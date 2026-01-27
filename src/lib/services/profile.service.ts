import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type { ProfileDTO, UpdateProfileCommand, ApiErrorDTO } from '../../types';

type SupabaseClientType = SupabaseClient<Database>;

interface ServiceResult<T> {
  data?: T;
  error?: { status: number; body: ApiErrorDTO };
}

export class ProfileService {
  constructor(private supabase: SupabaseClientType) {}

  async getProfile(userId: string): Promise<ServiceResult<ProfileDTO>> {
    const { data, error } = await this.supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          error: {
            status: 404,
            body: { code: 'NOT_FOUND', message: 'Profile not found' },
          },
        };
      }

      console.error('Failed to fetch profile:', error.message);
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Failed to fetch profile' },
        },
      };
    }

    return { data };
  }

  async updateProfile(userId: string, command: UpdateProfileCommand): Promise<ServiceResult<ProfileDTO>> {
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
          body: { code: 'SERVER_ERROR', message: 'Failed to update profile' },
        },
      };
    }

    return { data };
  }
}
