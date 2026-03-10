import { useState } from "react";
import { useLocation } from "react-router-dom";
import { X, CheckCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
import type { SlipItem } from "@/types";

export function PredictionSlip() {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const isChampionPage = pathname === "/tournament-champion";
    const isHiddenPage = ["/exact-score", "/my-predictions", "/leaderboard"].includes(pathname);

    const [items, setItems] = useState<SlipItem[]>([]);
    const [championPick, setChampionPick] = useState<{ team: string; flag: string; crest?: string } | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({ title: "", message: "", onConfirm: () => { } });

    const total = items.length;

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmConfig({ title, message, onConfirm });
        setConfirmOpen(true);
    };

    const onRemoveItem = (match: string) => {
        setItems((prev) => prev.filter((item) => item.match !== match));
        toast.info(t("predictionSlip.pickRemoved"), { description: t("predictionSlip.pickRemovedDesc", { match }) });
    };

    const onSubmitPredictions = () => {
        if (!items.length) {
            toast.warning(t("predictionSlip.noPicks"), {
                description: t("predictionSlip.noPicksDesc"),
            });
            return;
        }
        showConfirm(t("predictionSlip.submitTitle"), t("predictionSlip.submitMessage", { count: items.length }), () => {
            toast.success(t("predictionSlip.predictionsSubmitted"), {
                description: t("predictionSlip.predictionsSubmittedDesc", { count: items.length }),
            });
        });
    };

    const onSaveChampion = () => {
        if (!championPick) {
            toast.warning(t("predictionSlip.noChampion"), { description: t("predictionSlip.noChampionDesc") });
            return;
        }
        showConfirm(t("predictionSlip.saveChampionTitle"), t("predictionSlip.saveChampionMessage", { team: championPick.team }), () => {
            toast.success(t("predictionSlip.championSaved"), {
                description: t("predictionSlip.championSavedDesc", { team: championPick.team }),
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
                        {t("predictionSlip.title")}
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
                                        toast.info(t("predictionSlip.championPickRemoved"));
                                    }}
                                    className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <div className="mb-1 text-[10px] font-medium uppercase tracking-tight text-muted-foreground">
                                    {t("predictionSlip.tournamentChampion")}
                                </div>
                                <div className="mb-2 text-xs font-bold text-white">{t("predictionSlip.championPick", { team: championPick.team })}</div>
                                <div className="flex items-center justify-between rounded border border-border/50 bg-surface-dark p-2">
                                    <div className="flex items-center gap-2">
                                        {championPick.crest
                                            ? <img src={championPick.crest} alt={championPick.team} className="h-4 w-4 object-contain" />
                                            : <span className={`fi fi-${championPick.flag} h-3 w-4 rounded-sm`} />}
                                        <span className="text-[10px] font-bold text-primary">{championPick.team}</span>
                                    </div>
                                    <div className="text-[10px] italic text-muted-foreground">{t("predictionSlip.adminReward")}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded border border-dashed border-border p-3 text-center">
                                <p className="text-[10px] text-muted-foreground">{t("predictionSlip.noChampionSelected")}</p>
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
                                    {t("predictionSlip.matchWinner")}
                                </div>
                                <div className="mb-2 text-xs font-bold text-white">{item.match}</div>
                                <div className="flex items-center justify-between rounded border border-border/50 bg-surface-dark p-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-primary">{t("predictionSlip.winner", { pick: item.pick })}</span>
                                        <span className="text-[9px] text-muted-foreground">{t("predictionSlip.pointIfCorrect")}</span>
                                    </div>
                                    <div className="text-xs font-bold text-success">+1 PT</div>
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
                                {isChampionPage ? t("predictionSlip.totalSelections") : t("predictionSlip.totalPotentialGain")}
                            </span>
                            <span className={`font-bold ${isChampionPage ? "text-white" : "text-success"}`}>
                                {isChampionPage ? (championPick ? 1 : 0) : t("predictionSlip.picks", { count: total })}
                            </span>
                        </div>

                        <div className="rounded-lg border border-border bg-card p-3">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="mt-0.5 h-4 w-4 text-success" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-foreground">
                                        {isChampionPage ? t("predictionSlip.readyToSave") : t("predictionSlip.readyToSubmit")}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {isChampionPage
                                            ? t("predictionSlip.confirmingChampion")
                                            : t("predictionSlip.confirmingPredictions", { count: items.length })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={isChampionPage ? onSaveChampion : onSubmitPredictions}
                        className="w-full bg-primary py-6 text-sm font-bold uppercase tracking-widest shadow-lg hover:bg-primary/80 active:scale-[0.98]"
                    >
                        {isChampionPage ? t("predictionSlip.saveChampionSelection") : t("predictionSlip.submitPredictions")}
                    </Button>

                    <div className="text-center">
                        <p className="text-[10px] italic text-muted-foreground">
                            {isChampionPage
                                ? t("predictionSlip.selectionLocked")
                                : t("predictionSlip.realtimeDisabled")}
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
                            {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmConfig.onConfirm}
                            className="bg-primary text-white hover:bg-primary/80"
                        >
                            {t("common.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
