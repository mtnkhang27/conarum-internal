import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
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
import { teamsApi } from "@/services/adminApi";
import type { AdminTeam } from "@/types/admin";

const CONFEDERATIONS = ["UEFA", "CONMEBOL", "CAF", "AFC", "CONCACAF", "OFC"];

export function TeamManagement() {
    const [teams, setTeams] = useState<AdminTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<AdminTeam | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        flagCode: "",
        confederation: "",
        fifaRanking: "",
        groupName: "",
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            setTeams(await teamsApi.list());
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    function openAdd() {
        setEditing(null);
        setForm({ name: "", flagCode: "", confederation: "", fifaRanking: "", groupName: "" });
        setDialogOpen(true);
    }

    function openEdit(team: AdminTeam) {
        setEditing(team);
        setForm({
            name: team.name,
            flagCode: team.flagCode,
            confederation: team.confederation || "",
            fifaRanking: team.fifaRanking != null ? String(team.fifaRanking) : "",
            groupName: team.groupName || "",
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        try {
            const data: Partial<AdminTeam> = {
                name: form.name,
                flagCode: form.flagCode.toLowerCase(),
                confederation: form.confederation || null,
                fifaRanking: form.fifaRanking ? parseInt(form.fifaRanking) : null,
                groupName: form.groupName || null,
            };
            if (editing) {
                await teamsApi.update(editing.ID, data);
                toast.success("Team updated");
            } else {
                await teamsApi.create(data);
                toast.success("Team created");
            }
            setDialogOpen(false);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleDelete() {
        if (!deleteId) return;
        try {
            await teamsApi.delete(deleteId);
            toast.success("Team deleted");
            setDeleteId(null);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading teams…
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Team Management</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage teams and their information
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Team
                </Button>
            </div>

            <Card className="border-border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3">Team</th>
                                <th className="px-4 py-3">Confederation</th>
                                <th className="px-4 py-3">FIFA Rank</th>
                                <th className="px-4 py-3">Group</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team) => (
                                <tr
                                    key={team.ID}
                                    className="border-b border-border/50 transition-colors hover:bg-surface"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`fi fi-${team.flagCode} text-2xl`}
                                            />
                                            <span className="font-medium text-white">
                                                {team.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {team.confederation || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                                        {team.fifaRanking || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                                        {team.groupName || "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={team.isEliminated ? "destructive" : "default"}
                                        >
                                            {team.isEliminated ? "Eliminated" : "Active"}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                                                onClick={() => openEdit(team)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => setDeleteId(team.ID)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Team" : "Add New Team"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Team Name
                            </label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g., Brazil"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Flag Code (ISO)
                                </label>
                                <Input
                                    value={form.flagCode}
                                    onChange={(e) => setForm({ ...form, flagCode: e.target.value })}
                                    placeholder="e.g., br"
                                    maxLength={5}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Confederation
                                </label>
                                <Select
                                    value={form.confederation}
                                    onValueChange={(v) => setForm({ ...form, confederation: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONFEDERATIONS.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    FIFA Ranking
                                </label>
                                <Input
                                    type="number"
                                    value={form.fifaRanking}
                                    onChange={(e) =>
                                        setForm({ ...form, fifaRanking: e.target.value })
                                    }
                                    placeholder="e.g., 5"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Group
                                </label>
                                <Input
                                    value={form.groupName}
                                    onChange={(e) =>
                                        setForm({ ...form, groupName: e.target.value })
                                    }
                                    placeholder="e.g., A"
                                    maxLength={5}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {editing ? "Update" : "Create"} Team
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="border-border bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure? This will also affect any matches referencing this team.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
