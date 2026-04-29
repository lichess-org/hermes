type CategoryFilter = "all" | "admin" | "broadcast";

type TemplatesToolbarProps = {
  refreshBusy: boolean;
  listMutationBusy: boolean;
  expandAll: boolean;
  categoryFilter: CategoryFilter;
  onRefresh: () => void;
  onExpandAllChange: (next: boolean) => void;
  onCategoryFilterChange: (next: CategoryFilter) => void;
  onNewTemplate: () => void;
};

export function TemplatesToolbar({
  refreshBusy,
  listMutationBusy,
  expandAll,
  categoryFilter,
  onRefresh,
  onExpandAllChange,
  onCategoryFilterChange,
  onNewTemplate,
}: TemplatesToolbarProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <button
        type="button"
        onClick={onRefresh}
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
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 border-r border-zinc-800 pr-3 text-sm text-zinc-400">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Expand all
          </span>
          <input
            type="checkbox"
            checked={expandAll}
            onChange={(e) => onExpandAllChange(e.currentTarget.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-emerald-600 focus:ring-emerald-600"
          />
        </label>
        <label className="flex items-center gap-2 pl-1 text-sm text-zinc-400">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Category
          </span>
          <select
            value={categoryFilter}
            onChange={(e) =>
              onCategoryFilterChange(e.target.value as CategoryFilter)
            }
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="all">All</option>
            <option value="admin">Admin</option>
            <option value="broadcast">Broadcast</option>
          </select>
        </label>
        <button
          type="button"
          onClick={onNewTemplate}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          New template
        </button>
      </div>
    </div>
  );
}
