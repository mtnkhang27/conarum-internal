import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { playerMatchesApi } from "@/services/playerApi";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import type { Match } from "@/types";

const PAGE_SIZE = 10;
type PaginationItem = number | "dots-left" | "dots-right";

interface CompletedMatchesTableProps {
    tournamentId: string;
}

function formatKickoffDisplay(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return (
        d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " · " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
}

export function CompletedMatchesTable({ tournamentId }: CompletedMatchesTableProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [matches, setMatches] = useState<Match[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    function pickLabel(pick: string, home: string, away: string): string {
        if (pick === "home") return t("completedMatchesTable.homeWin", { team: home });
        if (pick === "away") return t("completedMatchesTable.awayWin", { team: away });
        if (pick === "draw") return t("common.draw");
        return pick || "—";
    }

    const loadPage = useCallback(async (tid: string, pg: number) => {
        setLoading(true);
        try {
            const filterTid = tid || undefined;
            const { items, totalCount: count } = await playerMatchesApi.getCompletedPaged(
                filterTid,
                pg,
                PAGE_SIZE,
            );
            setMatches(items);
            setTotalCount(count);
        } catch {
            setMatches([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, []);

    // Reset to page 1 when tournament changes
    useEffect(() => {
        setPage(1);
        loadPage(tournamentId, 1);
    }, [tournamentId, loadPage]);

    // Fetch data when page changes (but not on tournament change — handled above)
    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
        loadPage(tournamentId, newPage);
    }, [tournamentId, loadPage]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, totalCount);

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

    if (loading && matches.length === 0) {
        return <LoadingOverlay />;
    }

    if (!loading && matches.length === 0) {
        return (
            <p className="py-10 text-center text-sm text-muted-foreground">
                {t("completedMatchesTable.noCompleted")}
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-surface/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="px-4 py-2.5 text-right font-bold">{t("common.home")}</th>
                            <th className="w-[56px] px-2 py-2.5 text-center font-bold"></th>
                            <th className="px-4 py-2.5 text-left font-bold">{t("common.away")}</th>
                            <th className="w-[120px] px-4 py-2.5 text-center font-bold">{t("completedMatchesTable.score")}</th>
                            <th className="w-[180px] px-4 py-2.5 text-center font-bold">{t("completedMatchesTable.yourPick")}</th>
                            <th className="w-[180px] px-4 py-2.5 text-right font-bold">{t("completedMatchesTable.date")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {matches.map((match) => {
                            const hasScore = match.finalScore !== undefined;
                            const hasPick = !!match.selectedOption;

                            // Determine correctness visual: we know outcome only if there's a score
                            let outcome: "home" | "draw" | "away" | null = null;
                            if (hasScore) {
                                const { home, away } = match.finalScore!;
                                if (home > away) outcome = "home";
                                else if (away > home) outcome = "away";
                                else outcome = "draw";
                            }
                            const isCorrect = hasPick && outcome !== null && match.selectedOption === outcome;
                            const isWrong = hasPick && outcome !== null && match.selectedOption !== outcome;

                            return (
                                <tr
                                    key={match.id}
                                    className="transition-colors hover:bg-surface"
                                >
                                    {/* Home team */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1.5 text-sm font-bold text-white">
                                            <span className="max-w-[240px] truncate">{match.home.name}</span>
                                            {match.home.crest
                                                ? <img src={match.home.crest} alt={match.home.name} className="h-4 w-4 flex-shrink-0 object-contain" />
                                                : <span className={`fi fi-${match.home.flag} flex-shrink-0 rounded-sm`} />}
                                        </div>
                                    </td>

                                    {/* vs + stage */}
                                    <td className="px-2 py-3 text-center">
                                        <div className="text-[10px] font-black text-muted-foreground">
                                            {t("common.vs").toLowerCase()}
                                        </div>
                                        <div className="mt-0.5 h-3 text-[9px] uppercase tracking-wide text-muted-foreground">
                                            {match.stage || ""}
                                        </div>
                                    </td>

                                    {/* Away team */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                                            {match.away.crest
                                                ? <img src={match.away.crest} alt={match.away.name} className="h-4 w-4 flex-shrink-0 object-contain" />
                                                : <span className={`fi fi-${match.away.flag} flex-shrink-0 rounded-sm`} />}
                                            <span className="max-w-[240px] truncate">{match.away.name}</span>
                                        </div>
                                    </td>

                                    {/* Final score */}
                                    <td className="px-4 py-3 text-center">
                                        {hasScore ? (
                                            <span className="inline-block rounded border border-border bg-surface-dark px-2.5 py-1 font-mono text-sm font-bold text-success">
                                                {match.finalScore!.home} – {match.finalScore!.away}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </td>

                                    {/* User pick */}
                                    <td className="px-4 py-3 text-center">
                                        {hasPick ? (
                                            <span
                                                className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold
                                                    ${isCorrect ? "border border-success/40 bg-success/15 text-success" :
                                                      isWrong ? "border border-destructive/40 bg-destructive/15 text-destructive" :
                                                      "border border-border bg-surface text-foreground/70"}`}
                                            >
                                                {pickLabel(match.selectedOption, match.home.name, match.away.name)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">{t("completedMatchesTable.noPick")}</span>
                                        )}
                                    </td>

                                    {/* Date */}
                                    <td className="px-4 py-3 text-right text-[10px] text-muted-foreground">
                                        {formatKickoffDisplay(match.kickoffIso)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="border-t border-border bg-surface/35 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                            {t("common.showing", { from, to, total: totalCount })}
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => handlePageChange(Math.max(1, page - 1))}
                                disabled={page === 1 || loading}
                                className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                                aria-label="Previous completed page"
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
                                            onClick={() => handlePageChange(item)}
                                            disabled={loading}
                                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-2 text-xs font-semibold transition-colors ${
                                                isActive
                                                    ? "bg-primary text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
                                                    : "text-foreground/80 hover:bg-surface hover:text-primary"
                                            }`}
                                            aria-label={`Go to completed page ${item}`}
                                            aria-current={isActive ? "page" : undefined}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages || loading}
                                className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                                aria-label="Next completed page"
                            >
                                {t("common.next")}
                            </button>

                            <div className="ml-1 text-[11px] font-semibold text-muted-foreground">
                                {t("common.page", { current: page, total: totalPages })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline loading indicator for page transitions */}
            {loading && matches.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}
        </div>
    );
}
