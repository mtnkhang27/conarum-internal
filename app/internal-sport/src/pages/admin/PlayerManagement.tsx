import { useState, useEffect } from "react";
import { Users, Search, RefreshCw, Trash2, Flame, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { playersApi } from "@/services/adminApi";
import type { AdminPlayer } from "@/types/admin";

export function PlayerManagement() {
    const { t } = useTranslation();
    const [players, setPlayers] = useState<AdminPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [recalculating, setRecalculating] = useState(false);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            setPlayers(await playersApi.list());
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRecalculate() {
        setRecalculating(true);
        try {
            const res = await playersApi.recalculateLeaderboard();
            toast.success(res.message);
            load();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setRecalculating(false);
        }
    }

    async function handleDelete() {
        if (!deleteId) return;
        try {
            await playersApi.delete(deleteId);
            toast.success(t("admin.playerManagement.playerDeleted"));
            setDeleteId(null);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const filtered = players.filter(
        (p) =>
            p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPoints = players.reduce((s, p) => s + Number(p.totalPoints || 0), 0);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                {t("admin.playerManagement.loadingPlayers")}
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t("admin.playerManagement.title")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("admin.playerManagement.subtitle")}
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={handleRecalculate}
                    disabled={recalculating}
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${recalculating ? "animate-spin" : ""}`}
                    />
                    {t("admin.playerManagement.recalculateLeaderboard")}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{players.length}</p>
                        <p className="text-xs text-muted-foreground">{t("admin.playerManagement.totalPlayers")}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20 text-green-400">
                        <Flame className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">
                            {players.filter((p) => Number(p.totalPredictions) > 0).length}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("admin.playerManagement.activePlayers")}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/20 text-yellow-400">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{totalPoints}</p>
                        <p className="text-xs text-muted-foreground">{t("admin.playerManagement.totalPoints")}</p>
                    </div>
                </Card>
            </div>

            {/* Search */}
            <Card className="border-border bg-card p-4">
                <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("admin.playerManagement.searchPlayers")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="border-border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3">{t("admin.playerManagement.rank")}</th>
                                <th className="px-4 py-3">{t("admin.playerManagement.player")}</th>
                                <th className="px-4 py-3">{t("admin.playerManagement.email")}</th>
                                <th className="px-4 py-3 text-right">{t("admin.playerManagement.points")}</th>
                                <th className="px-4 py-3 text-right">{t("admin.playerManagement.correct")}</th>
                                <th className="px-4 py-3 text-right">{t("admin.playerManagement.total")}</th>
                                <th className="px-4 py-3 text-right">{t("admin.playerManagement.streak")}</th>
                                <th className="px-4 py-3">{t("common.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr
                                    key={p.ID}
                                    className="border-b border-border/50 transition-colors hover:bg-surface"
                                >
                                    <td className="px-4 py-3">
                                        {p.rank ? (
                                            <Badge
                                                variant={
                                                    p.rank <= 3 ? "default" : "secondary"
                                                }
                                            >
                                                #{p.rank}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {p.avatarUrl ? (
                                                <img
                                                    src={p.avatarUrl}
                                                    alt={p.displayName}
                                                    className="h-8 w-8 rounded-full border border-border object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
                                                    {p.displayName?.trim() ? (
                                                        <span className="text-xs font-bold">
                                                            {p.displayName.trim().charAt(0).toUpperCase()}
                                                        </span>
                                                    ) : (
                                                        <User className="h-4 w-4" />
                                                    )}
                                                </div>
                                            )}
                                            <span className="font-medium text-white">
                                                {p.displayName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {p.email}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                                        {p.totalPoints}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-green-400">
                                        {p.totalCorrect}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                        {p.totalPredictions}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {Number(p.currentStreak) > 0 ? (
                                            <span className="inline-flex items-center gap-1 font-mono text-yellow-400">
                                                <Flame className="h-3 w-3" />
                                                {p.currentStreak}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">0</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => setDeleteId(p.ID)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="border-border bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.playerManagement.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("admin.playerManagement.deleteDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
