import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { teamsApi, tournamentsApi, tournamentTeamsApi } from "@/services/adminApi";
import type { AdminTeam, AdminTournament, AdminTournamentTeam } from "@/types/admin";

const CONFEDERATIONS = [
    { value: "UEFA", label: "admin.confederation.uefa" },
    { value: "CONMEBOL", label: "admin.confederation.conmebol" },
    { value: "CAF", label: "admin.confederation.caf" },
    { value: "AFC", label: "admin.confederation.afc" },
    { value: "CONCACAF", label: "admin.confederation.concacaf" },
    { value: "OFC", label: "admin.confederation.ofc" },
];

export function TeamManagement() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [allTeams, setAllTeams] = useState<AdminTeam[]>([]);
    const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
    const [tournamentTeams, setTournamentTeams] = useState<AdminTournamentTeam[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<AdminTeam | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        shortName: "",
        tla: "",
        crest: "",
        flagCode: "",
        confederation: "",
        fifaRanking: "",
    });

    useEffect(() => {
        loadInitial();
    }, []);

    useEffect(() => {
        if (selectedTournament && selectedTournament !== "all") {
            loadTournamentTeams(selectedTournament);
        }
    }, [selectedTournament]);

    async function loadInitial() {
        setLoading(true);
        try {
            const [teams, tourneys] = await Promise.all([
                teamsApi.list(),
                tournamentsApi.list(),
            ]);
            setAllTeams(teams);
            setTournaments(tourneys);
            // Auto-select active tournament if available
            const active = tourneys.find((t) => t.status === "active");
            if (active) {
                setSelectedTournament(active.ID);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadTournamentTeams(tournamentId: string) {
        try {
            const tt = await tournamentTeamsApi.listByTournament(tournamentId);
            setTournamentTeams(tt);
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    // Filter teams: show tournament-specific teams or all
    const displayTeams: (AdminTeam & { tournamentTeam?: AdminTournamentTeam })[] =
        selectedTournament === "all"
            ? allTeams
            : tournamentTeams
                  .filter((tt) => tt.team)
                  .map((tt) => ({
                      ...tt.team!,
                      tournamentTeam: tt,
                  }));

    function openAdd() {
        setEditing(null);
        setForm({
            name: "",
            shortName: "",
            tla: "",
            crest: "",
            flagCode: "",
            confederation: "",
            fifaRanking: "",
        });
        setDialogOpen(true);
    }

    function openEdit(team: AdminTeam, e: React.MouseEvent) {
        e.stopPropagation();
        setEditing(team);
        setForm({
            name: team.name,
            shortName: team.shortName || "",
            tla: team.tla || "",
            crest: team.crest || "",
            flagCode: team.flagCode,
            confederation: team.confederation || "",
            fifaRanking: team.fifaRanking != null ? String(team.fifaRanking) : "",
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        // Validation
        if (!form.name.trim()) {
            toast.error(t("admin.teamManagement.nameRequired"));
            return;
        }
        if (!form.flagCode.trim()) {
            toast.error(t("admin.teamManagement.flagRequired"));
            return;
        }
        if (form.tla && form.tla.length > 10) {
            toast.error(t("admin.teamManagement.tlaLength"));
            return;
        }

        try {
            const data: Partial<AdminTeam> = {
                name: form.name.trim(),
                shortName: form.shortName.trim() || null,
                tla: form.tla.trim().toUpperCase() || null,
                crest: form.crest.trim() || null,
                flagCode: form.flagCode.trim().toLowerCase(),
                confederation: (form.confederation as any) || null,
                fifaRanking: form.fifaRanking ? parseInt(form.fifaRanking) : null,
            };
            if (editing) {
                await teamsApi.update(editing.ID, data);
                toast.success(t("admin.teamManagement.teamUpdated"));
            } else {
                await teamsApi.create(data);
                toast.success(t("admin.teamManagement.teamCreated"));
            }
            setDialogOpen(false);
            // Reload
            const teams = await teamsApi.list();
            setAllTeams(teams);
            if (selectedTournament !== "all") {
                loadTournamentTeams(selectedTournament);
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleDelete() {
        if (!deleteId) return;
        try {
            await teamsApi.delete(deleteId);
            toast.success(t("admin.teamManagement.teamDeleted"));
            setDeleteId(null);
            const teams = await teamsApi.list();
            setAllTeams(teams);
            if (selectedTournament !== "all") {
                loadTournamentTeams(selectedTournament);
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                {t("common.loading")}
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t("admin.teamManagement.title")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("admin.teamManagement.subtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Tournament filter */}
                    <Select
                        value={selectedTournament}
                        onValueChange={setSelectedTournament}
                    >
                        <SelectTrigger className="w-[260px]">
                            <SelectValue placeholder={t("admin.teamManagement.filterByTournament")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("admin.teamManagement.allTeams")}</SelectItem>
                            {tournaments.map((t) => (
                                <SelectItem key={t.ID} value={t.ID}>
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={openAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("admin.teamManagement.addTeam")}
                    </Button>
                </div>
            </div>

            <Card className="border-border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3">{t("admin.teamManagement.team")}</th>
                                <th className="px-4 py-3">{t("admin.teamManagement.tla")}</th>
                                <th className="px-4 py-3">{t("admin.teamManagement.confederation")}</th>
                                <th className="px-4 py-3">{t("admin.teamManagement.fifaRank")}</th>
                                {selectedTournament !== "all" && (
                                    <>
                                        <th className="px-4 py-3">{t("admin.teamManagement.position")}</th>
                                        {/* <th className="px-4 py-3">{t("admin.teamManagement.status")}</th> */}
                                    </>
                                )}
                                <th className="px-4 py-3">{t("common.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayTeams.map((team) => {
                                const tt = (team as any).tournamentTeam as
                                    | AdminTournamentTeam
                                    | undefined;
                                return (
                                    <tr
                                        key={team.ID}
                                        className="cursor-pointer border-b border-border/50 transition-colors hover:bg-surface"
                                        onClick={() =>
                                            navigate(`/admin/teams/${team.ID}`)
                                        }
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {team.crest ? (
                                                    <img
                                                        src={team.crest}
                                                        alt={team.shortName || team.name}
                                                        className="h-8 w-8 object-contain"
                                                    />
                                                ) : (
                                                    <span
                                                        className={`fi fi-${team.flagCode} text-2xl`}
                                                    />
                                                )}
                                                <div>
                                                    <span className="font-medium text-white">
                                                        {team.name}
                                                    </span>
                                                    {team.shortName && (
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            ({team.shortName})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {team.tla || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {team.confederation || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                                            {team.fifaRanking || "—"}
                                        </td>
                                        {selectedTournament !== "all" && (
                                            <>
                                                <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                                                    {tt?.leaguePosition || "—"}
                                                </td>
                                                {/* <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            tt?.isEliminated
                                                                ? "destructive"
                                                                : "default"
                                                        }
                                                    >
                                                        {tt?.isEliminated
                                                            ? `Eliminated (${tt.eliminatedAt || ""})`
                                                            : "Active"}
                                                    </Badge>
                                                </td> */}
                                            </>
                                        )}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                                                    onClick={(e) => openEdit(team, e)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteId(team.ID);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {displayTeams.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={selectedTournament !== "all" ? 7 : 5}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        {t("admin.teamManagement.noTeams")}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? t("admin.teamManagement.editTeam") : t("admin.teamManagement.addTeamFull")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                {t("admin.teamManagement.teamNameLabel")}
                            </label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder={t("admin.teamManagement.placeholderTeamName")}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {t("admin.teamManagement.shortName")}
                                </label>
                                <Input
                                    value={form.shortName}
                                    onChange={(e) =>
                                        setForm({ ...form, shortName: e.target.value })
                                    }
                                    placeholder={t("admin.teamManagement.placeholderShortName")}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {t("admin.teamManagement.tlaLabel")}
                                </label>
                                <Input
                                    value={form.tla}
                                    onChange={(e) =>
                                        setForm({ ...form, tla: e.target.value.toUpperCase() })
                                    }
                                    placeholder={t("admin.teamManagement.placeholderTLA")}
                                    maxLength={10}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                {t("admin.teamManagement.crestUrl")}
                            </label>
                            <Input
                                value={form.crest}
                                onChange={(e) => setForm({ ...form, crest: e.target.value })}
                                placeholder={t("admin.teamManagement.placeholderCrestUrl")}
                            />
                            {form.crest && (
                                <div className="flex items-center gap-2 pt-1">
                                    <img
                                        src={form.crest}
                                        alt="Preview"
                                        className="h-8 w-8 object-contain"
                                        onError={(e) =>
                                            ((e.target as HTMLImageElement).style.display = "none")
                                        }
                                    />
                                    <span className="text-xs text-muted-foreground">{t("common.preview")}</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {t("admin.teamManagement.flagCode")}
                                </label>
                                <Input
                                    value={form.flagCode}
                                    onChange={(e) =>
                                        setForm({ ...form, flagCode: e.target.value })
                                    }
                                    placeholder={t("admin.teamManagement.placeholderFlagCode")}
                                    maxLength={5}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {t("admin.teamManagement.confederation")}
                                </label>
                                <Select
                                    value={form.confederation}
                                    onValueChange={(v) =>
                                        setForm({ ...form, confederation: v })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("common.select")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONFEDERATIONS.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                {t(c.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                {t("admin.teamManagement.fifaRanking")}
                            </label>
                            <Input
                                type="number"
                                value={form.fifaRanking}
                                onChange={(e) =>
                                    setForm({ ...form, fifaRanking: e.target.value })
                                }
                                placeholder={t("admin.teamManagement.placeholderFifaRanking")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSave}>
                            {editing ? t("common.update") : t("common.create")} {t("admin.teamManagement.team")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="border-border bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.teamManagement.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("admin.teamManagement.deleteDescription")}
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
