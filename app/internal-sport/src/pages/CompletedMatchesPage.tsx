import { MatchCard } from "@/components/MatchCard";
import { completedMatches } from "@/data/mockData";

export function CompletedMatchesPage() {
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

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {completedMatches.map((match) => (
                        <MatchCard key={match.id} match={match} isCompleted />
                    ))}
                </div>
            </div>
        </div>
    );
}
