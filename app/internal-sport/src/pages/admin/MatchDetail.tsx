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
    prize: 200000,
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
    const [outcomePoints, setOutcomePoints] = useState(1);
    const [sbCfg, setSbCfg] = useState(DEFAULT_SCORE_BET_CONFIG);
    /** Whether score betting config exists for this match */
    const [scoreBettingEnabled, setScoreBettingEnabled] = useState(false);

    const load = useCallback(async () => {
        if (!matchId) return;
        setLoading(true);
        try {
            const [m, cfg] = await Promise.all([
                matchesApi.get(matchId),
                matchScoreBetConfigApi.getByMatch(matchId),
            ]);
            setMatch(m);
            setOutcomePoints(Number(m.outcomePoints ?? 1));

            if (cfg) {
                setScoreBetCfg(cfg);
                setScoreBetCfgExists(true);
                setScoreBettingEnabled(true);
                setSbCfg({
                    enabled: cfg.enabled,
                    maxBets: cfg.maxBets,
                    prize: cfg.prize,
                });
            } else {
                setScoreBetCfgExists(false);
                setScoreBettingEnabled(false);
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
            // Save match-level fields (outcome points)
            await matchesApi.update(matchId, {
                outcomePoints,
            } as Partial<AdminMatch>);

            // Save score bet config
            if (scoreBettingEnabled) {
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
                // If score betting disabled, delete the config
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
                            label="Points for Correct"
                            description="Points awarded for a correct outcome prediction (always enabled)"
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
                            description="Create score bet config for this match"
                        >
                            <Checkbox
                                checked={scoreBettingEnabled}
                                onCheckedChange={(v) => setScoreBettingEnabled(!!v)}
                            />
                        </ConfigRow>

                        {scoreBettingEnabled && (
                            <>
                                <ConfigRow label="Enabled" description="Activate betting">
                                    <Checkbox
                                        checked={sbCfg.enabled}
                                        onCheckedChange={(v) =>
                                            setSbCfg({ ...sbCfg, enabled: !!v })
                                        }
                                    />
                                </ConfigRow>
                                <ConfigRow label="Max Bets" description="Maximum score bets per player">
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
                                <ConfigRow label="Prize (VND)" description="Prize per correct score bet">
                                    <Input
                                        type="number"
                                        className="w-28 text-right"
                                        value={sbCfg.prize}
                                        onChange={(e) =>
                                            setSbCfg({
                                                ...sbCfg,
                                                prize: parseInt(e.target.value) || 0,
                                            })
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
