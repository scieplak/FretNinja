# FretNinja

FretNinja is a web-based educational application for guitarists to develop intuitive understanding of the guitar fretboard through interactive quizzes and exploration, enhanced with gamification elements.

Key characteristics:
- Web-based (no installation required)
- Standard 6-string guitar in E-standard tuning (E-A-D-G-B-E)
- English language interface
- Dark mode UI with purple-green neon accents (ninja theme)
- Sharp notation system (C#, D#, F#, G#, A#)
- Desktop and tablet optimized

## Tech Stack

- Astro 5
- TypeScript 5
- React 19
- Tailwind 4
- Shadcn/ui
- Supabase (PostgreSQL, Auth)
- OpenRouter.ai (AI hints)

## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/middleware/index.ts` - Astro middleware
- `./src/db` - Supabase clients and types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - Client-side components written in Astro (static) and React (dynamic)
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/components/hooks` - Custom React hooks
- `./src/lib` - Services and helpers
- `./src/lib/services` - Business logic services
- `./src/assets` - Static internal assets
- `./public` - Public assets
- `./supabase/migrations` - Database migrations

When modifying the directory structure, always update this section.

## Coding Practices

### Guidelines for Clean Code

- Use feedback from linters to improve the code when making changes
- Prioritize error handling and edge cases
- Handle errors and edge cases at the beginning of functions
- Use early returns for error conditions to avoid deeply nested if statements
- Place the happy path last in the function for improved readability
- Avoid unnecessary else statements; use if-return pattern instead
- Use guard clauses to handle preconditions and invalid states early
- Implement proper error logging and user-friendly error messages
- Consider using custom error types or error factories for consistent error handling

## Frontend

### General Guidelines

- Use Astro components (.astro) for static content and layout
- Implement framework components in React only when interactivity is needed

### Guidelines for Styling (Tailwind)

- Use the @layer directive to organize styles into components, utilities, and base layers
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus-visible:, active:, etc.) for interactive elements

### Guidelines for Accessibility (ARIA Best Practices)

- Use ARIA landmarks to identify regions of the page (main, navigation, search, etc.)
- Apply appropriate ARIA roles to custom interface elements that lack semantic HTML equivalents
- Set aria-expanded and aria-controls for expandable content like accordions and dropdowns
- Use aria-live regions with appropriate politeness settings for dynamic content updates
- Implement aria-hidden to hide decorative or duplicative content from screen readers
- Apply aria-label or aria-labelledby for elements without visible text labels
- Use aria-describedby to associate descriptive text with form inputs or complex elements
- Implement aria-current for indicating the current item in a set, navigation, or process
- Avoid redundant ARIA that duplicates the semantics of native HTML elements

## React

### Guidelines for React

- Use functional components with hooks instead of class components
- Never use "use client" and other Next.js directives as we use React with Astro
- Extract logic into custom hooks in `src/components/hooks`
- Implement React.memo() for expensive components that render often with the same props
- Utilize React.lazy() and Suspense for code-splitting and performance optimization
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

## Astro

### Guidelines for Astro

- Leverage View Transitions API for smooth page transitions (use ClientRouter)
- Use content collections with type safety for blog posts, documentation, etc.
- Leverage Server Endpoints for API routes
- Use POST, GET - uppercase format for endpoint handlers
- Use `export const prerender = false` for API routes
- Use zod for input validation in API routes
- Extract logic into services in `src/lib/services`
- Implement middleware for request/response modification
- Use image optimization with the Astro Image integration
- Implement hybrid rendering with server-side rendering where needed
- Use Astro.cookies for server-side cookie management
- Leverage import.meta.env for environment variables

## Backend and Database

- Use Supabase for backend services, including authentication and database interactions
- Follow Supabase guidelines for security and performance
- Use Zod schemas to validate data exchanged with the backend
- Use supabase from context.locals in Astro routes instead of importing supabaseClient directly
- Use SupabaseClient type from `src/db/supabase.client.ts`, not from `@supabase/supabase-js`

## Supabase Astro Initialization

This section provides a reproducible guide to create the necessary file structure for integrating Supabase with Astro.

### Prerequisites

- Your project should use Astro 5, TypeScript 5, React 19, and Tailwind 4
- Install the `@supabase/supabase-js` package
- Ensure that `/supabase/config.toml` exists
- Ensure that a file `/src/db/database.types.ts` exists and contains the correct type definitions for your database

IMPORTANT: Check prerequisites before performing actions below. If they're not met, stop and ask a user for the fix.

### 1. Supabase Client Initialization

Create the file `/src/db/supabase.client.ts` with the following content:

```ts
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

This file initializes the Supabase client using the environment variables `SUPABASE_URL` and `SUPABASE_KEY`.

### 2. Middleware Setup

Create the file `/src/middleware/index.ts` with the following content:

```ts
import { defineMiddleware } from 'astro:middleware';

import { supabaseClient } from '../db/supabase.client.ts';

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

This middleware adds the Supabase client to the Astro context locals, making it available throughout your application.

### 3. TypeScript Environment Definitions

Create the file `src/env.d.ts` with the following content:

```ts
/// <reference types="astro/client" />

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types.ts';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

This file augments the global types to include the Supabase client on the Astro `App.Locals` object, ensuring proper typing throughout your application.

## Database Migrations

This project uses the migrations provided by the Supabase CLI.

### Creating a migration file

Create database migration files inside the folder `supabase/migrations/`.

The file MUST be named in the format `YYYYMMDDHHmmss_short_description.sql` with proper casing for months, minutes, and seconds in UTC time:

1. `YYYY` - Four digits for the year (e.g., `2024`)
2. `MM` - Two digits for the month (01 to 12)
3. `DD` - Two digits for the day of the month (01 to 31)
4. `HH` - Two digits for the hour in 24-hour format (00 to 23)
5. `mm` - Two digits for the minute (00 to 59)
6. `ss` - Two digits for the second (00 to 59)
7. Add an appropriate description for the migration

For example:
```
20240906123045_create_profiles.sql
```

### SQL Guidelines

Write Postgres-compatible SQL code for Supabase migration files that:

- Includes a header comment with metadata about the migration, such as the purpose, affected tables/columns, and any special considerations
- Includes thorough comments explaining the purpose and expected behavior of each migration step
- Write all SQL in lowercase
- Add copious comments for any destructive SQL commands, including truncating, dropping, or column alterations
- When creating a new table, you MUST enable Row Level Security (RLS) even if the table is intended for public access
- When creating RLS Policies:
  - Ensure the policies cover all relevant access scenarios (e.g. select, insert, update, delete) based on the table's purpose and data sensitivity
  - If the table is intended for public access the policy can simply return `true`
  - RLS Policies should be granular: one policy for `select`, one for `insert` etc) and for each supabase role (`anon` and `authenticated`). DO NOT combine Policies even if the functionality is the same for both roles
  - Include comments explaining the rationale and intended behavior of each security policy

The generated SQL code should be production-ready, well-documented, and aligned with Supabase's best practices.

## Shadcn/ui Components

This project uses @shadcn/ui for UI components. These are beautifully designed, accessible components that can be customized for your application.

### Finding installed components

Components are available in the folder `src/components/ui`, according to aliases from the `components.json` file.

### Using components

Import components using the configured `@/` alias:

```tsx
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
```

Example usage:

```tsx
<Button variant="outline">Click me</Button>

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

### Installing additional components

Many other components are available but not currently installed. Full list at https://ui.shadcn.com/r

To install a new component, use the shadcn CLI:

```bash
npx shadcn@latest add [component-name]
```

For example, to add the accordion component:

```bash
npx shadcn@latest add accordion
```

Important: `npx shadcn-ui@latest` has been deprecated, use `npx shadcn@latest`

Some popular components:
- Accordion, Alert, AlertDialog, AspectRatio, Avatar
- Calendar, Checkbox, Collapsible, Command, ContextMenu
- DataTable, DatePicker, Dropdown Menu, Form
- Hover Card, Menubar, Navigation Menu, Popover, Progress
- Radio Group, ScrollArea, Select, Separator, Sheet
- Skeleton, Slider, Switch, Table, Textarea
- Sonner (previously Toast), Toggle, Tooltip

### Component Styling

This project uses the "new-york" style variant with "neutral" base color and CSS variables for theming, as configured in `components.json`.

## Documentation

- PRD: `.ai/prd.md`
- Tech Stack: `.ai/tech-stack.md`
