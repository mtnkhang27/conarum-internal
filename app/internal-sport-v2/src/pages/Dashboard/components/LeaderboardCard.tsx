import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import axiosInstance from '@/services/core/axiosInstance';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LeaderboardRow {
    ID?: string;
    rank?: number;
    playerId?: string;
    displayName?: string;
    avatarUrl?: string | null;
    totalPoints?: number;
    totalCorrect?: number | null;
    totalPredictions?: number | null;
    isMe?: boolean;
}

function escapeODataString(value: string) {
    return value.replace(/'/g, "''");
}

const LEADERBOARD_BATCH_SIZE = 20;
const LEADERBOARD_SCROLL_THRESHOLD = 140;

interface LeaderboardCardProps {
    tournamentId?: string;
    maxRows?: number;
    className?: string;
}

export function LeaderboardCard({ tournamentId, maxRows = LEADERBOARD_BATCH_SIZE, className }: LeaderboardCardProps) {
    const { t } = useTranslation();
    const batchSize = Math.max(LEADERBOARD_BATCH_SIZE, maxRows);

    const {
        data,
        isLoading,
        error,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ['leaderboardTop', tournamentId, batchSize],
        initialPageParam: 0,
        queryFn: async ({ pageParam, signal }) => {
            const queryParts = [
                tournamentId
                    ? `$filter=${encodeURIComponent(`tournament_ID eq '${escapeODataString(tournamentId)}'`)}`
                    : '',
                `$select=${encodeURIComponent('ID,rank,playerId,displayName,avatarUrl,totalPoints,totalCorrect,totalPredictions,isMe')}`,
                `$top=${batchSize}`,
                `$skip=${pageParam}`,
                `$orderby=${encodeURIComponent('totalPoints desc,displayName asc')}`,
            ].filter(Boolean);

            const query = queryParts.join('&');

            const response = await axiosInstance.get(
                `/api/player/PredictionLeaderboard?${query}`,
                { signal }
            );
            return (response.data?.value || response.data || []) as LeaderboardRow[];
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < batchSize) return undefined;
            return allPages.reduce((total, page) => total + page.length, 0);
        },
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
    });

    const rows = React.useMemo(
        () => (data?.pages ?? []).flat(),
        [data]
    );

    const handleTableScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
        if (!hasNextPage || isFetchingNextPage) return;

        const target = event.currentTarget;
        const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
        if (distanceToBottom <= LEADERBOARD_SCROLL_THRESHOLD) {
            void fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const getRankTone = (rank: number) => {
        switch(rank) {
            case 1: return 'border-amber-300 bg-amber-50 text-amber-700';
            case 2: return 'border-slate-300 bg-slate-50 text-slate-700';
            case 3: return 'border-orange-300 bg-orange-50 text-orange-700';
            default: return 'border-border bg-muted/40 text-muted-foreground';
        }
    };

    return (
        <Card className={cn('flex w-full flex-col border-border bg-card shadow-sm lg:h-full lg:overflow-hidden', className)}>
            <CardContent className="min-h-0 flex-1 p-0">
                {isLoading ? (
                    <div className="flex h-full min-h-[220px] items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-sm text-destructive">
                        {t('predictionDashboard.leaderboard.loadError')}
                    </div>
                ) : !rows.length ? (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                        <Trophy className="h-8 w-8 text-border" />
                        <p>{t('predictionDashboard.noPredictionsYet', 'No predictions available.')}</p>
                    </div>
                ) : (
                    <div className="scrollbar-hidden lg:h-full lg:overflow-auto" onScroll={handleTableScroll}>
                        <Table className="w-full min-w-[760px] table-auto text-[12px]">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="sticky top-0 z-10 min-w-[80px] bg-card px-3 py-2.5 text-center">
                                        {t('predictionDashboard.leaderboard.rank', 'Rank')}
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-10 min-w-[260px] bg-card px-3 py-2.5">
                                        {t('predictionDashboard.leaderboard.player', 'Player')}
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-10 min-w-[110px] bg-card px-3 py-2.5 text-center">
                                        {t('predictionDashboard.leaderboard.bets', 'Bets')}
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-10 min-w-[130px] bg-card px-3 py-2.5 text-center">
                                        {t('predictionDashboard.leaderboard.accuracy', 'Accuracy')}
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-10 min-w-[120px] bg-card px-3 py-2.5 text-center">
                                        {t('predictionDashboard.points', 'Points')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {rows.map((player, idx) => {
                                    const rank = player.rank || idx + 1;
                                    const totalPredictions = Number(player.totalPredictions || 0);
                                    const totalCorrect = Number(player.totalCorrect || 0);
                                    const accuracy = totalPredictions > 0
                                        ? `${Math.round((totalCorrect / totalPredictions) * 100)}%`
                                        : '-';

                                    return (
                                        <TableRow
                                            key={player.ID || player.playerId || idx}
                                            className={cn(
                                                'align-top',
                                                player.isMe ? 'bg-primary/5 ring-1 ring-inset ring-primary/40' : 'hover:bg-muted/10'
                                            )}
                                        >
                                            <TableCell className="px-3 py-2.5 text-center align-middle">
                                                <span
                                                    className={cn(
                                                        'inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1 text-xs font-bold',
                                                        getRankTone(rank)
                                                    )}
                                                >
                                                    {rank}
                                                </span>
                                            </TableCell>

                                            <TableCell className="px-3 py-2.5 align-middle">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8 border shadow-sm">
                                                        <AvatarImage src={player.avatarUrl || undefined} />
                                                        <AvatarFallback>{player.displayName?.substring(0, 2).toUpperCase() || '?'}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="truncate text-sm font-semibold text-foreground">
                                                        {player.displayName || '-'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="px-3 py-2.5 text-center align-middle">
                                                <span className="text-xs font-medium text-foreground">
                                                    {totalPredictions}
                                                </span>
                                            </TableCell>

                                            <TableCell className="px-3 py-2.5 text-center align-middle">
                                                <span className="text-xs font-medium text-foreground">
                                                    {accuracy}
                                                </span>
                                            </TableCell>

                                            <TableCell className="px-3 py-2.5 text-center align-middle">
                                                <span className="text-xs font-medium text-foreground">
                                                    {player.totalPoints || 0} {t('predictionDashboard.leaderboard.pts', 'pts')}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {isFetchingNextPage ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={5} className="py-3 text-center">
                                            <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
