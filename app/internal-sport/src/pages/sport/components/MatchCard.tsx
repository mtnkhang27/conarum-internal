import { useEffect, useState, type FocusEvent, type PointerEvent } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Match } from "@/types";
import { playerActionsApi } from "@/services/playerApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PickKey = "" | "home" | "draw" | "away";
const MAX_SCORE = 99;

function clampScore(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (digits === "") return 0;
  const parsed = parseInt(digits, 10);
  if (isNaN(parsed)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, parsed));
}

function selectScoreValue(input: HTMLInputElement) {
  requestAnimationFrame(() => {
    input.select();
  });
}

function normalizePick(
  option: string | undefined,
  homeName: string,
  awayName: string,
): PickKey {
  if (!option) return "";
  if (option === "home" || option === "away" || option === "draw")
    return option;
  if (option === "Draw") return "draw";
  if (option === homeName) return "home";
  if (option === awayName) return "away";
  return "";
}

function optionKeyAt(index: number): PickKey {
  if (index === 0) return "home";
  if (index === 1) return "draw";
  if (index === 2) return "away";
  return "";
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) return error.message;
  return undefined;
}

interface MatchCardProps {
  match: Match;
  isCompleted?: boolean;
  onPredictionChange?: () => void | Promise<void>;
}

export function MatchCard({
  match,
  isCompleted = false,
  onPredictionChange,
}: MatchCardProps) {
  const { t } = useTranslation();
  const maxBets = match.maxBets ?? 3;
  const isSlotBet = match.betTarget === "slot";
  const slotId = match.slotId || match.id;
  const [initialOption, setInitialOption] = useState<PickKey>(
    normalizePick(match.selectedOption, match.home.name, match.away.name),
  );
  const [selectedOption, setSelectedOption] = useState<PickKey>(
    normalizePick(match.selectedOption, match.home.name, match.away.name),
  );
  const [scores, setScores] = useState<{ home: number; away: number }[]>(() => {
    const existing = match.existingScores || [];
    return Array.from(
      { length: maxBets },
      (_, i) => existing[i] || { home: 0, away: 0 },
    );
  });
  const [initialScores, setInitialScores] = useState<
    { home: number; away: number }[]
  >(() => {
    const existing = match.existingScores || [];
    return Array.from(
      { length: maxBets },
      (_, i) => existing[i] || { home: 0, away: 0 },
    );
  });
  const [isSaving, setIsSaving] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    const normalized = normalizePick(
      match.selectedOption,
      match.home.name,
      match.away.name,
    );
    setSelectedOption(normalized);
    setInitialOption(normalized);
  }, [match.selectedOption, match.home.name, match.away.name]);

  useEffect(() => {
    const existing = match.existingScores || [];
    const newScores = Array.from(
      { length: maxBets },
      (_, i) => existing[i] || { home: 0, away: 0 },
    );
    setScores(newScores);
    setInitialScores(newScores);
  }, [match.existingScores, maxBets]);

  const hasExistingPrediction = !!initialOption;
  const hasCurrentSelection = !!selectedOption;
  const hasChanges =
    selectedOption !== initialOption ||
    JSON.stringify(scores) !== JSON.stringify(initialScores);
  const isIdle = !hasExistingPrediction && !hasCurrentSelection && !hasChanges;
  const cancelDisabled = isSaving || isIdle;
  const submitDisabled = isSaving || !hasCurrentSelection;

  const onPickOption = (option: PickKey) => {
    if (isCompleted || isSaving) return;
    setSelectedOption((prev) => (prev === option ? "" : option));
  };

  const onScoreChange = (
    rowIdx: number,
    side: "home" | "away",
    value: string,
  ) => {
    if (isCompleted || isSaving) return;
    setScores((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [side]: clampScore(value) };
      return next;
    });
  };

  const onScoreFocus = (event: FocusEvent<HTMLInputElement>) => {
    selectScoreValue(event.currentTarget);
  };

  const onScorePointerUp = (event: PointerEvent<HTMLInputElement>) => {
    event.preventDefault();
    selectScoreValue(event.currentTarget);
  };

  const onCancel = () => {
    if (isCompleted || isSaving) return;
    if (hasExistingPrediction) {
      setCancelConfirmOpen(true);
    } else {
      setSelectedOption("");
      setScores(Array.from({ length: maxBets }, () => ({ home: 0, away: 0 })));
    }
  };

  const onConfirmCancelPrediction = async () => {
    setCancelConfirmOpen(false);
    setIsSaving(true);
    try {
      const res = isSlotBet
        ? await playerActionsApi.cancelSlotPrediction(slotId)
        : await playerActionsApi.cancelMatchPrediction(match.id);
      toast.success(t("matchCard.predictionRemoved"), {
        description:
          res.message ||
          t("matchCard.predictionRemovedDesc", {
            home: match.home.name,
            away: match.away.name,
          }),
      });
      setSelectedOption("");
      setInitialOption("");
      const emptyScores = Array.from({ length: maxBets }, () => ({
        home: 0,
        away: 0,
      }));
      setScores(emptyScores);
      setInitialScores(emptyScores);
      await onPredictionChange?.();
    } catch (error: unknown) {
      toast.error(t("matchCard.failedToRemove"), {
        description: getErrorMessage(error) || t("matchCard.pleaseTryAgain"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async () => {
    if (isCompleted || isSaving || !hasCurrentSelection) return;
    setIsSaving(true);
    const apiPick = selectedOption;
    try {
      const scoresToSend = match.scoreBettingEnabled
        ? scores.map((s) => ({ homeScore: s.home, awayScore: s.away }))
        : [];
      const res = isSlotBet
        ? await playerActionsApi.submitSlotPrediction(
            slotId,
            apiPick,
            scoresToSend,
          )
        : await playerActionsApi.submitMatchPrediction(
            match.id,
            apiPick,
            scoresToSend,
          );
      toast.success(t("matchCard.predictionSaved"), {
        description:
          res.message ||
          t("matchCard.predictionSavedDesc", {
            home: match.home.name,
            away: match.away.name,
          }),
      });
      setInitialOption(selectedOption);
      setInitialScores([...scores]);
      await onPredictionChange?.();
    } catch (error: unknown) {
      toast.error(t("matchCard.failedToSave"), {
        description: getErrorMessage(error) || t("matchCard.pleaseTryAgain"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Team logo/flag render helper ── */
  const renderTeamBadge = (team: Match["home"], size: "lg" | "sm" = "lg") => {
    const dim = size === "lg" ? "h-12 w-12" : "h-8 w-8";
    if (team.crest) {
      return (
        <img
          src={team.crest}
          alt={team.name}
          className={`${dim} object-contain drop-shadow-lg`}
        />
      );
    }
    if (team.flag) {
      return (
        <span
          className={`fi fi-${team.flag} ${size === "lg" ? "!w-12 text-4xl" : "!w-8 text-2xl"} rounded-sm shadow-md`}
        />
      );
    }
    return (
      <span
        className={`inline-flex ${dim} items-center justify-center rounded-full bg-white/5 border border-white/10 text-xs font-black text-muted-foreground`}
      >
        ?
      </span>
    );
  };

  /* ── Pick button helper ── */
  const renderPickButton = (optionKey: PickKey, label: string) => {
    const isSelected = selectedOption === optionKey;
    const isDraw = optionKey === "draw";
    const displayLabel =
      optionKey === "home"
        ? match.home.name
        : optionKey === "away"
          ? match.away.name
          : label;

    return (
      <button
        type="button"
        onClick={() => onPickOption(optionKey)}
        disabled={isSaving || isCompleted || !optionKey}
        className={`
                    mc-pick-btn relative flex h-full min-h-[72px] w-full items-center justify-center overflow-visible rounded-xl px-3 py-2.5 text-xs font-bold
                    transition-all duration-200 ease-out
                    disabled:pointer-events-none disabled:opacity-50
                    ${
                      isSelected
                        ? isDraw
                          ? "mc-pick-selected-draw bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border-2 border-amber-400/60 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                          : "mc-pick-selected bg-gradient-to-br from-primary/30 to-secondary/20 border-2 border-primary text-white shadow-[0_0_20px_rgba(109,63,199,0.4)]"
                        : "border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:border-white/20 hover:text-white/90"
                    }
                `}
      >
        {isSelected && (
          <span
            className={`mc-pick-check absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold shadow-lg ring-2 ring-card ${
              isDraw ? "bg-amber-400 text-[#2f2300]" : "bg-primary text-white"
            }`}
          >
            ✓
          </span>
        )}
        <span className="relative z-[1] flex w-full items-center justify-center text-center leading-tight whitespace-normal break-words">
          {displayLabel}
        </span>
      </button>
    );
  };

  return (
    <>
      <div
        className={`mc-card group relative rounded-2xl border transition-all duration-300 overflow-hidden
                ${
                  hasCurrentSelection
                    ? "border-primary/50 shadow-[0_4px_30px_rgba(109,63,199,0.15)]"
                    : "border-white/[0.08] hover:border-white/[0.15] hover:shadow-lg"
                }
            `}
      >
        {/* Saving overlay */}
        {isSaving && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/60 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <span className="text-xs font-bold text-primary animate-pulse">
              {t("common.saving")}
            </span>
          </div>
        )}

        {/* Card header — points + stage + time */}
        <div className="mc-header flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="mc-pts-badge inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/25">
              {/* <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg> */}
              {match.outcomePoints} {t("common.pts")}
            </span>
            {match.stage && (
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/60">
                {match.stage}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wider text-white/40">
            {match.timeLabel}
          </span>
        </div>

        {/* ── Team matchup section ── */}
        <div className="mc-matchup relative px-5 py-4">
          <div className="flex items-center justify-between">
            {/* Home team */}
            <div className="mc-team flex flex-col items-center gap-2 w-[90px]">
              <div className="mc-team-badge relative z-10 overflow-visible">
                {renderTeamBadge(match.home)}
                {selectedOption === "home" && (
                  <span className="mc-winner-dot absolute -bottom-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white shadow-lg ring-2 ring-card">
                    ✓
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-white/90 text-center leading-tight">
                {match.home.name}
              </span>
            </div>

            {/* Score section */}
            <div className="mc-scores flex flex-col items-center gap-1.5 flex-1 mx-3">
              {match.scoreBettingEnabled ? (
                scores.map((row, i) => (
                  <div
                    key={i}
                    className="mc-score-row flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      min={0}
                      max={MAX_SCORE}
                      maxLength={2}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.home}
                      onChange={(e) => onScoreChange(i, "home", e.target.value)}
                      onFocus={onScoreFocus}
                      onPointerUp={onScorePointerUp}
                      disabled={isCompleted || isSaving}
                      className="mc-score-input h-9 w-11 rounded-lg border border-white/10 bg-white/[0.06] text-center text-sm font-bold text-white outline-none transition-all focus:border-primary focus:bg-primary/10 focus:ring-1 focus:ring-primary/30 disabled:opacity-40"
                    />
                    <span className="text-white/25 text-sm font-bold select-none">
                      :
                    </span>
                    <input
                      type="text"
                      min={0}
                      max={MAX_SCORE}
                      maxLength={2}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.away}
                      onChange={(e) => onScoreChange(i, "away", e.target.value)}
                      onFocus={onScoreFocus}
                      onPointerUp={onScorePointerUp}
                      disabled={isCompleted || isSaving}
                      className="mc-score-input h-9 w-11 rounded-lg border border-white/10 bg-white/[0.06] text-center text-sm font-bold text-white outline-none transition-all focus:border-primary focus:bg-primary/10 focus:ring-1 focus:ring-primary/30 disabled:opacity-40"
                    />
                  </div>
                ))
              ) : (
                <div className="mc-vs flex items-center justify-center">
                  <span className="text-lg font-black tracking-[0.25em] text-white/20 uppercase">
                    {t("common.vs")}
                  </span>
                </div>
              )}
            </div>

            {/* Away team */}
            <div className="mc-team flex flex-col items-center gap-2 w-[90px]">
              <div className="mc-team-badge relative z-10 overflow-visible">
                {renderTeamBadge(match.away)}
                {selectedOption === "away" && (
                  <span className="mc-winner-dot absolute -bottom-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white shadow-lg ring-2 ring-card">
                    ✓
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-white/90 text-center leading-tight">
                {match.away.name}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* ── Pick outcome section ── */}
        <div className="mc-actions px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
              {isCompleted
                ? t("matchCard.finalPick")
                : match.scoreBettingEnabled
                  ? t("matchCard.pickWinnerAndScore")
                  : t("matchCard.pickOutcome")}
            </span>
            {hasCurrentSelection && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>

          <div className="grid grid-cols-3 items-stretch gap-2">
            {match.options.map((option, idx) => {
              const optionKey = optionKeyAt(idx);
              return (
                <div key={`${option}-${idx}`} className="flex overflow-visible">
                  {renderPickButton(optionKey, option)}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          {!isCompleted && (
            <div className="mc-btn-row flex gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={cancelDisabled}
                className="mc-btn-cancel flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-white/40 transition-all hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 disabled:opacity-30 disabled:pointer-events-none"
              >
                {t("matchCard.cancelSubmission")}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitDisabled}
                className={`mc-btn-submit flex-1 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none
                                    ${
                                      hasCurrentSelection
                                        ? "bg-gradient-to-r from-primary to-secondary shadow-[0_4px_15px_rgba(109,63,199,0.4)] hover:shadow-[0_6px_25px_rgba(109,63,199,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                                        : "bg-white/[0.06] text-white/30"
                                    }`}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                    {t("common.saving")}
                  </span>
                ) : (
                  t("matchCard.submitPrediction")
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent className="border-white/10 bg-[#1e1e38]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("matchCard.removePrediction")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("matchCard.removePredictionDesc", {
                home: match.home.name,
                away: match.away.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-foreground hover:bg-white/10">
              {t("matchCard.keepPrediction")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmCancelPrediction}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("matchCard.yesRemove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
