import { useMemo, useState } from "react";
import { exactScoreMatches } from "@/data/mockData";

function clampScore(value: string) {
    if (value === "") return 0;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return 0;
    return Math.min(9, Math.max(0, parsed));
}

export function ExactScorePage() {
    const [scorePicks, setScorePicks] = useState<Record<string, { home: number; away: number }>>(() =>
        Object.fromEntries(
            exactScoreMatches.map((m) => [m.id, { home: m.defaultScore.home, away: m.defaultScore.away }]),
        ),
    );

    const summary = useMemo(() => {
        const potential = exactScoreMatches.reduce((sum, item) => sum + item.weight, 0);
        const totalMatches = exactScoreMatches.length;
        const savedPicks = exactScoreMatches.filter((item) => scorePicks[item.id]).length;
        return { totalMatches, savedPicks, potential: potential.toFixed(2), pending: totalMatches - savedPicks };
    }, [scorePicks]);

    const onScoreChange = (matchId: string, side: "home" | "away", value: string) => {
        setScorePicks((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: clampScore(value) } }));
    };

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="h-6 w-1 rounded-full bg-secondary" />
                    Exact Score
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Predict scorelines before kickoff. Realtime final-score comparison is currently disabled.
                </p>
            </div>

            {/* Summary cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "Matches Open", value: summary.totalMatches, color: "text-white" },
                    { label: "Saved Picks", value: summary.savedPicks, color: "text-success" },
                    { label: "Pending Picks", value: summary.pending, color: "text-primary" },
                    { label: "Potential Weight", value: summary.potential, color: "text-success" },
                ].map((card) => (
                    <div key={card.label} className="rounded-lg border border-border bg-card px-4 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                        <p className={`mt-1 text-2xl font-extrabold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Score cards */}
            <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {exactScoreMatches.map((match) => {
                    const pick = scorePicks[match.id];
                    return (
                        <div
                            key={match.id}
                            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <span className="rounded bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary">
                                    MATCH WEIGHT: {match.weight.toFixed(2)}
                                </span>
                                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {match.timeLabel}
                                </span>
                            </div>

                            <div className="mb-4 flex items-center justify-between border-y border-border/50 py-4">
                                <div className="flex flex-1 flex-col items-center">
                                    <span className={`fi fi-${match.home.flag} mb-2 !w-8 rounded-sm text-2xl shadow-md`} />
                                    <span className="text-sm font-bold text-white">{match.home.name}</span>
                                </div>

                                <div className="flex items-center gap-2 px-3">
                                    <input
                                        type="number"
                                        min="0"
                                        max="9"
                                        value={pick.home}
                                        onChange={(e) => onScoreChange(match.id, "home", e.target.value)}
                                        className="w-12 rounded border border-border bg-surface-dark px-2 py-1 text-center text-sm font-bold text-white outline-none focus:border-primary"
                                    />
                                    <span className="text-sm font-black text-muted-foreground">:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="9"
                                        value={pick.away}
                                        onChange={(e) => onScoreChange(match.id, "away", e.target.value)}
                                        className="w-12 rounded border border-border bg-surface-dark px-2 py-1 text-center text-sm font-bold text-white outline-none focus:border-primary"
                                    />
                                </div>

                                <div className="flex flex-1 flex-col items-center">
                                    <span className={`fi fi-${match.away.flag} mb-2 !w-8 rounded-sm text-2xl shadow-md`} />
                                    <span className="text-sm font-bold text-white">{match.away.name}</span>
                                </div>
                            </div>

                            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Your Score Pick
                            </div>
                            <div className="flex items-center justify-between rounded border border-border bg-surface-dark px-3 py-2">
                                <span className="text-xs text-foreground/80">
                                    {match.home.name} {pick.home} - {pick.away} {match.away.name}
                                </span>
                                <span className="text-xs font-bold text-success">Saved</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary table */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="overflow-x-auto">
                    <div className="grid min-w-[760px] grid-cols-12 gap-2 border-b border-border bg-surface/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-4">Match</div>
                        <div className="col-span-2 text-center">Kickoff</div>
                        <div className="col-span-2 text-center">Your Score</div>
                        <div className="col-span-2 text-center">Weight</div>
                        <div className="col-span-2 text-center">State</div>
                    </div>

                    <div className="min-w-[760px] divide-y divide-border">
                        {exactScoreMatches.map((item) => {
                            const pick = scorePicks[item.id];
                            return (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-12 items-center gap-2 px-4 py-4 transition-colors hover:bg-surface"
                                >
                                    <div className="col-span-4 text-sm font-bold text-white">
                                        {item.home.name} vs {item.away.name}
                                    </div>
                                    <div className="col-span-2 text-center text-xs text-muted-foreground">{item.timeLabel}</div>
                                    <div className="col-span-2 text-center font-mono text-sm text-primary">
                                        {pick.home} - {pick.away}
                                    </div>
                                    <div className="col-span-2 text-center text-sm font-bold text-primary">
                                        {item.weight.toFixed(2)}
                                    </div>
                                    <div className="col-span-2 text-center">
                                        <span className="inline-flex rounded border border-success/40 bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                                            Saved
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
