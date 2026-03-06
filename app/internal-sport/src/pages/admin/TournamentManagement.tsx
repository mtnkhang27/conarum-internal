import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus, Edit, Trash2, Trophy, Settings, Lock, Unlock,
    Download, Search, CheckCircle2, Loader2, RefreshCw,
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
    DialogDescription,
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
import { tournamentsApi, tournamentActionsApi, competitionImportApi } from "@/services/adminApi";
import type { AdminTournament, CompetitionItem } from "@/types/admin";

function statusVariant(status: string) {
    switch (status) {
        case "active":    return "default"     as const;
        case "completed": return "secondary"   as const;
        case "cancelled": return "destructive" as const;
        default:          return "outline"     as const;
    }
}

function planLabel(plan: string | null) {
    if (!plan) return null;
    const map: Record<string, string> = {
        TIER_ONE: "Tier 1", TIER_TWO: "Tier 2",
        TIER_THREE: "Tier 3", TIER_FOUR: "Tier 4",
    };
    return map[plan] ?? plan;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TournamentManagement() {
    const navigate = useNavigate();

    // ── Existing tournaments ─────────────────────────────────
    const [tournaments, setTournaments]     = useState<AdminTournament[]>([]);
    const [loading, setLoading]             = useState(true);

    // ── Manual add/edit dialog ───────────────────────────────
    const [dialogOpen, setDialogOpen]       = useState(false);
    const [editing, setEditing]             = useState<AdminTournament | null>(null);
    const [deleteId, setDeleteId]           = useState<string | null>(null);
    const [form, setForm] = useState({
        name: "", startDate: "", endDate: "",
        status: "upcoming" as string, description: "",
    });

    // ── Import competition dialog ────────────────────────────
    const [importOpen, setImportOpen]               = useState(false);
    const [importApiKey]                            = useState("");
    const [competitions, setCompetitions]           = useState<CompetitionItem[]>([]);
    const [compLoading, setCompLoading]             = useState(false);
    const [compFilter, setCompFilter]               = useState("");
    const [selectedComp, setSelectedComp]           = useState<CompetitionItem | null>(null);
    const [importing, setImporting]                 = useState(false);
    const [confirmImportOpen, setConfirmImportOpen] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try { setTournaments(await tournamentsApi.list()); }
        catch (e: any) { toast.error(e.message); }
        finally { setLoading(false); }
    }

    // ── Manual form ──────────────────────────────────────────

    function openAdd() {
        setEditing(null);
        setForm({ name: "", startDate: "", endDate: "", status: "upcoming", description: "" });
        setDialogOpen(true);
    }

    function openEdit(t: AdminTournament) {
        setEditing(t);
        setForm({ name: t.name, startDate: t.startDate, endDate: t.endDate,
                  status: t.status, description: t.description || "" });
        setDialogOpen(true);
    }

    async function handleSave() {
        try {
            const data: Partial<AdminTournament> = {
                name: form.name, startDate: form.startDate, endDate: form.endDate,
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
        } catch (e: any) { toast.error(e.message); }
    }

    async function handleDelete() {
        if (!deleteId) return;
        try {
            await tournamentsApi.delete(deleteId);
            toast.success("Tournament deleted");
            setDeleteId(null);
            load();
        } catch (e: any) { toast.error(e.message); }
    }

    async function handleToggleBettingLock(t: AdminTournament) {
        try {
            const res = await tournamentActionsApi.lockBetting(t.ID, !t.bettingLocked);
            toast.success(res.message);
            load();
        } catch (e: any) { toast.error(e.message); }
    }

    // ── Import flow ──────────────────────────────────────────

    async function openImportDialog() {
        setImportOpen(true);
        setCompetitions([]);
        setCompFilter("");
        setSelectedComp(null);
        await fetchCompetitions(importApiKey);
    }

    async function fetchCompetitions(key: string) {
        setCompLoading(true);
        try {
            const data = await competitionImportApi.getAvailableCompetitions(key);
            setCompetitions(Array.isArray(data) ? data : []);
        } catch (e: any) {
            toast.error(`Failed to load competitions: ${e.message}`);
        } finally {
            setCompLoading(false);
        }
    }

    function handleSelectComp(c: CompetitionItem) {
        if (importing) return;
        if (c.alreadyImported) {
            toast.info(`${c.name} is already imported. Navigate to it from the list.`);
            return;
        }
        setSelectedComp(c);
        setConfirmImportOpen(true);
    }

    async function handleImport() {
        if (!selectedComp) return;
        setImporting(true);
        try {
            const res = await competitionImportApi.importTournament(selectedComp.code, importApiKey);
            toast.success(res.message);
            setConfirmImportOpen(false);
            setImportOpen(false);
            await load();
            if (res.tournamentId) navigate(`/admin/tournaments/${res.tournamentId}`);
        } catch (e: any) {
            toast.error(`Import failed: ${e.message}`);
        } finally {
            setImporting(false);
        }
    }

    const filteredComps = competitions.filter((c) => {
        const q = compFilter.toLowerCase();
        return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    });

    // ── Render ───────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading tournaments…
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tournament Management</h1>
                    <p className="text-sm text-muted-foreground">Manage tournaments and competitions</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={openImportDialog}>
                        <Download className="mr-2 h-4 w-4" />
                        Import Competition
                    </Button>
                    <Button onClick={openAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Manually
                    </Button>
                </div>
            </div>

            {/* Tournament cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tournaments.map((t) => (
                    <Card key={t.ID} className="border-border bg-card p-5 transition-colors hover:border-primary/30">
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
                                    {t.externalCode && (
                                        <p className="text-[10px] text-muted-foreground/60 font-mono">
                                            {t.externalCode}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                                {t.bettingLocked && (
                                    <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                                        <Lock className="mr-1 h-3 w-3" /> Betting Locked
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {t.description && (
                            <p className="mb-4 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                        )}

                        <div className="flex items-center justify-end gap-1 border-t border-border pt-3">
                            <Button variant="ghost" size="sm"
                                className={`h-8 w-8 p-0 ${t.bettingLocked ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground hover:text-amber-400"}`}
                                title={t.bettingLocked ? "Unlock all betting" : "Lock all betting"}
                                onClick={() => handleToggleBettingLock(t)}>
                                {t.bettingLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                                title="Configure tournament"
                                onClick={() => navigate(`/admin/tournaments/${t.ID}`)}>
                                <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                                onClick={() => openEdit(t)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteId(t.ID)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* ── Import Competition Dialog ─────────────────────────── */}
            <Dialog open={importOpen} onOpenChange={(o) => { if (!importing) setImportOpen(o); }}>
                <DialogContent className="border-border bg-card text-white sm:max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-primary" />
                            Import Competition from Football-Data.org
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            Select a competition to import. Tournaments already imported are marked and cannot be re-imported.
                        </DialogDescription>
                    </DialogHeader>

                    {/* API Key + Search row */}
                    <div className="flex gap-2 pt-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter competitions…"
                                value={compFilter}
                                onChange={(e) => setCompFilter(e.target.value)}
                                className="pl-9"
                                disabled={importing}
                            />
                        </div>
                        {/* <Input
                            placeholder="API key (optional)"
                            value={importApiKey}
                            onChange={(e) => setImportApiKey(e.target.value)}
                            className="w-52"
                        /> */}
                        <Button variant="outline" size="icon"
                            title="Refresh competition list"
                            onClick={() => fetchCompetitions(importApiKey)}
                            disabled={compLoading || importing}>
                            <RefreshCw className={`h-4 w-4 ${compLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {/* Competition list */}
                    <div className="overflow-y-auto flex-1 pr-1 -mr-1">
                        {compLoading ? (
                            <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Loading competitions…
                            </div>
                        ) : filteredComps.length === 0 ? (
                            <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
                                No competitions found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 py-2">
                                {filteredComps.map((c) => (
                                    <button
                                        key={c.code}
                                        onClick={() => handleSelectComp(c)}
                                        disabled={c.alreadyImported || importing}
                                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors
                                            ${c.alreadyImported
                                                ? "border-border/40 bg-muted/20 opacity-50 cursor-not-allowed"
                                                : "border-border bg-background hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                                            }`}
                                    >
                                        {/* Emblem */}
                                        {c.emblem ? (
                                            <img src={c.emblem} alt={c.name} className="h-12 w-12 object-contain flex-shrink-0 bg-white p-2 rounded-sm" />
                                        ) : (
                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                                                <Trophy className="h-5 w-5 text-primary" />
                                            </div>
                                        )}

                                        {/* Info */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-medium text-sm text-white truncate">{c.name}</span>
                                                {c.alreadyImported && (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span className="font-mono text-[10px] text-muted-foreground bg-muted/30 px-1 rounded">
                                                    {c.code}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] py-0 px-1 h-4">
                                                    {c.type}
                                                </Badge>
                                                {c.plan && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {planLabel(c.plan)}
                                                    </span>
                                                )}
                                            </div>
                                            {(c.seasonStart || c.seasonEnd) && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {c.seasonStart?.substring(0, 10)} → {c.seasonEnd?.substring(0, 10)}
                                                </p>
                                            )}
                                            {c.alreadyImported && (
                                                <p className="text-[10px] text-green-400 mt-0.5">Already imported</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2 border-t border-border">
                        <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Close</Button>
                    </DialogFooter>

                    {importing && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-[1px]">
                            <div className="flex items-center gap-2 rounded-md border border-border bg-card/95 px-4 py-3 text-sm text-white shadow-lg">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                Importing tournament…
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Confirm Import Dialog ──────────────────────────────── */}
            <AlertDialog open={confirmImportOpen} onOpenChange={(o) => { if (!importing) setConfirmImportOpen(o); }}>
                <AlertDialogContent className="border-border bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            {selectedComp?.emblem && (
                                <img src={selectedComp.emblem} alt="" className="h-8 w-8 object-contain" />
                            )}
                            Import {selectedComp?.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground space-y-1">
                            <p>This will:</p>
                            <ul className="list-disc list-inside text-sm space-y-0.5">
                                <li>Create a new Tournament (<span className="font-mono text-xs">{selectedComp?.code}</span>)</li>
                                <li>Import all teams (reusing existing ones by crest/TLA)</li>
                                <li>Create all matches with external IDs for future sync</li>
                                <li>Assign group positions from standings where available</li>
                            </ul>
                            {selectedComp?.seasonStart && (
                                <p className="text-xs mt-2">
                                    Season: {selectedComp.seasonStart?.substring(0, 10)} → {selectedComp.seasonEnd?.substring(0, 10)}
                                </p>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleImport}
                            disabled={importing}
                            className="bg-primary text-white hover:bg-primary/90">
                            {importing ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</>
                            ) : (
                                <><Download className="mr-2 h-4 w-4" /> Import</>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Add/Edit Manual Dialog ─────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Tournament" : "Add Tournament Manually"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Name</label>
                            <Input value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g., FIFA World Cup 2026" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                                <Input type="date" value={form.startDate}
                                    onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                                <Input type="date" value={form.endDate}
                                    onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Status</label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="upcoming">Upcoming</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Description</label>
                            <Input value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Optional description" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>{editing ? "Update" : "Create"} Tournament</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ────────────────────────────────── */}
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
                        <AlertDialogAction onClick={handleDelete}
                            className="bg-destructive text-white hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

