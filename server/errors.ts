import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = "AppError";
  }
}

export function errorBody(error: unknown): { status: number; body: { error: { code: string; message: string; details?: unknown } } } {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) } } };
  }
  if (error instanceof ZodError) {
    return {
      status: 422,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the highlighted information.",
          details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
        },
      },
    };
  }
  console.error("Unexpected application error", error);
  return { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } } };
}
