import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import axiosInstance from '@/services/core/axiosInstance';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/utils/cn';
import type { DateRange } from '@/components/filterbar/types';
import { UserPredictionTableFilters } from './UserPredictionTableFilters';

type MatchStatus = 'upcoming' | 'live' | 'finished';
type WdlPick = 'home' | 'draw' | 'away';
type RowActionState = 'saving' | 'clearing';

const PAGE_SIZE = 6;
interface TournamentItem {
  ID: string;
  name: string;
}

interface ScoreBetRow {
  betId?: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  isCorrect: boolean | null;
}

interface AvailableMatchRow {
  ID: string;
  tournament_ID: string;
  kickoff: string;
  status: string;
  bettingLocked?: boolean;
  isHotMatch?: boolean;
  outcomePoints?: number;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamName?: string | null;
  homeTeamFlag?: string | null;
  homeTeamCrest?: string | null;
  awayTeamName?: string | null;
  awayTeamFlag?: string | null;
  awayTeamCrest?: string | null;
  myPick?: string | null;
  myScores?: ScoreBetRow[];
  scoreBettingEnabled?: boolean;
  maxBets?: number;
}

interface ScorePick {
  id: string;
  home: string;
  away: string;
  isCorrect: boolean | null;
}

interface MatchPrediction {
  id: string;
  tournamentId: string;
  tournamentName?: string;
  kickoff: string;
  status: MatchStatus;
  bettingLocked: boolean;
  isHotMatch: boolean;
  homeTeam: {
    name: string;
    countryCode: string;
    crest?: string;
  };
  awayTeam: {
    name: string;
    countryCode: string;
    crest?: string;
  };
  scoreBettingEnabled: boolean;
  maxBets: number;
  outcomePoints: number;
  predictedWdl?: WdlPick;
  initialPredictedWdl?: WdlPick;
  scorePicks: ScorePick[];
  initialScorePicks: ScorePick[];
  actualHomeScore?: number;
  actualAwayScore?: number;
}

function escapeODataString(value: string) {
  return value.replace(/'/g, "''");
}

function normalizePick(value?: string | null): WdlPick | undefined {
  if (value === 'home' || value === 'draw' || value === 'away') return value;
  return undefined;
}

function normalizeScoreInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 2);
}

function createLocalPickId() {
  return `pick-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyScorePick(): ScorePick {
  return {
    id: createLocalPickId(),
    home: '',
    away: '',
    isCorrect: null,
  };
}

function ensureScorePickSlots(scorePicks: ScorePick[], maxBets: number) {
  const safeMaxBets = Math.max(0, maxBets);
  const normalized = scorePicks.slice(0, safeMaxBets);

  if (normalized.length >= safeMaxBets) {
    return normalized;
  }

  return [
    ...normalized,
    ...Array.from({ length: safeMaxBets - normalized.length }, () => createEmptyScorePick()),
  ];
}

function cloneScorePicks(scorePicks: ScorePick[]) {
  return scorePicks.map((pick) => ({ ...pick }));
}

function serializeScorePicks(scorePicks: ScorePick[]) {
  return scorePicks.map((pick) => `${pick.home}:${pick.away}`).join('|');
}

function hasAnyFilledScorePick(scorePicks: ScorePick[]) {
  return scorePicks.some((pick) => pick.home !== '' || pick.away !== '');
}

function hasScoreResult(match: MatchPrediction) {
  return match.actualHomeScore !== undefined && match.actualAwayScore !== undefined;
}

function getMatchStatus(status: string, kickoff: string) {
  if (status === 'finished') return 'finished';
  if (status === 'live') return 'live';

  const kickoffDate = new Date(kickoff);
  if (!Number.isNaN(kickoffDate.getTime()) && kickoffDate.getTime() <= Date.now()) {
    return 'live';
  }

  return 'upcoming';
}

function determineOutcome(homeScore?: number, awayScore?: number): WdlPick | undefined {
  if (homeScore === undefined || awayScore === undefined) return undefined;
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}

function formatKickoffLabel(kickoff: string) {
  const date = new Date(kickoff);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function toStartOfDayIso(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function toEndExclusiveIso(date: Date) {
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return end.toISOString();
}

function getErrorMessage(error: unknown) {
  const maybeAxiosError = error as {
    response?: {
      data?: {
        error?: {
          message?: string;
        };
        message?: string;
      };
    };
    message?: string;
  };

  return (
    maybeAxiosError?.response?.data?.error?.message ||
    maybeAxiosError?.response?.data?.message ||
    maybeAxiosError?.message ||
    'Something went wrong'
  );
}

const FlagIcon = ({ code, crest, name }: { code: string; crest?: string; name: string }) => {
  const fallbackSrc = `https://flagcdn.com/24x18/${(code || 'un').toLowerCase()}.png`;
  const defaultSrc = crest || fallbackSrc;

  return (
    <img
      src={defaultSrc}
      alt={name}
      className="h-7 w-11 rounded-sm border bg-muted object-cover shadow-sm"
      onError={(event) => {
        const target = event.target as HTMLImageElement;
        if (target.src !== fallbackSrc) {
          target.src = fallbackSrc;
          return;
        }

        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
      }}
    />
  );
};

function getStatusBadge(status: MatchStatus, label: string) {
  switch (status) {
    case 'upcoming':
      return (
        <Badge variant="secondary" className="border-blue-200 bg-blue-50 text-blue-700">
          {label}
        </Badge>
      );
    case 'live':
      return (
        <Badge variant="destructive" className="shadow-sm">
          {label}
        </Badge>
      );
    case 'finished':
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
          {label}
        </Badge>
      );
  }
}

function getPickToneClasses(tone: 'neutral' | 'correct' | 'incorrect') {
  if (tone === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (tone === 'incorrect') return 'border-red-300 bg-red-50 text-red-700';
  return 'border-border bg-background text-foreground';
}

function getScoreCellToneClasses(tone: 'neutral' | 'correct' | 'incorrect') {
  if (tone === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (tone === 'incorrect') return 'border-red-300 bg-red-50 text-red-700';
  return 'border-border bg-white text-foreground';
}

function mapMatchRow(row: AvailableMatchRow): MatchPrediction {
  const maxBets = row.maxBets || 3;
  const mappedScorePicks = (row.myScores || []).map((score) => ({
    id: score.betId || createLocalPickId(),
    home: String(score.predictedHomeScore),
    away: String(score.predictedAwayScore),
    isCorrect: score.isCorrect,
  }));
  const scorePicks = row.scoreBettingEnabled ? ensureScorePickSlots(mappedScorePicks, maxBets) : mappedScorePicks;

  const actualHomeScore = typeof row.homeScore === 'number' ? row.homeScore : undefined;
  const actualAwayScore = typeof row.awayScore === 'number' ? row.awayScore : undefined;

  return {
    id: row.ID,
    tournamentId: row.tournament_ID,
    kickoff: row.kickoff,
    status: getMatchStatus(row.status, row.kickoff),
    bettingLocked: Boolean(row.bettingLocked),
    isHotMatch: Boolean(row.isHotMatch),
    homeTeam: {
      name: row.homeTeamName || 'TBD',
      countryCode: row.homeTeamFlag || 'UN',
      crest: row.homeTeamCrest || undefined,
    },
    awayTeam: {
      name: row.awayTeamName || 'TBD',
      countryCode: row.awayTeamFlag || 'UN',
      crest: row.awayTeamCrest || undefined,
    },
    scoreBettingEnabled: Boolean(row.scoreBettingEnabled),
    maxBets,
    outcomePoints: row.outcomePoints || 0,
    predictedWdl: normalizePick(row.myPick),
    initialPredictedWdl: normalizePick(row.myPick),
    scorePicks,
    initialScorePicks: cloneScorePicks(scorePicks),
    actualHomeScore,
    actualAwayScore,
  };
}

interface UserPredictionTableProps {
  tournamentId?: string;
  tournaments?: TournamentItem[];
  className?: string;
}

export function UserPredictionTable({ tournamentId, tournaments = [], className }: UserPredictionTableProps) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchPrediction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [hotFilter, setHotFilter] = useState<'all' | 'hot'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [rowActionState, setRowActionState] = useState<Record<string, RowActionState | undefined>>({});
  const [clearConfirmMatchId, setClearConfirmMatchId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLockedRef = useRef(false);
  const dateFromIso = dateRange.from?.toISOString() || '';
  const dateToIso = dateRange.to?.toISOString() || '';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    setMatches([]);
    setTotalCount(0);
    setPage(1);
    setRowActionState({});
    setClearConfirmMatchId(null);
    loadMoreLockedRef.current = false;
  }, [dateFromIso, dateToIso, debouncedSearch, hotFilter, tournamentId]);

  const matchesQuery = useQuery({
    queryKey: [
      'availableMatches',
      page,
      debouncedSearch,
      dateFromIso,
      dateToIso,
      hotFilter,
      tournamentId || '',
    ],
    queryFn: async () => {
      const filterClauses: string[] = [
        'bettingLocked eq false',
        `(kickoff eq null or kickoff ge ${new Date().toISOString()})`,
      ];

      if (debouncedSearch) {
        const escapedSearch = escapeODataString(debouncedSearch);
        filterClauses.push(
          `(contains(tolower(homeTeamName),tolower('${escapedSearch}')) or contains(tolower(awayTeamName),tolower('${escapedSearch}')))`
        );
      }

      if (dateRange.from) {
        filterClauses.push(`kickoff ge ${toStartOfDayIso(dateRange.from)}`);
      }

      if (dateRange.from || dateRange.to) {
        filterClauses.push(`kickoff lt ${toEndExclusiveIso(dateRange.to || dateRange.from!)}`);
      }

      if (hotFilter === 'hot') {
        filterClauses.push('isHotMatch eq true');
      }

      if (tournamentId) {
        const escapedTournamentId = escapeODataString(tournamentId);
        filterClauses.push(`tournament_ID eq '${escapedTournamentId}'`);
      }

      const skip = (page - 1) * PAGE_SIZE;
      const filterParam = `$filter=${encodeURIComponent(filterClauses.join(' and '))}&`;
      const url =
        `/api/player/AvailableMatchesView?` +
        `${filterParam}` +
        `$expand=myScores($select=betId,matchId,predictedHomeScore,predictedAwayScore,status,isCorrect)&` +
        `$orderby=kickoff asc&$top=${PAGE_SIZE}&$skip=${skip}&$count=true`;

      const response = await axiosInstance.get(url);

      return {
        items: (response.data?.value || response.data || []) as AvailableMatchRow[],
        totalCount: Number(response.data?.['@odata.count'] || response.data?.['$count'] || 0),
      };
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!Array.isArray(matchesQuery.data?.items)) return;
    const mappedMatches = matchesQuery.data.items.map(mapMatchRow);
    setTotalCount(matchesQuery.data.totalCount);
    setMatches((previous) => {
      if (page === 1) {
        return mappedMatches;
      }

      const existingIds = new Set(previous.map((match) => match.id));
      return [...previous, ...mappedMatches.filter((match) => !existingIds.has(match.id))];
    });
  }, [matchesQuery.data, page]);

  useEffect(() => {
    if (!matchesQuery.isFetching) {
      loadMoreLockedRef.current = false;
    }
  }, [matchesQuery.isFetching]);

  const tournamentNameMap = useMemo(() => {
    const entries = tournaments.map((tournament) => [tournament.ID, tournament.name] as const);
    return new Map(entries);
  }, [tournaments]);

  const updateMatch = (matchId: string, updater: (match: MatchPrediction) => MatchPrediction) => {
    setMatches((previous) => previous.map((match) => (match.id === matchId ? updater(match) : match)));
  };

  const isRowLocked = (match: MatchPrediction) => match.status !== 'upcoming' || match.bettingLocked;

  const getValidScores = (match: MatchPrediction) =>
    match.scorePicks
      .filter((pick) => pick.home !== '' && pick.away !== '')
      .map((pick) => ({
        homeScore: Number(pick.home),
        awayScore: Number(pick.away),
      }));

  const hasPersistedPrediction = (match: MatchPrediction) =>
    Boolean(match.initialPredictedWdl) || hasAnyFilledScorePick(match.initialScorePicks);

  const hasChanges = (match: MatchPrediction) =>
    match.predictedWdl !== match.initialPredictedWdl ||
    serializeScorePicks(match.scorePicks) !== serializeScorePicks(match.initialScorePicks);

  const resetToInitialState = (matchId: string) => {
    updateMatch(matchId, (match) => ({
      ...match,
      predictedWdl: match.initialPredictedWdl,
      scorePicks: cloneScorePicks(match.initialScorePicks),
    }));
  };

  const handleScoreChange = (
    matchId: string,
    pickId: string,
    side: 'home' | 'away',
    value: string
  ) => {
    const normalizedValue = normalizeScoreInput(value);
    updateMatch(matchId, (match) => ({
      ...match,
      scorePicks: match.scorePicks.map((pick) =>
        pick.id === pickId ? { ...pick, [side]: normalizedValue } : pick
      ),
    }));
  };

  const handleWdlChange = (matchId: string, wdl: WdlPick) => {
    updateMatch(matchId, (match) => ({
      ...match,
      predictedWdl: match.predictedWdl === wdl ? undefined : wdl,
    }));
  };

  const handleSaveRow = async (match: MatchPrediction) => {
    if (isRowLocked(match) || rowActionState[match.id]) return;

    if (!match.predictedWdl) {
      toast.error(t('predictionDashboard.selectOutcomeFirst', 'Select an outcome pick before saving.'));
      return;
    }

    if (!hasChanges(match)) return;

    setRowActionState((previous) => ({ ...previous, [match.id]: 'saving' }));

    try {
      const validScores = getValidScores(match);
      const hadPersistedScores = hasAnyFilledScorePick(match.initialScorePicks);

      if (hadPersistedScores && validScores.length === 0) {
        await axiosInstance.post('/api/player/cancelMatchPrediction', { matchId: match.id });
      }

      await axiosInstance.post('/api/player/submitMatchPrediction', {
        matchId: match.id,
        pick: match.predictedWdl,
        scores: validScores,
      });

      toast.success(t('predictionDashboard.predictionSaved', 'Prediction saved successfully.'));
      updateMatch(match.id, (currentMatch) => ({
        ...currentMatch,
        initialPredictedWdl: currentMatch.predictedWdl,
        initialScorePicks: cloneScorePicks(currentMatch.scorePicks),
      }));
    } catch (error) {
      toast.error(t('predictionDashboard.saveFailed', 'Failed to save prediction.'), {
        description: getErrorMessage(error),
      });
    } finally {
      setRowActionState((previous) => ({ ...previous, [match.id]: undefined }));
    }
  };

  const handleClearRow = async (match: MatchPrediction) => {
    if (rowActionState[match.id]) return;

    if (!hasPersistedPrediction(match)) {
      resetToInitialState(match.id);
      return;
    }

    setRowActionState((previous) => ({ ...previous, [match.id]: 'clearing' }));

    try {
      await axiosInstance.post('/api/player/cancelMatchPrediction', { matchId: match.id });
      toast.success(t('predictionDashboard.predictionCleared', 'Prediction cleared successfully.'));
      updateMatch(match.id, (currentMatch) => {
        const clearedScorePicks = ensureScorePickSlots([], currentMatch.maxBets);

        return {
          ...currentMatch,
          predictedWdl: undefined,
          initialPredictedWdl: undefined,
          scorePicks: clearedScorePicks,
          initialScorePicks: cloneScorePicks(clearedScorePicks),
        };
      });
    } catch (error) {
      toast.error(t('predictionDashboard.clearFailed', 'Failed to clear prediction.'), {
        description: getErrorMessage(error),
      });
    } finally {
      setRowActionState((previous) => ({ ...previous, [match.id]: undefined }));
    }
  };

  const requestClearRow = (matchId: string) => {
    setClearConfirmMatchId(matchId);
  };

  const confirmClearRow = async () => {
    if (!clearConfirmMatchId) return;
    const targetMatch = matches.find((match) => match.id === clearConfirmMatchId);
    setClearConfirmMatchId(null);
    if (!targetMatch) return;
    await handleClearRow(targetMatch);
  };

  const hasRows = matches.length > 0;
  const hasMoreMatches = matches.length < totalCount;

  const requestNextPage = () => {
    if (!hasMoreMatches || matchesQuery.isFetching || loadMoreLockedRef.current) {
      return;
    }

    loadMoreLockedRef.current = true;
    setPage((current) => current + 1);
  };

  const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceToBottom <= 140) {
      requestNextPage();
    }
  };

  const renderScorePick = (match: MatchPrediction, pick: ScorePick) => {
    const locked = isRowLocked(match);
    const tone: 'neutral' | 'correct' | 'incorrect' =
      pick.isCorrect === true ? 'correct' : pick.isCorrect === false ? 'incorrect' : 'neutral';

    if (locked) {
      return (
        <div key={pick.id} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex h-10 w-[52px] items-center justify-center rounded-md border text-sm font-bold',
              getScoreCellToneClasses(hasScoreResult(match) ? tone : 'neutral')
            )}
          >
            {pick.home || '-'}
          </span>
          <span className="text-sm font-bold text-muted-foreground">:</span>
          <span
            className={cn(
              'inline-flex h-10 w-[52px] items-center justify-center rounded-md border text-sm font-bold',
              getScoreCellToneClasses(hasScoreResult(match) ? tone : 'neutral')
            )}
          >
            {pick.away || '-'}
          </span>
        </div>
      );
    }

    return (
      <div key={pick.id} className="inline-flex items-center gap-1.5">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={pick.home}
          onChange={(event) => handleScoreChange(match.id, pick.id, 'home', event.target.value)}
          className="h-10 w-[52px] rounded-md border-border bg-white px-0 text-center text-sm font-bold text-foreground shadow-none focus-visible:ring-1"
          placeholder="0"
          disabled={Boolean(rowActionState[match.id])}
        />
        <span className="text-sm font-bold text-muted-foreground">:</span>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={pick.away}
          onChange={(event) => handleScoreChange(match.id, pick.id, 'away', event.target.value)}
          className="h-10 w-[52px] rounded-md border-border bg-white px-0 text-center text-sm font-bold text-foreground shadow-none focus-visible:ring-1"
          placeholder="0"
          disabled={Boolean(rowActionState[match.id])}
        />
      </div>
    );
  };

  const renderOutcomePick = (match: MatchPrediction) => {
    const actualOutcome = determineOutcome(match.actualHomeScore, match.actualAwayScore);
    const outcomeTone: 'neutral' | 'correct' | 'incorrect' =
      match.predictedWdl && actualOutcome
        ? actualOutcome === match.predictedWdl
          ? 'correct'
          : 'incorrect'
        : 'neutral';

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {(['home', 'draw', 'away'] as const).map((option) => {
            const isSelected = match.predictedWdl === option;
            const locked = isRowLocked(match);

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleWdlChange(match.id, option)}
                disabled={locked || Boolean(rowActionState[match.id])}
                className={cn(
                  'inline-flex min-w-10 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors',
                  isSelected
                    ? locked && hasScoreResult(match)
                      ? getPickToneClasses(outcomeTone)
                      : 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {option === 'home' ? '1' : option === 'draw' ? 'X' : '2'}
              </button>
            );
          })}
        </div>

        {match.predictedWdl && hasScoreResult(match) && outcomeTone === 'correct' && (
          <span className="inline-flex w-fit items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            +{match.outcomePoints} {t('predictionDashboard.points', 'pts')}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card className={cn('flex h-full w-full overflow-hidden border-primary/20 bg-gradient-to-b from-card to-background shadow-sm', className)}>
      <CardHeader className="border-b bg-muted/30 px-6">
        <UserPredictionTableFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          hotFilter={hotFilter}
          onHotFilterChange={setHotFilter}
        />
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {matchesQuery.isLoading && !hasRows ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : matchesQuery.error ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-destructive">
            {t('predictionDashboard.loadError')}
          </div>
        ) : !hasRows ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
            {t('predictionDashboard.noMatchesFound')}
          </div>
        ) : (
          <>
            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-auto"
              onScroll={handleTableScroll}
            >
              <Table className="table-fixed">
                <colgroup>
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[24%]" />
                  <col className="w-[22%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3">{t('predictionDashboard.columns.dateStage', 'Date')}</TableHead>
                    <TableHead className="px-4 py-3">{t('predictionDashboard.columns.tournament', 'Tournament')}</TableHead>
                    <TableHead className="px-4 py-3">{t('predictionDashboard.columns.teams')}</TableHead>
                    <TableHead className="px-4 py-3 text-center">{t('predictionDashboard.columns.scorePick')}</TableHead>
                    <TableHead className="px-4 py-3 text-center">{t('predictionDashboard.columns.wdlPick')}</TableHead>
                    <TableHead className="px-4 py-3 text-center">{t('predictionDashboard.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {matches.map((match) => {
                    const locked = isRowLocked(match);
                    const isSaving = rowActionState[match.id] === 'saving';
                    const isClearing = rowActionState[match.id] === 'clearing';
                    const visibleScorePicks = locked
                      ? match.scorePicks.filter((pick) => pick.home !== '' || pick.away !== '')
                      : match.scorePicks;
                    const canSave = !locked && !isSaving && !isClearing && Boolean(match.predictedWdl) && hasChanges(match);
                    const canClear =
                      !isSaving &&
                      !isClearing &&
                      (hasPersistedPrediction(match) || hasChanges(match));

                    return (
                      <TableRow key={match.id} className="align-top">
                        <TableCell className="px-4 py-4 align-top whitespace-normal">
                          <div className="flex flex-col gap-2">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                              {formatKickoffLabel(match.kickoff)}
                            </span>
                            {getStatusBadge(
                              match.status,
                              match.status === 'upcoming'
                                ? t('predictionDashboard.statusUpcoming')
                                : match.status === 'live'
                                  ? t('predictionDashboard.statusInProcess')
                                  : t('predictionDashboard.statusClosed')
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-top whitespace-normal">
                          <div className="flex min-h-16 items-center">
                            <span className="text-sm font-medium text-foreground">
                              {match.tournamentName || tournamentNameMap.get(match.tournamentId) || '-'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-top whitespace-normal">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <FlagIcon
                                code={match.homeTeam.countryCode}
                                crest={match.homeTeam.crest}
                                name={match.homeTeam.name}
                              />
                              <span className="text-sm font-medium text-foreground">{match.homeTeam.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FlagIcon
                                code={match.awayTeam.countryCode}
                                crest={match.awayTeam.crest}
                                name={match.awayTeam.name}
                              />
                              <span className="text-sm font-medium text-foreground">{match.awayTeam.name}</span>
                            </div>
                            {hasScoreResult(match) && (
                              <span className="inline-flex w-fit rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-semibold text-foreground">
                                {match.actualHomeScore} - {match.actualAwayScore}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-top whitespace-normal text-center">
                          <div className="flex flex-col items-center gap-2">
                            {match.scoreBettingEnabled ? (
                              <>
                                {visibleScorePicks.length > 0 ? (
                                  <div className="flex w-full justify-center overflow-x-auto overflow-y-hidden pb-1">
                                    <div className="inline-flex min-w-[132px] flex-col items-center gap-1.5">
                                      {visibleScorePicks.map((pick) => renderScorePick(match, pick))}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {locked
                                      ? '-'
                                      : t('predictionDashboard.noScorePicks', 'No score picks yet')}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-top whitespace-normal text-center">
                          <div className="flex justify-center">
                            {renderOutcomePick(match)}
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-top whitespace-normal text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleSaveRow(match)}
                              disabled={!canSave}
                              className="justify-start"
                            >
                              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              {t('common.save', 'Save')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => requestClearRow(match.id)}
                              disabled={!canClear}
                              className="justify-start"
                            >
                              {isClearing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              {t('common.clear', 'Clear')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {matchesQuery.isFetching && hasRows && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t bg-muted/10 px-6 py-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted-foreground">
                {t('predictionDashboard.showing', {
                  from: matches.length > 0 ? 1 : 0,
                  to: matches.length,
                  total: totalCount,
                })}
              </p>

              <p className="text-xs text-muted-foreground">
                {hasMoreMatches
                  ? t('predictionDashboard.scrollToLoadMore', 'Scroll down to load more matches')
                  : t('predictionDashboard.allLoaded', 'All matches loaded')}
              </p>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={Boolean(clearConfirmMatchId)} onOpenChange={(open) => !open && setClearConfirmMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('predictionDashboard.confirmClearTitle', 'Clear prediction?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'predictionDashboard.confirmClearDescription',
                'This action will remove your selected outcome and score picks for this match.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmClearRow()}>{t('common.clear', 'Clear')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
