import { useState } from "react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { championTeams } from "@/data/mockData";
import type { ChampionTeam } from "@/types";

export function TournamentChampionPage() {
    const [teams, setTeams] = useState<ChampionTeam[]>(championTeams);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingTeam, setPendingTeam] = useState<string | null>(null);

    const onSelectChampion = (teamName: string) => {
        const currentSelection = teams.find((team) => team.selected);
        if (currentSelection?.name === teamName) {
            toast.info("Champion unchanged", {
                description: `${teamName} is already your champion pick.`,
            });
            return;
        }
        setPendingTeam(teamName);
        setConfirmOpen(true);
    };

    const onConfirmSelection = () => {
        if (!pendingTeam) return;
        setTeams((prev) =>
            prev.map((team) => ({ ...team, selected: team.name === pendingTeam })),
        );
        toast.success("Champion updated", {
            description: `${pendingTeam} has been set as your champion pick.`,
        });
        setPendingTeam(null);
    };

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-10">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                            <span className="h-6 w-1 rounded-full bg-secondary" />
                            Select Your Tournament Champion
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Predictions for the final winner. No points are calculated; rewards are issued by admin.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {teams.map((team) => (
                        <div
                            key={team.name}
                            className={`group relative flex cursor-pointer flex-col items-center rounded-xl border p-6 text-center transition-all ${team.selected
                                    ? "border-primary bg-card ring-1 ring-primary glow-purple"
                                    : "border-border bg-card hover:border-primary"
                                }`}
                        >
                            <span
                                className={`fi fi-${team.flag} mb-4 !h-12 !w-16 rounded shadow-md transition-transform ${team.selected ? "scale-110" : "group-hover:scale-105"
                                    }`}
                            />
                            <span className={`mb-1 text-sm font-bold ${team.selected ? "text-primary" : "text-white"}`}>
                                {team.name}
                            </span>
                            <span className="mb-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                                {team.confederation}
                            </span>
                            <div className="mt-auto w-full">
                                <button
                                    type="button"
                                    onClick={() => onSelectChampion(team.name)}
                                    className={`w-full rounded border py-2 text-[11px] font-bold uppercase transition-colors ${team.selected
                                            ? "border-primary bg-primary text-white"
                                            : "border-border bg-surface-dark text-muted-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-white"
                                        }`}
                                >
                                    {team.selected ? "Selected" : "Select"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="border-border bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Champion Selection</AlertDialogTitle>
                        <AlertDialogDescription>
                            Set {pendingTeam} as your tournament champion pick?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="border-border bg-surface text-foreground hover:bg-surface-dark"
                            onClick={() => {
                                setPendingTeam(null);
                                toast.info("Selection canceled");
                            }}
                        >
                            Keep Current
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-primary text-white hover:bg-primary/80"
                            onClick={onConfirmSelection}
                        >
                            Select Champion
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
