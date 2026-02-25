import { useState, useEffect } from "react";
import {
    Calendar,
    Clock,
    MapPin,
    Plus,
    Edit,
    Trash2,
    Trophy,
} from "lucide-react";
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
import { matchesApi, teamsApi, tournamentsApi } from "@/services/adminApi";
import type { AdminMatch, AdminTeam, AdminTournament } from "@/types/admin";

const STAGES = [
    { value: "group", label: "Group Stage" },
    { value: "roundOf16", label: "Round of 16" },
    { value: "quarterFinal", label: "Quarter Final" },
    { value: "semiFinal", label: "Semi Final" },
    { value: "thirdPlace", label: "Third Place" },
    { value: "final", label: "Final" },
];

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

export function MatchManagement() {
    const [matches, setMatches] = useState<AdminMatch[]>([]);
    const [teams, setTeams] = useState<AdminTeam[]>([]);
    const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<AdminMatch | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Result entry dialog
    const [resultDialogOpen, setResultDialogOpen] = useState(false);
    const [resultMatch, setResultMatch] = useState<AdminMatch | null>(null);
    const [resultHome, setResultHome] = useState("");
    const [resultAway, setResultAway] = useState("");

    // Form state
    const [form, setForm] = useState({
        homeTeam_ID: "",
        awayTeam_ID: "",
        tournament_ID: "",
        kickoff: "",
        venue: "",
        stage: "group",
        weight: "1",
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            const [m, t, tr] = await Promise.all([
                matchesApi.list(),
                teamsApi.list(),
                tournamentsApi.list(),
            ]);
            setMatches(m);
            setTeams(t);
            setTournaments(tr);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    function openAdd() {
        setEditing(null);
        setForm({
            homeTeam_ID: "",
            awayTeam_ID: "",
            tournament_ID: tournaments[0]?.ID || "",
            kickoff: "",
            venue: "",
            stage: "group",
            weight: "1",
        });
        setDialogOpen(true);
    }

    function openEdit(match: AdminMatch) {
        setEditing(match);
        setForm({
            homeTeam_ID: match.homeTeam_ID,
            awayTeam_ID: match.awayTeam_ID,
            tournament_ID: match.tournament_ID,
            kickoff: match.kickoff?.slice(0, 16) || "",
            venue: match.venue || "",
            stage: match.stage,
            weight: String(match.weight),
        });
        setDialogOpen(true);
    }

    function openResult(match: AdminMatch) {
        setResultMatch(match);
        setResultHome("");
        setResultAway("");
        setResultDialogOpen(true);
    }

    async function handleSave() {
        try {
            const data = {
                homeTeam_ID: form.homeTeam_ID,
                awayTeam_ID: form.awayTeam_ID,
                tournament_ID: form.tournament_ID,
                kickoff: new Date(form.kickoff).toISOString(),
                venue: form.venue || null,
                stage: form.stage as AdminMatch["stage"],
                weight: parseFloat(form.weight),
            };

            if (editing) {
                await matchesApi.update(editing.ID, data);
                toast.success("Match updated");
            } else {
                await matchesApi.create(data);
                toast.success("Match created");
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
            await matchesApi.delete(deleteId);
            toast.success("Match deleted");
            setDeleteId(null);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleEnterResult() {
        if (!resultMatch) return;
        try {
            const res = await matchesApi.enterResult(
                resultMatch.ID,
                parseInt(resultHome),
                parseInt(resultAway)
            );
            toast.success(res.message);
            setResultDialogOpen(false);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const upcoming = matches.filter((m) => m.status === "upcoming").length;
    const live = matches.filter((m) => m.status === "live").length;
    const finished = matches.filter((m) => m.status === "finished").length;

    function teamName(id: string) {
        return teams.find((t) => t.ID === id)?.name || id;
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading matches…
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Match Management</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage all matches and schedules
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Match
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{upcoming}</p>
                        <p className="text-xs text-muted-foreground">Upcoming</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20 text-green-400">
                        <Clock className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{live}</p>
                        <p className="text-xs text-muted-foreground">Live</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{finished}</p>
                        <p className="text-xs text-muted-foreground">Finished</p>
                    </div>
                </Card>
            </div>

            {/* Table */}
            <Card className="border-border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3">Match</th>
                                <th className="px-4 py-3">Stage</th>
                                <th className="px-4 py-3">Date &amp; Time</th>
                                <th className="px-4 py-3">Venue</th>
                                <th className="px-4 py-3">Wt</th>
                                <th className="px-4 py-3">Result</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matches.map((m) => (
                                <tr
                                    key={m.ID}
                                    className="border-b border-border/50 transition-colors hover:bg-surface"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 font-medium text-white">
                                            {m.homeTeam
                                                ? (
                                                    <>
                                                        <span className={`fi fi-${m.homeTeam.flagCode} mr-1`} />
                                                        {m.homeTeam.name}
                                                    </>
                                                )
                                                : teamName(m.homeTeam_ID)}
                                            <span className="mx-2 text-muted-foreground">vs</span>
                                            {m.awayTeam
                                                ? (
                                                    <>
                                                        <span className={`fi fi-${m.awayTeam.flagCode} mr-1`} />
                                                        {m.awayTeam.name}
                                                    </>
                                                )
                                                : teamName(m.awayTeam_ID)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 capitalize text-muted-foreground">
                                        {m.stage}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-muted-foreground">
                                            {new Date(m.kickoff).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground/60">
                                            {new Date(m.kickoff).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {m.venue || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                                        {m.weight}x
                                    </td>
                                    <td className="px-4 py-3 font-mono text-white">
                                        {m.status === "finished"
                                            ? `${m.homeScore} – ${m.awayScore}`
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={statusVariant(m.status)}>
                                            {m.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {m.status === "upcoming" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                                                    title="Enter Result"
                                                    onClick={() => openResult(m)}
                                                >
                                                    <Trophy className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                                                onClick={() => openEdit(m)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => setDeleteId(m.ID)}
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
                <DialogContent className="border-border bg-card text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Edit Match" : "Add New Match"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Home Team
                                </label>
                                <Select
                                    value={form.homeTeam_ID}
                                    onValueChange={(v) => setForm({ ...form, homeTeam_ID: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((t) => (
                                            <SelectItem key={t.ID} value={t.ID}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Away Team
                                </label>
                                <Select
                                    value={form.awayTeam_ID}
                                    onValueChange={(v) => setForm({ ...form, awayTeam_ID: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((t) => (
                                            <SelectItem key={t.ID} value={t.ID}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Tournament
                            </label>
                            <Select
                                value={form.tournament_ID}
                                onValueChange={(v) => setForm({ ...form, tournament_ID: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tournament" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tournaments.map((t) => (
                                        <SelectItem key={t.ID} value={t.ID}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Date &amp; Time
                                </label>
                                <Input
                                    type="datetime-local"
                                    value={form.kickoff}
                                    onChange={(e) => setForm({ ...form, kickoff: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Stage
                                </label>
                                <Select
                                    value={form.stage}
                                    onValueChange={(v) => setForm({ ...form, stage: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STAGES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Venue
                                </label>
                                <Input
                                    value={form.venue}
                                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                                    placeholder="Stadium name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Weight
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    value={form.weight}
                                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {editing ? "Update" : "Create"} Match
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Enter Result Dialog */}
            <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Enter Match Result</DialogTitle>
                    </DialogHeader>
                    {resultMatch && (
                        <div className="space-y-4 py-4">
                            <p className="text-center text-sm text-muted-foreground">
                                {resultMatch.homeTeam?.name || teamName(resultMatch.homeTeam_ID)}{" "}
                                vs{" "}
                                {resultMatch.awayTeam?.name || teamName(resultMatch.awayTeam_ID)}
                            </p>
                            <div className="flex items-center justify-center gap-4">
                                <div className="space-y-1 text-center">
                                    <label className="text-xs text-muted-foreground">Home</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="99"
                                        className="w-20 text-center text-lg"
                                        value={resultHome}
                                        onChange={(e) => setResultHome(e.target.value)}
                                    />
                                </div>
                                <span className="mt-5 text-lg font-bold text-muted-foreground">
                                    –
                                </span>
                                <div className="space-y-1 text-center">
                                    <label className="text-xs text-muted-foreground">Away</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="99"
                                        className="w-20 text-center text-lg"
                                        value={resultAway}
                                        onChange={(e) => setResultAway(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setResultDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEnterResult}
                            disabled={resultHome === "" || resultAway === ""}
                        >
                            Submit Result
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
            >
                <AlertDialogContent className="border-border bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Match</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure? This action cannot be undone.
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
