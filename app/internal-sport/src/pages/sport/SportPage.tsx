import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MatchPredictionTable } from "./components/MatchPredictionTable";
import { LiveMatchesTable } from "./components/LiveMatchesTable";
import { CompletedMatchesTable } from "./components/CompletedMatchesTable";
import { TournamentSelector } from "@/components/shared/TournamentSelector";
import { LeaderboardSection } from "./components/LeaderboardSection";
import { RecentPredictionsSection } from "./components/RecentPredictionsSection";
import { TournamentBracket } from "./components/TournamentBracket";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { useActiveSection } from "@/hooks/useActiveSection";
import {
    playerMatchesApi,
    playerTournamentQueryApi,
} from "@/services/playerApi";
import type {
    Match,
    LiveMatch,
    RecentPredictionItem,
} from "@/types";

// ─── Section IDs ──────────────────────────────────────────────
export const SECTION = {
    leaderboard: "leaderboard",
    bracket: "bracket",
    matches: "matches",
    completed: "completed",
    recent: "recent",   
} as const;

export function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
    const [tournamentName, setTournamentName] = useState("");
    const [tournamentReady, setTournamentReady] = useState(false);

    // Wrap setTournamentId to also mark as ready (prevents double-fire)
    const handleTournamentSelect = useCallback((id: string) => {
        setTournamentId(id);
        setTournamentReady(true);
    }, []);

    const handleTournamentName = useCallback((name: string) => {
        setTournamentName(name);
    }, []);

    // Matches data
    const [matches, setMatches] = useState<Match[]>([]);
    const [live, setLive] = useState<LiveMatch[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);

    // Recent predictions
    const [predictions, setPredictions] = useState<RecentPredictionItem[]>([]);
    const [loadingPredictions, setLoadingPredictions] = useState(true);

    const loadMatchData = useCallback(async (
        tid: string,
        options?: { showLoading?: boolean }
    ) => {
        const showLoading = options?.showLoading ?? true;
        if (showLoading) {
            setLoadingMatches(true);
        }
        try {
            const { available, live: liveData } = await playerMatchesApi.loadAllMatchData(tid);
            setMatches(available);
            setLive(liveData);
        } catch {
            // fall back silently
        } finally {
            if (showLoading) {
                setLoadingMatches(false);
            }
        }
    }, []);

    const loadPredictions = useCallback(async () => {
        setLoadingPredictions(true);
        try {
            const data = await playerTournamentQueryApi.getMyRecentPredictions(30);
            setPredictions(Array.isArray(data) ? data : []);
        } catch {
            setPredictions([]);
        } finally {
            setLoadingPredictions(false);
        }
    }, []);

    // Only fetch once tournament is resolved (prevents double-fire)
    useEffect(() => {
        if (!tournamentReady) return;
        loadMatchData(tournamentId, { showLoading: true });
    }, [tournamentId, tournamentReady, loadMatchData]);

    useEffect(() => {
        if (!tournamentReady) return;
        loadPredictions();
    }, [tournamentReady, loadPredictions]);

    // Callback for MatchCard to trigger refresh after submit/cancel
    const refreshAll = useCallback(async () => {
        await Promise.all([
            loadMatchData(tournamentId, { showLoading: false }),
            loadPredictions(),
        ]);
    }, [tournamentId, loadMatchData, loadPredictions]);

    // Scroll to hash section on mount / navigation
    const programmaticScroll = useRef(false);
    useEffect(() => {
        const hash = location.hash.replace("#", "");
        if (hash) {
            programmaticScroll.current = true;
            setTimeout(() => scrollToSection(hash), 100);
            // Reset flag after the smooth scroll completes (~600ms)
            setTimeout(() => { programmaticScroll.current = false; }, 800);
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

        const elements = SECTION_IDS
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null);

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
            }
        );

        for (const el of elements) observer.observe(el);

        return () => observer.disconnect();
    }, [setActiveSection]); // setActiveSection is stable via useCallback

    return (
        <div className="flex flex-col">
            {/* ── Sticky top controls ── */}
            <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-lg font-extrabold text-white">{t("sport.title")}</h1>
                    <p className="text-[11px] text-muted-foreground">
                        {t("sport.subtitle")}
                    </p>
                </div>
                <TournamentSelector
                    selectedId={tournamentId}
                    onSelect={handleTournamentSelect}
                    onTournamentName={handleTournamentName}
                    allowAll
                />
            </div>

            {/* ── Scrollable content ── */}
            <div className="p-4 pb-24 xl:pb-6">

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

                    {/* Available match table */}
                    {loadingMatches ? (
                        <LoadingOverlay />
                    ) : matches.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            {t("matchPredictionTable.noMatchesFound")}
                        </p>
                    ) : (
                        <MatchPredictionTable matches={matches} onPredictionChange={refreshAll} />
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
                <section>
                    <SectionHeading
                        id={SECTION.recent}
                        color="bg-secondary"
                        title={t("sport.sections.recent")}
                        subtitle={t("sport.sections.recentSubtitle")}
                    />
                    <RecentPredictionsSection
                        predictions={predictions}
                        loading={loadingPredictions}
                        tournamentName={tournamentName}
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
                     tournamentId={tournamentId} />
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
