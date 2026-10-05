import type { ObjectId, WithId } from "mongodb";
import type { AuthorView, BoardView, LibraryItemView, UserView } from "../shared/contracts";
import type { UserDoc } from "./types";

export function userView(user: WithId<UserDoc> | UserDoc, includePrivate = false): UserView {
  return {
    id: user._id.toHexString(),
    ...(includePrivate ? { email: user.email } : {}),
    name: user.name,
    handle: user.handle,
    bio: user.bio,
    avatarColor: user.avatarColor,
    theme: user.theme,
    reduceMotion: user.reduceMotion,
    dailyGoalMinutes: user.dailyGoalMinutes,
    subjects: user.subjects,
    exams: user.exams,
    onboarded: user.onboarded,
    createdAt: user.createdAt.toISOString(),
  };
}

export function authorView(user: Pick<UserDoc, "_id" | "name" | "handle" | "avatarColor">): AuthorView {
  return { id: user._id.toHexString(), name: user.name, handle: user.handle, avatarColor: user.avatarColor };
}

export function boardView(board: any): BoardView {
  return { id: board._id.toHexString(), name: board.name, widgets: board.widgets || [], createdAt: board.createdAt.toISOString(), updatedAt: board.updatedAt.toISOString() };
}

export function libraryItemView(item: any): LibraryItemView {
  const common = { id: item._id.toHexString(), type: item.type, title: item.title, subject: item.subject || "", createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  if (item.type === "note") return { ...common, type: "note", body: item.body || "" };
  if (item.type === "deck") return { ...common, type: "deck", cards: item.cards || [] };
  return { ...common, type: "quiz", questions: item.questions || [] };
}

export function idsEqual(left: ObjectId, right: ObjectId): boolean { return left.equals(right); }
