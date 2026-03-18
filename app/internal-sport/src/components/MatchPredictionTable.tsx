import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MatchCard } from "@/components/MatchCard";
import { DatePicker } from "@/components/ui/date-picker";
import type { Match } from "@/types";

const COLUMNS = 3;
const ROWS_PER_PAGE = 3;
const PAGE_SIZE = COLUMNS * ROWS_PER_PAGE;
type PaginationItem = number | "dots-left" | "dots-right";
type HotFilter = "all" | "hot";
type DatePreset = "today" | "tomorrow" | "7days" | "14days" | "1month";
type ActiveDateFilter = "preset" | "calendar";

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

/** Compute start/end dates from a preset relative to today */
const getPresetRange = (preset: DatePreset): { start: Date; end: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    switch (preset) {
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
};

interface MatchPredictionTableProps {
    matches: Match[];
    onPredictionChange?: () => void;
}

export function MatchPredictionTable({ matches, onPredictionChange }: MatchPredictionTableProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);

    // ── Date filter state ────────────────────────────────────
    const [activeFilter, setActiveFilter] = useState<ActiveDateFilter>("preset");
    const [datePreset, setDatePreset] = useState<DatePreset>("today");
    const [calendarStart, setCalendarStart] = useState("");
    const [calendarEnd, setCalendarEnd] = useState("");

    const [hotFilter, setHotFilter] = useState<HotFilter>("all");

    const parsedCalendarStart = useMemo(() => parseDateInputValue(calendarStart), [calendarStart]);
    const parsedCalendarEnd = useMemo(() => parseDateInputValue(calendarEnd), [calendarEnd]);

    // ── Handlers ─────────────────────────────────────────────

    const handlePresetChange = (value: DatePreset) => {
        setDatePreset(value);
        setActiveFilter("preset");
        // Clear calendar values when switching to preset
        setCalendarStart("");
        setCalendarEnd("");
        setPage(1);
    };

    const handleCalendarStartChange = (value: string) => {
        setCalendarStart(value);
        setActiveFilter("calendar");
        // Reset preset when switching to calendar
        const nextStart = parseDateInputValue(value);
        if (nextStart && parsedCalendarEnd && parsedCalendarEnd.getTime() < nextStart.getTime()) {
            setCalendarEnd(value);
        }
        setPage(1);
    };

    const handleCalendarEndChange = (value: string) => {
        setCalendarEnd(value);
        setActiveFilter("calendar");
        const nextEnd = parseDateInputValue(value);
        if (nextEnd && parsedCalendarStart && nextEnd.getTime() < parsedCalendarStart.getTime()) {
            setCalendarStart(value);
        }
        setPage(1);
    };

    // ── Filtered matches ─────────────────────────────────────

    const filteredMatches = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let rangeStart: Date;
        let rangeEnd: Date;

        if (activeFilter === "preset") {
            const preset = getPresetRange(datePreset);
            rangeStart = preset.start;
            rangeEnd = preset.end;
        } else {
            rangeStart = parsedCalendarStart || today;
            const endCandidate = parsedCalendarEnd || rangeStart;
            rangeEnd = endCandidate.getTime() < rangeStart.getTime() ? rangeStart : endCandidate;
        }

        const rangeStartMs = rangeStart.getTime();
        const rangeEndMsExclusive = addDays(rangeEnd, 1).getTime();

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

            const kickoffTime = kickoffDay.getTime();
            return kickoffTime >= rangeStartMs && kickoffTime < rangeEndMsExclusive;
        });
    }, [matches, activeFilter, datePreset, parsedCalendarStart, parsedCalendarEnd, hotFilter]);

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

    const presetSelectClasses = `h-9 min-w-[150px] rounded-md border px-3 text-xs outline-none transition-colors ${
        activeFilter === "preset"
            ? "border-primary bg-primary/10 text-primary font-semibold"
            : "border-border bg-surface-dark text-foreground focus:border-primary"
    }`;

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)]">
            <div className="border-b border-border bg-surface/55 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        {t("common.showing", { from, to, total: filteredMatches.length })}
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* 1. Preset select */}
                        <select
                            value={activeFilter === "preset" ? datePreset : ""}
                            onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
                            className={presetSelectClasses}
                            aria-label="Quick date filter"
                        >
                            {activeFilter !== "preset" && (
                                <option value="" disabled>
                                    {t("matchPredictionTable.quickSelect")}
                                </option>
                            )}
                            <option value="today">{t("matchPredictionTable.today")}</option>
                            <option value="tomorrow">{t("matchPredictionTable.tomorrow")}</option>
                            <option value="7days">{t("matchPredictionTable.next7Days")}</option>
                            <option value="14days">{t("matchPredictionTable.next14Days")}</option>
                            <option value="1month">{t("matchPredictionTable.next1Month")}</option>
                        </select>

                        {/* Separator */}
                        <span className="hidden text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
                            {t("matchPredictionTable.or")}
                        </span>

                        {/* 2. Calendar date range */}
                        <div className={`flex items-center gap-1.5 rounded-md border p-0.5 transition-colors ${
                            activeFilter === "calendar"
                                ? "border-primary/60 bg-primary/5"
                                : "border-transparent"
                        }`}>
                            <DatePicker
                                value={calendarStart}
                                onChange={handleCalendarStartChange}
                                maxDate={parsedCalendarEnd || undefined}
                                placeholder={t("matchPredictionTable.startDate")}
                                className="w-[150px]"
                            />
                            <span className="text-[10px] text-muted-foreground">→</span>
                            <DatePicker
                                value={calendarEnd}
                                onChange={handleCalendarEndChange}
                                minDate={parsedCalendarStart || undefined}
                                placeholder={t("matchPredictionTable.endDate")}
                                className="w-[150px]"
                            />
                        </div>

                        {/* Hot match filter (unchanged) */}
                        <select
                            value={hotFilter}
                            onChange={(e) => {
                                setHotFilter(e.target.value as HotFilter);
                                setPage(1);
                            }}
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
