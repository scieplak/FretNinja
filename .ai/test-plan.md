# FretNinja Test Plan

## 1. Introduction and Testing Objectives

### 1.1 Document Purpose
This document defines a comprehensive test plan for FretNinja, a web-based educational application designed to help guitarists develop intuitive understanding of the guitar fretboard through interactive quizzes and exploration.

### 1.2 Testing Objectives
- Ensure core functionality reliability (authentication, quiz system, data persistence)
- Validate correct music theory implementation (notes, chords, intervals)
- Verify seamless user experience across guest and authenticated modes
- Confirm gamification elements work correctly (achievements, streaks, statistics)
- Validate API endpoints and database operations
- Ensure accessibility compliance for all interactive elements
- Verify cross-browser compatibility and responsive design

### 1.3 Quality Goals
| Metric | Target |
|--------|--------|
| Critical bug count | 0 |
| High priority bug count | ≤ 2 |
| Code coverage (unit tests) | ≥ 80% |
| E2E test pass rate | 100% |
| Performance (LCP) | < 2.5s |
| Accessibility score | ≥ 90 |

---

## 2. Test Scope

### 2.1 In Scope

#### Frontend Components
- **Fretboard** (`src/components/fretboard/Fretboard.tsx`)
  - Note rendering and positioning
  - Click interaction and selection
  - Visual feedback (highlight, correct, incorrect, selected states)
  - Fret markers display
  - 12/24 fret range switching
  - Note name display toggle

- **Quiz System** (`src/components/quiz/`)
  - QuizHub - mode and difficulty selection
  - QuizActiveView - question generation, answer handling, timer
  - QuizResultsView - score display, achievement notifications
  - All 4 quiz types: find_note, name_note, mark_chord, recognize_interval

- **Explorer** (`src/components/explorer/ExplorerView.tsx`)
  - Scale and chord pattern display
  - AI hint integration
  - Settings persistence

- **Dashboard** (`src/components/dashboard/DashboardView.tsx`)
  - Statistics display
  - Recent sessions
  - Streak tracking

- **Progress** (`src/components/progress/ProgressView.tsx`)
  - Error heatmap visualization
  - Statistics filtering
  - Session history pagination

- **Achievements** (`src/components/achievements/AchievementsView.tsx`)
  - Achievement list display
  - Progress tracking

- **Authentication** (`src/components/auth/`)
  - Login, Register, Password Reset forms
  - Form validation
  - Error handling

#### Backend Services
- Authentication service (`src/lib/services/auth.service.ts`)
- Quiz session service (`src/lib/services/quiz-session.service.ts`)
- Quiz answer service (`src/lib/services/quiz-answer.service.ts`)
- Achievement service (`src/lib/services/achievement.service.ts`)
- Statistics service (`src/lib/services/stats.service.ts`)
- AI service (`src/lib/services/ai.service.ts`)
- Profile service (`src/lib/services/profile.service.ts`)

#### API Endpoints
- Authentication endpoints (`/api/auth/*`)
- Quiz session endpoints (`/api/quiz-sessions/*`)
- Statistics endpoints (`/api/stats/*`)
- AI endpoints (`/api/ai/*`)
- Profile and user endpoints (`/api/profile`, `/api/user/*`)

#### Database Layer
- Supabase client integration
- Row Level Security (RLS) policies
- Database migrations

### 2.2 Out of Scope
- Third-party service internal testing (Supabase, OpenRouter)
- Load testing beyond expected user volumes
- Penetration testing (separate security audit)
- Mobile native applications
- Browser versions older than 2 years

---

## 3. Test Types

### 3.1 Unit Tests

**Purpose:** Test individual functions, components, and modules in isolation.

**Coverage Areas:**
| Category | Components/Modules | Priority |
|----------|-------------------|----------|
| Music Theory Logic | Note calculations, chord formulas, interval calculations | Critical |
| Quiz Logic | Question generation, answer validation, score calculation | Critical |
| Validation Schemas | All Zod schemas in `src/lib/schemas/` | High |
| Helper Functions | Auth helpers, utility functions | High |
| React Hooks | Custom hooks in `src/components/hooks/` | Medium |
| UI Components | Button states, form inputs, display components | Medium |

**Tools:** Vitest, React Testing Library

### 3.2 Integration Tests

**Purpose:** Test interactions between multiple components and services.

**Coverage Areas:**
| Integration Point | Description | Priority |
|-------------------|-------------|----------|
| Auth Flow | Registration → Login → Session management → Logout | Critical |
| Quiz Flow | Session creation → Answer submission → Completion → Results | Critical |
| Fretboard + Quiz | Click handling → Answer recording → Visual feedback | Critical |
| API + Database | Endpoint handlers → Service layer → Supabase operations | High |
| Statistics | Quiz completion → Stats update → Dashboard display | High |
| Achievements | Quiz completion → Achievement check → User notification | High |

**Tools:** Vitest, Supertest (API), Testing Library

### 3.3 End-to-End (E2E) Tests

**Purpose:** Test complete user journeys from browser to database.

**Key User Journeys:**
1. **Guest Quiz Flow**
   - Select quiz mode and difficulty
   - Complete 10 questions
   - View results
   - No data persistence verification

2. **Authenticated User Complete Flow**
   - Register new account
   - Complete tutorial
   - Take quiz
   - View dashboard statistics
   - Check achievements
   - Explore fretboard with AI hints
   - View progress heatmap

3. **Authentication Flows**
   - Registration with validation errors
   - Successful login/logout
   - Password reset flow
   - Session persistence across page navigation

**Tools:** Playwright

### 3.4 API Tests

**Purpose:** Verify API contracts, authentication, and error handling.

**Endpoints to Test:**

| Endpoint | Methods | Auth Required | Key Scenarios |
|----------|---------|---------------|---------------|
| `/api/auth/register` | POST | No | Valid registration, duplicate email, invalid data |
| `/api/auth/login` | POST | No | Valid credentials, invalid password, non-existent user |
| `/api/auth/logout` | POST | Yes | Successful logout, invalid session |
| `/api/quiz-sessions` | GET, POST | Yes | Create session, list with filters, pagination |
| `/api/quiz-sessions/[id]` | GET, PATCH | Yes | Get details, complete, abandon |
| `/api/quiz-sessions/[id]/answers` | POST | Yes | Record answer, validation errors |
| `/api/stats/overview` | GET | Yes | Statistics calculation |
| `/api/stats/heatmap` | GET | Yes | Heatmap data with filters |
| `/api/ai/hint` | POST | No* | AI hint generation, rate limiting |
| `/api/profile` | GET, PATCH | Yes | Get/update profile |
| `/api/achievements` | GET | No | List all achievements |
| `/api/user/achievements` | GET | Yes | User's earned achievements |

**Tools:** Supertest, Vitest

### 3.5 Component Tests

**Purpose:** Test React components with simulated user interactions.

**Priority Components:**

| Component | Key Test Cases |
|-----------|---------------|
| `Fretboard` | Note click events, visual states, accessibility labels, responsive sizing |
| `QuizActiveView` | Question display, timer countdown, answer submission, state transitions |
| `QuizHub` | Mode selection, difficulty selection, quiz launch |
| `QuizResultsView` | Score display, achievement notifications, replay action |
| `LoginForm` | Validation, submission, error display |
| `RegisterForm` | Field validation, password requirements, submission |
| `ExplorerView` | Pattern selection, note highlighting, AI hint display |
| `DashboardView` | Data loading, statistics rendering, empty states |
| `ProgressView` | Tab switching, filter application, heatmap rendering |

**Tools:** React Testing Library, Vitest

### 3.6 Visual Regression Tests

**Purpose:** Detect unintended UI changes.

**Key Visual Elements:**
- Fretboard rendering (notes, markers, strings)
- Quiz question cards
- Results summary
- Dashboard cards
- Progress heatmap
- Achievement badges

**Tools:** Playwright visual comparisons, Percy (optional)

### 3.7 Accessibility Tests

**Purpose:** Ensure WCAG 2.1 AA compliance.

**Focus Areas:**
- Keyboard navigation through fretboard
- Screen reader announcements for quiz feedback
- Focus management in modals
- Color contrast ratios
- ARIA attributes on interactive elements
- Form label associations

**Tools:** axe-core, Playwright accessibility testing

### 3.8 Performance Tests

**Purpose:** Validate application performance under load.

**Metrics to Monitor:**
| Metric | Target | Tool |
|--------|--------|------|
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| First Input Delay (FID) | < 100ms | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| API Response Time | < 200ms (p95) | Custom metrics |

**Tools:** Lighthouse CI, Web Vitals

---

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication

#### 4.1.1 User Registration
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AUTH-001 | Register with valid email and password | Account created, redirect to quiz |
| AUTH-002 | Register with existing email | Error: "Email already registered" |
| AUTH-003 | Register with invalid email format | Validation error on email field |
| AUTH-004 | Register with password < 8 characters | Validation error on password field |
| AUTH-005 | Register with empty fields | Validation errors on all fields |

#### 4.1.2 User Login
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AUTH-010 | Login with valid credentials | Redirect to dashboard, session cookie set |
| AUTH-011 | Login with invalid password | Error: "Invalid credentials" |
| AUTH-012 | Login with non-existent email | Error: "Invalid credentials" |
| AUTH-013 | Login while already authenticated | Redirect to dashboard |
| AUTH-014 | Session persistence on page reload | User remains logged in |

#### 4.1.3 Password Reset
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AUTH-020 | Request reset with valid email | Success message, email sent |
| AUTH-021 | Request reset with non-existent email | Success message (security) |
| AUTH-022 | Update password with valid token | Password updated, redirect to login |
| AUTH-023 | Update password with expired token | Error: "Token expired" |

### 4.2 Quiz System

#### 4.2.1 Quiz Hub
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| QUIZ-001 | Select "Find Note" mode | Mode highlighted, ready to select difficulty |
| QUIZ-002 | Select "Hard" difficulty | Difficulty highlighted with timer warning |
| QUIZ-003 | Start quiz without mode selection | Start button disabled |
| QUIZ-004 | Start quiz as guest | Quiz starts without session persistence |
| QUIZ-005 | Start quiz as authenticated user | Quiz session created in database |

#### 4.2.2 Find Note Quiz
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| QUIZ-010 | Display note name (e.g., "C#") | Note displayed, fretboard ready for click |
| QUIZ-011 | Click correct position | Green feedback, score +1, next question |
| QUIZ-012 | Click incorrect position | Red feedback, correct position shown |
| QUIZ-013 | Complete 10 questions | Navigate to results view |

#### 4.2.3 Name Note Quiz
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| QUIZ-020 | Highlight position on fretboard | Position highlighted, options displayed |
| QUIZ-021 | Select correct note from options | Green feedback, score +1 |
| QUIZ-022 | Select incorrect note | Red feedback, correct answer shown |

#### 4.2.4 Mark Chord Quiz
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| QUIZ-030 | Display chord (e.g., "A minor") | Chord displayed, multiple selection enabled |
| QUIZ-031 | Select all correct positions | Green feedback on all positions |
| QUIZ-032 | Submit with partial correct | Feedback showing missed positions |
| QUIZ-033 | Select incorrect position | Red feedback on incorrect positions |

#### 4.2.5 Recognize Interval Quiz
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| QUIZ-040 | Highlight two positions | Both positions highlighted, options displayed |
| QUIZ-041 | Select correct interval | Green feedback, score +1 |
| QUIZ-042 | Select incorrect interval | Red feedback, correct interval shown |

#### 4.2.6 Timer Functionality (Hard Mode)
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| QUIZ-050 | Question starts | 30-second countdown visible |
| QUIZ-051 | Answer before timeout | Timer stops, normal flow |
| QUIZ-052 | Timer reaches 0 | Auto-submit as incorrect, next question |
| QUIZ-053 | Timer visual at 5 seconds | Warning color/animation |

#### 4.2.7 Quiz Results
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| QUIZ-060 | View results after completion | Score, percentage, motivational message |
| QUIZ-061 | Achievement earned during quiz | Achievement notification displayed |
| QUIZ-062 | Click "Play Again" | Return to quiz hub |
| QUIZ-063 | Review answered questions | All questions with correct/incorrect indicators |

### 4.3 Fretboard Component

#### 4.3.1 Display and Rendering
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| FRET-001 | Render 12-fret board | 12 frets, 6 strings, proper markers |
| FRET-002 | Render 24-fret board | 24 frets, double dots at 12 and 24 |
| FRET-003 | Toggle note names ON | All note names visible |
| FRET-004 | Toggle note names OFF | Notes hidden or indicated |
| FRET-005 | Fret markers displayed | Dots at 3,5,7,9,12,15,17,19,21,24 |

#### 4.3.2 Interaction
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| FRET-010 | Click note position | onClick callback with position data |
| FRET-011 | Highlight position | Yellow pulse animation |
| FRET-012 | Correct answer feedback | Green color with shadow |
| FRET-013 | Incorrect answer feedback | Red color with shadow |
| FRET-014 | Multi-select mode (chord) | Multiple positions selectable |
| FRET-015 | Keyboard navigation | Tab through positions, Enter to select |

### 4.4 Explorer

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| EXPL-001 | Select root note | Note options displayed |
| EXPL-002 | Select scale/chord type | Pattern displayed on fretboard |
| EXPL-003 | Request AI hint | Hint displayed with tips |
| EXPL-004 | Settings saved to localStorage | Settings persist on reload |
| EXPL-005 | Toggle fretboard range | Switch between 12/24 frets |

### 4.5 Dashboard and Statistics

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| DASH-001 | Load dashboard | Overview stats, recent sessions, streaks |
| DASH-002 | Display current streak | Correct day count |
| DASH-003 | Show recent quiz sessions | Last 5 sessions with scores |
| DASH-004 | Empty state (new user) | Friendly message, link to quiz |

### 4.6 Progress and Heatmap

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| PROG-001 | View error heatmap | Fretboard with error frequency colors |
| PROG-002 | Filter by quiz type | Heatmap updates |
| PROG-003 | Filter by date range | Statistics recalculated |
| PROG-004 | View session history | Paginated list of sessions |
| PROG-005 | Empty heatmap state | Message indicating no data |

### 4.7 Achievements

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| ACH-001 | View all achievements | List with earned/unearned status |
| ACH-002 | View earned achievement | Shows earned date |
| ACH-003 | View progress | Progress bar for unearned achievements |
| ACH-004 | Achievement triggered | Notification after quiz completion |

---

## 5. Test Environment

### 5.1 Development Environment
- **Local Development:** Astro dev server
- **Database:** Supabase local (Docker) or development project
- **Node.js:** v20+ (LTS)
- **Package Manager:** npm/pnpm

### 5.2 CI/CD Environment (GitHub Actions)
- **Runner:** Ubuntu latest
- **Node.js:** v20
- **Database:** Supabase CLI with local instance
- **Browsers:** Chromium (Playwright)

### 5.3 Staging Environment
- **Hosting:** DigitalOcean (Docker)
- **Database:** Supabase staging project
- **Domain:** staging.fretninja.com

### 5.4 Production Environment
- **Hosting:** DigitalOcean (Docker)
- **Database:** Supabase production project
- **Domain:** fretninja.com

### 5.5 Browser Matrix
| Browser | Version | Priority |
|---------|---------|----------|
| Chrome | Latest, Latest-1 | Critical |
| Firefox | Latest, Latest-1 | High |
| Safari | Latest | High |
| Edge | Latest | Medium |
| Mobile Chrome | Latest | High |
| Mobile Safari | Latest | High |

---

## 6. Testing Tools

### 6.1 Testing Frameworks
| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Vitest** | Unit & integration tests | `vitest.config.ts` |
| **React Testing Library** | Component testing | Included with Vitest |
| **Playwright** | E2E testing | `playwright.config.ts` |
| **Supertest** | API testing | Integrated with Vitest |

### 6.2 Code Quality Tools
| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **TypeScript** | Type checking |
| **Prettier** | Code formatting |

### 6.3 CI/CD Integration
| Tool | Purpose |
|------|---------|
| **GitHub Actions** | Automated test execution |
| **Lighthouse CI** | Performance testing |

### 6.4 Monitoring and Reporting
| Tool | Purpose |
|------|---------|
| **Vitest UI** | Test result visualization |
| **Playwright Report** | E2E test reports |
| **Coverage reports** | Code coverage tracking |

### 6.5 Configuration (Implemented)

**`vitest.config.ts`:**
```typescript
/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**/*',
        'src/db/database.types.ts',
        'src/env.d.ts',
        'src/components/ui/**/*',
      ],
    },
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
});
```

**`playwright.config.ts`:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Only Chromium as per guidelines
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**Available npm scripts:**
- `npm run test` - Run Vitest in watch mode
- `npm run test:run` - Run Vitest once
- `npm run test:coverage` - Run with coverage report
- `npm run test:ui` - Run Vitest with UI
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Run Playwright with UI
- `npm run test:e2e:report` - Show Playwright report

---

## 7. Test Schedule

### 7.1 Continuous Testing (Every Commit)
- Unit tests
- Linting and type checking
- Critical E2E smoke tests

### 7.2 Pull Request Testing
- Full unit test suite
- Integration tests
- Component tests
- E2E tests on Chrome

### 7.3 Nightly Builds
- Full E2E test suite (all browsers)
- Performance tests
- Visual regression tests
- Accessibility tests

### 7.4 Release Testing
- Complete test suite execution
- Manual exploratory testing
- Cross-browser verification
- Staging environment validation

### 7.5 Test Execution Phases
| Phase | Tests | Trigger | Duration |
|-------|-------|---------|----------|
| Pre-commit | Lint, types, unit | Git hook | < 2 min |
| CI Build | Unit, integration | Push | < 5 min |
| PR Validation | Full suite | PR | < 15 min |
| Nightly | Extended suite | Schedule | < 30 min |
| Release | All + manual | Manual | < 2 hours |

---

## 8. Test Acceptance Criteria

### 8.1 Unit Test Criteria
- All unit tests pass
- Code coverage ≥ 80%
- No skipped tests without documented reason
- No flaky tests

### 8.2 Integration Test Criteria
- All integration tests pass
- API contract tests pass
- Database operations verified
- Authentication flows work correctly

### 8.3 E2E Test Criteria
- All critical user journeys pass
- No visual regressions
- Performance metrics within targets
- Accessibility score ≥ 90

### 8.4 Release Criteria
| Category | Criteria |
|----------|----------|
| Tests | 100% pass rate |
| Coverage | ≥ 80% line coverage |
| Performance | LCP < 2.5s, FID < 100ms |
| Accessibility | WCAG 2.1 AA compliant |
| Security | No critical vulnerabilities |
| Bugs | 0 critical, ≤ 2 high severity |

---

## 9. Roles and Responsibilities

### 9.1 Development Team
| Role | Responsibilities |
|------|-----------------|
| **Developer** | Write unit tests, fix bugs, maintain test code |
| **Tech Lead** | Review test coverage, approve test strategy changes |
| **QA Engineer** | Write E2E tests, perform exploratory testing, maintain test plan |

### 9.2 RACI Matrix
| Activity | Developer | Tech Lead | QA Engineer |
|----------|-----------|-----------|-------------|
| Unit test creation | R/A | C | I |
| Integration test creation | R | A | C |
| E2E test creation | C | A | R |
| Test plan maintenance | I | A | R |
| Bug triage | R | A | R |
| Test execution review | C | R/A | R |
| Release sign-off | C | A | R |

*R = Responsible, A = Accountable, C = Consulted, I = Informed*

---

## 10. Bug Reporting Procedures

### 10.1 Bug Severity Levels
| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **Critical** | Application unusable, data loss | < 4 hours | Login broken, quiz data not saved |
| **High** | Major feature broken | < 24 hours | Quiz timer not working, wrong scoring |
| **Medium** | Feature degraded | < 1 week | Visual glitch, minor UX issue |
| **Low** | Minor issue | Backlog | Typo, cosmetic issue |

### 10.2 Bug Report Template
```markdown
## Bug Report

**Title:** [Brief description]

**Severity:** [Critical/High/Medium/Low]

**Environment:**
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14.0]
- User state: [Guest/Authenticated]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshots/Recordings:**
[Attach if applicable]

**Additional Context:**
[Console errors, network logs, etc.]
```

### 10.3 Bug Workflow
1. **New** - Bug reported, awaiting triage
2. **Confirmed** - Bug verified and prioritized
3. **In Progress** - Developer working on fix
4. **In Review** - Fix in code review/testing
5. **Resolved** - Fix deployed
6. **Closed** - Verified in production

### 10.4 Bug Tracking
- Primary tool: GitHub Issues
- Labels: `bug`, `severity:critical/high/medium/low`, `component:[name]`
- Milestones: Sprint-based tracking

---

## Appendix A: Test File Organization

**Unit/Integration tests (Vitest)** - co-located with source files:
```
/src
├── /components
│   ├── /ui
│   │   └── button.test.tsx          # Component tests
│   ├── /quiz
│   │   └── QuizHub.test.tsx
│   ├── /fretboard
│   │   └── Fretboard.test.tsx
│   └── /auth
│       └── LoginForm.test.tsx
├── /lib
│   ├── /services
│   │   ├── auth.service.test.ts     # Service tests
│   │   ├── quiz-session.service.test.ts
│   │   └── stats.service.test.ts
│   └── /schemas
│       └── auth.schemas.test.ts     # Schema validation tests
└── /test
    └── setup.ts                      # Global test setup
```

**E2E tests (Playwright)** - in dedicated directory with Page Object Model:
```
/e2e
├── /pages                            # Page Objects
│   ├── BasePage.ts                   # Base page class
│   ├── HomePage.ts
│   ├── LoginPage.ts
│   ├── QuizPage.ts
│   └── DashboardPage.ts
├── /fixtures
│   └── test-fixtures.ts              # Custom test fixtures
├── home.spec.ts                      # E2E tests
├── auth.spec.ts
├── quiz-guest.spec.ts
├── quiz-authenticated.spec.ts
├── dashboard.spec.ts
└── explorer.spec.ts
```

---

## Appendix B: Critical Test Coverage Matrix

| Component/Feature | Unit | Integration | E2E | Priority |
|-------------------|------|-------------|-----|----------|
| Authentication Service | ✅ | ✅ | ✅ | Critical |
| Quiz Session Service | ✅ | ✅ | ✅ | Critical |
| Quiz Answer Service | ✅ | ✅ | ✅ | Critical |
| Fretboard Component | ✅ | ✅ | ✅ | Critical |
| Quiz Active View | ✅ | ✅ | ✅ | Critical |
| Achievement Service | ✅ | ✅ | - | High |
| Statistics Service | ✅ | ✅ | - | High |
| Dashboard View | ✅ | - | ✅ | High |
| Progress View | ✅ | - | ✅ | Medium |
| Explorer View | ✅ | ✅ | ✅ | Medium |
| AI Service | ✅ | - | - | Medium |
| Profile Service | ✅ | ✅ | - | Low |

---

## Appendix C: Music Theory Test Cases

### Note Calculation Tests
- Verify all 12 notes in sharp notation: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
- Verify note positions on each string (E-A-D-G-B-E tuning)
- Verify octave wrapping at fret 12

### Interval Tests
| Interval | Semitones | Example |
|----------|-----------|---------|
| Minor 2nd | 1 | C → C# |
| Major 2nd | 2 | C → D |
| Minor 3rd | 3 | C → D# |
| Major 3rd | 4 | C → E |
| Perfect 4th | 5 | C → F |
| Tritone | 6 | C → F# |
| Perfect 5th | 7 | C → G |
| Minor 6th | 8 | C → G# |
| Major 6th | 9 | C → A |
| Minor 7th | 10 | C → A# |
| Major 7th | 11 | C → B |
| Octave | 12 | C → C |

### Chord Formula Tests
| Chord Type | Formula | Example (C root) |
|------------|---------|------------------|
| Major | 1-3-5 | C-E-G |
| Minor | 1-♭3-5 | C-D#-G |
| Diminished | 1-♭3-♭5 | C-D#-F# |
| Augmented | 1-3-#5 | C-E-G# |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: QA Engineering Team*
