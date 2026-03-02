import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Target,
    TrendingUp,
    Trophy,
    Calendar,
    MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { matchesApi, matchScoreBetConfigApi } from "@/services/adminApi";
import type { AdminMatch, MatchScoreBetConfig } from "@/types/admin";

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
        case "upcoming":
            return "default" as const;
        case "live":
            return "destructive" as const;
        case "finished":
            return "secondary" as const;
        default:
            return "outline" as const;
    }
}

const DEFAULT_SCORE_BET_CONFIG: Omit<MatchScoreBetConfig, "ID" | "match_ID"> = {
    enabled: true,
    maxBets: 3,
    basePrice: 50000,
    baseReward: 200000,
    allowDuplicates: true,
    duplicateMultiplier: 2.0,
    maxDuplicates: 3,
    bonusMultiplier: 1.5,
    platformFee: 5,
    lockBeforeMinutes: 30,
    minBetAmount: 10000,
    maxBetAmount: 500000,
    autoLockOnKickoff: true,
};

export function MatchDetail() {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();

    const [match, setMatch] = useState<AdminMatch | null>(null);
    const [scoreBetCfg, setScoreBetCfg] = useState<MatchScoreBetConfig | null>(null);
    const [scoreBetCfgExists, setScoreBetCfgExists] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Local editable state
    const [outcomeEnabled, setOutcomeEnabled] = useState(true);
    const [outcomePoints, setOutcomePoints] = useState(1);
    const [allowScorePrediction, setAllowScorePrediction] = useState(true);
    const [sbCfg, setSbCfg] = useState(DEFAULT_SCORE_BET_CONFIG);

    const load = useCallback(async () => {
        if (!matchId) return;
        setLoading(true);
        try {
            const [m, cfg] = await Promise.all([
                matchesApi.get(matchId),
                matchScoreBetConfigApi.getByMatch(matchId),
            ]);
            setMatch(m);
            setOutcomeEnabled(m.outcomeEnabled ?? true);
            setOutcomePoints(Number(m.outcomePoints ?? 1));
            setAllowScorePrediction(m.allowScorePrediction ?? true);

            if (cfg) {
                setScoreBetCfg(cfg);
                setScoreBetCfgExists(true);
                setSbCfg({
                    enabled: cfg.enabled,
                    maxBets: cfg.maxBets,
                    basePrice: cfg.basePrice,
                    baseReward: cfg.baseReward,
                    allowDuplicates: cfg.allowDuplicates,
                    duplicateMultiplier: cfg.duplicateMultiplier,
                    maxDuplicates: cfg.maxDuplicates,
                    bonusMultiplier: cfg.bonusMultiplier,
                    platformFee: cfg.platformFee,
                    lockBeforeMinutes: cfg.lockBeforeMinutes,
                    minBetAmount: cfg.minBetAmount,
                    maxBetAmount: cfg.maxBetAmount,
                    autoLockOnKickoff: cfg.autoLockOnKickoff,
                });
            } else {
                setScoreBetCfgExists(false);
                setSbCfg(DEFAULT_SCORE_BET_CONFIG);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        load();
    }, [load]);

    async function handleSave() {
        if (!matchId || !match) return;
        setSaving(true);
        try {
            // Save match-level fields (outcome config)
            await matchesApi.update(matchId, {
                outcomeEnabled,
                outcomePoints,
                allowScorePrediction,
            } as Partial<AdminMatch>);

            // Save score bet config
            if (allowScorePrediction) {
                if (scoreBetCfgExists && scoreBetCfg) {
                    await matchScoreBetConfigApi.update(scoreBetCfg.ID, sbCfg);
                } else {
                    const created = await matchScoreBetConfigApi.create({
                        match_ID: matchId,
                        ...sbCfg,
                    });
                    setScoreBetCfg(created);
                    setScoreBetCfgExists(true);
                }
            } else if (scoreBetCfgExists && scoreBetCfg) {
                // If score prediction disabled, delete the config
                await matchScoreBetConfigApi.delete(scoreBetCfg.ID);
                setScoreBetCfgExists(false);
                setScoreBetCfg(null);
            }

            toast.success("Match configuration saved");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading || !match) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading match details…
            </div>
        );
    }

    const homeTeamName = match.homeTeam?.name ?? match.homeTeam_ID;
    const awayTeamName = match.awayTeam?.name ?? match.awayTeam_ID;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/admin/matches")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {match.homeTeam && (
                                <span className={`fi fi-${match.homeTeam.flagCode} mr-2`} />
                            )}
                            {homeTeamName}
                            <span className="mx-3 text-muted-foreground">vs</span>
                            {match.awayTeam && (
                                <span className={`fi fi-${match.awayTeam.flagCode} mr-2`} />
                            )}
                            {awayTeamName}
                        </h1>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(match.kickoff).toLocaleDateString()} {new Date(match.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {match.venue && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {match.venue}
                                </span>
                            )}
                            <Badge variant={statusVariant(match.status)}>
                                {match.status}
                            </Badge>
                            {match.tournament?.name && (
                                <span className="flex items-center gap-1">
                                    <Trophy className="h-3.5 w-3.5" />
                                    {match.tournament.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving…" : "Save Changes"}
                </Button>
            </div>

            {/* Result info (if finished) */}
            {match.status === "finished" && (
                <Card className="border-border bg-card p-4">
                    <div className="flex items-center justify-center gap-6 text-lg">
                        <span className="font-bold text-white">{homeTeamName}</span>
                        <span className="font-mono text-2xl font-bold text-primary">
                            {match.homeScore} – {match.awayScore}
                        </span>
                        <span className="font-bold text-white">{awayTeamName}</span>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* ── Match Outcome Prediction Config ─────────── */}
                <Card className="border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">
                                Match Outcome Prediction
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                UC2 — Win/Draw/Lose prediction for this match
                            </p>
                        </div>
                    </div>

                    <div className="space-y-0">
                        <ConfigRow
                            label="Enabled"
                            description="Allow outcome prediction for this match"
                        >
                            <Checkbox
                                checked={outcomeEnabled}
                                onCheckedChange={(v) => setOutcomeEnabled(!!v)}
                            />
                        </ConfigRow>
                        <ConfigRow
                            label="Points for Correct"
                            description="Points awarded for a correct prediction on this match"
                        >
                            <Input
                                type="number"
                                step="0.5"
                                min="0"
                                className="w-20 text-right"
                                value={outcomePoints}
                                onChange={(e) =>
                                    setOutcomePoints(parseFloat(e.target.value) || 0)
                                }
                                disabled={!outcomeEnabled}
                            />
                        </ConfigRow>
                    </div>
                </Card>

                {/* ── Score Prediction Betting Config ─────────── */}
                <Card className="border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                            <Target className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">
                                Score Prediction Betting
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                UC1 — Exact score bet config for this match
                            </p>
                        </div>
                    </div>

                    <div className="space-y-0">
                        <ConfigRow
                            label="Enable Score Betting"
                            description="Allow exact score bets for this match"
                        >
                            <Checkbox
                                checked={allowScorePrediction}
                                onCheckedChange={(v) => setAllowScorePrediction(!!v)}
                            />
                        </ConfigRow>

                        {allowScorePrediction && (
                            <>
                                <ConfigRow label="Enabled" description="Activate betting">
                                    <Checkbox
                                        checked={sbCfg.enabled}
                                        onCheckedChange={(v) =>
                                            setSbCfg({ ...sbCfg, enabled: !!v })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Max Bets">
                                    <Input
                                        type="number"
                                        className="w-20 text-right"
                                        value={sbCfg.maxBets}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                maxBets: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Base Price (VND)">
                                    <Input
                                        type="number"
                                        className="w-28 text-right"
                                        value={sbCfg.basePrice}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                basePrice: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Base Reward (VND)">
                                    <Input
                                        type="number"
                                        className="w-28 text-right"
                                        value={sbCfg.baseReward}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                baseReward: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Duplicate Multiplier">
                                    <Input
                                        type="number"
                                        step="0.5"
                                        className="w-20 text-right"
                                        value={sbCfg.duplicateMultiplier}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                duplicateMultiplier:
                                                    parseFloat(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Platform Fee (%)">
                                    <Input
                                        type="number"
                                        className="w-20 text-right"
                                        value={sbCfg.platformFee}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                platformFee: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Lock Before (min)">
                                    <Input
                                        type="number"
                                        className="w-20 text-right"
                                        value={sbCfg.lockBeforeMinutes}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                lockBeforeMinutes:
                                                    parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Min Bet (VND)">
                                    <Input
                                        type="number"
                                        className="w-28 text-right"
                                        value={sbCfg.minBetAmount}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                minBetAmount: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Max Bet (VND)">
                                    <Input
                                        type="number"
                                        className="w-28 text-right"
                                        value={sbCfg.maxBetAmount}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                maxBetAmount: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Auto Lock on Kickoff">
                                    <Checkbox
                                        checked={sbCfg.autoLockOnKickoff}
                                        onCheckedChange={(v) =>
                                            setSbCfg({ ...sbCfg, autoLockOnKickoff: !!v })
                                        }
                                    />
                                </ConfigRow>
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
