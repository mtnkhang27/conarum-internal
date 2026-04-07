import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/services/core/axiosInstance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { getLandingTournamentId, type TournamentSelectionItem } from '../tournamentSelection';

interface TournamentItem extends TournamentSelectionItem {
  championBettingStatus?: 'open' | 'locked' | null;
}

interface ChampionPickerRow {
  ID: string;
  tournament_ID: string;
  tournamentStatus?: string | null;
  championBettingStatus?: 'open' | 'locked' | null;
  teamId?: string | null;
  teamName?: string | null;
  teamFlag?: string | null;
  teamCrest?: string | null;
  confederation?: string | null;
  selectedTeamId?: string | null;
  pickCount?: number;
}

interface ChampionTeamCard {
  id: string;
  name: string;
  crest?: string;
  flag: string;
  confederation: string;
  selected: boolean;
  pickCount: number;
}

interface TournamentChampionCardProps {
  tournamentId?: string;
  tournaments?: TournamentItem[];
  tournamentsLoading?: boolean;
  className?: string;
}

function escapeODataString(value: string) {
  return value.replace(/'/g, "''");
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
    ''
  );
}

export function TournamentChampionCard({
  tournamentId,
  tournaments = [],
  tournamentsLoading = false,
  className,
}: TournamentChampionCardProps) {
  const { t } = useTranslation();
  const [submittingTeamId, setSubmittingTeamId] = useState<string | null>(null);

  const effectiveTournamentId = useMemo(() => {
    if (tournamentId) return tournamentId;
    return getLandingTournamentId(tournaments);
  }, [tournamentId, tournaments]);

  const effectiveTournamentName = useMemo(() => {
    return tournaments.find((item) => item.ID === effectiveTournamentId)?.name || '';
  }, [effectiveTournamentId, tournaments]);

  const pickerQuery = useQuery({
    queryKey: ['championPicker', effectiveTournamentId],
    enabled: Boolean(effectiveTournamentId),
    queryFn: async () => {
      const filter = encodeURIComponent(`tournament_ID eq '${escapeODataString(effectiveTournamentId)}'`);
      const response = await axiosInstance.get(
        `/api/player/ChampionPickerView?$filter=${filter}&$orderby=fifaRanking asc,teamName asc`
      );
      return (response.data?.value || response.data || []) as ChampionPickerRow[];
    },
  });

  const teams: ChampionTeamCard[] = useMemo(
    () =>
      (pickerQuery.data || []).map((row) => ({
        id: row.teamId || row.ID,
        name: row.teamName || 'TBD',
        crest: row.teamCrest || undefined,
        flag: (row.teamFlag || 'UN').toLowerCase(),
        confederation: row.confederation || '-',
        selected: Boolean(row.selectedTeamId),
        pickCount: Number(row.pickCount) || 0,
      })),
    [pickerQuery.data]
  );

  const isBettingClosed = useMemo(() => {
    const status = pickerQuery.data?.[0]?.tournamentStatus;
    const championStatus = pickerQuery.data?.[0]?.championBettingStatus;

    return championStatus === 'locked' || status === 'completed' || status === 'cancelled';
  }, [pickerQuery.data]);

  const submitChampionPick = async (teamId: string) => {
    if (!effectiveTournamentId || isBettingClosed) return;

    setSubmittingTeamId(teamId);
    try {
      await axiosInstance.post('/api/player/pickChampion', {
        teamId,
        tournamentId: effectiveTournamentId,
      });
      toast.success(t('predictionSlip.championSaved', 'Champion pick saved.'));
      await pickerQuery.refetch();
    } catch (error) {
      toast.error(
        getErrorMessage(error) || t('predictionDashboard.saveFailed', 'Failed to save prediction.')
      );
    } finally {
      setSubmittingTeamId(null);
    }
  };

  return (
    <Card className={cn('flex w-full flex-col border-muted/60 bg-card shadow-sm lg:h-full lg:overflow-hidden', className)}>
      {/* <CardHeader className="border-b bg-muted/10 px-5 py-4">
        <div className="flex flex-col gap-2">
          <div>
            <CardTitle className="text-xl font-bold">{t('champion.title', 'Tournament Champion')}</CardTitle>
            <CardDescription>{t('champion.subtitle', 'Select one team as your tournament winner.')}</CardDescription>
          </div>
        </div>

        {effectiveTournamentName && (
          <div className="inline-flex w-fit rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            {effectiveTournamentName}
          </div>
        )}

        {isBettingClosed && (
          <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-700">
            <Lock className="h-3.5 w-3.5" />
            {t('champion.bettingLocked', 'Champion betting locked')}
          </div>
        )}
      </CardHeader> */}

      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">
        {tournamentsLoading || pickerQuery.isLoading ? (
          <div className="flex h-full min-h-[220px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !teams.length ? (
          <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
            {t('champion.noPick', 'No team data available.')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {teams.map((team) => {
              const fallbackFlag = `https://flagcdn.com/24x18/${team.flag}.png`;

              return (
                <div
                  key={team.id}
                  className={cn(
                    'flex flex-col items-center rounded-xl border p-3 text-center',
                    team.selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border bg-background'
                  )}
                >
                  {team.crest ? (
                    <img src={team.crest} alt={team.name} className="mb-2 h-10 w-10 object-contain" />
                  ) : (
                    <img src={fallbackFlag} alt={team.name} className="mb-2 h-8 w-10 rounded border object-cover" />
                  )}

                  <p className="line-clamp-2 min-h-10 text-sm font-semibold text-foreground">{team.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{team.confederation}</p>

                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {t('champion.pickCount', { count: team.pickCount, defaultValue: '{{count}} picks' })}
                  </p>

                  <Button
                    type="button"
                    size="sm"
                    className="mt-3 w-full"
                    variant={team.selected ? 'default' : 'outline'}
                    disabled={isBettingClosed || submittingTeamId === team.id}
                    onClick={() => void submitChampionPick(team.id)}
                  >
                    {submittingTeamId === team.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : team.selected ? (
                      t('champion.yourPick', 'Your pick')
                    ) : (
                      t('champion.confirmSelection', 'Pick')
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
