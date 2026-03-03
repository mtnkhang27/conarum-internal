import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Trophy,
    Lock,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    tournamentsApi,
    tournamentActionsApi,
} from "@/services/adminApi";
import type {
    AdminTournament,
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
    const [championBettingStatus, setChampionBettingStatus] = useState<"open" | "locked" | "closed">("open");
    const [championLockDate, setChampionLockDate] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!tournamentId) return;
        setLoading(true);
        try {
            const tournaments = await tournamentsApi.list();
            const t = tournaments.find((t) => t.ID === tournamentId);
            setTournament(t ?? null);

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
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving…" : "Save Changes"}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="border-border bg-card p-5">
                    <div className="space-y-0">
                        {(championBettingStatus === "locked" || championBettingStatus === "closed") && (
                            <div className="mb-3 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                Prize fields are read-only while champion betting is{" "}
                                <strong>{championBettingStatus}</strong>. Set status to{" "}
                                <strong>Open</strong> to edit.
                            </div>
                        )}
                        <ConfigRow label="Prize for Outcome Prediction" description="Description of the prize for the outcome prediction leaderboard winner">
                            <Input
                                className="w-56"
                                value={outcomePrize}
                                onChange={(e) => setOutcomePrize(e.target.value)}
                                disabled={championBettingStatus === "locked" || championBettingStatus === "closed"}
                            />
                        </ConfigRow>

                        <ConfigRow label="Prize Pool for Champion Prediction" description="Description of the champion prediction prize">
                            <Input
                                className="w-56"
                                value={championPrizePool}
                                onChange={(e) => setChampionPrizePool(e.target.value)}
                                disabled={championBettingStatus === "locked" || championBettingStatus === "closed"}
                            />
                        </ConfigRow>
                        {/* <ConfigRow label="Lock Date" description="Date when champion predictions are locked">
                            <Input
                                type="date"
                                className="w-36"
                                value={championLockDate ?? ""}
                                onChange={(e) =>
                                    setChampionLockDate(e.target.value || null)
                                }
                            />
                        </ConfigRow> */}
                        <ConfigRow label="Betting Status" description="Current status of champion betting">
                            <select
                                className="rounded border border-border bg-surface-dark px-3 py-1.5 text-sm text-white"
                                value={championBettingStatus}
                                onChange={(e) =>
                                    setChampionBettingStatus(e.target.value as "open" | "locked" | "closed")
                                }
                            >
                                <option value="open">Open</option>
                                <option value="locked">Locked</option>
                                <option value="closed">Closed</option>
                            </select>
                        </ConfigRow>
                    </div>
                    {championBettingStatus === "open" && (
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
