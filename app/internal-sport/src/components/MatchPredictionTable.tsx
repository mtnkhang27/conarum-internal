import { useEffect, useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import type { Match } from "@/types";

const COLUMNS = 3;
const ROWS_PER_PAGE = 3;
const PAGE_SIZE = COLUMNS * ROWS_PER_PAGE;
type PaginationItem = number | "dots-left" | "dots-right";

interface MatchPredictionTableProps {
    matches: Match[];
    onPredictionChange?: () => void;
}

export function MatchPredictionTable({ matches, onPredictionChange }: MatchPredictionTableProps) {
    const [page, setPage] = useState(1);

    const firstMatchId = matches[0]?.id ?? "";
    const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));

    useEffect(() => {
        setPage(1);
    }, [matches.length, firstMatchId]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    const rows = useMemo(() => {
        const visible = matches.slice(startIndex, endIndex);
        const grouped: Match[][] = [];
        for (let i = 0; i < visible.length; i += COLUMNS) {
            grouped.push(visible.slice(i, i + COLUMNS));
        }
        return grouped;
    }, [matches, startIndex, endIndex]);

    const from = matches.length === 0 ? 0 : startIndex + 1;
    const to = Math.min(endIndex, matches.length);
    const paginationItems = useMemo<PaginationItem[]>(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, idx) => idx + 1);
        }

        if (page <= 4) {
            return [1, 2, 3, 4, 5, "dots-right", totalPages];
        }

        if (page >= totalPages - 3) {
            return [1, "dots-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [1, "dots-left", page - 1, page, page + 1, "dots-right", totalPages];
    }, [page, totalPages]);

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)]">
            <div className="border-b border-border bg-surface/55 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        Showing {from}-{to} of {matches.length} matches
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[1040px]">
                    {rows.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            No upcoming matches available for prediction.
                        </p>
                    ) : (
                        rows.map((row, rowIdx) => (
                            <div
                                key={`table-row-${rowIdx}`}
                                className="grid grid-cols-3 border-b border-border/70 last:border-b-0"
                            >
                                {Array.from({ length: COLUMNS }, (_, colIdx) => {
                                    const match = row[colIdx];
                                    const key = match?.id || `placeholder-${rowIdx}-${colIdx}`;

                                    return (
                                        <div key={key} className="border-r border-border/70 p-3 last:border-r-0">
                                            {match ? (
                                                <MatchCard match={match} onPredictionChange={onPredictionChange} />
                                            ) : (
                                                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface-dark/40">
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        Empty
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {totalPages > 1 && (
                <div className="border-t border-border bg-surface/35 px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page === 1}
                            className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                            aria-label="Previous page"
                        >
                            Previous
                        </button>

                        <div className="inline-flex items-center rounded-md border border-border bg-surface-dark/85 p-1">
                            {paginationItems.map((item) => {
                                if (item === "dots-left" || item === "dots-right") {
                                    return (
                                        <span
                                            key={item}
                                            className="inline-flex h-7 min-w-7 items-center justify-center px-1 text-xs font-semibold text-muted-foreground"
                                        >
                                            ...
                                        </span>
                                    );
                                }

                                const isActive = item === page;
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setPage(item)}
                                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-2 text-xs font-semibold transition-colors ${
                                            isActive
                                                ? "bg-primary text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
                                                : "text-foreground/80 hover:bg-surface hover:text-primary"
                                        }`}
                                        aria-label={`Go to page ${item}`}
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        {item}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page === totalPages}
                            className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                            aria-label="Next page"
                        >
                            Next
                        </button>

                        <div className="ml-1 text-[11px] font-semibold text-muted-foreground">
                            Page {page}/{totalPages}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
