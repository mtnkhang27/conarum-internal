import React from "react";
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/services/core/axiosInstance';
import { Loader2, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from '@/utils/cn';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  determineOutcome,
  getPickToneClasses,
  pickLabel,
  ScorePickBox,
  TeamFlag,
} from './PredictionTableShared';

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
  status?: string | null;
  pick?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  pointsEarned?: number | string | null;
  correctScoreBetCount?: number | string | null;
  scoreBetMaxBets?: number | string | null;
  scoreBetPrizeAmount?: number | string | null;
  scoreBetEarnedAmount?: number | string | null;
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

function parseNumericValue(value?: number | string | null) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatAmount(value?: number | null) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function renderScorePick(scoreBet: ScoreBetRow, hasResult: boolean) {
  const tone: 'neutral' | 'correct' | 'incorrect' =
    scoreBet.isCorrect === true ? 'correct' : scoreBet.isCorrect === false ? 'incorrect' : 'neutral';

  return (
    <div key={scoreBet.betId || `${scoreBet.predictedHomeScore}-${scoreBet.predictedAwayScore}`} className="inline-flex items-center gap-1.5">
      <ScorePickBox value={typeof scoreBet.predictedHomeScore === 'number' ? String(scoreBet.predictedHomeScore) : '-'} tone={hasResult ? tone : 'neutral'} />
      <span className="text-[11px] font-semibold text-muted-foreground">:</span>
      <ScorePickBox value={typeof scoreBet.predictedAwayScore === 'number' ? String(scoreBet.predictedAwayScore) : '-'} tone={hasResult ? tone : 'neutral'} />
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
    <div className={cn('min-h-0 h-full overflow-hidden rounded-xl border border-muted/60 bg-card', className)}>
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
          {t('predictionDashboard.loadError', 'Failed to load data.')}
        </div>
      ) : !data?.length ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
          <Trophy className="h-8 w-8 text-border" />
          <p>{t("predictionDashboard.noPredictionsYet", "No predictions available.")}</p>
        </div>
      ) : (
        <div className="scrollbar-hidden h-full overflow-auto">
          <Table className="w-full min-w-[980px] table-auto text-[12px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky top-0 z-10 min-w-[130px] bg-card px-3 py-2.5">{t('predictionDashboard.columns.dateStage', 'Date')}</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[220px] bg-card px-3 py-2.5">{t('predictionDashboard.columns.teams')}</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[160px] bg-card px-3 py-2.5 text-center">{t('predictionDashboard.columns.scorePick')}</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[110px] bg-card px-3 py-2.5 text-center">{t('predictionDashboard.columns.wdlPick', 'Outcome')}</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[110px] bg-card px-3 py-2.5 text-center">{t('predictionDashboard.columns.result', 'Result')}</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[150px] bg-card px-3 py-2.5 text-center">{t('predictionDashboard.columns.scorePickEarned', 'Score Pick Earned')}</TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[120px] bg-card px-3 py-2.5 text-center">{t('predictionDashboard.points', 'Points')}</TableHead>
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
                const isScored = item.status === 'scored' || hasResult;
                const pointsEarned = parseNumericValue(item.pointsEarned);
                const correctScoreBetCount = parseNumericValue(item.correctScoreBetCount);
                const scoreBetMaxBets = parseNumericValue(item.scoreBetMaxBets);
                const scoreBetPrizeAmount = parseNumericValue(item.scoreBetPrizeAmount);
                const scoreBetEarnedAmount = parseNumericValue(item.scoreBetEarnedAmount);
                const fallbackCorrectCount = visibleScoreBets.filter((scoreBet) => scoreBet.isCorrect === true).length;
                const resolvedCorrectCount = correctScoreBetCount ?? fallbackCorrectCount;
                const configuredScoreBetCount = scoreBetMaxBets !== null
                  ? Math.max(0, Math.trunc(scoreBetMaxBets))
                  : visibleScoreBets.length;
                const scoreBetSummary = scoreBetPrizeAmount !== null
                  ? `${formatAmount(scoreBetPrizeAmount)} / ${configuredScoreBetCount}`
                  : null;
                const earnedSummary = `${resolvedCorrectCount}/${visibleScoreBets.length} - ${formatAmount(scoreBetEarnedAmount ?? 0)}`;

                return (
                  <TableRow key={item.predictionId} className="align-top">
                    <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                      <span className="text-xs font-medium text-foreground">
                        {formatKickoff(item.kickoff)}
                      </span>
                    </TableCell>

                    <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <TeamFlag code={item.homeFlag} crest={item.homeCrest} name={item.homeTeam || 'TBD'} />
                          <span className="text-[12px] font-medium text-foreground">{item.homeTeam || 'TBD'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TeamFlag code={item.awayFlag} crest={item.awayCrest} name={item.awayTeam || 'TBD'} />
                          <span className="text-[12px] font-medium text-foreground">{item.awayTeam || 'TBD'}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                      {visibleScoreBets.length > 0 ? (
                        <div className="scrollbar-hidden flex justify-center overflow-x-auto overflow-y-hidden pb-1">
                          <div className="inline-flex min-w-[112px] flex-col items-center gap-1">
                            {visibleScoreBets.map((scoreBet) => renderScorePick(scoreBet, hasResult))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            'inline-flex h-8 w-9 items-center justify-center rounded-md border text-[11px] font-semibold',
                            getPickToneClasses(outcomeTone)
                          )}
                        >
                          {pickLabel(item.pick)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                      {hasResult ? (
                        <div className="inline-flex items-center gap-1.5">
                          <ScorePickBox value={String(item.homeScore)} tone={outcomeTone} />
                          <span className="text-[11px] font-semibold text-muted-foreground">:</span>
                          <ScorePickBox value={String(item.awayScore)} tone={outcomeTone} />
                        </div>
                      ) : (
                        <span className="inline-flex h-8 min-w-14 items-center justify-center rounded-md border px-2 text-[11px] font-semibold">
                          -
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                      <span className="text-xs font-medium text-foreground">
                        {scoreBetSummary
                          ? isScored
                            ? `${earnedSummary} (${scoreBetSummary})`
                            : `${t('predictionDashboard.pending', 'Pending')} (${scoreBetSummary})`
                          : isScored
                            ? earnedSummary
                            : t('predictionDashboard.pending', 'Pending')}
                      </span>
                    </TableCell>

                    <TableCell className="px-3 py-2.5 align-top whitespace-normal text-center">
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            'text-xs font-medium',
                            item.isCorrect === true
                              ? 'text-emerald-700'
                              : item.isCorrect === false
                                ? 'text-amber-700'
                                : 'text-muted-foreground'
                          )}
                        >
                          {isScored && pointsEarned !== null
                            ? `${pointsEarned.toFixed(2)} ${t('predictionDashboard.points', 'pts')}`
                            : t('predictionDashboard.pending', 'Pending')}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
