import { Link, Outlet, redirect } from "react-router";
import type { Route } from "./+types/admin";
import { getUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  if (!user) {
    const next = encodeURIComponent(
      new URL(request.url).pathname + new URL(request.url).search,
    );
    throw redirect(`/auth/login?redirect=${next}`);
  }
  return { user };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const displayName = user.username?.trim() || user.email;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/admin"
            className="flex items-center gap-0 outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            <img
              src="/hermes.png"
              alt="Hermes"
              className="h-9 w-auto max-h-9 rounded-xl object-contain object-left"
            />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-zinc-500 sm:inline">{displayName}</span>
            <Link
              to="/auth/logout"
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
