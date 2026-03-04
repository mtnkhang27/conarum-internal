import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Lock, Users } from "lucide-react";
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
import { TournamentSelector } from "@/components/TournamentSelector";
import { playerTeamsApi, playerPredictionsApi, playerActionsApi, playerTournamentsApi, playerTournamentQueryApi } from "@/services/playerApi";
import type { ChampionTeam } from "@/types";
import type { TournamentInfo } from "@/types";

export function TournamentChampionPage() {
    const location = useLocation();
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
            const t = allTournaments.find((x) => x.ID === tid) ?? null;
            setTournament(t);
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
            toast.error("Champion predictions are closed for this tournament.");
            return;
        }
        const currentSelection = teams.find((t) => t.selected);
        if (currentSelection?.name === team.name) {
            toast.info("Champion unchanged", {
                description: `${team.name} is already your champion pick.`,
            });
            return;
        }
        setPendingTeam(team);
        setConfirmOpen(true);
    };

    const onConfirmSelection = async () => {
        if (!pendingTeam || !tournamentId) return;
        setSubmitting(true);
        try {
            const res = await playerActionsApi.pickChampion(pendingTeam.ID, tournamentId);
            setTeams((prev) =>
                prev.map((t) => ({ ...t, selected: t.name === pendingTeam.name }))
            );
            toast.success("Champion updated", {
                description: res.message || `${pendingTeam.name} has been set as your champion pick.`,
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
                            Select Your Tournament Champion
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Predictions for the final winner. No points are calculated; rewards are issued by admin.
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
                        Champion predictions are{" "}
                        <strong>{tournament.championBettingStatus ?? tournament.status}</strong> for this tournament. You can no longer change your pick.
                    </div>
                )}

                {!tournamentId ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        Select a tournament above to view and pick your champion.
                    </p>
                ) : loading ? (
                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                        Loading teams…
                    </div>
                ) : teams.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        No teams available for selection.
                    </p>
                ) : (
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
                                        {team.selected ? "Selected" : "Select"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="border-border bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Champion Selection</AlertDialogTitle>
                        <AlertDialogDescription>
                            Set {pendingTeam?.name} as your tournament champion pick?
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
                            disabled={submitting}
                        >
                            {submitting ? "Saving…" : "Select Champion"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
