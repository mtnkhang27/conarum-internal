import { useEffect, useState } from "react";
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
import {
    playerActionsApi,
    playerTeamsApi,
    playerTournamentsApi,
    type PlayerChampionPickerSnapshot,
    type PlayerChampionPickerTeam,
} from "@/services/playerApi";
import type { ChampionTeam, TournamentInfo } from "@/types";

export function TournamentChampionPage() {
    const location = useLocation();
    const { t } = useTranslation();
    const [tournamentId, setTournamentId] = useState("");
    const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
    const [teams, setTeams] = useState<PlayerChampionPickerTeam[]>([]);
    const [pickerSnapshot, setPickerSnapshot] = useState<PlayerChampionPickerSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingTeam, setPendingTeam] = useState<ChampionTeam | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const tournament = tournaments.find((item) => item.ID === tournamentId) ?? null;

    useEffect(() => {
        let active = true;

        playerTournamentsApi.getAll()
            .then((list) => {
                if (!active) {
                    return;
                }

                setTournaments(list);
                if (list.length > 0) {
                    const defaultTournament = list.find((item) => item.status === "active") ?? list[0];
                    setTournamentId((current) => current || defaultTournament.ID);
                }
            })
            .catch(() => {
                if (active) {
                    setTournaments([]);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!tournamentId) {
            setTeams([]);
            setPickerSnapshot(null);
            setLoading(false);
            return;
        }

        let active = true;
        setLoading(true);

        playerTeamsApi.getChampionPickerByTournament(tournamentId)
            .then((snapshot) => {
                if (active) {
                    setTeams(snapshot.teams);
                    setPickerSnapshot(snapshot);
                }
            })
            .catch(() => {
                if (active) {
                    setTeams([]);
                    setPickerSnapshot(null);
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [tournamentId, location.key]);

    const championBettingStatus =
        pickerSnapshot?.championBettingStatus ?? tournament?.championBettingStatus;
    const tournamentStatus =
        pickerSnapshot?.tournamentStatus ?? tournament?.status;
    const isBettingClosed =
        championBettingStatus === "locked" ||
        tournamentStatus === "completed" ||
        tournamentStatus === "cancelled";
    const closedStatusLabel =
        championBettingStatus === "locked"
            ? championBettingStatus
            : tournamentStatus;

    const onSelectChampion = (team: ChampionTeam) => {
        if (isBettingClosed) {
            toast.error(t("champion.bettingLockedDesc"));
            return;
        }

        const currentSelection = teams.find((tm) => tm.selected);
        if (currentSelection?.ID === team.ID) {
            toast.info(t("champion.alreadyPicked", { team: team.name }));
            return;
        }

        setPendingTeam(team);
        setConfirmOpen(true);
    };

    const onConfirmSelection = async () => {
        if (!pendingTeam || !tournamentId) {
            return;
        }

        setSubmitting(true);
        const previousSelectedTeamId = teams.find((team) => team.selected)?.ID;

        try {
            const res = await playerActionsApi.pickChampion(pendingTeam.ID, tournamentId);
            setTeams((prev) =>
                prev.map((tm) => {
                    if (tm.ID === pendingTeam.ID) {
                        return {
                            ...tm,
                            selected: true,
                            pickCount:
                                previousSelectedTeamId === pendingTeam.ID
                                    ? tm.pickCount
                                    : tm.pickCount + 1,
                        };
                    }

                    if (tm.selected && previousSelectedTeamId !== pendingTeam.ID) {
                        return {
                            ...tm,
                            selected: false,
                            pickCount: Math.max(0, tm.pickCount - 1),
                        };
                    }

                    return { ...tm, selected: false };
                })
            );

            toast.success(t("predictionSlip.championSaved"), {
                description:
                    res.message ||
                    t("predictionSlip.championSavedDesc", { team: pendingTeam.name }),
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Request failed";
            toast.error(message);
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
                        tournaments={tournaments}
                    />
                </div>

                {tournament && isBettingClosed && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                        <Lock className="h-4 w-4 flex-shrink-0" />
                        {t("champion.bettingLocked")} - <strong>{closedStatusLabel}</strong>
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
                        {(() => {
                            const myPick = teams.find((tm) => tm.selected);
                            const samePickCount = myPick
                                ? Math.max(0, myPick.pickCount - 1)
                                : 0;

                            if (myPick && samePickCount > 0) {
                                return (
                                    <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                                        <Users className="h-4 w-4 flex-shrink-0" />
                                        <span>
                                            <strong>{samePickCount}</strong>{" "}
                                            {t("champion.samePickCount", {
                                                team: myPick.name,
                                                defaultValue: "nguoi cung chon {{team}}",
                                            })}
                                        </span>
                                    </div>
                                );
                            }

                            return null;
                        })()}

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {teams.map((team) => (
                                <div
                                    key={team.ID}
                                    className={`group relative flex cursor-pointer flex-col items-center rounded-xl border p-6 text-center transition-all ${
                                        team.selected
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
                                            className={`mb-4 h-12 w-12 object-contain transition-transform ${
                                                team.selected ? "scale-110" : "group-hover:scale-105"
                                            }`}
                                        />
                                    ) : (
                                        <span
                                            className={`fi fi-${team.flag} mb-4 !h-12 !w-16 rounded shadow-md transition-transform ${
                                                team.selected ? "scale-110" : "group-hover:scale-105"
                                            }`}
                                        />
                                    )}
                                    <span className={`mb-1 text-sm font-bold ${team.selected ? "text-primary" : "text-white"}`}>
                                        {team.name}
                                    </span>
                                    <span className="mb-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                                        {team.confederation}
                                    </span>
                                    {team.pickCount > 0 && (
                                        <span className="mb-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            {team.pickCount} pick{team.pickCount !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                    <div className="mt-auto w-full">
                                        <button
                                            type="button"
                                            onClick={() => onSelectChampion(team)}
                                            disabled={isBettingClosed}
                                            className={`w-full rounded border py-2 text-[11px] font-bold uppercase transition-colors ${
                                                team.selected
                                                    ? "border-primary bg-primary text-white"
                                                    : isBettingClosed
                                                      ? "cursor-not-allowed border-border bg-surface-dark text-muted-foreground opacity-50"
                                                      : "border-border bg-surface-dark text-muted-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-white"
                                            }`}
                                        >
                                            {team.selected
                                                ? t("champion.yourPick")
                                                : t("champion.confirmSelection")}
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
