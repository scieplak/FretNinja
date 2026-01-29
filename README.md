# FretNinja

A web-based educational application for guitarists to master the fretboard through interactive quizzes, exploration, and gamification.

**Live Demo:** [fretninja.vercel.app](https://fretninja.vercel.app)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

FretNinja helps beginner and intermediate guitarists develop a deep, intuitive understanding of the guitar fretboard. Instead of relying on memorized chord shapes and scale patterns, users learn to recognize notes, intervals, and patterns through interactive quizzes with immediate visual feedback.

**Design Principles:**
- Dark mode UI with emerald/purple neon accents
- Sharp notation system (C#, D#, F#, G#, A#)
- TAB-style fretboard orientation (high E at top)
- Desktop and tablet optimized
- Guest mode available (no registration required)

## Features

### Quiz Modes

Four distinct quiz modes with three difficulty levels each:

| Mode | Description | Goal |
|------|-------------|------|
| **Find the Note** | Locate all positions of a given note | Mark every occurrence of the target note on the visible fretboard |
| **Name the Note** | Identify a highlighted position | Choose the correct note name from multiple options |
| **Mark the Chord** | Build a chord shape | Select all notes that form the displayed triad |
| **Recognize the Interval** | Identify the distance between two notes | Choose from 6-12 interval options based on difficulty |

**Difficulty Levels:**

| Level | Fret Range | Notes | Timer | Intervals |
|-------|------------|-------|-------|-----------|
| Easy | 0-5 | Natural only (C,D,E,F,G,A,B) | None | 6 options |
| Medium | 0-9 | All 12 notes | None | 9 options |
| Hard | 0-12 | All 12 notes | 30 seconds | 12 options |

### Explorer Mode

Free exploration of the fretboard with:
- **Scales:** Major, Natural Minor, Pentatonic Major, Pentatonic Minor
- **Chords:** Major, Minor, Diminished, Augmented triads
- **Controls:** Toggle note names, switch between 12/24 fret views
- **AI Hints:** Get learning tips and memorization tricks (requires login)

### Progress Tracking

- **Note Mastery:** Visual grid showing accuracy percentage for each of the 12 notes
- **Statistics:** Total quizzes, practice time, current streak, breakdowns by quiz type and difficulty
- **History:** Paginated list of all completed quiz sessions

### Gamification

- **Daily Streaks:** Track consecutive days of practice
- **Achievements:** Unlock badges for milestones (first quiz, perfect scores, streaks, etc.)

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Astro | 5.x | Static site generation with islands architecture |
| React | 19.x | Interactive components |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Radix UI | - | Accessible primitives via shadcn/ui |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL database, authentication, Row Level Security |
| OpenRouter.ai | AI-powered hints (Claude/GPT models) |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Vercel | Hosting and serverless functions |
| GitHub Actions | CI/CD pipelines |

### Testing
| Technology | Purpose |
|------------|---------|
| Vitest | Unit and integration tests |
| React Testing Library | Component testing |
| Playwright | End-to-end testing |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Astro Pages │  │   React     │  │    Tailwind CSS     │  │
│  │   (.astro)  │  │ Components  │  │      Styling        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     API Layer                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Astro API Routes (/api/*)              │    │
│  │   • /api/auth/*     - Authentication endpoints      │    │
│  │   • /api/quiz-*     - Quiz session management       │    │
│  │   • /api/stats/*    - Progress and statistics       │    │
│  │   • /api/ai/*       - AI hint generation            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Auth       │  │    Quiz      │  │    Stats     │       │
│  │  Service     │  │   Service    │  │   Service    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      Supabase                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │    Auth     │  │   Row Level         │  │
│  │  Database   │  │   (JWT)     │  │   Security          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 22.x (see `.nvmrc`)
- npm 10.x+
- Supabase project (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/fretninja.git
cd fretninja

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# OpenRouter (optional, for AI hints)
OPENROUTER_API_KEY=your-api-key
```

### Development

```bash
# Start development server (http://localhost:3000)
npm run dev

# Run with E2E test configuration
npm run dev:e2e
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests in watch mode |
| `npm run test:run` | Run unit tests once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with interactive UI |

## Project Structure

```
src/
├── components/          # React components
│   ├── achievements/    # Achievement display
│   ├── auth/           # Login, Register, Password forms
│   ├── dashboard/      # Dashboard view
│   ├── explorer/       # Fretboard explorer
│   ├── fretboard/      # Core fretboard component
│   ├── profile/        # User profile
│   ├── progress/       # Note mastery and stats
│   ├── quiz/           # Quiz hub, active view, results
│   ├── settings/       # User settings
│   └── ui/             # shadcn/ui primitives
├── db/                 # Database types and client
├── layouts/            # Astro layouts
├── lib/
│   ├── helpers/        # Utility functions
│   ├── schemas/        # Zod validation schemas
│   └── services/       # Business logic services
├── middleware/         # Astro middleware (auth)
├── pages/
│   ├── api/           # API endpoints
│   └── *.astro        # Page routes
└── types.ts           # Shared TypeScript types

supabase/
└── migrations/        # Database migrations

tests/
├── unit/             # Vitest unit tests
└── e2e/              # Playwright E2E tests
```

## Testing

### Unit Tests

```bash
# Run all unit tests
npm run test:run

# Run with coverage
npm run test:coverage

# Watch mode
npm run test
```

### E2E Tests

```bash
# Run headless
npm run test:e2e

# Run with Playwright UI
npm run test:e2e:ui

# View last report
npm run test:e2e:report
```

## Deployment

The application is deployed on Vercel with automatic deployments from the `master` branch.

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Environment Setup

Configure the following environment variables in Vercel:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `OPENROUTER_API_KEY` (optional)

## Database Schema

Key tables:
- `profiles` - User profiles with streak data
- `quiz_sessions` - Quiz attempt records
- `quiz_answers` - Individual question answers
- `achievements` - Available achievements
- `user_achievements` - Earned achievements per user

All tables are protected with Row Level Security (RLS) policies.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- ESLint + Prettier enforced via Husky pre-commit hooks
- TypeScript strict mode enabled
- Prefer functional components with hooks
- Use Tailwind for styling (no CSS modules)

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with care for guitarists learning the fretboard, one session at a time.
