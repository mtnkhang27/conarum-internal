import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MatchPredictionTable } from "./components/MatchPredictionTable";
import { LiveMatchesTable } from "./components/LiveMatchesTable";
import { CompletedMatchesTable } from "./components/CompletedMatchesTable";
import { SECTION, scrollToSection } from "./sectionNavigation";
import { LeaderboardSection } from "./components/LeaderboardSection";
import { RecentPredictionsSection } from "./components/RecentPredictionsSection";
import { TournamentBracket } from "./components/TournamentBracket";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { Button } from "@/components/ui/button";
import { Workflow } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActiveSection } from "@/hooks/useActiveSection";
import { playerMatchesApi } from "@/services/playerApi";
import type { LiveMatch, Match } from "@/types";
import { BettingBannerPopup } from "@/components/shared/BettingBannerPopup";

// ─── Section heading helper ────────────────────────────────────
function SectionHeading({
  id,
  color,
  title,
  subtitle,
}: {
  id: string;
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div id={id} className="mb-6 scroll-mt-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white">
        <span className={`h-6 w-1 rounded-full ${color}`} />
        {title}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export function SportPage() {
  const { t } = useTranslation();
  const [tournamentId, setTournamentId] = useState("");
  const [tournamentReady, setTournamentReady] = useState(false);
  const [bannerMatches, setBannerMatches] = useState<Match[]>([]);
  const [loadingBannerMatches, setLoadingBannerMatches] = useState(true);
  const [recentPredictionsRefreshKey, setRecentPredictionsRefreshKey] =
    useState(0);
  const [isBracketDialogOpen, setIsBracketDialogOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Wrap setTournamentId to also mark as ready (prevents double-fire)
  const handleTournamentSelect = useCallback((id: string) => {
    setTournamentId(id);
    setTournamentReady(true);
  }, []);

  const [live, setLive] = useState<LiveMatch[]>([]);

  // Fetch matches for the betting banner popup (lightweight, first page)
  useEffect(() => {
    if (!tournamentReady) return;
    let cancelled = false;
    setLoadingBannerMatches(true);

    const loadBannerMatches = async () => {
      try {
        const { items } = await playerMatchesApi.getAvailablePaged({
          tournamentId: tournamentId || undefined,
          page: 1,
          pageSize: 5,
        });
        if (!cancelled) setBannerMatches(items);
      } catch {
        if (!cancelled) setBannerMatches([]);
      } finally {
        if (!cancelled) setLoadingBannerMatches(false);
      }
    };

    void loadBannerMatches();
    return () => { cancelled = true; };
  }, [tournamentId, tournamentReady]);

  useEffect(() => {
    if (!tournamentReady) return;

    let cancelled = false;

    const loadLiveMatches = async () => {
      try {
        const liveData = await playerMatchesApi.getLive(tournamentId || undefined);
        if (!cancelled) {
          setLive(liveData);
        }
      } catch {
        if (!cancelled) {
          setLive([]);
        }
      }
    };

    void loadLiveMatches();

    return () => {
      cancelled = true;
    };
  }, [tournamentId, tournamentReady]);

  // Callback for MatchCard to trigger refresh after submit/cancel
  const refreshAll = useCallback(async () => {
    setRecentPredictionsRefreshKey((current) => current + 1);
  }, []);

  // Track only in-page programmatic scrolls triggered by UI actions.
  const programmaticScroll = useRef(false);

  // ── Scroll spy: sync sidebar with visible section ─────────
  const { setActiveSection } = useActiveSection();
  useEffect(() => {
    const SECTION_IDS = [
      SECTION.matches,
      SECTION.leaderboard,
      SECTION.recent,
      SECTION.bracket,
      SECTION.completed,
    ];

    const elements = SECTION_IDS.map((id) =>
      document.getElementById(id),
    ).filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip if a programmatic scroll is in progress
        if (programmaticScroll.current) return;

        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          const activeId = visible[0].target.id;
          setActiveSection(activeId);
        }
      },
      {
        // Trigger when heading is in the upper ~30% of the viewport
        rootMargin: "-10% 0px -70% 0px",
        threshold: 0,
      },
    );

    for (const el of elements) observer.observe(el);

    return () => observer.disconnect();
  }, [setActiveSection]); // setActiveSection is stable via useCallback

  return (
    <div className="flex flex-col">
      <BettingBannerPopup
        matches={bannerMatches}
        loading={loadingBannerMatches}
        onBetNow={() => scrollToSection(SECTION.matches)}
        onDismiss={() => setBannerDismissed(true)}
      />

      {/* ── Scrollable content ── */}
      <div className="mobile-safe-section px-4 py-4 sm:px-5 lg:py-5 xl:px-6 xl:pb-6">
        {/* ══════════════════════════════════════════
                    SECTION 2 — Matches (Available + Live + Upcoming)
                ══════════════════════════════════════════ */}
        <section id={SECTION.matches} className="mb-14 scroll-mt-4">
          {/* <SectionHeading
            id={SECTION.matches}
            color="bg-primary"
            title={t("sport.sections.matches")}
            subtitle={t("sport.sections.matchesSubtitle")}
          /> */}

          <MatchPredictionTable
            tournamentId={tournamentId}
            tournamentReady={tournamentReady}
            onTournamentSelect={handleTournamentSelect}
            onPredictionChange={refreshAll}
            bannerDismissed={bannerDismissed}
            tournamentActions={
              <Button
                type="button"
                onClick={() => setIsBracketDialogOpen(true)}
                disabled={!tournamentId}
                className="group inline-flex h-10 w-full justify-start rounded-lg border border-border bg-surface-dark px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-dark/60 disabled:text-muted-foreground md:w-auto md:min-w-[190px]"
              >
                <Workflow className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className="truncate text-left">{t("nav.tournamentBracket")}</span>
              </Button>
            }
          />

          {/* Live matches */}
          {live.length > 0 && (
            <div className="mt-6">
              <LiveMatchesTable items={live} />
            </div>
          )}

          {/* Upcoming kickoff table (read-only) */}
          {/* {upcoming.length > 0 && (
                        <UpcomingKickoffTable items={upcoming} />
                    )} */}
        </section>

        {/* ══════════════════════════════════════════
                    SECTION 1 — Leaderboard
                ══════════════════════════════════════════ */}
        <section className="mb-14">
          <SectionHeading
            id={SECTION.leaderboard}
            color="bg-yellow-400"
            title={t("sport.sections.leaderboard")}
            subtitle={t("sport.sections.leaderboardSubtitle")}
          />
          <LeaderboardSection tournamentId={tournamentId} />
        </section>

        {/* ══════════════════════════════════════════
                    SECTION 4 — Recent Predictions
                ══════════════════════════════════════════ */}
        <section className="mb-14">
          <SectionHeading
            id={SECTION.recent}
            color="bg-secondary"
            title={t("sport.sections.recent")}
            subtitle={t("sport.sections.recentSubtitle")}
          />
          <RecentPredictionsSection
            tournamentId={tournamentId}
            enabled={tournamentReady}
            refreshKey={recentPredictionsRefreshKey}
          />
        </section>

        <section className="mb-14">
          <SectionHeading
            id={SECTION.bracket}
            color="bg-primary"
            title={t("sport.sections.bracket")}
            subtitle={t("sport.sections.bracketSubtitle")}
          />
          <TournamentBracket
            //  subtitle="Tournament bracket — 1 point per correct prediction. Ties broken by name (A→Z)."
            tournamentId={tournamentId}
          />
        </section>

        {/* ══════════════════════════════════════════
                    SECTION 3 — Completed matches
                ══════════════════════════════════════════ */}
        <section className="mb-14">
          <SectionHeading
            id={SECTION.completed}
            color="bg-foreground/40"
            title={t("sport.sections.completed")}
            subtitle={t("sport.sections.completedSubtitle")}
          />

          {tournamentReady ? (
            <CompletedMatchesTable tournamentId={tournamentId} />
          ) : (
            <LoadingOverlay />
          )}
        </section>
      </div>

      <Dialog open={isBracketDialogOpen} onOpenChange={setIsBracketDialogOpen}>
        <DialogContent className="flex max-h-[min(90vh,860px)] flex-col overflow-hidden border-border bg-card text-white sm:max-w-[92vw] xl:max-w-[1400px] 2xl:max-w-[1500px]">
          <DialogHeader>
            <DialogTitle>{t("nav.tournamentBracket")}</DialogTitle>
            <DialogDescription>
              {t("sport.sections.bracketSubtitle")}
            </DialogDescription>
          </DialogHeader>

          {isBracketDialogOpen ? (
            <div className="min-h-0 overflow-y-auto overflow-x-hidden pb-1 pr-1">
              <TournamentBracket tournamentId={tournamentId} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
