export class AppError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "forbidden" | "validation" | "conflict" | "unauthorized" = "validation",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Record") => new AppError(`${what} not found.`, "not_found");
export const forbidden = (msg = "You don't have access to this.") => new AppError(msg, "forbidden");
export const invalid = (msg: string) => new AppError(msg, "validation");
