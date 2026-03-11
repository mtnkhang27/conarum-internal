import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MatchCard } from "@/components/MatchCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Match } from "@/types";
import { ChevronDown } from "lucide-react";

const COLUMNS = 3;
const ROWS_PER_PAGE = 3;
const PAGE_SIZE = COLUMNS * ROWS_PER_PAGE;
type PaginationItem = number | "dots-left" | "dots-right";
type DateFilter = "range" | "today" | "tomorrow";
type HotFilter = "all" | "hot";

const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value?: string) => {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatDateLabel = (value?: string) => {
    const parsed = parseDateInputValue(value);
    return parsed ? parsed.toLocaleDateString() : "";
};

const addDays = (date: Date, amount: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
};

interface MatchPredictionTableProps {
    matches: Match[];
    onPredictionChange?: () => void;
}

export function MatchPredictionTable({ matches, onPredictionChange }: MatchPredictionTableProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [dateFilter, setDateFilter] = useState<DateFilter>("range");
    const [rangeStart, setRangeStart] = useState(() => toDateInputValue(new Date()));
    const [rangeEnd, setRangeEnd] = useState(() => toDateInputValue(addDays(new Date(), 1)));
    const [hotFilter, setHotFilter] = useState<HotFilter>("all");

    const dateFilterLabel = useMemo(() => {
        if (dateFilter === "today") return t("matchPredictionTable.today");
        if (dateFilter === "tomorrow") return t("matchPredictionTable.tomorrow");
        const startLabel = formatDateLabel(rangeStart);
        const endLabel = formatDateLabel(rangeEnd);
        if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
        if (startLabel) return startLabel;
        return t("matchPredictionTable.dateRange");
    }, [dateFilter, rangeStart, rangeEnd, t]);

    const filteredMatches = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = addDays(today, 1);
        const rangeStartDate = parseDateInputValue(rangeStart) ?? today;
        let rangeEndDate = parseDateInputValue(rangeEnd) ?? tomorrow;
        if (rangeEndDate.getTime() < rangeStartDate.getTime()) {
            rangeEndDate = rangeStartDate;
        }
        const rangeStartMs = rangeStartDate.getTime();
        const rangeEndMs = rangeEndDate.getTime();

        const getDayStart = (iso?: string) => {
            if (!iso) return null;
            const kickoff = new Date(iso);
            if (Number.isNaN(kickoff.getTime())) return null;
            kickoff.setHours(0, 0, 0, 0);
            return kickoff;
        };

        return matches.filter((match) => {
            if (match.bettingLocked) return false;

            if (hotFilter === "hot" && !match.isHotMatch) return false;

            const kickoffDay = getDayStart(match.kickoffIso);
            if (!kickoffDay) return false;

            if (dateFilter === "today") return kickoffDay.getTime() === today.getTime();
            if (dateFilter === "tomorrow") return kickoffDay.getTime() === tomorrow.getTime();
            const kickoffTime = kickoffDay.getTime();
            return kickoffTime >= rangeStartMs && kickoffTime <= rangeEndMs;
        });
    }, [matches, dateFilter, hotFilter, rangeStart, rangeEnd]);

    const firstFilteredMatchId = filteredMatches[0]?.id ?? "";
    const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));

    useEffect(() => {
        setPage(1);
    }, [matches.length, firstFilteredMatchId, dateFilter, hotFilter, rangeStart, rangeEnd]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const startIndex = (page - 1) * PAGE_SIZE;
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
                        {t("common.showing", { from, to, total: filteredMatches.length })}
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex h-9 min-w-[200px] items-center justify-between gap-2 rounded-md border border-border bg-surface-dark px-3 text-xs text-foreground outline-none transition-colors hover:border-primary focus-visible:border-primary"
                                    aria-label="Filter by date"
                                >
                                    <span className="truncate">{dateFilterLabel}</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[300px] p-2">
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setDateFilter("today")}
                                            className={`h-8 rounded-md border px-2 text-xs font-semibold transition-colors ${
                                                dateFilter === "today"
                                                    ? "border-primary bg-primary/15 text-primary"
                                                    : "border-border bg-surface-dark text-foreground/80 hover:border-primary hover:text-primary"
                                            }`}
                                        >
                                            {t("matchPredictionTable.today")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDateFilter("tomorrow")}
                                            className={`h-8 rounded-md border px-2 text-xs font-semibold transition-colors ${
                                                dateFilter === "tomorrow"
                                                    ? "border-primary bg-primary/15 text-primary"
                                                    : "border-border bg-surface-dark text-foreground/80 hover:border-primary hover:text-primary"
                                            }`}
                                        >
                                            {t("matchPredictionTable.tomorrow")}
                                        </button>
                                    </div>
                                    <div className="text-[11px] font-semibold text-muted-foreground">
                                        {t("matchPredictionTable.dateRange")}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="date"
                                            value={rangeStart}
                                            onChange={(e) => {
                                                setDateFilter("range");
                                                setRangeStart(e.target.value);
                                            }}
                                            className="h-9 flex-1 text-xs [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                                            aria-label="Filter start date"
                                        />
                                        <span className="text-xs text-muted-foreground">-</span>
                                        <Input
                                            type="date"
                                            value={rangeEnd}
                                            onChange={(e) => {
                                                setDateFilter("range");
                                                setRangeEnd(e.target.value);
                                            }}
                                            className="h-9 flex-1 text-xs [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                                            aria-label="Filter end date"
                                        />
                                    </div>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <select
                            value={hotFilter}
                            onChange={(e) => setHotFilter(e.target.value as HotFilter)}
                            className="h-9 min-w-[150px] rounded-md border border-border bg-surface-dark px-3 text-xs text-foreground outline-none transition-colors focus:border-primary"
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
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page === 1}
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
                            {t("common.next")}
                        </button>

                        <div className="ml-1 text-[11px] font-semibold text-muted-foreground">
                            {t("common.page", { current: page, total: totalPages })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
