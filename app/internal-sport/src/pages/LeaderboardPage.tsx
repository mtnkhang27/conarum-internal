import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { playerLeaderboardApi } from "@/services/playerApi";
import type { LeaderboardEntry } from "@/types";

function podiumGlowClass(rank: number) {
    if (rank === 1) return "border-primary ring-1 ring-primary/50 glow-purple";
    return "border-border";
}

export function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        playerLeaderboardApi.getAll().then(setEntries).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading leaderboard…
            </div>
        );
    }

    const topPlayers = entries.slice(0, 3);

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="h-6 w-1 rounded-full bg-success" />
                    Leaderboard
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Top players ranked by points earned from correctly predicting match winners.
                </p>
            </div>

            {/* Podium cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                {topPlayers.map((player) => (
                    <div
                        key={player.rank}
                        className={`rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 ${podiumGlowClass(player.rank)}`}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Rank #{player.rank}
                            </span>
                            <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold text-foreground/80">
                                {player.streak} Win Streak
                            </span>
                        </div>

                        <div className="mb-3 flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                                <User className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-white">{player.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {player.correctPicks}/{player.totalPicks} correct picks
                                </p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between border-t border-border pt-3">
                            <span className="text-[11px] text-muted-foreground">Accuracy {player.accuracy}%</span>
                            <span className="text-2xl font-extrabold text-success">{player.points.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Full rankings table */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="overflow-x-auto">
                    <div className="grid min-w-[760px] grid-cols-12 gap-2 border-b border-border bg-surface/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-1 text-center">Rank</div>
                        <div className="col-span-4">Player</div>
                        <div className="col-span-2 text-center">Correct Picks</div>
                        <div className="col-span-2 text-center">Accuracy</div>
                        <div className="col-span-1 text-center">Streak</div>
                        <div className="col-span-2 text-center">Points</div>
                    </div>

                    <div className="min-w-[760px] divide-y divide-border">
                        {entries.map((player) => (
                            <div
                                key={`${player.rank}-${player.name}`}
                                className={`grid grid-cols-12 items-center gap-2 px-4 py-4 transition-colors hover:bg-surface ${player.isYou ? "bg-primary/10" : ""
                                    }`}
                            >
                                <div className="col-span-1 text-center">
                                    <span
                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-extrabold ${player.rank <= 3
                                            ? "border-primary/40 bg-primary/20 text-primary"
                                            : "border-border bg-surface text-foreground/80"
                                            }`}
                                    >
                                        {player.rank}
                                    </span>
                                </div>

                                <div className="col-span-4 flex items-center gap-3">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                                        <User className="h-4 w-4" />
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white">{player.name}</span>
                                        {player.isYou && (
                                            <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                                                You
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2 text-center text-sm text-foreground/80">
                                    {player.correctPicks}/{player.totalPicks}
                                </div>
                                <div className="col-span-2 text-center text-sm font-semibold text-foreground/90">
                                    {player.accuracy}%
                                </div>
                                <div className="col-span-1 text-center text-sm font-semibold text-primary">{player.streak}</div>
                                <div className="col-span-2 text-center text-sm font-extrabold text-success">
                                    {player.points.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
