import React from "react";
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/services/core/axiosInstance';
import { UserPredictionTable } from "./components/UserPredictionTable";
import { LeaderboardCard } from "./components/LeaderboardCard";
import { RecentPredictionsCard } from "./components/RecentPredictionsCard";
import { TournamentChampionCard } from "./components/TournamentChampionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useUserInfo } from '@/hooks/useUserInfo';
import { History, ListChecks, ShieldCheck, Trophy, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ALL_TOURNAMENTS_VALUE = '__all__';

interface TournamentItem {
  ID: string;
  name: string;
  status?: string | null;
  isDefault?: boolean | null;
}

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useUserInfo();
  const [activeTab, setActiveTab] = React.useState('matches');
  const [selectedTournamentValue, setSelectedTournamentValue] = React.useState('');

  const tournamentsQuery = useQuery({
    queryKey: ['predictionTournaments'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/player/Tournaments?$orderby=startDate desc');
      return (response.data?.value || response.data || []) as TournamentItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const tournaments = React.useMemo(() => tournamentsQuery.data ?? [], [tournamentsQuery.data]);

  const defaultTournamentId = React.useMemo(() => {
    const defaultTournament =
      tournaments.find((item) => item.isDefault) ||
      tournaments.find((item) => item.status === 'active') ||
      tournaments[0];

    return defaultTournament?.ID || '';
  }, [tournaments]);

  React.useEffect(() => {
    if (selectedTournamentValue || !defaultTournamentId) return;
    setSelectedTournamentValue(defaultTournamentId);
  }, [defaultTournamentId, selectedTournamentValue]);

  const currentTournamentValue =
    selectedTournamentValue || defaultTournamentId || ALL_TOURNAMENTS_VALUE;
  const selectedTournamentId =
    currentTournamentValue && currentTournamentValue !== ALL_TOURNAMENTS_VALUE
      ? currentTournamentValue
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-3">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="w-full max-w-[360px]">
          <Select
            value={currentTournamentValue}
            onValueChange={setSelectedTournamentValue}
            disabled={tournamentsQuery.isLoading && tournaments.length === 0}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('predictionDashboard.selectTournament', 'Select tournament')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TOURNAMENTS_VALUE}>
                {t('predictionDashboard.allTournaments', 'All tournaments')}
              </SelectItem>
              {tournaments.map((item) => (
                <SelectItem key={item.ID} value={item.ID}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdmin ? (
          <Button
            type="button"
            variant="subtle"
            size="sm"
            className="shrink-0"
            onClick={() => navigate('/admin')}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Button>
        ) : null}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="matches" className="min-w-[140px]">
            <ListChecks className="h-4 w-4" />
            {t('predictionDashboard.tabs.matches', 'Matches')}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="min-w-[150px]">
            <UsersRound className="h-4 w-4" />
            {t('predictionDashboard.tabs.leaderboard', 'Leaderboard')}
          </TabsTrigger>
          <TabsTrigger value="history" className="min-w-[140px]">
            <History className="h-4 w-4" />
            {t('predictionDashboard.tabs.history', 'History')}
          </TabsTrigger>
          <TabsTrigger value="champion" className="min-w-[180px]">
            <Trophy className="h-4 w-4" />
            {t('predictionDashboard.tabs.champion', 'Tournament Champion')}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="matches"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-muted/60 bg-card p-3"
        >
          <UserPredictionTable
            className="h-full"
            tournamentId={selectedTournamentId}
            tournaments={tournaments}
          />
        </TabsContent>

        <TabsContent
          value="leaderboard"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-muted/60 bg-card p-3"
        >
          <LeaderboardCard
            tournamentId={selectedTournamentId}
            maxRows={20}
            className="h-full"
          />
        </TabsContent>

        <TabsContent
          value="history"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-muted/60 bg-card p-3"
        >
          <RecentPredictionsCard tournamentId={selectedTournamentId} className="h-full" />
        </TabsContent>

        <TabsContent
          value="champion"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-muted/60 bg-card p-3"
        >
          <TournamentChampionCard
            className="h-full"
            tournamentId={selectedTournamentId}
            tournaments={tournaments}
            tournamentsLoading={tournamentsQuery.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
