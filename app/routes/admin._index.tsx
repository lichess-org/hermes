import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useFetcher, useRevalidator, useSearchParams } from "react-router";
import type { Route } from "./+types/admin._index";
import type { EmailTemplate } from "~/lib/db.server";
import { TemplateBodyEditor } from "~/components/template-body-editor";
import { getRecordUpdatedBy } from "~/lib/auth.server";
import {
  deleteTemplate,
  getTemplateById,
  insertTemplate,
  listTemplates,
  reorderTemplates,
  updateTemplate,
} from "~/lib/db.server";
import {
  formatFullTimestamp,
  formatRelativeTime,
  parseStoredDate,
} from "~/lib/time-formatting";

const TEMPLATE_QUERY = "template";

function parseOpenTemplateId(url: string): number | null {
  const raw = new URL(url).searchParams.get(TEMPLATE_QUERY);
  if (raw == null || raw === "" || !/^\d+$/.test(raw)) {
    return null;
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }
  return getTemplateById(id) ? id : null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const templates = listTemplates();
  return {
    templates,
    openTemplateId: parseOpenTemplateId(request.url),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  const by = await getRecordUpdatedBy(request);
  if (!by) {
    return { formError: "Not signed in." as const };
  }

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
    const notes = String(form.get("notes") ?? "");
    const appendSignature = form.get("appendSignature") === "on";

    if (!name) {
      return { formError: "Name is required." as const };
    }

    const updated = updateTemplate(id, {
      name,
      body,
      notes,
      appendSignature,
      updatedBy: by,
    });
    if (!updated) {
      return { formError: "Template not found." as const };
    }
    return { ok: true as const };
  }

  if (intent === "create") {
    const name = String(form.get("name") ?? "").trim();
    const body = String(form.get("body") ?? "");
    const notes = String(form.get("notes") ?? "");
    const appendSignature = form.get("appendSignature") === "on";

    if (!name) {
      return { formError: "Name is required." as const };
    }

    insertTemplate({ name, body, notes, appendSignature, updatedBy: by });
    return { ok: true as const };
  }

  if (intent === "duplicate") {
    const id = Number(form.get("id"));
    if (!Number.isInteger(id) || id < 1) {
      return { formError: "Invalid template." as const };
    }
    const source = getTemplateById(id);
    if (!source) {
      return { formError: "Template not found." as const };
    }
    const created = insertTemplate({
      name: `${source.name} (copy)`,
      body: source.body,
      notes: source.notes,
      appendSignature: source.appendSignature,
      updatedBy: by,
    });
    return { ok: true as const, duplicatedId: created.id };
  }

  if (intent === "reorder") {
    const raw = String(form.get("order") ?? "");
    const ids = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (!reorderTemplates(ids, by)) {
      return { formError: "Invalid template order." as const };
    }
    return { reordered: true as const };
  }

  return null;
}

const HOUR_MS = 60 * 60 * 1000;

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

function isEmptyNotesHtml(html: string): boolean {
  const t = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length === 0;
}

function updatedAtIso(isoish: string): string | undefined {
  const d = parseStoredDate(isoish);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** `insertIndex` is the gap index in the full list (0 … ids.length). */
function buildReorderedIds(
  ids: number[],
  draggedId: number,
  insertIndex: number,
): number[] {
  const from = ids.indexOf(draggedId);
  if (from === -1) return ids;
  const next = ids.filter((id) => id !== draggedId);
  let at = insertIndex;
  if (from < insertIndex) at = insertIndex - 1;
  next.splice(at, 0, draggedId);
  return next;
}

function DropIndicatorRow() {
  return (
    <tr className="pointer-events-none" aria-hidden>
      <td colSpan={5} className="h-0 border-0 p-0">
        <div className="h-[3px] rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
      </td>
    </tr>
  );
}

function DragHandle({
  templateId,
  disabled,
  onDragStart,
  onDragEnd,
}: {
  templateId: number;
  disabled?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  return (
    <div
      draggable={!disabled}
      aria-label="Drag to reorder"
      title="Drag to reorder"
      className={`flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-1 leading-none text-zinc-500 active:cursor-grabbing ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-zinc-800 hover:text-zinc-300"
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
        onDragStart?.();
      }}
      onDragEnd={() => {
        onDragEnd?.();
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
  const { templates, openTemplateId } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const [activeModal, setActiveModal] = useState<ActiveModal>(
    () => openTemplateId ?? null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropLineIndex, setDropLineIndex] = useState<number | null>(null);
  const dropLineIndexRef = useRef<number | null>(null);
  const dragSessionRef = useRef(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [shareCopyFeedback, setShareCopyFeedback] = useState(false);
  const titleId = useId();
  const deleteConfirmTitleId = useId();
  const prevFetcherState = useRef(fetcher.state);
  const prevRevalidatorState = useRef(revalidator.state);

  const setActiveWithUrl = useCallback(
    (next: ActiveModal) => {
      setActiveModal(next);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (typeof next === "number") {
            p.set(TEMPLATE_QUERY, String(next));
          } else {
            p.delete(TEMPLATE_QUERY);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const raw = searchParams.get(TEMPLATE_QUERY);
    let fromUrl: number | null = null;
    if (raw && /^\d+$/.test(raw)) {
      const id = Number(raw);
      if (templates.some((t) => t.id === id)) {
        fromUrl = id;
      } else {
        setSearchParams(
          (p) => {
            const n = new URLSearchParams(p);
            n.delete(TEMPLATE_QUERY);
            return n;
          },
          { replace: true },
        );
      }
    } else if (raw !== null && raw !== "" && !/^\d+$/.test(raw)) {
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete(TEMPLATE_QUERY);
          return n;
        },
        { replace: true },
      );
    }
    setActiveModal((prev) => {
      if (fromUrl !== null) {
        return fromUrl;
      }
      if (prev === "new") {
        return "new";
      }
      return null;
    });
  }, [searchParams, setSearchParams, templates]);

  const isOpen = activeModal !== null;
  const isNew = activeModal === "new";
  const editing: EmailTemplate | undefined =
    typeof activeModal === "number"
      ? templates.find((t) => t.id === activeModal)
      : undefined;

  const copyShareUrl = useCallback(() => {
    if (!editing) {
      return;
    }
    const u = new URL(window.location.href);
    u.searchParams.set(TEMPLATE_QUERY, String(editing.id));
    void navigator.clipboard.writeText(u.toString());
    setShareCopyFeedback(true);
    window.setTimeout(() => setShareCopyFeedback(false), 2_000);
  }, [editing]);

  useEffect(() => {
    if (!isOpen) return;
    if (isNew) {
      setNotesOpen(false);
    } else if (typeof activeModal === "number") {
      const t = templates.find((x) => x.id === activeModal);
      if (t) {
        setNotesOpen(!isEmptyNotesHtml(t.notes));
      }
    }
    // Intentionally omit `templates` from deps so list revalidations do not
    // collapse the notes field after the user clicks "Add notes".
  }, [isOpen, isNew, activeModal]);

  const formError =
    fetcher.state === "idle" &&
    fetcher.data &&
    fetcher.data !== null &&
    typeof fetcher.data === "object" &&
    "formError" in fetcher.data
      ? fetcher.data.formError
      : undefined;

  const refreshBusy = revalidator.state === "loading";

  useEffect(() => {
    setLastRefreshedAt(Date.now());
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (
      prevRevalidatorState.current === "loading" &&
      revalidator.state === "idle"
    ) {
      setLastRefreshedAt(Date.now());
    }
    prevRevalidatorState.current = revalidator.state;
  }, [revalidator.state]);

  useEffect(() => {
    // Fetcher goes submitting → loading (revalidate) → idle. Only checking
    // submitting→idle misses the final transition, so the modal never closed.
    if (prevFetcherState.current !== "idle" && fetcher.state === "idle") {
      const d = fetcher.data;
      if (d && typeof d === "object") {
        if ("ok" in d && d.ok) {
          if (
            "duplicatedId" in d &&
            typeof d.duplicatedId === "number" &&
            Number.isInteger(d.duplicatedId)
          ) {
            setActiveWithUrl(d.duplicatedId);
          } else {
            setActiveWithUrl(null);
          }
        }
        if (("ok" in d && d.ok) || ("reordered" in d && d.reordered)) {
          setLastRefreshedAt(Date.now());
        }
      }
    }
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, fetcher.data, setActiveWithUrl]);

  useEffect(() => {
    if (typeof activeModal === "number" && !editing) {
      setActiveWithUrl(null);
    }
  }, [activeModal, editing, setActiveWithUrl]);

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
      if (e.key === "Escape") setActiveWithUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setActiveWithUrl]);

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
    <div className="space-y-4">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Lichess email templates
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
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

        <div className="flex items-end justify-between gap-3">
          <button
            type="button"
            onClick={() => revalidator.revalidate()}
            disabled={refreshBusy || listMutationBusy}
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 shrink-0 ${refreshBusy ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshBusy ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setActiveWithUrl("new")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            New template
          </button>
        </div>

        {lastRefreshedAt !== null && now - lastRefreshedAt > HOUR_MS ? (
          <p
            className="rounded-md border border-amber-900/40 bg-amber-950/25 px-3 py-2.5 text-sm leading-snug text-amber-100/90"
            role="status"
          >
            It has been over an hour since this list was loaded. Click Refresh
            to pick up any changes from others.
          </p>
        ) : null}
      </div>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-500">
          No templates yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
          <table className="w-full min-w-[48rem] table-fixed border-collapse text-left text-sm">
            <colgroup>
              {/* Fixed px width: % widths on <col> are of the *whole* table, so
                  mixing 86% with a fixed first col overflows and browsers
                  redistribute — the drag column can grow. Remaining columns
                  share the rest of the table width evenly. */}
              <col style={{ width: "2.5rem" }} />
              <col className="w-[30%]" />
              <col className="w-[40%]" />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90">
                <th
                  scope="col"
                  className="w-[1.5rem] min-w-0 max-w-[1.5rem] box-border px-0 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
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
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Notes
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <Fragment key={t.id}>
                  {draggingId !== null && dropLineIndex === i ? (
                    <DropIndicatorRow />
                  ) : null}
                  <tr
                    tabIndex={0}
                    className={`cursor-pointer border-b border-zinc-800/90 last:border-b-0 hover:bg-zinc-800/55 focus:bg-zinc-800/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600/45 ${
                      draggingId === t.id ? "opacity-50" : ""
                    }`}
                    onClick={() => setActiveWithUrl(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveWithUrl(t.id);
                      }
                    }}
                    onDragOver={(e) => {
                      if (!dragSessionRef.current) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const rect = e.currentTarget.getBoundingClientRect();
                      const midY = rect.top + rect.height / 2;
                      const insertIndex = e.clientY <= midY ? i : i + 1;
                      dropLineIndexRef.current = insertIndex;
                      setDropLineIndex(insertIndex);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const raw = e.dataTransfer.getData("text/plain");
                      const dragged = Number(raw);
                      if (!Number.isInteger(dragged)) {
                        return;
                      }
                      const insertIndex = dropLineIndexRef.current;
                      if (insertIndex === null) {
                        return;
                      }
                      const ids = templates.map((x) => x.id);
                      const next = buildReorderedIds(ids, dragged, insertIndex);
                      dragSessionRef.current = false;
                      setDraggingId(null);
                      setDropLineIndex(null);
                      dropLineIndexRef.current = null;
                      if (next.join(",") === ids.join(",")) {
                        return;
                      }
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
                      className="box-border w-[1.5rem] min-w-0 max-w-[1.5rem] align-middle px-0 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex w-full min-w-0 items-center justify-center leading-none">
                        <DragHandle
                          templateId={t.id}
                          disabled={listMutationBusy}
                          onDragStart={() => {
                            dragSessionRef.current = true;
                            setDraggingId(t.id);
                            setDropLineIndex(null);
                            dropLineIndexRef.current = null;
                          }}
                          onDragEnd={() => {
                            dragSessionRef.current = false;
                            setDraggingId(null);
                            setDropLineIndex(null);
                            dropLineIndexRef.current = null;
                          }}
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
                        className="line-clamp-2 wrap-break-word"
                        title={previewBody(t.body)}
                      >
                        {previewBody(t.body)}
                      </div>
                    </td>
                    <td className="align-top px-4 py-3 text-zinc-500">
                      <div
                        className="line-clamp-2 wrap-break-word"
                        title={previewBody(t.notes)}
                      >
                        {previewBody(t.notes) || "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top text-zinc-400">
                      <time
                        dateTime={updatedAtIso(t.updatedAt)}
                        title={formatFullTimestamp(t.updatedAt)}
                        className="text-xs"
                      >
                        {formatRelativeTime(t.updatedAt)}
                      </time>
                    </td>
                  </tr>
                </Fragment>
              ))}
              {draggingId !== null && dropLineIndex === templates.length ? (
                <DropIndicatorRow key="line-end" />
              ) : null}
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
              <div className="min-w-0 pr-2">
                <h2 id={titleId} className="text-lg font-semibold text-white">
                  {isNew ? "New template" : "Edit template"}
                </h2>
                {!isNew && editing ? (
                  <div className="mt-2 text-xs leading-relaxed text-zinc-500">
                    <p
                      className="text-zinc-500"
                      title={formatFullTimestamp(editing.updatedAt)}
                    >
                      <span className="text-zinc-600">Last updated: </span>
                      {formatRelativeTime(editing.updatedAt)}
                    </p>
                    {editing.updatedBy ? (
                      <p className="mt-1 text-zinc-500">
                        <span className="text-zinc-600">Updated by: </span>
                        {editing.updatedBy}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!isNew && editing ? (
                  <button
                    type="button"
                    onClick={copyShareUrl}
                    className="rounded-md px-2 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    title="Copy a link to this template"
                  >
                    {shareCopyFeedback ? "Copied" : "Share link"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveWithUrl(null)}
                  className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
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
                      key={`body-${isNew ? "new" : String(editing?.id)}`}
                      initialHtml={!isNew && editing ? editing.body : ""}
                      disabled={isSubmitting}
                    />
                  </div>

                  {!notesOpen ? (
                    <input type="hidden" name="notes" value="" />
                  ) : null}
                  {notesOpen ? (
                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Notes
                      </span>
                      <span className="text-xs text-zinc-600">
                        Internal notes (HTML). Shown in the list only to
                        editors.
                      </span>
                      <TemplateBodyEditor
                        key={`notes-${isNew ? "new" : String(editing?.id)}`}
                        inputName="notes"
                        initialHtml={!isNew && editing ? editing.notes : ""}
                        disabled={isSubmitting}
                      />
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => setNotesOpen(true)}
                        disabled={isSubmitting}
                        className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add notes
                      </button>
                    </div>
                  )}

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
                  <div className="mr-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={fetcher.state !== "idle"}
                      className="rounded-lg border border-red-900/60 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50"
                      onClick={() => setDeleteConfirmId(editing.id)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      disabled={fetcher.state !== "idle"}
                      className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/80 disabled:opacity-50"
                      onClick={() => {
                        fetcher.submit(
                          {
                            intent: "duplicate",
                            id: String(editing.id),
                          },
                          { method: "post" },
                        );
                      }}
                    >
                      Duplicate template
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveWithUrl(null)}
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
