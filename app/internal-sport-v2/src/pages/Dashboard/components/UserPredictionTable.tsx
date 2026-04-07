import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eraser, Loader2, Save } from 'lucide-react';
import axiosInstance from '@/services/core/axiosInstance';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import type { DateRange } from '@/components/filterbar/types';
import { UserPredictionTableFilters } from './UserPredictionTableFilters';
import {
  determineOutcome,
  OutcomeOption,
  pickLabel,
  pickTitle,
  ScorePickBox,
  TeamFlag,
  type WdlPick,
} from './PredictionTableShared';

type MatchStatus = 'upcoming' | 'live' | 'finished';
type RowActionState = 'saving' | 'clearing';

const PAGE_SIZE = 6;
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

function normalizeScorePicksForSave(scorePicks: ScorePick[]) {
  return scorePicks.map((pick) => {
    const hasHome = pick.home !== '';
    const hasAway = pick.away !== '';

    if (hasHome && hasAway) {
      return { ...pick };
    }

    if (!hasHome && !hasAway) {
      return { ...pick };
    }

    return {
      ...pick,
      home: pick.home || '0',
      away: pick.away || '0',
    };
  });
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
        <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700">
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
  className?: string;
}

export function UserPredictionTable({ tournamentId, className }: UserPredictionTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [matches, setMatches] = useState<MatchPrediction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [hotFilter, setHotFilter] = useState<'all' | 'hot'>('all');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [appliedHotFilter, setAppliedHotFilter] = useState<'all' | 'hot'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [rowActionState, setRowActionState] = useState<Record<string, RowActionState | undefined>>({});
  const [clearConfirmMatchId, setClearConfirmMatchId] = useState<string | null>(null);
  const loadMoreLockedRef = useRef(false);
  const dateFromIso = appliedDateRange.from?.toISOString() || '';
  const dateToIso = appliedDateRange.to?.toISOString() || '';

  useEffect(() => {
    setMatches([]);
    setTotalCount(0);
    setPage(1);
    setRowActionState({});
    setClearConfirmMatchId(null);
    loadMoreLockedRef.current = false;
  }, [dateFromIso, dateToIso, appliedSearchTerm, appliedHotFilter, tournamentId]);

  const matchesQuery = useQuery({
    queryKey: [
      'availableMatches',
      page,
      appliedSearchTerm,
      dateFromIso,
      dateToIso,
      appliedHotFilter,
      tournamentId || '',
    ],
    queryFn: async () => {
      const filterClauses: string[] = [
        'bettingLocked eq false',
        `(kickoff eq null or kickoff ge ${new Date().toISOString()})`,
      ];

      if (appliedSearchTerm) {
        const escapedSearch = escapeODataString(appliedSearchTerm);
        filterClauses.push(
          `(contains(tolower(homeTeamName),tolower('${escapedSearch}')) or contains(tolower(awayTeamName),tolower('${escapedSearch}')))`
        );
      }

      if (appliedDateRange.from) {
        filterClauses.push(`kickoff ge ${toStartOfDayIso(appliedDateRange.from)}`);
      }

      if (appliedDateRange.from || appliedDateRange.to) {
        filterClauses.push(`kickoff lt ${toEndExclusiveIso(appliedDateRange.to || appliedDateRange.from!)}`);
      }

      if (appliedHotFilter === 'hot') {
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
    refetchOnMount: 'always',
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

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container || !matches.length || !totalCount || matchesQuery.isFetching || loadMoreLockedRef.current) {
      return;
    }

    if (container.scrollHeight <= container.clientHeight + 24 && matches.length < totalCount) {
      loadMoreLockedRef.current = true;
      setPage((current) => current + 1);
    }
  }, [matches.length, totalCount, matchesQuery.isFetching]);

  const updateMatch = (matchId: string, updater: (match: MatchPrediction) => MatchPrediction) => {
    setMatches((previous) => previous.map((match) => (match.id === matchId ? updater(match) : match)));
  };

  const syncCachedAvailableMatch = (
    matchId: string,
    updater: (row: AvailableMatchRow) => AvailableMatchRow
  ) => {
    queryClient.setQueriesData<{ items: AvailableMatchRow[]; totalCount: number }>(
      { queryKey: ['availableMatches'] },
      (cached) => {
        if (!cached || !Array.isArray(cached.items)) {
          return cached;
        }

        let changed = false;
        const nextItems = cached.items.map((item) => {
          if (item.ID !== matchId) {
            return item;
          }

          changed = true;
          return updater(item);
        });

        if (!changed) {
          return cached;
        }

        return {
          ...cached,
          items: nextItems,
        };
      }
    );
  };

  const isRowLocked = (match: MatchPrediction) => match.status !== 'upcoming' || match.bettingLocked;

  const getValidScores = (scorePicks: ScorePick[]) =>
    scorePicks
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
    updateMatch(matchId, (match) => ({
      ...match,
      scorePicks: match.scorePicks.map((pick) =>
        pick.id === pickId ? { ...pick, [side]: value } : pick
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
      const normalizedScorePicks = normalizeScorePicksForSave(match.scorePicks);
      const validScores = getValidScores(normalizedScorePicks);

      await axiosInstance.post('/api/player/submitMatchPrediction', {
        matchId: match.id,
        pick: match.predictedWdl,
        scores: validScores,
      });

      syncCachedAvailableMatch(match.id, (row) => ({
        ...row,
        myPick: match.predictedWdl ?? null,
        myScores: validScores.map((score) => ({
          predictedHomeScore: score.homeScore,
          predictedAwayScore: score.awayScore,
          isCorrect: null,
        })),
      }));
      void queryClient.invalidateQueries({ queryKey: ['availableMatches'] });
      void queryClient.invalidateQueries({ queryKey: ['recentPredictions'] });

      toast.success(t('predictionDashboard.predictionSaved', 'Prediction saved successfully.'));
      updateMatch(match.id, (currentMatch) => ({
        ...currentMatch,
        initialPredictedWdl: currentMatch.predictedWdl,
        scorePicks: cloneScorePicks(normalizedScorePicks),
        initialScorePicks: cloneScorePicks(normalizedScorePicks),
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
      syncCachedAvailableMatch(match.id, (row) => ({
        ...row,
        myPick: null,
        myScores: [],
      }));
      void queryClient.invalidateQueries({ queryKey: ['recentPredictions'] });
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

  const handleResetFilters = () => {
    setSearchTerm('');
    setDateRange({ from: undefined, to: undefined });
    setHotFilter('all');
  };

  const handleApplyFilters = () => {
    setAppliedSearchTerm(searchTerm.trim());
    setAppliedDateRange(dateRange);
    setAppliedHotFilter(hotFilter);
  };

  const renderScorePick = (match: MatchPrediction, pick: ScorePick) => {
    const locked = isRowLocked(match);
    const tone: 'neutral' | 'correct' | 'incorrect' =
      pick.isCorrect === true ? 'correct' : pick.isCorrect === false ? 'incorrect' : 'neutral';

    return (
      <div key={pick.id} className="inline-flex items-center gap-1.5">
        <ScorePickBox
          value={pick.home}
          tone={hasScoreResult(match) ? tone : 'neutral'}
          disabled={Boolean(rowActionState[match.id])}
          onChange={
            locked ? undefined : (nextValue) => handleScoreChange(match.id, pick.id, 'home', nextValue)
          }
        />
        <span className="text-[11px] font-semibold text-muted-foreground">:</span>
        <ScorePickBox
          value={pick.away}
          tone={hasScoreResult(match) ? tone : 'neutral'}
          disabled={Boolean(rowActionState[match.id])}
          onChange={
            locked ? undefined : (nextValue) => handleScoreChange(match.id, pick.id, 'away', nextValue)
          }
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
        <div className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-muted/20 p-1">
          {(['home', 'draw', 'away'] as const).map((option) => {
            const isSelected = match.predictedWdl === option;
            const locked = isRowLocked(match);

            return (
              <OutcomeOption
                key={option}
                selected={isSelected}
                locked={locked && hasScoreResult(match)}
                tone={outcomeTone}
                label={pickLabel(option)}
                title={pickTitle(option)}
                onClick={() => handleWdlChange(match.id, option)}
                disabled={locked || Boolean(rowActionState[match.id])}
              />
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

  const renderMatchCard = (match: MatchPrediction) => {
    const locked = isRowLocked(match);
    const isSaving = rowActionState[match.id] === 'saving';
    const isClearing = rowActionState[match.id] === 'clearing';
    const visibleScorePicks = locked
      ? match.scorePicks.filter((pick) => pick.home !== '' || pick.away !== '')
      : match.scorePicks;
    const canSave =
      !locked && !isSaving && !isClearing && Boolean(match.predictedWdl) && hasChanges(match);
    const canClear =
      !isSaving &&
      !isClearing &&
      (hasPersistedPrediction(match) || hasChanges(match));

    return (
      <div key={match.id} className="rounded-xl border border-border/70 bg-card p-3 space-y-3">
        {/* Header: Date + Status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">
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

        {/* Teams */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <TeamFlag code={match.homeTeam.countryCode} crest={match.homeTeam.crest} name={match.homeTeam.name} />
            <span className="truncate text-sm font-medium text-foreground">{match.homeTeam.name}</span>
          </div>
          <span className="shrink-0 text-xs font-bold text-muted-foreground">VS</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{match.awayTeam.name}</span>
            <TeamFlag code={match.awayTeam.countryCode} crest={match.awayTeam.crest} name={match.awayTeam.name} />
          </div>
        </div>

        {/* Outcome Pick */}
        <div className="flex flex-col items-center gap-1.5">
          {renderOutcomePick(match)}
        </div>

        {/* Score Picks */}
        {match.scoreBettingEnabled && (
          <div className="flex flex-col items-center gap-1.5">
            {visibleScorePicks.length > 0 ? (
              <div className="inline-flex flex-col items-center gap-1">
                {visibleScorePicks.map((pick) => renderScorePick(match, pick))}
              </div>
            ) : (
              !locked && (
                <span className="text-xs text-muted-foreground">
                  {t('predictionDashboard.noScorePicks', 'No score picks yet')}
                </span>
              )
            )}
          </div>
        )}

        {/* Actions */}
        {!locked && (
          <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => requestClearRow(match.id)}
              disabled={!canClear}
              className="h-8 gap-1.5 text-xs"
            >
              {isClearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />}
              {t('common.clear', 'Clear')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSaveRow(match)}
              disabled={!canSave}
              className="h-8 gap-1.5 text-xs"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t('common.save', 'Save')}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex w-full flex-col gap-3 lg:min-h-0 lg:h-full', className)}>
      <div className="shrink-0">
        <UserPredictionTableFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          hotFilter={hotFilter}
          onHotFilterChange={setHotFilter}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Loading / Error / Empty states */}
      {matchesQuery.isLoading && !hasRows ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : matchesQuery.error ? (
        <div className="flex items-center justify-center px-6 py-10 text-center text-sm text-destructive">
          {t('predictionDashboard.loadError')}
        </div>
      ) : !hasRows ? (
        <div className="flex items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
          {t('predictionDashboard.noMatchesFound')}
        </div>
      ) : (
        <>
          {/* ── Mobile Card View (< lg) ── */}
          <div className="flex flex-col gap-3 lg:hidden">
            {matches.map(renderMatchCard)}

            {matchesQuery.isFetching && hasRows && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* ── Desktop Table View (lg+) ── */}
          <div className="hidden rounded-xl border border-muted/60 bg-card lg:block lg:min-h-0 lg:flex-1 lg:overflow-hidden">
            <div ref={scrollContainerRef} className="scrollbar-hidden lg:min-h-0 lg:h-full lg:overflow-auto" onScroll={handleTableScroll}>
              <Table className="w-full min-w-[780px] table-auto text-[12px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 z-10 min-w-[126px] bg-card px-3 py-2.5">
                      {t('predictionDashboard.columns.dateStage', 'Date')}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 min-w-[208px] bg-card px-3 py-2.5">
                      {t('predictionDashboard.columns.teams')}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 min-w-[148px] bg-card px-3 py-2.5 text-center">
                      {t('predictionDashboard.columns.scorePick')}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 min-w-[120px] bg-card px-3 py-2.5 text-center">
                      {t('predictionDashboard.columns.wdlPick', 'Outcome')}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 min-w-[120px] bg-card px-3 py-2.5 text-center">
                      {t('predictionDashboard.actions', 'Actions')}
                    </TableHead>
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
                    const canSave =
                      !locked && !isSaving && !isClearing && Boolean(match.predictedWdl) && hasChanges(match);
                    const canClear =
                      !isSaving &&
                      !isClearing &&
                      (hasPersistedPrediction(match) || hasChanges(match));

                    return (
                      <TableRow key={match.id} className="align-top hover:bg-muted/20">
                        <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                          <div className="flex flex-col gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
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

                        <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                          <div className="inline-grid grid-cols-[minmax(0,13rem)_max-content] items-center gap-x-[22px] gap-y-1.5">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <TeamFlag
                                code={match.homeTeam.countryCode}
                                crest={match.homeTeam.crest}
                                name={match.homeTeam.name}
                              />
                              <span className="text-[12px] font-medium text-foreground">{match.homeTeam.name}</span>
                            </div>
                            <span className="text-[12px] font-medium text-foreground">(H)</span>
                            <div className="flex min-w-0 items-center gap-1.5">
                              <TeamFlag
                                code={match.awayTeam.countryCode}
                                crest={match.awayTeam.crest}
                                name={match.awayTeam.name}
                              />
                              <span className="text-[12px] font-medium text-foreground">{match.awayTeam.name}</span>
                            </div>
                            <span className="text-[12px] font-medium text-foreground">(A)</span>
                          </div>
                        </TableCell>

                        <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            {match.scoreBettingEnabled ? (
                              visibleScorePicks.length > 0 ? (
                                <div className="scrollbar-hidden flex w-full justify-center overflow-x-auto overflow-y-hidden pb-1">
                                  <div className="inline-flex min-w-[112px] flex-col items-center gap-1">
                                    {visibleScorePicks.map((pick) => renderScorePick(match, pick))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {locked ? '-' : t('predictionDashboard.noScorePicks', 'No score picks yet')}
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                          <div className="flex justify-center">{renderOutcomePick(match)}</div>
                        </TableCell>

                        <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => void handleSaveRow(match)}
                                  disabled={!canSave}
                                  className="h-7 w-7 cursor-pointer"
                                >
                                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{t('common.save', 'Save')}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => requestClearRow(match.id)}
                                  disabled={!canClear}
                                  className="h-7 w-7 cursor-pointer"
                                >
                                  {isClearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{t('common.clear', 'Clear')}</TooltipContent>
                            </Tooltip>
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
          </div>
        </>
      )}

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
            <AlertDialogAction className="bg-primary/10 text-primary hover:bg-primary/20" onClick={() => void confirmClearRow()}>
              {t('common.clear', 'Clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
