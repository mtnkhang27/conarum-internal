import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/services/core/axiosInstance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, Medal, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface LeaderboardRow {
    ID?: string;
    rank?: number;
    playerId?: string;
    displayName?: string;
    avatarUrl?: string | null;
    totalPoints?: number;
    isMe?: boolean;
}

function escapeODataString(value: string) {
    return value.replace(/'/g, "''");
}

interface LeaderboardCardProps {
    tournamentId?: string;
    maxRows?: number;
    className?: string;
}

export function LeaderboardCard({ tournamentId, maxRows = 8, className }: LeaderboardCardProps) {
    const { t } = useTranslation();
    const { data, isLoading, error } = useQuery({
        queryKey: ['leaderboardTop', tournamentId, maxRows],
        enabled: Boolean(tournamentId),
        queryFn: async () => {
            const filter = tournamentId
                ? `$filter=${encodeURIComponent(`tournament_ID eq '${escapeODataString(tournamentId)}'`)}&`
                : '';
            const response = await axiosInstance.get(
                `/api/player/PredictionLeaderboard?${filter}$top=${maxRows}&$orderby=totalPoints desc,displayName asc`
            );
            return (response.data?.value || response.data || []) as LeaderboardRow[];
        }
    });

    const getRankColor = (rank: number) => {
        switch(rank) {
            case 1: return "text-amber-400 bg-amber-400/10 border-amber-400/20";
            case 2: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
            case 3: return "text-amber-700 bg-amber-700/10 border-amber-700/20";
            default: return "text-muted-foreground bg-muted/50 border-transparent";
        }
    };

    return (
        <Card className={cn('flex h-full w-full flex-col overflow-hidden border-border bg-card shadow-sm', className)}>
            <CardHeader className="border-b bg-muted/10 px-4 py-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Trophy className="w-5 h-5 text-primary" />
                    {t('predictionDashboard.leaderboard.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-0">
                {isLoading ? (
                    <div className="flex h-32 items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-sm text-destructive">
                        {t('predictionDashboard.leaderboard.loadError')}
                    </div>
                ) : !tournamentId ? (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                        <Trophy className="h-8 w-8 text-border" />
                        <p>{t('predictionDashboard.leaderboard.selectTournament', 'Select a tournament to view the leaderboard.')}</p>
                    </div>
                ) : !data?.length ? (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                        <Trophy className="h-8 w-8 text-border" />
                        <p>{t('predictionDashboard.noPredictionsYet', 'No predictions available.')}</p>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto">
                        {data?.map((player, idx) => {
                            const rank = player.rank || idx + 1;

                            return (
                                <div
                                    key={player.ID || player.playerId || idx}
                                    className={cn(
                                        'flex items-center gap-2 border-b px-3 py-2.5 transition-colors hover:bg-muted/10',
                                        player.isMe ? 'bg-primary/5' : ''
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold',
                                            getRankColor(rank)
                                        )}
                                    >
                                        {rank}
                                    </div>
                                    <Avatar className="h-8 w-8 border shadow-sm">
                                        <AvatarImage src={player.avatarUrl || undefined} />
                                        <AvatarFallback>{player.displayName?.substring(0, 2).toUpperCase() || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="truncate text-sm font-semibold">{player.displayName}</h4>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="flex items-center"><Medal className="mr-1 h-3 w-3"/> {player.totalPoints || 0} {t('predictionDashboard.leaderboard.pts')}</span>
                                        </div>
                                    </div>
                                    {player.isMe && (
                                        <div className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm">
                                            {t('predictionDashboard.leaderboard.you', 'You')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
