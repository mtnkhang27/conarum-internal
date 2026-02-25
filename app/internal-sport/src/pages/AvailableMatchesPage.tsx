import { useEffect, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { UpcomingKickoffTable } from "@/components/UpcomingKickoffTable";
import { LiveMatchesTable } from "@/components/LiveMatchesTable";
import { playerMatchesApi } from "@/services/playerApi";
import type { Match, UpcomingMatch, LiveMatch } from "@/types";

export function AvailableMatchesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingMatch[]>([]);
    const [live, setLive] = useState<LiveMatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [m, u, l] = await Promise.all([
                    playerMatchesApi.getAvailable(),
                    playerMatchesApi.getUpcoming(),
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
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading matches…
            </div>
        );
    }

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-10">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                            <span className="h-6 w-1 rounded-full bg-primary" />
                            Match Predictions
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Predict the winner for upcoming matches. Realtime result feed is currently disabled.
                        </p>
                    </div>
                </div>

                {matches.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        No upcoming matches available for prediction.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {matches.map((match) => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                )}
            </div>

            <LiveMatchesTable items={live} />
            <UpcomingKickoffTable items={upcoming} />
        </div>
    );
}
