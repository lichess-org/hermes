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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              to="/admin"
              className="font-semibold tracking-tight text-white"
            >
              Hermes admin
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-400">
              <Link
                to="/admin"
                className="hover:text-white aria-[current=page]:text-emerald-400"
              >
                Templates
              </Link>
              <Link
                to="/admin/templates/new"
                className="hover:text-white aria-[current=page]:text-emerald-400"
              >
                New template
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-zinc-500 sm:inline">{user.email}</span>
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
