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

type PickKey = "" | "home" | "draw" | "away";

function clampScore(value: string) {
    if (value === "") return 0;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return 0;
    return Math.min(9, Math.max(0, parsed));
}

function normalizePick(option: string | undefined, homeName: string, awayName: string): PickKey {
    if (!option) return "";
    if (option === "home" || option === "away" || option === "draw") return option;
    if (option === "Draw") return "draw";
    if (option === homeName) return "home";
    if (option === awayName) return "away";
    return "";
}

function optionKeyAt(index: number): PickKey {
    if (index === 0) return "home";
    if (index === 1) return "draw";
    if (index === 2) return "away";
    return "";
}

function getTeamButtonClass(optionKey: PickKey, selected: PickKey, isCompleted: boolean, isSaving: boolean) {
    if (selected === optionKey) {
        return "rounded-lg border border-primary bg-primary py-2 text-xs font-bold text-white shadow-lg transition-all glow-purple";
    }
    return `rounded-lg border border-border bg-surface-dark py-2 text-xs font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary ${isCompleted || isSaving ? "pointer-events-none opacity-70" : ""
        }`;
}

interface MatchCardProps {
    match: Match;
    isCompleted?: boolean;
    onPredictionChange?: () => void;
}

export function MatchCard({ match, isCompleted = false, onPredictionChange }: MatchCardProps) {
    const maxBets = match.maxBets ?? 3;
    const isSlotBet = match.betTarget === "slot";
    const slotId = match.slotId || match.id;
    // Track the initial state loaded from server to distinguish "has existing prediction" vs "new pick"
    const [initialOption, setInitialOption] = useState<PickKey>(
        normalizePick(match.selectedOption, match.home.name, match.away.name)
    );
    const [selectedOption, setSelectedOption] = useState<PickKey>(
        normalizePick(match.selectedOption, match.home.name, match.away.name)
    );
    const [scores, setScores] = useState<{ home: number; away: number }[]>(() => {
        const existing = match.existingScores || [];
        return Array.from({ length: maxBets }, (_, i) => existing[i] || { home: 0, away: 0 });
    });
    const [initialScores, setInitialScores] = useState<{ home: number; away: number }[]>(() => {
        const existing = match.existingScores || [];
        return Array.from({ length: maxBets }, (_, i) => existing[i] || { home: 0, away: 0 });
    });
    const [isSaving, setIsSaving] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    // Track whether the user just cancelled an existing prediction (to keep Submit active)
    const [justCancelled, setJustCancelled] = useState(false);

    useEffect(() => {
        const normalized = normalizePick(match.selectedOption, match.home.name, match.away.name);
        setSelectedOption(normalized);
        setInitialOption(normalized);
    }, [match.selectedOption, match.home.name, match.away.name]);

    useEffect(() => {
        const existing = match.existingScores || [];
        const newScores = Array.from({ length: maxBets }, (_, i) => existing[i] || { home: 0, away: 0 });
        setScores(newScores);
        setInitialScores(newScores);
    }, [match.existingScores, maxBets]);

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

    const onPickOption = (option: PickKey) => {
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
            setScores(Array.from({ length: maxBets }, () => ({ home: 0, away: 0 })));
        }
    };

    // Confirm cancel of existing prediction (delete from server)
    const onConfirmCancelPrediction = async () => {
        setCancelConfirmOpen(false);
        setIsSaving(true);
        try {
            const res = isSlotBet
                ? await playerActionsApi.cancelSlotPrediction(slotId)
                : await playerActionsApi.cancelMatchPrediction(match.id);
            toast.success("Prediction removed", {
                description: res.message || `Prediction removed for ${match.home.name} vs ${match.away.name}.`,
            });
            // Clear all local state
            setSelectedOption("");
            setInitialOption("");
            const emptyScores = Array.from({ length: maxBets }, () => ({ home: 0, away: 0 }));
            setScores(emptyScores);
            setInitialScores(emptyScores);
            // Keep Submit active so user can make a new prediction if they want
            setJustCancelled(true);
            // Notify parent to refresh predictions list
            onPredictionChange?.();
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
        const apiPick = selectedOption;

        try {
            const scoresToSend = match.scoreBettingEnabled
                ? scores.map((s) => ({ homeScore: s.home, awayScore: s.away }))
                : [];
            const res = isSlotBet
                ? await playerActionsApi.submitSlotPrediction(slotId, apiPick, scoresToSend)
                : await playerActionsApi.submitMatchPrediction(match.id, apiPick, scoresToSend);
            toast.success("Prediction saved", {
                description: res.message || `Pick & scores saved for ${match.home.name} vs ${match.away.name}.`,
            });
            // Update initial state to reflect saved prediction
            setInitialOption(selectedOption);
            setInitialScores([...scores]);
            // Notify parent to refresh predictions list
            onPredictionChange?.();
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
                        <div className="flex items-center gap-2">
                            <span className="rounded bg-success/15 px-2 py-1 text-[10px] font-bold text-success">
                                {match.outcomePoints} pts
                            </span>
                            {match.stage && (
                                <span className="rounded border border-border bg-surface-dark px-2 py-1 text-[10px] font-bold text-foreground/80">
                                    {match.stage}
                                </span>
                            )}
                            {isSlotBet && (
                                <span className="rounded border border-warning/40 bg-warning/15 px-2 py-1 text-[10px] font-bold text-warning">
                                    Future Round
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {match.timeLabel}
                        </span>
                    </div>

                    <div className="mb-4 flex items-center justify-between border-y border-border/50 py-4">
                        <div className="flex flex-1 flex-col items-center justify-start h-full">
                            {match.home.crest
                                ? <img src={match.home.crest} alt={match.home.name} className="mb-2 h-8 w-8 object-contain" />
                                : match.home.flag
                                    ? <span className={`fi fi-${match.home.flag} mb-2 !w-8 rounded-sm text-2xl shadow-md`} />
                                    : <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-dark text-xs font-black text-muted-foreground">?</span>}
                            <span className="text-sm font-bold text-white text-center">{match.home.name}</span>
                        </div>

                        <div className="flex flex-col items-center gap-2 px-3">
                            {match.scoreBettingEnabled ? (
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

                        <div className="flex flex-1 flex-col items-center justify-start h-full">
                            {match.away.crest
                                ? <img src={match.away.crest} alt={match.away.name} className="mb-2 h-8 w-8 object-contain" />
                                : match.away.flag
                                    ? <span className={`fi fi-${match.away.flag} mb-2 !w-8 rounded-sm text-2xl shadow-md`} />
                                    : <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-dark text-xs font-black text-muted-foreground">?</span>}
                            <span className="text-sm font-bold text-white text-center">{match.away.name}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {isCompleted
                                ? "Final Pick"
                                : match.scoreBettingEnabled
                                    ? "Pick Winner & Score"
                                    : "Pick Outcome"}
                        </span>
                        {isSaving && (
                            <span className="text-[10px] font-bold text-primary animate-pulse">Saving…</span>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {match.options.map((option, idx) => {
                            const optionKey = optionKeyAt(idx);
                            return (
                                <button
                                    type="button"
                                    key={`${option}-${idx}`}
                                    onClick={() => onPickOption(optionKey)}
                                    disabled={isSaving || isCompleted || !optionKey}
                                    className={getTeamButtonClass(optionKey, selectedOption, isCompleted, isSaving)}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                    {!isCompleted && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {/* Cancel button */}
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={cancelDisabled}
                                className="rounded-lg border border-border bg-surface-dark px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500 hover:text-red-400 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Cancel Submission
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
