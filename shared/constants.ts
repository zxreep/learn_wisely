export const SUBJECTS = [
  "Biology", "Chemistry", "Physics", "Mathematics", "Computer science",
  "History", "Literature", "Economics", "Psychology", "Languages",
] as const;

export const EXAMS = ["JEE", "NEET", "UPSC", "SAT", "ACT", "AP", "University exams", "Other"] as const;

export const WIDGET_LABELS = {
  note: { title: "Note", description: "Keep one idea visible." },
  tasks: { title: "Task list", description: "Turn a goal into small steps." },
  timer: { title: "Focus timer", description: "Log real study time." },
  countdown: { title: "Countdown", description: "Keep an important date in view." },
} as const;

export const COACH_STARTERS = [
  "Help me plan a focused 30-minute study session.",
  "Quiz me using one of my saved study items.",
  "Help me break down what I should revise next.",
] as const;
