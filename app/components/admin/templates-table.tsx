import { Fragment, useRef, useState } from "react";
import type { EmailTemplate } from "~/lib/db.server";
import {
  formatFullTimestamp,
  formatRelativeTime,
  parseStoredDate,
} from "~/lib/time-formatting";

function previewBody(body: string, maxChars = 240): string {
  const plain = body
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "—";
  if (plain.length <= maxChars) return plain;
  return `${plain.slice(0, maxChars).trimEnd()}…`;
}

function hasNotes(notesHtml: string): boolean {
  return previewBody(notesHtml, 10_000) !== "—";
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

type TemplatesTableProps = {
  templates: EmailTemplate[];
  visibleTemplates: EmailTemplate[];
  expandAll: boolean;
  listMutationBusy: boolean;
  onOpenTemplate: (templateId: number) => void;
  onReorder: (nextOrderedIds: number[]) => void;
};

export function TemplatesTable({
  templates,
  visibleTemplates,
  expandAll,
  listMutationBusy,
  onOpenTemplate,
  onReorder,
}: TemplatesTableProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropLineIndex, setDropLineIndex] = useState<number | null>(null);
  const dropLineIndexRef = useRef<number | null>(null);
  const dragSessionRef = useRef(false);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
      <table className="w-full min-w-3xl table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-10" />
          <col className="w-[30%]" />
          <col className="w-[50%]" />
          <col className="w-5" />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/90">
            <th
              scope="col"
              className="w-6 min-w-0 max-w-6 box-border px-0 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
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
            <th scope="col">{/* Notes */}</th>
            <th
              scope="col"
              className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleTemplates.map((t, i) => (
            <Fragment key={t.id}>
              {draggingId !== null && dropLineIndex === i ? (
                <DropIndicatorRow />
              ) : null}
              <tr
                tabIndex={0}
                className={`cursor-pointer border-b border-zinc-800/90 last:border-b-0 hover:bg-zinc-800/55 focus:bg-zinc-800/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600/45 ${
                  draggingId === t.id ? "opacity-50" : ""
                }`}
                onClick={() => onOpenTemplate(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenTemplate(t.id);
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
                  const allIds = templates.map((x) => x.id);
                  const visibleIds = visibleTemplates.map((x) => x.id);
                  const nextVisible = buildReorderedIds(
                    visibleIds,
                    dragged,
                    insertIndex,
                  );
                  const visibleSet = new Set(visibleIds);
                  let j = 0;
                  const next = allIds.map((id) =>
                    visibleSet.has(id) ? nextVisible[j++] : id,
                  );
                  dragSessionRef.current = false;
                  setDraggingId(null);
                  setDropLineIndex(null);
                  dropLineIndexRef.current = null;
                  if (next.join(",") === allIds.join(",")) {
                    return;
                  }
                  onReorder(next);
                }}
              >
                <td
                  className="box-border w-6 min-w-0 max-w-6 align-middle px-0 py-3"
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
                    className={
                      expandAll
                        ? "font-medium text-white"
                        : "truncate font-medium text-white"
                    }
                    title={expandAll ? undefined : t.name}
                  >
                    {t.name}
                  </div>
                </td>
                <td className="align-top px-4 py-3 text-zinc-500">
                  <div
                    className={
                      expandAll
                        ? "wrap-break-word"
                        : "line-clamp-2 wrap-break-word"
                    }
                    title={expandAll ? undefined : previewBody(t.body)}
                  >
                    {expandAll
                      ? previewBody(t.body, 10_000)
                      : previewBody(t.body)}
                  </div>
                </td>
                <td className="align-middle text-zinc-500">
                  {hasNotes(t.notes) ? (
                    <div
                      className="flex h-full justify-center text-zinc-400 hover:text-zinc-200"
                      title={previewBody(t.notes, 10_000)}
                      aria-label="Template has notes"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4.5 w-4.5"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10A8 8 0 114.94 3.94 8 8 0 0118 10zm-7-4a1 1 0 10-2 0 1 1 0 002 0zm-2 3a1 1 0 000 2v3a1 1 0 102 0v-3a1 1 0 10-2 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-zinc-400">
                  <div className="flex-col">
                    <div className="text-xs">{t.updatedBy}</div>
                    <time
                      dateTime={updatedAtIso(t.updatedAt)}
                      title={formatFullTimestamp(t.updatedAt)}
                      className="text-xs"
                    >
                      {formatRelativeTime(t.updatedAt)}
                    </time>
                  </div>
                </td>
              </tr>
            </Fragment>
          ))}
          {draggingId !== null && dropLineIndex === visibleTemplates.length ? (
            <DropIndicatorRow />
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
