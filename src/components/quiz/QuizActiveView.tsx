import { useCallback, useEffect, useRef, useState } from "react";

import type {
  NoteEnum,
  IntervalEnum,
  ChordTypeEnum,
  QuizTypeEnum,
  CreateQuizAnswerCommand,
  CreateQuizSessionCommand,
  UpdateQuizSessionCommand,
} from "@/types";
import Fretboard, { type FretPosition, getFretboardPositions } from "@/components/fretboard/Fretboard";

type QuizMode = "find-note" | "name-note" | "mark-chord" | "recognize-interval";
type Difficulty = "easy" | "medium" | "hard";

type Question = {
  prompt: string;
  targetNote?: NoteEnum;
  targetInterval?: IntervalEnum;
  targetChordType?: ChordTypeEnum;
  targetRootNote?: NoteEnum;
  position: FretPosition;
  referencePosition?: FretPosition;
  options?: string[];
  correctPositions?: FretPosition[];
};

const INTERVALS: IntervalEnum[] = ["minor_2nd", "major_2nd", "minor_3rd", "major_3rd"];

const MODE_LABELS: Record<QuizMode, string> = {
  "find-note": "Find the Note",
  "name-note": "Name the Note",
  "mark-chord": "Mark the Chord",
  "recognize-interval": "Recognize the Interval",
};

interface QuizActiveViewProps {
  mode: QuizMode;
  user: { id: string; email: string } | null;
}

const QUIZ_TYPE_MAP: Record<QuizMode, QuizTypeEnum> = {
  "find-note": "find_note",
  "name-note": "name_note",
  "mark-chord": "mark_chord",
  "recognize-interval": "recognize_interval",
};

const toQuizTypeEnum = (mode: QuizMode): QuizTypeEnum => QUIZ_TYPE_MAP[mode];

const NOTES: NoteEnum[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const buildOptionSet = (correct: string, candidates: string[], count = 4) => {
  const options = new Set([correct]);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  for (const candidate of shuffled) {
    if (options.size >= count) break;
    options.add(candidate);
  }
  return Array.from(options);
};

const getPositionPool = (difficulty: Difficulty): FretPosition[] => {
  const allPositions = getFretboardPositions(12);
  if (difficulty === "easy") {
    return allPositions.filter((pos) => pos.string <= 3 && pos.fret <= 5);
  }
  if (difficulty === "medium") {
    return allPositions;
  }
  return allPositions;
};

const buildQuestions = (mode: QuizMode, difficulty: Difficulty): Question[] => {
  const pool = getPositionPool(difficulty);
  const questions: Question[] = [];

  for (let index = 0; index < 10; index += 1) {
    const position = pool[(index * 3) % pool.length];
    if (mode === "find-note") {
      questions.push({
        prompt: `Find: ${position.note}`,
        targetNote: position.note,
        position,
      });
      continue;
    }

    if (mode === "name-note") {
      const options = buildOptionSet(position.note, NOTES);
      questions.push({
        prompt: "Name the highlighted note.",
        targetNote: position.note,
        position,
        options,
      });
      continue;
    }

    if (mode === "mark-chord") {
      const chordPositions = [
        position,
        pool[(index + 3) % pool.length],
        pool[(index + 5) % pool.length],
      ];
      questions.push({
        prompt: `Mark all notes of: ${position.note} major`,
        targetRootNote: position.note,
        targetChordType: "major",
        position,
        correctPositions: chordPositions,
      });
      continue;
    }

    const referencePosition = pool[(index + 2) % pool.length];
    questions.push({
      prompt: "Identify the interval between the two notes.",
      targetInterval: INTERVALS[index % INTERVALS.length],
      position,
      referencePosition,
      options: ["minor_2nd", "major_2nd", "minor_3rd", "major_3rd"],
    });
  }

  return questions;
};

const formatIntervalLabel = (value: string) => value.replace("_", " ");

const QuizActiveView = ({ mode, user }: QuizActiveViewProps) => {
  const isGuest = !user;

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [questions, setQuestions] = useState<Question[]>(() => buildQuestions(mode, difficulty));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "question" | "feedback" | "completed">("loading");
  const [selectedPositions, setSelectedPositions] = useState<FretPosition[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [feedbackPositions, setFeedbackPositions] = useState<{
    correct: FretPosition[];
    incorrect: FretPosition[];
  }>({ correct: [], incorrect: [] });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [answerLog, setAnswerLog] = useState<
    {
      questionNumber: number;
      prompt: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
    }[]
  >([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const sessionStartRef = useRef<number | null>(null);
  const questionStartRef = useRef<number | null>(null);

  const currentQuestion = questions[questionIndex];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const level = params.get("difficulty") as Difficulty | null;
    if (level && ["easy", "medium", "hard"].includes(level)) {
      setDifficulty(level);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    setQuestions(buildQuestions(mode, difficulty));
    setQuestionIndex(0);
    setSelectedOption(null);
    setSelectedPositions([]);
    setAnswerLog([]);
  }, [difficulty, mode]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    let active = true;
    const createSession = async () => {
      if (isGuest) {
        setStatus("question");
        sessionStartRef.current = Date.now();
        questionStartRef.current = Date.now();
        return;
      }

      try {
        const payload: CreateQuizSessionCommand = {
          quiz_type: toQuizTypeEnum(mode),
          difficulty,
          time_limit_seconds: difficulty === "hard" ? 30 : null,
        };
        const response = await fetch("/api/quiz-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (!active) return;
          setStatus("question");
          sessionStartRef.current = Date.now();
          questionStartRef.current = Date.now();
          return;
        }

        const data = (await response.json()) as { id: string };
        if (!active) return;
        setSessionId(data.id);
        sessionStartRef.current = Date.now();
        questionStartRef.current = Date.now();
        setStatus("question");
      } catch {
        if (!active) return;
        // Failed to create session, continue as guest mode
        setStatus("question");
        sessionStartRef.current = Date.now();
        questionStartRef.current = Date.now();
      }
    };

    createSession();

    return () => {
      active = false;
    };
  }, [difficulty, isGuest, isInitialized, mode]);

  useEffect(() => {
    if (status !== "question" || difficulty !== "hard") {
      setTimeRemaining(null);
      return;
    }

    setTimeRemaining(30);
    const interval = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          window.clearInterval(interval);
          handleAnswer({
            isCorrect: false,
            userAnswer: "Time ran out",
            correctAnswer: currentQuestion.targetNote
              ? `${currentQuestion.targetNote}`
              : currentQuestion.targetInterval
                ? formatIntervalLabel(currentQuestion.targetInterval)
                : currentQuestion.prompt,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status, difficulty, currentQuestion]);

  const handleSelectPosition = useCallback(
    (position: FretPosition) => {
      if (status !== "question") return;
      if (mode === "mark-chord") {
        setSelectedPositions((prev) => {
          const exists = prev.find((item) => item.fret === position.fret && item.string === position.string);
          if (exists) {
            return prev.filter((item) => !(item.fret === position.fret && item.string === position.string));
          }
          return [...prev, position];
        });
        return;
      }

      if (mode === "find-note") {
        const isCorrect = position.note === currentQuestion.targetNote;
        // Show feedback on the fretboard
        if (isCorrect) {
          setFeedbackPositions({ correct: [position], incorrect: [] });
        } else {
          // Find all correct positions for this note
          const allPositions = getFretboardPositions(12);
          const correctPositionsForNote = allPositions.filter(
            (pos) => pos.note === currentQuestion.targetNote
          );
          setFeedbackPositions({ correct: correctPositionsForNote, incorrect: [position] });
        }
        handleAnswer({
          isCorrect,
          userAnswer: `${position.note} (S${position.string}/F${position.fret})`,
          userAnswerRaw: position.note,
          correctAnswer: `${currentQuestion.targetNote}`,
        });
      }
    },
    [currentQuestion, mode, status]
  );

  const handleOptionSelect = useCallback(
    (option: string) => {
      if (status !== "question") return;
      setSelectedOption(option);
    },
    [status]
  );

  const submitOptionAnswer = useCallback(() => {
    if (!selectedOption || status !== "question") return;
    const isCorrect = selectedOption === currentQuestion.targetNote || selectedOption === currentQuestion.targetInterval;

    // Show feedback on the fretboard for name-note mode
    if (mode === "name-note") {
      setFeedbackPositions({
        correct: isCorrect ? [currentQuestion.position] : [currentQuestion.position],
        incorrect: [],
      });
    }

    handleAnswer({
      isCorrect,
      userAnswer: formatIntervalLabel(selectedOption),
      userAnswerRaw: selectedOption,
      correctAnswer: formatIntervalLabel(currentQuestion.targetNote ?? currentQuestion.targetInterval ?? ""),
    });
  }, [currentQuestion, mode, selectedOption, status]);

  const submitChordAnswer = useCallback(() => {
    if (status !== "question") return;
    const correctPositionsForChord = currentQuestion.correctPositions ?? [];
    const isCorrect =
      selectedPositions.length === correctPositionsForChord.length &&
      selectedPositions.every((pos) =>
        correctPositionsForChord.some((correct) => correct.fret === pos.fret && correct.string === pos.string)
      );

    // Show feedback on the fretboard
    const correctlySelected = selectedPositions.filter((pos) =>
      correctPositionsForChord.some((correct) => correct.fret === pos.fret && correct.string === pos.string)
    );
    const incorrectlySelected = selectedPositions.filter(
      (pos) => !correctPositionsForChord.some((correct) => correct.fret === pos.fret && correct.string === pos.string)
    );
    const missedCorrect = correctPositionsForChord.filter(
      (correct) => !selectedPositions.some((pos) => pos.fret === correct.fret && pos.string === correct.string)
    );

    setFeedbackPositions({
      correct: [...correctlySelected, ...missedCorrect],
      incorrect: incorrectlySelected,
    });

    handleAnswer({
      isCorrect,
      userAnswer: `${selectedPositions.length} selected`,
      correctAnswer: `${correctPositionsForChord.length} notes`,
    });
  }, [currentQuestion.correctPositions, selectedPositions, status]);

  const handleAnswer = useCallback(
    async ({
      isCorrect,
      userAnswer,
      correctAnswer,
      userAnswerRaw,
    }: {
      isCorrect: boolean;
      userAnswer: string;
      correctAnswer: string;
      userAnswerRaw?: string;
    }) => {
      if (!questionStartRef.current) {
        questionStartRef.current = Date.now();
      }
      const timeTakenMs = Date.now() - questionStartRef.current;
      const questionNumber = questionIndex + 1;

      const answerPayload: CreateQuizAnswerCommand = {
        question_number: questionNumber,
        is_correct: isCorrect,
        time_taken_ms: timeTakenMs,
      };

      if (mode === "find-note") {
        answerPayload.target_note = currentQuestion.targetNote ?? null;
        answerPayload.fret_position = currentQuestion.position.fret;
        answerPayload.string_number = currentQuestion.position.string;
      }
      if (mode === "name-note") {
        answerPayload.target_note = currentQuestion.targetNote ?? null;
        answerPayload.user_answer_note = ((userAnswerRaw ?? userAnswer).split(" ")[0] as NoteEnum) ?? null;
        answerPayload.fret_position = currentQuestion.position.fret;
        answerPayload.string_number = currentQuestion.position.string;
      }
      if (mode === "mark-chord") {
        answerPayload.target_root_note = currentQuestion.targetRootNote ?? null;
        answerPayload.target_chord_type = currentQuestion.targetChordType ?? null;
        answerPayload.user_answer_positions = selectedPositions.map((pos) => ({ fret: pos.fret, string: pos.string }));
      }
      if (mode === "recognize-interval") {
        answerPayload.target_interval = currentQuestion.targetInterval ?? null;
        answerPayload.user_answer_interval = ((userAnswerRaw ?? userAnswer) as IntervalEnum) ?? null;
        answerPayload.fret_position = currentQuestion.position.fret;
        answerPayload.string_number = currentQuestion.position.string;
        if (currentQuestion.referencePosition) {
          answerPayload.reference_fret_position = currentQuestion.referencePosition.fret;
          answerPayload.reference_string_number = currentQuestion.referencePosition.string;
        }
      }

      if (sessionId && !isGuest) {
        fetch(`/api/quiz-sessions/${sessionId}/answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(answerPayload),
        }).catch(() => null);
      }

      setAnswerLog((prev) => [
        ...prev,
        {
          questionNumber,
          prompt: currentQuestion.prompt,
          userAnswer,
          correctAnswer,
          isCorrect,
        },
      ]);

      setFeedback({ correct: isCorrect, message: isCorrect ? "Correct!" : "Incorrect" });
      setStatus("feedback");

      window.setTimeout(() => {
        setFeedback(null);
        setSelectedOption(null);
        setSelectedPositions([]);
        setFeedbackPositions({ correct: [], incorrect: [] });
        const nextIndex = questionIndex + 1;
        if (nextIndex >= questions.length) {
          completeQuiz(nextIndex, {
            questionNumber,
            prompt: currentQuestion.prompt,
            userAnswer,
            correctAnswer,
            isCorrect,
          });
        } else {
          setQuestionIndex(nextIndex);
          questionStartRef.current = Date.now();
          setStatus("question");
        }
      }, 1500);
    },
    [currentQuestion, isGuest, mode, questionIndex, questions.length, selectedPositions, sessionId]
  );

  const completeQuiz = useCallback(
    async (
      completedCount: number,
      lastAnswer: {
        questionNumber: number;
        prompt: string;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
      }
    ) => {
      const totalCorrect = answerLog.filter((answer) => answer.isCorrect).length + Number(lastAnswer.isCorrect);
      const timeTakenSeconds = sessionStartRef.current
        ? Math.round((Date.now() - sessionStartRef.current) / 1000)
        : 0;
      let achievements: { id: string; display_name: string }[] = [];

      if (sessionId && !isGuest) {
        const payload: UpdateQuizSessionCommand = {
          status: "completed",
          time_taken_seconds: timeTakenSeconds,
        };
        const response = await fetch(`/api/quiz-sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = (await response.json()) as { achievements_earned?: { id: string; display_name: string }[] };
          achievements = data.achievements_earned ?? [];
        }
      }

      const resultsPayload = {
        mode,
        difficulty,
        score: totalCorrect,
        total: completedCount,
        timeTakenSeconds,
        answers: [...answerLog, lastAnswer],
        achievements,
      };

      sessionStorage.setItem("fn_quiz_results", JSON.stringify(resultsPayload));
      setStatus("completed");
      window.location.href = `/quiz/${mode}/results`;
    },
    [answerLog, currentQuestion.prompt, difficulty, isGuest, mode, sessionId]
  );

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">
        Preparing your quiz session...
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="quiz-active-view">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <a
            href="/quiz"
            data-testid="quiz-abandon-button"
            className="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-300 transition"
          >
            ← Back to quiz hub
          </a>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300" data-testid="quiz-mode-label">{MODE_LABELS[mode]}</p>
          <h1 className="text-2xl font-semibold text-white" data-testid="quiz-question-prompt">{currentQuestion.prompt}</h1>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200" data-testid="quiz-question-counter">
          Question {questionIndex + 1} of {questions.length}
        </div>
      </header>

      {difficulty === "hard" && timeRemaining !== null ? (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all ${
            timeRemaining <= 5
              ? "warning border-red-500/60 bg-red-500/20 text-red-200 animate-pulse"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          }`}
          data-testid="quiz-timer"
        >
          <span>Timer</span>
          <span className={`font-semibold ${timeRemaining <= 5 ? "text-red-400" : ""}`} data-testid="quiz-timer-value">{timeRemaining}s left</span>
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="quiz-fretboard-section">
        <Fretboard
          fretRange={12}
          showNoteNames={false}
          highlightedPositions={
            // find-note: no highlights - user must find the note
            // name-note: highlight the position - user identifies the note name
            // mark-chord: no highlights - user marks chord tones
            // recognize-interval: highlight both positions - user identifies interval
            mode === "find-note"
              ? []
              : mode === "name-note"
                ? [currentQuestion.position]
                : mode === "mark-chord"
                  ? []
                  : currentQuestion.referencePosition
                    ? [currentQuestion.position, currentQuestion.referencePosition]
                    : [currentQuestion.position]
          }
          selectedPositions={status === "feedback" ? [] : selectedPositions}
          correctPositions={feedbackPositions.correct}
          incorrectPositions={feedbackPositions.incorrect}
          onPositionClick={handleSelectPosition}
          disabled={status === "feedback"}
        />
      </section>

      {mode === "name-note" || mode === "recognize-interval" ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="quiz-answer-options-section">
          <h2 className="text-sm font-semibold text-white">Choose your answer</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="quiz-answer-options">
            {currentQuestion.options?.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionSelect(option)}
                data-testid={`quiz-answer-option-${option}`}
                className={`rounded-lg border px-4 py-3 text-sm transition ${
                  selectedOption === option
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-slate-950/60 text-slate-200 hover:border-emerald-300/40"
                }`}
              >
                {formatIntervalLabel(option)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submitOptionAnswer}
            disabled={!selectedOption}
            data-testid="quiz-submit-answer-button"
            className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Submit answer
          </button>
        </section>
      ) : null}

      {mode === "mark-chord" ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="quiz-mark-chord-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Mark the chord notes</h2>
              <p className="text-xs text-slate-300" data-testid="quiz-chord-selection-count">
                {selectedPositions.length}/{currentQuestion.correctPositions?.length ?? 0} notes selected
              </p>
            </div>
            <button
              type="button"
              onClick={submitChordAnswer}
              data-testid="quiz-submit-chord-button"
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Submit chord
            </button>
          </div>
        </section>
      ) : null}

      {feedback ? (
        <div
          aria-live="polite"
          data-testid={feedback.correct ? "quiz-feedback-correct" : "quiz-feedback-incorrect"}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.correct
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {isGuest ? (
        <p className="text-xs text-slate-400" data-testid="quiz-guest-warning">
          You're playing as a guest. Results won't be saved to your account.
        </p>
      ) : null}
    </div>
  );
};

export default QuizActiveView;
