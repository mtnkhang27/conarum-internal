import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Match } from "@/types";
import { playerActionsApi } from "@/services/playerApi";

function getTeamButtonClass(option: string, selected: string, isCompleted: boolean, isSaving: boolean) {
    if (selected === option) {
        return "rounded-lg border border-primary bg-primary py-3 text-xs font-bold text-white shadow-lg transition-all glow-purple";
    }
    return `rounded-lg border border-border bg-surface-dark py-3 text-xs font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary ${isCompleted || isSaving ? "pointer-events-none opacity-70" : ""
        }`;
}

interface MatchCardProps {
    match: Match;
    isCompleted?: boolean;
}

export function MatchCard({ match, isCompleted = false }: MatchCardProps) {
    const [selectedOption, setSelectedOption] = useState(match.selectedOption || "");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSelectedOption(match.selectedOption || "");
    }, [match.selectedOption]);

    const onPickOption = async (option: string) => {
        if (isCompleted || isSaving) return;
        if (selectedOption === option) {
            toast.info("Pick unchanged", {
                description: `${option} is already selected for ${match.home.name} vs ${match.away.name}.`,
            });
            return;
        }

        setSelectedOption(option);
        setIsSaving(true);

        // Map display name → API value: home / draw / away
        let apiPick = "draw";
        if (option === match.home.name) apiPick = "home";
        else if (option === match.away.name) apiPick = "away";

        try {
            const res = await playerActionsApi.submitPredictions([
                { matchId: match.id, pick: apiPick },
            ]);
            toast.success("Pick saved", {
                description: res.message || `${option} selected for ${match.home.name} vs ${match.away.name}.`,
            });
        } catch (e: any) {
            // Revert on failure
            setSelectedOption(selectedOption);
            toast.error("Failed to save pick", {
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

                    <div className="flex flex-col items-center px-4">
                        <span className="text-xs font-black text-muted-foreground">VS</span>
                    </div>

                    <div className="flex flex-1 flex-col items-center">
                        <span className={`fi fi-${match.away.flag} mb-2 !w-8 rounded-sm text-2xl shadow-md`} />
                        <span className="text-sm font-bold text-white">{match.away.name}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {isCompleted ? "Final Pick" : "Pick a Winner"}
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
            </div>
        </div>
    );
}
