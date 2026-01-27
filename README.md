# FretNinja

A web-based educational application for guitarists to master the fretboard through interactive quizzes, exploration, and gamification.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

FretNinja helps beginner and intermediate guitarists develop a deep, intuitive understanding of the guitar fretboard. Instead of relying on memorized chord shapes and scale patterns, users learn to recognize notes, chords, intervals, and scales through interactive quizzes with immediate visual and audio feedback.

**Key Features:**

- **Interactive Fretboard** - Visual 6-string guitar fretboard (E-standard tuning) with clickable positions and note sounds
- **Four Quiz Modes:**
  - Find the Note - Locate notes on the fretboard
  - Name the Note - Identify highlighted positions
  - Mark the Chord - Find all notes of a triad
  - Recognize the Interval - Identify intervals between notes
- **Explorer Mode** - Free exploration with scale and chord pattern overlays
- **Progress Tracking** - Quiz history, error heatmaps, and statistics
- **Gamification** - Daily streaks and achievements
- **AI-Powered Hints** - Personalized learning assistance via OpenRouter.ai

**Characteristics:**

- Dark mode UI with purple-green neon accents (ninja theme)
- Sharp notation system (C#, D#, F#, G#, A#)
- Desktop and tablet optimized
- Guest mode available (no registration required to try)

## Tech Stack

### Frontend

- **Astro 5** - Fast, performant pages with minimal JavaScript
- **React 19** - Interactive components where needed
- **TypeScript 5** - Static typing and IDE support
- **Tailwind CSS 4** - Utility-first styling
- **Shadcn/ui** - Accessible React component library

### Backend

- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Built-in authentication
  - Open source, self-hostable

### AI

- **OpenRouter.ai** - Access to multiple AI models for learning hints

### Testing

- **Vitest** - Unit and integration testing
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing

### CI/CD & Hosting

- **GitHub Actions** - CI/CD pipelines
- **DigitalOcean** - Docker-based hosting

## Getting Started Locally

### Prerequisites

- Node.js 22.14.0 (see `.nvmrc`)
- npm or yarn
- Supabase account (for backend services)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/fretninja.git
cd fretninja
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Configure the following variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

4. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:4321`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |

## Project Scope

### MVP (In Scope)

- Single instrument: 6-string guitar in E-standard tuning
- Four quiz modes with three difficulty levels (Easy, Medium, Hard)
- Explorer mode with 4 scales (Major, Natural Minor, Pentatonic Major/Minor)
- Email/password authentication
- Progress tracking for logged-in users
- Guest mode for trying quizzes
- 5 achievements and streak tracking
- AI-powered hints
- Sharp notation only
- English language only
- Dark mode UI only

### Out of Scope (Future Considerations)

- Alternative tunings and other instruments
- OAuth authentication (Google, Facebook, GitHub)
- Social features (leaderboards, challenges)
- Offline mode / PWA
- Multiple languages
- Light mode theme
- Microphone input for note recognition
- MIDI controller support

## Project Status

**Status: Early Development**

This project is currently in the initial development phase. Core features are being implemented according to the MVP scope.

## License

MIT
