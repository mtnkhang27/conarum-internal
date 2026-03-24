import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Lock, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { TournamentSelector } from "@/components/shared/TournamentSelector";
import { playerTeamsApi, playerPredictionsApi, playerActionsApi, playerTournamentsApi, playerTournamentQueryApi } from "@/services/playerApi";
import type { ChampionTeam } from "@/types";
import type { TournamentInfo } from "@/types";

export function TournamentChampionPage() {
    const location = useLocation();
    const { t } = useTranslation();
    const [tournamentId, setTournamentId] = useState("");
    const [tournament, setTournament] = useState<TournamentInfo | null>(null);
    const [teams, setTeams] = useState<ChampionTeam[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingTeam, setPendingTeam] = useState<ChampionTeam | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [pickCounts, setPickCounts] = useState<Map<string, number>>(new Map());

    const loadData = useCallback(async (tid: string) => {
        if (!tid) {
            setTeams([]);
            setTournament(null);
            setPickCounts(new Map());
            return;
        }
        setLoading(true);
        try {
            const [allTournaments, teamData, currentPick, counts] = await Promise.all([
                playerTournamentsApi.getAll(),
                playerTeamsApi.getByTournament(tid),
                playerPredictionsApi.getChampionPick(tid),
                playerTournamentQueryApi.getChampionPickCounts(tid),
            ]);
            const found = allTournaments.find((x) => x.ID === tid) ?? null;
            setTournament(found);
            setTeams(
                teamData.map((team) => ({
                    ...team,
                    selected: team.name === currentPick,
                }))
            );
            // Build map of teamName -> count
            const countMap = new Map<string, number>();
            for (const c of counts) {
                countMap.set(c.teamName, c.count);
            }
            setPickCounts(countMap);
        } catch {
            setTeams([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(tournamentId);
    }, [tournamentId, loadData, location.key]);

    const isBettingClosed =
        tournament?.championBettingStatus === "locked" ||
        tournament?.status === "completed" ||
        tournament?.status === "cancelled";

    const onSelectChampion = (team: ChampionTeam) => {
        if (isBettingClosed) {
            toast.error(t("champion.bettingLockedDesc"));
            return;
        }
        const currentSelection = teams.find((tm) => tm.selected);
        if (currentSelection?.name === team.name) {
            toast.info(t("champion.alreadyPicked", { team: team.name }));
            return;
        }
        setPendingTeam(team);
        setConfirmOpen(true);
    };

    const onConfirmSelection = async () => {
        if (!pendingTeam || !tournamentId) return;
        setSubmitting(true);
        const previousSelectedTeamName = teams.find((team) => team.selected)?.name;
        try {
            const res = await playerActionsApi.pickChampion(pendingTeam.ID, tournamentId);
            setTeams((prev) =>
                prev.map((tm) => ({ ...tm, selected: tm.name === pendingTeam.name }))
            );
            setPickCounts((prev) => {
                const next = new Map(prev);

                if (previousSelectedTeamName && previousSelectedTeamName !== pendingTeam.name) {
                    const previousCount = next.get(previousSelectedTeamName) ?? 0;
                    if (previousCount <= 1) {
                        next.delete(previousSelectedTeamName);
                    } else {
                        next.set(previousSelectedTeamName, previousCount - 1);
                    }
                }

                if (previousSelectedTeamName !== pendingTeam.name) {
                    next.set(pendingTeam.name, (next.get(pendingTeam.name) ?? 0) + 1);
                }

                return next;
            });
            toast.success(t("predictionSlip.championSaved"), {
                description: res.message || t("predictionSlip.championSavedDesc", { team: pendingTeam.name }),
            });
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setPendingTeam(null);
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-10">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                            <span className="h-6 w-1 rounded-full bg-secondary" />
                            {t("champion.title")}
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t("champion.subtitle")}
                        </p>
                    </div>
                    <TournamentSelector
                        selectedId={tournamentId}
                        onSelect={setTournamentId}
                    />
                </div>

                {/* Locked / closed banner */}
                {tournament && isBettingClosed && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                        <Lock className="h-4 w-4 flex-shrink-0" />
                        {t("champion.bettingLocked")} — <strong>{tournament.championBettingStatus ?? tournament.status}</strong>
                    </div>
                )}

                {!tournamentId ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        {t("champion.selectTeam")}
                    </p>
                ) : loading ? (
                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                        {t("common.loading")}
                    </div>
                ) : teams.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        {t("champion.noPick")}
                    </p>
                ) : (
                    <>
                    {/* Show how many users picked the same champion */}
                    {(() => {
                        const myPick = teams.find((tm) => tm.selected);
                        const samePickCount = myPick
                            ? Math.max(0, (pickCounts.get(myPick.name) ?? 0) - 1)
                            : 0;
                        if (myPick && samePickCount > 0) {
                            return (
                                <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                                    <Users className="h-4 w-4 flex-shrink-0" />
                                    <span>
                                        <strong>{samePickCount}</strong> {t("champion.samePickCount", { team: myPick.name, defaultValue: `người cùng chọn {{team}}` })}
                                    </span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {teams.map((team) => (
                            <div
                                key={team.name}
                                className={`group relative flex cursor-pointer flex-col items-center rounded-xl border p-6 text-center transition-all ${team.selected
                                    ? "border-primary bg-card ring-1 ring-primary glow-purple"
                                    : isBettingClosed
                                    ? "border-border bg-card opacity-60"
                                    : "border-border bg-card hover:border-primary"
                                    }`}
                            >
                                {team.crest ? (
                                    <img
                                        src={team.crest}
                                        alt={team.name}
                                        className={`mb-4 h-12 w-12 object-contain transition-transform ${team.selected ? "scale-110" : "group-hover:scale-105"}`}
                                    />
                                ) : (
                                    <span
                                        className={`fi fi-${team.flag} mb-4 !h-12 !w-16 rounded shadow-md transition-transform ${team.selected ? "scale-110" : "group-hover:scale-105"
                                            }`}
                                    />
                                )}
                                <span className={`mb-1 text-sm font-bold ${team.selected ? "text-primary" : "text-white"}`}>
                                    {team.name}
                                </span>
                                <span className="mb-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                                    {team.confederation}
                                </span>
                                {pickCounts.get(team.name) != null && pickCounts.get(team.name)! > 0 && (
                                    <span className="mb-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        {pickCounts.get(team.name)} pick{pickCounts.get(team.name)! !== 1 ? "s" : ""}
                                    </span>
                                )}
                                <div className="mt-auto w-full">
                                    <button
                                        type="button"
                                        onClick={() => onSelectChampion(team)}
                                        disabled={isBettingClosed}
                                        className={`w-full rounded border py-2 text-[11px] font-bold uppercase transition-colors ${team.selected
                                            ? "border-primary bg-primary text-white"
                                            : isBettingClosed
                                            ? "cursor-not-allowed border-border bg-surface-dark text-muted-foreground opacity-50"
                                            : "border-border bg-surface-dark text-muted-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-white"
                                            }`}
                                    >
                                        {team.selected ? t("champion.yourPick") : t("champion.confirmSelection")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="border-border bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("champion.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("champion.confirmDesc", { team: pendingTeam?.name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="border-border bg-surface text-foreground hover:bg-surface-dark"
                            onClick={() => {
                                setPendingTeam(null);
                            }}
                        >
                            {t("champion.cancelConfirm")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-primary text-white hover:bg-primary/80"
                            onClick={onConfirmSelection}
                            disabled={submitting}
                        >
                            {submitting ? t("common.saving") : t("champion.confirmSelection")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
