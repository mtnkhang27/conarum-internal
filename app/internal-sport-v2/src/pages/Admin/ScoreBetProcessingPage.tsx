import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCheck, RefreshCcw, Search, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { scoreBetProcessingApi, tournamentsApi } from '@/services/adminApi';
import type { AdminScoreBetProcessingView, AdminTournament } from '@/types/admin';
import { cn } from '@/utils/cn';
import {
  EmptySelectionPanel,
  PlayerAvatar,
  StatusBadge,
  TeamAvatar,
  formatAuditTimestamp,
  formatCurrencyValue,
  formatStageLabel,
} from './shared';

const FIELD_CLASSNAME =
  'h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20';

type ProcessingFilter = 'pending' | 'processed' | 'all';
type ScoreTone = 'neutral' | 'correct' | 'incorrect';

type ScoreBetProcessingMatchGroup = {
  matchId: string;
  kickoff?: string | null;
  stage?: AdminScoreBetProcessingView['stage'];
  homeTeamName?: string | null;
  homeTeamFlag?: string | null;
  homeTeamCrest?: string | null;
  awayTeamName?: string | null;
  awayTeamFlag?: string | null;
  awayTeamCrest?: string | null;
  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  status: string;
  bets: AdminScoreBetProcessingView[];
  totalReward: number;
  pendingReward: number;
  pendingCount: number;
  processedCount: number;
};

type ScoreBetProcessingGroup = {
  playerId: string;
  playerName: string;
  playerAvatar?: string | null;
  playerEmail?: string | null;
  matches: ScoreBetProcessingMatchGroup[];
  totalReward: number;
  pendingReward: number;
  pendingCount: number;
  processedCount: number;
  totalBets: number;
};

type GroupAccumulator = Omit<ScoreBetProcessingGroup, 'matches'> & {
  matchMap: Map<string, ScoreBetProcessingMatchGroup>;
};

function EmptyState({ filter }: { filter: ProcessingFilter }) {
  if (filter === 'processed') {
    return (
      <EmptySelectionPanel
        title="No processed score bets"
        description="Processed exact-score rewards for the selected tournament will appear here once the admin marks them complete."
      />
    );
  }

  if (filter === 'all') {
    return (
      <EmptySelectionPanel
        title="No winning score bets yet"
        description="After match results are entered and exact-score winners exist, they will be grouped here by player for payout tracking."
      />
    );
  }

  return (
    <EmptySelectionPanel
      title="No pending score-bet payouts"
      description="Every correct score bet in the selected tournament has already been marked as processed."
    />
  );
}

function getScoreTone(
  predictedHomeScore: number,
  predictedAwayScore: number,
  actualHomeScore?: number | null,
  actualAwayScore?: number | null,
): ScoreTone {
  if (typeof actualHomeScore !== 'number' || typeof actualAwayScore !== 'number') {
    return 'neutral';
  }

  if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
    return 'correct';
  }

  return 'incorrect';
}

function getScoreToneClasses(tone: ScoreTone) {
  if (tone === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (tone === 'incorrect') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-border bg-background text-foreground';
}

function ScoreBox({ value, tone = 'neutral' }: { value: string; tone?: ScoreTone }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-9 items-center justify-center rounded-md border text-[11px] font-semibold',
        getScoreToneClasses(tone),
      )}
    >
      {value}
    </span>
  );
}

function renderScorePick(match: ScoreBetProcessingMatchGroup, bet: AdminScoreBetProcessingView) {
  const tone = getScoreTone(
    bet.predictedHomeScore,
    bet.predictedAwayScore,
    match.actualHomeScore,
    match.actualAwayScore,
  );

  return (
    <div key={bet.ID} className="inline-flex items-center gap-1.5">
      <ScoreBox value={String(bet.predictedHomeScore)} tone={tone} />
      <span className="text-[11px] font-semibold text-muted-foreground">:</span>
      <ScoreBox value={String(bet.predictedAwayScore)} tone={tone} />
    </div>
  );
}

function getMatchStatusBadges(match: ScoreBetProcessingMatchGroup) {
  if (match.pendingCount > 0 && match.processedCount > 0) {
    return [
      {
        label: `${match.pendingCount} pending`,
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
      },
      {
        label: `${match.processedCount} processed`,
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      },
    ];
  }

  if (match.pendingCount > 0) {
    return [
      {
        label: 'Pending',
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
      },
    ];
  }

  return [
    {
      label: 'Processed',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
  ];
}

export function ScoreBetProcessingPage() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [processingFilter, setProcessingFilter] = useState<ProcessingFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreBets, setScoreBets] = useState<AdminScoreBetProcessingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);

  const loadTournaments = useCallback(async () => {
    setLoading(true);

    try {
      const nextTournaments = await tournamentsApi.list();
      setTournaments(nextTournaments);
      setSelectedTournamentId((current) => {
        if (current) return current;

        const preferredTournament =
          nextTournaments.find((item) => item.isDefault) ||
          nextTournaments.find((item) => item.status === 'active') ||
          nextTournaments[0];

        return preferredTournament?.ID || '';
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load tournaments.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadScoreBets = useCallback(async (tournamentId = selectedTournamentId, filter = processingFilter) => {
    if (!tournamentId) {
      setScoreBets([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextScoreBets = await scoreBetProcessingApi.listByTournament(tournamentId, {
        processed: filter === 'all' ? undefined : filter === 'processed',
      });
      setScoreBets(nextScoreBets);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load score-bet processing data.');
    } finally {
      setLoading(false);
    }
  }, [processingFilter, selectedTournamentId]);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (!selectedTournamentId) return;
    void loadScoreBets(selectedTournamentId, processingFilter);
  }, [loadScoreBets, processingFilter, selectedTournamentId]);

  const groupedUsers = useMemo<ScoreBetProcessingGroup[]>(() => {
    const grouped = new Map<string, GroupAccumulator>();

    for (const bet of scoreBets) {
      let playerGroup = grouped.get(bet.player_ID);

      if (!playerGroup) {
        playerGroup = {
          playerId: bet.player_ID,
          playerName: bet.playerName || 'Unknown player',
          playerAvatar: bet.playerAvatar,
          playerEmail: bet.playerEmail,
          matchMap: new Map<string, ScoreBetProcessingMatchGroup>(),
          totalReward: 0,
          pendingReward: 0,
          pendingCount: 0,
          processedCount: 0,
          totalBets: 0,
        };
        grouped.set(bet.player_ID, playerGroup);
      }

      const prizeAmount = Number(bet.prizeAmount || 0);
      playerGroup.totalReward += prizeAmount;
      playerGroup.totalBets += 1;

      if (bet.isProcessed) {
        playerGroup.processedCount += 1;
      } else {
        playerGroup.pendingCount += 1;
        playerGroup.pendingReward += prizeAmount;
      }

      let matchGroup = playerGroup.matchMap.get(bet.match_ID);
      if (!matchGroup) {
        matchGroup = {
          matchId: bet.match_ID,
          kickoff: bet.kickoff,
          stage: bet.stage,
          homeTeamName: bet.homeTeamName,
          homeTeamFlag: bet.homeTeamFlag,
          homeTeamCrest: bet.homeTeamCrest,
          awayTeamName: bet.awayTeamName,
          awayTeamFlag: bet.awayTeamFlag,
          awayTeamCrest: bet.awayTeamCrest,
          actualHomeScore: bet.actualHomeScore,
          actualAwayScore: bet.actualAwayScore,
          status: bet.status,
          bets: [],
          totalReward: 0,
          pendingReward: 0,
          pendingCount: 0,
          processedCount: 0,
        };
        playerGroup.matchMap.set(bet.match_ID, matchGroup);
      }

      matchGroup.bets.push(bet);
      matchGroup.totalReward += prizeAmount;

      if (bet.isProcessed) {
        matchGroup.processedCount += 1;
      } else {
        matchGroup.pendingCount += 1;
        matchGroup.pendingReward += prizeAmount;
      }
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...grouped.values()]
      .map((group) => {
        const allMatches = [...group.matchMap.values()]
          .map((match) => ({
            ...match,
            bets: [...match.bets].sort((left, right) => {
              const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0;
              const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0;
              return rightTime - leftTime;
            }),
          }))
          .sort((left, right) => {
            const leftKickoff = left.kickoff ? new Date(left.kickoff).getTime() : 0;
            const rightKickoff = right.kickoff ? new Date(right.kickoff).getTime() : 0;
            return rightKickoff - leftKickoff;
          });

        if (!normalizedSearch) {
          return {
            playerId: group.playerId,
            playerName: group.playerName,
            playerAvatar: group.playerAvatar,
            playerEmail: group.playerEmail,
            totalReward: group.totalReward,
            pendingReward: group.pendingReward,
            pendingCount: group.pendingCount,
            processedCount: group.processedCount,
            totalBets: group.totalBets,
            matches: allMatches,
          };
        }

        const playerMatchesSearch = [group.playerName, group.playerEmail].join(' ').toLowerCase();
        const filteredMatches = allMatches.filter((match) =>
          `${match.homeTeamName || ''} ${match.awayTeamName || ''}`.toLowerCase().includes(normalizedSearch),
        );
        const matches = playerMatchesSearch.includes(normalizedSearch) ? allMatches : filteredMatches;

        return {
          playerId: group.playerId,
          playerName: group.playerName,
          playerAvatar: group.playerAvatar,
          playerEmail: group.playerEmail,
          totalReward: matches.reduce((sum, match) => sum + match.totalReward, 0),
          pendingReward: matches.reduce((sum, match) => sum + match.pendingReward, 0),
          pendingCount: matches.reduce((sum, match) => sum + match.pendingCount, 0),
          processedCount: matches.reduce((sum, match) => sum + match.processedCount, 0),
          totalBets: matches.reduce((sum, match) => sum + match.bets.length, 0),
          matches,
        };
      })
      .filter((group) => group.matches.length > 0)
      .sort((left, right) => {
        if (right.pendingCount !== left.pendingCount) {
          return right.pendingCount - left.pendingCount;
        }

        return left.playerName.localeCompare(right.playerName);
      });
  }, [scoreBets, searchTerm]);

  const selectedTournament = useMemo(
    () => tournaments.find((item) => item.ID === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );

  const stats = useMemo(() => {
    const pendingUsers = groupedUsers.filter((group) => group.pendingCount > 0).length;
    const pendingReward = groupedUsers.reduce((sum, group) => sum + group.pendingReward, 0);

    return {
      players: groupedUsers.length,
      scoreBets: scoreBets.length,
      pendingUsers,
      pendingReward,
    };
  }, [groupedUsers, scoreBets.length]);

  const handleRefresh = async () => {
    await loadScoreBets();
  };

  const handleSetProcessed = async (group: ScoreBetProcessingGroup, processed: boolean) => {
    if (!selectedTournamentId) return;

    setBusyPlayerId(group.playerId);

    try {
      const result = await scoreBetProcessingApi.setPlayerProcessed(group.playerId, selectedTournamentId, processed);
      toast.success(result.message);
      await loadScoreBets(selectedTournamentId, processingFilter);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update score-bet processing status.');
    } finally {
      setBusyPlayerId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/80 bg-muted/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">Score Bet Processing</CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Review correct exact-score bets in a compact table, grouped by user and match, then mark each player batch as processed after the admin finishes manual payout handling.
              </p>
            </div>

            <Button variant="outline" onClick={() => void handleRefresh()} disabled={loading || !selectedTournamentId}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="flex flex-col gap-3 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <select
                className={cn(FIELD_CLASSNAME, 'min-w-[220px]')}
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
                disabled={tournaments.length === 0}
              >
                <option value="" disabled>
                  Select tournament
                </option>
                {tournaments.map((tournament) => (
                  <option key={tournament.ID} value={tournament.ID}>
                    {tournament.name}
                  </option>
                ))}
              </select>

              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by player, email, or match"
                  className="pl-9"
                />
              </div>
            </div>

            <Tabs value={processingFilter} onValueChange={(value) => setProcessingFilter(value as ProcessingFilter)}>
              <TabsList className="grid w-full grid-cols-3 xl:w-[360px]">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="processed">Processed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border/80 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
            {selectedTournament ? (
              <span>
                Working tournament: <span className="font-semibold text-foreground">{selectedTournament.name}</span>
                {selectedTournament.season ? ` - ${selectedTournament.season}` : ''}
              </span>
            ) : (
              <span>Select a tournament to review score-bet payouts.</span>
            )}
            <span>Players: <span className="font-semibold text-foreground">{stats.players}</span></span>
            <span>Winning bets: <span className="font-semibold text-foreground">{stats.scoreBets}</span></span>
            <span>Pending users: <span className="font-semibold text-foreground">{stats.pendingUsers}</span></span>
            <span>Pending reward: <span className="font-semibold text-foreground">{formatCurrencyValue(stats.pendingReward)}</span></span>
          </div>

          {loading ? (
            <EmptySelectionPanel
              title="Loading score-bet processing data"
              description="Fetching correct exact-score bets for the selected tournament."
            />
          ) : !selectedTournamentId ? (
            <EmptySelectionPanel
              title="Select a tournament"
              description="Choose a tournament first to review exact-score payouts."
            />
          ) : groupedUsers.length === 0 ? (
            <EmptyState filter={processingFilter} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/80">
              <div className="scrollbar-hidden max-h-[70vh] overflow-auto">
                <Table className="w-full min-w-[1240px] table-auto text-[12px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky top-0 z-10 min-w-[220px] bg-card px-3 py-2.5">
                        Player
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[150px] bg-card px-3 py-2.5">
                        Date
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[220px] bg-card px-3 py-2.5">
                        Teams
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[180px] bg-card px-3 py-2.5 text-center">
                        Score picks
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[110px] bg-card px-3 py-2.5 text-center">
                        Result
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[150px] bg-card px-3 py-2.5 text-center">
                        Reward
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[140px] bg-card px-3 py-2.5 text-center">
                        Status
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[190px] bg-card px-3 py-2.5 text-center">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {groupedUsers.flatMap((group) => {
                      const canMarkProcessed = group.pendingCount > 0;
                      const showProcessedToggle = !canMarkProcessed && group.processedCount > 0;
                      const actionLabel = canMarkProcessed ? 'Mark all processed' : 'Set all to pending';

                      return group.matches.map((match, index) => (
                        <TableRow key={`${group.playerId}-${match.matchId}`} className="align-top">
                          {index === 0 ? (
                            <TableCell rowSpan={group.matches.length} className="px-3 py-3 align-top whitespace-normal">
                              <div className="flex min-w-0 items-start gap-3">
                                <PlayerAvatar name={group.playerName} avatar={group.playerAvatar} className="h-10 w-10" />
                                <div className="min-w-0 space-y-1.5">
                                  <p className="truncate text-sm font-semibold text-foreground">{group.playerName}</p>
                                  <p className="truncate text-xs text-muted-foreground">{group.playerEmail || 'No email recorded'}</p>
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    <StatusBadge
                                      label={`${group.matches.length} match${group.matches.length === 1 ? '' : 'es'}`}
                                      tone="border-border bg-card text-foreground"
                                    />
                                    <StatusBadge
                                      label={`${group.totalBets} pick${group.totalBets === 1 ? '' : 's'}`}
                                      tone="border-border bg-card text-foreground"
                                    />
                                    {group.pendingCount > 0 ? (
                                      <StatusBadge
                                        label={`${group.pendingCount} pending`}
                                        tone="border-amber-200 bg-amber-50 text-amber-700"
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          ) : null}

                          <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-foreground">
                                {match.kickoff ? formatAuditTimestamp(match.kickoff) : 'Kickoff not recorded'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatStageLabel(match.stage)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <TeamAvatar
                                  name={match.homeTeamName || 'Home'}
                                  crest={match.homeTeamCrest}
                                  flagCode={match.homeTeamFlag}
                                  className="h-7 w-11"
                                />
                                <span className="text-[12px] font-medium text-foreground">
                                  {match.homeTeamName || 'Home TBD'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <TeamAvatar
                                  name={match.awayTeamName || 'Away'}
                                  crest={match.awayTeamCrest}
                                  flagCode={match.awayTeamFlag}
                                  className="h-7 w-11"
                                />
                                <span className="text-[12px] font-medium text-foreground">
                                  {match.awayTeamName || 'Away TBD'}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                            <div className="scrollbar-hidden flex justify-center overflow-x-auto overflow-y-hidden pb-1">
                              <div className="inline-flex min-w-[112px] flex-col items-center gap-1">
                                {match.bets.map((bet) => renderScorePick(match, bet))}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                            {typeof match.actualHomeScore === 'number' && typeof match.actualAwayScore === 'number' ? (
                              <div className="inline-flex items-center gap-1.5">
                                <ScoreBox value={String(match.actualHomeScore)} tone="correct" />
                                <span className="text-[11px] font-semibold text-muted-foreground">:</span>
                                <ScoreBox value={String(match.actualAwayScore)} tone="correct" />
                              </div>
                            ) : (
                              <span className="inline-flex h-8 min-w-14 items-center justify-center rounded-md border px-2 text-[11px] font-semibold">
                                -
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold text-foreground">
                                {formatCurrencyValue(match.totalReward)}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {match.bets.length} pick{match.bets.length === 1 ? '' : 's'}
                              </span>
                              {match.pendingCount > 0 && match.pendingCount !== match.bets.length ? (
                                <span className="text-[11px] text-amber-700">
                                  Pending {formatCurrencyValue(match.pendingReward)}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                            <div className="flex flex-wrap justify-center gap-1.5">
                              {getMatchStatusBadges(match).map((badge) => (
                                <StatusBadge key={badge.label} label={badge.label} tone={badge.tone} />
                              ))}
                            </div>
                          </TableCell>

                          {index === 0 ? (
                            <TableCell rowSpan={group.matches.length} className="px-3 py-3 align-top whitespace-normal text-center">
                              <div className="flex flex-col items-center gap-2">
                                <p className="text-[11px] text-muted-foreground">
                                  Pending reward{' '}
                                  <span className="font-semibold text-foreground">
                                    {formatCurrencyValue(group.pendingReward)}
                                  </span>
                                </p>
                                {(canMarkProcessed || showProcessedToggle) ? (
                                  <Button
                                    type="button"
                                    variant={canMarkProcessed ? 'default' : 'outline'}
                                    disabled={busyPlayerId === group.playerId}
                                    onClick={() => void handleSetProcessed(group, canMarkProcessed)}
                                    className="w-full"
                                  >
                                    {canMarkProcessed ? <CheckCheck className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                                    {actionLabel}
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No action available</span>
                                )}
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ));
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
