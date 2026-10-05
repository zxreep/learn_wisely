import { describe, expect, it } from "vitest";
import { conversationCreateSchema, libraryCreateSchema, profileUpdateSchema, signupSchema, widgetSchema } from "./contracts";

describe("API contracts", () => {
  it("normalizes a valid account", () => {
    const parsed = signupSchema.parse({ email: " Student@Example.com ", password: "correct-horse-battery", name: "Mina", handle: "MINA_01" });
    expect(parsed.email).toBe("student@example.com");
    expect(parsed.handle).toBe("mina_01");
  });

  it("rejects unsafe handles and short passwords", () => {
    expect(signupSchema.safeParse({ email: "a@b.com", password: "short", name: "A", handle: "not valid" }).success).toBe(false);
  });

  it("requires a group name", () => {
    expect(conversationCreateSchema.safeParse({ type: "group", handles: ["sam_student"] }).success).toBe(false);
  });

  it("validates real library content", () => {
    const result = libraryCreateSchema.safeParse({ type: "deck", title: "Cells", subject: "Biology", cards: [{ id: "card-1", front: "Mitochondria", back: "Site of aerobic respiration" }] });
    expect(result.success).toBe(true);
  });

  it("rejects unknown profile fields", () => {
    expect(profileUpdateSchema.safeParse({ role: "admin" }).success).toBe(false);
  });

  it("bounds board geometry", () => {
    expect(widgetSchema.safeParse({ id: "widget-1", type: "note", x: -1, y: 0, w: 300, h: 200, config: {} }).success).toBe(false);
  });
});
