import { useEffect, useId, useState } from "react";
import { Link, redirect, useFetcher } from "react-router";
import type { Route } from "./+types/admin._index";
import { insertTemplate, listTemplates } from "~/lib/db.server";

export async function loader() {
  return { templates: listTemplates() };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== "create") {
    return null;
  }

  const name = String(form.get("name") ?? "").trim();
  const body = String(form.get("body") ?? "");
  const appendSignature = form.get("appendSignature") === "on";

  if (!name) {
    return { formError: "Name is required." as const };
  }

  const created = insertTemplate({ name, body, appendSignature });
  throw redirect(`/admin/templates/${created.id}`);
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const { templates } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const [newOpen, setNewOpen] = useState(false);
  const titleId = useId();

  const formError =
    fetcher.state === "idle" &&
    fetcher.data &&
    fetcher.data !== null &&
    typeof fetcher.data === "object" &&
    "formError" in fetcher.data
      ? fetcher.data.formError
      : undefined;

  useEffect(() => {
    if (!newOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newOpen]);

  useEffect(() => {
    if (!newOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [newOpen]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Email templates</h1>
          <p className="mt-1 text-sm text-zinc-500">
            After making updates here, remember to click "Reload" in the
            lichess-gmail extension.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          New template
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-500">
          No templates yet.
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
                <span className="font-mono text-xs text-zinc-500">#{t.id}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {newOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close dialog"
            onClick={() => setNewOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-lg font-semibold text-white">
                New template
              </h2>
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {formError ? (
              <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {formError}
              </p>
            ) : null}

            <fetcher.Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="create" />

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Template name
                </span>
                <input
                  name="name"
                  required
                  disabled={fetcher.state !== "idle"}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Email body
                </span>
                <textarea
                  name="body"
                  rows={8}
                  disabled={fetcher.state !== "idle"}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50"
                />
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-3">
                <input
                  type="checkbox"
                  name="appendSignature"
                  disabled={fetcher.state !== "idle"}
                  className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-emerald-600 focus:ring-emerald-600 disabled:opacity-50"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-200">
                    Append signature
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    When enabled, the consumer (e.g. extension) should add the
                    usual signature after this body.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewOpen(false)}
                  disabled={fetcher.state !== "idle"}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fetcher.state !== "idle"}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {fetcher.state !== "idle" ? "Creating…" : "Create"}
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
