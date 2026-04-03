import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/services/core/axiosInstance';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Trophy, Medal, Loader2, ArrowUpRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface LeaderboardUser {
    id: string;
    rank: number;
    displayName: string;
    avatarUrl?: string;
    totalPoints: number;
    currentStreak: number;
}

export function LeaderboardCard() {
    const { t } = useTranslation();
    const { data, isLoading, error } = useQuery({
        queryKey: ['leaderboardTop10'],
        queryFn: async () => {
            const response = await axiosInstance.get('/api/player/Leaderboard?$top=10&$orderby=totalPoints desc');
            return response.data?.value || response.data || [];
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
        <Card className="w-full shadow-sm bg-card border-border flex flex-col h-[calc(100vh-140px)] sticky top-6">
            <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    {t('predictionDashboard.leaderboard.title')}
                </CardTitle>
                <CardDescription>{t('predictionDashboard.leaderboard.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
                {isLoading ? (
                    <div className="flex h-32 items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-sm text-destructive">
                        {t('predictionDashboard.leaderboard.loadError')}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {data?.map((player: any, idx: number) => (
                            <div key={player.ID || idx} className="flex items-center gap-3 p-4 border-b hover:bg-muted/10 transition-colors">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border",
                                    getRankColor(idx + 1)
                                )}>
                                    {idx + 1}
                                </div>
                                <Avatar className="w-10 h-10 border shadow-sm">
                                    <AvatarImage src={player.avatarUrl} />
                                    <AvatarFallback>{player.displayName?.substring(0, 2).toUpperCase() || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-semibold text-sm truncate">{player.displayName}</h4>
                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                        <span className="flex items-center"><Medal className="w-3 h-3 mr-1"/> {player.totalPoints || 0} {t('predictionDashboard.leaderboard.pts')}</span>
                                    </div>
                                </div>
                                {player.currentStreak > 2 && (
                                    <div className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center shadow-sm">
                                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                                        {t('predictionDashboard.leaderboard.streak', { count: player.currentStreak })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
