export function getAppUrl(): string {
  const url = process.env.APP_URL?.replace(/\/$/, "");
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must be set in production (public origin of this app)");
  }
  return "http://localhost:5173";
}
