import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TournamentSelector } from "@/components/shared/TournamentSelector";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { playerMatchesApi } from "@/services/playerApi";
import { MatchCard } from "./MatchCard";
import type { Match } from "@/types";
import {
    addDaysToDateKey,
    getLocalDayRangeIso,
    getLocalTodayDateKey,
} from "@/utils/localTime";
import { SECTION } from "../sectionNavigation";

type PaginationItem = number | "dots-left" | "dots-right";
type HotFilter = "all" | "hot";
type PresetKey = "" | "today" | "tomorrow" | "7days" | "14days" | "1month";

const getGridLayout = (width: number, height: number) => {
    if (width < 768) {
        return { columns: 1, rows: height < 760 ? 3 : 4 };
    }

    if (width < 1440) {
        return { columns: 2, rows: height < 860 ? 2 : 3 };
    }

    return { columns: 3, rows: height < 900 ? 2 : 3 };
};

const INTRO_CARD_TARGET = 6;
const INTRO_SCROLL_DELAY_MS = 600;
const MIN_INTRO_SCROLL_DURATION_MS = 1000;
const MAX_INTRO_SCROLL_DURATION_MS = 2200;

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Quintic ease-in-out — feels like a real user scroll:
 * slow start, accelerates through the middle, then gently decelerates to a stop.
 */
const easeInOutQuint = (t: number) => {
    if (t < 0.5) {
        return 16 * t * t * t * t * t;
    }
    return 1 - Math.pow(-2 * t + 2, 5) / 2;
};

const getIntroScrollDuration = (distance: number) => {
    // Longer distances get proportionally longer durations for a natural feel
    return clamp(900 + distance * 0.7, MIN_INTRO_SCROLL_DURATION_MS, MAX_INTRO_SCROLL_DURATION_MS);
};

interface MatchPredictionTableProps {
    tournamentId: string;
    tournamentReady: boolean;
    onTournamentSelect: (id: string) => void;
    onPredictionChange?: () => void | Promise<void>;
    bannerDismissed?: boolean;
    tournamentActions?: ReactNode;
}

export function MatchPredictionTable({
    tournamentId,
    tournamentReady,
    onTournamentSelect,
    onPredictionChange,
    bannerDismissed,
    tournamentActions,
}: MatchPredictionTableProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [matches, setMatches] = useState<Match[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const requestSequence = useRef(0);
    const matchGridRef = useRef<HTMLDivElement | null>(null);
    const introAnimationFrameRef = useRef<number | null>(null);
    const introScrollTimeoutRef = useRef<number | null>(null);
    const introScrollAnimationFrameRef = useRef<number | null>(null);
    const introScrollCleanupRef = useRef<(() => void) | null>(null);
    const hasPlayedIntroRef = useRef(false);
    const [introActive, setIntroActive] = useState(false);
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

    useEffect(() => {
        hasPlayedIntroRef.current = false;

        if (typeof window === "undefined") {
            setIntroActive(true);
            return;
        }

        const activeHash = window.location.hash.replace("#", "");
        const shouldPrimeIntro = !activeHash || activeHash === SECTION.matches;
        setIntroActive(!shouldPrimeIntro);
    }, [tournamentId]);

    const stopIntroScrollAnimation = useCallback(() => {
        if (introScrollAnimationFrameRef.current !== null) {
            cancelAnimationFrame(introScrollAnimationFrameRef.current);
            introScrollAnimationFrameRef.current = null;
        }

        if (introScrollCleanupRef.current) {
            introScrollCleanupRef.current();
            introScrollCleanupRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopIntroScrollAnimation();
        };
    }, [stopIntroScrollAnimation]);

    const resolvedRange = useMemo<{ startKey: string; endKey: string }>(() => {
        if (presetKey) {
            const todayKey = getLocalTodayDateKey();
            switch (presetKey) {
                case "today":
                    return { startKey: todayKey, endKey: todayKey };
                case "tomorrow":
                    return {
                        startKey: addDaysToDateKey(todayKey, 1),
                        endKey: addDaysToDateKey(todayKey, 1),
                    };
                case "7days":
                    return { startKey: todayKey, endKey: addDaysToDateKey(todayKey, 6) };
                case "14days":
                    return { startKey: todayKey, endKey: addDaysToDateKey(todayKey, 13) };
                case "1month":
                    return { startKey: todayKey, endKey: addDaysToDateKey(todayKey, 29) };
            }
        }

        return {
            startKey: appliedCalendarStart,
            endKey: appliedCalendarEnd || appliedCalendarStart,
        };
    }, [presetKey, appliedCalendarStart, appliedCalendarEnd]);

    const pageSize = gridLayout.columns * gridLayout.rows;

    const queryFilters = useMemo(() => {
        const hotOnly = hotFilter === "hot";
        const { startKey, endKey } = resolvedRange;

        if (!startKey) {
            return {
                hotOnly,
                kickoffStartIso: undefined,
                kickoffEndIso: undefined,
            };
        }

        const { startIso } = getLocalDayRangeIso(startKey);
        const { endExclusiveIso } = getLocalDayRangeIso(endKey || startKey);

        return {
            hotOnly,
            kickoffStartIso: startIso || undefined,
            kickoffEndIso: endExclusiveIso || undefined,
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
        if (!tournamentReady) return;
        setPage(1);
        void loadPage(1, pageSize);
    }, [tournamentId, tournamentReady, pageSize, queryFilters, loadPage]);

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

    const effectiveTotalCount =
        !loading && page === 1 && matches.length < pageSize
            ? matches.length
            : totalCount;

    const totalPages = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));
    const currentPage = Math.min(page, totalPages);

    const handlePageChange = useCallback(
        (nextPage: number) => {
            const safePage = Math.min(totalPages, Math.max(1, nextPage));
            setPage(safePage);
            void loadPage(safePage, pageSize);
        },
        [loadPage, pageSize, totalPages],
    );

    const placeholderCount =
        matches.length === 0
            ? 0
            : (gridLayout.columns - (matches.length % gridLayout.columns)) % gridLayout.columns;

    const from = effectiveTotalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, effectiveTotalCount);
    const showContentLoadingOverlay = loading && matches.length > 0;

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!tournamentReady || loading || matches.length === 0 || !bannerDismissed) return;
        if (currentPage !== 1 || hasPlayedIntroRef.current) {
            setIntroActive(true);
            return;
        }

        const activeHash = window.location.hash.replace("#", "");
        if (activeHash && activeHash !== SECTION.matches) {
            setIntroActive(true);
            return;
        }

        const grid = matchGridRef.current;
        if (!grid) return;

        const cards = Array.from(
            grid.querySelectorAll<HTMLElement>("[data-match-card-shell='true']")
        );
        if (cards.length === 0) return;

        // Find the actual scroll container (.app-scroll-area in AppShell)
        const scrollContainer = document.querySelector<HTMLElement>(".app-scroll-area");
        if (!scrollContainer) return;

        hasPlayedIntroRef.current = true;
        setIntroActive(false);

        if (introAnimationFrameRef.current !== null) {
            cancelAnimationFrame(introAnimationFrameRef.current);
        }
        if (introScrollTimeoutRef.current !== null) {
            window.clearTimeout(introScrollTimeoutRef.current);
        }
        stopIntroScrollAnimation();

        // Trigger the card fade-in animation
        introAnimationFrameRef.current = window.requestAnimationFrame(() => {
            setIntroActive(true);
            introAnimationFrameRef.current = null;
        });

        // After a brief delay (let cards start appearing), scroll down
        introScrollTimeoutRef.current = window.setTimeout(() => {
            const stickyHeader = document.querySelector<HTMLElement>("[data-sport-sticky-header='true']");
            const stickyHeight = stickyHeader?.offsetHeight ?? 0;

            // Get positions relative to the scroll container
            const containerRect = scrollContainer.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();

            // How far the grid top is from the container's visible top
            const gridTopRelativeToContainer = gridRect.top - containerRect.top;

            // We want the grid top to sit right below the sticky header
            const desiredGridTop = stickyHeight + 6;
            const scrollOffset = gridTopRelativeToContainer - desiredGridTop;
            const targetTop = Math.max(0, scrollContainer.scrollTop + scrollOffset);
            const startTop = scrollContainer.scrollTop;
            const distance = targetTop - startTop;

            if (Math.abs(distance) < 6) {
                scrollContainer.scrollTop = targetTop;
                introScrollTimeoutRef.current = null;
                return;
            }

            const duration = getIntroScrollDuration(Math.abs(distance));
            const startTime = performance.now();
            const interruptScroll = () => {
                stopIntroScrollAnimation();
            };

            // Listen on the scroll container itself, plus global touch/key events
            const containerEvents: Array<keyof HTMLElementEventMap> = ["wheel", "touchstart", "mousedown"];
            const windowEvents: Array<keyof WindowEventMap> = ["keydown"];

            for (const eventName of containerEvents) {
                scrollContainer.addEventListener(eventName, interruptScroll, { passive: true });
            }
            for (const eventName of windowEvents) {
                window.addEventListener(eventName, interruptScroll, { passive: true });
            }

            introScrollCleanupRef.current = () => {
                for (const eventName of containerEvents) {
                    scrollContainer.removeEventListener(eventName, interruptScroll);
                }
                for (const eventName of windowEvents) {
                    window.removeEventListener(eventName, interruptScroll);
                }
            };

            const step = (timestamp: number) => {
                const progress = clamp((timestamp - startTime) / duration, 0, 1);
                const easedProgress = easeInOutQuint(progress);
                scrollContainer.scrollTop = startTop + distance * easedProgress;

                if (progress < 1) {
                    introScrollAnimationFrameRef.current = window.requestAnimationFrame(step);
                    return;
                }

                scrollContainer.scrollTop = targetTop;
                stopIntroScrollAnimation();
            };

            introScrollAnimationFrameRef.current = window.requestAnimationFrame(step);

            introScrollTimeoutRef.current = null;
        }, INTRO_SCROLL_DELAY_MS);

        return () => {
            if (introAnimationFrameRef.current !== null) {
                cancelAnimationFrame(introAnimationFrameRef.current);
                introAnimationFrameRef.current = null;
            }
            if (introScrollTimeoutRef.current !== null) {
                window.clearTimeout(introScrollTimeoutRef.current);
                introScrollTimeoutRef.current = null;
            }
            stopIntroScrollAnimation();
        };
    }, [bannerDismissed, currentPage, loading, matches, stopIntroScrollAnimation, tournamentReady]);

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
        <div className="flex w-full flex-col gap-2">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:items-center">
                <div className="min-w-0 w-full">
                    <TournamentSelector
                        selectedId={tournamentId}
                        onSelect={onTournamentSelect}
                        allowAll
                        preferDefault
                    />
                </div>
                {tournamentActions ? (
                    <div className="flex w-full justify-end sm:w-auto sm:justify-self-end">
                        {tournamentActions}
                    </div>
                ) : null}
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
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

            {tournamentReady && (
                <p className="w-full text-xs text-muted-foreground sm:text-right">
                    {t("common.showing", { from, to, total: effectiveTotalCount })}
                </p>
            )}
        </div>
    );

    if (!tournamentReady) {
        return (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)]">
                <div className="border-b border-border bg-surface/55 px-4 py-3">
                    {filterControls}
                </div>

                <div className="px-4 py-8">
                    <LoadingOverlay />
                </div>
            </div>
        );
    }

    if (loading && matches.length === 0) {
        return (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)]">
                <div className="border-b border-border bg-surface/55 px-4 py-3">
                    {filterControls}
                </div>

                <div className="px-4 py-8">
                    <LoadingOverlay />
                </div>
            </div>
        );
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
                {filterControls}
            </div>

            <div className="relative">
                <div
                    ref={matchGridRef}
                    className="grid gap-px bg-border/60"
                    style={{ gridTemplateColumns: `repeat(${gridLayout.columns}, minmax(0, 1fr))` }}
                >
                    {matches.map((match, index) => (
                        <div
                            key={match.id}
                            data-match-card-shell="true"
                            className={`h-full bg-card p-3 transition-[opacity,transform] duration-700 ease-out sm:p-4 ${
                                introActive
                                    ? "translate-y-0 opacity-100"
                                    : "translate-y-6 opacity-0"
                            }`}
                            style={{
                                transitionDelay: `${Math.min(index, INTRO_CARD_TARGET - 1) * 70}ms`,
                            }}
                        >
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
