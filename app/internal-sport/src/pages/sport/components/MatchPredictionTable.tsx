import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MatchCard } from "./MatchCard";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { Match } from "@/types";

const COLUMNS = 3;
const ROWS_PER_PAGE = 3;
const PAGE_SIZE = COLUMNS * ROWS_PER_PAGE;
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

interface MatchPredictionTableProps {
    matches: Match[];
    onPredictionChange?: () => void;
}

export function MatchPredictionTable({ matches, onPredictionChange }: MatchPredictionTableProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);

    // ── Date filter state ────────────────────────────────────
    const [presetKey, setPresetKey] = useState<PresetKey>("");
    const [calendarStart, setCalendarStart] = useState("");
    const [calendarEnd, setCalendarEnd] = useState("");

    const [hotFilter, setHotFilter] = useState<HotFilter>("all");

    // ── Derived date range (from either preset or calendar) ──
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
            start: parseDateInputValue(calendarStart),
            end: parseDateInputValue(calendarEnd),
        };
    }, [presetKey, calendarStart, calendarEnd]);

    // ── Handlers ─────────────────────────────────────────────

    const handlePresetChange = (key: PresetKey) => {
        setPresetKey(key);
        if (key) {
            // Clear calendar when a preset is selected
            setCalendarStart("");
            setCalendarEnd("");
        }
        setPage(1);
    };

    const handleRangeChange = (range: { start: string; end: string }) => {
        setCalendarStart(range.start);
        setCalendarEnd(range.end);
        // Clear preset when calendar is used
        if (range.start || range.end) {
            setPresetKey("");
        }
        setPage(1);
    };

    // ── Filtered matches ─────────────────────────────────────

    const filteredMatches = useMemo(() => {
        const getDayStart = (iso?: string) => {
            if (!iso) return null;
            const kickoff = new Date(iso);
            if (Number.isNaN(kickoff.getTime())) return null;
            kickoff.setHours(0, 0, 0, 0);
            return kickoff;
        };

        const now = new Date();

        return matches.filter((match) => {
            if (match.bettingLocked) return false;

            // Hide matches whose kickoff is in the past
            if (match.kickoffIso) {
                const kickoff = new Date(match.kickoffIso);
                if (!Number.isNaN(kickoff.getTime()) && kickoff < now) return false;
            }

            if (hotFilter === "hot" && !match.isHotMatch) return false;

            const { start, end } = resolvedRange;

            // If no date filter is active, show all matches
            if (!start) return true;

            const kickoffDay = getDayStart(match.kickoffIso);
            if (!kickoffDay) return true; // slots without kickoff

            const kickoffTime = kickoffDay.getTime();

            // Only start selected (no end yet) → show only that day
            if (start && !end) {
                const rangeStartMs = start.getTime();
                const rangeEndExclusiveMs = addDays(start, 1).getTime();
                return kickoffTime >= rangeStartMs && kickoffTime < rangeEndExclusiveMs;
            }

            // Both start and end selected → show range
            if (start && end) {
                const rangeStartMs = start.getTime();
                const rangeEndExclusiveMs = addDays(end, 1).getTime();
                return kickoffTime >= rangeStartMs && kickoffTime < rangeEndExclusiveMs;
            }

            return true;
        });
    }, [matches, resolvedRange, hotFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    const rows = useMemo(() => {
        const visible = filteredMatches.slice(startIndex, endIndex);
        const grouped: Match[][] = [];
        for (let i = 0; i < visible.length; i += COLUMNS) {
            grouped.push(visible.slice(i, i + COLUMNS));
        }
        return grouped;
    }, [filteredMatches, startIndex, endIndex]);

    const from = filteredMatches.length === 0 ? 0 : startIndex + 1;
    const to = Math.min(endIndex, filteredMatches.length);
    const paginationItems = useMemo<PaginationItem[]>(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, idx) => idx + 1);
        }

        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, "dots-right", totalPages];
        }

        if (currentPage >= totalPages - 3) {
            return [1, "dots-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [1, "dots-left", currentPage - 1, currentPage, currentPage + 1, "dots-right", totalPages];
    }, [currentPage, totalPages]);

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)]">
            <div className="border-b border-border bg-surface/55 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        {t("common.showing", { from, to, total: filteredMatches.length })}
                    </p>
                    <div className="grid grid-cols-3 items-center gap-2">
                        {/* Preset date select */}
                        <select
                            value={presetKey}
                            onChange={(e) => handlePresetChange(e.target.value as PresetKey)}
                            className="h-9 w-full rounded-md border border-border bg-surface-dark px-2 text-xs text-foreground outline-none transition-colors focus:border-primary"
                            aria-label="Quick date filter"
                        >
                            <option value="">{t("matchPredictionTable.allDates")}</option>
                            <option value="today">{t("matchPredictionTable.today")}</option>
                            <option value="tomorrow">{t("matchPredictionTable.tomorrow")}</option>
                            <option value="7days">{t("matchPredictionTable.next7Days")}</option>
                            <option value="14days">{t("matchPredictionTable.next14Days")}</option>
                            <option value="1month">{t("matchPredictionTable.next1Month")}</option>
                        </select>

                        {/* Date range picker — compact */}
                        <DateRangePicker
                            startValue={calendarStart}
                            endValue={calendarEnd}
                            onChangeRange={handleRangeChange}
                            placeholder={t("matchPredictionTable.dateRange")}
                            className="w-full"
                        />

                        {/* Hot match filter */}
                        <select
                            value={hotFilter}
                            onChange={(e) => {
                                setHotFilter(e.target.value as HotFilter);
                                setPage(1);
                            }}
                            className="h-9 w-full rounded-md border border-border bg-surface-dark px-2 text-xs text-foreground outline-none transition-colors focus:border-primary"
                            aria-label="Filter hot matches"
                        >
                            <option value="all">{t("matchPredictionTable.allMatches")}</option>
                            <option value="hot">{t("matchPredictionTable.hotMatchOnly")}</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[1040px]">
                    {rows.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            {t("matchPredictionTable.noMatchesFound")}
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
                                                        {t("matchPredictionTable.empty")}
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
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
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
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                            aria-label="Next page"
                        >
                            {t("common.next")}
                        </button>

                        <div className="ml-1 text-[11px] font-semibold text-muted-foreground">
                            {t("common.page", { current: currentPage, total: totalPages })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
