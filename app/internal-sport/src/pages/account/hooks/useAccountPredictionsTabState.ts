import { useCallback, useEffect, useMemo, useState } from "react";
import { loadMyPredictionFeed } from "@/services/accountService";
import type {
    AccountPredictionFeedItem,
    AccountPredictionFeedSummary,
    AccountPredictionStatusFilter,
    AccountPredictionTypeFilter,
    TournamentInfo,
} from "@/types";

const ITEMS_PER_PAGE = 6;

export type AccountPaginationItem = number | "dots-left" | "dots-right";

const EMPTY_SUMMARY: AccountPredictionFeedSummary = {
    trackedItems: 0,
    winnerPicks: 0,
    scoreBets: 0,
    pendingItems: 0,
    resolvedItems: 0,
};

function itemHasPending(item: AccountPredictionFeedItem) {
    const winnerPending = !!item.winnerPick && item.winnerPick.isCorrect == null;
    const scorePending = item.scoreBets.some((bet) => bet.isCorrect == null);
    return winnerPending || scorePending;
}

function itemHasResolved(item: AccountPredictionFeedItem) {
    const winnerResolved = !!item.winnerPick && item.winnerPick.isCorrect != null;
    const scoreResolved = item.scoreBets.some((bet) => bet.isCorrect != null);
    return winnerResolved || scoreResolved;
}

function matchesStatusFilter(
    item: AccountPredictionFeedItem,
    filter: AccountPredictionStatusFilter,
) {
    if (filter === "pending") return itemHasPending(item);
    if (filter === "resolved") return itemHasResolved(item);
    return true;
}

function matchesTypeFilter(
    item: AccountPredictionFeedItem,
    filter: AccountPredictionTypeFilter,
) {
    if (filter === "winner") return item.scope === "match" && !!item.winnerPick;
    if (filter === "scoreBet") return item.scope === "match" && item.scoreBets.length > 0;
    if (filter === "slot") return item.scope === "slot";
    return true;
}

function matchesSearchFilter(item: AccountPredictionFeedItem, rawQuery: string) {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return true;

    const haystacks = [
        item.tournamentName,
        item.label,
        item.homeTeam,
        item.awayTeam,
        item.winnerPick?.pick ?? "",
        ...item.scoreBets.map((bet) => `${bet.predictedHomeScore}-${bet.predictedAwayScore}`),
    ];

    return haystacks.some((value) => value.toLowerCase().includes(query));
}

function buildPaginationItems(
    currentPage: number,
    totalPages: number,
): AccountPaginationItem[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, "dots-right", totalPages];
    }

    if (currentPage >= totalPages - 3) {
        return [
            1,
            "dots-left",
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [
        1,
        "dots-left",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "dots-right",
        totalPages,
    ];
}

export function useAccountPredictionsTabState() {
    const [items, setItems] = useState<AccountPredictionFeedItem[]>([]);
    const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTournamentId, setSelectedTournamentId] = useState("");
    const [typeFilter, setTypeFilter] = useState<AccountPredictionTypeFilter>("winner");
    const [statusFilter, setStatusFilter] = useState<AccountPredictionStatusFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const feed = await loadMyPredictionFeed();
            setItems(feed.items);
            setTournaments(feed.tournaments);
            // Auto-select first tournament if none selected yet
            if (feed.tournaments.length > 0) {
                setSelectedTournamentId((prev) =>
                    prev && feed.tournaments.some((t) => t.ID === prev)
                        ? prev
                        : feed.tournaments[0].ID,
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        setPage(1);
    }, [selectedTournamentId, typeFilter, statusFilter, searchQuery]);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (selectedTournamentId && item.tournamentId !== selectedTournamentId) {
                return false;
            }

            if (!matchesTypeFilter(item, typeFilter)) {
                return false;
            }

            if (!matchesStatusFilter(item, statusFilter)) {
                return false;
            }

            if (!matchesSearchFilter(item, searchQuery)) {
                return false;
            }

            return true;
        });
    }, [items, searchQuery, selectedTournamentId, statusFilter, typeFilter]);

    const summary = useMemo<AccountPredictionFeedSummary>(() => {
        if (filteredItems.length === 0) return EMPTY_SUMMARY;

        return {
            trackedItems: filteredItems.length,
            winnerPicks: filteredItems.filter((item) => !!item.winnerPick).length,
            scoreBets: filteredItems.reduce((total, item) => total + item.scoreBets.length, 0),
            pendingItems: filteredItems.filter(itemHasPending).length,
            resolvedItems: filteredItems.filter(itemHasResolved).length,
        };
    }, [filteredItems]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    const pagedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(start, start + ITEMS_PER_PAGE);
    }, [currentPage, filteredItems]);

    const groupedItems = useMemo(() => {
        return pagedItems.reduce<Record<string, AccountPredictionFeedItem[]>>((groups, item) => {
            const key = item.tournamentName || "Unknown Tournament";
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    }, [pagedItems]);

    const paginationItems = useMemo(
        () => buildPaginationItems(currentPage, totalPages),
        [currentPage, totalPages],
    );

    const handlePageChange = useCallback((nextPage: number) => {
        const safePage = Math.min(totalPages, Math.max(1, nextPage));
        setPage(safePage);
    }, [totalPages]);

    return {
        loading,
        tournaments,
        selectedTournamentId,
        setSelectedTournamentId,
        typeFilter,
        setTypeFilter,
        statusFilter,
        setStatusFilter,
        searchQuery,
        setSearchQuery,
        summary,
        filteredCount: filteredItems.length,
        currentPage,
        totalPages,
        paginationItems,
        groupedItems,
        handlePageChange,
        reload: load,
    };
}
