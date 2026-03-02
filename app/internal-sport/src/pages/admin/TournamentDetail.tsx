import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Trophy,
    TrendingUp,
    Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
    tournamentsApi,
    tournamentPrizeConfigApi,
    tournamentChampionConfigApi,
} from "@/services/adminApi";
import type {
    AdminTournament,
    TournamentPrizeConfig,
    TournamentChampionConfig,
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

const DEFAULT_PRIZE_CONFIG: Omit<TournamentPrizeConfig, "ID" | "tournament_ID"> = {
    firstPlacePrize: "iPhone 15 Pro Max",
    firstPlaceValue: 35000000,
    secondPlacePrize: "Honda Vision 2024",
    secondPlaceValue: 30000000,
    thirdPlacePrize: "MacBook Air M3",
    thirdPlaceValue: 25000000,
    consolationPrizes: 10,
    consolationValue: 500000,
    showLiveRanking: true,
    leaderboardUpdateInterval: 5,
};

const DEFAULT_CHAMPION_CONFIG: Omit<TournamentChampionConfig, "ID" | "tournament_ID"> = {
    enabled: true,
    bettingStatus: "open",
    openDate: null,
    lockDate: null,
    closeDate: null,
    autoLockOnTournamentStart: true,
    grandPrize: "iPhone 15 Pro Max 256GB",
    grandPrizeValue: 35000000,
    secondPrize: 'iPad Pro 12.9"',
    secondPrizeValue: 25000000,
    thirdPrize: "AirPods Pro 2",
    thirdPrizeValue: 7000000,
    splitPrizeIfTie: true,
    maxWinnersForSplit: 5,
    cashAlternativeEnabled: true,
    cashAlternativeValue: 30000000,
    maxPredictionsPerUser: 1,
    allowChangePrediction: true,
    changeDeadline: null,
    requireReason: false,
    showOthersPredictions: false,
    showPredictionStats: true,
    showOdds: true,
    notifyOnOpen: true,
    notifyBeforeLock: true,
    notifyHoursBeforeLock: 24,
    notifyOnResult: true,
};

export function TournamentDetail() {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const navigate = useNavigate();

    const [tournament, setTournament] = useState<AdminTournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Prize config state
    const [prizeCfg, setPrizeCfg] = useState(DEFAULT_PRIZE_CONFIG);
    const [prizeCfgId, setPrizeCfgId] = useState<string | null>(null);
    const [prizeCfgExists, setPrizeCfgExists] = useState(false);

    // Champion config state
    const [champCfg, setChampCfg] = useState(DEFAULT_CHAMPION_CONFIG);
    const [champCfgId, setChampCfgId] = useState<string | null>(null);
    const [champCfgExists, setChampCfgExists] = useState(false);

    const load = useCallback(async () => {
        if (!tournamentId) return;
        setLoading(true);
        try {
            const [tournaments, prizeData, champData] = await Promise.all([
                tournamentsApi.list(),
                tournamentPrizeConfigApi.getByTournament(tournamentId),
                tournamentChampionConfigApi.getByTournament(tournamentId),
            ]);

            const t = tournaments.find((t) => t.ID === tournamentId);
            setTournament(t ?? null);

            if (prizeData) {
                setPrizeCfgExists(true);
                setPrizeCfgId(prizeData.ID);
                const { ID, tournament_ID, ...rest } = prizeData;
                setPrizeCfg(rest);
            } else {
                setPrizeCfgExists(false);
                setPrizeCfgId(null);
                setPrizeCfg(DEFAULT_PRIZE_CONFIG);
            }

            if (champData) {
                setChampCfgExists(true);
                setChampCfgId(champData.ID);
                const { ID, tournament_ID, ...rest } = champData;
                setChampCfg(rest);
            } else {
                setChampCfgExists(false);
                setChampCfgId(null);
                setChampCfg(DEFAULT_CHAMPION_CONFIG);
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
            // Save prize config
            if (prizeCfgExists && prizeCfgId) {
                await tournamentPrizeConfigApi.update(prizeCfgId, prizeCfg);
            } else {
                const created = await tournamentPrizeConfigApi.create({
                    tournament_ID: tournamentId,
                    ...prizeCfg,
                });
                setPrizeCfgExists(true);
                setPrizeCfgId(created.ID);
            }

            // Save champion config
            if (champCfgExists && champCfgId) {
                await tournamentChampionConfigApi.update(champCfgId, champCfg);
            } else {
                const created = await tournamentChampionConfigApi.create({
                    tournament_ID: tournamentId,
                    ...champCfg,
                });
                setChampCfgExists(true);
                setChampCfgId(created.ID);
            }

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
            const res = await tournamentChampionConfigApi.lockPredictions(tournamentId);
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
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving…" : "Save Changes"}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* ── Outcome Prediction Prizes ────────────────── */}
                <Card className="border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">
                                Match Outcome Prizes
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                UC2 — Leaderboard prizes for this tournament
                            </p>
                        </div>
                    </div>

                    <div className="space-y-0">
                        <ConfigRow label="1st Place Prize">
                            <Input
                                className="w-44"
                                value={prizeCfg.firstPlacePrize}
                                onChange={(e) =>
                                    setPrizeCfg({ ...prizeCfg, firstPlacePrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="1st Place Value (VND)">
                            <Input
                                type="number"
                                className="w-32 text-right"
                                value={prizeCfg.firstPlaceValue}
                                onChange={(e) =>
                                    setPrizeCfg({
                                        ...prizeCfg,
                                        firstPlaceValue: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="2nd Place Prize">
                            <Input
                                className="w-44"
                                value={prizeCfg.secondPlacePrize}
                                onChange={(e) =>
                                    setPrizeCfg({ ...prizeCfg, secondPlacePrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="2nd Place Value (VND)">
                            <Input
                                type="number"
                                className="w-32 text-right"
                                value={prizeCfg.secondPlaceValue}
                                onChange={(e) =>
                                    setPrizeCfg({
                                        ...prizeCfg,
                                        secondPlaceValue: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="3rd Place Prize">
                            <Input
                                className="w-44"
                                value={prizeCfg.thirdPlacePrize}
                                onChange={(e) =>
                                    setPrizeCfg({ ...prizeCfg, thirdPlacePrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="3rd Place Value (VND)">
                            <Input
                                type="number"
                                className="w-32 text-right"
                                value={prizeCfg.thirdPlaceValue}
                                onChange={(e) =>
                                    setPrizeCfg({
                                        ...prizeCfg,
                                        thirdPlaceValue: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Consolation Prizes" description="Number of consolation prizes">
                            <Input
                                type="number"
                                className="w-20 text-right"
                                value={prizeCfg.consolationPrizes}
                                onChange={(e) =>
                                    setPrizeCfg({
                                        ...prizeCfg,
                                        consolationPrizes: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Consolation Value (VND)">
                            <Input
                                type="number"
                                className="w-28 text-right"
                                value={prizeCfg.consolationValue}
                                onChange={(e) =>
                                    setPrizeCfg({
                                        ...prizeCfg,
                                        consolationValue: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Show Live Ranking">
                            <Checkbox
                                checked={prizeCfg.showLiveRanking}
                                onCheckedChange={(v) =>
                                    setPrizeCfg({ ...prizeCfg, showLiveRanking: !!v })
                                }
                            />
                        </ConfigRow>
                    </div>
                </Card>

                {/* ── Champion Prediction Config ───────────────── */}
                <Card className="border-border bg-card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400">
                                <Trophy className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">
                                    Champion Prediction
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    UC3 — Tournament winner prediction
                                </p>
                            </div>
                        </div>
                        <Badge
                            variant={
                                champCfg.bettingStatus === "open"
                                    ? "default"
                                    : champCfg.bettingStatus === "locked"
                                        ? "secondary"
                                        : "destructive"
                            }
                        >
                            {champCfg.bettingStatus}
                        </Badge>
                    </div>

                    <div className="space-y-0">
                        <ConfigRow label="Enabled" description="Toggle champion prediction">
                            <Checkbox
                                checked={champCfg.enabled}
                                onCheckedChange={(v) =>
                                    setChampCfg({ ...champCfg, enabled: !!v })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Grand Prize">
                            <Input
                                className="w-44"
                                value={champCfg.grandPrize}
                                onChange={(e) =>
                                    setChampCfg({ ...champCfg, grandPrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Grand Prize Value (VND)">
                            <Input
                                type="number"
                                className="w-32 text-right"
                                value={champCfg.grandPrizeValue}
                                onChange={(e) =>
                                    setChampCfg({
                                        ...champCfg,
                                        grandPrizeValue: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="2nd Prize">
                            <Input
                                className="w-44"
                                value={champCfg.secondPrize}
                                onChange={(e) =>
                                    setChampCfg({ ...champCfg, secondPrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="3rd Prize">
                            <Input
                                className="w-44"
                                value={champCfg.thirdPrize}
                                onChange={(e) =>
                                    setChampCfg({ ...champCfg, thirdPrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Lock Date">
                            <Input
                                type="date"
                                className="w-36"
                                value={champCfg.lockDate ?? ""}
                                onChange={(e) =>
                                    setChampCfg({ ...champCfg, lockDate: e.target.value || null })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Max Predictions" description="Per user">
                            <Input
                                type="number"
                                className="w-20 text-right"
                                value={champCfg.maxPredictionsPerUser}
                                onChange={(e) =>
                                    setChampCfg({
                                        ...champCfg,
                                        maxPredictionsPerUser: parseInt(e.target.value) || 1,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Allow Changes">
                            <Checkbox
                                checked={champCfg.allowChangePrediction}
                                onCheckedChange={(v) =>
                                    setChampCfg({ ...champCfg, allowChangePrediction: !!v })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Show Odds">
                            <Checkbox
                                checked={champCfg.showOdds}
                                onCheckedChange={(v) =>
                                    setChampCfg({ ...champCfg, showOdds: !!v })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Split Prize If Tie">
                            <Checkbox
                                checked={champCfg.splitPrizeIfTie}
                                onCheckedChange={(v) =>
                                    setChampCfg({ ...champCfg, splitPrizeIfTie: !!v })
                                }
                            />
                        </ConfigRow>
                    </div>

                    {champCfg.bettingStatus === "open" && champCfgExists && (
                        <div className="mt-4 border-t border-border pt-4">
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={handleLockChampion}
                            >
                                <Lock className="mr-2 h-4 w-4" />
                                Lock Champion Predictions
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
