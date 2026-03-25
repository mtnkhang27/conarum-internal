import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { playerMatchesApi } from "@/services/playerApi";
import { MatchCard } from "./MatchCard";
import type { Match } from "@/types";

type PaginationItem = number | "dots-left" | "dots-right";
type HotFilter = "all" | "hot";
type PresetKey = "" | "today" | "tomorrow" | "7days" | "14days" | "1month";

const addDays = (date: Date, amount: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
};

const parseDateInputValue = (value?: string) => {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
};

const getGridLayout = (width: number, height: number) => {
    if (width < 768) {
        return { columns: 1, rows: height < 760 ? 3 : 4 };
    }

    if (width < 1440) {
        return { columns: 2, rows: height < 860 ? 2 : 3 };
    }

    return { columns: 3, rows: height < 900 ? 2 : 3 };
};

const getSpecialMatchRows = (items: Match[], columns: number) => {
    if (columns < 3) return null;
    if (items.length === 4) {
        return [items.slice(0, 2), items.slice(2, 4)];
    }

    if (items.length === 5) {
        return [items.slice(0, 3), items.slice(3, 5)];
    }

    return null;
};

interface MatchPredictionTableProps {
    tournamentId: string;
    onPredictionChange?: () => void | Promise<void>;
}

export function MatchPredictionTable({
    tournamentId,
    onPredictionChange,
}: MatchPredictionTableProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [matches, setMatches] = useState<Match[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const requestSequence = useRef(0);
    const [gridLayout, setGridLayout] = useState(() =>
        typeof window === "undefined"
            ? { columns: 1, rows: 4 }
            : getGridLayout(window.innerWidth, window.innerHeight),
    );

    const [presetKey, setPresetKey] = useState<PresetKey>("");
    const [draftCalendarStart, setDraftCalendarStart] = useState("");
    const [draftCalendarEnd, setDraftCalendarEnd] = useState("");
    const [appliedCalendarStart, setAppliedCalendarStart] = useState("");
    const [appliedCalendarEnd, setAppliedCalendarEnd] = useState("");
    const [hotFilter, setHotFilter] = useState<HotFilter>("all");

    useEffect(() => {
        const handleResize = () => {
            setGridLayout(getGridLayout(window.innerWidth, window.innerHeight));
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const resolvedRange = useMemo<{ start: Date | null; end: Date | null }>(() => {
        if (presetKey) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            switch (presetKey) {
                case "today":
                    return { start: today, end: today };
                case "tomorrow":
                    return { start: addDays(today, 1), end: addDays(today, 1) };
                case "7days":
                    return { start: today, end: addDays(today, 6) };
                case "14days":
                    return { start: today, end: addDays(today, 13) };
                case "1month":
                    return { start: today, end: addDays(today, 29) };
            }
        }

        return {
            start: parseDateInputValue(appliedCalendarStart),
            end: parseDateInputValue(appliedCalendarEnd),
        };
    }, [presetKey, appliedCalendarStart, appliedCalendarEnd]);

    const pageSize = gridLayout.columns * gridLayout.rows;

    const queryFilters = useMemo(() => {
        const hotOnly = hotFilter === "hot";
        const { start, end } = resolvedRange;

        if (!start) {
            return {
                hotOnly,
                kickoffStartIso: undefined,
                kickoffEndIso: undefined,
            };
        }

        const startAt = new Date(start);
        startAt.setHours(0, 0, 0, 0);

        const endAt = new Date(end ?? start);
        endAt.setHours(0, 0, 0, 0);

        const endExclusive = addDays(endAt, 1);
        endExclusive.setHours(0, 0, 0, 0);

        return {
            hotOnly,
            kickoffStartIso: startAt.toISOString(),
            kickoffEndIso: endExclusive.toISOString(),
        };
    }, [resolvedRange, hotFilter]);

    const loadPage = useCallback(
        async (nextPage: number, nextPageSize: number) => {
            const requestId = ++requestSequence.current;
            setLoading(true);

            try {
                const { items, totalCount: count } =
                    await playerMatchesApi.getAvailablePaged({
                        tournamentId: tournamentId || undefined,
                        page: nextPage,
                        pageSize: nextPageSize,
                        hotOnly: queryFilters.hotOnly,
                        kickoffStartIso: queryFilters.kickoffStartIso,
                        kickoffEndIso: queryFilters.kickoffEndIso,
                    });

                if (requestSequence.current !== requestId) return;
                setMatches(items);
                setTotalCount(count);
            } catch {
                if (requestSequence.current !== requestId) return;
                setMatches([]);
                setTotalCount(0);
            } finally {
                if (requestSequence.current === requestId) {
                    setLoading(false);
                }
            }
        },
        [
            tournamentId,
            queryFilters.hotOnly,
            queryFilters.kickoffStartIso,
            queryFilters.kickoffEndIso,
        ],
    );

    useEffect(() => {
        setPage(1);
        void loadPage(1, pageSize);
    }, [tournamentId, pageSize, queryFilters, loadPage]);

    const handlePresetChange = (key: PresetKey) => {
        setPresetKey(key);
        if (key) {
            setDraftCalendarStart("");
            setDraftCalendarEnd("");
            setAppliedCalendarStart("");
            setAppliedCalendarEnd("");
        }
    };

    const handleRangeChange = (range: { start: string; end: string }) => {
        setDraftCalendarStart(range.start);
        setDraftCalendarEnd(range.end);

        if (!range.start && !range.end) {
            setPresetKey("");
            setAppliedCalendarStart("");
            setAppliedCalendarEnd("");
            return;
        }

        if (range.start && range.end) {
            setPresetKey("");
            setAppliedCalendarStart(range.start);
            setAppliedCalendarEnd(range.end);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = Math.min(page, totalPages);

    const handlePageChange = useCallback(
        (nextPage: number) => {
            const safePage = Math.min(totalPages, Math.max(1, nextPage));
            setPage(safePage);
            void loadPage(safePage, pageSize);
        },
        [loadPage, pageSize, totalPages],
    );

    const specialMatchRows = useMemo(
        () => getSpecialMatchRows(visibleMatches, gridLayout.columns),
        [visibleMatches, gridLayout.columns]
    );

    const placeholderCount =
        matches.length === 0
            ? 0
            : (gridLayout.columns - (matches.length % gridLayout.columns)) % gridLayout.columns;

    const from = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalCount);
    const showContentLoadingOverlay = loading && matches.length > 0;

    const paginationItems = useMemo<PaginationItem[]>(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, idx) => idx + 1);
        }

        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, "dots-right", totalPages];
        }

        if (currentPage >= totalPages - 3) {
            return [
                1,
                "dots-left",
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ];
        }

        return [
            1,
            "dots-left",
            currentPage - 1,
            currentPage,
            currentPage + 1,
            "dots-right",
            totalPages,
        ];
    }, [currentPage, totalPages]);

    const filterControls = (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <select
                value={presetKey}
                onChange={(event) =>
                    handlePresetChange(event.target.value as PresetKey)
                }
                className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                aria-label="Quick date filter"
            >
                <option value="">{t("matchPredictionTable.allDates")}</option>
                <option value="today">{t("matchPredictionTable.today")}</option>
                <option value="tomorrow">{t("matchPredictionTable.tomorrow")}</option>
                <option value="7days">{t("matchPredictionTable.next7Days")}</option>
                <option value="14days">{t("matchPredictionTable.next14Days")}</option>
                <option value="1month">{t("matchPredictionTable.next1Month")}</option>
            </select>

            <DateRangePicker
                startValue={draftCalendarStart}
                endValue={draftCalendarEnd}
                onChangeRange={handleRangeChange}
                placeholder={t("matchPredictionTable.dateRange")}
                className="w-full"
            />

            <select
                value={hotFilter}
                onChange={(event) => {
                    setHotFilter(event.target.value as HotFilter);
                }}
                className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                aria-label="Filter hot matches"
            >
                <option value="all">{t("matchPredictionTable.allMatches")}</option>
                <option value="hot">{t("matchPredictionTable.hotMatchOnly")}</option>
            </select>
        </div>
    );

    if (loading && matches.length === 0) {
        return <LoadingOverlay />;
    }

    if (!loading && matches.length === 0) {
        return (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)]">
                <div className="border-b border-border bg-surface/55 px-4 py-3">
                    {filterControls}
                </div>

                <p className="py-10 text-center text-sm text-muted-foreground">
                    {t("matchPredictionTable.noMatchesFound")}
                </p>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)]">
            <div className="border-b border-border bg-surface/55 px-4 py-3">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            {t("common.showing", { from, to, total: totalCount })}
                        </p>
                    </div>

                    {filterControls}
                </div>
            </div>

            <div className="relative">
                <div
                    className="grid gap-px bg-border/60"
                    style={{ gridTemplateColumns: `repeat(${gridLayout.columns}, minmax(0, 1fr))` }}
                >
                    {matches.map((match) => (
                        <div key={match.id} className="h-full bg-card p-3 sm:p-4">
                            <MatchCard match={match} onPredictionChange={onPredictionChange} />
                        </div>
                    ))}

                    {Array.from({ length: placeholderCount }, (_, idx) => (
                        <div key={`placeholder-${idx}`} className="h-full bg-card p-3 sm:p-4">
                            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface-dark/30">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {t("matchPredictionTable.empty")}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="border-t border-border bg-surface/35 px-4 py-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                                    aria-label="Previous page"
                                >
                                    {t("common.previous")}
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

                                        const isActive = item === currentPage;
                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => handlePageChange(item)}
                                                disabled={loading}
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
                                    onClick={() =>
                                        handlePageChange(Math.min(totalPages, currentPage + 1))
                                    }
                                    disabled={currentPage === totalPages || loading}
                                    className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                                    aria-label="Next page"
                                >
                                    {t("common.next")}
                                </button>
                            </div>

                            <div className="text-[11px] font-semibold text-muted-foreground">
                                {t("common.page", { current: currentPage, total: totalPages })}
                            </div>
                        </div>
                    </div>
                )}

                {showContentLoadingOverlay && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/78 backdrop-blur-[1.5px]">
                        <div className="pointer-events-none w-full max-w-sm px-4">
                            <LoadingOverlay />
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
