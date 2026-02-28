import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Match } from "@/types";
import { playerActionsApi } from "@/services/playerApi";

function clampScore(value: string) {
    if (value === "") return 0;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return 0;
    return Math.min(9, Math.max(0, parsed));
}

function getTeamButtonClass(option: string, selected: string, isCompleted: boolean, isSaving: boolean) {
    if (selected === option) {
        return "rounded-lg border border-primary bg-primary py-2 text-xs font-bold text-white shadow-lg transition-all glow-purple";
    }
    return `rounded-lg border border-border bg-surface-dark py-2 text-xs font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary ${isCompleted || isSaving ? "pointer-events-none opacity-70" : ""
        }`;
}

interface MatchCardProps {
    match: Match;
    isCompleted?: boolean;
}

export function MatchCard({ match, isCompleted = false }: MatchCardProps) {
    const [selectedOption, setSelectedOption] = useState(match.selectedOption || "");
    const [scores, setScores] = useState<{ home: number; away: number }[]>(() => {
        const existing = match.existingScores || [];
        return [
            existing[0] || { home: 0, away: 0 },
            existing[1] || { home: 0, away: 0 },
            existing[2] || { home: 0, away: 0 },
        ];
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSelectedOption(match.selectedOption || "");
    }, [match.selectedOption]);

    useEffect(() => {
        const existing = match.existingScores || [];
        setScores([
            existing[0] || { home: 0, away: 0 },
            existing[1] || { home: 0, away: 0 },
            existing[2] || { home: 0, away: 0 },
        ]);
    }, [match.existingScores]);

    const onPickOption = (option: string) => {
        if (isCompleted || isSaving) return;
        // Toggle: clicking the same option deselects it
        setSelectedOption((prev) => (prev === option ? "" : option));
    };

    const onClear = () => {
        if (isCompleted || isSaving) return;
        setSelectedOption("");
        setScores([
            { home: 0, away: 0 },
            { home: 0, away: 0 },
            { home: 0, away: 0 },
        ]);
    };

    const onScoreChange = (rowIdx: number, side: "home" | "away", value: string) => {
        if (isCompleted || isSaving) return;
        setScores((prev) => {
            const next = [...prev];
            next[rowIdx] = { ...next[rowIdx], [side]: clampScore(value) };
            return next;
        });
    };

    const onSubmit = async () => {
        if (isCompleted || isSaving) return;

        setIsSaving(true);

        // If no option selected → cancel/clear the existing prediction
        if (!selectedOption) {
            try {
                const res = await playerActionsApi.cancelMatchPrediction(match.id);
                toast.success("Prediction cleared", {
                    description: res.message || `Prediction removed for ${match.home.name} vs ${match.away.name}.`,
                });
            } catch (e: any) {
                toast.error("Failed to clear", {
                    description: e.message || "Please try again.",
                });
            } finally {
                setIsSaving(false);
            }
            return;
        }

        let apiPick = "draw";
        if (selectedOption === match.home.name) apiPick = "home";
        else if (selectedOption === match.away.name) apiPick = "away";

        try {
            const res = await playerActionsApi.submitMatchPrediction(
                match.id,
                apiPick,
                scores.map((s) => ({ homeScore: s.home, awayScore: s.away }))
            );
            toast.success("Prediction saved", {
                description: res.message || `Pick & scores saved for ${match.home.name} vs ${match.away.name}.`,
            });
        } catch (e: any) {
            toast.error("Failed to save", {
                description: e.message || "Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="match-card rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg">
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary">
                            MATCH WEIGHT: {match.weight.toFixed(2)}
                        </span>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {match.timeLabel}
                    </span>
                </div>

                <div className="mb-4 flex items-center justify-between border-y border-border/50 py-4">
                    <div className="flex flex-1 flex-col items-center">
                        <span className={`fi fi-${match.home.flag} mb-2 !w-8 rounded-sm text-2xl shadow-md`} />
                        <span className="text-sm font-bold text-white">{match.home.name}</span>
                    </div>

                    <div className="flex flex-col items-center gap-2 px-3">
                        {scores.map((row, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={0}
                                    max={9}
                                    value={row.home}
                                    onChange={(e) => onScoreChange(i, "home", e.target.value)}
                                    disabled={isCompleted || isSaving}
                                    className="w-10 rounded border border-border bg-surface-dark px-1 py-1 text-center text-sm font-bold text-white outline-none focus:border-primary disabled:opacity-50"
                                />
                                <span className="text-xs font-black text-muted-foreground">:</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={9}
                                    value={row.away}
                                    onChange={(e) => onScoreChange(i, "away", e.target.value)}
                                    disabled={isCompleted || isSaving}
                                    className="w-10 rounded border border-border bg-surface-dark px-1 py-1 text-center text-sm font-bold text-white outline-none focus:border-primary disabled:opacity-50"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-1 flex-col items-center">
                        <span className={`fi fi-${match.away.flag} mb-2 !w-8 rounded-sm text-2xl shadow-md`} />
                        <span className="text-sm font-bold text-white">{match.away.name}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {isCompleted ? "Final Pick" : "Pick Winner & Score"}
                    </span>
                    {isSaving && (
                        <span className="text-[10px] font-bold text-primary animate-pulse">Saving…</span>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {match.options.map((option) => (
                        <button
                            type="button"
                            key={option}
                            onClick={() => onPickOption(option)}
                            disabled={isSaving || isCompleted}
                            className={getTeamButtonClass(option, selectedOption, isCompleted, isSaving)}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                {!isCompleted && (
                    <div className="flex gap-2">
                        {selectedOption && (
                            <button
                                type="button"
                                onClick={onClear}
                                disabled={isSaving}
                                className="rounded-lg border border-border bg-surface-dark px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={isSaving}
                            className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                                selectedOption
                                    ? "bg-primary hover:bg-primary/90"
                                    : "bg-red-600 hover:bg-red-700"
                            }`}
                        >
                            {isSaving
                                ? "Saving…"
                                : selectedOption
                                  ? "Submit Prediction"
                                  : "Cancel Prediction"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
