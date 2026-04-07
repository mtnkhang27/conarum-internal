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
import { cn } from '@/utils/cn';

type TournamentItem = TournamentSelectionItem;
type DashboardTabValue = 'matches' | 'leaderboard' | 'history' | 'champion';

const DASHBOARD_TABS = [
  { value: 'matches', labelKey: 'predictionDashboard.tabs.matches', fallback: 'Matches' },
  { value: 'leaderboard', labelKey: 'predictionDashboard.tabs.leaderboard', fallback: 'Leaderboard' },
  { value: 'history', labelKey: 'predictionDashboard.tabs.history', fallback: 'History' },
  { value: 'champion', labelKey: 'predictionDashboard.tabs.champion', fallback: 'Champion' },
] as const satisfies ReadonlyArray<{
  value: DashboardTabValue;
  labelKey: string;
  fallback: string;
}>;

const MOBILE_TAB_PAGES = [
  DASHBOARD_TABS.slice(0, 2),
  DASHBOARD_TABS.slice(2, 4),
] as const;

function getTabPageIndex(value: DashboardTabValue) {
  const index = DASHBOARD_TABS.findIndex((tab) => tab.value === value);
  return index >= 0 ? Math.floor(index / 2) : 0;
}

export function Dashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<DashboardTabValue>('matches');
  const [selectedTournamentValue, setSelectedTournamentValue] = React.useState('');
  const mobileTabsViewportRef = React.useRef<HTMLDivElement>(null);
  const mobileTabsScrollTimeoutRef = React.useRef<number | null>(null);
  const [mobileVisiblePage, setMobileVisiblePage] = React.useState(() => getTabPageIndex('matches'));

  const scrollMobileTabsToPage = React.useCallback((pageIndex: number, behavior: ScrollBehavior = 'smooth') => {
    const container = mobileTabsViewportRef.current;
    if (!container) return;

    const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-tab-page]'));
    const targetPage = pages[pageIndex];
    if (!targetPage) return;

    container.scrollTo({
      left: targetPage.offsetLeft,
      behavior,
    });
    setMobileVisiblePage(pageIndex);
  }, []);

  const getNearestMobilePage = React.useCallback(() => {
    const container = mobileTabsViewportRef.current;
    if (!container) return 0;

    const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-tab-page]'));
    if (!pages.length) return 0;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    pages.forEach((page, index) => {
      const distance = Math.abs(page.offsetLeft - container.scrollLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }, []);

  const snapMobileTabsToNearestPage = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    const nearestPage = getNearestMobilePage();
    scrollMobileTabsToPage(nearestPage, behavior);
  }, [getNearestMobilePage, scrollMobileTabsToPage]);

  const handleMobileTabsScroll = React.useCallback(() => {
    const nearestPage = getNearestMobilePage();
    setMobileVisiblePage(nearestPage);

    if (mobileTabsScrollTimeoutRef.current) {
      window.clearTimeout(mobileTabsScrollTimeoutRef.current);
    }

    mobileTabsScrollTimeoutRef.current = window.setTimeout(() => {
      snapMobileTabsToNearestPage('smooth');
      mobileTabsScrollTimeoutRef.current = null;
    }, 100);
  }, [getNearestMobilePage, snapMobileTabsToNearestPage]);

  React.useEffect(() => {
    scrollMobileTabsToPage(getTabPageIndex(activeTab), 'auto');
  }, [activeTab, scrollMobileTabsToPage]);

  React.useEffect(() => {
    const handleResize = () => {
      snapMobileTabsToNearestPage('auto');
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mobileTabsScrollTimeoutRef.current) {
        window.clearTimeout(mobileTabsScrollTimeoutRef.current);
      }
    };
  }, [snapMobileTabsToNearestPage]);

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

  const currentTournamentValue = selectedTournamentValue || defaultTournamentId || '';
  const selectedTournamentId = currentTournamentValue || undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-3 lg:h-0 lg:overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-3 lg:h-0 lg:overflow-hidden"
      >
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">

          <TabsList
            className="h-auto w-full justify-start rounded-2xl border border-border/80 bg-card/90 p-1.5 shadow-sm md:hidden"
          >
            <div
              ref={mobileTabsViewportRef}
              className="scrollbar-hidden flex w-full overflow-x-auto overscroll-x-contain snap-x snap-mandatory"
              onScroll={handleMobileTabsScroll}
            >
              {MOBILE_TAB_PAGES.map((page, pageIndex) => (
                <div
                  key={`page-${pageIndex}`}
                  data-tab-page
                  className="grid min-w-full shrink-0 snap-start snap-always grid-cols-2 gap-1"
                >
                  {page.map((tab) => {
                    const showVisibleActive = activeTab === tab.value && mobileVisiblePage === pageIndex;

                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={cn(
                          'min-w-0 rounded-lg border border-transparent px-3 py-2 text-xs shadow-none transition-all data-[state=active]:border-transparent data-[state=active]:shadow-none',
                          showVisibleActive
                            ? 'data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:hover:!bg-primary-hover'
                            : 'bg-transparent text-foreground hover:bg-primary/10 data-[state=active]:!bg-transparent data-[state=active]:!text-foreground'
                        )}
                      >
                        <span className="truncate">{t(tab.labelKey, tab.fallback)}</span>
                      </TabsTrigger>
                    );
                  })}
                </div>
              ))}
            </div>
          </TabsList>

          <TabsList
            className="hidden h-auto w-full justify-start gap-1 rounded-2xl border border-border/80 bg-card/90 p-1.5 shadow-sm md:flex lg:min-w-0 lg:flex-1"
          >
            {DASHBOARD_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="min-w-[140px] flex-none rounded-full border-transparent px-4 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
              >
                {t(tab.labelKey, tab.fallback)}
              </TabsTrigger>
            ))}
            <div className="hidden w-full pt-2 lg:block lg:ml-auto lg:w-[320px] lg:shrink-0 lg:pl-4 lg:pt-0">
              <Select
                value={currentTournamentValue}
                onValueChange={setSelectedTournamentValue}
                disabled={tournamentsQuery.isLoading && tournaments.length === 0}
              >
                <SelectTrigger className="h-9 rounded-full bg-card pr-2">
                  <SelectValue placeholder={t('predictionDashboard.selectTournament', 'Select tournament')} />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((item) => (
                    <SelectItem key={item.ID} value={item.ID}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsList>

          <div className="lg:hidden">
            <Select
              value={currentTournamentValue}
              onValueChange={setSelectedTournamentValue}
              disabled={tournamentsQuery.isLoading && tournaments.length === 0}
            >
              <SelectTrigger className="h-9 rounded-full border border-border/80 bg-card pr-2">
                <SelectValue placeholder={t('predictionDashboard.selectTournament', 'Select tournament')} />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((item) => (
                  <SelectItem key={item.ID} value={item.ID}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent
          value="matches"
          className="flex min-h-0 flex-1 flex-col lg:overflow-hidden"
        >
          <UserPredictionTable className="h-full" tournamentId={selectedTournamentId} />
        </TabsContent>

        <TabsContent
          value="leaderboard"
          className="flex min-h-0 flex-1 flex-col lg:overflow-hidden"
        >
          <LeaderboardCard
            tournamentId={selectedTournamentId}
            maxRows={20}
            className="h-full"
          />
        </TabsContent>

        <TabsContent
          value="history"
          className="flex min-h-0 flex-1 flex-col lg:overflow-hidden"
        >
          <RecentPredictionsCard tournamentId={selectedTournamentId} className="h-full" />
        </TabsContent>

        <TabsContent
          value="champion"
          className="flex min-h-0 flex-1 flex-col lg:overflow-hidden"
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
