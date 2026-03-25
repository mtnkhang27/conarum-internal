import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { tournamentsApi, payoutApi } from "@/services/adminApi";
import type { AdminTournament, PayoutItem } from "@/types/admin";

type PayoutFilter = "all" | "unpaid" | "paid";
type ViewMode = "flat" | "grouped";

const formatDate = (iso: string) => {
    if (!iso) return "--";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatCO = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount) + " CO";

function PlayerAvatar({
    avatarUrl,
    displayName,
    sizeClass = "h-8 w-8",
}: {
    avatarUrl?: string;
    displayName: string;
    sizeClass?: string;
}) {
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt=""
                className={`${sizeClass} rounded-full object-cover`}
            />
        );
    }

    return (
        <div
            className={`${sizeClass} flex items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary`}
        >
            {displayName.charAt(0).toUpperCase()}
        </div>
    );
}

function payoutStatusClasses(isPaidOut: boolean) {
    return isPaidOut
        ? "bg-emerald-500/10 text-emerald-400"
        : "bg-amber-500/10 text-amber-400";
}

function payoutActionClasses(isPaidOut: boolean) {
    return isPaidOut
        ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20";
}

interface PlayerGroup {
    playerId: string;
    playerDisplayName: string;
    playerEmail: string;
    playerAvatarUrl: string;
    items: PayoutItem[];
    totalPayout: number;
    unpaidCount: number;
    paidCount: number;
}

export function PayoutManagement() {
    const { t } = useTranslation();
    const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
    const [selectedTournament, setSelectedTournament] = useState("");
    const [payouts, setPayouts] = useState<PayoutItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<PayoutFilter>("unpaid");
    const [search, setSearch] = useState("");
    const [selectedBets, setSelectedBets] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("flat");
    const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
    const [playerFilter, setPlayerFilter] = useState("");

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
            console.error("Failed to load payouts:", err);
            setPayouts([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTournament]);

    useEffect(() => {
        loadPayouts();
    }, [loadPayouts]);

    // Get unique player list for player filter
    const uniquePlayers = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of payouts) {
            if (!map.has(p.playerId)) map.set(p.playerId, p.playerDisplayName);
        }
        return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [payouts]);

    const filteredPayouts = useMemo(() => {
        let items = payouts;
        if (filter === "unpaid") items = items.filter((p) => !p.isPaidOut);
        if (filter === "paid") items = items.filter((p) => p.isPaidOut);
        if (playerFilter) {
            items = items.filter((p) => p.playerId === playerFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(
                (p) =>
                    p.playerDisplayName.toLowerCase().includes(q) ||
                    p.playerEmail.toLowerCase().includes(q) ||
                    p.homeTeam.toLowerCase().includes(q) ||
                    p.awayTeam.toLowerCase().includes(q)
            );
        }
        return items;
    }, [payouts, filter, search, playerFilter]);

    const visibleSelectedCount = useMemo(
        () => filteredPayouts.filter((item) => selectedBets.has(item.betId)).length,
        [filteredPayouts, selectedBets],
    );

    const allVisibleSelected =
        filteredPayouts.length > 0 && visibleSelectedCount === filteredPayouts.length;

    // Group payouts by player
    const playerGroups = useMemo<PlayerGroup[]>(() => {
        const map = new Map<string, PlayerGroup>();
        for (const item of filteredPayouts) {
            let group = map.get(item.playerId);
            if (!group) {
                group = {
                    playerId: item.playerId,
                    playerDisplayName: item.playerDisplayName,
                    playerEmail: item.playerEmail,
                    playerAvatarUrl: item.playerAvatarUrl,
                    items: [],
                    totalPayout: 0,
                    unpaidCount: 0,
                    paidCount: 0,
                };
                map.set(item.playerId, group);
            }
            group.items.push(item);
            group.totalPayout += item.payout;
            if (item.isPaidOut) group.paidCount++;
            else group.unpaidCount++;
        }
        return Array.from(map.values()).sort((a, b) =>
            a.playerDisplayName.localeCompare(b.playerDisplayName)
        );
    }, [filteredPayouts]);

    const stats = useMemo(() => {
        const total = payouts.length;
        const unpaid = payouts.filter((p) => !p.isPaidOut).length;
        const paid = payouts.filter((p) => p.isPaidOut).length;
        const totalAmount = payouts.reduce((sum, p) => sum + p.payout, 0);
        const unpaidAmount = payouts
            .filter((p) => !p.isPaidOut)
            .reduce((sum, p) => sum + p.payout, 0);
        return { total, unpaid, paid, totalAmount, unpaidAmount };
    }, [payouts]);

    const toggleSelect = (betId: string) => {
        setSelectedBets((prev) => {
            const next = new Set(prev);
            if (next.has(betId)) next.delete(betId);
            else next.add(betId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const visibleIds = filteredPayouts.map((item) => item.betId);
        setSelectedBets((prev) => {
            const next = new Set(prev);
            if (visibleIds.every((id) => next.has(id))) {
                visibleIds.forEach((id) => next.delete(id));
            } else {
                visibleIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const toggleSelectPlayer = (group: PlayerGroup) => {
        setSelectedBets((prev) => {
            const next = new Set(prev);
            const allSelected = group.items.every((item) => next.has(item.betId));
            if (allSelected) {
                group.items.forEach((item) => next.delete(item.betId));
            } else {
                group.items.forEach((item) => next.add(item.betId));
            }
            return next;
        });
    };

    const toggleExpandPlayer = (playerId: string) => {
        setExpandedPlayers((prev) => {
            const next = new Set(prev);
            if (next.has(playerId)) next.delete(playerId);
            else next.add(playerId);
            return next;
        });
    };

    const handleBulkAction = async (action: "paid" | "unpaid") => {
        if (selectedBets.size === 0) return;
        setActionLoading(true);
        try {
            const ids = Array.from(selectedBets);
            if (action === "paid") {
                await payoutApi.markPaid(ids);
            } else {
                await payoutApi.markUnpaid(ids);
            }
            setSelectedBets(new Set());
            await loadPayouts();
        } catch (err) {
            console.error("Failed to update payouts:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSingleToggle = async (betId: string, currentlyPaid: boolean) => {
        setActionLoading(true);
        try {
            if (currentlyPaid) {
                await payoutApi.markUnpaid([betId]);
            } else {
                await payoutApi.markPaid([betId]);
            }
            await loadPayouts();
        } catch (err) {
            console.error("Failed to toggle payout:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetAll = async () => {
        if (!selectedTournament) return;
        if (!confirm("Reset ALL isPaidOut to false for this tournament? This cannot be undone.")) return;
        setActionLoading(true);
        try {
            await payoutApi.resetAllPayoutStatus(selectedTournament);
            await loadPayouts();
        } catch (err) {
            console.error("Failed to reset payout status:", err);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t("admin.payoutManagement.title")}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t("admin.payoutManagement.subtitle")}
                    </p>
                </div>
            </div>

            {/* Tournament Selector + Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <select
                    value={selectedTournament}
                    onChange={(e) => {
                        setSelectedTournament(e.target.value);
                        setSelectedBets(new Set());
                        setPlayerFilter("");
                    }}
                    className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary lg:min-w-[250px]"
                >
                    <option value="">
                        {t("admin.payoutManagement.selectTournament")}
                    </option>
                    {tournaments.map((t) => (
                        <option key={t.ID} value={t.ID}>
                            {t.name}
                        </option>
                    ))}
                </select>

                {selectedTournament && (
                    <>
                        {/* Filter select */}
                        <select
                            value={filter}
                            onChange={(e) => {
                                setFilter(e.target.value as PayoutFilter);
                                setSelectedBets(new Set());
                            }}
                            className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary sm:w-auto"
                        >
                            <option value="all">
                                {t("admin.payoutManagement.filter.all")} ({stats.total})
                            </option>
                            <option value="unpaid">
                                {t("admin.payoutManagement.filter.unpaid")} ({stats.unpaid})
                            </option>
                            <option value="paid">
                                {t("admin.payoutManagement.filter.paid")} ({stats.paid})
                            </option>
                        </select>

                        {/* Player filter */}
                        <select
                            value={playerFilter}
                            onChange={(e) => {
                                setPlayerFilter(e.target.value);
                                setSelectedBets(new Set());
                            }}
                            className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary sm:min-w-[180px] sm:w-auto"
                        >
                            <option value="">All Players</option>
                            {uniquePlayers.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        {/* View mode */}
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as ViewMode)}
                            className="h-10 w-full rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary sm:w-auto"
                        >
                            <option value="flat">Flat View</option>
                            <option value="grouped">Grouped by Player</option>
                        </select>

                        {/* Search */}
                        <div className="relative min-w-0 flex-1">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("admin.payoutManagement.searchPlaceholder")}
                                className="h-10 w-full rounded-lg border border-border bg-surface-dark pl-3 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                            />
                        </div>

                        {/* Reset All button (cheat) */}
                        <button
                            type="button"
                            onClick={handleResetAll}
                            disabled={actionLoading}
                            className="h-10 w-full rounded-lg border border-red-500/40 bg-red-500/10 px-4 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
                        >
                            Reset All Unpaid
                        </button>
                    </>
                )}
            </div>

            {/* Stats cards */}
            {selectedTournament && !loading && payouts.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-surface-dark/60 p-4">
                        <div className="text-xs text-muted-foreground">{t("admin.payoutManagement.stats.totalWinners")}</div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                        <div className="text-xs text-amber-400">{t("admin.payoutManagement.stats.unpaid")}</div>
                        <div className="mt-1 text-2xl font-bold text-amber-400">{stats.unpaid}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                        <div className="text-xs text-emerald-400">{t("admin.payoutManagement.stats.paid")}</div>
                        <div className="mt-1 text-2xl font-bold text-emerald-400">{stats.paid}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-dark/60 p-4">
                        <div className="text-xs text-muted-foreground">Total CO</div>
                        <div className="mt-1 text-xl font-bold text-foreground">{formatCO(stats.totalAmount)}</div>
                        {stats.unpaidAmount > 0 && (
                            <div className="text-xs text-amber-400 mt-1">
                                Remaining: {formatCO(stats.unpaidAmount)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bulk actions */}
            {selectedBets.size > 0 && (
                <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center">
                    <span className="text-sm font-medium text-primary">
                        {t("admin.payoutManagement.selected", { count: selectedBets.size })}
                    </span>
                    <div className="hidden flex-1 sm:block" />
                    {filter !== "paid" && (
                        <button
                            type="button"
                            onClick={() => handleBulkAction("paid")}
                            disabled={actionLoading}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50 sm:w-auto"
                        >
                            {t("admin.payoutManagement.markPaid")}
                        </button>
                    )}
                    {filter !== "unpaid" && (
                        <button
                            type="button"
                            onClick={() => handleBulkAction("unpaid")}
                            disabled={actionLoading}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50 sm:w-auto"
                        >
                            {t("admin.payoutManagement.markUnpaid")}
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            {!selectedTournament ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t("admin.payoutManagement.selectTournamentHint")}
                    </p>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">
                        {t("admin.payoutManagement.loading")}
                    </span>
                </div>
            ) : filteredPayouts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t("admin.payoutManagement.noPayout")}
                    </p>
                </div>
            ) : viewMode === "grouped" ? (
                /* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Grouped by Player View ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
                <div className="space-y-3">
                    {playerGroups.map((group) => {
                        const isExpanded = expandedPlayers.has(group.playerId);
                        const allSelected = group.items.every((item) => selectedBets.has(item.betId));
                        const someSelected = group.items.some((item) => selectedBets.has(item.betId));

                        return (
                            <div
                                key={group.playerId}
                                className="rounded-xl border border-border bg-card shadow-[0_4px_15px_rgba(10,10,30,0.25)] overflow-hidden"
                            >
                                {/* Player header */}
                                <div
                                    className="cursor-pointer px-4 py-4 transition-colors hover:bg-surface/30"
                                    onClick={() => toggleExpandPlayer(group.playerId)}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                ref={(el) => {
                                                    if (el) el.indeterminate = someSelected && !allSelected;
                                                }}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelectPlayer(group);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-4 w-4 rounded border-border"
                                            />
                                            <PlayerAvatar
                                                avatarUrl={group.playerAvatarUrl}
                                                displayName={group.playerDisplayName}
                                                sizeClass="h-10 w-10"
                                            />
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-foreground">
                                                    {group.playerDisplayName}
                                                </div>
                                                <div className="truncate text-[10px] text-muted-foreground">
                                                    {group.playerEmail}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
                                            <span className="rounded-full border border-border/70 bg-surface/60 px-2.5 py-1 text-xs font-semibold text-foreground">
                                                {formatCO(group.totalPayout)}
                                            </span>
                                            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                                                {group.unpaidCount} unpaid
                                            </span>
                                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                                                {group.paidCount} paid
                                            </span>
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface/50 text-muted-foreground">
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded detail table */}
                                {isExpanded && (
                                    <div className="border-t border-border">
                                        <div className="space-y-3 p-3 lg:hidden">
                                            {group.items.map((item) => (
                                                <div
                                                    key={item.betId}
                                                    className="rounded-xl border border-border/80 bg-surface/25 p-4"
                                                >
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-foreground">
                                                                {item.homeTeam} vs {item.awayTeam}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {formatDate(item.kickoff)}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${payoutStatusClasses(item.isPaidOut)}`}
                                                        >
                                                            {item.isPaidOut
                                                                ? t("admin.payoutManagement.status.paid")
                                                                : t("admin.payoutManagement.status.unpaid")}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                                            <div className="text-[10px] uppercase tracking-[0.16em] text-primary/70">
                                                                Prediction
                                                            </div>
                                                            <div className="mt-1 text-base font-semibold text-primary">
                                                                {item.predictedHomeScore} - {item.predictedAwayScore}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                                                            <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
                                                                Actual
                                                            </div>
                                                            <div className="mt-1 text-base font-semibold text-emerald-400">
                                                                {item.actualHomeScore} - {item.actualAwayScore}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-lg border border-border/70 bg-surface/40 p-3 sm:col-span-2">
                                                            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                                                Payout
                                                            </div>
                                                            <div className="mt-1 text-base font-semibold text-foreground">
                                                                {formatCO(item.payout)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSingleToggle(item.betId, item.isPaidOut)}
                                                        disabled={actionLoading}
                                                        className={`mt-3 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${payoutActionClasses(item.isPaidOut)}`}
                                                    >
                                                        {item.isPaidOut
                                                            ? t("admin.payoutManagement.revert")
                                                            : t("admin.payoutManagement.pay")}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="hidden lg:block">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-border bg-surface/40">
                                                        <th className="p-2 pl-12 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Match
                                                        </th>
                                                        <th className="p-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Prediction
                                                        </th>
                                                        <th className="p-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Actual
                                                        </th>
                                                        <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                            CO
                                                        </th>
                                                        <th className="p-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Status
                                                        </th>
                                                        <th className="p-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Action
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.items.map((item) => (
                                                        <tr
                                                            key={item.betId}
                                                            className="border-b border-border/50 transition-colors hover:bg-surface/20"
                                                        >
                                                            <td className="p-2 pl-12">
                                                                <div className="text-xs font-medium text-foreground">
                                                                    {item.homeTeam} vs {item.awayTeam}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {formatDate(item.kickoff)}
                                                                </div>
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                                                                    {item.predictedHomeScore} - {item.predictedAwayScore}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400">
                                                                    {item.actualHomeScore} - {item.actualAwayScore}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-right">
                                                                <span className="text-sm font-bold text-foreground">
                                                                    {formatCO(item.payout)}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <span
                                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${payoutStatusClasses(item.isPaidOut)}`}
                                                                >
                                                                    {item.isPaidOut
                                                                        ? t("admin.payoutManagement.status.paid")
                                                                        : t("admin.payoutManagement.status.unpaid")}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSingleToggle(item.betId, item.isPaidOut)}
                                                                    disabled={actionLoading}
                                                                    className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${payoutActionClasses(item.isPaidOut)}`}
                                                                >
                                                                    {item.isPaidOut
                                                                        ? t("admin.payoutManagement.revert")
                                                                        : t("admin.payoutManagement.pay")}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Flat Table View */
                <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/80 px-4 py-3 lg:hidden">
                        <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground">
                            <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 rounded border-border"
                            />
                            Select all visible
                        </label>
                        <span className="text-xs text-muted-foreground">
                            {visibleSelectedCount}/{filteredPayouts.length}
                        </span>
                    </div>

                    <div className="space-y-3 lg:hidden">
                        {filteredPayouts.map((item) => (
                            <article
                                key={item.betId}
                                className="rounded-xl border border-border bg-card p-4 shadow-[0_4px_15px_rgba(10,10,30,0.25)]"
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedBets.has(item.betId)}
                                        onChange={() => toggleSelect(item.betId)}
                                        className="mt-1 h-4 w-4 rounded border-border"
                                    />
                                    <PlayerAvatar
                                        avatarUrl={item.playerAvatarUrl}
                                        displayName={item.playerDisplayName}
                                        sizeClass="h-10 w-10"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-foreground">
                                                    {item.playerDisplayName}
                                                </div>
                                                <div className="truncate text-xs text-muted-foreground">
                                                    {item.playerEmail}
                                                </div>
                                            </div>
                                            <span
                                                className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${payoutStatusClasses(item.isPaidOut)}`}
                                            >
                                                {item.isPaidOut
                                                    ? t("admin.payoutManagement.status.paid")
                                                    : t("admin.payoutManagement.status.unpaid")}
                                            </span>
                                        </div>

                                        <div className="mt-3 rounded-xl border border-border/70 bg-surface/35 p-3">
                                            <div className="text-sm font-medium text-foreground">
                                                {item.homeTeam} vs {item.awayTeam}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {formatDate(item.kickoff)}
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                                <div className="text-[10px] uppercase tracking-[0.16em] text-primary/70">
                                                    Prediction
                                                </div>
                                                <div className="mt-1 text-base font-semibold text-primary">
                                                    {item.predictedHomeScore} - {item.predictedAwayScore}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                                                <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
                                                    Actual
                                                </div>
                                                <div className="mt-1 text-base font-semibold text-emerald-400">
                                                    {item.actualHomeScore} - {item.actualAwayScore}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-border/70 bg-surface/40 p-3 sm:col-span-2">
                                                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                                    Payout
                                                </div>
                                                <div className="mt-1 text-base font-semibold text-foreground">
                                                    {formatCO(item.payout)}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleSingleToggle(item.betId, item.isPaidOut)}
                                            disabled={actionLoading}
                                            className={`mt-3 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${payoutActionClasses(item.isPaidOut)}`}
                                        >
                                            {item.isPaidOut
                                                ? t("admin.payoutManagement.revert")
                                                : t("admin.payoutManagement.pay")}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)] lg:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-surface/55">
                                    <th className="p-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleSelectAll}
                                            className="h-4 w-4 rounded border-border"
                                        />
                                    </th>
                                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t("admin.payoutManagement.column.player")}
                                    </th>
                                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t("admin.payoutManagement.column.match")}
                                    </th>
                                    <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t("admin.payoutManagement.column.prediction")}
                                    </th>
                                    <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t("admin.payoutManagement.column.actual")}
                                    </th>
                                    <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        CO
                                    </th>
                                    <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t("admin.payoutManagement.column.status")}
                                    </th>
                                    <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t("admin.payoutManagement.column.action")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayouts.map((item) => (
                                    <tr
                                        key={item.betId}
                                        className="border-b border-border/50 transition-colors hover:bg-surface/30"
                                    >
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedBets.has(item.betId)}
                                                onChange={() => toggleSelect(item.betId)}
                                                className="h-4 w-4 rounded border-border"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <PlayerAvatar
                                                    avatarUrl={item.playerAvatarUrl}
                                                    displayName={item.playerDisplayName}
                                                    sizeClass="h-7 w-7"
                                                />
                                                <div>
                                                    <div className="font-medium text-foreground text-xs">
                                                        {item.playerDisplayName}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {item.playerEmail}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-xs font-medium text-foreground">
                                                {item.homeTeam} vs {item.awayTeam}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {formatDate(item.kickoff)}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                                                {item.predictedHomeScore} - {item.predictedAwayScore}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400">
                                                {item.actualHomeScore} - {item.actualAwayScore}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="text-sm font-bold text-foreground">
                                                {formatCO(item.payout)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${payoutStatusClasses(item.isPaidOut)}`}
                                            >
                                                {item.isPaidOut
                                                    ? t("admin.payoutManagement.status.paid")
                                                    : t("admin.payoutManagement.status.unpaid")}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleSingleToggle(item.betId, item.isPaidOut)}
                                                disabled={actionLoading}
                                                className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${payoutActionClasses(item.isPaidOut)}`}
                                            >
                                                {item.isPaidOut
                                                    ? t("admin.payoutManagement.revert")
                                                    : t("admin.payoutManagement.pay")}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
