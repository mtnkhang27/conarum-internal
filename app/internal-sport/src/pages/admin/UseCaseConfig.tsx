import { useState, useEffect } from "react";
import {
    Target,
    TrendingUp,
    Trophy,
    Save,
    Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { configApi } from "@/services/adminApi";
import type {
    ScorePredictionConfig,
    MatchOutcomeConfig,
    ChampionPredictionConfig,
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

export function UseCaseConfig() {
    const [sp, setSp] = useState<ScorePredictionConfig | null>(null);
    const [mo, setMo] = useState<MatchOutcomeConfig | null>(null);
    const [cp, setCp] = useState<ChampionPredictionConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            const [s, m, c] = await Promise.all([
                configApi.scorePrediction.get(),
                configApi.matchOutcome.get(),
                configApi.championPrediction.get(),
            ]);
            setSp(s);
            setMo(m);
            setCp(c);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const promises: Promise<void>[] = [];
            if (sp) {
                const { ID, ...data } = sp;
                promises.push(configApi.scorePrediction.update(ID, data));
            }
            if (mo) {
                const { ID, ...data } = mo;
                promises.push(configApi.matchOutcome.update(ID, data));
            }
            if (cp) {
                const { ID, ...data } = cp;
                promises.push(configApi.championPrediction.update(ID, data));
            }
            await Promise.all(promises);
            toast.success("All configurations saved");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleLockChampion() {
        try {
            const res = await configApi.championPrediction.lockPredictions();
            toast.success(res.message);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    if (loading || !sp || !mo || !cp) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading configuration…
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Use Case Configuration
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Configure betting rules and rewards for each use case
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving…" : "Save Changes"}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* UC1 — Score Prediction */}
                <Card className="border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                            <Target className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">
                                Score Prediction Betting
                            </h3>
                            <p className="text-xs text-muted-foreground">UC1 — Exact Score</p>
                        </div>
                    </div>

                    <div className="space-y-0">
                        <ConfigRow label="Enabled" description="Toggle UC1">
                            <Checkbox
                                checked={sp.enabled}
                                onCheckedChange={(v) => setSp({ ...sp, enabled: !!v })}
                            />
                        </ConfigRow>
                        <ConfigRow label="Max Bets/Match">
                            <Input
                                type="number"
                                className="w-20 text-right"
                                value={sp.maxBetsPerMatch}
                                onChange={(e) =>
                                    setSp({ ...sp, maxBetsPerMatch: parseInt(e.target.value) || 0 })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Base Price (VND)">
                            <Input
                                type="number"
                                className="w-28 text-right"
                                value={sp.basePrice}
                                onChange={(e) =>
                                    setSp({ ...sp, basePrice: parseInt(e.target.value) || 0 })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Base Reward (VND)">
                            <Input
                                type="number"
                                className="w-28 text-right"
                                value={sp.baseReward}
                                onChange={(e) =>
                                    setSp({ ...sp, baseReward: parseInt(e.target.value) || 0 })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Duplicate Multiplier">
                            <Input
                                type="number"
                                step="0.5"
                                className="w-20 text-right"
                                value={sp.duplicateMultiplier}
                                onChange={(e) =>
                                    setSp({
                                        ...sp,
                                        duplicateMultiplier: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Platform Fee (%)">
                            <Input
                                type="number"
                                className="w-20 text-right"
                                value={sp.platformFee}
                                onChange={(e) =>
                                    setSp({ ...sp, platformFee: parseFloat(e.target.value) || 0 })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Lock Before (min)">
                            <Input
                                type="number"
                                className="w-20 text-right"
                                value={sp.lockBeforeMatch}
                                onChange={(e) =>
                                    setSp({
                                        ...sp,
                                        lockBeforeMatch: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                    </div>
                </Card>

                {/* UC2 — Match Outcome */}
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
                                UC2 — Win/Draw/Lose
                            </p>
                        </div>
                    </div>

                    <div className="space-y-0">
                        <ConfigRow label="Enabled" description="Toggle UC2">
                            <Checkbox
                                checked={mo.enabled}
                                onCheckedChange={(v) => setMo({ ...mo, enabled: !!v })}
                            />
                        </ConfigRow>
                        <ConfigRow label="Points for Win">
                            <Input
                                type="number"
                                className="w-20 text-right"
                                value={mo.pointsForWin}
                                onChange={(e) =>
                                    setMo({ ...mo, pointsForWin: parseInt(e.target.value) || 0 })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Points for Draw">
                            <Input
                                type="number"
                                className="w-20 text-right"
                                value={mo.pointsForDraw}
                                onChange={(e) =>
                                    setMo({ ...mo, pointsForDraw: parseInt(e.target.value) || 0 })
                                }
                            />
                        </ConfigRow>

                        <div className="border-b border-border/30 py-2">
                            <p className="text-xs font-bold uppercase text-muted-foreground">
                                Match Weights
                            </p>
                        </div>
                        <ConfigRow label="Regular">
                            <Input
                                type="number"
                                step="0.5"
                                className="w-20 text-right"
                                value={mo.regularMatchWeight}
                                onChange={(e) =>
                                    setMo({
                                        ...mo,
                                        regularMatchWeight: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Important">
                            <Input
                                type="number"
                                step="0.5"
                                className="w-20 text-right"
                                value={mo.importantMatchWeight}
                                onChange={(e) =>
                                    setMo({
                                        ...mo,
                                        importantMatchWeight: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Finals">
                            <Input
                                type="number"
                                step="0.5"
                                className="w-20 text-right"
                                value={mo.finalMatchWeight}
                                onChange={(e) =>
                                    setMo({
                                        ...mo,
                                        finalMatchWeight: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>

                        <div className="border-b border-border/30 py-2">
                            <p className="text-xs font-bold uppercase text-muted-foreground">
                                Prizes
                            </p>
                        </div>
                        <ConfigRow label="🥇 1st Place">
                            <Input
                                className="w-44"
                                value={mo.firstPlacePrize}
                                onChange={(e) =>
                                    setMo({ ...mo, firstPlacePrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="🥈 2nd Place">
                            <Input
                                className="w-44"
                                value={mo.secondPlacePrize}
                                onChange={(e) =>
                                    setMo({ ...mo, secondPlacePrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="🥉 3rd Place">
                            <Input
                                className="w-44"
                                value={mo.thirdPlacePrize}
                                onChange={(e) =>
                                    setMo({ ...mo, thirdPlacePrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                    </div>
                </Card>

                {/* UC3 — Champion */}
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
                                    UC3 — Tournament Winner
                                </p>
                            </div>
                        </div>
                        <Badge
                            variant={
                                cp.bettingStatus === "open"
                                    ? "default"
                                    : cp.bettingStatus === "locked"
                                        ? "secondary"
                                        : "destructive"
                            }
                        >
                            {cp.bettingStatus}
                        </Badge>
                    </div>

                    <div className="space-y-0">
                        <ConfigRow label="Enabled" description="Toggle UC3">
                            <Checkbox
                                checked={cp.enabled}
                                onCheckedChange={(v) => setCp({ ...cp, enabled: !!v })}
                            />
                        </ConfigRow>
                        <ConfigRow label="Grand Prize">
                            <Input
                                className="w-44"
                                value={cp.grandPrize}
                                onChange={(e) =>
                                    setCp({ ...cp, grandPrize: e.target.value })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Grand Prize Value">
                            <Input
                                type="number"
                                className="w-28 text-right"
                                value={cp.grandPrizeValue}
                                onChange={(e) =>
                                    setCp({
                                        ...cp,
                                        grandPrizeValue: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Lock Date">
                            <Input
                                type="date"
                                className="w-36"
                                value={cp.lockDate || ""}
                                onChange={(e) =>
                                    setCp({ ...cp, lockDate: e.target.value || null })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow
                            label="Max Predictions"
                            description="Per user"
                        >
                            <Input
                                type="number"
                                className="w-20 text-right"
                                value={cp.maxPredictionsPerUser}
                                onChange={(e) =>
                                    setCp({
                                        ...cp,
                                        maxPredictionsPerUser: parseInt(e.target.value) || 1,
                                    })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Allow Changes">
                            <Checkbox
                                checked={cp.allowChangePrediction}
                                onCheckedChange={(v) =>
                                    setCp({ ...cp, allowChangePrediction: !!v })
                                }
                            />
                        </ConfigRow>
                        <ConfigRow label="Show Odds">
                            <Checkbox
                                checked={cp.showOdds}
                                onCheckedChange={(v) =>
                                    setCp({ ...cp, showOdds: !!v })
                                }
                            />
                        </ConfigRow>
                    </div>

                    {cp.bettingStatus === "open" && (
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
