import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    Banknote,
    CheckCircle2,
    Clock,
    Search,
    Loader2,
    Undo2,
    Trophy,
} from "lucide-react";
import { tournamentsApi, payoutApi } from "@/services/adminApi";
import type { AdminTournament, PayoutItem } from "@/types/admin";

type PayoutFilter = "all" | "unpaid" | "paid";

const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount) + " ₫";

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

    const filteredPayouts = useMemo(() => {
        let items = payouts;
        if (filter === "unpaid") items = items.filter((p) => !p.isPaidOut);
        if (filter === "paid") items = items.filter((p) => p.isPaidOut);
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
    }, [payouts, filter, search]);

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
        if (selectedBets.size === filteredPayouts.length) {
            setSelectedBets(new Set());
        } else {
            setSelectedBets(new Set(filteredPayouts.map((p) => p.betId)));
        }
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

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Banknote className="h-6 w-6 text-emerald-400" />
                        {t("admin.payoutManagement.title")}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t("admin.payoutManagement.subtitle")}
                    </p>
                </div>
            </div>

            {/* Tournament Selector */}
            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={selectedTournament}
                    onChange={(e) => {
                        setSelectedTournament(e.target.value);
                        setSelectedBets(new Set());
                    }}
                    className="h-10 min-w-[250px] rounded-lg border border-border bg-surface-dark px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
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
                        {/* Filter buttons */}
                        <div className="flex items-center rounded-lg border border-border bg-surface-dark overflow-hidden">
                            {(["all", "unpaid", "paid"] as PayoutFilter[]).map(
                                (f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-2 text-xs font-medium transition-colors ${
                                            filter === f
                                                ? "bg-primary text-white"
                                                : "text-muted-foreground hover:text-foreground hover:bg-surface"
                                        }`}
                                    >
                                        {t(`admin.payoutManagement.filter.${f}`)}
                                        {f === "unpaid" && stats.unpaid > 0 && (
                                            <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400">
                                                {stats.unpaid}
                                            </span>
                                        )}
                                    </button>
                                )
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("admin.payoutManagement.searchPlaceholder")}
                                className="h-10 w-full rounded-lg border border-border bg-surface-dark pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                            />
                        </div>
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
                        <div className="text-xs text-muted-foreground">{t("admin.payoutManagement.stats.totalAmount")}</div>
                        <div className="mt-1 text-xl font-bold text-foreground">{formatCurrency(stats.totalAmount)}</div>
                        {stats.unpaidAmount > 0 && (
                            <div className="text-xs text-amber-400 mt-1">
                                {t("admin.payoutManagement.stats.remaining")}: {formatCurrency(stats.unpaidAmount)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bulk actions */}
            {selectedBets.size > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <span className="text-sm font-medium text-primary">
                        {t("admin.payoutManagement.selected", { count: selectedBets.size })}
                    </span>
                    <div className="flex-1" />
                    {filter !== "paid" && (
                        <button
                            type="button"
                            onClick={() => handleBulkAction("paid")}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("admin.payoutManagement.markPaid")}
                        </button>
                    )}
                    {filter !== "unpaid" && (
                        <button
                            type="button"
                            onClick={() => handleBulkAction("unpaid")}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                            {t("admin.payoutManagement.markUnpaid")}
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            {!selectedTournament ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground/30 mb-4" />
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
                    <Banknote className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">
                        {t("admin.payoutManagement.noPayout")}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(10,10,30,0.35)]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface/55">
                                <th className="p-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedBets.size > 0 &&
                                            selectedBets.size === filteredPayouts.length
                                        }
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-border"
                                    />
                                </th>
                                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t("admin.payoutManagement.column.player")}
                                </th>
                                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t("admin.payoutManagement.column.match")}
                                </th>
                                <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t("admin.payoutManagement.column.prediction")}
                                </th>
                                <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t("admin.payoutManagement.column.actual")}
                                </th>
                                <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t("admin.payoutManagement.column.amount")}
                                </th>
                                <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t("admin.payoutManagement.column.status")}
                                </th>
                                <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                                            {item.playerAvatarUrl ? (
                                                <img
                                                    src={item.playerAvatarUrl}
                                                    alt=""
                                                    className="h-7 w-7 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                    {item.playerDisplayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
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
                                            {formatCurrency(item.payout)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {item.isPaidOut ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                                                <CheckCircle2 className="h-3 w-3" />
                                                {t("admin.payoutManagement.status.paid")}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                                                <Clock className="h-3 w-3" />
                                                {t("admin.payoutManagement.status.unpaid")}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSingleToggle(item.betId, item.isPaidOut)
                                            }
                                            disabled={actionLoading}
                                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                                item.isPaidOut
                                                    ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                            }`}
                                        >
                                            {item.isPaidOut ? (
                                                <>
                                                    <Undo2 className="h-3 w-3" />
                                                    {t("admin.payoutManagement.revert")}
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    {t("admin.payoutManagement.pay")}
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
