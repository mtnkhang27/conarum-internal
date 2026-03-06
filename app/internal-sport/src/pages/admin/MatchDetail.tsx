import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import type {
  AdminMatch,
  AdminTeam,
  MatchScoreBetConfig,
  AdminPrediction,
  AdminScoreBet,
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
    <div className="flex items-center justify-between gap-4 border-b border-border/30 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-white">{label}</h4>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
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

const STAGES = [
  { value: "group", label: "Group Stage" },
  { value: "roundOf16", label: "Round of 16" },
  { value: "quarterFinal", label: "Quarter Final" },
  { value: "semiFinal", label: "Semi Final" },
  { value: "thirdPlace", label: "Third Place" },
  { value: "final", label: "Final" },
  { value: "regular", label: "Regular Season" },
  { value: "playoff", label: "Playoff" },
  { value: "relegation", label: "Relegation" },
];

const MATCH_STATUSES: { value: AdminMatch["status"]; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "finished", label: "Finished" },
  { value: "cancelled", label: "Cancelled" },
];

const DEFAULT_SCORE_BET_CONFIG: Omit<MatchScoreBetConfig, "ID" | "match_ID"> = {
  enabled: true,
  maxBets: 3,
  prize: 200000,
};

// ── Tab type ────────────────────────────────────────────────

type Tab = "config" | "predictions" | "scoreBets" | "edit";

export function MatchDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

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
  const [scoreBettingEnabled, setScoreBettingEnabled] = useState(false);

  // Predictions tab state
  const [predictions, setPredictions] = useState<AdminPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Score bets tab state
  const [scoreBets, setScoreBets] = useState<AdminScoreBet[]>([]);
  const [loadingScoreBets, setLoadingScoreBets] = useState(false);

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
        kickoff: m.kickoff?.slice(0, 16) || "",
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
      } else {
        setScoreBetCfgExists(false);
        setScoreBettingEnabled(false);
        setSbCfg(DEFAULT_SCORE_BET_CONFIG);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const loadPredictions = useCallback(async () => {
    if (!matchId) return;
    setLoadingPredictions(true);
    try {
      const data = await predictionsApi.listByMatch(matchId);
      setPredictions(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingPredictions(false);
    }
  }, [matchId]);

  const loadScoreBets = useCallback(async () => {
    if (!matchId) return;
    setLoadingScoreBets(true);
    try {
      const data = await scoreBetsApi.listByMatch(matchId);
      setScoreBets(data);
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

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === "predictions") loadPredictions();
    else if (activeTab === "scoreBets") loadScoreBets();
    else if (activeTab === "edit") loadTeams();
  }, [activeTab, loadPredictions, loadScoreBets, loadTeams]);

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
      toast.success("Match configuration saved");
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
      await matchesApi.update(matchId, {
        homeTeam_ID: editForm.homeTeam_ID || null,
        awayTeam_ID: editForm.awayTeam_ID || null,
        kickoff: new Date(editForm.kickoff).toISOString(),
        venue: editForm.venue || null,
        stage: editForm.stage as AdminMatch["stage"],
        status: editForm.status as AdminMatch["status"],
        matchday: editForm.matchday ? parseInt(editForm.matchday) : null,
        isHotMatch: !!editForm.isHotMatch,
      } as Partial<AdminMatch>);
      toast.success("Match updated");
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
      load();
      // Refresh predictions/score bets since they got scored
      loadPredictions();
      loadScoreBets();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSetPenaltyWinner() {
    if (!match?.bracketSlot_ID) return;
    const h = parseInt(penHome);
    const a = parseInt(penAway);
    if (isNaN(h) || isNaN(a)) { toast.error("Please enter valid penalty scores."); return; }
    if (h === a) { toast.error("Penalty scores cannot be equal \u2014 there must be a winner."); return; }
    const winnerId = h > a ? match.homeTeam_ID : match.awayTeam_ID;
    if (!winnerId) { toast.error("Winner team is not resolved yet."); return; }
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
        Loading match details…
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
    { key: "config", label: "Config" },
    { key: "predictions", label: "Predictions", count: predictions.length },
    { key: "scoreBets", label: "Score Bets", count: scoreBets.length },
    { key: "edit", label: "Edit Match" },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/matches")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {homeTeamResolved &&
                (homeTeamResolved.crest ? (
                  <img src={homeTeamResolved.crest} alt="" className="mr-2 inline h-6 w-6 object-contain align-middle" />
                ) : (
                  <span className={`fi fi-${homeTeamResolved.flagCode} mr-2`} />
                ))}
              {homeTeamName}
              <span className="mx-3 text-muted-foreground">vs</span>
              {awayTeamResolved &&
                (awayTeamResolved.crest ? (
                  <img src={awayTeamResolved.crest} alt="" className="mr-2 inline h-6 w-6 object-contain align-middle" />
                ) : (
                  <span className={`fi fi-${awayTeamResolved.flagCode} mr-2`} />
                ))}
              {awayTeamName}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(match.kickoff).toLocaleDateString()}{" "}
                {new Date(match.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
        <div className="flex items-center gap-2">
          {canEnterResult && (
            <Button variant="outline" onClick={() => { setIsCorrection(false); setResultHome(""); setResultAway(""); setResultDialogOpen(true); }}>
              <Target className="mr-2 h-4 w-4" />
              Enter Result
            </Button>
          )}
          {isFinished && (
            <Button variant="outline" onClick={() => { setIsCorrection(true); setResultHome(String(match.homeScore ?? "")); setResultAway(String(match.awayScore ?? "")); setResultDialogOpen(true); }}>
              <Edit className="mr-2 h-4 w-4" />
              Correct Result
            </Button>
          )}
          {showPenaltyButton && (
            <Button variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10" onClick={() => { setPenHome(""); setPenAway(""); setPenaltyDialogOpen(true); }}>
              Penalty Shootout
            </Button>
          )}
        </div>
      </div>

      {/* Result banner */}
      {isFinished && (
        <Card className="border-border bg-card p-4">
          <div className="flex items-center justify-center gap-6 text-lg">
            <span className="font-bold text-white">{homeTeamName}</span>
            <span className="font-mono text-2xl font-bold text-primary">
              {match.homeScore} – {match.awayScore}
            </span>
            <span className="font-bold text-white">{awayTeamName}</span>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-surface-dark px-1.5 py-0.5 text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Config ──────────────────────────────────────── */}
      {activeTab === "config" && (
        <Card className="border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Betting Configuration</h3>
            <Button size="sm" onClick={handleSaveConfig} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save Config"}
            </Button>
          </div>
          <ConfigRow label="Points for Correct" description="Points awarded for a correct outcome prediction">
            <Input
              type="number"
              step="0.5"
              min="0"
              className="w-20 text-right border-white"
              value={outcomePoints}
              onChange={(e) => setOutcomePoints(parseFloat(e.target.value) || 0)}
            />
          </ConfigRow>
          <ConfigRow label="Hot Match" description="Mark this match as featured in player filters">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-white">
                <input
                  type="radio"
                  name="detail-config-hot-match"
                  checked={isHotMatch}
                  onChange={() => setIsHotMatch(true)}
                  className="h-4 w-4 accent-primary"
                />
                Hot
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-white">
                <input
                  type="radio"
                  name="detail-config-hot-match"
                  checked={!isHotMatch}
                  onChange={() => setIsHotMatch(false)}
                  className="h-4 w-4 accent-primary"
                />
                Normal
              </label>
            </div>
          </ConfigRow>
          <ConfigRow label="Enable Score Betting" description="Create score bet config for this match">
            <Checkbox
              checked={scoreBettingEnabled}
              onCheckedChange={(v) => setScoreBettingEnabled(!!v)}
              className="border-white"
            />
          </ConfigRow>
          {scoreBettingEnabled && (
            <>
              <ConfigRow label="Enabled" description="Activate betting">
                <Checkbox
                  checked={sbCfg.enabled}
                  onCheckedChange={(v) => setSbCfg({ ...sbCfg, enabled: !!v })}
                  className="border-white"
                />
              </ConfigRow>
              <ConfigRow label="Max Bets" description="Maximum score bets per player">
                <Input
                  type="number"
                  className="w-20 text-right border-white"
                  value={sbCfg.maxBets}
                  onChange={(e) => setSbCfg({ ...sbCfg, maxBets: parseInt(e.target.value) || 0 })}
                />
              </ConfigRow>
              <ConfigRow label="Prize (VND)" description="Prize per correct score bet">
                <Input
                  type="number"
                  className="w-28 text-right border-white"
                  value={sbCfg.prize}
                  onChange={(e) => setSbCfg({ ...sbCfg, prize: parseInt(e.target.value) || 0 })}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-white">{predictions.length}</p>
              <p className="text-[11px] text-muted-foreground">Total</p>
            </Card>
            <Card className="border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-blue-400">{homePicks.length}</p>
              <p className="text-[11px] text-muted-foreground">Home ({homeTeamName})</p>
            </Card>
            <Card className="border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-yellow-400">{drawPicks.length}</p>
              <p className="text-[11px] text-muted-foreground">Draw</p>
            </Card>
            <Card className="border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-red-400">{awayPicks.length}</p>
              <p className="text-[11px] text-muted-foreground">Away ({awayTeamName})</p>
            </Card>
          </div>
          {isFinished && correctPredictions.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <strong>{correctPredictions.length}</strong> correct prediction{correctPredictions.length !== 1 && "s"}
            </div>
          )}

          {loadingPredictions ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">Loading predictions…</div>
          ) : predictions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No predictions for this match.</p>
          ) : (
            <Card className="border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Pick</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.ID} className="border-b border-border/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {p.player?.avatarUrl && (
                            <img src={p.player.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                          )}
                          <span className="font-medium text-white">{p.player?.displayName ?? p.player_ID}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={p.pick === "home" ? "default" : p.pick === "draw" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {p.pick === "home" ? homeTeamName : p.pick === "away" ? awayTeamName : "Draw"}
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
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Score Bets ───────────────────────────────────── */}
      {activeTab === "scoreBets" && (
        <div className="space-y-4">
          {isFinished && correctScoreBets.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <strong>{correctScoreBets.length}</strong> correct score bet{correctScoreBets.length !== 1 && "s"} — Payout:{" "}
              <strong>{correctScoreBets.reduce((s, b) => s + b.payout, 0).toLocaleString()} VND</strong> each
            </div>
          )}

          {loadingScoreBets ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">Loading score bets…</div>
          ) : scoreBets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No score bets for this match.</p>
          ) : (
            <Card className="border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 text-center">Predicted Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Payout</th>
                    <th className="px-4 py-3 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreBets.map((sb) => (
                    <tr key={sb.ID} className={`border-b border-border/50 ${sb.isCorrect === true ? "bg-green-500/5" : ""}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {sb.player?.avatarUrl && (
                            <img src={sb.player.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                          )}
                          <span className="font-medium text-white">{sb.player?.displayName ?? sb.player_ID}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-white">
                        {sb.predictedHomeScore} – {sb.predictedAwayScore}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">{sb.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {sb.payout > 0 ? <span className="text-green-400">+{sb.payout.toLocaleString()}</span> : "0"}
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
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Edit Match ──────────────────────────────────── */}
      {activeTab === "edit" && (
        <Card className="border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Edit Match Details</h3>
            <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Home Team</label>
                <Select value={editForm.homeTeam_ID} onValueChange={(v) => setEditForm({ ...editForm, homeTeam_ID: v })}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {allTeams.map((t) => (
                      <SelectItem key={t.ID} value={t.ID}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Away Team</label>
                <Select value={editForm.awayTeam_ID} onValueChange={(v) => setEditForm({ ...editForm, awayTeam_ID: v })}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {allTeams.map((t) => (
                      <SelectItem key={t.ID} value={t.ID}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Date &amp; Time</label>
                <Input
                  type="datetime-local"
                  value={editForm.kickoff}
                  onChange={(e) => setEditForm({ ...editForm, kickoff: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Stage</label>
                <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Venue</label>
                <Input
                  value={editForm.venue}
                  onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                  placeholder="Stadium name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Matchday</label>
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={editForm.matchday}
                  onChange={(e) => setEditForm({ ...editForm, matchday: e.target.value })}
                  placeholder="e.g. 1-38"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATCH_STATUSES.map((statusOption) => (
                    <SelectItem key={statusOption.value} value={statusOption.value}>{statusOption.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Hot Match</label>
              <div className="flex items-center gap-5 rounded-md border border-border bg-surface-dark/40 px-3 py-2">
                <label className="inline-flex items-center gap-2 text-sm text-white">
                  <input
                    type="radio"
                    name="detail-edit-hot-match"
                    checked={editForm.isHotMatch}
                    onChange={() => setEditForm({ ...editForm, isHotMatch: true })}
                    className="h-4 w-4 accent-primary"
                  />
                  Hot
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-white">
                  <input
                    type="radio"
                    name="detail-edit-hot-match"
                    checked={!editForm.isHotMatch}
                    onChange={() => setEditForm({ ...editForm, isHotMatch: false })}
                    className="h-4 w-4 accent-primary"
                  />
                  Normal
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
            <DialogTitle>{isCorrection ? "Correct Match Result" : "Enter Match Result"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-center text-sm text-muted-foreground">
              {homeTeamName} vs {awayTeamName}
            </p>
            {isCorrection && (
              <p className="text-center text-xs text-amber-400">
                ⚠ Predictions and score bets will be re-scored, and the leaderboard will be recalculated.
              </p>
            )}
            <div className="flex items-center justify-center gap-4">
              <div className="space-y-1 text-center">
                <label className="text-xs text-muted-foreground">Home</label>
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
                <label className="text-xs text-muted-foreground">Away</label>
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
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEnterResult} disabled={resultHome === "" || resultAway === ""}>
              {isCorrection ? "Save Correction" : "Submit Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Penalty shootout dialog */}
      <Dialog open={penaltyDialogOpen} onOpenChange={(o) => { if (!o) { setPenHome(""); setPenAway(""); } setPenaltyDialogOpen(o); }}>
        <DialogContent className="border-border bg-card text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Penalty Shootout Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <p className="text-center text-xs text-amber-400">
              ⚠ Only applicable when aggregate is level and no winner is set yet.
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
            <Button variant="outline" onClick={() => { setPenHome(""); setPenAway(""); setPenaltyDialogOpen(false); }}>Cancel</Button>
            <Button
              disabled={penHome === "" || penAway === ""}
              onClick={handleSetPenaltyWinner}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
