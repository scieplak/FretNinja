# Authentication System Technical Specification

## Overview

This document specifies the architecture for implementing user authentication in FretNinja, covering registration (US-001), login (US-002), logout (US-003), password reset (US-004), and guest mode (US-005). The implementation uses Supabase Auth with Astro 5 server-side rendering and React 19 client components.

---

## User Story Coverage Matrix

This section maps each PRD User Story to the specification sections that address its acceptance criteria.

### US-001: User Registration
| Acceptance Criteria | Specification Section |
|--------------------|-----------------------|
| Registration form accepts email and password inputs | 1.4.1 (Registration Form validation), 4.5 (RegisterForm Component) |
| Password must be at least 8 characters | 2.3 (Input Validation - registerCommandSchema) |
| System validates email format before submission | 1.4.1 (Client-Side Validation), 2.3 (Input Validation) |
| System checks for existing accounts with same email | 2.4.3 (Supabase Error Mapping - EMAIL_EXISTS) |
| Upon successful registration, user receives confirmation and is logged in | 1.5.1 (Registration Flow), 3.7.3 (Email Verification - no blocking) |
| User is redirected to the main dashboard after registration | 1.5.1 (Registration Flow - redirect to /dashboard) |
| Registration errors are displayed clearly to the user | 1.4.2 (Server-Side Error Mapping) |

### US-002: User Login
| Acceptance Criteria | Specification Section |
|--------------------|-----------------------|
| Login form accepts email and password inputs | 1.4.1 (Login Form validation), 4.4 (LoginForm Component) |
| System validates credentials against stored data | 3.2.1 (AuthService.login), 2.4.3 (Supabase Error Mapping) |
| Upon successful login, user is redirected to the main dashboard | 1.5.2 (Login Flow) |
| Failed login attempts display appropriate error messages | 1.4.2 (Server-Side Error Mapping - INVALID_CREDENTIALS) |
| User session persists until explicit logout or session expiration | 3.3 (Token Management), 3.3.3 (Session Expiration Handling) |

### US-003: User Logout
| Acceptance Criteria | Specification Section |
|--------------------|-----------------------|
| Logout option is accessible from the main navigation | 4.2 (Header Component), 4.3 (UserMenu Component) |
| Upon logout, user session is terminated | 1.5.5 (Logout Flow), 5.3 (POST /api/auth/logout) |
| User is redirected to the landing page or login screen | 1.5.5 (Logout Flow - redirect to /) |
| Subsequent access to protected routes requires re-authentication | 3.4 (Route Protection Implementation) |

### US-004: Password Reset
| Acceptance Criteria | Specification Section |
|--------------------|-----------------------|
| Password reset option is available on the login page | 1.4.1 (Login Form Navigation Links), 4.4 (LoginForm - Required Navigation Links) |
| User enters email address to initiate reset | 1.5.3 (Password Reset Flow), 4.6 (PasswordResetForm Component) |
| System sends password reset email if account exists | 5.4 (POST /api/auth/password-reset) |
| Reset link expires after 24 hours | 3.7.2 (Password Security - 24 hour expiry) |
| User can set a new password via the reset link | 1.5.3 (Password Reset Flow), 5.5 (POST /api/auth/password-update) |
| User is notified of successful password change | 1.5.3 (Password Reset Flow - success message) |

### US-005: Guest Mode Access
| Acceptance Criteria | Specification Section |
|--------------------|-----------------------|
| Guest mode option is visible on the landing page | 1.5.4 (Guest Mode Flow), 6.2 (index.astro modification) |
| Guest users can access all four quiz modes | 1.1 (Page Structure - /quiz/* Mixed auth), 3.5.2 (Guest Mode Restrictions) |
| Guest users can access Explorer mode | 1.1 (Page Structure - /explorer Mixed auth), 3.5.2 (Guest Mode Restrictions) |
| Guest users see a clear indication that progress will not be saved | 3.5.3 (GuestBanner Component), 4.7 (GuestBanner Component) |
| Guest users are prompted to register after completing a quiz | 1.5.4 (Guest Mode Flow - post-quiz prompt), 7.2 (Quiz Result Saving) |
| No progress data is stored for guest sessions | 7.2 (Quiz Result Saving - save only if authenticated) |

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Page Structure

The authentication system requires the following pages:

| Route | Type | Auth State | Purpose |
|-------|------|------------|---------|
| `/` | Astro | Public | Landing page with guest mode CTA |
| `/login` | Astro | Public | User login form |
| `/register` | Astro | Public | User registration form |
| `/reset-password` | Astro | Public | Password reset request |
| `/auth/password-update` | Astro | Public | Password update (from email link) |
| `/auth/callback` | Astro | Public | Email confirmation callback (handles Supabase auth redirects) |
| `/dashboard` | Astro | Protected | User dashboard (redirect after login) |
| `/quiz/*` | Astro | Mixed | Quiz pages (guest or authenticated) |
| `/explorer` | Astro | Mixed | Explorer mode (guest or authenticated) |
| `/profile` | Astro | Protected | User profile and settings |
| `/achievements` | Astro | Protected | User achievements |
| `/statistics` | Astro | Protected | User statistics and history |

### 1.2 Layout Architecture

#### 1.2.1 Base Layout (`src/layouts/Layout.astro`)

The base layout wraps all pages and provides:
- HTML document structure with meta tags
- Theme configuration (dark mode)
- Global styles and fonts
- ClientRouter for View Transitions API

```
Layout.astro
├── <html> with dark mode class
├── <head> with SEO meta, fonts, global styles
└── <body>
    ├── <slot /> (page content)
    └── View Transition scripts
```

#### 1.2.2 App Layout (`src/layouts/AppLayout.astro`)

The app layout extends Layout for authenticated pages:
- Navigation header with auth-aware menu
- User dropdown with profile/logout
- Main content area
- Footer

```
AppLayout.astro
├── Layout.astro
│   └── <body>
│       ├── Header (React component)
│       │   ├── Logo/Home link
│       │   ├── Navigation links
│       │   └── UserMenu (auth-aware)
│       ├── <main>
│       │   └── <slot /> (page content)
│       └── Footer
```

#### 1.2.3 Auth Layout (`src/layouts/AuthLayout.astro`)

Minimal layout for authentication pages:
- Centered card design
- Logo/branding
- No navigation distractions

```
AuthLayout.astro
├── Layout.astro
│   └── <body>
│       └── <main> (centered container)
│           ├── Logo
│           └── <slot /> (auth form)
```

### 1.3 Component Architecture

#### 1.3.1 Auth Components (`src/components/auth/`)

| Component | Type | Purpose |
|-----------|------|---------|
| `LoginForm.tsx` | React | Email/password login with validation |
| `RegisterForm.tsx` | React | Registration with password strength |
| `PasswordResetForm.tsx` | React | Request reset / update password |
| `AuthProvider.tsx` | React | Global auth context provider |
| `ProtectedRoute.tsx` | React | Client-side route guard wrapper |
| `GuestBanner.tsx` | React | Banner prompting guests to register |

#### 1.3.2 Navigation Components (`src/components/navigation/`)

| Component | Type | Purpose |
|-----------|------|---------|
| `Header.tsx` | React | Main navigation with auth-aware menu |
| `UserMenu.tsx` | React | Dropdown with profile/logout |
| `MobileNav.tsx` | React | Responsive mobile navigation |
| `NavLink.tsx` | React | Navigation link with active state |

#### 1.3.3 Auth Context (`src/components/auth/AuthProvider.tsx`)

The AuthProvider manages global authentication state:

```typescript
interface AuthContextValue {
  user: AuthUserDTO | null;
  session: SessionDTO | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<ServiceResult<SessionDTO>>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

State management:
- Stores session in localStorage (`fn_access_token`, `fn_refresh_token`)
- Hydrates auth state on mount from localStorage
- Provides methods for login, logout, session refresh
- Exposes `isGuest` flag for conditional UI

### 1.4 Form Validation & Error Handling

#### 1.4.1 Client-Side Validation

All forms implement real-time validation with user-friendly feedback:

**Registration Form:**
| Field | Validation Rules | Error Message |
|-------|-----------------|---------------|
| Email | Required, valid format | "Please enter a valid email address" |
| Password | Required, min 8 chars | "Password must be at least 8 characters" |
| Password | Contains uppercase | "Password should contain an uppercase letter" (suggestion, not blocking) |
| Password | Contains number | "Password should contain a number" (suggestion, not blocking) |

**Registration Form Navigation Links:**
- "Already have an account? Log in" link → navigates to `/login`

**Login Form:**
| Field | Validation Rules | Error Message |
|-------|-----------------|---------------|
| Email | Required, valid format | "Please enter a valid email address" |
| Password | Required | "Password is required" |

**Login Form Navigation Links (per PRD US-004):**
- "Forgot password?" link → navigates to `/reset-password`
- "Create an account" link → navigates to `/register`

**Password Reset Form:**
| Field | Validation Rules | Error Message |
|-------|-----------------|---------------|
| Email | Required, valid format | "Please enter a valid email address" |
| New Password | Required, min 8 chars | "Password must be at least 8 characters" |

#### 1.4.2 Server-Side Error Mapping

API errors are mapped to user-friendly messages:

| Error Code | User Message |
|------------|-------------|
| `EMAIL_EXISTS` | "An account with this email already exists" |
| `INVALID_CREDENTIALS` | "Invalid email or password" |
| `USER_NOT_FOUND` | "No account found with this email" |
| `WEAK_PASSWORD` | "Password is too weak. Use at least 8 characters" |
| `RATE_LIMIT_EXCEEDED` | "Too many attempts. Please try again later" |
| `EMAIL_NOT_CONFIRMED` | "Please verify your email before logging in" |
| `INVALID_TOKEN` | "Reset link has expired. Please request a new one" |
| `NETWORK_ERROR` | "Connection error. Please check your internet" |
| `UNKNOWN_ERROR` | "Something went wrong. Please try again" |

### 1.5 Key User Scenarios

#### 1.5.1 User Registration Flow

```
User visits /register
    ↓
Fill registration form (email, password)
    ↓
Client-side validation
    ↓
Submit → POST /api/auth/register
    ↓
[Success]                          [Error]
    ↓                                 ↓
Show success message              Display error message
    ↓                             (email exists, weak password, etc.)
Auto-redirect to /dashboard
    ↓
Store session in localStorage
    ↓
User is logged in
```

#### 1.5.2 User Login Flow

```
User visits /login
    ↓
Fill login form (email, password)
    ↓
Submit → POST /api/auth/login
    ↓
[Success]                          [Error]
    ↓                                 ↓
Store tokens in localStorage      Display error message
    ↓                             (invalid credentials, etc.)
Redirect to intended page or /dashboard
    ↓
AuthProvider hydrates user state
```

#### 1.5.3 Password Reset Flow

```
User visits /reset-password
    ↓
Enter email address
    ↓
Submit → POST /api/auth/password-reset
    ↓
Show confirmation message
("Check your email for reset link")
    ↓
User clicks link in email
    ↓
Redirected to /auth/password-update?token=xxx
    ↓
Enter new password
    ↓
Submit → POST /api/auth/password-update
    ↓
[Success]                          [Error]
    ↓                                 ↓
Show success, redirect to /login  Display error (token expired, etc.)
```

#### 1.5.4 Guest Mode Flow

```
User visits / (landing page)
    ↓
Clicks "Try as Guest"
    ↓
Redirect to /quiz or /explorer
    ↓
GuestBanner displays at top:
"Your progress won't be saved. Create an account to track your learning."
    ↓
User completes quiz
    ↓
Results shown with prompt:
"Want to save your progress? Register now"
    ↓
[Register]                         [Continue as Guest]
    ↓                                 ↓
Redirect to /register             Stay on quiz/explorer
```

#### 1.5.5 Logout Flow

Per PRD US-003: "User is redirected to the landing page or login screen"

```
User clicks logout in UserMenu
    ↓
Call AuthContext.logout()
    ↓
POST /api/auth/logout (invalidate server session)
    ↓
Clear localStorage tokens
    ↓
Reset AuthContext state
    ↓
Redirect to / (landing page)
```

Note: Redirecting to the landing page (/) allows users to immediately try guest mode or log in again.

#### 1.5.6 Session Refresh Flow

```
User makes authenticated request
    ↓
Request fails with 401 (token expired)
    ↓
AuthProvider intercepts error
    ↓
Attempt refresh with refresh_token
    ↓
POST /api/auth/refresh
    ↓
[Success]                          [Failure]
    ↓                                 ↓
Update tokens in localStorage     Clear session
Retry original request            Redirect to /login with message
```

### 1.6 Protected Route Handling

#### 1.6.1 Server-Side Protection (Astro Middleware)

Protected routes are guarded in `src/middleware/index.ts`:

```typescript
const protectedRoutes = ['/dashboard', '/profile', '/achievements', '/statistics'];
const publicOnlyRoutes = ['/login', '/register', '/reset-password'];

// Redirect unauthenticated users to login
// Redirect authenticated users away from login/register
```

#### 1.6.2 Client-Side Protection (React)

For client-rendered protected content:

```typescript
// ProtectedRoute component wraps content
<ProtectedRoute fallback={<LoginPrompt />}>
  <ProtectedContent />
</ProtectedRoute>
```

---

## 2. BACKEND LOGIC

### 2.1 API Endpoint Structure

All authentication endpoints are located in `src/pages/api/auth/`:

| Endpoint | Method | Auth | Request Body | Response |
|----------|--------|------|--------------|----------|
| `/api/auth/register` | POST | None | `RegisterCommand` | `RegisterResponseDTO` |
| `/api/auth/login` | POST | None | `LoginCommand` | `LoginResponseDTO` |
| `/api/auth/logout` | POST | Bearer | None | `LogoutResponseDTO` |
| `/api/auth/password-reset` | POST | None | `PasswordResetCommand` | `PasswordResetResponseDTO` |
| `/api/auth/password-update` | POST | Bearer | `PasswordUpdateCommand` | `PasswordUpdateResponseDTO` |
| `/api/auth/refresh` | POST | None | `RefreshCommand` | `LoginResponseDTO` |
| `/api/auth/session` | GET | Bearer | None | `SessionDTO` |

### 2.2 Data Models

#### 2.2.1 Command Objects (Request DTOs)

```typescript
// Registration
interface RegisterCommand {
  email: string;      // Valid email format
  password: string;   // Min 8 characters
}

// Login
interface LoginCommand {
  email: string;
  password: string;
}

// Password Reset Request
interface PasswordResetCommand {
  email: string;
}

// Password Update
interface PasswordUpdateCommand {
  password: string;   // Min 8 characters
}

// Token Refresh
interface RefreshCommand {
  refresh_token: string;
}
```

#### 2.2.2 Response DTOs

```typescript
// Registration Response
interface RegisterResponseDTO {
  user: AuthUserDTO;
  session: SessionDTO;
  message: string;
}

// Login Response
interface LoginResponseDTO {
  user: AuthUserDTO;
  session: SessionDTO;
}

// Session DTO
interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

// User DTO
interface AuthUserDTO {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
}

// Error Response
interface ApiErrorDTO {
  error: {
    code: AuthErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'WEAK_PASSWORD'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EMAIL_NOT_CONFIRMED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN_ERROR';
```

### 2.3 Input Validation

All endpoints use Zod schemas for validation (`src/lib/schemas/auth.schemas.ts`):

```typescript
// Registration validation
const registerCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Login validation
const loginCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Password reset validation
const passwordResetCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// Password update validation
const passwordUpdateCommandSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Refresh validation
const refreshCommandSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});
```

### 2.4 Exception Handling

#### 2.4.1 Service Layer Error Handling

Services return a consistent `ServiceResult<T>` type:

```typescript
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: AuthErrorCode;
    message: string;
  };
}
```

#### 2.4.2 API Layer Error Mapping

Each endpoint maps service errors to HTTP responses:

| Error Code | HTTP Status | Response |
|------------|-------------|----------|
| `VALIDATION_ERROR` | 400 | Validation details |
| `EMAIL_EXISTS` | 409 | Conflict |
| `INVALID_CREDENTIALS` | 401 | Unauthorized |
| `USER_NOT_FOUND` | 404 | Not Found |
| `UNAUTHORIZED` | 401 | Unauthorized |
| `TOKEN_EXPIRED` | 401 | Unauthorized |
| `RATE_LIMIT_EXCEEDED` | 429 | Too Many Requests |
| `UNKNOWN_ERROR` | 500 | Internal Server Error |

#### 2.4.3 Supabase Error Mapping

The auth service maps Supabase-specific errors:

```typescript
// Registration errors
'User already registered' → EMAIL_EXISTS
'Password should be at least 6 characters' → WEAK_PASSWORD
'Unable to validate email address' → VALIDATION_ERROR

// Login errors
'Invalid login credentials' → INVALID_CREDENTIALS
'Email not confirmed' → EMAIL_NOT_CONFIRMED

// Password reset errors
'User not found' → USER_NOT_FOUND
'Token has expired' → TOKEN_EXPIRED
```

### 2.5 Server-Side Rendering Updates

#### 2.5.1 Astro Configuration

The `astro.config.mjs` is configured for server-side rendering:

```javascript
export default defineConfig({
  output: "server",  // SSR mode
  adapter: node({ mode: "standalone" }),
  // ...
});
```

This enables:
- Server-side auth state checking in Astro pages
- Protected route middleware
- API endpoints with full server capabilities

#### 2.5.2 Page-Level Auth Checking

Protected Astro pages check auth state:

```astro
---
// src/pages/dashboard.astro
import { verifyAuth } from '@/lib/helpers/auth.helper';

const authResult = await verifyAuth(Astro.request);
if (!authResult.success) {
  return Astro.redirect('/login?redirect=/dashboard');
}

const { userId } = authResult;
// Fetch user-specific data...
---
```

#### 2.5.3 Mixed Auth Pages (Quiz/Explorer)

Pages that work for both guests and authenticated users:

```astro
---
// src/pages/quiz/[mode].astro
import { verifyAuth } from '@/lib/helpers/auth.helper';

const authResult = await verifyAuth(Astro.request);
const isGuest = !authResult.success;
const userId = authResult.success ? authResult.userId : null;
---

<Layout>
  {isGuest && <GuestBanner client:load />}
  <QuizComponent userId={userId} isGuest={isGuest} client:load />
</Layout>
```

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Supabase Auth Integration

#### 3.1.1 Client Initialization

The Supabase client is initialized in `src/db/supabase.client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

#### 3.1.2 Middleware Injection

The middleware injects the Supabase client into Astro context:

```typescript
// src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from '../db/supabase.client';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  // Route protection logic here...

  return next();
});
```

### 3.2 Auth Service Architecture

#### 3.2.1 Service Methods (`src/lib/services/auth.service.ts`)

```typescript
class AuthService {
  // Registration
  async register(command: RegisterCommand): Promise<ServiceResult<RegisterResponseDTO>>;

  // Login
  async login(command: LoginCommand): Promise<ServiceResult<LoginResponseDTO>>;

  // Logout
  async logout(accessToken: string): Promise<ServiceResult<void>>;

  // Password reset request
  async requestPasswordReset(command: PasswordResetCommand): Promise<ServiceResult<void>>;

  // Password update
  async updatePassword(accessToken: string, command: PasswordUpdateCommand): Promise<ServiceResult<void>>;

  // Session refresh
  async refreshSession(refreshToken: string): Promise<ServiceResult<LoginResponseDTO>>;

  // Get current session
  async getSession(accessToken: string): Promise<ServiceResult<SessionDTO>>;
}
```

#### 3.2.2 Auth Helper (`src/lib/helpers/auth.helper.ts`)

```typescript
// Extract Bearer token from Authorization header
function extractBearerToken(request: Request): string | null;

// Verify authentication and return user ID
async function verifyAuth(request: Request): Promise<AuthCheckResult>;

type AuthCheckResult =
  | { success: true; userId: string }
  | { success: false; error: { code: AuthErrorCode; message: string } };
```

### 3.3 Token Management

#### 3.3.1 Token Storage Strategy

Tokens are stored in localStorage for client-side access:

| Key | Value | Purpose |
|-----|-------|---------|
| `fn_access_token` | JWT string | API authentication |
| `fn_refresh_token` | UUID string | Token refresh |
| `fn_token_expiry` | Timestamp | Expiration tracking |

#### 3.3.2 Token Refresh Flow

```
Client request with access_token
    ↓
Server validates token
    ↓
[Valid]                           [Expired]
    ↓                                 ↓
Process request                   Return 401
                                     ↓
                              Client catches 401
                                     ↓
                              POST /api/auth/refresh
                              with refresh_token
                                     ↓
                              [Success]        [Failure]
                                  ↓                ↓
                              Update tokens    Clear session
                              Retry request    Redirect to login
```

#### 3.3.3 Session Expiration Handling

The AuthProvider monitors token expiration:

```typescript
useEffect(() => {
  const checkExpiration = () => {
    const expiry = localStorage.getItem('fn_token_expiry');
    if (expiry && Date.now() > parseInt(expiry) - 60000) {
      // Token expires in less than 1 minute, refresh proactively
      refreshSession();
    }
  };

  const interval = setInterval(checkExpiration, 30000);
  return () => clearInterval(interval);
}, []);
```

### 3.4 Route Protection Implementation

#### 3.4.1 Middleware Route Protection

```typescript
// src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';
import { verifyAuth } from '../lib/helpers/auth.helper';
import { supabaseClient } from '../db/supabase.client';

const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/achievements',
  '/statistics',
];

const publicOnlyRoutes = [
  '/login',
  '/register',
  '/reset-password',
];

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  const { pathname } = context.url;
  const authResult = await verifyAuth(context.request);
  const isAuthenticated = authResult.success;

  // Protect authenticated routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      return context.redirect(redirectUrl);
    }
    context.locals.userId = authResult.userId;
  }

  // Redirect authenticated users away from login/register
  if (publicOnlyRoutes.includes(pathname) && isAuthenticated) {
    return context.redirect('/dashboard');
  }

  return next();
});
```

#### 3.4.2 Client-Side Route Guard

```typescript
// src/components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return fallback ?? <RedirectToLogin />;
  }

  return <>{children}</>;
}
```

### 3.5 Guest Mode Implementation

#### 3.5.1 Guest State Management

Guest mode is determined by absence of authentication:

```typescript
// In AuthProvider
const isGuest = !isAuthenticated && !isLoading;
```

#### 3.5.2 Guest Mode Restrictions

| Feature | Guest Access | Authenticated Access |
|---------|--------------|---------------------|
| Quiz (all modes) | Yes | Yes |
| Explorer mode | Yes | Yes |
| Progress saving | No | Yes |
| Quiz history | No | Yes |
| Achievements | No | Yes |
| Statistics | No | Yes |
| AI hints | Yes | Yes |
| Settings persistence | No | Yes |

Note: Per PRD US-039, AI hints are available to all users equally. Guests can request hints during quizzes and in Explorer mode without restrictions.

#### 3.5.3 Guest Banner Component

```typescript
// src/components/auth/GuestBanner.tsx
export function GuestBanner() {
  return (
    <div className="bg-amber-900/30 border border-amber-500/50 px-4 py-3 mb-4 rounded-lg">
      <p className="text-amber-200 text-sm">
        You're playing as a guest. Your progress won't be saved.{' '}
        <a href="/register" className="underline text-amber-400 hover:text-amber-300">
          Create an account
        </a>
        {' '}to track your learning.
      </p>
    </div>
  );
}
```

### 3.6 Database Integration

#### 3.6.1 User Profile Auto-Creation

When a user registers via Supabase Auth, a profile is automatically created via database trigger:

```sql
-- From migration: supabase/migrations/20260126120000_initial_schema.sql

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

#### 3.6.2 Row Level Security

Profiles table has RLS enabled with policies:

```sql
-- Users can read their own profile
create policy "Users can view own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);
```

### 3.7 Security Considerations

#### 3.7.1 Token Security

- Access tokens are short-lived (1 hour by default)
- Refresh tokens are long-lived but can be revoked
- Tokens are stored in localStorage (acceptable for this app type)
- All API requests use HTTPS
- Bearer token format in Authorization header

#### 3.7.2 Password Security

- Minimum 8 characters enforced (per PRD US-001)
- Passwords hashed by Supabase (bcrypt)
- No password history stored client-side
- Password reset links expire after 24 hours (per PRD US-004)

#### 3.7.3 Email Verification

Per PRD US-001, users must be logged in immediately after registration ("Upon successful registration, user receives confirmation and is logged in"). Therefore:
- Email verification is NOT required before first login
- Supabase Auth should be configured with `autoconfirm: true` or email confirmation disabled
- The `email_confirmed_at` field may be null for newly registered users
- Optional: Send a welcome/verification email for account security, but do not block access

#### 3.7.4 CSRF Protection

- Supabase handles CSRF for auth operations
- API endpoints validate Bearer tokens
- No cookie-based session (token-based instead)

#### 3.7.5 Rate Limiting

- Supabase provides built-in rate limiting
- Additional client-side debouncing on forms
- Error message for rate limit exceeded

---

## 4. COMPONENT SPECIFICATIONS

### 4.1 AuthProvider Component

**File:** `src/components/auth/AuthProvider.tsx`

**Purpose:** Provides global authentication state and methods to all components.

**Props:** `children: React.ReactNode`

**Context Value:**
```typescript
{
  user: AuthUserDTO | null,
  session: SessionDTO | null,
  isLoading: boolean,
  isAuthenticated: boolean,
  isGuest: boolean,
  login: (email: string, password: string) => Promise<ServiceResult<SessionDTO>>,
  logout: () => Promise<void>,
  refreshSession: () => Promise<void>,
}
```

**Behavior:**
- On mount: Check localStorage for existing session, validate token
- On login: Store tokens, update state, trigger profile fetch
- On logout: Clear tokens, reset state, redirect to home
- On token expiry: Attempt refresh, logout if failed

### 4.2 Header Component

**File:** `src/components/navigation/Header.tsx`

**Purpose:** Main navigation with auth-aware user menu.

**Props:** None (uses AuthContext)

**Structure:**
```
Header
├── Logo (link to /)
├── Navigation
│   ├── Quiz link
│   ├── Explorer link
│   └── (authenticated) Dashboard link
└── UserMenu (or Login/Register links)
```

**Behavior:**
- Shows Login/Register links when not authenticated
- Shows UserMenu dropdown when authenticated
- Highlights current route

### 4.3 UserMenu Component

**File:** `src/components/navigation/UserMenu.tsx`

**Purpose:** Dropdown menu for authenticated user actions.

**Props:** None (uses AuthContext)

**Menu Items:**
- Profile
- Achievements
- Statistics
- Settings
- Divider
- Logout

**Behavior:**
- Shows user email/display name
- Dropdown on click
- Logout calls AuthContext.logout()

### 4.4 LoginForm Component

**File:** `src/components/auth/LoginForm.tsx`

**Purpose:** User login with email and password.

**Props:**
```typescript
{
  redirectTo?: string; // URL to redirect after login
}
```

**State:**
- email, password (controlled inputs)
- isLoading (submission state)
- error (API error message)
- touched (field validation state)

**Required Navigation Links (per PRD US-004):**
- "Forgot password?" link below password field → `/reset-password`
- "Don't have an account? Register" link at form bottom → `/register`

**Behavior:**
- Client-side validation on blur and submit
- API call on submit
- Store tokens on success
- Redirect to redirectTo or /dashboard

### 4.5 RegisterForm Component

**File:** `src/components/auth/RegisterForm.tsx`

**Purpose:** User registration with email and password.

**Props:** None

**State:**
- email, password (controlled inputs)
- isLoading (submission state)
- error (API error message)
- passwordStrength (computed strength indicator)
- success (registration success state)

**Required Navigation Links:**
- "Already have an account? Log in" link at form bottom → `/login`

**Behavior:**
- Real-time password strength indicator (suggestions for uppercase, numbers - not blocking)
- Client-side validation (email format, password min 8 chars)
- API call on submit
- Show success message (per PRD US-001: "user receives confirmation")
- Auto-redirect to dashboard after brief delay
- Store tokens in localStorage before redirect

### 4.6 PasswordResetForm Component

**File:** `src/components/auth/PasswordResetForm.tsx`

**Purpose:** Request password reset or update password with token.

**Props:** None

**State:**
- email (for reset request)
- password (for password update)
- step ('request' | 'update')
- token (from URL params)
- isLoading, error, success

**Behavior:**
- Detect token in URL to determine step
- Request step: Send reset email
- Update step: Submit new password with token
- Show appropriate success/error messages

### 4.7 GuestBanner Component

**File:** `src/components/auth/GuestBanner.tsx`

**Purpose:** Inform guests their progress won't be saved.

**Props:**
```typescript
{
  variant?: 'default' | 'compact' | 'quiz-complete';
}
```

**Behavior:**
- default: Full banner with register CTA
- compact: Smaller, dismissible
- quiz-complete: Post-quiz prompt to register

---

## 5. API ENDPOINT SPECIFICATIONS

### 5.1 POST /api/auth/register

**Purpose:** Create new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_confirmed_at": null,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "session": {
    "access_token": "jwt...",
    "refresh_token": "uuid",
    "expires_at": 1704067200,
    "expires_in": 3600
  },
  "message": "Registration successful"
}
```

**Errors:**
- 400: Validation error
- 409: Email already exists

### 5.2 POST /api/auth/login

**Purpose:** Authenticate existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_confirmed_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "session": {
    "access_token": "jwt...",
    "refresh_token": "uuid",
    "expires_at": 1704067200,
    "expires_in": 3600
  }
}
```

**Errors:**
- 400: Validation error
- 401: Invalid credentials

### 5.3 POST /api/auth/logout

**Purpose:** Invalidate user session.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Errors:**
- 401: Unauthorized (invalid/missing token)

### 5.4 POST /api/auth/password-reset

**Purpose:** Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists, a reset email has been sent"
}
```

**Note:** Always returns success to prevent email enumeration.

### 5.5 POST /api/auth/password-update

**Purpose:** Update password with reset token.

**Headers:** `Authorization: Bearer <reset_token>`

**Request:**
```json
{
  "password": "newsecurepassword123"
}
```

**Response (200):**
```json
{
  "message": "Password updated successfully"
}
```

**Errors:**
- 400: Validation error (weak password)
- 401: Invalid/expired token

### 5.6 POST /api/auth/refresh

**Purpose:** Refresh access token.

**Request:**
```json
{
  "refresh_token": "uuid"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "session": {
    "access_token": "new_jwt...",
    "refresh_token": "new_uuid",
    "expires_at": 1704070800,
    "expires_in": 3600
  }
}
```

**Errors:**
- 401: Invalid/expired refresh token

### 5.7 GET /api/auth/session

**Purpose:** Get current session info.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "user": { ... },
  "session": { ... }
}
```

**Errors:**
- 401: Unauthorized

---

## 6. FILE STRUCTURE

### 6.1 New Files to Create

```
src/
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx        # Global auth context
│   │   ├── ProtectedRoute.tsx      # Client route guard
│   │   └── GuestBanner.tsx         # Guest mode banner
│   └── navigation/
│       ├── Header.tsx              # Main navigation
│       ├── UserMenu.tsx            # User dropdown menu
│       ├── MobileNav.tsx           # Mobile navigation
│       └── NavLink.tsx             # Navigation link
├── layouts/
│   ├── AppLayout.astro             # Authenticated pages layout
│   └── AuthLayout.astro            # Auth pages layout
├── pages/
│   ├── auth/
│   │   └── callback.astro          # Email confirmation callback handler (OAuth out of scope per PRD 4.2)
│   └── api/
│       └── auth/
│           ├── refresh.ts          # Token refresh endpoint
│           └── session.ts          # Session info endpoint
└── components/
    └── hooks/
        └── useAuth.ts              # Auth hook for components
```

### 6.2 Existing Files to Modify

```
src/
├── middleware/index.ts             # Add route protection
├── layouts/Layout.astro            # Update for auth integration
├── pages/
│   ├── index.astro                 # Add guest mode CTA
│   ├── login.astro                 # Use AuthLayout
│   ├── register.astro              # Use AuthLayout
│   ├── reset-password.astro        # Use AuthLayout
│   ├── dashboard.astro             # Use AppLayout, add auth check
│   └── quiz/[mode].astro           # Add guest banner
├── components/
│   └── auth/
│       ├── LoginForm.tsx           # Add redirect handling
│       └── RegisterForm.tsx        # Add auto-login after register
└── env.d.ts                        # Add userId to App.Locals
```

---

## 7. INTEGRATION CONSIDERATIONS

### 7.1 Existing Application Compatibility

The authentication system integrates with existing features:

| Feature | Integration Point |
|---------|-------------------|
| Quiz System | Check isGuest before saving results |
| Explorer Mode | Works unchanged, banner for guests |
| Achievements | Protected route, requires auth |
| Statistics | Protected route, requires auth |
| Profile | Protected route, requires auth |
| AI Hints | Rate limit for guests |

### 7.2 Quiz Result Saving

Existing quiz flow modification:

```typescript
// In quiz completion handler
const onQuizComplete = async (results: QuizResults) => {
  // Display results to user immediately
  showResults(results);

  // Save only if authenticated
  if (!isGuest && userId) {
    await saveQuizSession({
      userId,
      quizType,
      difficulty,
      score: results.score,
      answers: results.answers,
    });

    // Check for new achievements
    await checkAchievements(userId);
  }

  // Show guest prompt if not authenticated
  if (isGuest) {
    showGuestPrompt();
  }
};
```

### 7.3 Type Safety Updates

Update `src/env.d.ts`:

```typescript
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      userId?: string;  // Set by middleware for protected routes
    }
  }
}
```

---

## 8. TESTING REQUIREMENTS

### 8.1 Unit Tests

| Component/Service | Test Cases |
|-------------------|------------|
| AuthService | register success, register email exists, login success, login invalid credentials, logout, password reset, token refresh |
| LoginForm | validation errors, successful submit, API error handling |
| RegisterForm | validation errors, password strength, successful submit |
| AuthProvider | initial state, login flow, logout flow, session refresh |

### 8.2 Integration Tests

| Flow | Test Steps |
|------|------------|
| Registration | Submit form → API call → Token stored → Redirect |
| Login | Submit form → API call → Token stored → Redirect |
| Logout | Click logout → API call → Tokens cleared → Redirect |
| Password Reset | Request reset → Click email link → Update password → Login |
| Protected Route | Access without auth → Redirect to login |
| Guest Mode | Access quiz → Complete → See guest prompt |

### 8.3 E2E Tests

| Scenario | Verification |
|----------|-------------|
| New user journey | Register → Complete quiz → View progress |
| Returning user | Login → View saved progress → Continue |
| Guest to user | Guest quiz → Register → Previous quiz not saved |
| Session expiry | Wait for expiry → Auto-refresh or redirect |

---

## 9. IMPLEMENTATION PHASES

### Phase 1: Core Auth Infrastructure
- AuthProvider component
- Route protection middleware
- Token refresh endpoint
- Session endpoint

### Phase 2: Navigation & Layout
- AppLayout with Header
- AuthLayout for auth pages
- UserMenu component
- Mobile navigation

### Phase 3: Guest Mode
- GuestBanner component
- Guest state handling in quiz
- Post-quiz registration prompt

### Phase 4: Integration
- Quiz result saving with auth check
- Protected routes setup
- Achievement/Statistics pages auth

### Phase 5: Polish & Testing
- Error handling improvements
- Loading states
- Unit and integration tests
- E2E test suite

---

## 10. PRD ALIGNMENT NOTES

This section documents decisions made to align the specification with the PRD requirements.

### 10.1 Confirmed Alignments

| PRD Requirement | Spec Decision |
|-----------------|---------------|
| OAuth out of scope (PRD 4.2) | `/auth/callback` page is for email confirmation only, not OAuth |
| Password min 8 chars (US-001) | Enforced in Zod schema and client validation |
| Reset link expires 24 hours (US-004) | Documented in security section, configured in Supabase |
| Guest mode visible on landing (US-005) | Landing page includes "Try as Guest" CTA |
| No progress for guests (US-005) | Quiz completion checks `isGuest` before saving |

### 10.2 Clarifications

| Ambiguity | Resolution | Rationale |
|-----------|------------|-----------|
| Email verification before login | NOT required | PRD US-001 states "user is logged in" immediately after registration |
| AI hints for guests | Full access (same as authenticated) | PRD US-039 makes no distinction between user types |
| Logout redirect destination | Landing page (/) | PRD US-003 allows "landing page or login screen" - landing page provides guest mode access |
| Password strength requirements | 8 chars enforced; uppercase/number suggested only | PRD only mandates 8 characters |

### 10.3 Out of Scope (Per PRD 4.2)

The following are explicitly NOT included in this specification:
- OAuth authentication (Google, Facebook, GitHub)
- Social features (leaderboards, sharing)
- Multi-language support
- Light mode theme
- Premium/paid features
- Session management across devices (single session is sufficient)
