import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Match } from "@/types";

const PAGE_SIZE = 10;
type PaginationItem = number | "dots-left" | "dots-right";

interface CompletedMatchesTableProps {
    matches: Match[];
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

export function CompletedMatchesTable({ matches }: CompletedMatchesTableProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);

    function pickLabel(pick: string, home: string, away: string): string {
        if (pick === "home") return t("completedMatchesTable.homeWin", { team: home });
        if (pick === "away") return t("completedMatchesTable.awayWin", { team: away });
        if (pick === "draw") return t("common.draw");
        return pick || "—";
    }

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

    const pagedMatches = useMemo(
        () => matches.slice(startIndex, endIndex),
        [matches, startIndex, endIndex]
    );

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

    if (matches.length === 0) {
        return (
            <p className="py-10 text-center text-sm text-muted-foreground">
                {t("completedMatchesTable.noCompleted")}
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-surface/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="px-4 py-2.5 text-left font-bold">{t("completedMatchesTable.match")}</th>
                            <th className="w-[120px] px-4 py-2.5 text-center font-bold">{t("completedMatchesTable.score")}</th>
                            <th className="w-[180px] px-4 py-2.5 text-center font-bold">{t("completedMatchesTable.yourPick")}</th>
                            <th className="w-[180px] px-4 py-2.5 text-right font-bold">{t("completedMatchesTable.date")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {pagedMatches.map((match) => {
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
                                    {/* Match teams */}
                                    <td className="px-4 py-3">
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                                            <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-white">
                                                {match.home.crest
                                                    ? <img src={match.home.crest} alt={match.home.name} className="h-4 w-4 object-contain" />
                                                    : <span className={`fi fi-${match.home.flag} rounded-sm`} />}
                                                <span className="min-w-0 break-words">{match.home.name}</span>
                                            </span>
                                            <span className="text-[10px] font-black text-muted-foreground">{t("common.vs")}</span>
                                            <span className="flex min-w-0 items-center justify-end gap-1 text-right text-sm font-bold text-white">
                                                {match.away.crest
                                                    ? <img src={match.away.crest} alt={match.away.name} className="h-4 w-4 object-contain" />
                                                    : <span className={`fi fi-${match.away.flag} rounded-sm`} />}
                                                <span className="min-w-0 break-words">{match.away.name}</span>
                                            </span>
                                        </div>
                                        {match.stage && (
                                            <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                                                {match.stage}
                                            </span>
                                        )}
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
                            {t("common.showing", { from, to, total: matches.length })}
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={page === 1}
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
                                            onClick={() => setPage(item)}
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
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages}
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
        </div>
    );
}
