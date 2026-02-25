import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, CheckCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { slipItems as initialSlipItems } from "@/data/mockData";
import type { SlipItem } from "@/types";

export function PredictionSlip() {
    const { pathname } = useLocation();
    const isChampionPage = pathname === "/tournament-champion";
    const isHiddenPage = ["/exact-score", "/my-predictions", "/leaderboard"].includes(pathname);

    const [items, setItems] = useState<SlipItem[]>(initialSlipItems);
    const [championPick, setChampionPick] = useState<{ team: string; flag: string } | null>({
        team: "Brazil",
        flag: "br",
    });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({ title: "", message: "", onConfirm: () => { } });

    useEffect(() => {
        setItems(initialSlipItems);
    }, []);

    const total = items.reduce((sum, item) => sum + item.weight, 0).toFixed(2);

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmConfig({ title, message, onConfirm });
        setConfirmOpen(true);
    };

    const onRemoveItem = (match: string) => {
        setItems((prev) => prev.filter((item) => item.match !== match));
        toast.info("Pick removed", { description: `${match} has been removed from your prediction slip.` });
    };

    const onSubmitPredictions = () => {
        if (!items.length) {
            toast.warning("No picks to submit", {
                description: "Add at least one prediction before submitting.",
            });
            return;
        }
        showConfirm("Submit Predictions", `Submit ${items.length} prediction(s) now?`, () => {
            toast.success("Predictions submitted", {
                description: `${items.length} prediction(s) were submitted successfully.`,
            });
        });
    };

    const onSaveChampion = () => {
        if (!championPick) {
            toast.warning("No champion selected", { description: "Please select a champion first." });
            return;
        }
        showConfirm("Save Champion Selection", `Save ${championPick.team} as your champion pick?`, () => {
            toast.success("Champion saved", {
                description: `${championPick.team} has been saved as your champion pick.`,
            });
        });
    };

    if (isHiddenPage) return null;

    return (
        <>
            <aside className="z-20 hidden w-[320px] flex-shrink-0 flex-col border-l border-border bg-surface-dark xl:flex">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-[#0d0d14] px-4 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
                        <Receipt className="h-4 w-4 text-primary" />
                        Prediction Slip
                    </h3>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                        {isChampionPage ? (championPick ? 1 : 0) : items.length}
                    </span>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {isChampionPage ? (
                        championPick ? (
                            <div className="relative rounded-lg border border-border bg-card p-3 ring-1 ring-primary/30">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setChampionPick(null);
                                        toast.info("Champion pick removed");
                                    }}
                                    className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <div className="mb-1 text-[10px] font-medium uppercase tracking-tight text-muted-foreground">
                                    Tournament Champion
                                </div>
                                <div className="mb-2 text-xs font-bold text-white">Champion Pick: {championPick.team}</div>
                                <div className="flex items-center justify-between rounded border border-border/50 bg-surface-dark p-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`fi fi-${championPick.flag} h-3 w-4 rounded-sm`} />
                                        <span className="text-[10px] font-bold text-primary">{championPick.team}</span>
                                    </div>
                                    <div className="text-[10px] italic text-muted-foreground">Admin Reward</div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded border border-dashed border-border p-3 text-center">
                                <p className="text-[10px] text-muted-foreground">No champion selected yet.</p>
                            </div>
                        )
                    ) : (
                        items.map((item) => (
                            <div key={item.match} className="relative rounded-lg border border-border bg-card p-3">
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(item.match)}
                                    className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <div className="mb-1 text-[10px] font-medium uppercase tracking-tight text-muted-foreground">
                                    Match Winner
                                </div>
                                <div className="mb-2 text-xs font-bold text-white">{item.match}</div>
                                <div className="flex items-center justify-between rounded border border-border/50 bg-surface-dark p-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-primary">Winner: {item.pick}</span>
                                        <span className="text-[9px] text-muted-foreground">Weight: {item.weight.toFixed(2)}</span>
                                    </div>
                                    <div className="text-xs font-bold text-success">+{item.weight.toFixed(2)} Pts</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="space-y-4 border-t border-border bg-[#0d0d14] p-4">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {isChampionPage ? "Total Selections" : "Total Potential Gain"}
                            </span>
                            <span className={`font-bold ${isChampionPage ? "text-white" : "text-success"}`}>
                                {isChampionPage ? (championPick ? 1 : 0) : `${total} Points`}
                            </span>
                        </div>

                        <div className="rounded-lg border border-border bg-card p-3">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="mt-0.5 h-4 w-4 text-success" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-foreground">
                                        Ready to {isChampionPage ? "Save" : "Submit"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {isChampionPage
                                            ? "Confirming champion selection."
                                            : `Confirming ${items.length} predictions.`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={isChampionPage ? onSaveChampion : onSubmitPredictions}
                        className="w-full bg-primary py-6 text-sm font-bold uppercase tracking-widest shadow-lg hover:bg-primary/80 active:scale-[0.98]"
                    >
                        {isChampionPage ? "Save Champion Selection" : "Submit Predictions"}
                    </Button>

                    <div className="text-center">
                        <p className="text-[10px] italic text-muted-foreground">
                            {isChampionPage
                                ? "Selection locked after first match kickoff."
                                : "Realtime result scoring is currently disabled."}
                        </p>
                    </div>
                </div>
            </aside>

            {/* Confirm Dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="border-border bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmConfig.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-border bg-surface text-foreground hover:bg-surface-dark">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmConfig.onConfirm}
                            className="bg-primary text-white hover:bg-primary/80"
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
