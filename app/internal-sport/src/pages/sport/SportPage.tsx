import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MatchPredictionTable } from "./components/MatchPredictionTable";
import { LiveMatchesTable } from "./components/LiveMatchesTable";
import { CompletedMatchesTable } from "./components/CompletedMatchesTable";
import { SECTION, scrollToSection } from "./sectionNavigation";
import { TournamentSelector } from "@/components/shared/TournamentSelector";
import { LeaderboardSection } from "./components/LeaderboardSection";
import { RecentPredictionsSection } from "./components/RecentPredictionsSection";
import { TournamentBracket } from "./components/TournamentBracket";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { BettingBannerPopup } from "@/components/shared/BettingBannerPopup";
import { useActiveSection } from "@/hooks/useActiveSection";
import { playerMatchesApi } from "@/services/playerApi";
import type { LiveMatch } from "@/types";

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
  const location = useLocation();
  const { t } = useTranslation();
  const [tournamentId, setTournamentId] = useState("");
  const [tournamentReady, setTournamentReady] = useState(false);
  const [recentPredictionsRefreshKey, setRecentPredictionsRefreshKey] =
    useState(0);

  // Wrap setTournamentId to also mark as ready (prevents double-fire)
  const handleTournamentSelect = useCallback((id: string) => {
    setTournamentId(id);
    setTournamentReady(true);
  }, []);

  const [live, setLive] = useState<LiveMatch[]>([]);

  useEffect(() => {
    if (!tournamentReady) return;

    let cancelled = false;

    const loadLiveMatches = async () => {
      try {
        const liveData = await playerMatchesApi.getLive();
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
  }, [tournamentReady]);

  // Callback for MatchCard to trigger refresh after submit/cancel
  const refreshAll = useCallback(async () => {
    setRecentPredictionsRefreshKey((current) => current + 1);
  }, []);

  // Scroll to hash section on mount / navigation
  const programmaticScroll = useRef(false);
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) {
      programmaticScroll.current = true;
      setTimeout(() => scrollToSection(hash), 100);
      // Reset flag after the smooth scroll completes (~600ms)
      setTimeout(() => {
        programmaticScroll.current = false;
      }, 800);
    }
  }, [location.hash]);

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
      {/* ── Sticky top controls ── */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between xl:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-white sm:text-xl">
              {t("sport.title")}
            </h1>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              {t("sport.subtitle")}
            </p>
          </div>
          <div className="w-full lg:w-auto lg:min-w-[280px] xl:min-w-[320px]">
            <TournamentSelector
              selectedId={tournamentId}
              onSelect={handleTournamentSelect}
              allowAll
            />
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="mobile-safe-section px-4 py-4 sm:px-5 lg:py-5 xl:px-6 xl:pb-6">
        {/* ══════════════════════════════════════════
                    SECTION 2 — Matches (Available + Live + Upcoming)
                ══════════════════════════════════════════ */}
        <section className="mb-14">
          <SectionHeading
            id={SECTION.matches}
            color="bg-primary"
            title={t("sport.sections.matches")}
            subtitle={t("sport.sections.matchesSubtitle")}
          />

          {tournamentReady ? (
            <MatchPredictionTable
              tournamentId={tournamentId}
              onPredictionChange={refreshAll}
            />
          ) : (
            <LoadingOverlay />
          )}

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
    </div>
  );
}
