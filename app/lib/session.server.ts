import { createCookieSessionStorage } from "react-router";

export type SessionUser = {
  sub: string;
  email: string;
  name?: string;
  username?: string;
};

export type OAuthPending = {
  state: string;
  returnTo?: string;
};

const secret = process.env.SESSION_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET is required in production");
}

export const sessionStorage = createCookieSessionStorage<{
  user?: SessionUser;
  oauth?: OAuthPending;
}>({
  cookie: {
    name: "__hermes_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secrets: secret ? [secret] : ["dev-insecure-secret-change-me"],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function commitSession(session: Awaited<ReturnType<typeof getSession>>) {
  return sessionStorage.commitSession(session);
}

export async function destroySession(session: Awaited<ReturnType<typeof getSession>>) {
  return sessionStorage.destroySession(session);
}
