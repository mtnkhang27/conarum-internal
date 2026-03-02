import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { MatchCard } from "@/components/MatchCard";
import { UpcomingKickoffTable } from "@/components/UpcomingKickoffTable";
import { LiveMatchesTable } from "@/components/LiveMatchesTable";
import { TournamentSelector } from "@/components/TournamentSelector";
import { TournamentLeaderboardWidget } from "@/components/TournamentLeaderboardWidget";
import { playerMatchesApi } from "@/services/playerApi";
import type { Match, UpcomingMatch, LiveMatch } from "@/types";

export function AvailableMatchesPage() {
    const location = useLocation();
    const [tournamentId, setTournamentId] = useState("");
    const [matches, setMatches] = useState<Match[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingMatch[]>([]);
    const [live, setLive] = useState<LiveMatch[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async (tid: string) => {
        setLoading(true);
        try {
            const filterTid = tid || undefined;
            const [m, u, l] = await Promise.all([
                playerMatchesApi.getAvailable(filterTid),
                playerMatchesApi.getUpcoming(filterTid),
                playerMatchesApi.getLive(),
            ]);
            setMatches(m);
            setUpcoming(u);
            setLive(l);
        } catch {
            // silently fall back to empty
        } finally {
            setLoading(false);
        }
    }, []);

    // Re-fetch data whenever the page is navigated to (location.key changes)
    // or when the tournament filter changes. This ensures admin changes
    // (e.g. enabling score prediction, updating points) are reflected immediately.
    useEffect(() => {
        loadData(tournamentId);
    }, [tournamentId, loadData, location.key]);

    const handleTournamentChange = (id: string) => {
        setTournamentId(id);
    };

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-10">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                            <span className="h-6 w-1 rounded-full bg-primary" />
                            Match Predictions
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Predict the winner for upcoming matches. 1 point for correct prediction.
                        </p>
                    </div>
                    <TournamentSelector
                        selectedId={tournamentId}
                        onSelect={handleTournamentChange}
                        allowAll
                    />
                </div>

                <div className="flex flex-col gap-6 ">
                    {/* Leaderboard sidebar */}
                    {tournamentId && (
                        <div className="w-full  flex-shrink-0">
                            <TournamentLeaderboardWidget tournamentId={tournamentId} maxEntries={5} />
                        </div>
                    )}
                    {/* Match cards */}
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="flex h-64 items-center justify-center text-muted-foreground">
                                Loading matches…
                            </div>
                        ) : matches.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No upcoming matches available for prediction.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 2xl:grid-cols-4">
                                {matches.map((match) => (
                                    <MatchCard key={match.id} match={match} />
                                ))}
                            </div>
                        )}
                    </div>

                    
                </div>
            </div>

            <LiveMatchesTable items={live} />
            <UpcomingKickoffTable items={upcoming} />
        </div>
    );
}
