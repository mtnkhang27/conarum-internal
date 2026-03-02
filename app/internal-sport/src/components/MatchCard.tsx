import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Match } from "@/types";
import { playerActionsApi } from "@/services/playerApi";
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
    // Track the initial state loaded from server to distinguish "has existing prediction" vs "new pick"
    const [initialOption, setInitialOption] = useState(match.selectedOption || "");
    const [selectedOption, setSelectedOption] = useState(match.selectedOption || "");
    const [scores, setScores] = useState<{ home: number; away: number }[]>(() => {
        const existing = match.existingScores || [];
        return [
            existing[0] || { home: 0, away: 0 },
            existing[1] || { home: 0, away: 0 },
            existing[2] || { home: 0, away: 0 },
        ];
    });
    const [initialScores, setInitialScores] = useState<{ home: number; away: number }[]>(() => {
        const existing = match.existingScores || [];
        return [
            existing[0] || { home: 0, away: 0 },
            existing[1] || { home: 0, away: 0 },
            existing[2] || { home: 0, away: 0 },
        ];
    });
    const [isSaving, setIsSaving] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    // Track whether the user just cancelled an existing prediction (to keep Submit active)
    const [justCancelled, setJustCancelled] = useState(false);

    useEffect(() => {
        setSelectedOption(match.selectedOption || "");
        setInitialOption(match.selectedOption || "");
    }, [match.selectedOption]);

    useEffect(() => {
        const existing = match.existingScores || [];
        const newScores = [
            existing[0] || { home: 0, away: 0 },
            existing[1] || { home: 0, away: 0 },
            existing[2] || { home: 0, away: 0 },
        ];
        setScores(newScores);
        setInitialScores(newScores);
    }, [match.existingScores]);

    const hasExistingPrediction = !!initialOption;
    const hasCurrentSelection = !!selectedOption;

    // Check if user has made any changes from the loaded state
    const hasChanges = selectedOption !== initialOption ||
        JSON.stringify(scores) !== JSON.stringify(initialScores);

    // Determine button states:
    // - No prediction + no changes → both disabled
    // - User made changes (picked/scored) → both active
    // - Existing prediction loaded → both active
    // - Just cancelled existing prediction → Submit active (to re-submit), Cancel disabled until user picks
    const isIdle = !hasExistingPrediction && !hasCurrentSelection && !hasChanges && !justCancelled;
    const cancelDisabled = isSaving || isIdle;
    const submitDisabled = isSaving || (!hasCurrentSelection && !justCancelled);

    const onPickOption = (option: string) => {
        if (isCompleted || isSaving) return;
        setSelectedOption((prev) => (prev === option ? "" : option));
        // Once user picks after cancel, clear the justCancelled flag
        if (justCancelled) setJustCancelled(false);
    };

    const onScoreChange = (rowIdx: number, side: "home" | "away", value: string) => {
        if (isCompleted || isSaving) return;
        setScores((prev) => {
            const next = [...prev];
            next[rowIdx] = { ...next[rowIdx], [side]: clampScore(value) };
            return next;
        });
    };

    // Cancel button handler
    const onCancel = () => {
        if (isCompleted || isSaving) return;

        if (hasExistingPrediction) {
            // Has existing prediction from server → show confirmation popup
            setCancelConfirmOpen(true);
        } else {
            // No existing prediction → just clear the local selection
            setSelectedOption("");
            setScores([
                { home: 0, away: 0 },
                { home: 0, away: 0 },
                { home: 0, away: 0 },
            ]);
        }
    };

    // Confirm cancel of existing prediction (delete from server)
    const onConfirmCancelPrediction = async () => {
        setCancelConfirmOpen(false);
        setIsSaving(true);
        try {
            const res = await playerActionsApi.cancelMatchPrediction(match.id);
            toast.success("Prediction removed", {
                description: res.message || `Prediction removed for ${match.home.name} vs ${match.away.name}.`,
            });
            // Clear all local state
            setSelectedOption("");
            setInitialOption("");
            setScores([
                { home: 0, away: 0 },
                { home: 0, away: 0 },
                { home: 0, away: 0 },
            ]);
            setInitialScores([
                { home: 0, away: 0 },
                { home: 0, away: 0 },
                { home: 0, away: 0 },
            ]);
            // Keep Submit active so user can make a new prediction if they want
            setJustCancelled(true);
        } catch (e: any) {
            toast.error("Failed to remove prediction", {
                description: e.message || "Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Submit prediction  
    const onSubmit = async () => {
        if (isCompleted || isSaving || !hasCurrentSelection) return;

        setIsSaving(true);

        let apiPick = "draw";
        if (selectedOption === match.home.name) apiPick = "home";
        else if (selectedOption === match.away.name) apiPick = "away";

        try {
            const scoresToSend = match.allowScorePrediction
                ? scores.map((s) => ({ homeScore: s.home, awayScore: s.away }))
                : [];
            const res = await playerActionsApi.submitMatchPrediction(
                match.id,
                apiPick,
                scoresToSend
            );
            toast.success("Prediction saved", {
                description: res.message || `Pick & scores saved for ${match.home.name} vs ${match.away.name}.`,
            });
            // Update initial state to reflect saved prediction
            setInitialOption(selectedOption);
            setInitialScores([...scores]);
        } catch (e: any) {
            toast.error("Failed to save", {
                description: e.message || "Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="match-card rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg">
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <span className="rounded bg-success/15 px-2 py-1 text-[10px] font-bold text-success">
                            +1 PT
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

                        <div className="flex flex-col items-center gap-2 px-3">
                            {match.allowScorePrediction ? (
                                scores.map((row, i) => (
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
                                ))
                            ) : (
                                <span className="text-2xl font-black tracking-widest text-muted-foreground">
                                    VS
                                </span>
                            )}
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
                            {isCompleted
                                ? "Final Pick"
                                : match.allowScorePrediction
                                    ? "Pick Winner & Score"
                                    : "Pick Outcome"}
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
                            {/* Cancel button */}
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={cancelDisabled}
                                className="rounded-lg border border-border bg-surface-dark px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500 hover:text-red-400 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Cancel
                            </button>
                            {/* Submit button */}
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={submitDisabled}
                                className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:pointer-events-none ${hasCurrentSelection || justCancelled
                                    ? "bg-primary hover:bg-primary/90"
                                    : "bg-primary/40"
                                    }`}
                            >
                                {isSaving ? "Saving…" : "Submit Prediction"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                <AlertDialogContent className="border-border bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Prediction?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove your prediction for{" "}
                            <strong>{match.home.name} vs {match.away.name}</strong>?
                            This will clear your pick and any score bets for this match.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-border bg-surface text-foreground hover:bg-surface-dark">
                            Keep
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirmCancelPrediction}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Yes, Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
