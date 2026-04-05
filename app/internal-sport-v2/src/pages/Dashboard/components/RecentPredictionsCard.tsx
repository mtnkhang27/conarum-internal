import React from "react";
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/services/core/axiosInstance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ScoreBetRow {
  betId?: string;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  isCorrect?: boolean | null;
}

interface RecentPredictionRow {
  predictionId: string;
  matchId?: string;
  tournament_ID?: string;
  tournamentName?: string | null;
  homeTeam?: string | null;
  homeFlag?: string | null;
  homeCrest?: string | null;
  awayTeam?: string | null;
  awayFlag?: string | null;
  awayCrest?: string | null;
  kickoff?: string | null;
  pick?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  pointsEarned?: number | null;
  isCorrect?: boolean | null;
  scoreBets?: ScoreBetRow[];
}

interface RecentPredictionsCardProps {
  tournamentId?: string;
  className?: string;
}

function escapeODataString(value: string) {
  return value.replace(/'/g, "''");
}

function formatKickoff(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function pickLabel(value?: string | null) {
  if (value === 'home') return '1';
  if (value === 'draw') return 'X';
  if (value === 'away') return '2';
  return '-';
}

function determineOutcome(homeScore?: number | null, awayScore?: number | null) {
  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') return undefined;
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}

function getPickToneClasses(tone: 'neutral' | 'correct' | 'incorrect') {
  if (tone === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (tone === 'incorrect') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-border bg-background text-foreground';
}

function getScoreCellToneClasses(tone: 'neutral' | 'correct' | 'incorrect') {
  if (tone === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (tone === 'incorrect') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-border bg-white text-foreground';
}

function TeamIcon({ crest, flag, name }: { crest?: string | null; flag?: string | null; name: string }) {
  const fallbackSrc = `https://flagcdn.com/24x18/${(flag || 'un').toLowerCase()}.png`;
  const defaultSrc = crest || fallbackSrc;

  return (
    <img
      src={defaultSrc}
      alt={name}
      className="h-10 w-16 rounded-sm border bg-background object-contain p-0.5 shadow-sm"
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
}

function renderScorePick(scoreBet: ScoreBetRow, hasResult: boolean) {
  const tone: 'neutral' | 'correct' | 'incorrect' =
    scoreBet.isCorrect === true ? 'correct' : scoreBet.isCorrect === false ? 'incorrect' : 'neutral';

  return (
    <div key={scoreBet.betId || `${scoreBet.predictedHomeScore}-${scoreBet.predictedAwayScore}`} className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex h-10 w-[52px] items-center justify-center rounded-md border text-sm font-bold',
          getScoreCellToneClasses(hasResult ? tone : 'neutral')
        )}
      >
        {typeof scoreBet.predictedHomeScore === 'number' ? scoreBet.predictedHomeScore : '-'}
      </span>
      <span className="text-sm font-bold text-muted-foreground">:</span>
      <span
        className={cn(
          'inline-flex h-10 w-[52px] items-center justify-center rounded-md border text-sm font-bold',
          getScoreCellToneClasses(hasResult ? tone : 'neutral')
        )}
      >
        {typeof scoreBet.predictedAwayScore === 'number' ? scoreBet.predictedAwayScore : '-'}
      </span>
    </div>
  );
}

export function RecentPredictionsCard({ tournamentId, className }: RecentPredictionsCardProps) {
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ['recentPredictions', tournamentId],
    queryFn: async () => {
      const filter = tournamentId
        ? `$filter=${encodeURIComponent(`tournament_ID eq '${escapeODataString(tournamentId)}'`)}&`
        : '';

      const response = await axiosInstance.get(
        `/api/player/RecentPredictionsView?${filter}$expand=scoreBets($select=betId,matchId,predictedHomeScore,predictedAwayScore,status,isCorrect)&$orderby=submittedAt desc&$top=20`
      );

      return (response.data?.value || response.data || []) as RecentPredictionRow[];
    },
  });

  return (
    <Card className={cn('flex h-full w-full flex-col overflow-hidden border-muted/60 bg-card shadow-sm', className)}>
      <CardHeader className="border-b bg-muted/10 px-6 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Trophy className="h-5 w-5 text-primary" />
          {t("predictionDashboard.recentPredictions", "Recent Predictions")}
        </CardTitle>
        <CardDescription>
          {t(
            "predictionDashboard.recentPredictionsSubtitle",
            "Review your latest submitted and locked predictions."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-destructive">
            {t('predictionDashboard.loadError', 'Failed to load data.')}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <Trophy className="h-8 w-8 text-border" />
            <p>{t("predictionDashboard.noPredictionsYet", "No predictions available.")}</p>
          </div>
        ) : (
          <div className="scrollbar-hidden min-h-0 flex-1 overflow-auto">
            <Table className="w-full min-w-[980px] table-auto">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky top-0 z-10 min-w-[150px] bg-card px-4 py-3">{t('predictionDashboard.columns.dateStage', 'Date')}</TableHead>
                  <TableHead className="sticky top-0 z-10 min-w-[170px] bg-card px-4 py-3">{t('predictionDashboard.columns.tournament', 'Tournament')}</TableHead>
                  <TableHead className="sticky top-0 z-10 min-w-[260px] bg-card px-4 py-3">{t('predictionDashboard.columns.teams')}</TableHead>
                  <TableHead className="sticky top-0 z-10 min-w-[200px] bg-card px-4 py-3 text-center">{t('predictionDashboard.columns.scorePick')}</TableHead>
                  <TableHead className="sticky top-0 z-10 min-w-[150px] bg-card px-4 py-3 text-center">{t('predictionDashboard.columns.wdlPick')}</TableHead>
                  <TableHead className="sticky top-0 z-10 min-w-[150px] bg-card px-4 py-3 text-center">{t('predictionDashboard.points', 'Points')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const actualOutcome = determineOutcome(item.homeScore, item.awayScore);
                  const outcomeTone: 'neutral' | 'correct' | 'incorrect' =
                    item.pick && actualOutcome
                      ? actualOutcome === item.pick
                        ? 'correct'
                        : 'incorrect'
                      : 'neutral';
                  const visibleScoreBets = (item.scoreBets || []).filter(
                    (scoreBet) =>
                      typeof scoreBet.predictedHomeScore === 'number' &&
                      typeof scoreBet.predictedAwayScore === 'number'
                  );
                  const hasResult =
                    typeof item.homeScore === 'number' && typeof item.awayScore === 'number';

                  return (
                    <TableRow key={item.predictionId} className="align-top">
                      <TableCell className="px-4 py-4 align-top whitespace-normal">
                        <span className="text-sm font-medium text-foreground">
                          {formatKickoff(item.kickoff)}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-4 align-top whitespace-normal">
                        <span className="text-sm font-medium text-foreground">
                          {item.tournamentName || '-'}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-4 align-top whitespace-normal">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <TeamIcon crest={item.homeCrest} flag={item.homeFlag} name={item.homeTeam || 'TBD'} />
                            <span className="text-sm font-medium text-foreground">{item.homeTeam || 'TBD'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TeamIcon crest={item.awayCrest} flag={item.awayFlag} name={item.awayTeam || 'TBD'} />
                            <span className="text-sm font-medium text-foreground">{item.awayTeam || 'TBD'}</span>
                          </div>
                          {hasResult && (
                            <span className="inline-flex w-fit rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-semibold text-foreground">
                              {item.homeScore} - {item.awayScore}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-4 align-top whitespace-normal text-center">
                        {visibleScoreBets.length > 0 ? (
                          <div className="scrollbar-hidden flex justify-center overflow-x-auto overflow-y-hidden pb-1">
                            <div className="inline-flex min-w-[132px] flex-col items-center gap-1.5">
                              {visibleScoreBets.map((scoreBet) => renderScorePick(scoreBet, hasResult))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-4 align-top whitespace-normal text-center">
                        <div className="flex justify-center">
                          <span
                            className={cn(
                              'inline-flex min-w-10 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-semibold',
                              getPickToneClasses(outcomeTone)
                            )}
                          >
                            {pickLabel(item.pick)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-4 align-top whitespace-normal text-center">
                        <div className="flex justify-center">
                          <Badge
                            className={cn(
                              'min-w-16 justify-center',
                              item.isCorrect === true
                                ? 'bg-emerald-600'
                                : item.isCorrect === false
                                  ? 'border border-amber-300 bg-amber-50 text-amber-700'
                                  : 'bg-muted text-foreground'
                            )}
                          >
                            {typeof item.pointsEarned === 'number'
                              ? `${item.pointsEarned} ${t('predictionDashboard.points', 'pts')}`
                              : t('predictionDashboard.pending', 'Pending')}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
