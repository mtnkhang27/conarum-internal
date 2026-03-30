import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    CheckCircle2,
    Clock3,
    Crown,
    MinusCircle,
    RotateCcw,
    Search,
    Target,
    Trophy,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { useAccountPredictionsTabState } from "@/pages/account/hooks/useAccountPredictionsTabState";
import type {
    AccountPredictionFeedItem,
    AccountPredictionStatusFilter,
    AccountPredictionTypeFilter,
    AccountScoreBetPick,
} from "@/types";
import { formatLocalDateTime } from "@/utils/localTime";

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function pickLabel(pick: string, t: (key: string) => string) {
    if (pick === "home") return t("sport.picks.homeWin");
    if (pick === "away") return t("sport.picks.awayWin");
    if (pick === "draw") return t("sport.picks.draw");
    return pick;
}

function formatMaybeDate(value?: string | null) {
    if (!value) return "";
    return formatLocalDateTime(value, {
        locale: "en-US",
        dateOptions: { month: "short", day: "numeric", year: "numeric" },
        timeOptions: { hour: "numeric", minute: "2-digit", hour12: false },
    });
}

/* ═══════════════════════════════════════
   Unified Status Badge
   ═══════════════════════════════════════ */

type BadgeVariant = "correct" | "wrong" | "locked" | "pending";

function resolveBadgeVariant(isCorrect: boolean | null, status: string): BadgeVariant {
    if (isCorrect === true) return "correct";
    if (isCorrect === false) return "wrong";
    if (status === "locked") return "locked";
    return "pending";
}

const BADGE_CONFIG: Record<BadgeVariant, { style: string; icon: React.ReactNode }> = {
    correct: {
        style: "border-success/40 bg-success/15 text-success",
        icon: <CheckCircle2 className="h-3 w-3" />,
    },
    wrong: {
        style: "border-destructive/40 bg-destructive/15 text-destructive",
        icon: <XCircle className="h-3 w-3" />,
    },
    locked: {
        style: "border-warning/40 bg-warning/15 text-warning",
        icon: <MinusCircle className="h-3 w-3" />,
    },
    pending: {
        style: "border-primary/40 bg-primary/15 text-primary",
        icon: <Clock3 className="h-3 w-3" />,
    },
};

function StatusBadge({
    isCorrect,
    status,
    label,
}: {
    isCorrect: boolean | null;
    status: string;
    label: string;
}) {
    const variant = resolveBadgeVariant(isCorrect, status);
    const cfg = BADGE_CONFIG[variant];
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.style}`}
        >
            {cfg.icon}
            {label}
        </span>
    );
}

function getBadgeLabel(
    isCorrect: boolean | null,
    status: string,
    isScoreBet: boolean,
    t: (key: string) => string,
) {
    if (isCorrect === true) return isScoreBet ? t("sport.status.hit") : t("sport.status.correct");
    if (isCorrect === false) return isScoreBet ? t("sport.status.miss") : t("sport.status.wrong");
    if (status === "locked") return t("sport.status.locked");
    return t("sport.status.pending");
}

/* ═══════════════════════════════════════
   Score Bet Inline Chip
   ═══════════════════════════════════════ */

function ScoreBetChip({
    bet,
    t,
}: {
    bet: AccountScoreBetPick;
    t: (key: string) => string;
}) {
    const variant = resolveBadgeVariant(bet.isCorrect, bet.status);
    const dotColor: Record<BadgeVariant, string> = {
        correct: "bg-success",
        wrong: "bg-destructive",
        locked: "bg-warning",
        pending: "bg-primary",
    };

    return (
        <div className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-surface/30 px-2.5 py-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor[variant]}`} />
            <span className="font-mono text-xs font-bold text-white">
                {bet.predictedHomeScore} – {bet.predictedAwayScore}
            </span>
            <StatusBadge
                isCorrect={bet.isCorrect}
                status={bet.status}
                label={getBadgeLabel(bet.isCorrect, bet.status, true, t)}
            />
        </div>
    );
}

/* ═══════════════════════════════════════
   Prediction Card — Clean & Full-info
   ═══════════════════════════════════════ */

function PredictionCard({
    item,
    t,
}: {
    item: AccountPredictionFeedItem;
    t: (key: string, options?: Record<string, unknown>) => string;
}) {
    const kickoffText = item.kickoff ? formatMaybeDate(item.kickoff) : t("common.tbd");
    const winnerTitle =
        item.scope === "slot"
            ? t("account.predictions.slotWinner")
            : t("account.predictions.matchWinner");

    /* Left accent color based on overall winner status */
    const accentVariant = item.winnerPick
        ? resolveBadgeVariant(item.winnerPick.isCorrect, item.winnerPick.status)
        : "pending";
    const accentColor: Record<BadgeVariant, string> = {
        correct: "from-success/80 to-success/20",
        wrong: "from-destructive/80 to-destructive/20",
        locked: "from-warning/80 to-warning/20",
        pending: "from-primary/60 to-primary/15",
    };

    return (
        <article className="relative overflow-hidden rounded-xl border border-border/60 bg-card/90 transition-colors hover:border-primary/30">
            {/* Left gradient accent */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accentColor[accentVariant]}`}
            />

            <div className="py-3.5 pl-4 pr-4">
                {/* ── Header: Match info ── */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Teams + score */}
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Home */}
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                            {item.homeCrest ? (
                                <img
                                    src={item.homeCrest}
                                    alt={item.homeTeam || t("common.tbd")}
                                    className="h-5 w-5 flex-shrink-0 object-contain"
                                />
                            ) : null}
                            <span className="text-sm font-semibold text-white truncate">
                                {item.homeTeam || t("common.tbd")}
                            </span>
                        </span>

                        {/* Score or VS */}
                        {item.homeScore !== null && item.awayScore !== null ? (
                            <span className="flex-shrink-0 rounded-md border border-success/25 bg-success/10 px-2 py-0.5 font-mono text-xs font-bold text-success">
                                {item.homeScore} – {item.awayScore}
                            </span>
                        ) : (
                            <span className="flex-shrink-0 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                {t("common.vs")}
                            </span>
                        )}

                        {/* Away */}
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                            {item.awayCrest ? (
                                <img
                                    src={item.awayCrest}
                                    alt={item.awayTeam || t("common.tbd")}
                                    className="h-5 w-5 flex-shrink-0 object-contain"
                                />
                            ) : null}
                            <span className="text-sm font-semibold text-white truncate">
                                {item.awayTeam || t("common.tbd")}
                            </span>
                        </span>
                    </div>

                    {/* Meta: scope + stage + kickoff */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            {item.label}
                        </span>
                        {item.scope === "slot" ? (
                            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                {t("account.predictions.bracketSlot")}
                            </span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                            {kickoffText}
                        </span>
                    </div>
                </div>

                {/* ── Prediction details — all visible ── */}
                {(item.winnerPick || item.scoreBets.length > 0) ? (
                    <div className="mt-3 flex flex-col gap-2">
                        {/* Winner Pick Row */}
                        {item.winnerPick ? (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-surface/20 px-3 py-2">
                                {/* Label + Pick */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {winnerTitle}
                                    </span>
                                    <span className="text-sm font-bold text-primary">
                                        {pickLabel(item.winnerPick.pick, t)}
                                    </span>
                                </div>

                                {/* Points */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {t("sport.points")}
                                    </span>
                                    <span
                                        className={`text-sm font-extrabold ${
                                            item.winnerPick.pointsEarned > 0
                                                ? "text-success"
                                                : "text-foreground/60"
                                        }`}
                                    >
                                        {item.winnerPick.pointsEarned > 0
                                            ? `+${item.winnerPick.pointsEarned}`
                                            : item.winnerPick.pointsEarned}
                                    </span>
                                </div>

                                {/* Status badge */}
                                <StatusBadge
                                    isCorrect={item.winnerPick.isCorrect}
                                    status={item.winnerPick.status}
                                    label={getBadgeLabel(
                                        item.winnerPick.isCorrect,
                                        item.winnerPick.status,
                                        false,
                                        t,
                                    )}
                                />

                                {/* Submitted date (right-aligned on desktop) */}
                                {item.winnerPick.submittedAt ? (
                                    <span className="ml-auto text-[11px] text-muted-foreground">
                                        {t("account.predictions.submitted")}:{" "}
                                        {formatMaybeDate(item.winnerPick.submittedAt)}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Score Bets Row */}
                        {item.scoreBets.length > 0 ? (
                            <div className="rounded-lg bg-surface/15 px-3 py-2">
                                <div className="mb-1.5 flex items-center gap-2">
                                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {t("sport.scoreBets")}
                                    </span>
                                    <span className="rounded-full border border-border bg-surface-dark px-1.5 py-0.5 text-[10px] font-bold text-white">
                                        {item.scoreBets.length}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {item.scoreBets.map((bet) => (
                                        <ScoreBetChip key={bet.id} bet={bet} t={t} />
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {/* Latest activity footer */}
                {item.latestSubmittedAt ? (
                    <p className="mt-2 text-[10px] text-muted-foreground/70">
                        {t("account.predictions.latestActivity")}:{" "}
                        {formatMaybeDate(item.latestSubmittedAt)}
                    </p>
                ) : null}
            </div>
        </article>
    );
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */

export function AccountPredictionsTab() {
    const { t } = useTranslation();
    const {
        loading,
        tournaments,
        selectedTournamentId,
        setSelectedTournamentId,
        typeFilter,
        setTypeFilter,
        statusFilter,
        setStatusFilter,
        searchQuery,
        setSearchQuery,
        filteredCount,
        currentPage,
        totalPages,
        paginationItems,
        groupedItems,
        handlePageChange,
        reload,
    } = useAccountPredictionsTabState();

    const tabs: { value: AccountPredictionTypeFilter; label: string; icon: React.ReactNode }[] = useMemo(
        () => [
            {
                value: "winner",
                label: t("account.predictions.filters.typeWinner"),
                icon: <Trophy className="h-4 w-4" />,
            },
            {
                value: "scoreBet",
                label: t("account.predictions.filters.typeScoreBet"),
                icon: <Target className="h-4 w-4" />,
            },
            {
                value: "slot",
                label: t("champion.title"),
                icon: <Crown className="h-4 w-4" />,
            },
        ],
        [t],
    );

    const statusOptions = useMemo<
        { value: AccountPredictionStatusFilter; label: string }[]
    >(
        () => [
            { value: "all", label: t("account.predictions.filters.statusAll") },
            { value: "pending", label: t("account.predictions.filters.statusPending") },
            { value: "resolved", label: t("account.predictions.filters.statusResolved") },
        ],
        [t],
    );

    return (
        <section className="space-y-4">
            {/* ══ Header ══ */}
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white">{t("nav.myPredictions")}</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-border bg-surface text-foreground hover:bg-surface-dark"
                    onClick={() => void reload()}
                >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("account.predictions.reload")}
                </Button>
            </div>

            {/* ══ 3-Tab Segmented Control ══ */}
            <div className="flex rounded-xl border border-border/60 bg-surface-dark/60 p-1">
                {tabs.map((tab) => {
                    const isActive = tab.value === typeFilter;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setTypeFilter(tab.value)}
                            className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                                isActive
                                    ? "bg-primary text-white shadow-[0_2px_12px_rgba(109,63,199,0.35)]"
                                    : "text-muted-foreground hover:bg-surface/50 hover:text-white"
                            }`}
                        >
                            <span className={isActive ? "text-white" : "text-muted-foreground"}>
                                {tab.icon}
                            </span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ══ Secondary filters: Search + Tournament + Status ══ */}
            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={t("account.predictions.filters.searchPlaceholder")}
                        className="border-border/50 bg-card/80 pl-9 text-white"
                    />
                </div>
                <select
                    value={selectedTournamentId}
                    onChange={(event) => setSelectedTournamentId(event.target.value)}
                    className="h-10 rounded-lg border border-border/50 bg-card/80 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary sm:w-52"
                >
                    {tournaments.map((tournament) => (
                        <option key={tournament.ID} value={tournament.ID}>
                            {tournament.name}
                        </option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as AccountPredictionStatusFilter)}
                    className="h-10 rounded-lg border border-border/50 bg-card/80 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary sm:w-40"
                >
                    {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* ══ Prediction list ══ */}
            <div>
                {loading ? (
                    <LoadingOverlay />
                ) : filteredCount === 0 ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-surface/20 px-6 text-center">
                        <Trophy className="h-10 w-10 text-border" />
                        <div>
                            <p className="text-sm font-semibold text-white">
                                {t("account.predictions.noResultsTitle")}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t("account.predictions.noResultsSubtitle")}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {Object.values(groupedItems)
                            .flat()
                            .map((item) => (
                                <PredictionCard key={item.id} item={item} t={t} />
                            ))}
                    </div>
                )}
            </div>

            {/* ══ Pagination ══ */}
            {filteredCount > 0 && totalPages > 1 ? (
                <div className="mt-5 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[11px] font-semibold text-muted-foreground">
                        {t("common.showing", {
                            from: (currentPage - 1) * 6 + 1,
                            to: Math.min(currentPage * 6, filteredCount),
                            total: filteredCount,
                        })}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
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
                                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-2 text-xs font-semibold transition-colors ${
                                            isActive
                                                ? "bg-primary text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
                                                : "text-foreground/80 hover:bg-surface hover:text-primary"
                                        }`}
                                    >
                                        {item}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {t("common.next")}
                        </button>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
