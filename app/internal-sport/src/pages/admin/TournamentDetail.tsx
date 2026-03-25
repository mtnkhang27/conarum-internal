import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    ArrowLeft,
    Save,
    Trophy,
    Lock,
    AlertTriangle,
    Users,
    CheckCircle2,
    Crown,
    Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    tournamentsApi,
    tournamentActionsApi,
    championPicksApi,
    playerTournamentStatsApi,
    tournamentTeamsApi,
} from "@/services/adminApi";
import type {
    AdminTournament,
    AdminChampionPickView,
    AdminTournamentStatsView,
    AdminTournamentTeamView,
} from "@/types/admin";

function ConfigRow({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-start gap-3 border-b border-border/30 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-white">{label}</h4>
                {description && (
                    <p className="text-xs text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="w-full sm:w-auto sm:flex-shrink-0">{children}</div>
        </div>
    );
}

function statusVariant(status: string) {
    switch (status) {
        case "active":
            return "default" as const;
        case "completed":
            return "secondary" as const;
        case "cancelled":
            return "destructive" as const;
        default:
            return "outline" as const;
    }
}

export function TournamentDetail() {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [tournament, setTournament] = useState<AdminTournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields (from Tournament entity directly)
    const [outcomePrize, setOutcomePrize] = useState("iPhone 15 Pro Max");
    const [championPrizePool, setChampionPrizePool] = useState("iPhone 15 Pro Max 256GB");
    const [championBettingStatus, setChampionBettingStatus] = useState<"open" | "locked">("open");
    const [championLockDate, setChampionLockDate] = useState<string | null>(null);
    const [championPicks, setChampionPicks] = useState<AdminChampionPickView[]>([]);
    const [tournamentStats, setTournamentStats] = useState<AdminTournamentStatsView[]>([]);
    const [tournamentTeams, setTournamentTeams] = useState<AdminTournamentTeamView[]>([]);
    const isTournamentLocked = tournament?.status === "completed" || tournament?.status === "cancelled";

    // Champion resolution state
    const [selectedChampionTeam, setSelectedChampionTeam] = useState<string>("");
    const [resolving, setResolving] = useState(false);

    const load = useCallback(async () => {
        if (!tournamentId) return;
        setLoading(true);
        try {
            const [tournaments, picks, stats, teams] = await Promise.all([
                tournamentsApi.list(),
                championPicksApi.listByTournament(tournamentId),
                playerTournamentStatsApi.listByTournament(tournamentId),
                tournamentTeamsApi.listByTournament(tournamentId),
            ]);
            const t = tournaments.find((t) => t.ID === tournamentId);
            setTournament(t ?? null);
            setChampionPicks(picks);
            setTournamentStats(stats);
            setTournamentTeams(teams);

            if (t) {
                setOutcomePrize(t.outcomePrize ?? "iPhone 15 Pro Max");
                setChampionPrizePool(t.championPrizePool ?? "iPhone 15 Pro Max 256GB");
                setChampionBettingStatus(t.championBettingStatus ?? "open");
                setChampionLockDate(t.championLockDate ?? null);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        load();
    }, [load]);

    async function handleSave() {
        if (!tournamentId) return;
        setSaving(true);
        try {
            await tournamentsApi.update(tournamentId, {
                outcomePrize,
                championPrizePool,
                championBettingStatus,
                championLockDate,
            } as Partial<AdminTournament>);
            toast.success(t("admin.tournamentDetail.configSaved"));
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleLockChampion() {
        if (!tournamentId) return;
        try {
            const res = await tournamentActionsApi.lockChampionPredictions(tournamentId);
            toast.success(res.message);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleResolveChampion() {
        if (!tournamentId || !selectedChampionTeam) return;
        setResolving(true);
        try {
            const res = await tournamentActionsApi.resolveChampionPicks(tournamentId, selectedChampionTeam);
            toast.success(res.message);
            load();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setResolving(false);
        }
    }

    // Derived data
    const hasChampionResults = championPicks.some((p) => p.isCorrect != null);
    const winners = championPicks.filter((p) => p.isCorrect === true);
    const uc2Leader = tournamentStats.length > 0 ? tournamentStats[0] : null;
    // Check if champion already resolved from bracket (TournamentTeam with finalPosition=1)
    const championTeam = tournamentTeams.find((tt) => tt.finalPosition === 1);

    if (loading || !tournament) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                {t("admin.tournamentDetail.loadingDetails")}
            </div>
        );
    }

    return (
        <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() => navigate("/admin/tournaments")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("common.back")}
                    </Button>
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
                            <Trophy className="h-6 w-6 text-primary" />
                            {tournament.name}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>
                                {tournament.startDate} — {tournament.endDate}
                            </span>
                            <Badge variant={statusVariant(tournament.status)}>
                                {tournament.status}
                            </Badge>
                        </div>
                    </div>
                </div>
                <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving || isTournamentLocked}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? t("common.saving") : t("admin.tournamentDetail.saveChanges")}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="border-border bg-card p-5">
                    <div className="space-y-0">
                        {championBettingStatus === "locked" && (
                            <div className="mb-3 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                {t("admin.tournamentDetail.prizeLockedWarning")}
                            </div>
                        )}
                        <ConfigRow label={t("admin.tournamentDetail.outcomePrize")} description={t("admin.tournamentDetail.outcomePrizeDesc")}>
                            <Input
                                className="w-56"
                                value={outcomePrize}
                                onChange={(e) => setOutcomePrize(e.target.value)}
                                disabled={championBettingStatus === "locked" || isTournamentLocked}
                            />
                        </ConfigRow>

                        <ConfigRow label={t("admin.tournamentDetail.championPrize")} description={t("admin.tournamentDetail.championPrizeDesc")}>
                            <Input
                                className="w-56"
                                value={championPrizePool}
                                onChange={(e) => setChampionPrizePool(e.target.value)}
                                disabled={championBettingStatus === "locked" || isTournamentLocked}
                            />
                        </ConfigRow>
                        <ConfigRow label={t("admin.tournamentDetail.bettingStatus")} description={t("admin.tournamentDetail.bettingStatusDesc")}>
                            <select
                                className="rounded border border-border bg-surface-dark px-3 py-1.5 text-sm text-white"
                                value={championBettingStatus}
                                onChange={(e) =>
                                    setChampionBettingStatus(e.target.value as "open" | "locked")
                                }
                                disabled={isTournamentLocked}
                            >
                                <option value="open">{t("common.status.open")}</option>
                                <option value="locked">{t("common.status.locked")}</option>
                            </select>
                        </ConfigRow>
                    </div>
                    {championBettingStatus === "open" && (
                        <div className="mt-4 border-t border-border pt-4">
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={handleLockChampion}
                                disabled={isTournamentLocked}
                            >
                                <Lock className="mr-2 h-4 w-4" />
                                {t("admin.tournamentDetail.lockChampionPredictions")}
                            </Button>
                        </div>
                    )}
                </Card>

                {/* ── Champion Picks Overview ─────────────────────── */}
                <Card className="border-border bg-card p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {t("admin.tournamentDetail.championPicks")} ({t("admin.tournamentDetail.totalPicks", { count: championPicks.length })})
                    </h3>

                    {/* Manual resolve champion (if not yet resolved) */}
                    {!hasChampionResults && championPicks.length > 0 && championBettingStatus === "locked" && (
                        <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                            <p className="mb-2 text-sm text-blue-400">
                                <strong>{t("admin.tournamentDetail.resolveChampion")}</strong> {t("admin.tournamentDetail.resolveChampionDesc")}
                                {championTeam && (
                                    <span className="ml-1">({t("admin.tournamentDetail.detectedChampion", { team: championTeam.teamName })})</span>
                                )}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <select
                                    className="flex-1 rounded border border-border bg-surface-dark px-3 py-1.5 text-sm text-white"
                                    value={selectedChampionTeam}
                                    onChange={(e) => setSelectedChampionTeam(e.target.value)}
                                >
                                    <option value="">{t("admin.tournamentDetail.selectChampionTeam")}</option>
                                    {tournamentTeams
                                        .filter((tt) => tt.teamName)
                                        .sort((a, b) => (a.teamName ?? "").localeCompare(b.teamName ?? ""))
                                        .map((tt) => (
                                            <option key={tt.team_ID} value={tt.team_ID}>
                                                {tt.teamName}
                                            </option>
                                        ))}
                                </select>
                                <Button
                                    className="w-full sm:w-auto"
                                    onClick={handleResolveChampion}
                                    disabled={!selectedChampionTeam || resolving}
                                    size="sm"
                                >
                                    <Crown className="mr-2 h-4 w-4" />
                                    {resolving ? t("common.resolving") : t("admin.tournamentDetail.resolve")}
                                </Button>
                            </div>
                        </div>
                    )}

                    {championPicks.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {t("admin.tournamentDetail.noPicksYet")}
                        </p>
                    ) : (
                        <>
                            {/* Group by team */}
                            {(() => {
                                const byTeam = new Map<string, { teamName: string; teamCrest: string | null; picks: AdminChampionPickView[] }>();
                                for (const pick of championPicks) {
                                    const teamId = pick.team_ID;
                                    const entry = byTeam.get(teamId) ?? {
                                        teamName: pick.teamName ?? teamId,
                                        teamCrest: pick.teamCrest ?? null,
                                        picks: [],
                                    };
                                    entry.picks.push(pick);
                                    byTeam.set(teamId, entry);
                                }
                                const sorted = [...byTeam.entries()].sort((a, b) => b[1].picks.length - a[1].picks.length);

                                return (
                                    <div className="space-y-4">
                                        {/* Winners banner (UC3) */}
                                        {hasChampionResults && winners.length > 0 && (
                                            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                                                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-green-400">
                                                    <Trophy className="h-4 w-4" />
                                                    {t("admin.tournamentDetail.uc3Prize", { count: winners.length })}{winners.length !== 1 && "s"}
                                                </div>
                                                <div className="mb-2 text-xs text-green-400/80">
                                                    {t("admin.tournamentDetail.prize")}: <strong>{championPrizePool || "—"}</strong>
                                                    {winners.length > 1 && (
                                                        <span> ({t("admin.tournamentDetail.split", { count: winners.length })})</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {winners.map((w) => (
                                                        <Badge key={w.ID} className="bg-green-500/20 text-green-300 border-green-500/30">
                                                            {w.playerAvatar && (
                                                                <img src={w.playerAvatar} alt="" className="mr-1.5 h-4 w-4 rounded-full object-cover" />
                                                            )}
                                                            {w.playerName ?? w.player_ID} → {w.teamName}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {hasChampionResults && winners.length === 0 && (
                                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                                                {t("admin.tournamentDetail.noCorrectPicks")}
                                            </div>
                                        )}

                                        {/* Picks grouped by team */}
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {sorted.map(([teamId, { teamName, teamCrest, picks }]) => (
                                                <div
                                                    key={teamId}
                                                    className={`rounded-lg border p-3 ${
                                                        hasChampionResults && picks[0]?.isCorrect === true
                                                            ? "border-green-500/30 bg-green-500/5"
                                                            : "border-border bg-surface-dark"
                                                    }`}
                                                >
                                                    <div className="mb-2 flex items-center gap-2">
                                                        {teamCrest && (
                                                            <img src={teamCrest} alt="" className="h-5 w-5 object-contain" />
                                                        )}
                                                        <span className="text-sm font-bold text-white">{teamName}</span>
                                                        {hasChampionResults && picks[0]?.isCorrect === true && (
                                                            <Crown className="h-3.5 w-3.5 text-yellow-400" />
                                                        )}
                                                        <Badge variant="outline" className="ml-auto text-[10px]">
                                                            {picks.length}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {picks.map((p) => (
                                                            <div key={p.ID} className="flex items-center gap-2 text-xs">
                                                                {p.playerAvatar && (
                                                                    <img src={p.playerAvatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                                                                )}
                                                                <span className="text-muted-foreground">{p.playerName ?? p.player_ID}</span>
                                                                {p.isCorrect === true && <CheckCircle2 className="ml-auto h-3 w-3 text-green-400" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </Card>

                {/* ── UC2 Outcome Prediction Leaderboard Winner ────── */}
                {tournamentStats.length > 0 && (
                    <Card className="border-border bg-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                            <Award className="h-4 w-4" />
                            {t("admin.tournamentDetail.uc2Title")}
                        </h3>

                        {/* Winner banner */}
                        {uc2Leader && (
                            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-4">
                                <div className="mb-1 flex items-center gap-2 text-sm font-bold text-primary">
                                    <Trophy className="h-4 w-4" />
                                    {t("admin.tournamentDetail.uc2Winner", { prize: outcomePrize || "—" })}
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    {uc2Leader.playerAvatar && (
                                        <img src={uc2Leader.playerAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {uc2Leader.playerName ?? uc2Leader.player_ID}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {uc2Leader.totalPoints} pts · {uc2Leader.totalCorrect}/{uc2Leader.totalPredictions} correct
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top players table */}
                        <div className="space-y-1">
                            {tournamentStats.slice(0, 10).map((s, idx) => (
                                <div
                                    key={s.ID}
                                    className={`flex items-center gap-3 rounded px-3 py-2 text-sm ${
                                        idx === 0 ? "bg-primary/5" : ""
                                    }`}
                                >
                                    <span className={`w-6 text-center font-bold ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>
                                        {idx + 1}
                                    </span>
                                    {s.playerAvatar && (
                                        <img src={s.playerAvatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                                    )}
                                    <span className="flex-1 text-white">
                                        {s.playerName ?? s.player_ID}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {s.totalCorrect}/{s.totalPredictions}
                                    </span>
                                    <span className="w-16 text-right font-semibold text-white">
                                        {s.totalPoints} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

            </div>
        </div>
    );
}
