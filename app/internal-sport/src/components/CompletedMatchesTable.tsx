import type { Match } from "@/types";

interface CompletedMatchesTableProps {
    matches: Match[];
}

function pickLabel(pick: string, home: string, away: string): string {
    if (pick === "home") return `${home} Win`;
    if (pick === "away") return `${away} Win`;
    if (pick === "draw") return "Draw";
    return pick || "—";
}

function formatKickoffDisplay(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return (
        d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " · " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
}

export function CompletedMatchesTable({ matches }: CompletedMatchesTableProps) {
    if (matches.length === 0) {
        return (
            <p className="py-10 text-center text-sm text-muted-foreground">
                No completed matches yet.
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
                {/* Header */}
                <div className="grid min-w-[640px] grid-cols-12 gap-2 border-b border-border bg-surface/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-5">Match</div>
                    <div className="col-span-2 text-center">Score</div>
                    <div className="col-span-2 text-center">Your Pick</div>
                    <div className="col-span-3 text-right">Date</div>
                </div>

                {/* Rows */}
                <div className="min-w-[640px] divide-y divide-border">
                    {matches.map((match) => {
                        const hasScore = match.finalScore !== undefined;
                        const hasPick = !!match.selectedOption;

                        // Determine correctness visual: we know outcome only if there's a score
                        let outcome: "home" | "draw" | "away" | null = null;
                        if (hasScore) {
                            const { home, away } = match.finalScore!;
                            if (home > away) outcome = "home";
                            else if (away > home) outcome = "away";
                            else outcome = "draw";
                        }
                        const isCorrect = hasPick && outcome !== null && match.selectedOption === outcome;
                        const isWrong = hasPick && outcome !== null && match.selectedOption !== outcome;

                        return (
                            <div
                                key={match.id}
                                className="grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-surface"
                            >
                                {/* Match teams */}
                                <div className="col-span-5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="flex items-center gap-1 text-sm font-bold text-white">
                                            {match.home.crest
                                                ? <img src={match.home.crest} alt={match.home.name} className="h-4 w-4 object-contain" />
                                                : <span className={`fi fi-${match.home.flag} rounded-sm`} />}
                                            {match.home.name}
                                        </span>
                                        <span className="text-[10px] font-black text-muted-foreground">VS</span>
                                        <span className="flex items-center gap-1 text-sm font-bold text-white">
                                            {match.away.crest
                                                ? <img src={match.away.crest} alt={match.away.name} className="h-4 w-4 object-contain" />
                                                : <span className={`fi fi-${match.away.flag} rounded-sm`} />}
                                            {match.away.name}
                                        </span>
                                    </div>
                                    {match.stage && (
                                        <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {match.stage}
                                        </span>
                                    )}
                                </div>

                                {/* Final score */}
                                <div className="col-span-2 text-center">
                                    {hasScore ? (
                                        <span className="inline-block rounded border border-border bg-surface-dark px-2.5 py-1 font-mono text-sm font-bold text-success">
                                            {match.finalScore!.home} – {match.finalScore!.away}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </div>

                                {/* User pick */}
                                <div className="col-span-2 text-center">
                                    {hasPick ? (
                                        <span
                                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold
                                                ${isCorrect ? "border border-success/40 bg-success/15 text-success" :
                                                  isWrong ? "border border-destructive/40 bg-destructive/15 text-destructive" :
                                                  "border border-border bg-surface text-foreground/70"}`}
                                        >
                                            {pickLabel(match.selectedOption, match.home.name, match.away.name)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">No pick</span>
                                    )}
                                </div>

                                {/* Date */}
                                <div className="col-span-3 text-right text-[10px] text-muted-foreground">
                                    {formatKickoffDisplay(match.kickoffIso)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
