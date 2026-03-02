import { useEffect, useState, useCallback } from "react";
import { MatchCard } from "@/components/MatchCard";
import { TournamentSelector } from "@/components/TournamentSelector";
import { TournamentLeaderboardWidget } from "@/components/TournamentLeaderboardWidget";
import { playerMatchesApi } from "@/services/playerApi";
import type { Match } from "@/types";

export function CompletedMatchesPage() {
    const [tournamentId, setTournamentId] = useState("");
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async (tid: string) => {
        setLoading(true);
        try {
            const filterTid = tid || undefined;
            setMatches(await playerMatchesApi.getCompleted(filterTid));
        } catch {
            // silently fall back to empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(tournamentId);
    }, [tournamentId, loadData]);

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-10">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                            <span className="h-6 w-1 rounded-full bg-primary" />
                            Completed Matches
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Results and your predictions for finished matches.
                        </p>
                    </div>
                    <TournamentSelector
                        selectedId={tournamentId}
                        onSelect={setTournamentId}
                        allowAll
                    />
                </div>

                <div className="flex flex-col gap-6 xl:flex-row">
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="flex h-64 items-center justify-center text-muted-foreground">
                                Loading completed matches…
                            </div>
                        ) : matches.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No completed matches yet.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
                                {matches.map((match) => (
                                    <MatchCard key={match.id} match={match} isCompleted />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Leaderboard sidebar */}
                    {tournamentId && (
                        <div className="w-full xl:w-[280px] flex-shrink-0">
                            <TournamentLeaderboardWidget tournamentId={tournamentId} maxEntries={5} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
