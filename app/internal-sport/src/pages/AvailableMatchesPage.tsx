import { MatchCard } from "@/components/MatchCard";
import { UpcomingKickoffTable } from "@/components/UpcomingKickoffTable";
import { LiveMatchesTable } from "@/components/LiveMatchesTable";
import { availableMatches, upcomingKickoffMatches, liveMatches } from "@/data/mockData";

export function AvailableMatchesPage() {
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

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {availableMatches.map((match) => (
                        <MatchCard key={match.id} match={match} />
                    ))}
                </div>
            </div>

            <LiveMatchesTable items={liveMatches} />
            <UpcomingKickoffTable items={upcomingKickoffMatches} />
        </div>
    );
}
