import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();

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
                toast.success(t("admin.tournamentManagement.tournamentUpdated"));
            } else {
                await tournamentsApi.create(data);
                toast.success(t("admin.tournamentManagement.tournamentCreated"));
            }
            setDialogOpen(false);
            load();
        } catch (e: any) { toast.error(e.message); }
    }

    async function handleDelete() {
        if (!deleteId) return;
        try {
            await tournamentsApi.delete(deleteId);
            toast.success(t("admin.tournamentManagement.tournamentDeleted"));
            setDeleteId(null);
            load();
        } catch (e: any) { toast.error(e.message); }
    }

    async function handleToggleBettingLock(trn: AdminTournament) {
        try {
            const res = await tournamentActionsApi.lockBetting(trn.ID, !trn.bettingLocked);
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
            toast.error(t("admin.tournamentManagement.loadFailed", { message: e.message }));
        } finally {
            setCompLoading(false);
        }
    }

    function handleSelectComp(c: CompetitionItem) {
        if (importing) return;
        if (c.alreadyImported) {
            toast.info(t("admin.tournamentManagement.alreadyImportedToast", { name: c.name }));
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
            toast.error(t("admin.tournamentManagement.importFailed", { message: e.message }));
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
                {t("common.loading")}
            </div>
        );
    }

    return (
        <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t("admin.tournamentManagement.title")}</h1>
                    <p className="text-sm text-muted-foreground">{t("admin.tournamentManagement.subtitle")}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button className="w-full sm:w-auto" variant="outline" onClick={openImportDialog}>
                        <Download className="mr-2 h-4 w-4" />
                        {t("admin.tournamentManagement.importCompetition")}
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={openAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("admin.tournamentManagement.addManually")}
                    </Button>
                </div>
            </div>

            {/* Tournament cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tournaments.map((trn) => (
                    <Card key={trn.ID} className="border-border bg-card p-5 transition-colors hover:border-primary/30">
                        <div className="mb-4 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                                    <Trophy className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{trn.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {trn.startDate} — {trn.endDate}
                                    </p>
                                    {trn.externalCode && (
                                        <p className="text-[10px] text-muted-foreground/60 font-mono">
                                            {trn.externalCode}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant={statusVariant(trn.status)}>{trn.status}</Badge>
                                {trn.bettingLocked && (
                                    <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                                        <Lock className="mr-1 h-3 w-3" /> {t("admin.tournamentManagement.bettingLocked")}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {trn.description && (
                            <p className="mb-4 text-xs text-muted-foreground line-clamp-2">{trn.description}</p>
                        )}

                        <div className="flex items-center justify-end gap-1 border-t border-border pt-3">
                            <Button variant="ghost" size="sm"
                                className={`h-8 w-8 p-0 ${trn.bettingLocked ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground hover:text-amber-400"}`}
                                title={trn.bettingLocked ? t("admin.tournamentManagement.unlockBetting") : t("admin.tournamentManagement.lockBetting")}
                                onClick={() => handleToggleBettingLock(trn)}>
                                {trn.bettingLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                                title={t("admin.tournamentManagement.configureTournament")}
                                onClick={() => navigate(`/admin/tournaments/${trn.ID}`)}>
                                <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                                onClick={() => openEdit(trn)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteId(trn.ID)}>
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
                            {t("admin.tournamentManagement.importTitle")}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            {t("admin.tournamentManagement.importDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    {/* API Key + Search row */}
                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("admin.tournamentManagement.filterCompetitions")}
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
                        <Button className="w-full sm:w-10" variant="outline" size="icon"
                            title={t("admin.tournamentManagement.refreshList")}
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
                                {t("common.loading")}
                            </div>
                        ) : filteredComps.length === 0 ? (
                            <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
                                {t("admin.tournamentManagement.noCompetitions")}
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
                                                <p className="text-[10px] text-green-400 mt-0.5">{t("admin.tournamentManagement.alreadyImported")}</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2 border-t border-border">
                        <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>{t("common.close")}</Button>
                    </DialogFooter>

                    {importing && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-[1px]">
                            <div className="flex items-center gap-2 rounded-md border border-border bg-card/95 px-4 py-3 text-sm text-white shadow-lg">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                {t("admin.tournamentManagement.importingTournament")}
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
                            {t("admin.tournamentManagement.importConfirmTitle", { name: selectedComp?.name })}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground space-y-1">
                            <p>{t("admin.tournamentManagement.importConfirmDesc")}</p>
                            <ul className="list-disc list-inside text-sm space-y-0.5">
                                <li>{t("admin.tournamentManagement.importStep1", { code: selectedComp?.code })}</li>
                                <li>{t("admin.tournamentManagement.importStep2")}</li>
                                <li>{t("admin.tournamentManagement.importStep3")}</li>
                                <li>{t("admin.tournamentManagement.importStep4")}</li>
                            </ul>
                            {selectedComp?.seasonStart && (
                                <p className="text-xs mt-2">
                                    {t("admin.tournamentManagement.season", { start: selectedComp.seasonStart?.substring(0, 10), end: selectedComp.seasonEnd?.substring(0, 10) })}
                                </p>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={importing}>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleImport}
                            disabled={importing}
                            className="bg-primary text-white hover:bg-primary/90">
                            {importing ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("common.importing")}</>
                            ) : (
                                <><Download className="mr-2 h-4 w-4" /> {t("common.import")}</>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Add/Edit Manual Dialog ─────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? t("admin.tournamentManagement.editTournament") : t("admin.tournamentManagement.addTournamentManually")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">{t("common.name")}</label>
                            <Input value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder={t("admin.tournamentManagement.namePlaceholder")} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">{t("admin.tournamentManagement.startDate")}</label>
                                <Input type="date" value={form.startDate}
                                    onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">{t("admin.tournamentManagement.endDate")}</label>
                                <Input type="date" value={form.endDate}
                                    onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">{t("admin.tournamentManagement.status")}</label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="upcoming">{t("common.status.upcoming")}</SelectItem>
                                    <SelectItem value="active">{t("common.status.active")}</SelectItem>
                                    <SelectItem value="completed">{t("common.status.completed")}</SelectItem>
                                    <SelectItem value="cancelled">{t("common.status.cancelled")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">{t("admin.tournamentManagement.description")}</label>
                            <Input value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder={t("admin.tournamentManagement.descriptionPlaceholder")} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button className="w-full sm:w-auto" variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
                        <Button className="w-full sm:w-auto" onClick={handleSave}>{editing ? t("common.update") : t("common.create")} {t("admin.tournamentManagement.tournament")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ────────────────────────────────── */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="border-border bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.tournamentManagement.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("admin.tournamentManagement.deleteDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}
                            className="bg-destructive text-white hover:bg-destructive/90">
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

