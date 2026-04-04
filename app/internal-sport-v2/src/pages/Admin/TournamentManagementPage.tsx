import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Crown, Lock, Plus, RefreshCcw, Save, Search, ShieldCheck, Star, Trash2, Unlock } from 'lucide-react';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { championPicksApi, playerTournamentStatsApi, tournamentActionsApi, tournamentsApi, tournamentTeamsApi } from '@/services/adminApi';
import type { AdminChampionPickView, AdminTournament, AdminTournamentStatsView, AdminTournamentTeamView } from '@/types/admin';
import { cn } from '@/utils/cn';
import {
  ALL_OPTION,
  EmptySelectionPanel,
  PlayerAvatar,
  StatusBadge,
  SummaryStatCard,
  TeamAvatar,
  TOURNAMENT_STATUSES,
  formatAuditTimestamp,
  tournamentStatusTone,
} from './shared';

const PAGE_SIZE = 8;
const FIELD_CLASSNAME =
  'h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20';

type TournamentFormState = {
  name: string;
  startDate: string;
  endDate: string;
  status: AdminTournament['status'];
  description: string;
  outcomePrize: string;
  championPrizePool: string;
  championBettingStatus: 'open' | 'locked';
};

const DEFAULT_CREATE_FORM: TournamentFormState = {
  name: '',
  startDate: '',
  endDate: '',
  status: 'upcoming',
  description: '',
  outcomePrize: '',
  championPrizePool: '',
  championBettingStatus: 'open',
};

function ChampionPickGroup({
  teamId,
  teamName,
  teamCrest,
  teamFlag,
  picks,
}: {
  teamId: string;
  teamName: string;
  teamCrest?: string | null;
  teamFlag?: string | null;
  picks: AdminChampionPickView[];
}) {
  const winner = picks.some((pick) => pick.isCorrect === true);

  return (
    <Card className={cn('border-border/80 shadow-none', winner && 'border-emerald-300 bg-emerald-50/40')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <TeamAvatar name={teamName} crest={teamCrest} flagCode={teamFlag} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{teamName}</p>
            <p className="text-xs text-muted-foreground">{picks.length} champion pick(s)</p>
          </div>
          {winner ? <Crown className="h-4 w-4 text-emerald-600" /> : null}
        </div>

        <div className="space-y-2">
          {picks.map((pick) => (
            <div key={`${teamId}-${pick.ID}`} className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/80 px-2.5 py-2">
              <PlayerAvatar name={pick.playerName || pick.player_ID} avatar={pick.playerAvatar} className="h-7 w-7" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{pick.playerName || pick.player_ID}</p>
                <p className="truncate text-xs text-muted-foreground">{pick.playerEmail || 'No email recorded'}</p>
              </div>
              {pick.isCorrect === true ? <StatusBadge label="Winner" tone="border-emerald-200 bg-emerald-50 text-emerald-700" /> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TournamentDetailPanel({
  tournament,
  onChanged,
  onDeleted,
}: {
  tournament: AdminTournament;
  onChanged: () => Promise<void> | void;
  onDeleted: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<TournamentFormState>(DEFAULT_CREATE_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [championPicks, setChampionPicks] = useState<AdminChampionPickView[]>([]);
  const [tournamentStats, setTournamentStats] = useState<AdminTournamentStatsView[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<AdminTournamentTeamView[]>([]);
  const [selectedChampionTeam, setSelectedChampionTeam] = useState('');

  const loadDetails = useCallback(async () => {
    try {
      const [nextChampionPicks, nextStats, nextTeams] = await Promise.all([
        championPicksApi.listByTournament(tournament.ID),
        playerTournamentStatsApi.listByTournament(tournament.ID),
        tournamentTeamsApi.listByTournament(tournament.ID),
      ]);

      setChampionPicks(nextChampionPicks);
      setTournamentStats(nextStats);
      setTournamentTeams(nextTeams);
      setSelectedChampionTeam('');
      setForm({
        name: tournament.name,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        status: tournament.status,
        description: tournament.description || '',
        outcomePrize: tournament.outcomePrize || '',
        championPrizePool: tournament.championPrizePool || '',
        championBettingStatus: tournament.championBettingStatus || 'open',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load tournament details.');
    }
  }, [tournament]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const championGroups = useMemo(() => {
    const grouped = new Map<string, { teamName: string; teamCrest?: string | null; teamFlag?: string | null; picks: AdminChampionPickView[] }>();

    for (const pick of championPicks) {
      const entry = grouped.get(pick.team_ID) || {
        teamName: pick.teamName || pick.team_ID,
        teamCrest: pick.teamCrest,
        teamFlag: pick.teamFlag,
        picks: [],
      };

      entry.picks.push(pick);
      grouped.set(pick.team_ID, entry);
    }

    return [...grouped.entries()].sort((left, right) => right[1].picks.length - left[1].picks.length);
  }, [championPicks]);

  const championWinners = championPicks.filter((pick) => pick.isCorrect === true);
  const leaderboardLeader = tournamentStats[0];

  const handleSave = async () => {
    setSaving(true);

    try {
      await tournamentsApi.update(tournament.ID, {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        description: form.description || null,
        outcomePrize: form.outcomePrize,
        championPrizePool: form.championPrizePool,
        championBettingStatus: form.championBettingStatus,
      });

      toast.success('Tournament configuration saved.');
      await Promise.all([onChanged(), loadDetails()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save tournament changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDefault = async () => {
    setSaving(true);

    try {
      await tournamentsApi.update(tournament.ID, { isDefault: !tournament.isDefault });
      toast.success(tournament.isDefault ? 'Default tournament removed.' : 'Tournament set as default.');
      await Promise.all([onChanged(), loadDetails()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update default tournament.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBettingLock = async () => {
    setSaving(true);

    try {
      await tournamentActionsApi.lockBetting(tournament.ID, !tournament.bettingLocked);
      toast.success(tournament.bettingLocked ? 'Tournament betting unlocked.' : 'Tournament betting locked.');
      await Promise.all([onChanged(), loadDetails()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update tournament lock.');
    } finally {
      setSaving(false);
    }
  };

  const handleLockChampion = async () => {
    setSaving(true);

    try {
      await tournamentActionsApi.lockChampionPredictions(tournament.ID);
      toast.success('Champion picks locked.');
      await Promise.all([onChanged(), loadDetails()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to lock champion picks.');
    } finally {
      setSaving(false);
    }
  };

  const handleResolveChampion = async () => {
    if (!selectedChampionTeam) return;

    setSaving(true);

    try {
      await tournamentActionsApi.resolveChampionPicks(tournament.ID, selectedChampionTeam);
      toast.success('Champion picks resolved.');
      await Promise.all([onChanged(), loadDetails()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve champion picks.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);

    try {
      await tournamentsApi.delete(tournament.ID);
      toast.success('Tournament deleted.');
      setDeleteOpen(false);
      await onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tournament.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/80 bg-muted/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={tournament.status} tone={tournamentStatusTone(tournament.status)} />
                {tournament.isDefault ? <StatusBadge label="Default" tone="border-amber-200 bg-amber-50 text-amber-700" /> : null}
                {tournament.bettingLocked ? <StatusBadge label="Betting locked" tone="border-red-200 bg-red-50 text-red-700" /> : null}
                <StatusBadge label={`Champion ${form.championBettingStatus}`} tone="border-border bg-card text-foreground" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-foreground">{tournament.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {tournament.startDate} to {tournament.endDate}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleToggleDefault} disabled={saving}>
                <Star className="h-4 w-4" />
                {tournament.isDefault ? 'Unset default' : 'Set default'}
              </Button>
              <Button variant="outline" onClick={handleToggleBettingLock} disabled={saving}>
                {tournament.bettingLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {tournament.bettingLocked ? 'Unlock betting' : 'Lock betting'}
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
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryStatCard label="Champion picks" value={String(championPicks.length)} hint={`${championWinners.length} resolved winner(s)`} />
            <SummaryStatCard label="Outcome leaderboard rows" value={String(tournamentStats.length)} hint={leaderboardLeader ? `${leaderboardLeader.playerName || leaderboardLeader.player_ID} currently leads` : 'No leaderboard entries yet'} />
            <SummaryStatCard label="Participating teams" value={String(tournamentTeams.length)} hint="Loaded from tournament-team mapping" />
            <SummaryStatCard label="Champion prize" value={form.championPrizePool || 'Not set'} hint="Shown in champion resolution workflow" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <Card className="border-border/80 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Tournament Settings</CardTitle>
                <CardDescription>Keep tournament dates, status, and reward messaging aligned with the player-facing experience.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Name</span>
                    <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Status</span>
                    <select className={FIELD_CLASSNAME} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminTournament['status'] }))}>
                      {TOURNAMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Start date</span>
                    <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">End date</span>
                    <Input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Description</span>
                  <textarea
                    className="min-h-[96px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Optional tournament description"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Outcome reward</span>
                    <Input value={form.outcomePrize} onChange={(event) => setForm((current) => ({ ...current, outcomePrize: event.target.value }))} placeholder="E.g. iPhone 15 Pro Max" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Champion reward</span>
                    <Input value={form.championPrizePool} onChange={(event) => setForm((current) => ({ ...current, championPrizePool: event.target.value }))} placeholder="Champion prize pool" />
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Champion pick status</span>
                  <select className={FIELD_CLASSNAME} value={form.championBettingStatus} onChange={(event) => setForm((current) => ({ ...current, championBettingStatus: event.target.value as 'open' | 'locked' }))}>
                    <option value="open">Open</option>
                    <option value="locked">Locked</option>
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" onClick={handleLockChampion} disabled={saving || form.championBettingStatus === 'locked'}>
                    <ShieldCheck className="h-4 w-4" />
                    Lock champion picks
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <select className={FIELD_CLASSNAME} value={selectedChampionTeam || ALL_OPTION} onChange={(event) => setSelectedChampionTeam(event.target.value === ALL_OPTION ? '' : event.target.value)}>
                      <option value={ALL_OPTION}>Select champion team</option>
                      {tournamentTeams
                        .filter((team) => team.teamName)
                        .map((team) => (
                          <option key={team.team_ID} value={team.team_ID}>
                            {team.teamName}
                          </option>
                        ))}
                    </select>
                    <Button variant="outline" onClick={handleResolveChampion} disabled={saving || !selectedChampionTeam}>
                      <Crown className="h-4 w-4" />
                      Resolve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/80 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">Audit Snapshot</CardTitle>
                  <CardDescription>Quick context for managed timestamps and runtime flags.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</p>
                    <p className="mt-1 text-foreground">{formatAuditTimestamp(tournament.createdAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last updated</p>
                    <p className="mt-1 text-foreground">{formatAuditTimestamp(tournament.modifiedAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">External code</p>
                    <p className="mt-1 text-foreground">{tournament.externalCode || 'Not linked'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">Outcome Leaderboard</CardTitle>
                  <CardDescription>Top tournament standings from the admin stats view.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tournamentStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No player leaderboard data yet.</p>
                  ) : (
                    tournamentStats.slice(0, 5).map((entry, index) => (
                      <div key={entry.ID} className={cn('flex items-center gap-3 rounded-xl border border-border/80 px-3 py-2', index === 0 && 'bg-primary/5')}>
                        <span className="w-5 text-center text-sm font-semibold text-muted-foreground">{index + 1}</span>
                        <PlayerAvatar name={entry.playerName || entry.player_ID} avatar={entry.playerAvatar} className="h-8 w-8" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{entry.playerName || entry.player_ID}</p>
                          <p className="text-xs text-muted-foreground">{entry.totalCorrect}/{entry.totalPredictions} correct</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{entry.totalPoints} pts</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-border/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Champion Picks</CardTitle>
              <CardDescription>Grouped by team so admins can quickly spot crowd consensus and winners.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {championGroups.length === 0 ? (
                <EmptySelectionPanel title="No champion picks yet" description="Champion picks will appear here once players start selecting their tournament winner." />
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {championGroups.map(([teamId, group]) => (
                    <ChampionPickGroup key={teamId} teamId={teamId} teamName={group.teamName} teamCrest={group.teamCrest} teamFlag={group.teamFlag} picks={group.picks} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the tournament from the admin worklist and can affect related matches, standings, and prediction data.
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

export function TournamentManagementPage() {
  const navigate = useNavigate();
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL_OPTION);
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TournamentFormState>(DEFAULT_CREATE_FORM);
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);

  const loadTournaments = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const nextTournaments = await tournamentsApi.list();
      if (requestId !== requestIdRef.current) return;
      setTournaments(nextTournaments);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      toast.error(error instanceof Error ? error.message : 'Failed to load tournaments.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedStatus]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tournaments.filter((tournament) => {
      const haystack = `${tournament.name} ${tournament.description || ''} ${tournament.externalCode || ''}`.toLowerCase();
      if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
      if (selectedStatus !== ALL_OPTION && tournament.status !== selectedStatus) return false;
      return true;
    });
  }, [tournaments, searchTerm, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedTournament = tournaments.find((item) => item.ID === tournamentId);

  const columns = useMemo<DataTableColumn<AdminTournament>[]>(
    () => [
      {
        key: 'name',
        labelKey: 'Tournament',
        width: 230,
        render: (_, row) => (
          <div className="space-y-1">
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.externalCode || 'Manual tournament'}</div>
          </div>
        ),
      },
      {
        key: 'schedule',
        labelKey: 'Schedule',
        width: 210,
        render: (_, row) => (
          <div className="space-y-2">
            <StatusBadge label={row.status} tone={tournamentStatusTone(row.status)} />
            <div className="text-sm text-foreground">{row.startDate} to {row.endDate}</div>
          </div>
        ),
      },
      {
        key: 'outcomePrize',
        labelKey: 'Outcome Reward',
        width: 220,
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{row.outcomePrize || 'Not set'}</p>
            <p className="text-xs text-muted-foreground">Shown to the UC2 leaderboard winner</p>
          </div>
        ),
      },
      {
        key: 'championPrize',
        labelKey: 'Champion Config',
        width: 220,
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{row.championPrizePool || 'Not set'}</p>
            <p className="text-xs text-muted-foreground">Champion picks are {row.championBettingStatus}</p>
          </div>
        ),
      },
      {
        key: 'audit',
        labelKey: 'Audit',
        width: 220,
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Updated</p>
            <p className="text-sm text-foreground">{formatAuditTimestamp(row.modifiedAt)}</p>
            <div className="flex flex-wrap gap-2">
              {row.isDefault ? <StatusBadge label="Default" tone="border-amber-200 bg-amber-50 text-amber-700" /> : null}
              {row.bettingLocked ? <StatusBadge label="Locked" tone="border-red-200 bg-red-50 text-red-700" /> : null}
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  const stats = useMemo(() => {
    const active = filteredRows.filter((item) => item.status === 'active').length;
    const defaults = filteredRows.filter((item) => item.isDefault).length;
    const locked = filteredRows.filter((item) => item.bettingLocked).length;

    return { total: filteredRows.length, active, defaults, locked };
  }, [filteredRows]);

  const handleCreateTournament = async () => {
    setBusy(true);

    try {
      const created = await tournamentsApi.create({
        name: createForm.name,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        status: createForm.status,
        description: createForm.description || null,
        outcomePrize: createForm.outcomePrize,
        championPrizePool: createForm.championPrizePool,
        championBettingStatus: createForm.championBettingStatus,
      });

      toast.success('Tournament created.');
      setCreateOpen(false);
      setCreateForm(DEFAULT_CREATE_FORM);
      await loadTournaments();
      navigate(`/admin/tournaments/${created.ID}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tournament.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('grid gap-6', tournamentId ? 'xl:grid-cols-[minmax(0,1.3fr)_minmax(420px,1fr)]' : 'grid-cols-1')}>
      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryStatCard label="Visible tournaments" value={String(stats.total)} hint="Current worklist after filters" />
          <SummaryStatCard label="Active" value={String(stats.active)} hint="Running competitions" />
          <SummaryStatCard label="Default" value={String(stats.defaults)} hint="Auto-selected tournament(s)" />
          <SummaryStatCard label="Betting locked" value={String(stats.locked)} hint="Tournament-wide lock enabled" />
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/80 bg-muted/20">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-xl">Tournament Management</CardTitle>
                <CardDescription>Worklist view for rewards, champion-pick lifecycle, default selection, and tournament-wide locks.</CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void loadTournaments()} disabled={loading}>
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  onClick={() => {
                    setCreateForm(DEFAULT_CREATE_FORM);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New tournament
                </Button>
              </div>
            </div>

            <div className="grid gap-3 pt-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name, code, or description" className="pl-9" />
              </div>
              <select className={FIELD_CLASSNAME} value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value={ALL_OPTION}>All status</option>
                {TOURNAMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <DataTable
              data={visibleRows}
              columns={columns}
              isLoading={loading}
              onRowClick={(row) => navigate(`/admin/tournaments/${row.ID}`)}
              pagination={{
                page,
                pageSize: PAGE_SIZE,
                totalCount: filteredRows.length,
                hasNextPage: page < totalPages,
                onPageChange: setPage,
              }}
              variant="borderless"
              mobileRenderMode="card"
              showFooter
              emptyMessageKey="No tournaments found"
              className="rounded-none border-0 shadow-none"
            />
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        {selectedTournament ? (
          <TournamentDetailPanel
            tournament={selectedTournament}
            onChanged={async () => {
              await loadTournaments();
            }}
            onDeleted={async () => {
              await loadTournaments();
              navigate('/admin/tournaments');
            }}
          />
        ) : (
          <EmptySelectionPanel
            title="Open a tournament detail pane"
            description="Select a tournament row to edit reward settings, champion-pick workflow, default behavior, and audit context."
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create tournament</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Name</span>
              <Input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Start date</span>
                <Input type="date" value={createForm.startDate} onChange={(event) => setCreateForm((current) => ({ ...current, startDate: event.target.value }))} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">End date</span>
                <Input type="date" value={createForm.endDate} onChange={(event) => setCreateForm((current) => ({ ...current, endDate: event.target.value }))} />
              </label>
            </div>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Status</span>
              <select className={FIELD_CLASSNAME} value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value as AdminTournament['status'] }))}>
                {TOURNAMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Description</span>
              <textarea
                className="min-h-[96px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                value={createForm.description}
                onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Outcome reward</span>
                <Input value={createForm.outcomePrize} onChange={(event) => setCreateForm((current) => ({ ...current, outcomePrize: event.target.value }))} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Champion reward</span>
                <Input value={createForm.championPrizePool} onChange={(event) => setCreateForm((current) => ({ ...current, championPrizePool: event.target.value }))} />
              </label>
            </div>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Champion pick status</span>
              <select className={FIELD_CLASSNAME} value={createForm.championBettingStatus} onChange={(event) => setCreateForm((current) => ({ ...current, championBettingStatus: event.target.value as 'open' | 'locked' }))}>
                <option value="open">Open</option>
                <option value="locked">Locked</option>
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTournament} disabled={busy || !createForm.name || !createForm.startDate || !createForm.endDate}>
              Create tournament
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

