import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scoreBetProcessingApi, tournamentsApi } from "@/services/adminApi";
import type {
  AdminScoreBetProcessingView,
  AdminTournament,
} from "@/types/admin";
import { cn } from "@/utils/cn";
import { ScorePickBox } from "@/pages/Dashboard/components/PredictionTableShared";
import {
  EmptySelectionPanel,
  PlayerAvatar,
  StatusBadge,
  TeamAvatar,
  formatAuditTimestamp,
  formatCurrencyValue,
  formatStageLabel,
  matchStatusTone,
  pickToneClasses,
} from "./shared";

const FIELD_CLASSNAME =
  "h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20";

type ProcessingFilter = "pending" | "processed" | "all";

type PlayerProcessingGroup = {
  playerId: string;
  playerName: string;
  playerAvatar?: string | null;
  playerEmail?: string | null;
  bets: AdminScoreBetProcessingView[];
  totalReward: number;
  pendingReward: number;
  pendingCount: number;
  processedCount: number;
};

type MatchProcessingGroup = {
  matchId: string;
  tournamentId: string;
  kickoff?: string | null;
  stage?: AdminScoreBetProcessingView["stage"];
  homeTeamName?: string | null;
  homeTeamFlag?: string | null;
  homeTeamCrest?: string | null;
  awayTeamName?: string | null;
  awayTeamFlag?: string | null;
  awayTeamCrest?: string | null;
  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  status: string;
  players: PlayerProcessingGroup[];
  totalReward: number;
  pendingReward: number;
  pendingCount: number;
  processedCount: number;
  totalBets: number;
};

type MatchAccumulator = Omit<MatchProcessingGroup, "players"> & {
  playerMap: Map<string, PlayerProcessingGroup>;
};

function EmptyState({ filter }: { filter: ProcessingFilter }) {
  if (filter === "processed") {
    return (
      <EmptySelectionPanel
        title="No processed score bets"
        description="Processed exact-score payouts for the selected tournament will appear here after admin confirmation."
      />
    );
  }

  if (filter === "all") {
    return (
      <EmptySelectionPanel
        title="No winning score bets yet"
        description="After match results are entered, exact-score winners will be grouped here by match."
      />
    );
  }

  return (
    <EmptySelectionPanel
      title="No pending score-bet payouts"
      description="Every winning exact-score bet in this tournament has already been processed."
    />
  );
}

function ScorePill({
  homeScore,
  awayScore,
}: {
  homeScore: number;
  awayScore: number;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-1">
      <ScorePickBox value={String(homeScore)} tone="correct" />
      <span className="text-[11px] font-semibold text-muted-foreground">:</span>
      <ScorePickBox value={String(awayScore)} tone="correct" />
    </div>
  );
}

function getWinningSideLabel(match: MatchProcessingGroup) {
  if (
    typeof match.actualHomeScore !== "number" ||
    typeof match.actualAwayScore !== "number"
  ) {
    return "Pending result";
  }

  if (match.actualHomeScore === match.actualAwayScore) {
    return "Draw";
  }

  return match.actualHomeScore > match.actualAwayScore
    ? match.homeTeamName || "Home"
    : match.awayTeamName || "Away";
}

function getActionLabel(pendingCount: number, entityLabel: string) {
  return pendingCount > 0 ? `Process ${entityLabel}` : "Set pending";
}

function getActionVariant(pendingCount: number) {
  return pendingCount > 0 ? "default" : "outline";
}

export function ScoreBetProcessingPage() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [processingFilter, setProcessingFilter] =
    useState<ProcessingFilter>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreBets, setScoreBets] = useState<AdminScoreBetProcessingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(
    new Set(),
  );

  const loadTournaments = useCallback(async () => {
    setLoading(true);

    try {
      const nextTournaments = await tournamentsApi.list();
      setTournaments(nextTournaments);
      setSelectedTournamentId((current) => {
        if (current) return current;

        const preferredTournament =
          nextTournaments.find((item) => item.isDefault) ||
          nextTournaments.find((item) => item.status === "active") ||
          nextTournaments[0];

        return preferredTournament?.ID || "";
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load tournaments.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadScoreBets = useCallback(
    async (tournamentId = selectedTournamentId, filter = processingFilter) => {
      if (!tournamentId) {
        setScoreBets([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const nextScoreBets = await scoreBetProcessingApi.listByTournament(
          tournamentId,
          {
            processed: filter === "all" ? undefined : filter === "processed",
          },
        );
        setScoreBets(nextScoreBets);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load score-bet processing data.",
        );
      } finally {
        setLoading(false);
      }
    },
    [processingFilter, selectedTournamentId],
  );

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (!selectedTournamentId) return;
    void loadScoreBets(selectedTournamentId, processingFilter);
  }, [loadScoreBets, processingFilter, selectedTournamentId]);

  const groupedMatches = useMemo<MatchProcessingGroup[]>(() => {
    const grouped = new Map<string, MatchAccumulator>();

    for (const bet of scoreBets) {
      let matchGroup = grouped.get(bet.match_ID);

      if (!matchGroup) {
        matchGroup = {
          matchId: bet.match_ID,
          tournamentId: bet.tournament_ID,
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
          playerMap: new Map<string, PlayerProcessingGroup>(),
          totalReward: 0,
          pendingReward: 0,
          pendingCount: 0,
          processedCount: 0,
          totalBets: 0,
        };
        grouped.set(bet.match_ID, matchGroup);
      }

      let playerGroup = matchGroup.playerMap.get(bet.player_ID);
      if (!playerGroup) {
        playerGroup = {
          playerId: bet.player_ID,
          playerName: bet.playerName || "Unknown player",
          playerAvatar: bet.playerAvatar,
          playerEmail: bet.playerEmail,
          bets: [],
          totalReward: 0,
          pendingReward: 0,
          pendingCount: 0,
          processedCount: 0,
        };
        matchGroup.playerMap.set(bet.player_ID, playerGroup);
      }

      const prizeAmount = Number(bet.prizeAmount || 0);

      playerGroup.bets.push(bet);
      playerGroup.totalReward += prizeAmount;
      matchGroup.totalReward += prizeAmount;
      matchGroup.totalBets += 1;

      if (bet.isProcessed) {
        playerGroup.processedCount += 1;
        matchGroup.processedCount += 1;
      } else {
        playerGroup.pendingCount += 1;
        playerGroup.pendingReward += prizeAmount;
        matchGroup.pendingCount += 1;
        matchGroup.pendingReward += prizeAmount;
      }
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...grouped.values()]
      .map((match) => {
        const allPlayers = [...match.playerMap.values()]
          .map((player) => ({
            ...player,
            bets: [...player.bets].sort((left, right) => {
              const leftTime = left.submittedAt
                ? new Date(left.submittedAt).getTime()
                : 0;
              const rightTime = right.submittedAt
                ? new Date(right.submittedAt).getTime()
                : 0;
              return rightTime - leftTime;
            }),
          }))
          .sort((left, right) => {
            if (right.pendingCount !== left.pendingCount) {
              return right.pendingCount - left.pendingCount;
            }

            return left.playerName.localeCompare(right.playerName);
          });

        if (!normalizedSearch) {
          return {
            ...match,
            players: allPlayers,
          };
        }

        const matchSearchText = [
          match.homeTeamName,
          match.awayTeamName,
          match.stage,
          // getWinningSideLabel(match),
        ]
          .join(" ")
          .toLowerCase();

        const filteredPlayers = allPlayers.filter((player) => {
          const playerSearchText = [
            player.playerName,
            player.playerEmail,
            ...player.bets.map(
              (bet) => `${bet.predictedHomeScore}:${bet.predictedAwayScore}`,
            ),
          ]
            .join(" ")
            .toLowerCase();

          return playerSearchText.includes(normalizedSearch);
        });

        const visiblePlayers = matchSearchText.includes(normalizedSearch)
          ? allPlayers
          : filteredPlayers;

        return {
          ...match,
          totalReward: visiblePlayers.reduce(
            (sum, player) => sum + player.totalReward,
            0,
          ),
          pendingReward: visiblePlayers.reduce(
            (sum, player) => sum + player.pendingReward,
            0,
          ),
          pendingCount: visiblePlayers.reduce(
            (sum, player) => sum + player.pendingCount,
            0,
          ),
          processedCount: visiblePlayers.reduce(
            (sum, player) => sum + player.processedCount,
            0,
          ),
          totalBets: visiblePlayers.reduce(
            (sum, player) => sum + player.bets.length,
            0,
          ),
          players: visiblePlayers,
        };
      })
      .filter((match) => match.players.length > 0)
      .sort((left, right) => {
        if (right.pendingCount !== left.pendingCount) {
          return right.pendingCount - left.pendingCount;
        }

        const leftKickoff = left.kickoff ? new Date(left.kickoff).getTime() : 0;
        const rightKickoff = right.kickoff
          ? new Date(right.kickoff).getTime()
          : 0;
        return rightKickoff - leftKickoff;
      });
  }, [scoreBets, searchTerm]);

  const stats = useMemo(() => {
    const pendingMatches = groupedMatches.filter(
      (match) => match.pendingCount > 0,
    ).length;
    const players = groupedMatches.reduce(
      (sum, match) => sum + match.players.length,
      0,
    );
    const pendingReward = groupedMatches.reduce(
      (sum, match) => sum + match.pendingReward,
      0,
    );

    return {
      matches: groupedMatches.length,
      players,
      pendingMatches,
      pendingReward,
    };
  }, [groupedMatches]);

  const handleRefresh = async () => {
    await loadScoreBets();
  };

  const handleSetProcessed = async (
    match: MatchProcessingGroup,
    player?: PlayerProcessingGroup,
  ) => {
    if (!selectedTournamentId) return;

    const actionKey = player
      ? `player:${match.matchId}:${player.playerId}`
      : `match:${match.matchId}`;
    const processed = player ? player.pendingCount > 0 : match.pendingCount > 0;

    setBusyKey(actionKey);

    try {
      const result = await scoreBetProcessingApi.setProcessed(
        match.matchId,
        selectedTournamentId,
        processed,
        player?.playerId,
      );
      toast.success(result.message);
      await loadScoreBets(selectedTournamentId, processingFilter);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update score-bet processing status.",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const toggleExpandedMatch = (matchId: string) => {
    setExpandedMatches((current) => {
      const next = new Set(current);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/80 bg-muted/20">
          <div className="flex flex-col gap-3 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <select
                className={cn(FIELD_CLASSNAME, "min-w-[220px]")}
                value={selectedTournamentId}
                onChange={(event) =>
                  setSelectedTournamentId(event.target.value)
                }
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
                  placeholder="Search by match, player, email, or score"
                  className="pl-9"
                />
              </div>
            </div>

            <Tabs
              value={processingFilter}
              onValueChange={(value) =>
                setProcessingFilter(value as ProcessingFilter)
              }
            >
              <TabsList className="grid w-full grid-cols-3 xl:w-[360px]">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="processed">Processed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              onClick={() => void handleRefresh()}
              disabled={loading || !selectedTournamentId}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border/80 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Matches
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {stats.matches}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Winning players
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {stats.players}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pending matches
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {stats.pendingMatches}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pending reward
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {formatCurrencyValue(stats.pendingReward)}
              </p>
            </div>
          </div>

          {loading ? (
            <EmptySelectionPanel
              title="Loading score-bet processing data"
              description="Fetching winning exact-score bets for the selected tournament."
            />
          ) : !selectedTournamentId ? (
            <EmptySelectionPanel
              title="Select a tournament"
              description="Choose a tournament first to review exact-score payouts."
            />
          ) : groupedMatches.length === 0 ? (
            <EmptyState filter={processingFilter} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/80">
              <div className="scrollbar-hidden max-h-[70vh] overflow-auto">
                <Table className="w-full min-w-[1180px] table-auto text-sm">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky top-0 z-10 min-w-[360px] bg-card px-3 py-2.5">
                        Match
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[170px] bg-card px-3 py-2.5 text-center">
                        Result
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[180px] bg-card px-3 py-2.5 text-center">
                        Winner
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[190px] bg-card px-3 py-2.5 text-center">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {groupedMatches.flatMap((match) => {
                      const isExpanded = expandedMatches.has(match.matchId);
                      const actionKey = `match:${match.matchId}`;
                      const canTogglePending =
                        match.pendingCount > 0 || match.processedCount > 0;

                      const rows = [
                        <TableRow
                          key={match.matchId}
                          className="cursor-pointer align-top"
                          onClick={() => toggleExpandedMatch(match.matchId)}
                        >
                          <TableCell className="px-3 py-3 whitespace-normal">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                className="mt-0.5 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleExpandedMatch(match.matchId);
                                }}
                                aria-label={
                                  isExpanded
                                    ? "Collapse match row"
                                    : "Expand match row"
                                }
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>

                              <div className="min-w-0 flex-1 space-y-2">
                                {/* <div className="flex flex-wrap items-center gap-2">
                                  <StatusBadge
                                    label={match.status}
                                    tone={matchStatusTone(match.status)}
                                  />
                                  <StatusBadge
                                    label={formatStageLabel(match.stage)}
                                    tone="border-border bg-card text-foreground"
                                  />
                                  {match.pendingCount > 0 ? (
                                    <StatusBadge
                                      label={`${match.pendingCount} pending`}
                                      tone="border-amber-200 bg-amber-50 text-amber-700"
                                    />
                                  ) : null}
                                  {match.processedCount > 0 ? (
                                    <StatusBadge
                                      label={`${match.processedCount} processed`}
                                      tone="border-emerald-200 bg-emerald-50 text-emerald-700"
                                    />
                                  ) : null}
                                </div> */}

                                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate font-medium text-foreground">
                                      {match.homeTeamName || "Home TBD"}
                                    </span>
                                  </div>
                                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                                    VS
                                  </span>
                                  <div className="flex min-w-0 items-center justify-end gap-2">
                                    <span className="truncate text-right font-medium text-foreground">
                                      {match.awayTeamName || "Away TBD"}
                                    </span>{" "}
                                  </div>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                  {/* {formatAuditTimestamp(match.kickoff)} •{' '} */}
                                  {/* {match.players.length} player
                                  {match.players.length === 1 ? '' : 's'} •{' '}
                                  {match.totalBets} winning score
                                  {match.totalBets === 1 ? '' : 's'} */}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-3 py-3 text-center">
                            {typeof match.actualHomeScore === "number" &&
                            typeof match.actualAwayScore === "number" ? (
                              <div className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-muted/10 px-3 py-1.5 text-sm font-semibold text-foreground">
                                <span>{match.actualHomeScore}</span>
                                <span className="text-muted-foreground">:</span>
                                <span>{match.actualAwayScore}</span>
                              </div>
                            ) : (
                              <span className="inline-flex rounded-lg border border-border/80 px-3 py-1.5 text-sm text-muted-foreground">
                                Pending
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="px-3 py-3 text-center">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">
                                {getWinningSideLabel(match)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Total reward{" "}
                                {formatCurrencyValue(match.totalReward)}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell
                            className="px-3 py-3 text-center"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {canTogglePending ? (
                              <Button
                                type="button"
                                variant={getActionVariant(match.pendingCount)}
                                disabled={busyKey === actionKey}
                                onClick={() => void handleSetProcessed(match)}
                              >
                                {busyKey === actionKey ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                {getActionLabel(match.pendingCount, "all")}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No action available
                              </span>
                            )}
                          </TableCell>
                        </TableRow>,
                      ];

                      if (isExpanded) {
                        rows.push(
                          <TableRow
                            key={`${match.matchId}-players`}
                            className="bg-muted/10"
                          >
                            <TableCell colSpan={4} className="px-4 py-3">
                              <div className="overflow-hidden rounded-lg border border-border/80 bg-card">
                                <Table className="w-full table-auto text-xs">
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="px-3 py-2">
                                        Player
                                      </TableHead>
                                      <TableHead className="px-3 py-2 text-center">
                                        Winning scores
                                      </TableHead>
                                      <TableHead className="px-3 py-2 text-center">
                                        Total reward
                                      </TableHead>
                                      <TableHead className="px-3 py-2 text-center">
                                        Action
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>

                                  <TableBody>
                                    {match.players.map((player) => {
                                      const playerActionKey = `player:${match.matchId}:${player.playerId}`;
                                      const canTogglePlayer =
                                        player.pendingCount > 0 ||
                                        player.processedCount > 0;

                                      return (
                                        <TableRow key={player.playerId}>
                                          <TableCell className="px-3 py-3 whitespace-normal">
                                            <div className="flex min-w-0 items-center gap-3">
                                              {/* <PlayerAvatar
                                                name={player.playerName}
                                                avatar={player.playerAvatar}
                                                className="h-10 w-10"
                                              /> */}
                                              <div className="min-w-0 space-y-1">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                  {player.playerName}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                  {player.playerEmail ||
                                                    "No email recorded"}
                                                </p>
                                                {/* <div className="flex flex-wrap gap-1.5 pt-1">
                                                  {player.pendingCount > 0 ? (
                                                    <StatusBadge
                                                      label={`${player.pendingCount} pending`}
                                                      tone="border-amber-200 bg-amber-50 text-amber-700"
                                                    />
                                                  ) : null}
                                                  {player.processedCount > 0 ? (
                                                    <StatusBadge
                                                      label={`${player.processedCount} processed`}
                                                      tone="border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    />
                                                  ) : null}
                                                </div> */}
                                              </div>
                                            </div>
                                          </TableCell>

                                          <TableCell className="px-3 py-3 text-center align-middle">
                                            <div className="flex flex-wrap items-center justify-center gap-2">
                                              {player.bets.map((bet) => (
                                                <ScorePill
                                                  key={bet.ID}
                                                  homeScore={
                                                    bet.predictedHomeScore
                                                  }
                                                  awayScore={
                                                    bet.predictedAwayScore
                                                  }
                                                />
                                              ))}
                                            </div>
                                          </TableCell>

                                          <TableCell className="px-3 py-3 text-center">
                                            <div className="space-y-1">
                                              <p className="text-sm font-semibold text-foreground">
                                                {formatCurrencyValue(
                                                  player.totalReward,
                                                )}
                                              </p>
                                              <p className="text-[11px] text-muted-foreground">
                                                {player.bets.length} score
                                                {player.bets.length === 1
                                                  ? ""
                                                  : "s"}
                                              </p>
                                            </div>
                                          </TableCell>

                                          <TableCell className="px-3 py-3 text-center">
                                            {canTogglePlayer ? (
                                              <Button
                                                type="button"
                                                variant={getActionVariant(
                                                  player.pendingCount,
                                                )}
                                                disabled={
                                                  busyKey === playerActionKey
                                                }
                                                onClick={() =>
                                                  void handleSetProcessed(
                                                    match,
                                                    player,
                                                  )
                                                }
                                              >
                                                {busyKey === playerActionKey ? (
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : null}
                                                {getActionLabel(
                                                  player.pendingCount,
                                                  "player",
                                                )}
                                              </Button>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">
                                                No action available
                                              </span>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>,
                        );
                      }

                      return rows;
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
