import { useEffect, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { playerLeaderboardApi } from "@/services/playerApi";
import type { TournamentLeaderboardItem } from "@/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeaderboardPlayerHoverCard } from "@/components/LeaderboardPlayerHoverCard";

function podiumIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
}

function podiumGlowClass(rank: number, isMe: boolean) {
    if (isMe) {
        return "border-yellow-400/70 ring-2 ring-yellow-400/50 bg-gradient-to-br from-yellow-400/10 to-transparent";
    }
    if (rank === 1) {
        return "border-yellow-400/50 ring-1 ring-yellow-400/30 bg-gradient-to-br from-yellow-400/5 to-transparent";
    }
    if (rank === 2) return "border-gray-300/40 ring-1 ring-gray-300/20";
    if (rank === 3) return "border-amber-600/40 ring-1 ring-amber-600/20";
    return "border-border";
}

function rowGlowClass(rank: number, isMe: boolean) {
    if (isMe) {
        return "border-l-2 border-l-yellow-400 bg-gradient-to-r from-yellow-400/10 to-transparent ring-inset ring-1 ring-yellow-400/30";
    }
    if (rank <= 3) return "border-l-2 border-l-primary/30";
    return "";
}

interface LeaderboardSectionProps {
    tournamentId: string;
}

export function LeaderboardSection({ tournamentId }: LeaderboardSectionProps) {
    const [entries, setEntries] = useState<TournamentLeaderboardItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!tournamentId) {
            setEntries([]);
            setError("");
            return;
        }

        setLoading(true);
        setError("");
        playerLeaderboardApi
            .getByTournament(tournamentId)
            .then((data) => setEntries(Array.isArray(data) ? data : []))
            .catch((e: any) => setError(e?.message || "Failed to load leaderboard"))
            .finally(() => setLoading(false));
    }, [tournamentId]);

    if (!tournamentId) {
        return (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Trophy className="h-7 w-7 text-border" />
                <p className="text-sm">Select a tournament to view the leaderboard.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Loading leaderboard...
            </div>
        );
    }

    if (error || entries.length === 0) {
        return (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Trophy className="h-7 w-7 text-border" />
                <p className="text-sm">{error || "No predictions scored yet."}</p>
            </div>
        );
    }

    const topPlayers = entries.slice(0, 3);
    const meEntry = entries.find((e) => e.isMe);
    const meInTop5 = meEntry ? meEntry.rank <= 5 : false;

    return (
        <TooltipProvider delayDuration={120}>
            <div>
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {topPlayers.map((player) => (
                        <div
                            key={player.rank}
                            className={`rounded-lg border bg-card p-4 transition-all hover:border-primary/40 ${podiumGlowClass(player.rank, !!player.isMe)}`}
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {podiumIcon(player.rank)}
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        Rank #{player.rank}
                                    </span>
                                    {player.isMe && (
                                        <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                            You
                                        </span>
                                    )}
                                </div>
                                <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold text-foreground/80">
                                    {player.totalCorrect}/{player.totalPredictions} correct
                                </span>
                            </div>

                            <div className="mb-3 flex items-center gap-3">
                                <LeaderboardPlayerHoverCard player={player} sizeClass="h-10 w-10" iconClass="h-5 w-5" />
                                <div>
                                    <p className="text-sm font-bold text-white">{player.displayName}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Accuracy:{" "}
                                        {player.totalPredictions > 0
                                            ? Math.round((player.totalCorrect / player.totalPredictions) * 100)
                                            : 0}
                                        %
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
                                        className={`grid grid-cols-12 items-center gap-2 px-4 py-3.5 transition-colors hover:bg-surface ${rowGlowClass(player.rank, !!player.isMe)}`}
                                    >
                                        <div className="col-span-1 text-center">
                                            <span
                                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-extrabold ${
                                                    player.isMe
                                                        ? "border-yellow-400/60 bg-yellow-400/20 text-yellow-400"
                                                        : player.rank <= 3
                                                            ? "border-primary/40 bg-primary/20 text-primary"
                                                            : "border-border bg-surface text-foreground/80"
                                                }`}
                                            >
                                                {player.rank}
                                            </span>
                                        </div>

                                        <div className="col-span-5 flex items-center gap-3">
                                            <LeaderboardPlayerHoverCard player={player} sizeClass="h-8 w-8" iconClass="h-4 w-4" />
                                            <span className="text-sm font-bold text-white">{player.displayName}</span>
                                            {player.isMe && (
                                                <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                                    You
                                                </span>
                                            )}
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

                        {meEntry && !meInTop5 && (
                            <>
                                <div className="min-w-[640px] border-t-2 border-dashed border-yellow-400/40 bg-surface/30 px-4 py-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/70">
                                        Your position
                                    </span>
                                </div>
                                <div
                                    className={`min-w-[640px] grid grid-cols-12 items-center gap-2 px-4 py-3.5 ${rowGlowClass(meEntry.rank, true)}`}
                                >
                                    <div className="col-span-1 text-center">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-yellow-400/60 bg-yellow-400/20 text-xs font-extrabold text-yellow-400">
                                            {meEntry.rank}
                                        </span>
                                    </div>
                                    <div className="col-span-5 flex items-center gap-3">
                                        <LeaderboardPlayerHoverCard player={meEntry} sizeClass="h-8 w-8" iconClass="h-4 w-4" />
                                        <span className="text-sm font-bold text-white">{meEntry.displayName}</span>
                                        <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                            You
                                        </span>
                                    </div>
                                    <div className="col-span-2 text-center text-sm text-foreground/80">
                                        {meEntry.totalCorrect}/{meEntry.totalPredictions}
                                    </div>
                                    <div className="col-span-2 text-center text-sm font-semibold text-foreground/90">
                                        {meEntry.totalPredictions > 0
                                            ? Math.round((meEntry.totalCorrect / meEntry.totalPredictions) * 100)
                                            : 0}
                                        %
                                    </div>
                                    <div className="col-span-2 text-center text-sm font-extrabold text-success">
                                        {Math.floor(meEntry.totalPoints)}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

