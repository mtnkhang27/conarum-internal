import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MatchPredictionTable } from "@/components/MatchPredictionTable";
import { LiveMatchesTable } from "@/components/LiveMatchesTable";
import { CompletedMatchesTable } from "@/components/CompletedMatchesTable";
import { TournamentSelector } from "@/components/TournamentSelector";
import { LeaderboardSection } from "@/components/LeaderboardSection";
import { RecentPredictionsSection } from "@/components/RecentPredictionsSection";
import { TournamentBracket } from "@/components/TournamentBracket";
import {
    playerMatchesApi,
    playerTournamentQueryApi,
} from "@/services/playerApi";
import type {
    Match,
    UpcomingMatch,
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

    // Matches data
    const [matches, setMatches] = useState<Match[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingMatch[]>([]);
    const [live, setLive] = useState<LiveMatch[]>([]);
    const [completed, setCompleted] = useState<Match[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);

    // Recent predictions
    const [predictions, setPredictions] = useState<RecentPredictionItem[]>([]);
    const [loadingPredictions, setLoadingPredictions] = useState(true);

    const loadMatchData = useCallback(async (tid: string) => {
        setLoadingMatches(true);
        const filterTid = tid || undefined;
        try {
            const [m, u, l, c] = await Promise.all([
                playerMatchesApi.getAvailable(filterTid),
                playerMatchesApi.getUpcoming(filterTid),
                playerMatchesApi.getLive(),
                playerMatchesApi.getCompleted(filterTid),
            ]);
            setMatches(m);
            setUpcoming(u);
            setLive(l);
            setCompleted(c);
        } catch {
            // fall back silently
        } finally {
            setLoadingMatches(false);
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

    useEffect(() => {
        loadMatchData(tournamentId);
    }, [tournamentId, loadMatchData, location.key]);

    useEffect(() => {
        loadPredictions();
    }, [loadPredictions, location.key]);

    // Callback for MatchCard to trigger refresh after submit/cancel
    const refreshAll = useCallback(() => {
        loadMatchData(tournamentId);
        loadPredictions();
    }, [tournamentId, loadMatchData, loadPredictions]);

    // Scroll to hash section on mount / navigation
    useEffect(() => {
        const hash = location.hash.replace("#", "");
        if (hash) {
            setTimeout(() => scrollToSection(hash), 100);
        }
    }, [location.hash]);

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
                    onSelect={setTournamentId}
                    allowAll
                />
            </div>

            {/* ── Scrollable content ── */}
            <div className="p-4 pb-24 xl:pb-6">

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
                        <div className="flex h-48 items-center justify-center text-muted-foreground">
                            {t("common.loading")}
                        </div>
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
                    SECTION 3 — Completed matches
                ══════════════════════════════════════════ */}
                <section className="mb-14">
                    <SectionHeading
                        id={SECTION.completed}
                        color="bg-foreground/40"
                        title={t("sport.sections.completed")}
                        subtitle={t("sport.sections.completedSubtitle")}
                    />

                    {loadingMatches ? (
                        <div className="flex h-32 items-center justify-center text-muted-foreground">
                            {t("common.loading")}
                        </div>
                    ) : (
                        <CompletedMatchesTable matches={completed} />
                    )}
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
                    />
                </section>
            </div>
        </div>
    );
}
