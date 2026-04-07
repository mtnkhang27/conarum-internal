import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ListChecks,
  Loader2,
  Lock,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  matchesApi,
  matchScoreBetConfigApi,
  predictionsApi,
  scoreBetsApi,
  teamsApi,
  tournamentsApi,
  tournamentActionsApi,
  tournamentTeamsApi,
} from '@/services/adminApi';
import type {
  AdminMatch,
  AdminMatchListItem,
  AdminPredictionView,
  AdminScoreBetView,
  AdminTeam,
  AdminTournament,
  MatchScoreBetConfig,
} from '@/types/admin';
import { cn } from '@/utils/cn';
import {
  ALL_OPTION,
  EmptySelectionPanel,
  MATCH_STAGES,
  MATCH_STATUSES,
  NONE_OPTION,
  PlayerAvatar,
  StatusBadge,
  SummaryStatCard,
  TeamAvatar,
  formatAuditTimestamp,
  formatCurrencyValue,
  formatPickLabel,
  formatStageLabel,
  matchStatusTone,
  pickToneClasses,
} from './shared';
import { formatLocalDateTimeInputValue, localDateTimeInputToIso } from '@/utils/localTime';

const INFINITE_STEP = 8;
const FIELD_CLASSNAME =
  'h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20';

type MatchRow = AdminMatchListItem & {
  scoreBetConfig: MatchScoreBetConfig | null;
};

type MatchFormState = {
  homeTeam_ID: string;
  awayTeam_ID: string;
  tournament_ID: string;
  kickoff: string;
  venue: string;
  stage: AdminMatch['stage'];
  status: AdminMatch['status'];
  matchday: string;
  isHotMatch: boolean;
};

type WinnerGroup = {
  playerId: string;
  playerName: string;
  playerAvatar?: string | null;
  playerEmail?: string | null;
  outcomeWin?: AdminPredictionView;
  scoreWins: AdminScoreBetView[];
};

const DEFAULT_CREATE_FORM: MatchFormState = {
  homeTeam_ID: '',
  awayTeam_ID: '',
  tournament_ID: '',
  kickoff: '',
  venue: '',
  stage: 'group',
  status: 'upcoming',
  matchday: '',
  isHotMatch: false,
};

function normalizeIntegerInput(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number.parseInt(digits, 10));
}

function WinnerGroupCard({
  group,
  prize,
}: {
  group: WinnerGroup;
  prize: number;
}) {
  const rewardEstimate = group.scoreWins.length * prize;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <PlayerAvatar name={group.playerName} avatar={group.playerAvatar} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{group.playerName}</p>
            <p className="truncate text-xs text-muted-foreground">{group.playerEmail || 'No email recorded'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wins</p>
            <p className="text-lg font-semibold text-foreground">
              {group.scoreWins.length + (group.outcomeWin ? 1 : 0)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {group.outcomeWin ? (
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', pickToneClasses('correct'))}>
              Outcome - {formatPickLabel(group.outcomeWin.pick)} - +{group.outcomeWin.pointsEarned || 0} pts
            </span>
          ) : null}

          {group.scoreWins.map((scoreWin) => (
            <span
              key={scoreWin.ID}
              className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', pickToneClasses('correct'))}
            >
              Exact score - {scoreWin.predictedHomeScore}:{scoreWin.predictedAwayScore}
            </span>
          ))}
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground">
          Estimated score-bet payout: <span className="font-semibold text-foreground">{formatCurrencyValue(rewardEstimate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchManagementPage() {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId?: string }>();
  const [matches, setMatches] = useState<AdminMatchListItem[]>([]);
  const [scoreBetConfigs, setScoreBetConfigs] = useState<MatchScoreBetConfig[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INFINITE_STEP);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(ALL_OPTION);
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL_OPTION);
  const [selectedStage, setSelectedStage] = useState<string>(ALL_OPTION);
  const [selectedHotState, setSelectedHotState] = useState<string>(ALL_OPTION);
  const [selectedDay, setSelectedDay] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createForm, setCreateForm] = useState<MatchFormState>(DEFAULT_CREATE_FORM);
  const scopedLoadId = useRef(0);

  const loadReferenceData = useCallback(async () => {
    setLoading(true);

    try {
      const [nextTeams, nextTournaments] = await Promise.all([teamsApi.list(), tournamentsApi.list()]);
      setTeams(nextTeams);
      setTournaments(nextTournaments);

      if (selectedTournamentId === ALL_OPTION) {
        const preferredTournament =
          nextTournaments.find((item) => item.isDefault) || nextTournaments.find((item) => item.status === 'active');

        if (preferredTournament) {
          setSelectedTournamentId(preferredTournament.ID);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load admin reference data.');
    } finally {
      setLoading(false);
    }
  }, [selectedTournamentId]);

  const loadMatches = useCallback(
    async (tournamentId = selectedTournamentId, status = selectedStatus) => {
      const requestId = ++scopedLoadId.current;
      setLoading(true);

      try {
        const [nextMatches, nextConfigs] = await Promise.all([
          matchesApi.list({
            tournamentId: tournamentId !== ALL_OPTION ? tournamentId : undefined,
            status: status !== ALL_OPTION ? (status as AdminMatchListItem['status']) : undefined,
          }),
          matchScoreBetConfigApi.list(),
        ]);

        if (requestId !== scopedLoadId.current) return;

        setMatches(nextMatches);
        setScoreBetConfigs(nextConfigs);
      } catch (error) {
        if (requestId !== scopedLoadId.current) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load matches.');
      } finally {
        if (requestId === scopedLoadId.current) {
          setLoading(false);
        }
      }
    },
    [selectedStatus, selectedTournamentId],
  );

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    setVisibleCount(INFINITE_STEP);
  }, [searchTerm, selectedTournamentId, selectedStatus, selectedStage, selectedHotState, selectedDay]);

  const rows = useMemo<MatchRow[]>(() => {
    const configMap = new Map(scoreBetConfigs.map((config) => [config.match_ID, config] as const));

    return matches.map((match) => ({
      ...match,
      scoreBetConfig: configMap.get(match.ID) ?? null,
    }));
  }, [matches, scoreBetConfigs]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = `${row.homeTeamName || ''} ${row.awayTeamName || ''} ${row.tournamentName || ''}`.toLowerCase();

      if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
      if (selectedStage !== ALL_OPTION && row.stage !== selectedStage) return false;
      if (selectedHotState === 'hot' && !row.isHotMatch) return false;
      if (selectedHotState === 'normal' && row.isHotMatch) return false;
      if (selectedDay && row.kickoff?.slice(0, 10) !== selectedDay) return false;

      return true;
    });
  }, [rows, searchTerm, selectedStage, selectedHotState, selectedDay]);

  const visibleRows = filteredRows.slice(0, visibleCount);
  const hasMoreRows = visibleRows.length < filteredRows.length;

  const stats = useMemo(() => {
    const scoreEnabledCount = filteredRows.filter((row) => row.scoreBetConfig?.enabled).length;
    const liveCount = filteredRows.filter((row) => row.status === 'live').length;
    const hotCount = filteredRows.filter((row) => row.isHotMatch).length;

    return {
      total: filteredRows.length,
      scoreEnabledCount,
      liveCount,
      hotCount,
    };
  }, [filteredRows]);

  const columns = useMemo<DataTableColumn<MatchRow>[]>(
    () => [
      {
        key: 'kickoff',
        labelKey: 'Date / Status',
        width: 210,
        render: (_, row) => (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{formatAuditTimestamp(row.kickoff)}</div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={row.status} tone={matchStatusTone(row.status)} />
              {row.isHotMatch ? <StatusBadge label="Hot" tone="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" /> : null}
              {row.bettingLocked ? <StatusBadge label="Locked" tone="border-amber-200 bg-amber-50 text-amber-700" /> : null}
            </div>
          </div>
        ),
      },
      {
        key: 'tournamentName',
        labelKey: 'Tournament',
        width: 180,
        render: (_, row) => (
          <div className="space-y-1">
            <div className="font-medium text-foreground">{row.tournamentName || 'Tournament TBD'}</div>
            <div className="text-xs text-muted-foreground">{formatStageLabel(row.stage, row.leg)}</div>
          </div>
        ),
      },
      {
        key: 'teams',
        labelKey: 'Teams',
        width: 260,
        render: (_, row) => (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TeamAvatar name={row.homeTeamName || 'Home'} crest={row.homeTeamCrest} flagCode={row.homeTeamFlag} />
              <span className="text-sm font-medium text-foreground">{row.homeTeamName || 'Home TBD'}</span>
            </div>
            <div className="flex items-center gap-2">
              <TeamAvatar name={row.awayTeamName || 'Away'} crest={row.awayTeamCrest} flagCode={row.awayTeamFlag} />
              <span className="text-sm font-medium text-foreground">{row.awayTeamName || 'Away TBD'}</span>
            </div>
            {row.homeScore != null && row.awayScore != null ? (
              <div className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-semibold text-foreground">
                Result - {row.homeScore} - {row.awayScore}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'scorePick',
        labelKey: 'Score Pick',
        width: 220,
        render: (_, row) =>
          row.scoreBetConfig?.enabled ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{row.scoreBetConfig.maxBets} picks per player</p>
              <p className="text-xs text-muted-foreground">{formatCurrencyValue(row.scoreBetConfig.prize)} reward per correct score</p>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Disabled</span>
          ),
      },
      {
        key: 'wdl',
        labelKey: 'WDL Pick',
        width: 180,
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{Math.trunc(Number(row.outcomePoints || 0))} pts</p>
            <p className="text-xs text-muted-foreground">Awarded for a correct 1-X-2 pick</p>
          </div>
        ),
      },
      {
        key: 'audit',
        labelKey: 'Audit',
        width: 220,
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</p>
            <p className="text-sm text-foreground">{formatAuditTimestamp(row.createdAt)}</p>
            <p className="text-xs text-muted-foreground">Updated - {formatAuditTimestamp(row.modifiedAt)}</p>
          </div>
        ),
      },
    ],
    [],
  );

  const handleOpenCreate = () => {
    const preferredTournament =
      tournaments.find((item) => item.ID === selectedTournamentId) ||
      tournaments.find((item) => item.isDefault) ||
      tournaments[0];

    setCreateForm({
      ...DEFAULT_CREATE_FORM,
      tournament_ID: preferredTournament?.ID || '',
    });
    setCreateOpen(true);
  };

  const handleCreateMatch = async () => {
    const kickoffIso = localDateTimeInputToIso(createForm.kickoff);
    if (!kickoffIso) {
      toast.error('Please provide a valid kickoff time.');
      return;
    }

    setBusy(true);

    try {
      const ensureIds = [createForm.homeTeam_ID, createForm.awayTeam_ID].filter((value): value is string => Boolean(value));

      if (createForm.tournament_ID) {
        await Promise.all(ensureIds.map((teamId) => tournamentTeamsApi.ensureMembership(createForm.tournament_ID, teamId)));
      }

      const nextStatus = createForm.status;
      const created = await matchesApi.create({
        homeTeam_ID: createForm.homeTeam_ID || null,
        awayTeam_ID: createForm.awayTeam_ID || null,
        tournament_ID: createForm.tournament_ID,
        kickoff: kickoffIso,
        venue: createForm.venue || null,
        stage: createForm.stage,
        status: nextStatus,
        matchday: createForm.matchday ? normalizeIntegerInput(createForm.matchday) : null,
        isHotMatch: createForm.isHotMatch,
        ...(nextStatus === 'live' ? { homeScore: 0, awayScore: 0 } : {}),
      });

      toast.success('Match created.');
      setCreateOpen(false);
      await loadMatches();
      navigate(`/admin/matches/${created.ID}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create match.');
    } finally {
      setBusy(false);
    }
  };

  const handleSyncResults = async () => {
    if (selectedTournamentId === ALL_OPTION) {
      toast.error('Select a tournament before syncing results.');
      return;
    }

    setBusy(true);

    try {
      await tournamentActionsApi.syncMatchResults(selectedTournamentId);
      toast.success('Match results synced.');
      await loadMatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync match results.');
    } finally {
      setBusy(false);
    }
  };

  const requestMoreRows = () => {
    if (!hasMoreRows || loading) return;
    setVisibleCount((current) => Math.min(filteredRows.length, current + INFINITE_STEP));
  };

  const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceToBottom <= 140) {
      requestMoreRows();
    }
  };

  return (
    <div className={cn('grid gap-6', matchId ? 'xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]' : 'grid-cols-1')}>
      <div className="min-w-0 space-y-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/80 bg-muted/20">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-xl">Match Management</CardTitle>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void loadMatches()} disabled={loading}>
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" onClick={handleSyncResults} disabled={busy}>
                  <Sparkles className="h-4 w-4" />
                  Sync results
                </Button>
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" />
                  New match
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by team or tournament" className="pl-9" />
              </div>
              <select className={cn(FIELD_CLASSNAME, 'min-w-[180px]')} value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)}>
                <option value={ALL_OPTION}>All tournaments</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.ID} value={tournament.ID}>
                    {tournament.name}
                  </option>
                ))}
              </select>
              <select className={cn(FIELD_CLASSNAME, 'min-w-[160px]')} value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value={ALL_OPTION}>All status</option>
                {MATCH_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select className={cn(FIELD_CLASSNAME, 'min-w-[160px]')} value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)}>
                <option value={ALL_OPTION}>All stages</option>
                {MATCH_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {formatStageLabel(stage)}
                  </option>
                ))}
              </select>
              <select className={cn(FIELD_CLASSNAME, 'min-w-[180px]')} value={selectedHotState} onChange={(event) => setSelectedHotState(event.target.value)}>
                <option value={ALL_OPTION}>All highlight states</option>
                <option value="hot">Hot matches only</option>
                <option value="normal">Normal matches only</option>
              </select>
              <Input type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="min-w-[170px]" />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="scrollbar-hidden max-h-[70vh] overflow-auto" onScroll={handleTableScroll}>
              <DataTable
                data={visibleRows}
                columns={columns}
                isLoading={loading}
                onRowClick={(row) => navigate(`/admin/matches/${row.ID}`)}
                variant="borderless"
                mobileRenderMode="card"
                showFooter={false}
                emptyMessageKey="No matches found"
                className="rounded-none border-0 shadow-none"
              />

              {hasMoreRows && !loading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        {matchId ? (
          <MatchDetailPanel
            matchId={matchId}
            teams={teams}
            tournaments={tournaments}
            onChanged={async () => {
              await loadMatches();
            }}
            onDeleted={async () => {
              await loadMatches();
              navigate('/admin/matches');
            }}
          />
        ) : (
          <EmptySelectionPanel
            title="Select a match"
            description="Pick a row to edit."
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create match</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Tournament</span>
                <select className={FIELD_CLASSNAME} value={createForm.tournament_ID} onChange={(event) => setCreateForm((current) => ({ ...current, tournament_ID: event.target.value }))}>
                  <option value="" disabled>
                    Select tournament
                  </option>
                  {tournaments.map((tournament) => (
                    <option key={tournament.ID} value={tournament.ID}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Kickoff</span>
                <Input type="datetime-local" value={createForm.kickoff} onChange={(event) => setCreateForm((current) => ({ ...current, kickoff: event.target.value }))} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Home team</span>
                <select className={FIELD_CLASSNAME} value={createForm.homeTeam_ID || NONE_OPTION} onChange={(event) => setCreateForm((current) => ({ ...current, homeTeam_ID: event.target.value === NONE_OPTION ? '' : event.target.value }))}>
                  <option value={NONE_OPTION}>Unassigned</option>
                  {teams.map((team) => (
                    <option key={team.ID} value={team.ID}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Away team</span>
                <select className={FIELD_CLASSNAME} value={createForm.awayTeam_ID || NONE_OPTION} onChange={(event) => setCreateForm((current) => ({ ...current, awayTeam_ID: event.target.value === NONE_OPTION ? '' : event.target.value }))}>
                  <option value={NONE_OPTION}>Unassigned</option>
                  {teams.map((team) => (
                    <option key={team.ID} value={team.ID}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Stage</span>
                <select className={FIELD_CLASSNAME} value={createForm.stage} onChange={(event) => setCreateForm((current) => ({ ...current, stage: event.target.value as AdminMatch['stage'] }))}>
                  {MATCH_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {formatStageLabel(stage)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Status</span>
                <select className={FIELD_CLASSNAME} value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value as AdminMatch['status'] }))}>
                  {MATCH_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Venue</span>
                <Input value={createForm.venue} onChange={(event) => setCreateForm((current) => ({ ...current, venue: event.target.value }))} placeholder="Stadium or venue" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Matchday</span>
                <Input type="number" min="1" value={createForm.matchday} onChange={(event) => setCreateForm((current) => ({ ...current, matchday: event.target.value }))} />
              </label>
            </div>
            <label className="inline-flex items-center gap-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-sm text-foreground">
              <input type="checkbox" checked={createForm.isHotMatch} onChange={(event) => setCreateForm((current) => ({ ...current, isHotMatch: event.target.checked }))} className="h-4 w-4 rounded border-border accent-primary" />
              Highlight as a hot match
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMatch} disabled={busy || !createForm.tournament_ID}>
              Create match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatchDetailPanel({
  matchId,
  teams,
  tournaments,
  onChanged,
  onDeleted,
}: {
  matchId: string;
  teams: AdminTeam[];
  tournaments: AdminTournament[];
  onChanged: () => Promise<void> | void;
  onDeleted: () => Promise<void> | void;
}) {
  const [match, setMatch] = useState<AdminMatch | null>(null);
  const [scoreBetConfig, setScoreBetConfig] = useState<MatchScoreBetConfig | null>(null);
  const [predictions, setPredictions] = useState<AdminPredictionView[]>([]);
  const [scoreBets, setScoreBets] = useState<AdminScoreBetView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultHome, setResultHome] = useState('');
  const [resultAway, setResultAway] = useState('');
  const [isCorrection, setIsCorrection] = useState(false);
  const [form, setForm] = useState<MatchFormState>(DEFAULT_CREATE_FORM);
  const [outcomePoints, setOutcomePoints] = useState('1');
  const [scoreBettingEnabled, setScoreBettingEnabled] = useState(false);
  const [maxBets, setMaxBets] = useState('3');
  const [prizeInput, setPrizeInput] = useState('200,000');

  const loadDetail = useCallback(async () => {
    setLoading(true);

    try {
      const [nextMatch, nextConfig, nextPredictions, nextScoreBets] = await Promise.all([
        matchesApi.get(matchId),
        matchScoreBetConfigApi.getByMatch(matchId),
        predictionsApi.listByMatch(matchId),
        scoreBetsApi.listByMatch(matchId),
      ]);

      setMatch(nextMatch);
      setScoreBetConfig(nextConfig);
      setPredictions(nextPredictions);
      setScoreBets(nextScoreBets);
      setForm({
        homeTeam_ID: nextMatch.homeTeam_ID || '',
        awayTeam_ID: nextMatch.awayTeam_ID || '',
        tournament_ID: nextMatch.tournament_ID,
        kickoff: formatLocalDateTimeInputValue(nextMatch.kickoff),
        venue: nextMatch.venue || '',
        stage: nextMatch.stage,
        status: nextMatch.status,
        matchday: nextMatch.matchday != null ? String(nextMatch.matchday) : '',
        isHotMatch: !!nextMatch.isHotMatch,
      });
      setOutcomePoints(String(Math.trunc(Number(nextMatch.outcomePoints || 1))));
      setScoreBettingEnabled(!!nextConfig?.enabled);
      setMaxBets(String(Math.max(1, Math.trunc(Number(nextConfig?.maxBets || 3)))));
      setPrizeInput(sanitizeCurrencyInput(String(Math.trunc(Number(nextConfig?.prize || 200000)))));
    } catch (error) {
      setMatch(null);
      toast.error(error instanceof Error ? error.message : 'Failed to load match details.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const groupedWinners = useMemo(() => {
    const map = new Map<string, WinnerGroup>();

    for (const prediction of predictions.filter((item) => item.isCorrect === true)) {
      const existing = map.get(prediction.player_ID) || {
        playerId: prediction.player_ID,
        playerName: prediction.playerName || prediction.player_ID,
        playerAvatar: prediction.playerAvatar,
        playerEmail: prediction.playerEmail,
        scoreWins: [],
      };

      existing.outcomeWin = prediction;
      map.set(prediction.player_ID, existing);
    }

    for (const scoreBet of scoreBets.filter((item) => item.isCorrect === true)) {
      const existing = map.get(scoreBet.player_ID) || {
        playerId: scoreBet.player_ID,
        playerName: scoreBet.playerName || scoreBet.player_ID,
        playerAvatar: scoreBet.playerAvatar,
        playerEmail: scoreBet.playerEmail,
        scoreWins: [],
      };

      existing.scoreWins.push(scoreBet);
      map.set(scoreBet.player_ID, existing);
    }

    return [...map.values()].sort((left, right) => {
      const leftScore = left.scoreWins.length + (left.outcomeWin ? 1 : 0);
      const rightScore = right.scoreWins.length + (right.outcomeWin ? 1 : 0);

      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.playerName.localeCompare(right.playerName);
    });
  }, [predictions, scoreBets]);

  const homeWins = predictions.filter((item) => item.pick === 'home').length;
  const drawWins = predictions.filter((item) => item.pick === 'draw').length;
  const awayWins = predictions.filter((item) => item.pick === 'away').length;
  const correctOutcomeCount = predictions.filter((item) => item.isCorrect === true).length;
  const correctScoreCount = scoreBets.filter((item) => item.isCorrect === true).length;

  const handleSave = async () => {
    if (!match) return;

    const kickoffIso = localDateTimeInputToIso(form.kickoff);
    if (!kickoffIso) {
      toast.error('Please provide a valid kickoff time.');
      return;
    }

    setSaving(true);

    try {
      const homeTeamId = form.homeTeam_ID || null;
      const awayTeamId = form.awayTeam_ID || null;

      if (form.tournament_ID) {
        const ensureIds = [homeTeamId, awayTeamId].filter((value): value is string => Boolean(value));
        await Promise.all(ensureIds.map((teamId) => tournamentTeamsApi.ensureMembership(form.tournament_ID, teamId)));
      }

      const payload: Partial<AdminMatch> = {
        homeTeam_ID: homeTeamId,
        awayTeam_ID: awayTeamId,
        tournament_ID: form.tournament_ID,
        kickoff: kickoffIso,
        venue: form.venue || null,
        stage: form.stage,
        status: form.status,
        matchday: form.matchday ? normalizeIntegerInput(form.matchday) : null,
        isHotMatch: form.isHotMatch,
        outcomePoints: Math.max(1, normalizeIntegerInput(outcomePoints, 1)),
      };

      if (form.status === 'live' && (match.homeScore == null || match.awayScore == null)) {
        payload.homeScore = 0;
        payload.awayScore = 0;
      }

      await matchesApi.update(match.ID, payload);

      if (scoreBettingEnabled) {
        const configPayload = {
          match_ID: match.ID,
          enabled: true,
          maxBets: Math.max(1, normalizeIntegerInput(maxBets, 3)),
          prize: normalizeIntegerInput(prizeInput.replace(/\D/g, ''), 200000),
        };

        if (scoreBetConfig?.ID) {
          await matchScoreBetConfigApi.update(scoreBetConfig.ID, configPayload);
        } else {
          await matchScoreBetConfigApi.create(configPayload);
        }
      } else if (scoreBetConfig?.ID) {
        await matchScoreBetConfigApi.delete(scoreBetConfig.ID);
      }

      toast.success('Match configuration saved.');
      await Promise.all([loadDetail(), Promise.resolve(onChanged())]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save match changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async () => {
    if (!match) return;

    setSaving(true);

    try {
      await matchesApi.lockBetting(match.ID, !match.bettingLocked);
      toast.success(match.bettingLocked ? 'Betting unlocked for this match.' : 'Betting locked for this match.');
      await Promise.all([loadDetail(), Promise.resolve(onChanged())]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update betting lock.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!match) return;

    setSaving(true);

    try {
      await matchesApi.delete(match.ID);
      toast.success('Match deleted.');
      setDeleteOpen(false);
      await onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete match.');
    } finally {
      setSaving(false);
    }
  };

  const openResultDialog = (correction = false) => {
    if (!match) return;

    setIsCorrection(correction);
    setResultHome(match.homeScore != null ? String(match.homeScore) : '');
    setResultAway(match.awayScore != null ? String(match.awayScore) : '');
    setResultDialogOpen(true);
  };

  const handleSubmitResult = async () => {
    if (!match || resultHome === '' || resultAway === '') return;

    setSaving(true);

    try {
      const homeScore = normalizeIntegerInput(resultHome);
      const awayScore = normalizeIntegerInput(resultAway);

      if (isCorrection) {
        await matchesApi.correctResult(match.ID, homeScore, awayScore);
      } else {
        await matchesApi.enterResult(match.ID, homeScore, awayScore);
      }

      toast.success(isCorrection ? 'Result corrected and rescored.' : 'Result saved and scored.');
      setResultDialogOpen(false);
      await Promise.all([loadDetail(), Promise.resolve(onChanged())]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save the result.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
          Loading match details...
        </CardContent>
      </Card>
    );
  }

  if (!match) {
    return (
      <EmptySelectionPanel
        title="Match unavailable"
        description="Select another match from the list to continue."
      />
    );
  }

  const homeTeam = teams.find((team) => team.ID === (form.homeTeam_ID || match.homeTeam_ID || ''));
  const awayTeam = teams.find((team) => team.ID === (form.awayTeam_ID || match.awayTeam_ID || ''));
  const safePrize = normalizeIntegerInput(prizeInput.replace(/\D/g, ''), 0);

  return (
    <>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/80 bg-muted/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={match.status} tone={matchStatusTone(match.status)} />
                <StatusBadge label={formatStageLabel(match.stage, match.leg)} tone="border-border bg-card text-foreground" />
                {match.bettingLocked ? (
                  <StatusBadge label="Betting locked" tone="border-amber-200 bg-amber-50 text-amber-700" />
                ) : null}
                {match.isHotMatch ? (
                  <StatusBadge label="Hot match" tone="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" />
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <TeamAvatar
                      name={homeTeam?.name || match.homeTeam?.name || match.homeTeam_ID || 'Home'}
                      crest={homeTeam?.crest || match.homeTeam?.crest}
                      flagCode={homeTeam?.flagCode || match.homeTeam?.flagCode}
                    />
                    <span className="font-medium text-foreground">{homeTeam?.name || match.homeTeam?.name || 'Home TBD'}</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">vs</span>
                  <div className="flex items-center gap-2">
                    <TeamAvatar
                      name={awayTeam?.name || match.awayTeam?.name || match.awayTeam_ID || 'Away'}
                      crest={awayTeam?.crest || match.awayTeam?.crest}
                      flagCode={awayTeam?.flagCode || match.awayTeam?.flagCode}
                    />
                    <span className="font-medium text-foreground">{awayTeam?.name || match.awayTeam?.name || 'Away TBD'}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {match.tournament?.name || tournaments.find((item) => item.ID === match.tournament_ID)?.name || 'Tournament TBD'} -{' '}
                  {formatAuditTimestamp(match.kickoff)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleToggleLock} disabled={saving}>
                {match.bettingLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {match.bettingLocked ? 'Unlock betting' : 'Lock betting'}
              </Button>
              <Button variant="outline" onClick={() => openResultDialog(match.status === 'finished')} disabled={saving}>
                <ListChecks className="h-4 w-4" />
                {match.status === 'finished' ? 'Correct result' : 'Enter result'}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={saving}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryStatCard label="Outcome winners" value={String(correctOutcomeCount)} />
            <SummaryStatCard label="Correct score bets" value={String(correctScoreCount)} />
            <SummaryStatCard label="Score bet reward" value={formatCurrencyValue(safePrize)} />
          </div>

          <Tabs defaultValue="configuration" className="space-y-4">
            <TabsList>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="winners">Correct Picks</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="configuration" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <Card className="border-border/80 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Match Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-foreground">Tournament</span>
                        <select className={FIELD_CLASSNAME} value={form.tournament_ID} onChange={(event) => setForm((current) => ({ ...current, tournament_ID: event.target.value }))}>
                          <option value="" disabled>
                            Select tournament
                          </option>
                          {tournaments.map((tournament) => (
                            <option key={tournament.ID} value={tournament.ID}>
                              {tournament.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-foreground">Kickoff</span>
                        <Input type="datetime-local" value={form.kickoff} onChange={(event) => setForm((current) => ({ ...current, kickoff: event.target.value }))} />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-foreground">Stage</span>
                        <select className={FIELD_CLASSNAME} value={form.stage} onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value as AdminMatch['stage'] }))}>
                          {MATCH_STAGES.map((stage) => (
                            <option key={stage} value={stage}>
                              {formatStageLabel(stage)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-foreground">Status</span>
                        <select className={FIELD_CLASSNAME} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminMatch['status'] }))}>
                          {MATCH_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-foreground">Venue</span>
                        <Input value={form.venue} onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))} placeholder="Stadium or venue" />
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-foreground">Matchday</span>
                        <Input type="number" min="1" value={form.matchday} onChange={(event) => setForm((current) => ({ ...current, matchday: event.target.value }))} />
                      </label>
                    </div>

                    <label className="inline-flex items-center gap-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.isHotMatch}
                        onChange={(event) => setForm((current) => ({ ...current, isHotMatch: event.target.checked }))}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Highlight as a hot match
                    </label>
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Betting Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-foreground">WDL points</span>
                      <Input type="number" min="1" value={outcomePoints} onChange={(event) => setOutcomePoints(event.target.value)} />
                    </label>

                    <label className="inline-flex items-center gap-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={scoreBettingEnabled}
                        onChange={(event) => setScoreBettingEnabled(event.target.checked)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Enable exact score picks for this match
                    </label>

                    {scoreBettingEnabled ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-foreground">Score pick limit</span>
                          <Input type="number" min="1" value={maxBets} onChange={(event) => setMaxBets(event.target.value)} />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-foreground">Reward per correct score</span>
                          <Input value={prizeInput} onChange={(event) => setPrizeInput(sanitizeCurrencyInput(event.target.value))} placeholder="200,000" />
                        </label>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 text-sm text-muted-foreground">
                        Exact-score picks are disabled for this match.
                      </div>
                    )}

                    <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current player-facing summary</p>
                      <div className="mt-3 space-y-2 text-sm text-foreground">
                        <p>WDL reward: <span className="font-semibold">{Math.max(1, normalizeIntegerInput(outcomePoints, 1))} pts</span></p>
                        <p>
                          Exact score: <span className="font-semibold">{scoreBettingEnabled ? `${Math.max(1, normalizeIntegerInput(maxBets, 3))} picks - ${formatCurrencyValue(safePrize)} each` : 'Disabled'}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="winners" className="space-y-4">
              {groupedWinners.length === 0 ? (
                <EmptySelectionPanel
                  title="No correct picks yet"
                  description="Once the match has been scored, winning outcome picks and correct score bets will be grouped here by player."
                />
              ) : (
                <div className="space-y-4">
                  <Card className="border-border/80 shadow-none">
                    <CardContent className="grid gap-4 p-4 md:grid-cols-3">
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correct outcome picks</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{correctOutcomeCount}</p>
                      </div>
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correct score bets</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{correctScoreCount}</p>
                      </div>
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Winning players</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{groupedWinners.length}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {groupedWinners.map((group) => (
                      <WinnerGroupCard key={group.playerId} group={group} prize={safePrize} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/80 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Lifecycle</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</p>
                      <p className="mt-1 text-foreground">{formatAuditTimestamp(match.createdAt)}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last updated</p>
                      <p className="mt-1 text-foreground">{formatAuditTimestamp(match.modifiedAt)}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kickoff</p>
                      <p className="mt-1 text-foreground">{formatAuditTimestamp(match.kickoff)}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current result</p>
                      <p className="mt-1 text-foreground">{match.homeScore != null && match.awayScore != null ? `${match.homeScore} - ${match.awayScore}` : 'Pending'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Submission spread</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outcome split</p>
                      <p className="mt-1 text-foreground">1: {homeWins} - X: {drawWins} - 2: {awayWins}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prediction records</p>
                      <p className="mt-1 text-foreground">{predictions.length} outcome picks</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score bet records</p>
                      <p className="mt-1 text-foreground">{scoreBets.length} exact-score submissions</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">External reference</p>
                      <p className="mt-1 text-foreground">{match.externalId || 'Not linked'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCorrection ? 'Correct match result' : 'Enter match result'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {homeTeam?.name || match.homeTeam?.name || 'Home'} vs {awayTeam?.name || match.awayTeam?.name || 'Away'}
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Input type="number" min="0" value={resultHome} onChange={(event) => setResultHome(event.target.value)} />
              <span className="text-sm font-semibold text-muted-foreground">-</span>
              <Input type="number" min="0" value={resultAway} onChange={(event) => setResultAway(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResult} disabled={saving || resultHome === '' || resultAway === ''}>
              Save result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete match?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the match from the admin worklist. Existing prediction records tied to the match may also be impacted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

