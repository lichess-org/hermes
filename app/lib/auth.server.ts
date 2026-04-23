import { redirect } from "react-router";
import type { SessionUser } from "./session.server";
import { getSession } from "./session.server";

export async function getUser(request: Request): Promise<SessionUser | null> {
  const session = await getSession(request);
  return session.get("user") ?? null;
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getUser(request);
  if (!user) {
    const next = encodeURIComponent(
      new URL(request.url).pathname + new URL(request.url).search,
    );
    throw redirect(`/auth/login?redirect=${next}`);
  }
  return user;
}

/** String stored on rows as `updatedBy` (username, else email, else sub). */
export async function getRecordUpdatedBy(
  request: Request,
): Promise<string | null> {
  const user = await getUser(request);
  if (!user) return null;
  const s = (user.username?.trim() || user.email || user.sub).trim();
  return s || null;
}
