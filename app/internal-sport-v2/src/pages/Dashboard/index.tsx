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
import { getLandingTournamentId, type TournamentSelectionItem } from './tournamentSelection';

const ALL_TOURNAMENTS_VALUE = '__all__';

type TournamentItem = TournamentSelectionItem;

export function Dashboard() {
  const { t } = useTranslation();
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
    return getLandingTournamentId(tournaments);
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
    <div className="flex h-0 min-h-0 flex-1 flex-col gap-3 overflow-hidden py-3">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex h-0 min-h-0 flex-1 flex-col gap-3 overflow-hidden"
      >
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">


          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-full border border-border/80 bg-card/90 p-1 lg:min-w-0 lg:flex-1">
            <div className="flex flex-wrap gap-1">
              <TabsTrigger value="matches" className="min-w-[140px] flex-none rounded-full border-transparent px-4 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
                {t('predictionDashboard.tabs.matches', 'Matches')}
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="min-w-[150px] flex-none rounded-full border-transparent px-4 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
                {t('predictionDashboard.tabs.leaderboard', 'Leaderboard')}
              </TabsTrigger>
              <TabsTrigger value="history" className="min-w-[140px] flex-none rounded-full border-transparent px-4 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
                {t('predictionDashboard.tabs.history', 'History')}
              </TabsTrigger>
              <TabsTrigger value="champion" className="min-w-[180px] flex-none rounded-full border-transparent px-4 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
                {t('predictionDashboard.tabs.champion', 'Tournament Champion')}
              </TabsTrigger>
            </div>

            <div className="w-full pt-2 lg:ml-auto lg:w-[320px] lg:shrink-0 lg:pl-4 lg:pt-0">
              <Select
                value={currentTournamentValue}
                onValueChange={setSelectedTournamentValue}
                disabled={tournamentsQuery.isLoading && tournaments.length === 0}
              >
                <SelectTrigger className="h-9 rounded-full bg-card pr-2">
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
          </TabsList>
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
