import type { Db, ObjectId } from "mongodb";
import type { UserView } from "../shared/contracts";

export interface Env {
  MONGODB_URI?: string;
  MONGODB_DB?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  APP_ENV?: string;
  ASSETS?: Fetcher;
}

export interface UserDoc {
  _id: ObjectId;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  handle: string;
  handleNormalized: string;
  bio: string;
  avatarColor: UserView["avatarColor"];
  theme: UserView["theme"];
  reduceMotion: boolean;
  dailyGoalMinutes: number;
  subjects: string[];
  exams: string[];
  onboarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDoc {
  _id: ObjectId;
  tokenHash: string;
  csrfHash: string;
  userId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

export interface AppVariables {
  db: Db;
  user: UserDoc;
  session: SessionDoc;
}

export type AppHonoEnv = { Bindings: Env; Variables: AppVariables };
