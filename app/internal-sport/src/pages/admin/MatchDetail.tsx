import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Save,
  Trophy,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Target,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  matchesApi,
  matchScoreBetConfigApi,
  predictionsApi,
  scoreBetsApi,
  teamsApi,
  bracketSlotsApi,
} from "@/services/adminApi";
import {
  formatLocalDate,
  formatLocalDateTimeInputValue,
  formatLocalTime,
  localDateTimeInputToIso,
} from "@/utils/localTime";
import type {
  AdminMatch,
  AdminTeam,
  MatchScoreBetConfig,
  AdminPredictionView,
  AdminScoreBetView,
  AdminBracketSlot,
} from "@/types/admin";

// ── Shared helpers ──────────────────────────────────────────

function ConfigRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 border-b border-border/30 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-white">{label}</h4>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="w-full sm:w-auto sm:flex-shrink-0">{children}</div>
    </div>
  );
}

function statusVariant(status: string) {
  switch (status) {
    case "upcoming":
      return "default" as const;
    case "live":
      return "destructive" as const;
    case "finished":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

const CO_FORMATTER = new Intl.NumberFormat("vi-VN");

function formatPrizeInput(value: unknown) {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;
  return CO_FORMATTER.format(Math.trunc(safeValue));
}

function sanitizePrizeInput(value: string) {
  return value.replace(/\D/g, "");
}

function formatPrizeDraft(value: string) {
  const sanitized = sanitizePrizeInput(value);
  if (!sanitized) return "";
  return CO_FORMATTER.format(Number.parseInt(sanitized, 10));
}

function normalizePrizeInput(value: string) {
  const sanitized = sanitizePrizeInput(value);
  if (!sanitized) return 0;

  const parsed = Number.parseInt(sanitized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const STAGES = [
  { value: "group", label: "admin.matchManagement.stages.group" },
  { value: "roundOf16", label: "admin.matchManagement.stages.roundOf16" },
  { value: "quarterFinal", label: "admin.matchManagement.stages.quarterFinal" },
  { value: "semiFinal", label: "admin.matchManagement.stages.semiFinal" },
  { value: "thirdPlace", label: "admin.matchManagement.stages.thirdPlace" },
  { value: "final", label: "admin.matchManagement.stages.final" },
  { value: "regular", label: "admin.matchManagement.stages.regular" },
  { value: "playoff", label: "admin.matchManagement.stages.playoff" },
  { value: "relegation", label: "admin.matchManagement.stages.relegation" },
];

const MATCH_STATUSES: { value: AdminMatch["status"]; label: string }[] = [
  { value: "upcoming", label: "common.status.upcoming" },
  { value: "live", label: "common.status.live" },
  { value: "finished", label: "common.status.finished" },
  { value: "cancelled", label: "common.status.cancelled" },
];

const DEFAULT_SCORE_BET_CONFIG: Omit<MatchScoreBetConfig, "ID" | "match_ID"> = {
  enabled: true,
  maxBets: 3,
  prize: 200000,
};

const predictionsCache = new Map<string, AdminPredictionView[]>();
const scoreBetsCache = new Map<string, AdminScoreBetView[]>();

// ── Tab type ────────────────────────────────────────────────

type Tab = "config" | "predictions" | "scoreBets" | "edit";

export function MatchDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [match, setMatch] = useState<AdminMatch | null>(null);
  const [scoreBetCfg, setScoreBetCfg] = useState<MatchScoreBetConfig | null>(null);
  const [scoreBetCfgExists, setScoreBetCfgExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>("config");

  // Config tab state
  const [outcomePoints, setOutcomePoints] = useState(1);
  const [isHotMatch, setIsHotMatch] = useState(false);
  const [sbCfg, setSbCfg] = useState(DEFAULT_SCORE_BET_CONFIG);
  const [prizeInput, setPrizeInput] = useState(() => formatPrizeInput(DEFAULT_SCORE_BET_CONFIG.prize));
  const [scoreBettingEnabled, setScoreBettingEnabled] = useState(false);

  // Predictions tab state
  const [predictions, setPredictions] = useState<AdminPredictionView[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [hasLoadedPredictions, setHasLoadedPredictions] = useState(false);

  // Score bets tab state
  const [scoreBets, setScoreBets] = useState<AdminScoreBetView[]>([]);
  const [loadingScoreBets, setLoadingScoreBets] = useState(false);
  const [hasLoadedScoreBets, setHasLoadedScoreBets] = useState(false);

  // Edit tab state
  const [allTeams, setAllTeams] = useState<AdminTeam[]>([]);
  const [editForm, setEditForm] = useState({
    homeTeam_ID: "",
    awayTeam_ID: "",
    kickoff: "",
    venue: "",
    stage: "group",
    status: "upcoming",
    matchday: "",
    isHotMatch: false,
  });

  // Enter result dialog
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultHome, setResultHome] = useState("");
  const [resultAway, setResultAway] = useState("");
  const [isCorrection, setIsCorrection] = useState(false);

  // Penalty dialog
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
  const [penHome, setPenHome] = useState("");
  const [penAway, setPenAway] = useState("");

  // Bracket slot (for penalty button logic)
  const [bracketSlot, setBracketSlot] = useState<AdminBracketSlot | null>(null);

  // ── Data loading ──────────────────────────────────────────

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const [m, cfg, t] = await Promise.all([
        matchesApi.get(matchId),
        matchScoreBetConfigApi.getByMatch(matchId),
        teamsApi.list(),
      ]);
      setMatch(m);
      setAllTeams(t);
      setOutcomePoints(Number(m.outcomePoints ?? 1));
      setIsHotMatch(!!m.isHotMatch);

      // Fetch bracket slot if linked
      if (m.bracketSlot_ID) {
        try {
          const slot = await bracketSlotsApi.get(m.bracketSlot_ID);
          setBracketSlot(slot);
        } catch {
          setBracketSlot(null);
        }
      } else {
        setBracketSlot(null);
      }

      // Populate edit form
      setEditForm({
        homeTeam_ID: m.homeTeam_ID || "",
        awayTeam_ID: m.awayTeam_ID || "",
        kickoff: formatLocalDateTimeInputValue(m.kickoff),
        venue: m.venue || "",
        stage: m.stage,
        status: m.status,
        matchday: m.matchday != null ? String(m.matchday) : "",
        isHotMatch: !!m.isHotMatch,
      });

      if (cfg) {
        setScoreBetCfg(cfg);
        setScoreBetCfgExists(true);
        setScoreBettingEnabled(true);
        setSbCfg({ enabled: cfg.enabled, maxBets: cfg.maxBets, prize: cfg.prize });
        setPrizeInput(formatPrizeInput(cfg.prize));
      } else {
        setScoreBetCfgExists(false);
        setScoreBettingEnabled(false);
        setSbCfg(DEFAULT_SCORE_BET_CONFIG);
        setPrizeInput(formatPrizeInput(DEFAULT_SCORE_BET_CONFIG.prize));
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const loadPredictions = useCallback(async (options?: { force?: boolean }) => {
    if (!matchId) return;

    if (!options?.force) {
      const cached = predictionsCache.get(matchId);
      if (cached) {
        setPredictions(cached);
        setHasLoadedPredictions(true);
        return;
      }
    }

    setLoadingPredictions(true);
    try {
      const data = await predictionsApi.listByMatch(matchId);
      setPredictions(data);
      predictionsCache.set(matchId, data);
      setHasLoadedPredictions(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingPredictions(false);
    }
  }, [matchId]);

  const loadScoreBets = useCallback(async (options?: { force?: boolean }) => {
    if (!matchId) return;

    if (!options?.force) {
      const cached = scoreBetsCache.get(matchId);
      if (cached) {
        setScoreBets(cached);
        setHasLoadedScoreBets(true);
        return;
      }
    }

    setLoadingScoreBets(true);
    try {
      const data = await scoreBetsApi.listByMatch(matchId);
      setScoreBets(data);
      scoreBetsCache.set(matchId, data);
      setHasLoadedScoreBets(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingScoreBets(false);
    }
  }, [matchId]);

  const loadTeams = useCallback(async () => {
    if (allTeams.length > 0) return;
    try {
      const t = await teamsApi.list();
      setAllTeams(t);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [allTeams.length]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!matchId) return;

    const cachedPredictions = predictionsCache.get(matchId);
    const cachedScoreBets = scoreBetsCache.get(matchId);

    setPredictions(cachedPredictions ?? []);
    setScoreBets(cachedScoreBets ?? []);
    setHasLoadedPredictions(Boolean(cachedPredictions));
    setHasLoadedScoreBets(Boolean(cachedScoreBets));

    if (!cachedPredictions) {
      void loadPredictions();
    }
    if (!cachedScoreBets) {
      void loadScoreBets();
    }
  }, [matchId, loadPredictions, loadScoreBets]);

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === "predictions" && !hasLoadedPredictions && !loadingPredictions) {
      void loadPredictions();
      return;
    }

    if (activeTab === "scoreBets" && !hasLoadedScoreBets && !loadingScoreBets) {
      void loadScoreBets();
      return;
    }

    if (activeTab === "edit") {
      void loadTeams();
    }
  }, [
    activeTab,
    hasLoadedPredictions,
    hasLoadedScoreBets,
    loadingPredictions,
    loadingScoreBets,
    loadPredictions,
    loadScoreBets,
    loadTeams,
  ]);

  // ── Save handlers ─────────────────────────────────────────

  async function handleSaveConfig() {
    if (!matchId || !match) return;
    setSaving(true);
    try {
      await matchesApi.update(matchId, { outcomePoints, isHotMatch } as Partial<AdminMatch>);
      if (scoreBettingEnabled) {
        if (scoreBetCfgExists && scoreBetCfg) {
          await matchScoreBetConfigApi.update(scoreBetCfg.ID, sbCfg);
        } else {
          const created = await matchScoreBetConfigApi.create({ match_ID: matchId, ...sbCfg });
          setScoreBetCfg(created);
          setScoreBetCfgExists(true);
        }
      } else if (scoreBetCfgExists && scoreBetCfg) {
        await matchScoreBetConfigApi.delete(scoreBetCfg.ID);
        setScoreBetCfgExists(false);
        setScoreBetCfg(null);
      }
      toast.success(t("admin.matchDetail.configSaved"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!matchId) return;
    setSaving(true);
    try {
      const nextStatus = editForm.status as AdminMatch["status"];
      const kickoffIso = localDateTimeInputToIso(editForm.kickoff);
      if (!kickoffIso) {
        toast.error("Invalid kickoff time");
        return;
      }
      const updatePayload: Partial<AdminMatch> = {
        homeTeam_ID: editForm.homeTeam_ID || null,
        awayTeam_ID: editForm.awayTeam_ID || null,
        kickoff: kickoffIso,
        venue: editForm.venue || null,
        stage: editForm.stage as AdminMatch["stage"],
        status: nextStatus,
        matchday: editForm.matchday ? parseInt(editForm.matchday) : null,
        isHotMatch: !!editForm.isHotMatch,
      };
      if (nextStatus === "live" && (match?.homeScore == null || match?.awayScore == null)) {
        updatePayload.homeScore = 0;
        updatePayload.awayScore = 0;
      }
      await matchesApi.update(matchId, updatePayload);
      toast.success(t("admin.matchManagement.matchUpdated"));
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEnterResult() {
    if (!matchId) return;
    try {
      const res = isCorrection
        ? await matchesApi.correctResult(matchId, parseInt(resultHome), parseInt(resultAway))
        : await matchesApi.enterResult(matchId, parseInt(resultHome), parseInt(resultAway));
      toast.success(res.message);
      setResultDialogOpen(false);
      predictionsCache.delete(matchId);
      scoreBetsCache.delete(matchId);
      load();
      // Refresh predictions/score bets since they got scored
      loadPredictions({ force: true });
      loadScoreBets({ force: true });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSetPenaltyWinner() {
    if (!match?.bracketSlot_ID) return;
    const h = parseInt(penHome);
    const a = parseInt(penAway);
    if (isNaN(h) || isNaN(a)) { toast.error(t("admin.matchManagement.invalidPenaltyScores")); return; }
    if (h === a) { toast.error(t("admin.matchManagement.penaltyScoresEqual")); return; }
    const winnerId = h > a ? match.homeTeam_ID : match.awayTeam_ID;
    if (!winnerId) { toast.error(t("admin.matchManagement.winnerNotResolved")); return; }
    try {
      const res = await matchesApi.setPenaltyWinner(match.bracketSlot_ID, winnerId, h, a);
      toast.success(res.message);
      setPenaltyDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // Show "Set Penalty Winner" button only when applicable:
  // Single-leg: this match is finished, score is level, no winner set
  // Two-leg: this is leg2, both legs done, aggregate is level, no winner set
  function computeShowPenaltyButton(): boolean {
    if (!match || !isFinished || !bracketSlot) return false;
    if (bracketSlot.winner_ID) return false;
    const isSingleLeg = !bracketSlot.leg2_ID;
    if (isSingleLeg) {
      // Use actual match score for single-leg (homeAgg may default to 0)
      const hs = match.homeScore ?? -1;
      const as_ = match.awayScore ?? -2;
      return hs >= 0 && hs === as_;
    }
    // Two-leg: only show on leg 2 when aggregate is level
    const isLeg2 = match.ID === bracketSlot.leg2_ID;
    if (!isLeg2) return false;
    return bracketSlot.homeAgg === bracketSlot.awayAgg;
  }

  if (loading || !match) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {t("admin.matchDetail.loadingDetails")}
      </div>
    );
  }

  const homeTeamId = match.homeTeam_ID ?? bracketSlot?.homeTeam_ID ?? null;
  const awayTeamId = match.awayTeam_ID ?? bracketSlot?.awayTeam_ID ?? null;
  const homeTeamResolved = match.homeTeam ?? allTeams.find((t) => t.ID === homeTeamId);
  const awayTeamResolved = match.awayTeam ?? allTeams.find((t) => t.ID === awayTeamId);
  const homeTeamName = homeTeamResolved?.name ?? "TBD";
  const awayTeamName = awayTeamResolved?.name ?? "TBD";
  const isFinished = match.status === "finished";
  const canEnterResult = match.status === "upcoming" || match.status === "live";
  const showPenaltyButton = computeShowPenaltyButton();

  // Prediction stats
  const homePicks = predictions.filter((p) => p.pick === "home");
  const drawPicks = predictions.filter((p) => p.pick === "draw");
  const awayPicks = predictions.filter((p) => p.pick === "away");
  const correctPredictions = predictions.filter((p) => p.isCorrect === true);
  const correctScoreBets = scoreBets.filter((sb) => sb.isCorrect === true);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "config", label: t("admin.matchDetail.configTab") },
    { key: "predictions", label: t("admin.matchDetail.predictionsTab"), count: predictions.length },
    { key: "scoreBets", label: t("admin.matchDetail.scoreBetsTab"), count: scoreBets.length },
    { key: "edit", label: t("admin.matchDetail.editTab") },
  ];

  return (
    <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate("/admin/matches")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
              {homeTeamResolved &&
                (homeTeamResolved.crest ? (
                  <img src={homeTeamResolved.crest} alt="" className="mr-2 inline h-6 w-6 object-contain align-middle" />
                ) : (
                  <span className={`fi fi-${homeTeamResolved.flagCode} mr-2`} />
                ))}
              {homeTeamName}
              <span className="mx-3 text-muted-foreground">{t("admin.matchDetail.vs")}</span>
              {awayTeamResolved &&
                (awayTeamResolved.crest ? (
                  <img src={awayTeamResolved.crest} alt="" className="mr-2 inline h-6 w-6 object-contain align-middle" />
                ) : (
                  <span className={`fi fi-${awayTeamResolved.flagCode} mr-2`} />
                ))}
              {awayTeamName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatLocalDate(match.kickoff, undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                {formatLocalTime(match.kickoff, undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZoneName: "short",
                })}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {match.venue}
                </span>
              )}
              <Badge variant={statusVariant(match.status)}>{match.status}</Badge>
              {match.tournament?.name && (
                <span className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  {match.tournament.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {canEnterResult && (
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => { setIsCorrection(false); setResultHome(""); setResultAway(""); setResultDialogOpen(true); }}>
              <Target className="mr-2 h-4 w-4" />
              {t("admin.matchManagement.enterResult")}
            </Button>
          )}
          {isFinished && (
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => { setIsCorrection(true); setResultHome(String(match.homeScore ?? "")); setResultAway(String(match.awayScore ?? "")); setResultDialogOpen(true); }}>
              <Edit className="mr-2 h-4 w-4" />
              {t("admin.matchManagement.correctResult")}
            </Button>
          )}
          {showPenaltyButton && (
            <Button className="w-full sm:w-auto border-amber-500/50 text-amber-400 hover:bg-amber-500/10" variant="outline" onClick={() => { setPenHome(""); setPenAway(""); setPenaltyDialogOpen(true); }}>
              {t("admin.matchManagement.penaltyShootout")}
            </Button>
          )}
        </div>
      </div>

      {/* Result banner */}
      {isFinished && (
        <Card className="border-border bg-card p-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center text-lg sm:flex-row sm:gap-6">
            <span className="font-bold text-white">{homeTeamName}</span>
            <span className="font-mono text-2xl font-bold text-primary">
              {match.homeScore} – {match.awayScore}
            </span>
            <span className="font-bold text-white">{awayTeamName}</span>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max gap-1 rounded-2xl border border-border bg-card/60 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(109,63,199,0.18)_inset]"
                  : "text-muted-foreground hover:bg-surface hover:text-white"
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span className="shrink-0 rounded-full bg-surface-dark px-1.5 py-0.5 text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Config ──────────────────────────────────────── */}
      {activeTab === "config" && (
        <Card className="border-border bg-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">{t("admin.matchDetail.bettingConfig")}</h3>
            <Button className="w-full sm:w-auto" size="sm" onClick={handleSaveConfig} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t("common.saving") : t("admin.matchDetail.saveConfig")}
            </Button>
          </div>
          <ConfigRow label={t("admin.matchDetail.pointsForCorrect")} description={t("admin.matchDetail.pointsForCorrectDesc")}>
            <Input
              type="number"
              step="0.5"
              min="0"
              className="w-20 text-right border-white"
              value={outcomePoints}
              onChange={(e) => setOutcomePoints(parseFloat(e.target.value) || 0)}
            />
          </ConfigRow>
          <ConfigRow label={t("admin.matchManagement.hotMatch")} description={t("admin.matchDetail.hotMatchDesc")}>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-white">
                <input
                  type="radio"
                  name="detail-config-hot-match"
                  checked={isHotMatch}
                  onChange={() => setIsHotMatch(true)}
                  className="h-4 w-4 accent-primary"
                />
                {t("common.hot")}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-white">
                <input
                  type="radio"
                  name="detail-config-hot-match"
                  checked={!isHotMatch}
                  onChange={() => setIsHotMatch(false)}
                  className="h-4 w-4 accent-primary"
                />
                {t("common.normal")}
              </label>
            </div>
          </ConfigRow>
          <ConfigRow label={t("admin.matchDetail.enableScoreBetting")} description={t("admin.matchDetail.enableScoreBettingDesc")}>
            <Checkbox
              checked={scoreBettingEnabled}
              onCheckedChange={(v) => setScoreBettingEnabled(!!v)}
              className="border-white"
            />
          </ConfigRow>
          {scoreBettingEnabled && (
            <>
              <ConfigRow label={t("admin.matchDetail.enabled")} description={t("admin.matchDetail.enabledDesc")}>
                <Checkbox
                  checked={sbCfg.enabled}
                  onCheckedChange={(v) => setSbCfg({ ...sbCfg, enabled: !!v })}
                  className="border-white"
                />
              </ConfigRow>
              <ConfigRow label={t("admin.matchDetail.maxBets")} description={t("admin.matchDetail.maxBetsDesc")}>
                <Input
                  type="number"
                  className="w-20 text-right border-white"
                  value={sbCfg.maxBets}
                  onChange={(e) => setSbCfg({ ...sbCfg, maxBets: parseInt(e.target.value) || 0 })}
                />
              </ConfigRow>
              <ConfigRow label={t("admin.matchDetail.prizeVND")} description={t("admin.matchDetail.prizeVNDDesc")}>
                <Input
                  type="text"
                  inputMode="numeric"
                  className="w-32 text-right border-white"
                  value={prizeInput}
                  onChange={(e) => {
                    const nextValue = sanitizePrizeInput(e.target.value);
                    setPrizeInput(formatPrizeDraft(nextValue));
                    setSbCfg({ ...sbCfg, prize: normalizePrizeInput(nextValue) });
                  }}
                  onBlur={() => setPrizeInput(formatPrizeInput(sbCfg.prize))}
                />
              </ConfigRow>
            </>
          )}
        </Card>
      )}

      {/* ── Tab: Predictions ─────────────────────────────────── */}
      {activeTab === "predictions" && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-white">{predictions.length}</p>
              <p className="text-[11px] text-muted-foreground">{t("admin.matchDetail.total")}</p>
            </Card>
            <Card className="border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-blue-400">{homePicks.length}</p>
              <p className="text-[11px] text-muted-foreground">{t("common.home")} ({homeTeamName})</p>
            </Card>
            <Card className="border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-yellow-400">{drawPicks.length}</p>
              <p className="text-[11px] text-muted-foreground">{t("admin.matchDetail.draw")}</p>
            </Card>
            <Card className="border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-red-400">{awayPicks.length}</p>
              <p className="text-[11px] text-muted-foreground">{t("common.away")} ({awayTeamName})</p>
            </Card>
          </div>
          {isFinished && correctPredictions.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              <strong>{correctPredictions.length}</strong> {t("admin.matchDetail.correctPrediction")}{correctPredictions.length !== 1 && "s"}
            </div>
          )}

          {loadingPredictions ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">{t("admin.matchDetail.loadingPredictions")}</div>
          ) : predictions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.matchDetail.noPredictions")}</p>
          ) : (
            <Card className="border-border bg-card">
              <div className="space-y-3 p-3 md:hidden">
                {predictions.map((p) => (
                  <div key={p.ID} className="rounded-xl border border-border/70 bg-surface/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {p.playerAvatar ? (
                          <img src={p.playerAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xs font-bold text-white">
                            {(p.playerName ?? p.player_ID).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate font-medium text-white">{p.playerName ?? p.player_ID}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("admin.matchDetail.points")}</p>
                        <p className="font-mono text-sm text-white">
                          {p.pointsEarned > 0 ? `+${p.pointsEarned}` : p.pointsEarned}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={p.pick === "home" ? "default" : p.pick === "draw" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {p.pick === "home" ? homeTeamName : p.pick === "away" ? awayTeamName : t("admin.matchDetail.draw")}
                      </Badge>
                      <span className="ml-auto">
                        {p.isCorrect === true && <CheckCircle2 className="inline h-4 w-4 text-green-400" />}
                        {p.isCorrect === false && <XCircle className="inline h-4 w-4 text-red-400" />}
                        {p.isCorrect == null && <span className="text-xs text-muted-foreground">-</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">{t("admin.matchDetail.player")}</th>
                    <th className="px-4 py-3">{t("admin.matchDetail.pick")}</th>
                    <th className="px-4 py-3">{t("admin.matchDetail.points")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.matchManagement.result")}</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.ID} className="border-b border-border/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {p.playerAvatar && (
                            <img src={p.playerAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                          )}
                          <span className="font-medium text-white">{p.playerName ?? p.player_ID}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={p.pick === "home" ? "default" : p.pick === "draw" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {p.pick === "home" ? homeTeamName : p.pick === "away" ? awayTeamName : t("admin.matchDetail.draw")}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {p.pointsEarned > 0 ? `+${p.pointsEarned}` : p.pointsEarned}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {p.isCorrect === true && <CheckCircle2 className="inline h-4 w-4 text-green-400" />}
                        {p.isCorrect === false && <XCircle className="inline h-4 w-4 text-red-400" />}
                        {p.isCorrect == null && <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Score Bets ───────────────────────────────────── */}
      {activeTab === "scoreBets" && (
        <div className="space-y-4">
          {isFinished && correctScoreBets.length > 0 && (
            <>
              <div>
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("admin.matchDetail.correctScoreBet")}
                  </div>
                  <div className="mt-3 text-3xl font-bold text-white">{correctScoreBets.length}</div>
                  <p className="mt-1 text-xs text-green-200/80">
                    Winning exact score bets for this match
                  </p>
                </div>

              </div>
            </>
          )}

          {loadingScoreBets ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">{t("admin.matchDetail.loadingScoreBets")}</div>
          ) : scoreBets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.matchDetail.noScoreBets")}</p>
          ) : (
            <Card className="border-border bg-card">
              <div className="space-y-3 p-3 md:hidden">
                {scoreBets.map((sb) => (
                  <div
                    key={sb.ID}
                    className={`rounded-xl border border-border/70 bg-surface/30 p-4 ${
                      sb.isCorrect === true ? "shadow-[0_0_0_1px_rgba(34,197,94,0.18)_inset]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {sb.playerAvatar ? (
                          <img src={sb.playerAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xs font-bold text-white">
                            {(sb.playerName ?? sb.player_ID).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate font-medium text-white">{sb.playerName ?? sb.player_ID}</span>
                      </div>
                      <span>
                        {sb.isCorrect === true && <CheckCircle2 className="inline h-4 w-4 text-green-400" />}
                        {sb.isCorrect === false && <XCircle className="inline h-4 w-4 text-red-400" />}
                        {sb.isCorrect == null && <span className="text-xs text-muted-foreground">-</span>}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {t("admin.matchDetail.predictedScore")}
                        </p>
                        <p className="mt-1 font-mono text-sm font-bold text-white">
                          {sb.predictedHomeScore} - {sb.predictedAwayScore}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{sb.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">{t("admin.matchDetail.player")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.matchDetail.predictedScore")}</th>
                    <th className="px-4 py-3">{t("admin.matchDetail.status")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.matchManagement.result")}</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreBets.map((sb) => (
                    <tr key={sb.ID} className={`border-b border-border/50 ${sb.isCorrect === true ? "bg-green-500/5" : ""}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {sb.playerAvatar && (
                            <img src={sb.playerAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                          )}
                          <span className="font-medium text-white">{sb.playerName ?? sb.player_ID}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-white">
                        {sb.predictedHomeScore} – {sb.predictedAwayScore}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">{sb.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {sb.isCorrect === true && <CheckCircle2 className="inline h-4 w-4 text-green-400" />}
                        {sb.isCorrect === false && <XCircle className="inline h-4 w-4 text-red-400" />}
                        {sb.isCorrect == null && <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Edit Match ──────────────────────────────────── */}
      {activeTab === "edit" && (
        <Card className="border-border bg-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">{t("admin.matchDetail.editDetails")}</h3>
            <Button className="w-full sm:w-auto" size="sm" onClick={handleSaveEdit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t("common.saving") : t("admin.tournamentDetail.saveChanges")}
            </Button>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("admin.matchManagement.homeTeam")}</label>
                <Select value={editForm.homeTeam_ID} onValueChange={(v) => setEditForm({ ...editForm, homeTeam_ID: v })}>
                  <SelectTrigger><SelectValue placeholder={t("admin.matchManagement.selectTeam")} /></SelectTrigger>
                  <SelectContent>
                    {allTeams.map((t) => (
                      <SelectItem key={t.ID} value={t.ID}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("admin.matchManagement.awayTeam")}</label>
                <Select value={editForm.awayTeam_ID} onValueChange={(v) => setEditForm({ ...editForm, awayTeam_ID: v })}>
                  <SelectTrigger><SelectValue placeholder={t("admin.matchManagement.selectTeam")} /></SelectTrigger>
                  <SelectContent>
                    {allTeams.map((t) => (
                      <SelectItem key={t.ID} value={t.ID}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("admin.matchManagement.dateAndTime")}</label>
                <Input
                  type="datetime-local"
                  value={editForm.kickoff}
                  onChange={(e) => setEditForm({ ...editForm, kickoff: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("admin.matchManagement.stage")}</label>
                <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{t(s.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("admin.matchManagement.venue")}</label>
                <Input
                  value={editForm.venue}
                  onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                  placeholder={t("admin.matchManagement.stadiumPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("admin.matchManagement.matchday")}</label>
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={editForm.matchday}
                  onChange={(e) => setEditForm({ ...editForm, matchday: e.target.value })}
                  placeholder={t("admin.matchManagement.placeholderMatchday")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t("admin.matchManagement.matchStatus")}</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATCH_STATUSES.map((statusOption) => (
                    <SelectItem key={statusOption.value} value={statusOption.value}>{t(statusOption.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t("admin.matchManagement.hotMatch")}</label>
              <div className="flex items-center gap-5 rounded-md border border-border bg-surface-dark/40 px-3 py-2">
                <label className="inline-flex items-center gap-2 text-sm text-white">
                  <input
                    type="radio"
                    name="detail-edit-hot-match"
                    checked={editForm.isHotMatch}
                    onChange={() => setEditForm({ ...editForm, isHotMatch: true })}
                    className="h-4 w-4 accent-primary"
                  />
                  {t("common.hot")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-white">
                  <input
                    type="radio"
                    name="detail-edit-hot-match"
                    checked={!editForm.isHotMatch}
                    onChange={() => setEditForm({ ...editForm, isHotMatch: false })}
                    className="h-4 w-4 accent-primary"
                  />
                  {t("common.normal")}
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Enter / Correct result dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="border-border bg-card text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isCorrection ? t("admin.matchManagement.correctResult") : t("admin.matchManagement.enterMatchResult")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-center text-sm text-muted-foreground">
              {homeTeamName} {t("admin.matchDetail.vs")} {awayTeamName}
            </p>
            {isCorrection && (
              <p className="text-center text-xs text-amber-400">
                ⚠ {t("admin.matchManagement.reScoredWarning")}
              </p>
            )}
            <div className="flex items-center justify-center gap-4">
              <div className="space-y-1 text-center">
                <label className="text-xs text-muted-foreground">{t("common.home")}</label>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  className="w-20 text-center text-lg"
                  value={resultHome}
                  onChange={(e) => setResultHome(e.target.value)}
                />
              </div>
              <span className="mt-5 text-lg font-bold text-muted-foreground">–</span>
              <div className="space-y-1 text-center">
                <label className="text-xs text-muted-foreground">{t("common.away")}</label>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  className="w-20 text-center text-lg"
                  value={resultAway}
                  onChange={(e) => setResultAway(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleEnterResult} disabled={resultHome === "" || resultAway === ""}>
              {isCorrection ? t("admin.matchManagement.saveCorrection") : t("admin.matchManagement.submitResult")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Penalty shootout dialog */}
      <Dialog open={penaltyDialogOpen} onOpenChange={(o) => { if (!o) { setPenHome(""); setPenAway(""); } setPenaltyDialogOpen(o); }}>
        <DialogContent className="border-border bg-card text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.matchDetail.penaltyTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <p className="text-center text-xs text-amber-400">
              ⚠ {t("admin.matchDetail.penaltyWarning")}
            </p>
            <div className="flex items-end justify-center gap-3">
              <div className="space-y-1 text-center">
                <label className="text-xs text-muted-foreground">{homeTeamName}</label>
                <input
                  type="number" min="0" max="99"
                  className="w-20 rounded border border-border bg-card text-center text-lg text-white"
                  value={penHome}
                  onChange={(e) => setPenHome(e.target.value)}
                  placeholder="0"
                />
              </div>
              <span className="mb-2 text-sm text-muted-foreground">–</span>
              <div className="space-y-1 text-center">
                <label className="text-xs text-muted-foreground">{awayTeamName}</label>
                <input
                  type="number" min="0" max="99"
                  className="w-20 rounded border border-border bg-card text-center text-lg text-white"
                  value={penAway}
                  onChange={(e) => setPenAway(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPenHome(""); setPenAway(""); setPenaltyDialogOpen(false); }}>{t("common.cancel")}</Button>
            <Button
              disabled={penHome === "" || penAway === ""}
              onClick={handleSetPenaltyWinner}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
