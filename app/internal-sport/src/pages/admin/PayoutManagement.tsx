import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ExternalLink,
    Loader2,
    Save,
    ShieldCheck,
    Target,
    Trophy,
    Undo2,
} from "lucide-react";
import { payoutApi, tournamentsApi } from "@/services/adminApi";
import type { AdminTournament, PayoutAwardInput, PayoutItem } from "@/types/admin";

type AwardTypeFilter = "all" | "scoreBet" | "championPick" | "leaderboard";
type AwardStatusFilter = "all" | "pending" | "awarded" | "reverted";

type AwardFormState = {
    rewardDescription: string;
    rewardAmount: string;
    evidenceNote: string;
    evidenceUrl: string;
};

const emptyFormState: AwardFormState = {
    rewardDescription: "",
    rewardAmount: "0",
    evidenceNote: "",
    evidenceUrl: "",
};

const formatDate = (iso?: string | null) => {
    if (!iso) return "--";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatCO = (amount?: number | null) => {
    const safeAmount = Number(amount ?? 0);
    return `${new Intl.NumberFormat("vi-VN").format(Number.isFinite(safeAmount) ? safeAmount : 0)} CO`;
};

function PlayerAvatar({
    avatarUrl,
    displayName,
}: {
    avatarUrl?: string | null;
    displayName: string;
}) {
    if (avatarUrl) {
        return <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />;
    }

    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {displayName.charAt(0).toUpperCase()}
        </div>
    );
}

function awardTypeClasses(type: PayoutItem["awardType"]) {
    switch (type) {
        case "scoreBet":
            return "border-sky-400/25 bg-sky-500/10 text-sky-300";
        case "championPick":
            return "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300";
        case "leaderboard":
            return "border-amber-400/25 bg-amber-500/10 text-amber-300";
        default:
            return "border-border bg-white/5 text-white/70";
    }
}

function awardStatusClasses(status: PayoutItem["awardStatus"]) {
    switch (status) {
        case "awarded":
            return "border-emerald-400/25 bg-emerald-500/10 text-emerald-400";
        case "reverted":
            return "border-rose-400/25 bg-rose-500/10 text-rose-400";
        default:
            return "border-amber-400/25 bg-amber-500/10 text-amber-300";
    }
}

function awardTypeIcon(type: PayoutItem["awardType"]) {
    switch (type) {
        case "scoreBet":
            return <Target className="h-4 w-4" />;
        case "championPick":
            return <ShieldCheck className="h-4 w-4" />;
        case "leaderboard":
            return <Trophy className="h-4 w-4" />;
        default:
            return null;
    }
}

function buildAwardPayload(item: PayoutItem, form: AwardFormState): PayoutAwardInput {
    return {
        sourceKey: item.sourceKey,
        awardType: item.awardType,
        tournamentId: item.tournamentId,
        playerId: item.playerId,
        matchId: item.matchId,
        scoreBetId: item.scoreBetId,
        championPickId: item.championPickId,
        leaderboardStatId: item.leaderboardStatId,
        rewardAmount: Number(form.rewardAmount || 0),
        rewardDescription: form.rewardDescription,
        evidenceNote: form.evidenceNote,
        evidenceUrl: form.evidenceUrl,
    };
}

function itemMatchesSearch(item: PayoutItem, query: string) {
    if (!query) return true;

    const haystack = [
        item.playerDisplayName,
        item.playerEmail,
        item.homeTeam,
        item.awayTeam,
        item.championTeamName,
        item.rewardDescription,
        item.evidenceNote,
        item.awardedByName,
        item.awardedByEmail,
    ]
        .join(" ")
        .toLowerCase();

    return haystack.includes(query.toLowerCase());
}
function AwardDetails({ item }: { item: PayoutItem }) {
    if (item.awardType === "scoreBet") {
        return (
            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-surface/30 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Match</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                        {item.homeTeam} vs {item.awayTeam}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.kickoff)}</div>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-primary/70">Prediction</div>
                    <div className="mt-1 text-lg font-bold text-primary">
                        {item.predictedHomeScore ?? "-"} - {item.predictedAwayScore ?? "-"}
                    </div>
                </div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">Actual</div>
                    <div className="mt-1 text-lg font-bold text-emerald-400">
                        {item.actualHomeScore ?? "-"} - {item.actualAwayScore ?? "-"}
                    </div>
                </div>
            </div>
        );
    }

    if (item.awardType === "championPick") {
        return (
            <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-surface/30 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Champion Team</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{item.championTeamName || "TBD"}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/30 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Submitted</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{formatDate(item.submittedAt)}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">Rank</div>
                <div className="mt-1 text-lg font-bold text-amber-300">#{item.leaderboardRank ?? "-"}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface/30 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Points</div>
                <div className="mt-1 text-lg font-bold text-foreground">{item.leaderboardPoints}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface/30 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Snapshot</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{formatDate(item.submittedAt)}</div>
            </div>
        </div>
    );
}

export function PayoutManagement() {
    const { t } = useTranslation();
    const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
    const [selectedTournament, setSelectedTournament] = useState("");
    const [payouts, setPayouts] = useState<PayoutItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState<AwardTypeFilter>("all");
    const [statusFilter, setStatusFilter] = useState<AwardStatusFilter>("all");
    const [search, setSearch] = useState("");
    const [editingSourceKey, setEditingSourceKey] = useState<string | null>(null);
    const [form, setForm] = useState<AwardFormState>(emptyFormState);

    useEffect(() => {
        tournamentsApi.list().then(setTournaments).catch(console.error);
    }, []);

    const loadPayouts = useCallback(async () => {
        if (!selectedTournament) {
            setPayouts([]);
            return;
        }

        setLoading(true);
        try {
            const data = await payoutApi.getByTournament(selectedTournament);
            setPayouts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load payout audit items:", err);
            setPayouts([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTournament]);

    useEffect(() => {
        loadPayouts();
    }, [loadPayouts]);

    const filteredPayouts = useMemo(() => {
        return payouts.filter((item) => {
            if (typeFilter !== "all" && item.awardType !== typeFilter) return false;
            if (statusFilter !== "all" && item.awardStatus !== statusFilter) return false;
            return itemMatchesSearch(item, search.trim());
        });
    }, [payouts, typeFilter, statusFilter, search]);

    const stats = useMemo(() => {
        const pending = payouts.filter((item) => item.awardStatus === "pending").length;
        const awarded = payouts.filter((item) => item.awardStatus === "awarded").length;
        const reverted = payouts.filter((item) => item.awardStatus === "reverted").length;
        const awardedAmount = payouts
            .filter((item) => item.awardStatus === "awarded")
            .reduce((sum, item) => sum + (item.rewardAmount || 0), 0);
        return {
            total: payouts.length,
            pending,
            awarded,
            reverted,
            awardedAmount,
        };
    }, [payouts]);

    const beginEdit = (item: PayoutItem) => {
        setEditingSourceKey(item.sourceKey);
        setForm({
            rewardDescription: item.rewardDescription || "",
            rewardAmount: String(item.rewardAmount ?? 0),
            evidenceNote: item.evidenceNote || "",
            evidenceUrl: item.evidenceUrl || "",
        });
    };

    const closeEdit = () => {
        setEditingSourceKey(null);
        setForm(emptyFormState);
    };

    const handleSave = async (item: PayoutItem) => {
        setActionLoading(true);
        try {
            await payoutApi.award(buildAwardPayload(item, form));
            closeEdit();
            await loadPayouts();
        } catch (err) {
            console.error("Failed to save payout award:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevert = async (item: PayoutItem) => {
        if (!item.awardId) return;

        const revertReason = window.prompt("Reason for reverting this award?", item.revertReason || "");
        if (revertReason === null) return;

        setActionLoading(true);
        try {
            await payoutApi.revert(item.awardId, revertReason);
            await loadPayouts();
        } catch (err) {
            console.error("Failed to revert payout award:", err);
        } finally {
            setActionLoading(false);
        }
    };
    return (
        <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-foreground">{t("admin.payoutManagement.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("admin.payoutManagement.subtitle")}</p>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(240px,320px)_repeat(3,minmax(0,1fr))]">
                <select
                    value={selectedTournament}
                    onChange={(e) => {
                        setSelectedTournament(e.target.value);
                        closeEdit();
                    }}
                    className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                >
                    <option value="">{t("admin.payoutManagement.selectTournament")}</option>
                    {tournaments.map((tournament) => (
                        <option key={tournament.ID} value={tournament.ID}>
                            {tournament.name}
                        </option>
                    ))}
                </select>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as AwardTypeFilter)}
                    className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                >
                    <option value="all">All Types</option>
                    <option value="scoreBet">Exact Score</option>
                    <option value="championPick">Champion Pick</option>
                    <option value="leaderboard">Leaderboard</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as AwardStatusFilter)}
                    className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="awarded">Awarded</option>
                    <option value="reverted">Reverted</option>
                </select>

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search player, match, team, evidence..."
                    className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
            </div>

            {selectedTournament && !loading && payouts.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-border bg-card/80 p-4">
                        <div className="text-xs text-muted-foreground">Total Candidate Items</div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
                    </div>
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
                        <div className="text-xs text-amber-300">Pending</div>
                        <div className="mt-1 text-2xl font-bold text-amber-300">{stats.pending}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                        <div className="text-xs text-emerald-300">Awarded</div>
                        <div className="mt-1 text-2xl font-bold text-emerald-400">{stats.awarded}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-card/80 p-4">
                        <div className="text-xs text-muted-foreground">Awarded Amount</div>
                        <div className="mt-1 text-xl font-bold text-foreground">{formatCO(stats.awardedAmount)}</div>
                    </div>
                </div>
            )}

            {!selectedTournament ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 text-center">
                    <p className="text-sm text-muted-foreground">{t("admin.payoutManagement.selectTournamentHint")}</p>
                </div>
            ) : loading ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card/70">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-3 text-sm text-muted-foreground">{t("admin.payoutManagement.loading")}</span>
                </div>
            ) : filteredPayouts.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 text-center">
                    <p className="text-sm text-muted-foreground">No payout audit items found for the current filters.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPayouts.map((item) => {
                        const isEditing = editingSourceKey === item.sourceKey;

                        return (
                            <article
                                key={item.sourceKey}
                                className="rounded-2xl border border-border bg-card/90 p-4 shadow-[0_10px_30px_rgba(10,10,30,0.28)]"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <PlayerAvatar avatarUrl={item.playerAvatarUrl} displayName={item.playerDisplayName} />
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="text-base font-semibold text-foreground">{item.playerDisplayName}</h2>
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${awardTypeClasses(item.awardType)}`}
                                                    >
                                                        {awardTypeIcon(item.awardType)}
                                                        {item.awardTypeLabel}
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${awardStatusClasses(item.awardStatus)}`}
                                                    >
                                                        {item.awardStatus}
                                                    </span>
                                                </div>
                                                <p className="mt-1 truncate text-sm text-muted-foreground">{item.playerEmail}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 lg:justify-end">
                                            {item.awardStatus !== "awarded" && (
                                                <button
                                                    type="button"
                                                    onClick={() => beginEdit(item)}
                                                    disabled={actionLoading}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                                                >
                                                    <Save className="h-4 w-4" />
                                                    {item.awardStatus === "reverted" ? "Re-award" : "Mark Awarded"}
                                                </button>
                                            )}
                                            {item.awardStatus === "awarded" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => beginEdit(item)}
                                                        disabled={actionLoading}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:opacity-50"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                        Update Evidence
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleRevert(item)}
                                                        disabled={actionLoading || !item.awardId}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                                                    >
                                                        <Undo2 className="h-4 w-4" />
                                                        Revert
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <AwardDetails item={item} />

                                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                        <div className="rounded-xl border border-border/60 bg-surface/30 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Reward</div>
                                            <div className="mt-1 text-sm font-semibold text-foreground">
                                                {item.rewardDescription || "No reward description yet"}
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                Amount: <span className="font-semibold text-foreground">{formatCO(item.rewardAmount)}</span>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-border/60 bg-surface/30 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Audit</div>
                                            <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                                <div>
                                                    Awarded: <span className="text-foreground">{formatDate(item.awardedAt)}</span>
                                                </div>
                                                <div>
                                                    By: <span className="text-foreground">{item.awardedByName || "--"}</span>
                                                </div>
                                                {item.revertedAt && (
                                                    <div>
                                                        Reverted: <span className="text-foreground">{formatDate(item.revertedAt)}</span>
                                                    </div>
                                                )}
                                                {item.revertReason && (
                                                    <div>
                                                        Reason: <span className="text-foreground">{item.revertReason}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {(item.evidenceNote || item.evidenceUrl) && (
                                        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">Evidence</div>
                                            <div className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                                                {item.evidenceNote || "No note"}
                                            </div>
                                            {item.evidenceUrl && (
                                                <a
                                                    href={item.evidenceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Open proof link
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {isEditing && (
                                        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
                                            <div className="grid gap-3 lg:grid-cols-2">
                                                <label className="space-y-2">
                                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Reward Description</span>
                                                    <input
                                                        type="text"
                                                        value={form.rewardDescription}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, rewardDescription: e.target.value }))}
                                                        className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                                                        placeholder="Describe what was awarded"
                                                    />
                                                </label>

                                                <label className="space-y-2">
                                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Reward Amount (CO)</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={form.rewardAmount}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, rewardAmount: e.target.value }))}
                                                        className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                                                    />
                                                </label>

                                                <label className="space-y-2 lg:col-span-2">
                                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Evidence Note</span>
                                                    <textarea
                                                        value={form.evidenceNote}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, evidenceNote: e.target.value }))}
                                                        rows={3}
                                                        className="w-full rounded-lg border border-border bg-surface-dark px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                                                        placeholder="Paste transaction note, award memo, proof summary..."
                                                    />
                                                </label>

                                                <label className="space-y-2 lg:col-span-2">
                                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Evidence URL</span>
                                                    <input
                                                        type="url"
                                                        value={form.evidenceUrl}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, evidenceUrl: e.target.value }))}
                                                        className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                                                        placeholder="Optional proof link"
                                                    />
                                                </label>
                                            </div>

                                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={closeEdit}
                                                    className="inline-flex items-center justify-center rounded-lg border border-border bg-surface-dark px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleSave(item)}
                                                    disabled={actionLoading}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:opacity-50"
                                                >
                                                    <Save className="h-4 w-4" />
                                                    Save Award Record
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
