import type { LiveMatch } from "@/types";

interface LiveMatchesTableProps {
    items: LiveMatch[];
}

export function LiveMatchesTable({ items }: LiveMatchesTableProps) {
    const getFallbackNames = (matchLabel: string): { home: string; away: string } => {
        const [home = "Home", away = "Away"] = matchLabel.split(/\s+vs\s+/i);
        return { home, away };
    };

    const getTeamName = (item: LiveMatch, side: "home" | "away"): string => {
        const team = side === "home" ? item.home : item.away;
        if (team?.name) return team.name;
        const fallback = getFallbackNames(item.match);
        return side === "home" ? fallback.home : fallback.away;
    };

    const pickLabel = (item: LiveMatch): string => {
        if (item.pick === "home") return `${getTeamName(item, "home")} Win`;
        if (item.pick === "away") return `${getTeamName(item, "away")} Win`;
        if (item.pick === "draw") return "Draw";
        return "No pick";
    };

    return (
        <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <span className="h-6 w-1 rounded-full bg-success" />
                Live Matches
            </h2>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-6">In-Play Match</div>
                    <div className="col-span-2 text-center">Points</div>
                    <div className="col-span-2 text-center">Score</div>
                    <div className="col-span-2 text-center">Pick</div>
                </div>

                <div className="divide-y divide-border">
                    {items.map((item) => (
                        <div
                            key={item.id || item.match}
                            className="grid grid-cols-12 items-center gap-2 px-4 py-4 transition-colors hover:bg-surface"
                        >
                            <div className="col-span-6 flex flex-col">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="flex items-center gap-1 text-sm font-bold text-white">
                                        {item.home?.crest ? (
                                            <img src={item.home.crest} alt={getTeamName(item, "home")} className="h-4 w-4 object-contain" />
                                        ) : item.home?.flag ? (
                                            <span className={`fi fi-${item.home.flag} rounded-sm`} />
                                        ) : (
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface-dark text-[9px] font-black text-muted-foreground">?</span>
                                        )}
                                        {getTeamName(item, "home")}
                                    </span>
                                    <span className="text-[10px] font-black text-muted-foreground">VS</span>
                                    <span className="flex items-center gap-1 text-sm font-bold text-white">
                                        {item.away?.crest ? (
                                            <img src={item.away.crest} alt={getTeamName(item, "away")} className="h-4 w-4 object-contain" />
                                        ) : item.away?.flag ? (
                                            <span className={`fi fi-${item.away.flag} rounded-sm`} />
                                        ) : (
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface-dark text-[9px] font-black text-muted-foreground">?</span>
                                        )}
                                        {getTeamName(item, "away")}
                                    </span>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                                        Live
                                    </span>
                                    {/* <span className="text-[10px] text-muted-foreground">{item.minute}</span> */}
                                </div>
                            </div>

                            <div className="col-span-2 text-center">
                                <span className="text-sm font-bold text-success">+1</span>
                            </div>

                            <div className="col-span-2 text-center">
                                <div className="inline-flex flex-col rounded border border-border bg-surface-dark px-3 py-1 font-mono text-sm font-bold text-success">
                                    {item.score}
                                </div>
                            </div>

                            <div className="col-span-2 text-center">
                                <span
                                    className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${
                                        item.pick
                                            ? "border-primary/40 bg-primary/15 text-primary"
                                            : "border-border bg-surface text-muted-foreground"
                                    }`}
                                >
                                    {pickLabel(item)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
