import { useEffect, useState } from "react";
import { Clock, CheckCircle2, XCircle, MinusCircle, Trophy } from "lucide-react";
import { playerTournamentQueryApi } from "@/services/playerApi";
import type { RecentPredictionItem } from "@/types";

function pickLabel(pick: string): string {
    if (pick === "home") return "Home Win";
    if (pick === "away") return "Away Win";
    if (pick === "draw") return "Draw";
    return pick;
}

function statusBadge(item: RecentPredictionItem) {
    if (item.status === "scored") {
        if (item.isCorrect) {
            return (
                <span className="inline-flex items-center gap-1 rounded border border-success/40 bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Correct
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                <XCircle className="h-3 w-3" />
                Wrong
            </span>
        );
    }
    if (item.status === "locked") {
        return (
            <span className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                <MinusCircle className="h-3 w-3" />
                Locked
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Clock className="h-3 w-3" />
            Pending
        </span>
    );
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function RecentPredictionsPage() {
    const [predictions, setPredictions] = useState<RecentPredictionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        playerTournamentQueryApi.getMyRecentPredictions(30)
            .then((data) => setPredictions(Array.isArray(data) ? data : []))
            .catch(() => setPredictions([]))
            .finally(() => setLoading(false));
    }, []);

    // Stats
    const total = predictions.length;
    const correct = predictions.filter((p) => p.isCorrect === true).length;
    const pending = predictions.filter((p) => p.status === "submitted" || p.status === "locked").length;
    const accuracy = total > 0 ? Math.round((correct / Math.max(total - pending, 1)) * 100) : 0;

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="h-6 w-1 rounded-full bg-secondary" />
                    Recent Predictions
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Your latest match predictions across all tournaments.
                </p>
            </div>

            {/* Quick summary */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    { label: "Total", value: total, color: "text-white" },
                    { label: "Correct", value: correct, color: "text-success" },
                    { label: "Pending", value: pending, color: "text-primary" },
                    { label: "Accuracy", value: `${accuracy}%`, color: "text-secondary" },
                ].map((card) => (
                    <div key={card.label} className="rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-primary/30">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                        <p className={`mt-1 text-2xl font-extrabold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                    Loading recent predictions…
                </div>
            ) : predictions.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Trophy className="h-10 w-10 text-border" />
                    <p className="text-sm">No predictions yet. Start predicting matches!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {predictions.map((item) => (
                        <div
                            key={item.predictionId}
                            className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                {/* Match info */}
                                <div className="flex-1">
                                    <div className="mb-1 flex items-center gap-2">
                                        <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {item.tournamentName || "Unknown"}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                                            {item.homeFlag && <span className={`fi fi-${item.homeFlag} rounded-sm`} />}
                                            {item.homeTeam}
                                        </span>
                                        {item.homeScore !== null && item.awayScore !== null ? (
                                            <span className="rounded border border-border bg-surface-dark px-2 py-0.5 font-mono text-xs font-bold text-success">
                                                {item.homeScore} - {item.awayScore}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black text-muted-foreground">VS</span>
                                        )}
                                        <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                                            {item.awayFlag && <span className={`fi fi-${item.awayFlag} rounded-sm`} />}
                                            {item.awayTeam}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                        Kickoff: {formatDate(item.kickoff)}
                                    </p>
                                </div>

                                {/* Prediction details */}
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Pick</p>
                                        <p className="text-sm font-bold text-primary">{pickLabel(item.pick)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Points</p>
                                        <p className={`text-sm font-extrabold ${item.pointsEarned > 0 ? "text-success" : "text-foreground/60"}`}>
                                            {item.pointsEarned > 0 ? `+${item.pointsEarned}` : "0"}
                                        </p>
                                    </div>
                                    <div>
                                        {statusBadge(item)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
