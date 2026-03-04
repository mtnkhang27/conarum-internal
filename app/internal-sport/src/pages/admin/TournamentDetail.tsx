import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Trophy,
    Lock,
    AlertTriangle,
    Users,
    CheckCircle2,
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
} from "@/services/adminApi";
import type {
    AdminTournament,
    AdminChampionPick,
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
        <div className="flex items-center justify-between gap-4 border-b border-border/30 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-white">{label}</h4>
                {description && (
                    <p className="text-xs text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="flex-shrink-0">{children}</div>
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

    const [tournament, setTournament] = useState<AdminTournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields (from Tournament entity directly)
    const [outcomePrize, setOutcomePrize] = useState("iPhone 15 Pro Max");
    const [championPrizePool, setChampionPrizePool] = useState("iPhone 15 Pro Max 256GB");
    const [championBettingStatus, setChampionBettingStatus] = useState<"open" | "locked">("open");
    const [championLockDate, setChampionLockDate] = useState<string | null>(null);
    const [championPicks, setChampionPicks] = useState<AdminChampionPick[]>([]);
    const [loadingPicks, setLoadingPicks] = useState(false);
    const isTournamentLocked = tournament?.status === "completed" || tournament?.status === "cancelled";
    const load = useCallback(async () => {
        if (!tournamentId) return;
        setLoading(true);
        try {
            const [tournaments, picks] = await Promise.all([
                tournamentsApi.list(),
                championPicksApi.listByTournament(tournamentId),
            ]);
            const t = tournaments.find((t) => t.ID === tournamentId);
            setTournament(t ?? null);
            setChampionPicks(picks);

            if (t) {
                setOutcomePrize(t.outcomePrize ?? "iPhone 15 Pro Max");
                setChampionPrizePool(t.championPrizePool ?? "iPhone 15 Pro Max 256GB");
                setChampionBettingStatus(t.championBettingStatus ?? "open");                setChampionLockDate(t.championLockDate ?? null);
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
            toast.success("Tournament configuration saved");
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

    if (loading || !tournament) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading tournament details…
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/admin/tournaments")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Trophy className="h-6 w-6 text-primary" />
                            {tournament.name}
                        </h1>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                            <span>
                                {tournament.startDate} — {tournament.endDate}
                            </span>
                            <Badge variant={statusVariant(tournament.status)}>
                                {tournament.status}
                            </Badge>
                        </div>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving || isTournamentLocked}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving…" : "Save Changes"}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="border-border bg-card p-5">
                    <div className="space-y-0">
                        {championBettingStatus === "locked" && (
                            <div className="mb-3 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                Prize fields are read-only while champion betting is{" "}
                                <strong>locked</strong>. Set status to{" "}
                                <strong>Open</strong> to edit.
                            </div>
                        )}
                        <ConfigRow label="Prize for Outcome Prediction" description="Description of the prize for the outcome prediction leaderboard winner">
                            <Input
                                className="w-56"
                                value={outcomePrize}
                                onChange={(e) => setOutcomePrize(e.target.value)}
                                disabled={championBettingStatus === "locked" || isTournamentLocked}
                            />
                        </ConfigRow>

                        <ConfigRow label="Prize Pool for Champion Prediction" description="Description of the champion prediction prize">
                            <Input
                                className="w-56"
                                value={championPrizePool}
                                onChange={(e) => setChampionPrizePool(e.target.value)}
                                disabled={championBettingStatus === "locked" || isTournamentLocked}
                            />
                        </ConfigRow>
                        <ConfigRow label="Betting Status" description="Current status of champion betting">
                            <select
                                className="rounded border border-border bg-surface-dark px-3 py-1.5 text-sm text-white"
                                value={championBettingStatus}
                                onChange={(e) =>
                                    setChampionBettingStatus(e.target.value as "open" | "locked")
                                }
                                disabled={isTournamentLocked}
                            >
                                <option value="open">Open</option>
                                <option value="locked">Locked</option>
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
                                Lock Champion Predictions
                            </Button>
                        </div>
                    )}
                </Card>

                {/* ── Champion Picks Overview ─────────────────────── */}
                <Card className="border-border bg-card p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Champion Picks ({championPicks.length} total)
                    </h3>

                    {championPicks.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No champion picks submitted yet.
                        </p>
                    ) : (
                        <>
                            {/* Group by team */}
                            {(() => {
                                const byTeam = new Map<string, { teamName: string; teamCrest: string | null; picks: AdminChampionPick[] }>();
                                for (const pick of championPicks) {
                                    const teamId = pick.team_ID;
                                    const entry = byTeam.get(teamId) ?? {
                                        teamName: pick.team?.name ?? teamId,
                                        teamCrest: pick.team?.crest ?? null,
                                        picks: [],
                                    };
                                    entry.picks.push(pick);
                                    byTeam.set(teamId, entry);
                                }
                                const sorted = [...byTeam.entries()].sort((a, b) => b[1].picks.length - a[1].picks.length);

                                // Find winners (those whose isCorrect=true)
                                const winners = championPicks.filter((p) => p.isCorrect === true);
                                const hasResults = championPicks.some((p) => p.isCorrect != null);

                                return (
                                    <div className="space-y-4">
                                        {/* Winners banner */}
                                        {hasResults && winners.length > 0 && (
                                            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                                                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-green-400">
                                                    <Trophy className="h-4 w-4" />
                                                    {winners.length} Winner{winners.length !== 1 && "s"} — Prize: {championPrizePool}
                                                    {winners.length > 1 && (
                                                        <span className="ml-1 text-xs font-normal text-green-400/70">
                                                            (split {winners.length} ways)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {winners.map((w) => (
                                                        <Badge key={w.ID} className="bg-green-500/20 text-green-300 border-green-500/30">
                                                            {w.player?.avatarUrl && (
                                                                <img src={w.player.avatarUrl} alt="" className="mr-1.5 h-4 w-4 rounded-full object-cover" />
                                                            )}
                                                            {w.player?.displayName ?? w.player_ID} → {w.team?.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {hasResults && winners.length === 0 && (
                                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                                                No correct champion picks.
                                            </div>
                                        )}

                                        {/* Picks grouped by team */}
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {sorted.map(([teamId, { teamName, teamCrest, picks }]) => (
                                                <div
                                                    key={teamId}
                                                    className="rounded-lg border border-border bg-surface-dark p-3"
                                                >
                                                    <div className="mb-2 flex items-center gap-2">
                                                        {teamCrest && (
                                                            <img src={teamCrest} alt="" className="h-5 w-5 object-contain" />
                                                        )}
                                                        <span className="text-sm font-bold text-white">{teamName}</span>
                                                        <Badge variant="outline" className="ml-auto text-[10px]">
                                                            {picks.length}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {picks.map((p) => (
                                                            <div key={p.ID} className="flex items-center gap-2 text-xs">
                                                                {p.player?.avatarUrl && (
                                                                    <img src={p.player.avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                                                                )}
                                                                <span className="text-muted-foreground">{p.player?.displayName ?? p.player_ID}</span>
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

            </div>
        </div>
    );
}
