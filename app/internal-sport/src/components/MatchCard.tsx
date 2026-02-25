import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Match } from "@/types";

function getTeamButtonClass(option: string, selected: string, isCompleted: boolean) {
    if (selected === option) {
        return "rounded-lg border border-primary bg-primary py-3 text-xs font-bold text-white shadow-lg transition-all glow-purple";
    }
    return `rounded-lg border border-border bg-surface-dark py-3 text-xs font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary ${isCompleted ? "pointer-events-none opacity-70" : ""
        }`;
}

interface MatchCardProps {
    match: Match;
    isCompleted?: boolean;
}

export function MatchCard({ match, isCompleted = false }: MatchCardProps) {
    const [selectedOption, setSelectedOption] = useState(match.selectedOption || "");

    useEffect(() => {
        setSelectedOption(match.selectedOption || "");
    }, [match.selectedOption]);

    const onPickOption = (option: string) => {
        if (isCompleted) return;
        if (selectedOption === option) {
            toast.info("Pick unchanged", {
                description: `${option} is already selected for ${match.home.name} vs ${match.away.name}.`,
            });
            return;
        }
        setSelectedOption(option);
        toast.success("Pick updated", {
            description: `${option} has been selected for ${match.home.name} vs ${match.away.name}.`,
        });
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
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {isCompleted ? "Final Pick" : "Pick a Winner"}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {match.options.map((option) => (
                        <button
                            type="button"
                            key={option}
                            onClick={() => onPickOption(option)}
                            className={getTeamButtonClass(option, selectedOption, isCompleted)}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
