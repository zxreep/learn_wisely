import { z } from "zod";

const cleanText = (max: number, min = 1) => z.string().trim().min(min).max(max);
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
export const handleSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Use 3–24 lowercase letters, numbers, or underscores");
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(10, "Use at least 10 characters").max(128);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: cleanText(60),
  handle: handleSchema,
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

export const profileUpdateSchema = z.object({
  name: cleanText(60).optional(),
  handle: handleSchema.optional(),
  bio: cleanText(240, 0).optional(),
  avatarColor: z.enum(["gold", "ink", "sage", "plum", "ocean"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  reduceMotion: z.boolean().optional(),
  dailyGoalMinutes: z.number().int().min(10).max(240).optional(),
  subjects: z.array(cleanText(40)).max(12).optional(),
  exams: z.array(cleanText(60)).max(8).optional(),
  onboarded: z.boolean().optional(),
}).strict();

export const widgetSchema = z.object({
  id: z.string().min(4).max(80),
  type: z.enum(["note", "tasks", "timer", "countdown"]),
  x: z.number().min(0).max(3000),
  y: z.number().min(0).max(3000),
  w: z.number().min(220).max(900),
  h: z.number().min(170).max(900),
  config: z.record(z.string(), z.unknown()),
});
export const boardCreateSchema = z.object({ name: cleanText(60) });
export const boardUpdateSchema = z.object({ name: cleanText(60).optional(), widgets: z.array(widgetSchema).max(60).optional() }).strict();

const cardSchema = z.object({ id: z.string().min(4).max(80), front: cleanText(500), back: cleanText(1200) });
const questionSchema = z.object({
  id: z.string().min(4).max(80),
  prompt: cleanText(500),
  options: z.array(cleanText(240)).min(2).max(6),
  answer: z.number().int().min(0).max(5),
}).refine((question) => question.answer < question.options.length, { message: "Answer must point to an available option", path: ["answer"] });
export const libraryCreateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("note"), title: cleanText(100), subject: cleanText(40, 0), body: cleanText(30000, 0) }),
  z.object({ type: z.literal("deck"), title: cleanText(100), subject: cleanText(40, 0), cards: z.array(cardSchema).min(1).max(200) }),
  z.object({ type: z.literal("quiz"), title: cleanText(100), subject: cleanText(40, 0), questions: z.array(questionSchema).min(1).max(100) }),
]);
export const libraryUpdateSchema = libraryCreateSchema;

export const communityCreateSchema = z.object({ name: cleanText(60), description: cleanText(300, 0) });
export const postCreateSchema = z.object({ body: cleanText(4000) });
export const commentCreateSchema = z.object({ body: cleanText(1500) });
export const voteSchema = z.object({ value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) });

export const conversationCreateSchema = z.object({
  type: z.enum(["direct", "group"]),
  name: cleanText(60, 0).optional(),
  handles: z.array(handleSchema).min(1).max(20),
}).superRefine((value, context) => {
  if (value.type === "direct" && value.handles.length !== 1) context.addIssue({ code: "custom", message: "Direct chats need exactly one person", path: ["handles"] });
  if (value.type === "group" && !value.name?.trim()) context.addIssue({ code: "custom", message: "Group chats need a name", path: ["name"] });
});
export const messageCreateSchema = z.object({ body: cleanText(3000) });
export const studySessionSchema = z.object({ durationMinutes: z.number().int().min(1).max(360), note: cleanText(200, 0).optional() });
export const coachMessageSchema = z.object({ message: cleanText(3000) });

export type Theme = "light" | "dark" | "system";
export type Widget = z.infer<typeof widgetSchema>;
export type LibraryInput = z.infer<typeof libraryCreateSchema>;

export interface UserView {
  id: string;
  email?: string;
  name: string;
  handle: string;
  bio: string;
  avatarColor: "gold" | "ink" | "sage" | "plum" | "ocean";
  theme: Theme;
  reduceMotion: boolean;
  dailyGoalMinutes: number;
  subjects: string[];
  exams: string[];
  onboarded: boolean;
  createdAt: string;
}
export interface ProfileStats { totalMinutes: number; sessions: number; streak: number; studiedToday: boolean; xp: number; }
export interface BoardView { id: string; name: string; widgets: Widget[]; createdAt: string; updatedAt: string; }
export type LibraryItemView = {
  id: string; title: string; subject: string; updatedAt: string; createdAt: string;
} & ({ type: "note"; body: string } | { type: "deck"; cards: z.infer<typeof cardSchema>[] } | { type: "quiz"; questions: z.infer<typeof questionSchema>[] });
export interface CommunityView { id: string; name: string; slug: string; description: string; memberCount: number; joined: boolean; role: "owner" | "moderator" | "member" | null; createdAt: string; owner: Pick<UserView, "id" | "name" | "handle" | "avatarColor">; }
export interface AuthorView { id: string; name: string; handle: string; avatarColor: UserView["avatarColor"]; }
export interface CommentView { id: string; body: string; author: AuthorView; createdAt: string; canDelete: boolean; }
export interface PostView { id: string; body: string; author: AuthorView; score: number; myVote: -1 | 0 | 1; commentCount: number; createdAt: string; canDelete: boolean; comments?: CommentView[]; }
export interface ConversationView { id: string; type: "direct" | "group"; name: string; participants: AuthorView[]; lastMessage: { body: string; createdAt: string; authorId: string } | null; updatedAt: string; }
export interface MessageView { id: string; body: string; author: AuthorView; createdAt: string; mine: boolean; }
export interface CoachMessageView { id: string; role: "user" | "assistant"; content: string; createdAt: string; }

export interface ApiErrorShape { error: { code: string; message: string; details?: unknown } }
export interface ApiSuccess<T> { data: T }
