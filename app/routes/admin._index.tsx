import { Link } from "react-router";
import type { Route } from "./+types/admin._index";
import { listTemplates } from "~/lib/db.server";

export async function loader() {
  return { templates: listTemplates() };
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const { templates } = loaderData;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Email templates</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Shared templates visible to everyone via the public API. Only signed-in
            users can change them.
          </p>
        </div>
        <Link
          to="/admin/templates/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          New template
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-500">
          No templates yet. Create one to expose it at{" "}
          <code className="text-zinc-400">/api/templates</code>.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                to={`/admin/templates/${t.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-zinc-800/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-white">{t.name}</span>
                <span className="font-mono text-xs text-zinc-500">{t.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
