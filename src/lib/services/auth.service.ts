import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type {
  RegisterCommand,
  RegisterResponseDTO,
  LoginCommand,
  LoginResponseDTO,
  LogoutResponseDTO,
  PasswordResetCommand,
  PasswordResetResponseDTO,
  PasswordUpdateCommand,
  PasswordUpdateResponseDTO,
  ApiErrorDTO,
} from '../../types';

type SupabaseClientType = SupabaseClient<Database>;

interface ServiceResult<T> {
  data?: T;
  error?: { status: number; body: ApiErrorDTO };
}

export class AuthService {
  constructor(private supabase: SupabaseClientType) {}

  async register(command: RegisterCommand): Promise<ServiceResult<RegisterResponseDTO>> {
    const { data, error } = await this.supabase.auth.signUp({
      email: command.email,
      password: command.password,
    });

    if (error) {
      return { error: this.mapRegisterError(error) };
    }

    if (!data.user) {
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Registration failed' },
        },
      };
    }

    return {
      data: {
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
        message: 'Registration successful. Please check your email for confirmation.',
      },
    };
  }

  async login(command: LoginCommand): Promise<ServiceResult<LoginResponseDTO>> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: command.email,
      password: command.password,
    });

    if (error) {
      return { error: this.mapLoginError(error) };
    }

    if (!data.user || !data.session) {
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Login failed' },
        },
      };
    }

    return {
      data: {
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at!,
        },
      },
    };
  }

  async logout(): Promise<ServiceResult<LogoutResponseDTO>> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return { error: this.mapLogoutError(error) };
    }

    return {
      data: {
        message: 'Logged out successfully',
      },
    };
  }

  async requestPasswordReset(
    command: PasswordResetCommand,
    redirectTo?: string
  ): Promise<ServiceResult<PasswordResetResponseDTO>> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(command.email, {
      redirectTo,
    });

    if (error) {
      const mappedError = this.handlePasswordResetError(error);
      if (mappedError) {
        return { error: mappedError };
      }
      // For most errors, still return success to prevent enumeration
    }

    return {
      data: {
        message: 'If an account exists with this email, a password reset link has been sent.',
      },
    };
  }

  async updatePassword(command: PasswordUpdateCommand): Promise<ServiceResult<PasswordUpdateResponseDTO>> {
    const { error } = await this.supabase.auth.updateUser({
      password: command.password,
    });

    if (error) {
      return { error: this.mapPasswordUpdateError(error) };
    }

    return {
      data: {
        message: 'Password updated successfully',
      },
    };
  }

  private mapRegisterError(error: Error): { status: number; body: ApiErrorDTO } {
    if (error.message.includes('User already registered')) {
      return {
        status: 409,
        body: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
      };
    }

    console.error('Registration error:', error.message);
    return {
      status: 500,
      body: { code: 'SERVER_ERROR', message: 'Registration failed' },
    };
  }

  private mapLoginError(error: Error): { status: number; body: ApiErrorDTO } {
    if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
      return {
        status: 401,
        body: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      };
    }

    console.error('Login error:', error.message);
    return {
      status: 500,
      body: { code: 'SERVER_ERROR', message: 'Login failed' },
    };
  }

  private mapLogoutError(error: Error): { status: number; body: ApiErrorDTO } {
    if (error.message.includes('session') || error.message.includes('token') || error.message.includes('JWT')) {
      return {
        status: 401,
        body: { code: 'UNAUTHORIZED', message: 'No active session' },
      };
    }

    console.error('Logout error:', error.message);
    return {
      status: 500,
      body: { code: 'SERVER_ERROR', message: 'Logout failed' },
    };
  }

  private handlePasswordResetError(error: Error): { status: number; body: ApiErrorDTO } | null {
    console.error('Password reset error:', error.message);

    // Only expose actual server errors
    if (
      error.message.includes('rate') ||
      error.message.includes('limit') ||
      error.message.includes('server') ||
      error.message.includes('network')
    ) {
      return {
        status: 500,
        body: { code: 'SERVER_ERROR', message: 'Password reset request failed' },
      };
    }

    // For "user not found" or similar, return null to still show success
    return null;
  }

  private mapPasswordUpdateError(error: Error): { status: number; body: ApiErrorDTO } {
    const message = error.message.toLowerCase();

    // Token expired or invalid
    if (
      message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('token') ||
      message.includes('jwt') ||
      message.includes('session')
    ) {
      return {
        status: 401,
        body: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' },
      };
    }

    // Password requirements
    if (message.includes('password')) {
      return {
        status: 400,
        body: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' },
      };
    }

    console.error('Password update error:', error.message);
    return {
      status: 500,
      body: { code: 'SERVER_ERROR', message: 'Password update failed' },
    };
  }
}
