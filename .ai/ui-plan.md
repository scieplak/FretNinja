# UI Architecture for FretNinja

## 1. UI Structure Overview

FretNinja is a web-based guitar fretboard learning application with a dark-themed, ninja-inspired interface featuring purple-green neon accents. The UI is structured around three primary experiences: **Quiz System** (active learning through testing), **Explorer Mode** (free-form practice), and **Progress Tracking** (analytics and motivation).

### Architecture Principles

- **Astro 5** for static pages and routing with **React 19** islands for interactive components
- **Responsive-first design**: Desktop (≥1024px) primary, tablet (768-1023px), mobile landscape (≥640px)
- **Dark mode only** with WCAG AA compliant contrast ratios
- **Hybrid state management**: React Context + TanStack Query for server state
- **Progressive enhancement**: Core functionality works without JavaScript for initial render

### Hydration Strategy

| Page Type | Hydration | Rationale |
|-----------|-----------|-----------|
| Landing, Auth pages | `client:idle` | Forms need interactivity but not immediately |
| Dashboard | `client:visible` | Widgets load as they come into view |
| Quiz, Explorer | `client:load` | Full interactivity required immediately |
| Progress, Achievements | `client:visible` | Data visualizations load on scroll |
| Settings, Profile | `client:idle` | Forms can wait for idle time |

---

## 2. View List

### 2.1 Landing Page

| Attribute | Details |
|-----------|---------|
| **Path** | `/` |
| **Purpose** | Convert visitors to registered users or engaged guests |
| **Key Information** | Value proposition, feature highlights, social proof |
| **Auth Required** | No |
| **API Endpoints** | None |

**Key Components:**
- Hero section with animated fretboard visualization (static SVG with CSS animations)
- Feature cards highlighting: 4 Quiz Modes, Explorer Mode, Progress Tracking, AI Hints
- Primary CTA: "Get Started Free" → `/register`
- Secondary CTA: "Try as Guest" → `/dashboard` (sets guest mode)
- Tertiary link: "Already have an account? Log in" → `/login`
- Footer with app info

**UX Considerations:**
- Above-the-fold CTA visibility
- Feature cards use icons matching quiz mode icons for consistency
- Animated fretboard demonstrates interactivity without requiring input

**Accessibility:**
- All CTAs have descriptive text (not just "Click here")
- Animations respect `prefers-reduced-motion`
- Skip link to main content

**Security:**
- No sensitive data exposed
- Guest mode clearly indicated as temporary

---

### 2.2 Registration Page

| Attribute | Details |
|-----------|---------|
| **Path** | `/register` |
| **Purpose** | Create new user accounts |
| **Key Information** | Registration form, validation feedback |
| **Auth Required** | No (redirects if authenticated) |
| **API Endpoints** | `POST /api/auth/register` |

**Key Components:**
- Centered card layout
- Email input with real-time format validation
- Password input with visibility toggle and strength indicator
- Submit button (disabled until valid)
- Link to login page
- Error alert for API errors (email exists, server error)
- Success state with redirect to dashboard

**UX Considerations:**
- Inline validation on blur
- Password requirements displayed upfront
- Auto-focus on email field
- Form submits on Enter key

**Accessibility:**
- Labels associated with inputs via `htmlFor`
- Error messages linked via `aria-describedby`
- Focus management on error display

**Security:**
- Password field uses `type="password"` with toggle
- No password hints stored or displayed
- HTTPS enforced
- CSRF protection via Supabase

---

### 2.3 Login Page

| Attribute | Details |
|-----------|---------|
| **Path** | `/login` |
| **Purpose** | Authenticate existing users |
| **Key Information** | Login form, error feedback |
| **Auth Required** | No (redirects if authenticated) |
| **API Endpoints** | `POST /api/auth/login` |

**Key Components:**
- Centered card layout
- Email input
- Password input with visibility toggle
- "Remember me" checkbox (optional, controls session duration)
- Submit button
- "Forgot password?" link → `/reset-password`
- Link to registration page
- Error alert for invalid credentials

**UX Considerations:**
- Preserve email on failed attempt
- Clear error on new input
- Auto-focus on email field

**Accessibility:**
- Same as registration page
- Error announcements via `aria-live`

**Security:**
- Generic error message ("Invalid email or password") to prevent enumeration
- Rate limiting feedback if triggered

---

### 2.4 Password Reset Page

| Attribute | Details |
|-----------|---------|
| **Path** | `/reset-password` |
| **Purpose** | Initiate password recovery flow |
| **Key Information** | Email form, success confirmation |
| **Auth Required** | No |
| **API Endpoints** | `POST /api/auth/password-reset`, `POST /api/auth/password-update` |

**Key Components:**
- Two states:
  1. **Request reset**: Email input form
  2. **Set new password**: Password input form (accessed via email link with token)
- Success message with instructions
- Back to login link

**UX Considerations:**
- Same success message whether email exists or not (security)
- Clear instructions about checking spam folder

**Accessibility:**
- Focus management between states
- Success message announced

**Security:**
- Token-based reset via URL parameter
- Token expiration (24 hours)
- No indication of email existence

---

### 2.5 Dashboard

| Attribute | Details |
|-----------|---------|
| **Path** | `/dashboard` |
| **Purpose** | Central hub for user activity and quick navigation |
| **Key Information** | Streak, stats, recent activity, achievement progress |
| **Auth Required** | Yes (guest mode shows limited version) |
| **API Endpoints** | `GET /api/profile`, `GET /api/stats/overview`, `GET /api/user/achievements`, `GET /api/quiz-sessions` |

**Key Components:**
- **Header bar**: Welcome message ("Welcome back, [name]"), streak counter with flame icon
- **Guest banner** (if guest): Persistent alert explaining no progress saving, CTA to register
- **Primary CTA card**: "Start Quiz" button (large, prominent) → `/quiz`
- **Quick Stats widget**:
  - Total quizzes completed
  - Average score (%)
  - Total practice time
- **Recent Activity widget**:
  - Last 5 quiz sessions
  - Shows: date, mode icon, score, difficulty badge
  - "View all" link → `/progress`
- **Achievement Progress widget**:
  - Next closest achievement with progress bar
  - "View all" link → `/achievements`
- **Heatmap Preview widget**:
  - Miniature fretboard showing error density
  - Click to expand → `/progress`
- **AI Tips widget** (logged-in only):
  - Personalized learning suggestion
  - "Get more tips" link

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Welcome, User                    🔥 5 days  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │        [ START QUIZ ]                   │ │
│ └─────────────────────────────────────────┘ │
├──────────────────────┬──────────────────────┤
│ Quick Stats          │ Recent Activity      │
│ • 23 quizzes         │ • Today: Find Note 8/10 │
│ • 78% avg            │ • Yesterday: Chord 7/10 │
│ • 4.2 hrs            │ • ...                │
├──────────────────────┼──────────────────────┤
│ Next Achievement     │ Problem Areas        │
│ [====----] 46%       │ [mini heatmap]       │
│ String Master        │                      │
└──────────────────────┴──────────────────────┘
```

**UX Considerations:**
- New users (0 quizzes): Simplified layout with only "Take Your First Quiz" CTA and feature introduction
- Skeleton loading for async data
- Optimistic updates for streak

**Accessibility:**
- Landmarks: `<main>`, `<nav>`, widget `<section>` with `aria-label`
- Stats use semantic HTML (not just styled text)
- Heatmap has text alternative

**Security:**
- Profile data scoped to authenticated user
- Guest sees no sensitive data

---

### 2.6 Quiz Hub

| Attribute | Details |
|-----------|---------|
| **Path** | `/quiz` |
| **Purpose** | Select quiz mode and difficulty before starting |
| **Key Information** | 4 quiz modes, difficulty options |
| **Auth Required** | No (guest can access) |
| **API Endpoints** | None (selection only) |

**Key Components:**
- **Mode Selection Grid** (4 cards):
  1. **Find the Note**: Icon (magnifying glass + note), "Click the fretboard to find the displayed note"
  2. **Name the Note**: Icon (question mark + fret), "Identify the note at the highlighted position"
  3. **Mark the Chord**: Icon (three notes), "Mark all notes that form the displayed chord"
  4. **Recognize the Interval**: Icon (two connected notes), "Identify the interval between two notes"
- **Difficulty Selector** (appears after mode selection):
  - **Easy**: "Strings 1-3 only, no time limit" - Recommended for beginners
  - **Medium**: "Full fretboard (frets 0-12), no time limit"
  - **Hard**: "Full fretboard, 30-second timer per question"
- **Start Quiz button** (appears after both selections)
- Back to dashboard link

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Choose Your Challenge                       │
├─────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │  Find    │ │  Name    │ │  Mark    │ │ Interval │ │
│ │  Note    │ │  Note    │ │  Chord   │ │          │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────┤
│ Select Difficulty                           │
│ ○ Easy  ○ Medium  ○ Hard                    │
├─────────────────────────────────────────────┤
│            [ START QUIZ ]                   │
└─────────────────────────────────────────────┘
```

**UX Considerations:**
- Cards have hover/focus states
- Selected mode highlighted
- Difficulty descriptions help user choose appropriately
- Keyboard navigation between cards

**Accessibility:**
- Mode cards are `role="radio"` in a `role="radiogroup"`
- Clear focus indicators
- Descriptions read by screen readers

**Security:**
- No sensitive data
- Selection stored in client state only

---

### 2.7 Quiz Active View

| Attribute | Details |
|-----------|---------|
| **Path** | `/quiz/[mode]` where mode is `find-note`, `name-note`, `mark-chord`, `recognize-interval` |
| **Purpose** | Conduct the 10-question quiz session |
| **Key Information** | Question prompt, fretboard, progress, timer, feedback |
| **Auth Required** | No (guest can play, results not saved) |
| **API Endpoints** | `POST /api/quiz-sessions`, `POST /api/quiz-sessions/:id/answers`, `PATCH /api/quiz-sessions/:id` |

**Key Components:**
- **Question Prompt**: Large, clear display of what to find/answer
  - Find Note: "Find: C"
  - Name Note: Highlighted position on fretboard
  - Mark Chord: "Mark all notes of: C major"
  - Interval: Two highlighted positions
- **Fretboard Component**: Full interactive fretboard (see Component section)
- **Progress Indicator**: "Question 3 of 10" with progress bar
- **Timer** (Hard mode only): Countdown display with visual urgency at <10s
- **Hint Button**: Opens AI hint panel (doesn't affect score)
- **Control Bar**:
  - Pause button → shows modal with Resume/Quit options
  - Submit button (for Mark the Chord mode where multiple selections needed)
- **Feedback Overlay** (after answer):
  - Correct: Green flash, checkmark icon, success sound
  - Incorrect: Red flash, X icon, shows correct position(s), failure sound
  - Duration: 1.5 seconds before next question

**Answer Input by Mode:**
- **Find Note**: Single click on fretboard position
- **Name Note**: Multiple choice buttons (4 options including correct answer)
- **Mark Chord**: Multiple fretboard clicks + Submit button
- **Interval**: Multiple choice buttons (interval names)

**Quiz State Machine:**
```
[idle] → [loading] → [question] ↔ [feedback] → [question] ... → [completed]
                         ↓
                      [paused]
```

**UX Considerations:**
- Full-screen focus (minimal distractions)
- Large touch targets (min 44px)
- Immediate feedback builds learning connection
- Timer creates urgency without frustration (Hard mode opt-in)
- LocalStorage backup for recovery

**Accessibility:**
- Fretboard keyboard navigable
- Question prompt in `aria-live` region
- Feedback announced to screen readers
- Timer has `aria-label` with remaining time

**Security:**
- Answer validation happens server-side on completion
- Client-side correctness for immediate feedback only
- Session bound to user

---

### 2.8 Quiz Results View

| Attribute | Details |
|-----------|---------|
| **Path** | `/quiz/[mode]/results` (or modal/overlay on quiz page) |
| **Purpose** | Display quiz performance and next actions |
| **Key Information** | Score, time, mistakes, achievements earned |
| **Auth Required** | No |
| **API Endpoints** | Response from `PATCH /api/quiz-sessions/:id` (includes achievements_earned) |

**Key Components:**
- **Score Display**: Large "8/10" with percentage and performance message
  - 10/10: "Perfect! 🎯"
  - 8-9: "Great job!"
  - 6-7: "Good effort!"
  - <6: "Keep practicing!"
- **Time Taken**: "Completed in 2:35"
- **Breakdown Section**:
  - List of missed questions with:
    - Question number
    - What was asked
    - User's answer (if applicable)
    - Correct answer
    - Fret position visualization (mini fretboard)
- **Achievements Earned** (if any):
  - Achievement card with animation
  - Confetti effect for first achievement
- **Action Buttons**:
  - "Retry Same Quiz" (same mode + difficulty)
  - "Try Different Mode" → Quiz Hub
  - "Back to Dashboard"
- **Guest Registration CTA** (if guest):
  - Modal overlay: "Create an account to save your progress!"
  - "Register Now" button
  - "Continue as Guest" dismiss option

**UX Considerations:**
- Celebration for good scores (no negativity for low scores)
- Clear path to improvement (show what was wrong)
- Achievement notifications are celebratory
- Don't auto-dismiss results

**Accessibility:**
- Score announced on load
- Achievements announced with name and description
- Action buttons clearly labeled

**Security:**
- Results validated server-side
- Score cannot be manipulated client-side

---

### 2.9 Explorer Mode

| Attribute | Details |
|-----------|---------|
| **Path** | `/explorer` |
| **Purpose** | Free exploration of fretboard with scale/chord overlays |
| **Key Information** | Interactive fretboard, scale/chord patterns |
| **Auth Required** | No |
| **API Endpoints** | None (client-side only), `POST /api/ai/hint` for hints |

**Key Components:**
- **Fretboard** (main area, ~70% of screen): Full interactive fretboard in explorer mode
- **Control Panel** (collapsible sidebar):
  - **Root Note Selector**: 12 buttons in chromatic order (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
  - **Pattern Type Tabs**: "Scales" | "Chords"
  - **Scale Selector** (when Scales active):
    - Major Scale
    - Natural Minor Scale
    - Pentatonic Major
    - Pentatonic Minor
  - **Chord Selector** (when Chords active):
    - Major
    - Minor
    - Diminished
    - Augmented
  - **Clear Overlay** button
  - **Note Names Toggle** (quick access)
  - **Fretboard Range Toggle** (12/24 frets)
- **Info Panel** (below fretboard or collapsible):
  - Notes in selected pattern (e.g., "C Major: C - D - E - F - G - A - B")
  - Interval formula (e.g., "1 - 2 - 3 - 4 - 5 - 6 - 7")
- **Hint Button**: Request AI explanation for current selection

**Overlay Visualization:**
- Root notes: Highlighted with distinct color (purple)
- Pattern notes: Highlighted with secondary color (green)
- Non-pattern notes: Dimmed but still clickable
- Clicking any note plays its sound

**Layout:**
```
┌────────────────────────────────────┬─────────┐
│                                    │ Root    │
│                                    │ [C][C#] │
│          FRETBOARD                 │ [D][D#] │
│                                    │ ...     │
│                                    ├─────────┤
│                                    │ Scales  │
│                                    │ Chords  │
│                                    ├─────────┤
│                                    │ [Major] │
│                                    │ [Minor] │
├────────────────────────────────────┴─────────┤
│ C Major: C - D - E - F - G - A - B           │
└──────────────────────────────────────────────┘
```

**UX Considerations:**
- Remember last selection in localStorage
- Real-time overlay updates
- Panel collapsible for more fretboard space on smaller screens
- Tutorial on first visit

**Accessibility:**
- Root note buttons in logical tab order
- Pattern selection announced
- Fretboard positions have ARIA labels with note names

**Security:**
- No user data stored
- AI hints require authentication (rate limited)

---

### 2.10 Progress View

| Attribute | Details |
|-----------|---------|
| **Path** | `/progress` |
| **Purpose** | Visualize learning progress and identify weak areas |
| **Key Information** | Error heatmap, statistics, quiz history |
| **Auth Required** | Yes |
| **API Endpoints** | `GET /api/stats/heatmap`, `GET /api/stats/overview`, `GET /api/quiz-sessions` |

**Key Components:**
- **Tab Navigation**: "Heatmap" | "Statistics" | "History"

**Heatmap Tab:**
- **Full Heatmap Fretboard**: Fretboard with color gradient overlay
  - Green (0 errors) → Yellow → Orange → Red (max errors)
  - Tooltips on hover: "Fret 3, String 5 (C): 12 errors"
- **Filter Controls**:
  - Quiz Type dropdown: All, Find Note, Name Note, Mark Chord, Interval
  - Date Range: Last 7 days, Last 30 days, All time, Custom
- **Legend**: Color scale explanation
- **AI Tips Button**: Get personalized improvement suggestions

**Statistics Tab:**
- **Overview Cards**:
  - Total quizzes completed
  - Total practice time
  - Current streak / Longest streak
- **By Quiz Type**: Bar chart or cards showing:
  - Count, average score, best score per mode
- **By Difficulty**: Performance breakdown by Easy/Medium/Hard
- **Trend Chart**: Line chart showing score improvement over time (last 7 days vs previous 7 days)

**History Tab:**
- **Quiz Session Table**:
  - Columns: Date, Mode, Difficulty, Score, Time
  - Sortable by date (default: newest first)
  - Pagination (20 per page)
  - Click row to see detailed breakdown
- **Filters**: Mode, Difficulty, Date range

**UX Considerations:**
- Default to Heatmap tab (most actionable)
- Skeleton loading for data
- Empty states with encouragement to take quizzes
- Heatmap interactive (click position to see details)

**Accessibility:**
- Charts have text alternatives
- Table is properly structured with headers
- Color coding supplemented with patterns/labels

**Security:**
- Data scoped to authenticated user only
- RLS enforced on API

---

### 2.11 Achievements View

| Attribute | Details |
|-----------|---------|
| **Path** | `/achievements` |
| **Purpose** | Display earned achievements and progress toward unearned |
| **Key Information** | 5 achievements with status and progress |
| **Auth Required** | Yes |
| **API Endpoints** | `GET /api/achievements`, `GET /api/user/achievements` |

**Key Components:**
- **Achievement Grid**: Cards for each of the 5 achievements

**Earned Achievement Card:**
- Full color badge/icon with glow effect
- Achievement name and description
- "Earned on [date]"
- Checkmark indicator

**Unearned Achievement Card:**
- Grayscale badge/icon
- Achievement name and description
- Progress bar with percentage (e.g., "23/50 - 46%")
- Lock overlay icon

**Achievement Details:**
1. **First Steps**: Complete your first quiz
2. **Perfect Round**: Score 10/10 on any quiz
3. **Week Warrior**: Maintain a 7-day streak
4. **String Master**: Complete 50 "Find the Note" quizzes
5. **Chord Ninja**: Complete 50 "Mark the Chord" quizzes

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Your Achievements                           │
├─────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ ✓ First  │ │ 🔒Week   │ │ 🔒String │     │
│ │  Steps   │ │ Warrior  │ │ Master   │     │
│ │ Earned   │ │ [===---] │ │ [=-----] │     │
│ │ Jan 10   │ │  5/7     │ │  23/50   │     │
│ └──────────┘ └──────────┘ └──────────┘     │
│ ┌──────────┐ ┌──────────┐                  │
│ │ 🔒Chord  │ │ 🔒Perfect│                  │
│ │  Ninja   │ │  Round   │                  │
│ │ [=-----] │ │ [------] │                  │
│ │  12/50   │ │  0/1     │                  │
│ └──────────┘ └──────────┘                  │
└─────────────────────────────────────────────┘
```

**UX Considerations:**
- Earned achievements first, then sorted by closest to completion
- Hover effects reveal more details
- Celebration animation on page if recently earned achievement
- Empty state not possible (always 5 achievements)

**Accessibility:**
- Achievement status clearly indicated in text (not just color)
- Progress bars have `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

**Security:**
- Achievement status validated server-side
- Cannot manually unlock achievements

---

### 2.12 Settings View

| Attribute | Details |
|-----------|---------|
| **Path** | `/settings` |
| **Purpose** | Customize application preferences |
| **Key Information** | Fretboard, audio, account, tutorial settings |
| **Auth Required** | Partial (some settings work for guests via localStorage) |
| **API Endpoints** | `GET /api/profile`, `PATCH /api/profile` |

**Key Components:**

**Fretboard Section:**
- Fretboard Range: Toggle "12 frets" | "24 frets"
- Show Note Names: Toggle on/off

**Audio Section:**
- Master Volume: Slider (0-100%)
- Note Sounds: Toggle on/off
- Feedback Sounds: Toggle on/off

**Account Section** (logged-in only):
- Email: Read-only display
- Display Name: Editable input
- Change Password: Button → expands to password change form
- Delete Account: Button → confirmation modal with password re-entry

**Tutorials Section:**
- Reset Tutorials: Button to re-enable all onboarding tutorials

**About Section:**
- App Version
- Link to support/feedback (GitHub issues)
- Credits/attribution

**Behavior:**
- Changes auto-save with debounce (300ms)
- "Saved" toast appears briefly on successful save
- Guest settings stored in localStorage
- Logged-in user settings synced to API

**UX Considerations:**
- Grouped into logical sections
- Immediate feedback on changes
- Destructive actions (delete account) require confirmation

**Accessibility:**
- Toggles use `<Switch>` with proper ARIA
- Slider has `aria-valuetext`
- Section headings for navigation

**Security:**
- Password change requires current session
- Account deletion requires password confirmation
- Settings cannot affect other users

---

### 2.13 Profile View

| Attribute | Details |
|-----------|---------|
| **Path** | `/profile` |
| **Purpose** | View and edit user profile information |
| **Key Information** | Display name, email, account stats |
| **Auth Required** | Yes |
| **API Endpoints** | `GET /api/profile`, `PATCH /api/profile` |

**Key Components:**
- **Profile Header**:
  - Avatar placeholder (initials or default icon)
  - Display name (editable inline)
  - Email (read-only)
  - Member since date
- **Account Stats**:
  - Current streak
  - Longest streak
  - Total quizzes by mode
- **Quick Links**:
  - View Progress → `/progress`
  - View Achievements → `/achievements`
  - Settings → `/settings`

**UX Considerations:**
- Minimal page, mostly informational
- Easy navigation to related pages
- Display name inline editing

**Accessibility:**
- Proper heading hierarchy
- Links clearly labeled

**Security:**
- Profile data scoped to authenticated user

---

## 3. User Journey Map

### 3.1 Primary Journey: New User First Quiz

```
┌─────────────┐
│  Landing    │
│    Page     │
└─────┬───────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐
│  Register   │────▶│  Dashboard  │
│             │     │ (New User)  │
└─────────────┘     └─────┬───────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Quiz Hub   │
                    │(Select Mode)│
                    └─────┬───────┘
                          │
                          ▼
                    ┌─────────────┐
                    │   Tutorial  │
                    │(First Time) │
                    └─────┬───────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ Quiz Active │
                    │ (10 Qs)     │
                    └─────┬───────┘
                          │
                          ▼
                    ┌─────────────┐
                    │   Results   │
                    │ +Achievement│
                    └─────┬───────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Dashboard  │
                    │(With Stats) │
                    └─────────────┘
```

**Steps:**
1. User lands on homepage, clicks "Get Started Free"
2. Completes registration form, submits
3. Redirected to dashboard, sees welcome message and "Take Your First Quiz" CTA
4. Clicks CTA, arrives at Quiz Hub
5. Selects "Find the Note" mode (recommended for beginners)
6. Selects "Easy" difficulty
7. Sees tutorial overlay explaining the mode (3 coach marks)
8. Completes tutorial, quiz begins
9. Answers 10 questions with immediate feedback
10. Sees results: score, time, "First Steps" achievement earned
11. Clicks "Back to Dashboard"
12. Dashboard now shows stats, streak of 1, achievement

### 3.2 Guest User Journey

```
┌─────────────┐
│  Landing    │
│    Page     │
└─────┬───────┘
      │ "Try as Guest"
      ▼
┌─────────────┐
│  Dashboard  │
│(Guest Mode) │◀────────────────────┐
└─────┬───────┘                     │
      │ [Guest Banner visible]      │
      ▼                             │
┌─────────────┐                     │
│ Quiz Active │                     │
└─────┬───────┘                     │
      │                             │
      ▼                             │
┌─────────────┐     ┌───────────┐   │
│   Results   │────▶│ Register  │───┘ (if registered)
│             │     │   CTA     │
└─────────────┘     └───────────┘
                          │ "Continue as Guest"
                          ▼
                    ┌─────────────┐
                    │  Dashboard  │
                    │(No Persist) │
                    └─────────────┘
```

### 3.3 Returning User Journey

```
┌─────────────┐
│   Login     │
└─────┬───────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐
│  Dashboard  │────▶│   Progress  │
│(With Data)  │     │ (Heatmap)   │
└─────┬───────┘     └─────────────┘
      │
      ├────────────▶ Quiz Hub ──▶ Quiz ──▶ Results
      │
      ├────────────▶ Explorer
      │
      ├────────────▶ Achievements
      │
      └────────────▶ Settings
```

### 3.4 Quiz Flow State Machine

```
                    ┌─────────┐
                    │  IDLE   │
                    └────┬────┘
                         │ Start Quiz
                         ▼
                    ┌─────────┐
                    │ LOADING │ (Create session, load data)
                    └────┬────┘
                         │
                         ▼
              ┌─────────────────────┐
              │                     │
              ▼                     │
         ┌─────────┐                │
    ┌───▶│QUESTION │                │
    │    └────┬────┘                │
    │         │ User answers        │
    │         ▼                     │
    │    ┌─────────┐                │
    │    │FEEDBACK │ (1.5s)         │
    │    └────┬────┘                │
    │         │                     │
    │         ├─── Q < 10 ──────────┘
    │         │
    │         ▼ Q = 10
    │    ┌─────────┐
    │    │COMPLETED│ (Submit to API)
    │    └────┬────┘
    │         │
    │         ▼
    │    ┌─────────┐
    │    │ RESULTS │
    │    └─────────┘
    │
    │    ┌─────────┐
    └────│ PAUSED  │◀── Pause button
         └─────────┘
              │
              ├── Resume ──▶ QUESTION
              │
              └── Quit ──▶ ABANDONED ──▶ Dashboard
```

---

## 4. Layout and Navigation Structure

### 4.1 Global Layout

```
┌────────────────────────────────────────────────────┐
│ ┌──────┐                              ┌─────────┐  │
│ │ Logo │           HEADER             │ Profile │  │
│ └──────┘                              └─────────┘  │
├────────┬───────────────────────────────────────────┤
│        │                                           │
│        │                                           │
│  NAV   │              MAIN CONTENT                 │
│  BAR   │                                           │
│        │                                           │
│        │                                           │
│        │                                           │
│        │                                           │
└────────┴───────────────────────────────────────────┘
```

### 4.2 Desktop Navigation (Sidebar)

**Persistent sidebar (collapsible):**
- Width: 240px expanded, 64px collapsed
- Position: Left side
- Contents:
  ```
  [Logo - FretNinja]

  ─────────────────

  📊 Dashboard

  🎮 Quiz Hub
     ├─ Find the Note
     ├─ Name the Note
     ├─ Mark the Chord
     └─ Recognize Interval

  🎸 Explorer

  📈 Progress

  🏆 Achievements

  ─────────────────

  ⚙️ Settings

  ─────────────────

  [User Avatar]
  [Display Name]
  [Logout]
  ```

### 4.3 Tablet Navigation

- Same as desktop but sidebar collapsed by default
- Hamburger menu to expand
- Header with logo and profile

### 4.4 Mobile Landscape Navigation (Bottom)

```
┌─────────────────────────────────────────────┐
│                                             │
│              MAIN CONTENT                   │
│                                             │
├─────────┬─────────┬─────────┬─────────┬─────┤
│  Home   │  Quiz   │Explorer │Progress │More │
│   📊    │   🎮    │   🎸    │   📈    │ ≡  │
└─────────┴─────────┴─────────┴─────────┴─────┘
```

**"More" menu contents:**
- Achievements
- Settings
- Profile
- Logout

### 4.5 Mobile Portrait

- Show "Rotate your device" message with phone rotation icon
- Landscape orientation required for fretboard interaction

### 4.6 Quiz/Explorer Full-Screen Mode

- Navigation hidden during active quiz/explorer
- Minimal header with:
  - Back/Exit button (left)
  - Mode title (center)
  - Settings quick access (right)

---

## 5. Key Components

### 5.1 Fretboard Component

**Props:**
```typescript
interface FretboardProps {
  mode: 'quiz' | 'explorer' | 'heatmap' | 'display';
  fretRange: 12 | 24;
  showNoteNames: boolean;
  highlightedPositions: Position[];
  overlayData?: {
    type: 'scale' | 'chord' | 'errors';
    positions: Position[];
    rootPositions?: Position[];
  };
  onPositionClick?: (position: Position) => void;
  onPositionHover?: (position: Position) => void;
  disabled?: boolean;
  selectedPositions?: Position[]; // For Mark the Chord
}

interface Position {
  string: number; // 1-6
  fret: number;   // 0-24
  note?: string;
  metadata?: any; // error count, etc.
}
```

**Features:**
- SVG-based rendering for crisp scaling
- Responsive sizing with aspect-ratio
- Touch and mouse interaction
- Keyboard navigation (arrow keys, Enter/Space)
- Configurable overlays with color coding
- Sound playback on interaction
- ARIA labels for accessibility

**Visual States:**
- Default: Neutral frets
- Highlighted: Question target (bright)
- Selected: User selection (pulsing border)
- Correct: Green background flash
- Incorrect: Red background flash
- Heatmap: Gradient coloring based on error count
- Overlay: Scale/chord notes highlighted

### 5.2 Quiz Question Components

**FindNoteQuestion:**
- Displays note name prominently
- Fretboard in quiz mode accepts single click

**NameNoteQuestion:**
- Fretboard shows highlighted position
- Multiple choice buttons (4 options)

**MarkChordQuestion:**
- Displays chord name
- Fretboard accepts multiple selections
- Submit button to confirm
- Counter showing "3/3 notes selected"

**IntervalQuestion:**
- Fretboard shows two highlighted positions
- Multiple choice buttons for intervals

### 5.3 Audio Service

**Singleton service providing:**
```typescript
interface AudioService {
  preloadNotes(): Promise<void>;
  playNote(string: number, fret: number): void;
  playCorrect(): void;
  playIncorrect(): void;
  setVolume(level: number): void;
  setEnabled(enabled: boolean): void;
}
```

**Implementation:**
- Uses Web Audio API or Howler.js
- Preloads 72+ note samples (can lazy-load)
- Handles browser audio context suspension
- Graceful degradation if audio unavailable

### 5.4 Tutorial/Coach Mark System

**Features:**
- Spotlight effect on target element
- Tooltip with explanation
- Step indicator (1 of 3)
- Next/Skip buttons
- Respects user's tutorial completion status

**Usage:**
```typescript
interface TutorialStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}
```

### 5.5 Toast Notification System

**Using Shadcn Sonner:**
- Success toasts: Achievement earned, settings saved
- Error toasts: Network error, validation error
- Info toasts: Session recovered, hint rate limit

### 5.6 Achievement Notification Modal

**Features:**
- Full-screen overlay with backdrop
- Achievement badge with animation
- Confetti effect (CSS or canvas)
- Achievement name and description
- "Continue" button
- Optional "Share" button (future)

### 5.7 AI Hint Panel

**Features:**
- Slide-in panel (right side) or modal
- Loading state with spinner
- Hint text with markdown formatting
- Related positions highlighted on fretboard
- Memorization tip section
- Close button
- Rate limit indicator if applicable

### 5.8 Stats Widgets

**QuickStatsWidget:**
- 3 stat cards in a row
- Icon, value, label
- Skeleton loading state

**StreakWidget:**
- Flame icon
- Current streak count
- "day/days" label
- Animated on increment

**AchievementProgressWidget:**
- Achievement icon (grayscale)
- Achievement name
- Progress bar
- "X/Y" count

**HeatmapPreviewWidget:**
- Miniature fretboard
- Simplified error visualization
- Click to expand

### 5.9 Form Components

**Using Shadcn UI + React Hook Form + Zod:**
- Input with validation states
- Password input with visibility toggle
- Select/Dropdown
- Toggle/Switch
- Slider
- Button (primary, secondary, destructive)

### 5.10 Layout Components

**AppShell:**
- Handles responsive sidebar/bottom nav
- Manages navigation state
- Provides layout context

**PageHeader:**
- Page title
- Optional subtitle
- Optional actions

**Card:**
- Standard content container
- Header, body, footer sections

**EmptyState:**
- Icon
- Title
- Description
- Action button

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile Portrait | < 640px | Rotation prompt |
| Mobile Landscape | 640-767px | Bottom nav, compact fretboard |
| Tablet | 768-1023px | Collapsed sidebar, touch-optimized |
| Desktop | 1024-1279px | Expanded sidebar |
| Large Desktop | ≥ 1280px | Expanded sidebar, wider content |

---

## 7. State Management Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Context                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ AuthContext │  │SettingsCtx  │  │  AudioCtx   │  │
│  │ - user      │  │ - fretRange │  │ - volume    │  │
│  │ - session   │  │ - noteNames │  │ - enabled   │  │
│  │ - isGuest   │  │ - tutorials │  │ - play()    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   TanStack Query                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │useProfile() │  │useQuizzes() │  │useStats()   │  │
│  │useAchieve() │  │useHeatmap() │  │useAIHint()  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    Local State                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Quiz State  │  │Explorer St. │  │ UI State    │  │
│  │ (useReducer)│  │ (useState)  │  │ (useState)  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   localStorage                       │
│  - Guest quiz backup                                 │
│  - Guest settings                                    │
│  - Explorer last selection                           │
│  - Tutorial completion (guest)                       │
└─────────────────────────────────────────────────────┘
```

---

## 8. Error Handling Strategy

| Error Type | UI Response |
|------------|-------------|
| Network error | Toast with "Check connection", retry button |
| Auth expired | Redirect to login with message |
| Validation error | Inline field errors |
| Rate limited | Toast with countdown |
| AI unavailable | Fallback message in hint panel |
| Quiz recovery | Toast "Quiz recovered", resume option |
| 404 Not Found | Custom 404 page with navigation |
| 500 Server Error | Error page with retry, report option |

---

## 9. Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible (2px outline)
- [ ] Color contrast ≥ 4.5:1 (WCAG AA)
- [ ] Images have alt text
- [ ] Forms have labels
- [ ] Errors linked to inputs via aria-describedby
- [ ] Dynamic content announced via aria-live
- [ ] Headings in logical order
- [ ] Skip link to main content
- [ ] Reduced motion preference respected
- [ ] Touch targets ≥ 44px

---

## 10. Security Considerations

| Concern | Mitigation |
|---------|------------|
| XSS | React's default escaping, CSP headers |
| CSRF | Supabase token-based auth |
| Data exposure | RLS policies, user-scoped queries |
| Password security | Minimum 8 chars, hashed by Supabase |
| Session hijacking | HTTPOnly cookies, secure flag |
| Rate limiting | API limits on auth, AI endpoints |
| Input validation | Zod schemas client and server |
