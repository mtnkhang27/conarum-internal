import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Trophy } from "lucide-react";
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
import { tournamentsApi } from "@/services/adminApi";
import type { AdminTournament } from "@/types/admin";

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

export function TournamentManagement() {
    const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<AdminTournament | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        startDate: "",
        endDate: "",
        status: "upcoming" as string,
        description: "",
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            setTournaments(await tournamentsApi.list());
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    function openAdd() {
        setEditing(null);
        setForm({ name: "", startDate: "", endDate: "", status: "upcoming", description: "" });
        setDialogOpen(true);
    }

    function openEdit(t: AdminTournament) {
        setEditing(t);
        setForm({
            name: t.name,
            startDate: t.startDate,
            endDate: t.endDate,
            status: t.status,
            description: t.description || "",
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        try {
            const data: Partial<AdminTournament> = {
                name: form.name,
                startDate: form.startDate,
                endDate: form.endDate,
                status: form.status as AdminTournament["status"],
                description: form.description || null,
            };
            if (editing) {
                await tournamentsApi.update(editing.ID, data);
                toast.success("Tournament updated");
            } else {
                await tournamentsApi.create(data);
                toast.success("Tournament created");
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
            await tournamentsApi.delete(deleteId);
            toast.success("Tournament deleted");
            setDeleteId(null);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading tournaments…
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Tournament Management
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage tournaments and competitions
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tournament
                </Button>
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tournaments.map((t) => (
                    <Card
                        key={t.ID}
                        className="border-border bg-card p-5 transition-colors hover:border-primary/30"
                    >
                        <div className="mb-4 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                                    <Trophy className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{t.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t.startDate} — {t.endDate}
                                    </p>
                                </div>
                            </div>
                            <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                        </div>

                        {t.description && (
                            <p className="mb-4 text-xs text-muted-foreground line-clamp-2">
                                {t.description}
                            </p>
                        )}

                        <div className="flex items-center justify-end gap-1 border-t border-border pt-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                                onClick={() => openEdit(t)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteId(t.ID)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Edit Tournament" : "Add New Tournament"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Name
                            </label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g., FIFA World Cup 2026"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Start Date
                                </label>
                                <Input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) =>
                                        setForm({ ...form, startDate: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    End Date
                                </label>
                                <Input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) =>
                                        setForm({ ...form, endDate: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Status
                            </label>
                            <Select
                                value={form.status}
                                onValueChange={(v) => setForm({ ...form, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="upcoming">Upcoming</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Description
                            </label>
                            <Input
                                value={form.description}
                                onChange={(e) =>
                                    setForm({ ...form, description: e.target.value })
                                }
                                placeholder="Optional description"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {editing ? "Update" : "Create"} Tournament
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="border-border bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the tournament. Matches linked to it won't be deleted.
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
