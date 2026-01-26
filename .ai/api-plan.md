# REST API Plan

## 1. Resources

| Resource | Database Table/View | Description |
|----------|---------------------|-------------|
| Auth | `auth.users` (Supabase) | Authentication operations |
| Profiles | `profiles` | User profile data and settings |
| Quiz Sessions | `quiz_sessions` | Quiz attempt metadata |
| Quiz Answers | `quiz_answers` | Individual question responses |
| Achievements | `achievements` | Achievement reference data |
| User Achievements | `user_achievements` | User's earned achievements |
| Stats | `user_error_heatmap` (view) + aggregations | User statistics and analytics |
| AI Hints | External (OpenRouter.ai) | AI-powered learning assistance |

## 2. Endpoints

### 2.1 Authentication

Authentication is handled by Supabase Auth with API wrappers for consistent error handling.

---

#### POST /api/auth/register

Register a new user account.

**Request Payload:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response Payload (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "message": "Registration successful. Please check your email for confirmation."
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid email format |
| 400 | `VALIDATION_ERROR` | Password must be at least 8 characters |
| 409 | `EMAIL_EXISTS` | An account with this email already exists |
| 500 | `SERVER_ERROR` | Registration failed |

---

#### POST /api/auth/login

Authenticate user and create session.

**Request Payload:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response Payload (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1234567890
  }
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Email and password are required |
| 401 | `INVALID_CREDENTIALS` | Invalid email or password |
| 500 | `SERVER_ERROR` | Login failed |

---

#### POST /api/auth/logout

Terminate user session.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response Payload (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | No active session |
| 500 | `SERVER_ERROR` | Logout failed |

---

#### POST /api/auth/password-reset

Request password reset email.

**Request Payload:**
```json
{
  "email": "user@example.com"
}
```

**Response Payload (200 OK):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid email format |
| 500 | `SERVER_ERROR` | Password reset request failed |

---

#### POST /api/auth/password-update

Update password using reset token.

**Request Payload:**
```json
{
  "password": "newSecurePassword123"
}
```

**Request Headers:**
```
Authorization: Bearer <recovery_token>
```

**Response Payload (200 OK):**
```json
{
  "message": "Password updated successfully"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Password must be at least 8 characters |
| 401 | `INVALID_TOKEN` | Invalid or expired reset token |
| 500 | `SERVER_ERROR` | Password update failed |

---

### 2.2 Profiles

---

#### GET /api/profile

Get current user's profile and settings.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response Payload (200 OK):**
```json
{
  "id": "uuid",
  "display_name": "JohnDoe",
  "current_streak": 5,
  "longest_streak": 14,
  "last_activity_date": "2024-01-15",
  "find_note_count": 23,
  "name_note_count": 18,
  "mark_chord_count": 12,
  "recognize_interval_count": 8,
  "fretboard_range": 12,
  "show_note_names": false,
  "tutorial_completed_modes": ["find_note", "name_note"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T12:30:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Authentication required |
| 404 | `NOT_FOUND` | Profile not found |
| 500 | `SERVER_ERROR` | Failed to fetch profile |

---

#### PATCH /api/profile

Update current user's profile and settings.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Request Payload:**
```json
{
  "display_name": "NinjaGuitarist",
  "fretboard_range": 24,
  "show_note_names": true,
  "tutorial_completed_modes": ["find_note", "name_note", "explorer"]
}
```

All fields are optional. Only provided fields will be updated.

**Response Payload (200 OK):**
```json
{
  "id": "uuid",
  "display_name": "NinjaGuitarist",
  "current_streak": 5,
  "longest_streak": 14,
  "last_activity_date": "2024-01-15",
  "find_note_count": 23,
  "name_note_count": 18,
  "mark_chord_count": 12,
  "recognize_interval_count": 8,
  "fretboard_range": 24,
  "show_note_names": true,
  "tutorial_completed_modes": ["find_note", "name_note", "explorer"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T14:00:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | display_name must be 2-50 characters |
| 400 | `VALIDATION_ERROR` | fretboard_range must be 12 or 24 |
| 400 | `VALIDATION_ERROR` | Invalid tutorial mode in tutorial_completed_modes |
| 401 | `UNAUTHORIZED` | Authentication required |
| 500 | `SERVER_ERROR` | Failed to update profile |

---

### 2.3 Quiz Sessions

---

#### POST /api/quiz-sessions

Start a new quiz session.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Request Payload:**
```json
{
  "quiz_type": "find_note",
  "difficulty": "medium",
  "time_limit_seconds": 30
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quiz_type` | enum | Yes | One of: `find_note`, `name_note`, `mark_chord`, `recognize_interval` |
| `difficulty` | enum | Yes | One of: `easy`, `medium`, `hard` |
| `time_limit_seconds` | integer | No | Required for `hard` difficulty, ignored otherwise |

**Response Payload (201 Created):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "quiz_type": "find_note",
  "difficulty": "medium",
  "status": "in_progress",
  "time_limit_seconds": null,
  "started_at": "2024-01-15T14:00:00Z",
  "created_at": "2024-01-15T14:00:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid quiz_type |
| 400 | `VALIDATION_ERROR` | Invalid difficulty |
| 400 | `VALIDATION_ERROR` | time_limit_seconds required for hard difficulty |
| 400 | `VALIDATION_ERROR` | time_limit_seconds must be a positive integer |
| 401 | `UNAUTHORIZED` | Authentication required |
| 409 | `SESSION_IN_PROGRESS` | You have an unfinished quiz session |
| 500 | `SERVER_ERROR` | Failed to create quiz session |

---

#### GET /api/quiz-sessions

List user's quiz sessions with pagination and filtering.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `quiz_type` | enum | - | Filter by quiz type |
| `difficulty` | enum | - | Filter by difficulty |
| `status` | enum | - | Filter by status: `in_progress`, `completed`, `abandoned` |
| `sort` | string | `completed_at:desc` | Sort field and direction |

**Response Payload (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "quiz_type": "find_note",
      "difficulty": "medium",
      "score": 8,
      "status": "completed",
      "time_taken_seconds": 145,
      "started_at": "2024-01-15T14:00:00Z",
      "completed_at": "2024-01-15T14:02:25Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid query parameters |
| 401 | `UNAUTHORIZED` | Authentication required |
| 500 | `SERVER_ERROR` | Failed to fetch quiz sessions |

---

#### GET /api/quiz-sessions/:id

Get specific quiz session details including answers.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response Payload (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "quiz_type": "find_note",
  "difficulty": "medium",
  "score": 8,
  "status": "completed",
  "time_limit_seconds": null,
  "time_taken_seconds": 145,
  "started_at": "2024-01-15T14:00:00Z",
  "completed_at": "2024-01-15T14:02:25Z",
  "answers": [
    {
      "question_number": 1,
      "is_correct": true,
      "time_taken_ms": 3200,
      "fret_position": 3,
      "string_number": 5,
      "target_note": "C"
    }
  ]
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You cannot access this session |
| 404 | `NOT_FOUND` | Quiz session not found |
| 500 | `SERVER_ERROR` | Failed to fetch quiz session |

---

#### PATCH /api/quiz-sessions/:id

Update quiz session (complete or abandon).

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Request Payload:**
```json
{
  "status": "completed",
  "time_taken_seconds": 145
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | enum | Yes | `completed` or `abandoned` |
| `time_taken_seconds` | integer | No | Total time taken (required for completion) |

**Response Payload (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "quiz_type": "find_note",
  "difficulty": "medium",
  "score": 8,
  "status": "completed",
  "time_taken_seconds": 145,
  "started_at": "2024-01-15T14:00:00Z",
  "completed_at": "2024-01-15T14:02:25Z",
  "achievements_earned": [
    {
      "id": "uuid",
      "name": "first_steps",
      "display_name": "First Steps"
    }
  ]
}
```

The `achievements_earned` array contains any new achievements unlocked by completing this session.

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid status transition |
| 400 | `VALIDATION_ERROR` | Cannot complete session without all 10 answers |
| 400 | `VALIDATION_ERROR` | time_taken_seconds must be non-negative |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You cannot modify this session |
| 404 | `NOT_FOUND` | Quiz session not found |
| 409 | `ALREADY_FINALIZED` | Session is already completed or abandoned |
| 500 | `SERVER_ERROR` | Failed to update quiz session |

---

### 2.4 Quiz Answers

---

#### POST /api/quiz-sessions/:sessionId/answers

Submit an answer for a quiz question.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Request Payload (Find the Note):**
```json
{
  "question_number": 1,
  "is_correct": true,
  "time_taken_ms": 3200,
  "fret_position": 3,
  "string_number": 5,
  "target_note": "C"
}
```

**Request Payload (Name the Note):**
```json
{
  "question_number": 2,
  "is_correct": false,
  "time_taken_ms": 4500,
  "fret_position": 5,
  "string_number": 2,
  "target_note": "E",
  "user_answer_note": "F"
}
```

**Request Payload (Mark the Chord):**
```json
{
  "question_number": 3,
  "is_correct": true,
  "time_taken_ms": 8200,
  "target_root_note": "C",
  "target_chord_type": "major",
  "user_answer_positions": [
    {"fret": 3, "string": 5},
    {"fret": 2, "string": 4},
    {"fret": 0, "string": 3}
  ]
}
```

**Request Payload (Recognize the Interval):**
```json
{
  "question_number": 4,
  "is_correct": true,
  "time_taken_ms": 2800,
  "fret_position": 7,
  "string_number": 3,
  "reference_fret_position": 5,
  "reference_string_number": 3,
  "target_interval": "minor_3rd",
  "user_answer_interval": "minor_3rd"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question_number` | integer | Yes | 1-10 |
| `is_correct` | boolean | Yes | Whether the answer was correct |
| `time_taken_ms` | integer | No | Time to answer in milliseconds |
| `fret_position` | integer | Conditional | 0-24, target/answer fret position |
| `string_number` | integer | Conditional | 1-6 (1=high E, 6=low E) |
| `target_note` | enum | Conditional | For find_note/name_note modes |
| `user_answer_note` | enum | Conditional | User's answer for name_note mode |
| `target_root_note` | enum | Conditional | For mark_chord mode |
| `target_chord_type` | enum | Conditional | For mark_chord mode |
| `user_answer_positions` | array | Conditional | User's marked positions for mark_chord |
| `target_interval` | enum | Conditional | For recognize_interval mode |
| `reference_fret_position` | integer | Conditional | Reference note fret for intervals |
| `reference_string_number` | integer | Conditional | Reference note string for intervals |
| `user_answer_interval` | enum | Conditional | User's answer for recognize_interval |

**Response Payload (201 Created):**
```json
{
  "id": "uuid",
  "session_id": "uuid",
  "question_number": 1,
  "is_correct": true,
  "created_at": "2024-01-15T14:00:03Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | question_number must be between 1 and 10 |
| 400 | `VALIDATION_ERROR` | Answer for this question already submitted |
| 400 | `VALIDATION_ERROR` | fret_position must be between 0 and 24 |
| 400 | `VALIDATION_ERROR` | string_number must be between 1 and 6 |
| 400 | `VALIDATION_ERROR` | Invalid note value |
| 400 | `VALIDATION_ERROR` | Invalid chord_type value |
| 400 | `VALIDATION_ERROR` | Invalid interval value |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You cannot add answers to this session |
| 404 | `NOT_FOUND` | Quiz session not found |
| 409 | `SESSION_NOT_ACTIVE` | Quiz session is not in progress |
| 500 | `SERVER_ERROR` | Failed to submit answer |

---

#### GET /api/quiz-sessions/:sessionId/answers

Get all answers for a quiz session.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response Payload (200 OK):**
```json
{
  "session_id": "uuid",
  "answers": [
    {
      "id": "uuid",
      "question_number": 1,
      "is_correct": true,
      "time_taken_ms": 3200,
      "fret_position": 3,
      "string_number": 5,
      "target_note": "C",
      "created_at": "2024-01-15T14:00:03Z"
    }
  ]
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You cannot access this session |
| 404 | `NOT_FOUND` | Quiz session not found |
| 500 | `SERVER_ERROR` | Failed to fetch answers |

---

### 2.5 Achievements

---

#### GET /api/achievements

List all available achievements.

**Request Headers:**
```
Authorization: Bearer <access_token> (optional)
```

**Response Payload (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "first_steps",
      "display_name": "First Steps",
      "description": "Complete your first quiz",
      "criteria": {
        "type": "total_quizzes",
        "count": 1
      }
    },
    {
      "id": "uuid",
      "name": "perfect_round",
      "display_name": "Perfect Round",
      "description": "Score 10/10 on any quiz",
      "criteria": {
        "type": "perfect_score"
      }
    },
    {
      "id": "uuid",
      "name": "week_warrior",
      "display_name": "Week Warrior",
      "description": "Maintain a 7-day streak",
      "criteria": {
        "type": "streak",
        "days": 7
      }
    },
    {
      "id": "uuid",
      "name": "string_master",
      "display_name": "String Master",
      "description": "Complete 50 \"Find the Note\" quizzes",
      "criteria": {
        "type": "quiz_count",
        "quiz_type": "find_note",
        "count": 50
      }
    },
    {
      "id": "uuid",
      "name": "chord_ninja",
      "display_name": "Chord Ninja",
      "description": "Complete 50 \"Mark the Chord\" quizzes",
      "criteria": {
        "type": "quiz_count",
        "quiz_type": "mark_chord",
        "count": 50
      }
    }
  ]
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 500 | `SERVER_ERROR` | Failed to fetch achievements |

---

#### GET /api/user/achievements

Get current user's earned achievements with progress toward unearned ones.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response Payload (200 OK):**
```json
{
  "earned": [
    {
      "id": "uuid",
      "name": "first_steps",
      "display_name": "First Steps",
      "description": "Complete your first quiz",
      "earned_at": "2024-01-10T10:00:00Z"
    }
  ],
  "progress": [
    {
      "id": "uuid",
      "name": "week_warrior",
      "display_name": "Week Warrior",
      "description": "Maintain a 7-day streak",
      "current": 5,
      "target": 7,
      "percentage": 71
    },
    {
      "id": "uuid",
      "name": "string_master",
      "display_name": "String Master",
      "description": "Complete 50 \"Find the Note\" quizzes",
      "current": 23,
      "target": 50,
      "percentage": 46
    },
    {
      "id": "uuid",
      "name": "chord_ninja",
      "display_name": "Chord Ninja",
      "description": "Complete 50 \"Mark the Chord\" quizzes",
      "current": 12,
      "target": 50,
      "percentage": 24
    },
    {
      "id": "uuid",
      "name": "perfect_round",
      "display_name": "Perfect Round",
      "description": "Score 10/10 on any quiz",
      "current": 0,
      "target": 1,
      "percentage": 0
    }
  ]
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Authentication required |
| 500 | `SERVER_ERROR` | Failed to fetch user achievements |

---

### 2.6 Statistics

---

#### GET /api/stats/heatmap

Get user's error heatmap data for visualization.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `quiz_type` | enum | - | Filter by quiz type |
| `from_date` | date | - | Start date (ISO 8601) |
| `to_date` | date | - | End date (ISO 8601) |

**Response Payload (200 OK):**
```json
{
  "data": [
    {
      "fret_position": 3,
      "string_number": 5,
      "error_count": 12
    },
    {
      "fret_position": 7,
      "string_number": 2,
      "error_count": 8
    }
  ],
  "max_error_count": 12,
  "total_errors": 45,
  "filters": {
    "quiz_type": null,
    "from_date": null,
    "to_date": null
  }
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid date format |
| 401 | `UNAUTHORIZED` | Authentication required |
| 500 | `SERVER_ERROR` | Failed to fetch heatmap data |

---

#### GET /api/stats/overview

Get user's overall statistics and learning progress.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response Payload (200 OK):**
```json
{
  "total_quizzes": 61,
  "total_time_seconds": 8940,
  "current_streak": 5,
  "longest_streak": 14,
  "by_quiz_type": {
    "find_note": {
      "count": 23,
      "average_score": 7.8,
      "best_score": 10,
      "total_time_seconds": 3400
    },
    "name_note": {
      "count": 18,
      "average_score": 8.2,
      "best_score": 10,
      "total_time_seconds": 2200
    },
    "mark_chord": {
      "count": 12,
      "average_score": 6.5,
      "best_score": 9,
      "total_time_seconds": 2100
    },
    "recognize_interval": {
      "count": 8,
      "average_score": 7.1,
      "best_score": 9,
      "total_time_seconds": 1240
    }
  },
  "by_difficulty": {
    "easy": {
      "count": 15,
      "average_score": 8.9
    },
    "medium": {
      "count": 30,
      "average_score": 7.5
    },
    "hard": {
      "count": 16,
      "average_score": 6.2
    }
  },
  "recent_trend": {
    "last_7_days": {
      "quizzes": 12,
      "average_score": 8.1
    },
    "previous_7_days": {
      "quizzes": 8,
      "average_score": 7.2
    },
    "improvement": 12.5
  }
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Authentication required |
| 500 | `SERVER_ERROR` | Failed to fetch statistics |

---

### 2.7 AI Hints

---

#### POST /api/ai/hint

Request an AI-powered learning hint.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Request Payload:**
```json
{
  "context": "quiz",
  "quiz_type": "find_note",
  "target_note": "C",
  "fret_position": 3,
  "string_number": 5,
  "user_error_positions": [
    {"fret": 5, "string": 5},
    {"fret": 8, "string": 6}
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `context` | enum | Yes | `quiz` or `explorer` |
| `quiz_type` | enum | Conditional | Required if context is `quiz` |
| `target_note` | enum | No | The note being asked about |
| `target_interval` | enum | No | The interval being asked about |
| `target_chord_type` | enum | No | The chord type being asked about |
| `target_root_note` | enum | No | The chord root being asked about |
| `fret_position` | integer | No | Relevant fret position |
| `string_number` | integer | No | Relevant string number |
| `user_error_positions` | array | No | Recent error positions for personalized tips |

**Response Payload (200 OK):**
```json
{
  "hint": "The note C appears on fret 3 of the A string (5th string). A helpful way to remember this: starting from the open A string, count up 3 half-steps (A → A# → B → C). Another reference point: this C is one octave below the C on fret 1 of the B string.",
  "related_positions": [
    {"fret": 3, "string": 5, "note": "C"},
    {"fret": 8, "string": 6, "note": "C"},
    {"fret": 1, "string": 2, "note": "C"}
  ],
  "memorization_tip": "Think of the 3rd fret of the A string as your 'anchor C' - it's the lowest C in the first position that's easy to reach."
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid context |
| 400 | `VALIDATION_ERROR` | quiz_type required for quiz context |
| 401 | `UNAUTHORIZED` | Authentication required |
| 429 | `RATE_LIMITED` | Too many hint requests. Please wait before trying again. |
| 503 | `AI_UNAVAILABLE` | AI service temporarily unavailable |
| 500 | `SERVER_ERROR` | Failed to generate hint |

---

#### POST /api/ai/personalized-tips

Get personalized learning tips based on error patterns.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Request Payload:**
```json
{
  "quiz_type": "find_note",
  "limit": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quiz_type` | enum | No | Focus tips on specific quiz type |
| `limit` | integer | No | Number of tips (default 3, max 5) |

**Response Payload (200 OK):**
```json
{
  "tips": [
    {
      "focus_area": "5th string, frets 1-5",
      "observation": "You frequently miss notes on the A string in the first position.",
      "suggestion": "Practice identifying notes from A to D on the 5th string. Remember: A (open) → A# (1) → B (2) → C (3) → C# (4) → D (5).",
      "practice_positions": [
        {"fret": 1, "string": 5, "note": "A#"},
        {"fret": 2, "string": 5, "note": "B"},
        {"fret": 3, "string": 5, "note": "C"}
      ]
    },
    {
      "focus_area": "Accidentals (sharps)",
      "observation": "Sharp notes (C#, F#, G#) are more frequently missed than natural notes.",
      "suggestion": "Focus on the pattern: sharps appear between natural notes that are a whole step apart. There's no sharp between B-C and E-F.",
      "practice_positions": []
    }
  ],
  "overall_recommendation": "Based on your error patterns, consider spending more time in Explorer mode reviewing the first 5 frets before continuing with quizzes."
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid quiz_type |
| 400 | `VALIDATION_ERROR` | limit must be between 1 and 5 |
| 401 | `UNAUTHORIZED` | Authentication required |
| 404 | `INSUFFICIENT_DATA` | Not enough quiz data to generate personalized tips |
| 429 | `RATE_LIMITED` | Too many requests. Please wait before trying again. |
| 503 | `AI_UNAVAILABLE` | AI service temporarily unavailable |
| 500 | `SERVER_ERROR` | Failed to generate tips |

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Auth** with JWT-based authentication:

1. **Session Management**: Supabase handles session creation, refresh tokens, and expiration
2. **Token Format**: JWT tokens passed via `Authorization: Bearer <token>` header
3. **Token Refresh**: Client should use Supabase SDK's automatic token refresh
4. **Session Duration**: Access tokens expire after 1 hour; refresh tokens expire after 7 days

### 3.2 Authorization Rules

| Resource | Rule |
|----------|------|
| Profile | Users can only read/update their own profile |
| Quiz Sessions | Users can only create, read, update their own sessions |
| Quiz Answers | Users can only create/read answers for their own sessions |
| Achievements | All users can read achievement definitions |
| User Achievements | Users can only read their own earned achievements |
| Stats | Users can only access their own statistics |
| AI Hints | Authenticated users only |

### 3.3 Row-Level Security (RLS)

All authorization is enforced at the database level using Supabase RLS policies:

- `profiles`: Users can SELECT and UPDATE only their own record (`auth.uid() = id`)
- `quiz_sessions`: Users can SELECT, INSERT, UPDATE only their own sessions (`user_id = auth.uid()`)
- `quiz_answers`: Access controlled via parent session ownership
- `user_achievements`: Users can SELECT their own; INSERT restricted to service role
- `achievements`: Public read access for all authenticated users

### 3.4 Guest Mode

Guest users can access the application without authentication, but:
- Cannot access any API endpoints except `GET /api/achievements`
- Quiz data is managed entirely in the client/local state
- No data is persisted to the database
- Prompt to register is shown after quiz completion

---

## 4. Validation and Business Logic

### 4.1 Validation Rules

#### Profile Validation
| Field | Validation |
|-------|------------|
| `display_name` | 2-50 characters if provided |
| `fretboard_range` | Must be exactly 12 or 24 |
| `show_note_names` | Boolean |
| `tutorial_completed_modes` | Array of valid mode strings: `find_note`, `name_note`, `mark_chord`, `recognize_interval`, `explorer` |

#### Quiz Session Validation
| Field | Validation |
|-------|------------|
| `quiz_type` | Must be one of: `find_note`, `name_note`, `mark_chord`, `recognize_interval` |
| `difficulty` | Must be one of: `easy`, `medium`, `hard` |
| `time_limit_seconds` | Positive integer; required if difficulty is `hard` |
| `score` | 0-10 (calculated from answers) |
| `status` | Valid transitions: `in_progress` → `completed` or `in_progress` → `abandoned` |

#### Quiz Answer Validation
| Field | Validation |
|-------|------------|
| `question_number` | 1-10, must not duplicate within session |
| `fret_position` | 0-24 |
| `string_number` | 1-6 |
| `target_note`, `user_answer_note` | Must be valid note: `C`, `C#`, `D`, `D#`, `E`, `F`, `F#`, `G`, `G#`, `A`, `A#`, `B` |
| `target_chord_type` | Must be: `major`, `minor`, `diminished`, `augmented` |
| `target_interval`, `user_answer_interval` | Must be valid interval: `minor_2nd`, `major_2nd`, `minor_3rd`, `major_3rd`, `perfect_4th`, `tritone`, `perfect_5th`, `minor_6th`, `major_6th`, `minor_7th`, `major_7th`, `octave` |
| `time_taken_ms` | Non-negative integer |

### 4.2 Business Logic Implementation

#### Streak Calculation

When a quiz session is completed:

1. Get user's `last_activity_date` from profile
2. Calculate the date of completion
3. If completion date equals `last_activity_date`: no change to streak
4. If completion date is exactly 1 day after `last_activity_date`: increment `current_streak`
5. If completion date is more than 1 day after: reset `current_streak` to 1
6. Update `longest_streak` if `current_streak` exceeds it
7. Update `last_activity_date` to completion date

```
Pseudocode:
IF today == last_activity_date THEN
    // Same day, no streak change
ELSE IF today == last_activity_date + 1 day THEN
    current_streak++
    IF current_streak > longest_streak THEN
        longest_streak = current_streak
ELSE
    current_streak = 1
last_activity_date = today
```

#### Score Calculation

Score is calculated when completing a session:
```
score = COUNT(answers WHERE is_correct = true)
```

The score must match the count of correct answers (0-10).

#### Achievement Evaluation

When a quiz session is completed, check for new achievements:

1. **First Steps**: Check if this is user's first completed quiz
   - `total_quizzes = find_note_count + name_note_count + mark_chord_count + recognize_interval_count`
   - Award if `total_quizzes == 1` (this completion)

2. **Perfect Round**: Check if score is 10
   - Award if `score == 10` and achievement not already earned

3. **Week Warrior**: Check streak
   - Award if `current_streak >= 7` and achievement not already earned

4. **String Master**: Check find_note count
   - Award if `find_note_count >= 50` and achievement not already earned

5. **Chord Ninja**: Check mark_chord count
   - Award if `mark_chord_count >= 50` and achievement not already earned

#### Quiz Mode Counter Updates

When a quiz session is completed:
```sql
UPDATE profiles SET
    find_note_count = find_note_count + (CASE WHEN quiz_type = 'find_note' THEN 1 ELSE 0 END),
    name_note_count = name_note_count + (CASE WHEN quiz_type = 'name_note' THEN 1 ELSE 0 END),
    mark_chord_count = mark_chord_count + (CASE WHEN quiz_type = 'mark_chord' THEN 1 ELSE 0 END),
    recognize_interval_count = recognize_interval_count + (CASE WHEN quiz_type = 'recognize_interval' THEN 1 ELSE 0 END)
WHERE id = <user_id>
```

#### Session Completion Workflow

1. Validate all 10 answers have been submitted
2. Calculate score from answers
3. Update session: `status = 'completed'`, `score`, `completed_at`, `time_taken_seconds`
4. Update profile: increment quiz mode counter, update streak
5. Evaluate achievements
6. Return response with any newly earned achievements

### 4.3 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/*` | 10 requests | 15 minutes |
| `POST /api/ai/hint` | 20 requests | 1 hour |
| `POST /api/ai/personalized-tips` | 5 requests | 1 hour |
| All other endpoints | 100 requests | 1 minute |

Rate limit responses return status `429 Too Many Requests` with headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705330800
Retry-After: 45
```

### 4.4 Data Integrity Constraints

From database schema:
- Unique constraint on `(user_id, achievement_id)` in `user_achievements` prevents duplicate achievement awards
- Check constraints ensure valid enum values
- Foreign key cascades ensure data consistency on deletion
- Triggers automatically update `updated_at` timestamps
