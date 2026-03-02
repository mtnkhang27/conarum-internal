import { useEffect, useState } from "react";
import { Trophy, Medal, Award, User } from "lucide-react";
import { playerLeaderboardApi } from "@/services/playerApi";
import type { TournamentLeaderboardItem } from "@/types";

interface TournamentLeaderboardWidgetProps {
    tournamentId: string;
    maxEntries?: number;
}

function podiumIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-300" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return null;
}

function rankClass(rank: number) {
    if (rank === 1) return "border-yellow-400/40 bg-gradient-to-r from-yellow-400/10 to-transparent";
    if (rank === 2) return "border-gray-300/30 bg-gradient-to-r from-gray-300/5 to-transparent";
    if (rank === 3) return "border-amber-600/30 bg-gradient-to-r from-amber-600/5 to-transparent";
    return "border-border";
}

export function TournamentLeaderboardWidget({ tournamentId, maxEntries = 5 }: TournamentLeaderboardWidgetProps) {
    const [entries, setEntries] = useState<TournamentLeaderboardItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!tournamentId) {
            setEntries([]);
            return;
        }
        setLoading(true);
        playerLeaderboardApi.getByTournament(tournamentId)
            .then((data) => setEntries((Array.isArray(data) ? data : []).slice(0, maxEntries)))
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, [tournamentId, maxEntries]);

    if (!tournamentId) return null;

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface/50 px-4 py-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <Trophy className="h-3.5 w-3.5 text-primary" />
                    Leaderboard
                </h3>
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    Top {maxEntries}
                </span>
            </div>

            {loading ? (
                <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                    Loading…
                </div>
            ) : entries.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                    No predictions yet
                </div>
            ) : (
                <div className="divide-y divide-border/50">
                    {entries.map((player) => (
                        <div
                            key={`${player.rank}-${player.playerId}`}
                            className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface/50 border-l-2 ${rankClass(player.rank)}`}
                        >
                            {/* Rank */}
                            <div className="flex w-6 items-center justify-center">
                                {podiumIcon(player.rank) || (
                                    <span className="text-xs font-bold text-muted-foreground">{player.rank}</span>
                                )}
                            </div>

                            {/* Avatar + Name */}
                            <div className="flex flex-1 items-center gap-2 min-w-0">
                                {player.avatarUrl ? (
                                    <img
                                        src={player.avatarUrl}
                                        alt={player.displayName}
                                        className="h-6 w-6 rounded-full border border-border object-cover"
                                    />
                                ) : (
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                                        <User className="h-3 w-3" />
                                    </span>
                                )}
                                <span className="truncate text-xs font-semibold text-foreground">
                                    {player.displayName}
                                </span>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground">
                                    {player.totalCorrect}/{player.totalPredictions}
                                </span>
                                <span className="min-w-[28px] text-right text-sm font-extrabold text-success">
                                    {Math.floor(player.totalPoints)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
