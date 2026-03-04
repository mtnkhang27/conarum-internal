import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Calendar,
    Clock,
    MapPin,
    Plus,
    Edit,
    Trash2,
    Trophy,
    Settings,
    RefreshCw,
    Lock,
    Unlock,
    MoreHorizontal,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { matchesApi, teamsApi, tournamentsApi, tournamentActionsApi } from "@/services/adminApi";
import type { AdminMatch, AdminTeam, AdminTournament } from "@/types/admin";

const STAGES = [
    { value: "group", label: "Group Stage" },
    { value: "roundOf16", label: "Round of 16" },
    { value: "quarterFinal", label: "Quarter Final" },
    { value: "semiFinal", label: "Semi Final" },
    { value: "thirdPlace", label: "Third Place" },
    { value: "final", label: "Final" },
    { value: "regular", label: "Regular Season" },
    { value: "playoff", label: "Playoff" },
    { value: "relegation", label: "Relegation" },
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
    const navigate = useNavigate();
    const [matches, setMatches] = useState<AdminMatch[]>([]);
    const [teams, setTeams] = useState<AdminTeam[]>([]);
    const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("upcoming");
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

    // Sync dialog
    const [syncDialogOpen, setSyncDialogOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Per-match lock state
    const [lockingMatchId, setLockingMatchId] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState({
        homeTeam_ID: "",
        awayTeam_ID: "",
        tournament_ID: "",
        kickoff: "",
        venue: "",
        stage: "group",
        matchday: "",
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
            // Auto-select active tournament if available
            const active = tr.find((tournament) => tournament.status === "active");
            if (active) {
                setSelectedTournament(active.ID);
            }
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
            matchday: "",
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
            matchday: match.matchday != null ? String(match.matchday) : "",
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
            const data: Record<string, any> = {
                homeTeam_ID: form.homeTeam_ID,
                awayTeam_ID: form.awayTeam_ID,
                tournament_ID: form.tournament_ID,
                kickoff: new Date(form.kickoff).toISOString(),
                venue: form.venue || null,
                stage: form.stage as AdminMatch["stage"],
                matchday: form.matchday ? parseInt(form.matchday) : null,
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

    async function handleSync() {
        const tournamentId = selectedTournament !== "all" ? selectedTournament : null;
        if (!tournamentId) {
            toast.error("Please select a specific tournament to sync");
            return;
        }
        setSyncing(true);
        try {
            const res = await tournamentActionsApi.syncMatchResults(tournamentId);
            toast.success(res.message);
            setSyncDialogOpen(false);
            load();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSyncing(false);
        }
    }

    async function handleToggleMatchLock(match: AdminMatch) {
        setLockingMatchId(match.ID);
        try {
            const res = await matchesApi.lockBetting(match.ID, !match.bettingLocked);
            toast.success(res.message);
            load();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLockingMatchId(null);
        }
    }

    // Filter matches based on selected filters
    const filteredMatches = matches.filter((match) => {
        const tournamentMatch = selectedTournament === "all" || match.tournament_ID === selectedTournament;
        const statusMatch = selectedStatus === "all" || match.status === selectedStatus;
        return tournamentMatch && statusMatch;
    });

    const upcoming = filteredMatches.filter((m) => m.status === "upcoming").length;
    const live = filteredMatches.filter((m) => m.status === "live").length;
    const finished = filteredMatches.filter((m) => m.status === "finished").length;

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
                <div className="flex items-center gap-3">
                    {/* Tournament filter */}
                    <Select
                        value={selectedTournament}
                        onValueChange={setSelectedTournament}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by tournament" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tournaments</SelectItem>
                            {tournaments.map((t) => (
                                <SelectItem key={t.ID} value={t.ID}>
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Status filter */}
                    <Select
                        value={selectedStatus}
                        onValueChange={setSelectedStatus}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="finished">Finished</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={openAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Match
                    </Button>
                    {selectedTournament !== "all" && (
                        <Button
                            variant="outline"
                            onClick={() => setSyncDialogOpen(true)}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync Results
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-white">{upcoming}</p>
                        <p className="text-xl text-muted-foreground">Upcoming</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20 text-green-400">
                        <Clock className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-white">{live}</p>
                        <p className="text-xl text-muted-foreground">Live</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-border bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <MapPin className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-white">{finished}</p>
                        <p className="text-xl text-muted-foreground">Finished</p>
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
                                {/* <th className="px-4 py-3">Day</th> */}
                                <th className="px-4 py-3">Result</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMatches.map((m) => (
                                <tr
                                    key={m.ID}
                                    className="border-b border-border/50 cursor-pointer transition-colors hover:bg-surface"
                                    onClick={() => navigate(`/admin/matches/${m.ID}`)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 font-medium text-white">
                                            {m.homeTeam
                                                ? (
                                                    <>
                                                        {m.homeTeam.crest
                                                            ? <img src={m.homeTeam.crest} alt="" className="mr-1 inline h-5 w-5 object-contain align-middle" />
                                                            : <span className={`fi fi-${m.homeTeam.flagCode} mr-1`} />}
                                                        {m.homeTeam.name}
                                                    </>
                                                )
                                                : teamName(m.homeTeam_ID)}
                                            <span className="mx-2 text-muted-foreground">vs</span>
                                            {m.awayTeam
                                                ? (
                                                    <>
                                                        {m.awayTeam.crest
                                                            ? <img src={m.awayTeam.crest} alt="" className="mr-1 inline h-5 w-5 object-contain align-middle" />
                                                            : <span className={`fi fi-${m.awayTeam.flagCode} mr-1`} />}
                                                        {m.awayTeam.name}
                                                    </>
                                                )
                                                : teamName(m.awayTeam_ID)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 capitalize text-muted-foreground">
                                        {m.stage}
                                    </td>
                                    {/* <td className="px-4 py-3">
                                        <div className="text-muted-foreground">
                                            {new Date(m.kickoff).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground/60">
                                            {new Date(m.kickoff).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </td> */}
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {m.venue || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                                        {m.matchday ?? "—"}
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
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => navigate(`/admin/matches/${m.ID}`)}>
                                                    <Settings className="mr-2 h-4 w-4" />
                                                    Configure
                                                </DropdownMenuItem>
                                                {m.status !== "finished" && (
                                                    <DropdownMenuItem onClick={() => handleToggleMatchLock(m)}>
                                                        {m.bettingLocked ? (
                                                            <>
                                                                <Unlock className="mr-2 h-4 w-4" />
                                                                Unlock Betting
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock className="mr-2 h-4 w-4" />
                                                                Lock Betting
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                )}
                                                {m.status === "upcoming" && (
                                                    <DropdownMenuItem onClick={() => openResult(m)}>
                                                        <Trophy className="mr-2 h-4 w-4" />
                                                        Enter Result
                                                    </DropdownMenuItem>
                                                )}
                                                {m.status !== "finished" && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openEdit(m)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit Match
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={() => setDeleteId(m.ID)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Match
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                            {filteredMatches.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        No matches found
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
                                    Matchday
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={form.matchday}
                                    onChange={(e) => setForm({ ...form, matchday: e.target.value })}
                                    placeholder="e.g. 1-38"
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

            {/* Sync Results Dialog */}
            <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Sync Match Results</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Fetches match status, scores, venues, and team info from
                            football-data.org and updates all matches linked by their
                            external ID. Uses the built-in API token.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSync}
                            disabled={syncing}
                        >
                            {syncing ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            {syncing ? "Syncing…" : "Sync Now"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
