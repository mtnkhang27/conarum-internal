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
    const [selectedStage, setSelectedStage] = useState<string>("all");
    const [selectedDay, setSelectedDay] = useState<string>("");
    const [teamSearch, setTeamSearch] = useState<string>("");
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
    const [isCorrection, setIsCorrection] = useState(false);

    // Penalty winner dialog
    const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
    const [penaltyMatch, setPenaltyMatch] = useState<AdminMatch | null>(null);
    const [penHome, setPenHome] = useState("");
    const [penAway, setPenAway] = useState("");

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
        isHotMatch: false,
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
            isHotMatch: false,
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
            isHotMatch: !!match.isHotMatch,
        });
        setDialogOpen(true);
    }

    function openResult(match: AdminMatch) {
        setResultMatch(match);
        setIsCorrection(false);
        setResultHome("");
        setResultAway("");
        setResultDialogOpen(true);
    }

    function openCorrectResult(match: AdminMatch) {
        setResultMatch(match);
        setIsCorrection(true);
        setResultHome(String(match.homeScore ?? ""));
        setResultAway(String(match.awayScore ?? ""));
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
                isHotMatch: !!form.isHotMatch,
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
            const res = isCorrection
                ? await matchesApi.correctResult(resultMatch.ID, parseInt(resultHome), parseInt(resultAway))
                : await matchesApi.enterResult(resultMatch.ID, parseInt(resultHome), parseInt(resultAway));
            toast.success(res.message);
            setResultDialogOpen(false);
            load();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleSetPenaltyWinner() {
        if (!penaltyMatch?.bracketSlot_ID) return;
        const h = parseInt(penHome);
        const a = parseInt(penAway);
        if (isNaN(h) || isNaN(a)) { toast.error("Please enter valid penalty scores."); return; }
        if (h === a) { toast.error("Penalty scores cannot be equal \u2014 there must be a winner."); return; }
        const winnerId = h > a ? penaltyMatch.homeTeam_ID : penaltyMatch.awayTeam_ID;
        try {
            const res = await matchesApi.setPenaltyWinner(penaltyMatch.bracketSlot_ID, winnerId, h, a);
            toast.success(res.message);
            setPenaltyDialogOpen(false);
            setPenHome("");
            setPenAway("");
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

    function formatLocalDateKey(value: string) {
        const date = new Date(value);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function teamName(id?: string | null) {
        if (!id) return "TBD";
        return teams.find((t) => t.ID === id)?.name || id;
    }

    function resolvedTeamName(team?: AdminTeam | null, id?: string | null) {
        return team?.name || teamName(id);
    }

    // Filter matches based on selected filters
    const filteredMatches = matches.filter((match) => {
        const homeName = resolvedTeamName(match.homeTeam, match.homeTeam_ID).toLowerCase();
        const awayName = resolvedTeamName(match.awayTeam, match.awayTeam_ID).toLowerCase();
        const search = teamSearch.trim().toLowerCase();

        const tournamentMatch = selectedTournament === "all" || match.tournament_ID === selectedTournament;
        const statusMatch = selectedStatus === "all" || match.status === selectedStatus;
        const stageMatch = selectedStage === "all" || match.stage === selectedStage;
        const dayMatch = !selectedDay || formatLocalDateKey(match.kickoff) === selectedDay;
        const teamMatch = !search || homeName.includes(search) || awayName.includes(search);

        return tournamentMatch && statusMatch && stageMatch && dayMatch && teamMatch;
    });

    const upcoming = filteredMatches.filter((m) => m.status === "upcoming").length;
    const live = filteredMatches.filter((m) => m.status === "live").length;
    const finished = filteredMatches.filter((m) => m.status === "finished").length;

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
                <div className="flex flex-wrap items-center justify-end gap-3">
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
                    {/* Stage filter */}
                    <Select
                        value={selectedStage}
                        onValueChange={setSelectedStage}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by stage" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            {STAGES.map((stage) => (
                                <SelectItem key={stage.value} value={stage.value}>
                                    {stage.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Day filter */}
                    <Input
                        type="date"
                        className="w-[170px]"
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                    />
                    {/* Team search */}
                    <Input
                        className="w-[220px]"
                        placeholder="Search team name..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                    />
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
                                <th className="px-4 py-3 text-right">Home</th>
                                <th className="px-2 py-3 text-center"></th>
                                <th className="px-4 py-3">Away</th>
                                <th className="px-4 py-3">Stage</th>
                                <th className="px-4 py-3">Date &amp; Time</th>
                                <th className="px-4 py-3">Matchday</th>
                                {/* <th className="px-4 py-3">Day</th> */}
                                <th className="px-4 py-3">Hot</th>
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
                                    {/* Home team */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1.5 font-medium text-white">
                                            {m.homeTeam?.name
                                                ? (
                                                    <>
                                                        <span>{m.homeTeam.name}</span>
                                                        {m.homeTeam.crest
                                                            ? <img src={m.homeTeam.crest} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />
                                                            : m.homeTeam.flagCode
                                                                ? <span className={`fi fi-${m.homeTeam.flagCode} flex-shrink-0`} />
                                                                : null}
                                                    </>
                                                )
                                                : <span>{teamName(m.homeTeam_ID)}</span>}
                                        </div>
                                    </td>
                                    {/* vs */}
                                    <td className="px-2 py-3 text-center text-xs text-muted-foreground">
                                        vs
                                    </td>
                                    {/* Away team */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 font-medium text-white">
                                            {m.awayTeam?.name
                                                ? (
                                                    <>
                                                        {m.awayTeam.crest
                                                            ? <img src={m.awayTeam.crest} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />
                                                            : m.awayTeam.flagCode
                                                                ? <span className={`fi fi-${m.awayTeam.flagCode} flex-shrink-0`} />
                                                                : null}
                                                        <span>{m.awayTeam.name}</span>
                                                    </>
                                                )
                                                : <span>{teamName(m.awayTeam_ID)}</span>}
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
                                    {/* <td className="px-4 py-3 text-muted-foreground">
                                        {m.venue || "—"}
                                    </td> */}
                                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                                        {m.matchday ?? "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {m.isHotMatch ? (
                                            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-400" variant="outline">
                                                Hot
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">No</span>
                                        )}
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
                                                {m.status === "finished" && (
                                                    <DropdownMenuItem onClick={() => openCorrectResult(m)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Correct Result
                                                    </DropdownMenuItem>
                                                )}
                                                {m.status === "finished" && m.bracketSlot_ID && (
                                                    <DropdownMenuItem onClick={() => { setPenaltyMatch(m); setPenHome(""); setPenAway(""); setPenaltyDialogOpen(true); }}>
                                                        <Trophy className="mr-2 h-4 w-4 text-amber-400" />
                                                        Penalty Shootout
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
                                        colSpan={10}
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
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Hot Match
                            </label>
                            <div className="flex items-center gap-5 rounded-md border border-border bg-surface-dark/40 px-3 py-2">
                                <label className="inline-flex items-center gap-2 text-sm text-white">
                                    <input
                                        type="radio"
                                        name="match-hot-flag"
                                        checked={form.isHotMatch}
                                        onChange={() => setForm({ ...form, isHotMatch: true })}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    Hot
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm text-white">
                                    <input
                                        type="radio"
                                        name="match-hot-flag"
                                        checked={!form.isHotMatch}
                                        onChange={() => setForm({ ...form, isHotMatch: false })}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    Normal
                                </label>
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

            {/* Enter / Correct Result Dialog */}
            <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{isCorrection ? "Correct Match Result" : "Enter Match Result"}</DialogTitle>
                    </DialogHeader>
                    {resultMatch && (
                        <div className="space-y-4 py-4">
                            <p className="text-center text-sm text-muted-foreground">
                                {resultMatch.homeTeam?.name || teamName(resultMatch.homeTeam_ID)}{" "}
                                vs{" "}
                                {resultMatch.awayTeam?.name || teamName(resultMatch.awayTeam_ID)}
                            </p>
                            {isCorrection && (
                                <p className="text-center text-xs text-amber-400">
                                    ⚠ Predictions and score bets will be re-scored, and the leaderboard will be recalculated.
                                </p>
                            )}
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
                            {isCorrection ? "Save Correction" : "Submit Result"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Penalty Shootout Dialog */}
            <Dialog open={penaltyDialogOpen} onOpenChange={(o) => { if (!o) { setPenHome(""); setPenAway(""); } setPenaltyDialogOpen(o); }}>
                <DialogContent className="border-border bg-card text-white sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Penalty Shootout Result</DialogTitle>
                    </DialogHeader>
                    {penaltyMatch && (
                        <div className="space-y-5 py-4">
                            <p className="text-center text-xs text-amber-400">
                                ⚠ Only applicable when aggregate is level and no winner is set yet.
                            </p>
                            <div className="flex items-end justify-center gap-3">
                                <div className="space-y-1 text-center">
                                    <label className="text-xs text-muted-foreground">{penaltyMatch.homeTeam?.name || teamName(penaltyMatch.homeTeam_ID)}</label>
                                    <input
                                        type="number" min="0" max="99"
                                        className="w-20 rounded border border-border bg-card text-center text-lg text-white"
                                        value={penHome}
                                        onChange={(e) => setPenHome(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <span className="mb-2 text-sm text-muted-foreground">–</span>
                                <div className="space-y-1 text-center">
                                    <label className="text-xs text-muted-foreground">{penaltyMatch.awayTeam?.name || teamName(penaltyMatch.awayTeam_ID)}</label>
                                    <input
                                        type="number" min="0" max="99"
                                        className="w-20 rounded border border-border bg-card text-center text-lg text-white"
                                        value={penAway}
                                        onChange={(e) => setPenAway(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setPenHome(""); setPenAway(""); setPenaltyDialogOpen(false); }}>
                            Cancel
                        </Button>
                        <Button
                            disabled={penHome === "" || penAway === ""}
                            onClick={handleSetPenaltyWinner}
                        >
                            Confirm
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
