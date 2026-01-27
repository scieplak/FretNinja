import type { APIRoute } from 'astro';

import { createSupabaseServerInstance } from '../../../db/supabase.client';
import type { LogoutResponseDTO } from '../../../types';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // Create Supabase server instance with cookie management
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Sign out - this will clear the session cookies
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout error:', error.message);
  }

  // Check if this is a form submission (not JSON API call)
  const contentType = request.headers.get('Content-Type') || '';
  const acceptHeader = request.headers.get('Accept') || '';
  const isFormSubmission =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data') ||
    !acceptHeader.includes('application/json');

  // For form submissions, redirect to home page
  if (isFormSubmission) {
    return redirect('/');
  }

  // For JSON API calls, return JSON response
  if (error) {
    return new Response(
      JSON.stringify({ code: 'SERVER_ERROR', message: 'Logout failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const response: LogoutResponseDTO = {
    message: 'Logged out successfully',
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
