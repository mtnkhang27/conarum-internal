import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Trophy,
  Target,
} from "lucide-react";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { playerTournamentQueryApi } from "@/services/playerApi";
import type { RecentPredictionItem, ScoreBetDetail } from "@/types";
import { formatLocalDateTime } from "@/utils/localTime";

const ITEMS_PER_PAGE = 3;
type PaginationItem = number | "dots-left" | "dots-right";

// ─── Helpers ──────────────────────────────────────────────────

function pickLabel(pick: string, t: (key: string) => string): string {
  if (pick === "home") return t("sport.picks.homeWin");
  if (pick === "away") return t("sport.picks.awayWin");
  if (pick === "draw") return t("sport.picks.draw");
  return pick;
}

function statusBadge(item: RecentPredictionItem, t: (key: string) => string) {
  if (item.status === "scored") {
    if (item.isCorrect) {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-success/40 bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
          <CheckCircle2 className="h-3 w-3" />
          {t("sport.status.correct")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
        <XCircle className="h-3 w-3" />
        {t("sport.status.wrong")}
      </span>
    );
  }
  if (item.status === "locked") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
        <MinusCircle className="h-3 w-3" />
        {t("sport.status.locked")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
      <Clock className="h-3 w-3" />
      {t("sport.status.pending")}
    </span>
  );
}

function scoreBetBadge(bet: ScoreBetDetail, t: (key: string) => string) {
  if (bet.status === "settled" || bet.isCorrect !== null) {
    if (bet.isCorrect) {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-success/40 bg-success/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
          <CheckCircle2 className="h-3 w-3" />
          {t("sport.status.hit")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
        <XCircle className="h-3 w-3" />
        {t("sport.status.miss")}
      </span>
    );
  }
  if (bet.status === "locked") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
        <MinusCircle className="h-3 w-3" />
        {t("sport.status.locked")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
      <Clock className="h-3 w-3" />
      {t("sport.status.pending")}
    </span>
  );
}

function formatDate(iso: string): string {
  return formatLocalDateTime(iso, {
    locale: "en-US",
    dateOptions: {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
    timeOptions: { hour: "numeric", minute: "2-digit", hour12: false },
  });
}

// ─── Score Bets sub-section ───────────────────────────────────

function ScoreBetsSection({
  bets,
  finalScore,
  t,
}: {
  bets: ScoreBetDetail[];
  finalScore: { home: number | null; away: number | null };
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (bets.length === 0) return null;

  const correctCount = bets.filter((b) => b.isCorrect === true).length;

  return (
    <div className="mt-3 rounded-md border border-border/60 bg-surface/40 px-3 py-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Target className="h-3 w-3" />
          {t("sport.scorePredictions", { count: bets.length })}
        </p>
        {bets.some((b) => b.isCorrect !== null) && (
          <p className="text-[10px] font-bold text-muted-foreground">
            <span
              className={
                correctCount > 0 ? "text-success" : "text-foreground/50"
              }
            >
              {correctCount}/{bets.filter((b) => b.isCorrect !== null).length}{" "}
              {t("sport.status.correct").toLowerCase()}
            </span>
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        {bets.map((bet) => (
          <div
            key={bet.betId}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <span className="rounded border border-border bg-surface-dark px-2 py-0.5 font-mono text-xs font-bold text-white">
                {bet.predictedHomeScore} – {bet.predictedAwayScore}
              </span>
              {finalScore.home !== null && finalScore.away !== null && (
                <span className="text-[10px] text-muted-foreground">
                  {t("sport.vsFinal")}{" "}
                  <span className="font-bold text-foreground/70">
                    {finalScore.home}–{finalScore.away}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {scoreBetBadge(bet, t)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────

interface RecentPredictionsSectionProps {
  tournamentId: string;
  enabled?: boolean;
  refreshKey?: number;
}

export function RecentPredictionsSection({
  tournamentId,
  enabled = true,
  refreshKey = 0,
}: RecentPredictionsSectionProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [predictions, setPredictions] = useState<RecentPredictionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestSequence = useRef(0);

  const loadPage = useCallback(async (tid: string, nextPage: number) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const { items, totalCount: count } =
        await playerTournamentQueryApi.getMyRecentPredictionsPaged(
          tid || undefined,
          nextPage,
          ITEMS_PER_PAGE,
        );
      if (requestSequence.current !== requestId) return;
      setPredictions(Array.isArray(items) ? items : []);
      setTotalCount(count);
    } catch {
      if (requestSequence.current !== requestId) return;
      setPredictions([]);
      setTotalCount(0);
    } finally {
      if (requestSequence.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setPage(1);
    setPredictions([]);
    setTotalCount(0);
    void loadPage(tournamentId, 1);
  }, [enabled, tournamentId, refreshKey, loadPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const safePage = Math.min(totalPages, Math.max(1, nextPage));
      setPage(safePage);
      void loadPage(tournamentId, safePage);
    },
    [loadPage, totalPages, tournamentId],
  );

  const total = totalCount;
  const correct = predictions.filter((p) => p.isCorrect === true).length;
  const pending = predictions.filter(
    (p) => p.status === "submitted" || p.status === "locked",
  ).length;
  const accuracy =
    predictions.length > 0
      ? Math.round((correct / Math.max(predictions.length - pending, 1)) * 100)
      : 0;

  const allScoreBets = predictions.flatMap((p) => p.scoreBets ?? []);
  const settledBets = allScoreBets.filter((b) => b.isCorrect !== null);
  const correctBets = allScoreBets.filter((b) => b.isCorrect === true);

  const grouped = useMemo(
    () =>
      predictions.reduce<Record<string, RecentPredictionItem[]>>((acc, p) => {
        const key = p.tournamentName || t("sport.unknownTournament");
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      }, {}),
    [predictions, t],
  );

  const paginationItems = useMemo<PaginationItem[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "dots-right", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "dots-left",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "dots-left",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "dots-right",
      totalPages,
    ];
  }, [currentPage, totalPages]);

  if (!enabled || (loading && predictions.length === 0)) {
    return <LoadingOverlay />;
  }

  return (
    <div className="relative">
      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("common.total"), value: total, color: "text-white" },
          {
            label: t("sport.correctPicks"),
            value: correct,
            color: "text-success",
          },
          {
            label: t("sport.status.pending"),
            value: pending,
            color: "text-primary",
          },
          {
            label: t("sport.pickAccuracy"),
            value: `${accuracy}%`,
            color: "text-secondary",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-primary/30"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <p className={`mt-1 text-2xl font-extrabold ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Score bet stats strip (only if player has any score bets) */}
      {allScoreBets.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              label: t("sport.scoreBets"),
              value: allScoreBets.length,
              color: "text-white",
            },
            {
              label: t("sport.correctScores"),
              value: correctBets.length,
              color: "text-success",
            },
            {
              label: t("sport.scoreAccuracy"),
              value:
                settledBets.length > 0
                  ? `${Math.round((correctBets.length / settledBets.length) * 100)}%`
                  : "—",
              color: "text-secondary",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-secondary/30"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <p className={`mt-1 text-2xl font-extrabold ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {predictions.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Trophy className="h-10 w-10 text-border" />
          <p className="text-sm">{t("sport.noPredictionsYet")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([tournamentName, items]) => (
            <div key={tournamentName}>
              {/* Tournament header */}
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
                  {tournamentName}
                </h3>
                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {items.length}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.predictionId}
                    className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      {/* Match info */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                            {item.homeCrest ? (
                              <img
                                src={item.homeCrest}
                                alt={item.homeTeam}
                                className="h-4 w-4 object-contain"
                              />
                            ) : (
                              item.homeFlag && (
                                <span
                                  className={`fi fi-${item.homeFlag} rounded-sm`}
                                />
                              )
                            )}
                            {item.homeTeam ? item.homeTeam : t("common.tbd")}
                          </span>
                          {item.homeScore !== null &&
                          item.awayScore !== null ? (
                            <span className="rounded border border-border bg-surface-dark px-2 py-0.5 font-mono text-xs font-bold text-success">
                              {item.homeScore} – {item.awayScore}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-muted-foreground">
                              {t("common.vs")}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                            {item.awayCrest ? (
                              <img
                                src={item.awayCrest}
                                alt={item.awayTeam}
                                className="h-4 w-4 object-contain"
                              />
                            ) : (
                              item.awayFlag && (
                                <span
                                  className={`fi fi-${item.awayFlag} rounded-sm`}
                                />
                              )
                            )}
                            {item.awayTeam ? item.awayTeam : t("common.tbd")}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {t("sport.kickoffLabel")}: {formatDate(item.kickoff)}
                        </p>

                        {/* Score bets */}
                        <ScoreBetsSection
                          bets={item.scoreBets ?? []}
                          finalScore={{
                            home: item.homeScore,
                            away: item.awayScore,
                          }}
                          t={t}
                        />
                      </div>

                      {/* Prediction details */}
                      <div className="flex flex-wrap items-center gap-4 sm:flex-shrink-0 sm:justify-end">
                        <div className="min-w-[110px] text-left sm:text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("sport.yourPick")}
                          </p>
                          <p className="text-sm font-bold text-primary">
                            {pickLabel(item.pick, t)}
                          </p>
                        </div>
                        <div className="min-w-[72px] text-left sm:text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("sport.points")}
                          </p>
                          <p
                            className={`text-sm font-extrabold ${
                              item.pointsEarned > 0
                                ? "text-success"
                                : "text-foreground/60"
                            }`}
                          >
                            {item.pointsEarned > 0
                              ? `+${item.pointsEarned}`
                              : "0"}
                          </p>
                        </div>
                        <div>{statusBadge(item, t)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] font-semibold text-muted-foreground">
                {t("common.total")}: {totalCount}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Previous page"
                >
                  {t("common.previous")}
                </button>

                <div className="inline-flex items-center rounded-md border border-border bg-surface-dark/85 p-1">
                  {paginationItems.map((item) => {
                    if (item === "dots-left" || item === "dots-right") {
                      return (
                        <span
                          key={item}
                          className="inline-flex h-7 min-w-7 items-center justify-center px-1 text-xs font-semibold text-muted-foreground"
                        >
                          ...
                        </span>
                      );
                    }

                    const isActive = item === currentPage;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handlePageChange(item)}
                        disabled={loading}
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-2 text-xs font-semibold transition-colors ${
                          isActive
                            ? "bg-primary text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
                            : "text-foreground/80 hover:bg-surface hover:text-primary"
                        }`}
                        aria-label={`Go to page ${item}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="inline-flex h-9 items-center rounded-md border border-border bg-surface-dark px-3 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Next page"
                >
                  {t("common.next")}
                </button>

                <div className="ml-1 text-[11px] font-semibold text-muted-foreground">
                  {t("common.page", {
                    current: currentPage,
                    total: totalPages,
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && predictions.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
