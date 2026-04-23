import { useEffect, useId, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { Route } from "./+types/admin._index";
import type { EmailTemplate } from "~/lib/db.server";
import { TemplateBodyEditor } from "~/components/template-body-editor";
import {
  deleteTemplate,
  insertTemplate,
  listTemplates,
  reorderTemplates,
  updateTemplate,
} from "~/lib/db.server";

export async function loader() {
  return { templates: listTemplates() };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "delete") {
    const id = Number(form.get("id"));
    if (!Number.isInteger(id) || id < 1) {
      return { formError: "Invalid template." as const };
    }
    deleteTemplate(id);
    return { ok: true as const };
  }

  if (intent === "update") {
    const id = Number(form.get("id"));
    if (!Number.isInteger(id) || id < 1) {
      return { formError: "Invalid template." as const };
    }
    const name = String(form.get("name") ?? "").trim();
    const body = String(form.get("body") ?? "");
    const appendSignature = form.get("appendSignature") === "on";

    if (!name) {
      return { formError: "Name is required." as const };
    }

    const updated = updateTemplate(id, { name, body, appendSignature });
    if (!updated) {
      return { formError: "Template not found." as const };
    }
    return { ok: true as const };
  }

  if (intent === "create") {
    const name = String(form.get("name") ?? "").trim();
    const body = String(form.get("body") ?? "");
    const appendSignature = form.get("appendSignature") === "on";

    if (!name) {
      return { formError: "Name is required." as const };
    }

    insertTemplate({ name, body, appendSignature });
    return { ok: true as const };
  }

  if (intent === "reorder") {
    const raw = String(form.get("order") ?? "");
    const ids = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (!reorderTemplates(ids)) {
      return { formError: "Invalid template order." as const };
    }
    return { reordered: true as const };
  }

  return null;
}

type ActiveModal = null | "new" | number;

function previewBody(body: string, maxChars = 240): string {
  const plain = body
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "—";
  if (plain.length <= maxChars) return plain;
  return `${plain.slice(0, maxChars).trimEnd()}…`;
}

function closeModal(setActive: (v: ActiveModal) => void) {
  setActive(null);
}

function DragHandle({
  templateId,
  disabled,
}: {
  templateId: number;
  disabled?: boolean;
}) {
  return (
    <div
      draggable={!disabled}
      aria-label="Drag to reorder"
      title="Drag to reorder"
      className={`flex cursor-grab touch-none items-center justify-center rounded p-1 leading-none text-zinc-500 active:cursor-grabbing ${
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-zinc-800 hover:text-zinc-300"
      }`}
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(templateId));
      }}
    >
      <span className="grid grid-cols-2 gap-0.5" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-1 w-1 rounded-sm bg-current" />
        ))}
      </span>
    </div>
  );
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const { templates } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const titleId = useId();
  const deleteConfirmTitleId = useId();
  const prevFetcherState = useRef(fetcher.state);

  const isOpen = activeModal !== null;
  const isNew = activeModal === "new";
  const editing: EmailTemplate | undefined =
    typeof activeModal === "number"
      ? templates.find((t) => t.id === activeModal)
      : undefined;

  const formError =
    fetcher.state === "idle" &&
    fetcher.data &&
    fetcher.data !== null &&
    typeof fetcher.data === "object" &&
    "formError" in fetcher.data
      ? fetcher.data.formError
      : undefined;

  useEffect(() => {
    // Fetcher goes submitting → loading (revalidate) → idle. Only checking
    // submitting→idle misses the final transition, so the modal never closed.
    if (
      prevFetcherState.current !== "idle" &&
      fetcher.state === "idle" &&
      fetcher.data &&
      typeof fetcher.data === "object" &&
      "ok" in fetcher.data &&
      fetcher.data.ok
    ) {
      setActiveModal(null);
    }
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (typeof activeModal === "number" && !editing) {
      setActiveModal(null);
    }
  }, [activeModal, editing]);

  useEffect(() => {
    if (activeModal === null) {
      setDeleteConfirmId(null);
    }
  }, [activeModal]);

  useEffect(() => {
    if (deleteConfirmId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteConfirmId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteConfirmId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal(setActiveModal);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const isSubmitting = fetcher.state === "submitting";
  const listMutationBusy = fetcher.state !== "idle";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Lichess email templates
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Here are all of our email templates which are insertable using the{" "}
            <a
              href="https://github.com/ornicar/lichess-gmail"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
            >
              lichess-gmail
            </a>{" "}
            Chrome/Firefox extension.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            After making updates here, remember to click &quot;Reload&quot; in
            the extension.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveModal("new")}
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
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
          <table className="w-full min-w-[28rem] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-[28%]" />
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90">
                <th
                  scope="col"
                  className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  <span className="sr-only">Reorder</span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Template name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Email body
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  tabIndex={0}
                  className="cursor-pointer border-b border-zinc-800/90 last:border-b-0 hover:bg-zinc-800/55 focus:bg-zinc-800/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600/45"
                  onClick={() => setActiveModal(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveModal(t.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const raw = e.dataTransfer.getData("text/plain");
                    const draggedId = Number(raw);
                    if (!Number.isInteger(draggedId) || draggedId === t.id) {
                      return;
                    }
                    const currentIds = templates.map((x) => x.id);
                    const next = [...currentIds];
                    const from = next.indexOf(draggedId);
                    const to = next.indexOf(t.id);
                    if (from === -1 || to === -1) return;
                    next.splice(from, 1);
                    next.splice(to, 0, draggedId);
                    fetcher.submit(
                      {
                        intent: "reorder",
                        order: next.join(","),
                      },
                      { method: "post" },
                    );
                  }}
                >
                  <td
                    className="align-middle px-2 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center leading-none">
                      <DragHandle
                        templateId={t.id}
                        disabled={listMutationBusy}
                      />
                    </div>
                  </td>
                  <td className="align-middle px-4 py-3">
                    <div
                      className="truncate font-medium text-white"
                      title={t.name}
                    >
                      {t.name}
                    </div>
                  </td>
                  <td className="align-top px-4 py-3 text-zinc-500">
                    <div
                      className="line-clamp-2 break-words"
                      title={previewBody(t.body)}
                    >
                      {previewBody(t.body)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (isNew || editing) ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <h2 id={titleId} className="text-lg font-semibold text-white">
                {isNew ? "New template" : "Edit template"}
              </h2>
              <button
                type="button"
                onClick={() => closeModal(setActiveModal)}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {formError ? (
              <div className="shrink-0 border-b border-zinc-800 px-6 py-3">
                <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {formError}
                </p>
              </div>
            ) : null}

            <fetcher.Form
              method="post"
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              key={isNew ? "new" : String(editing?.id)}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                <div className="flex flex-col gap-4">
                  <input
                    type="hidden"
                    name="intent"
                    value={isNew ? "create" : "update"}
                  />
                  {!isNew && editing ? (
                    <input type="hidden" name="id" value={editing.id} />
                  ) : null}

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Template name
                    </span>
                    <input
                      name="name"
                      required
                      disabled={isSubmitting}
                      defaultValue={
                        !isNew && editing ? editing.name : undefined
                      }
                      className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50"
                    />
                  </label>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Email body
                    </span>
                    <TemplateBodyEditor
                      key={isNew ? "new" : String(editing?.id)}
                      initialHtml={!isNew && editing ? editing.body : ""}
                      disabled={isSubmitting}
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-3">
                    <input
                      type="checkbox"
                      name="appendSignature"
                      disabled={isSubmitting}
                      defaultChecked={
                        isNew ? true : Boolean(editing?.appendSignature)
                      }
                      className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-emerald-600 focus:ring-emerald-600 disabled:opacity-50"
                    />
                    <span>
                      <span className="block text-sm font-medium text-zinc-200">
                        Append signature
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        When enabled, appends custom signature (configured in
                        extension).
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-zinc-800 bg-zinc-900 px-6 py-4">
                {!isNew && editing ? (
                  <button
                    type="button"
                    disabled={fetcher.state !== "idle"}
                    className="mr-auto rounded-lg border border-red-900/60 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50"
                    onClick={() => setDeleteConfirmId(editing.id)}
                  >
                    Delete
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => closeModal(setActiveModal)}
                  disabled={fetcher.state !== "idle"}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fetcher.state !== "idle"}
                  aria-busy={fetcher.state !== "idle"}
                  className="min-w-[5.5rem] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isNew ? "Create" : "Save"}
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      ) : null}

      {deleteConfirmId !== null ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="presentation"
        >
          <div className="absolute inset-0 bg-black/80" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteConfirmTitleId}
            className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
          >
            <h3
              id={deleteConfirmTitleId}
              className="text-lg font-semibold text-white"
            >
              Delete template?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {(() => {
                const t = templates.find((x) => x.id === deleteConfirmId);
                return t ? (
                  <>
                    <span className="font-medium text-zinc-300">{t.name}</span>{" "}
                    will be removed permanently. This cannot be undone.
                  </>
                ) : (
                  <>
                    This template will be removed permanently. This cannot be
                    undone.
                  </>
                );
              })()}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={fetcher.state !== "idle"}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={fetcher.state !== "idle"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                onClick={() => {
                  fetcher.submit(
                    {
                      intent: "delete",
                      id: String(deleteConfirmId),
                    },
                    { method: "post" },
                  );
                  setDeleteConfirmId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
