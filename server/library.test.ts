import { describe, expect, it } from "vitest";
import { libraryCreateSchema } from "../shared/contracts";

describe("library limits", () => {
  it("allows an intentionally empty note", () => {
    expect(libraryCreateSchema.safeParse({ type: "note", title: "Lecture notes", subject: "", body: "" }).success).toBe(true);
  });

  it("rejects a quiz answer beyond its options", () => {
    const parsed = libraryCreateSchema.safeParse({ type: "quiz", title: "Test", subject: "", questions: [{ id: "question-1", prompt: "Which?", options: ["A", "B"], answer: 5 }] });
    expect(parsed.success).toBe(false);
  });
});
