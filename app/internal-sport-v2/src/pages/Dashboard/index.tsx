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
import { ShieldCheck } from 'lucide-react';
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
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <TabsList className="w-full justify-start gap-2 overflow-x-auto">
            <div className="min-w-[240px] max-w-[360px] shrink-0">
              <Select
                value={currentTournamentValue}
                onValueChange={setSelectedTournamentValue}
                disabled={tournamentsQuery.isLoading && tournaments.length === 0}
              >
                <SelectTrigger className="h-9 bg-background">
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

          <TabsTrigger value="matches" className="min-w-[140px]">
            {t('predictionDashboard.tabs.matches', 'Matches')}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="min-w-[150px]">
            {t('predictionDashboard.tabs.leaderboard', 'Leaderboard')}
          </TabsTrigger>
          <TabsTrigger value="history" className="min-w-[140px]">
            {t('predictionDashboard.tabs.history', 'History')}
          </TabsTrigger>
          <TabsTrigger value="champion" className="min-w-[180px]">
            {t('predictionDashboard.tabs.champion', 'Tournament Champion')}
          </TabsTrigger>
          </TabsList>

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

        <TabsContent
          value="matches"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <UserPredictionTable className="h-full" tournamentId={selectedTournamentId} />
        </TabsContent>

        <TabsContent
          value="leaderboard"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <LeaderboardCard
            tournamentId={selectedTournamentId}
            maxRows={20}
            className="h-full"
          />
        </TabsContent>

        <TabsContent
          value="history"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <RecentPredictionsCard tournamentId={selectedTournamentId} className="h-full" />
        </TabsContent>

        <TabsContent
          value="champion"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
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
