import { useTranslation } from "react-i18next";
import { Clock, CheckCircle2, XCircle, MinusCircle, Trophy, Target } from "lucide-react";
import type { RecentPredictionItem, ScoreBetDetail } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────

function pickLabel(pick: string, t: (key: string) => string): string {
    if (pick === "home") return t("sport.picks.homeWin");
    if (pick === "away") return t("sport.picks.awayWin");
    if (pick === "draw") return t("sport.picks.draw");
    return pick;
}

function statusBadge(item: RecentPredictionItem, t: (key: string) => string) {
    if (item.status === "scored") {
        if (item.isCorrect) {
            return (
                <span className="inline-flex items-center gap-1 rounded border border-success/40 bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("sport.status.correct")}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                <XCircle className="h-3 w-3" />
                {t("sport.status.wrong")}
            </span>
        );
    }
    if (item.status === "locked") {
        return (
            <span className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                <MinusCircle className="h-3 w-3" />
                {t("sport.status.locked")}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Clock className="h-3 w-3" />
            {t("sport.status.pending")}
        </span>
    );
}

function scoreBetBadge(bet: ScoreBetDetail, t: (key: string) => string) {
    if (bet.status === "settled" || bet.isCorrect !== null) {
        if (bet.isCorrect) {
            return (
                <span className="inline-flex items-center gap-1 rounded border border-success/40 bg-success/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("sport.status.hit")}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                <XCircle className="h-3 w-3" />
                {t("sport.status.miss")}
            </span>
        );
    }
    if (bet.status === "locked") {
        return (
            <span className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                <MinusCircle className="h-3 w-3" />
                {t("sport.status.locked")}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Clock className="h-3 w-3" />
            {t("sport.status.pending")}
        </span>
    );
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return (
        d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
}

function formatMoney(amount: number): string {
    // if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} CO`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} CO`;
    return amount.toString();
}

// ─── Score Bets sub-section ───────────────────────────────────

function ScoreBetsSection({
    bets,
    finalScore,
    t,
}: {
    bets: ScoreBetDetail[];
    finalScore: { home: number | null; away: number | null };
    t: (key: string, options?: Record<string, any>) => string;
}) {
    if (bets.length === 0) return null;

    const correctCount = bets.filter((b) => b.isCorrect === true).length;
    const totalPayout = bets.reduce((sum, b) => sum + (b.payout || 0), 0);

    return (
        <div className="mt-3 rounded-md border border-border/60 bg-surface/40 px-3 py-2">
            <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Target className="h-3 w-3" />
                    {t("sport.scorePredictions", { count: bets.length })}
                </p>
                {bets.some((b) => b.isCorrect !== null) && (
                    <p className="text-[10px] font-bold text-muted-foreground">
                        <span className={correctCount > 0 ? "text-success" : "text-foreground/50"}>
                            {correctCount}/{bets.filter((b) => b.isCorrect !== null).length} {t("sport.status.correct").toLowerCase()}
                        </span>
                        {totalPayout > 0 && (
                            <span className="ml-2 text-secondary">
                                +{formatMoney(totalPayout)}
                            </span>
                        )}
                    </p>
                )}
            </div>
            <div className="space-y-1.5">
                {bets.map((bet) => (
                    <div key={bet.betId} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="rounded border border-border bg-surface-dark px-2 py-0.5 font-mono text-xs font-bold text-white">
                                {bet.predictedHomeScore} – {bet.predictedAwayScore}
                            </span>
                            {finalScore.home !== null && finalScore.away !== null && (
                                <span className="text-[10px] text-muted-foreground">
                                    {t("sport.vsFinal")}{" "}
                                    <span className="font-bold text-foreground/70">
                                        {finalScore.home}–{finalScore.away}
                                    </span>
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {bet.isCorrect === true && bet.payout > 0 && (
                                <span className="text-[10px] font-extrabold text-secondary">
                                    +{formatMoney(bet.payout)}
                                </span>
                            )}
                            {scoreBetBadge(bet, t)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────

interface RecentPredictionsSectionProps {
    predictions: RecentPredictionItem[];
    loading: boolean;
}

export function RecentPredictionsSection({ predictions, loading }: RecentPredictionsSectionProps) {
    const { t } = useTranslation();
    const total = predictions.length;
    const correct = predictions.filter((p) => p.isCorrect === true).length;
    const pending = predictions.filter(
        (p) => p.status === "submitted" || p.status === "locked"
    ).length;
    const accuracy =
        total > 0 ? Math.round((correct / Math.max(total - pending, 1)) * 100) : 0;

    // Score bet aggregate stats
    const allScoreBets = predictions.flatMap((p) => p.scoreBets ?? []);
    const settledBets = allScoreBets.filter((b) => b.isCorrect !== null);
    const correctBets = allScoreBets.filter((b) => b.isCorrect === true);
    const totalWinnings = allScoreBets.reduce((sum, b) => sum + (b.payout || 0), 0);

    // Group by tournament
    const grouped = predictions.reduce<Record<string, RecentPredictionItem[]>>((acc, p) => {
        const key = p.tournamentName || t("sport.unknownTournament");
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {});

    return (
        <>
            {/* Quick stats */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    { label: t("common.total"), value: total, color: "text-white" },
                    { label: t("sport.correctPicks"), value: correct, color: "text-success" },
                    { label: t("sport.status.pending"), value: pending, color: "text-primary" },
                    { label: t("sport.pickAccuracy"), value: `${accuracy}%`, color: "text-secondary" },
                ].map((card) => (
                    <div
                        key={card.label}
                        className="rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-primary/30"
                    >
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {card.label}
                        </p>
                        <p className={`mt-1 text-2xl font-extrabold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Score bet stats strip (only if player has any score bets) */}
            {allScoreBets.length > 0 && (
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        { label: t("sport.scoreBets"), value: allScoreBets.length, color: "text-white" },
                        {
                            label: t("sport.correctScores"),
                            value: correctBets.length,
                            color: "text-success",
                        },
                        {
                            label: t("sport.scoreAccuracy"),
                            value:
                                settledBets.length > 0
                                    ? `${Math.round((correctBets.length / settledBets.length) * 100)}%`
                                    : "—",
                            color: "text-secondary",
                        },
                        {
                            label: t("sport.totalWinnings"),
                            value: totalWinnings > 0 ? `+${formatMoney(totalWinnings)}` : "0",
                            color: totalWinnings > 0 ? "text-secondary" : "text-foreground/50",
                        },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-secondary/30"
                        >
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                {card.label}
                            </p>
                            <p className={`mt-1 text-2xl font-extrabold ${card.color}`}>
                                {card.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                    {t("sport.loadingRecentPredictions")}
                </div>
            ) : predictions.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Trophy className="h-10 w-10 text-border" />
                    <p className="text-sm">{t("sport.noPredictionsYet")}</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([tournamentName, items]) => (
                        <div key={tournamentName}>
                            {/* Tournament header */}
                            <div className="mb-3 flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-400" />
                                <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
                                    {tournamentName}
                                </h3>
                                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                    {items.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div
                                        key={item.predictionId}
                                        className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            {/* Match info */}
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                                                        {item.homeCrest
                                                            ? <img src={item.homeCrest} alt={item.homeTeam} className="h-4 w-4 object-contain" />
                                                            : item.homeFlag && (
                                                            <span
                                                                className={`fi fi-${item.homeFlag} rounded-sm`}
                                                            />
                                                        )}
                                                        {item.homeTeam ? item.homeTeam : t("common.tbd")}
                                                    </span>
                                                    {item.homeScore !== null &&
                                                    item.awayScore !== null ? (
                                                        <span className="rounded border border-border bg-surface-dark px-2 py-0.5 font-mono text-xs font-bold text-success">
                                                            {item.homeScore} – {item.awayScore}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-muted-foreground">
                                                         {t("common.vs")}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                                                        {item.awayCrest
                                                            ? <img src={item.awayCrest} alt={item.awayTeam} className="h-4 w-4 object-contain" />
                                                            : item.awayFlag && (
                                                            <span
                                                                className={`fi fi-${item.awayFlag} rounded-sm`}
                                                            />
                                                        )}
                                                        {item.awayTeam ? item.awayTeam : t("common.tbd")}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[10px] text-muted-foreground">
                                                    {t("sport.kickoffLabel")}: {formatDate(item.kickoff)}
                                                </p>

                                                {/* Score bets */}
                                                <ScoreBetsSection
                                                    bets={item.scoreBets ?? []}
                                                    finalScore={{
                                                        home: item.homeScore,
                                                        away: item.awayScore,
                                                    }}
                                                    t={t}
                                                />
                                            </div>

                                            {/* Prediction details */}
                                            <div className="flex items-center gap-4 sm:flex-shrink-0">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("sport.yourPick")}
                                                    </p>
                                                    <p className="text-sm font-bold text-primary">
                                                        {pickLabel(item.pick, t)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("sport.points")}
                                                    </p>
                                                    <p
                                                        className={`text-sm font-extrabold ${
                                                            item.pointsEarned > 0
                                                                ? "text-success"
                                                                : "text-foreground/60"
                                                        }`}
                                                    >
                                                        {item.pointsEarned > 0
                                                            ? `+${item.pointsEarned}`
                                                            : "0"}
                                                    </p>
                                                </div>
                                                <div>{statusBadge(item, t)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
