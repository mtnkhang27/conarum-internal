import { useEffect, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { playerMatchesApi } from "@/services/playerApi";
import type { Match } from "@/types";

export function CompletedMatchesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        playerMatchesApi.getCompleted().then(setMatches).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading completed matches…
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
                            Submitted Winner Picks
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Locked picks only. Match outcome comparison is hidden until a trusted result source is connected.
                        </p>
                    </div>
                </div>

                {matches.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        No completed matches yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {matches.map((match) => (
                            <MatchCard key={match.id} match={match} isCompleted />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
