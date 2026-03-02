import { useEffect, useState, useCallback } from "react";
import { User, Trophy, Medal, Award } from "lucide-react";
import { TournamentSelector } from "@/components/TournamentSelector";
import { playerLeaderboardApi } from "@/services/playerApi";
import type { TournamentLeaderboardItem } from "@/types";

function podiumIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
}

function podiumGlowClass(rank: number) {
    if (rank === 1) return "border-yellow-400/50 ring-1 ring-yellow-400/30 bg-gradient-to-br from-yellow-400/5 to-transparent";
    if (rank === 2) return "border-gray-300/40 ring-1 ring-gray-300/20";
    if (rank === 3) return "border-amber-600/40 ring-1 ring-amber-600/20";
    return "border-border";
}

export function LeaderboardPage() {
    const [tournamentId, setTournamentId] = useState("");
    const [entries, setEntries] = useState<TournamentLeaderboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadData = useCallback(async (tid: string) => {
        setLoading(true);
        setError("");
        try {
            if (!tid) {
                setEntries([]);
                setError("Please select a tournament to view its prediction leaderboard.");
                return;
            }
            const data = await playerLeaderboardApi.getByTournament(tid);
            setEntries(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err?.message || "Failed to load leaderboard");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tournamentId) {
            loadData(tournamentId);
        } else {
            setLoading(false);
        }
    }, [tournamentId, loadData]);

    const topPlayers = entries.slice(0, 3);

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                        <span className="h-6 w-1 rounded-full bg-success" />
                        Prediction Leaderboard
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Points are per tournament — 1 point per correct prediction. Ties broken by name (A→Z).
                    </p>
                </div>
                <TournamentSelector
                    selectedId={tournamentId}
                    onSelect={setTournamentId}
                />
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                    Loading leaderboard…
                </div>
            ) : error ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Trophy className="h-10 w-10 text-border" />
                    <p className="text-sm">{error}</p>
                </div>
            ) : entries.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Trophy className="h-10 w-10 text-border" />
                    <p className="text-sm">No predictions scored yet for this tournament.</p>
                </div>
            ) : (
                <>
                    {/* Podium cards */}
                    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {topPlayers.map((player) => (
                            <div
                                key={player.rank}
                                className={`rounded-lg border bg-card p-4 transition-all hover:border-primary/40 ${podiumGlowClass(player.rank)}`}
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {podiumIcon(player.rank)}
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            Rank #{player.rank}
                                        </span>
                                    </div>
                                    <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold text-foreground/80">
                                        {player.totalCorrect}/{player.totalPredictions} correct
                                    </span>
                                </div>

                                <div className="mb-3 flex items-center gap-3">
                                    {player.avatarUrl ? (
                                        <img
                                            src={player.avatarUrl}
                                            alt={player.displayName}
                                            className="h-10 w-10 rounded-full border border-border object-cover"
                                        />
                                    ) : (
                                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                                            <User className="h-5 w-5" />
                                        </span>
                                    )}
                                    <div>
                                        <p className="text-sm font-bold text-white">{player.displayName}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Accuracy: {player.totalPredictions > 0 ? Math.round((player.totalCorrect / player.totalPredictions) * 100) : 0}%
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between border-t border-border pt-3">
                                    <span className="text-[11px] text-muted-foreground">Total Points</span>
                                    <span className="text-2xl font-extrabold text-success">
                                        {Math.floor(player.totalPoints)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Full rankings table */}
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                        <div className="overflow-x-auto">
                            <div className="grid min-w-[640px] grid-cols-12 gap-2 border-b border-border bg-surface/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <div className="col-span-1 text-center">Rank</div>
                                <div className="col-span-5">Player</div>
                                <div className="col-span-2 text-center">Correct</div>
                                <div className="col-span-2 text-center">Accuracy</div>
                                <div className="col-span-2 text-center">Points</div>
                            </div>

                            <div className="min-w-[640px] divide-y divide-border">
                                {entries.map((player) => {
                                    const accuracy = player.totalPredictions > 0
                                        ? Math.round((player.totalCorrect / player.totalPredictions) * 100)
                                        : 0;

                                    return (
                                        <div
                                            key={`${player.rank}-${player.playerId}`}
                                            className="grid grid-cols-12 items-center gap-2 px-4 py-4 transition-colors hover:bg-surface"
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

                                            <div className="col-span-5 flex items-center gap-3">
                                                {player.avatarUrl ? (
                                                    <img
                                                        src={player.avatarUrl}
                                                        alt={player.displayName}
                                                        className="h-8 w-8 rounded-full border border-border object-cover"
                                                    />
                                                ) : (
                                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                                                        <User className="h-4 w-4" />
                                                    </span>
                                                )}
                                                <span className="text-sm font-bold text-white">{player.displayName}</span>
                                            </div>

                                            <div className="col-span-2 text-center text-sm text-foreground/80">
                                                {player.totalCorrect}/{player.totalPredictions}
                                            </div>
                                            <div className="col-span-2 text-center text-sm font-semibold text-foreground/90">
                                                {accuracy}%
                                            </div>
                                            <div className="col-span-2 text-center text-sm font-extrabold text-success">
                                                {Math.floor(player.totalPoints)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
