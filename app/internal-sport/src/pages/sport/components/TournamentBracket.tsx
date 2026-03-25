import { useEffect, useState } from "react";
import { playerTournamentQueryApi } from "@/services/playerApi";
import { mapExternalAssetUrls } from "@/utils/externalAssetProxy";

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */

export interface BracketSlot {
    slotId: string;
    stage: string;
    position: number;
    label: string;
    homeTeamId: string | null;
    homeTeamName: string;
    homeTeamFlag: string;
    homeTeamCrest: string;
    awayTeamId: string | null;
    awayTeamName: string;
    awayTeamFlag: string;
    awayTeamCrest: string;
    leg1Id: string | null;
    leg1HomeScore: number | null;
    leg1AwayScore: number | null;
    leg1Status: string | null;
    leg2Id: string | null;
    leg2HomeScore: number | null;
    leg2AwayScore: number | null;
    leg2Status: string | null;
    homeAgg: number;
    awayAgg: number;
    homePen: number | null;
    awayPen: number | null;
    winnerId: string | null;
    winnerName: string;
    nextSlotId: string | null;
    nextSlotSide: string | null;
}

/* Stage ordering (lower = earlier round) */
const STAGE_ORDER: Record<string, number> = {
    playoff: 0,
    roundOf16: 1,
    quarterFinal: 2,
    semiFinal: 3,
    final: 4,
};

const STAGE_LABEL: Record<string, string> = {
    playoff: "Playoff",
    roundOf16: "Round of 16",
    quarterFinal: "Quarter-Finals",
    semiFinal: "Semi-Finals",
    final: "Final",
};

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return "Failed to load bracket";
}

/* ────────────────────────────────────────────────────────── */
/*  Sub-components                                            */
/* ────────────────────────────────────────────────────────── */

function TeamRow({
    name,
    crest,
    agg,
    isWinner,
    isEmpty,
    leg1Score,
    leg2Score,
    showLegs,
    hasPen,
    penScore,
}: {
    name: string;
    crest: string;
    agg: number;
    isWinner: boolean;
    isEmpty: boolean;
    leg1Score: number | null;
    leg2Score: number | null;
    showLegs: boolean;
    hasPen: boolean;
    penScore: number | null;
}) {
    return (
        <div
            className={`
                flex items-center gap-2 px-3 py-2 transition-colors
                ${isWinner ? "bg-emerald-500/15" : ""}
                ${isEmpty ? "opacity-40" : ""}
            `}
        >
            {/* Team crest/logo */}
            <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-sm">
                {crest ? (
                    <img
                        src={crest}
                        alt={name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-sm bg-white/5 text-[9px] text-muted-foreground">
                        ?
                    </div>
                )}
            </div>

            {/* Team name */}
            <span
                className={`flex-1 truncate text-xs ${
                    isWinner
                        ? "font-bold text-emerald-400"
                        : isEmpty
                        ? "italic text-muted-foreground"
                        : "text-white"
                }`}
            >
                {isEmpty ? "TBD" : name}
            </span>

            {/* Scores: leg1 / leg2 / aggregate / pen */}
            <div className="flex items-center gap-1">
                {showLegs && (
                    <>
                        <span className="w-4 text-center text-[10px] text-muted-foreground">
                            {leg1Score !== null ? leg1Score : "-"}
                        </span>
                        <span className="w-4 text-center text-[10px] text-muted-foreground">
                            {leg2Score !== null ? leg2Score : "-"}
                        </span>
                    </>
                )}
                <span
                    className={`w-5 text-center text-xs font-bold ${
                        isWinner ? "text-emerald-400" : "text-white/70"
                    }`}
                >
                    {isEmpty && agg === 0 ? "-" : agg}
                </span>
                {hasPen && (
                    <span className="w-5 text-center text-[10px] font-semibold text-amber-400">
                        {penScore !== null ? penScore : "-"}
                    </span>
                )}
            </div>
        </div>
    );
}

function SlotCard({ slot, showLegs }: { slot: BracketSlot; showLegs: boolean }) {
    const homeEmpty = !slot.homeTeamId;
    const awayEmpty = !slot.awayTeamId;
    const hasWinner = !!slot.winnerId;
    const homeIsWinner = hasWinner && slot.winnerId === slot.homeTeamId;
    const awayIsWinner = hasWinner && slot.winnerId === slot.awayTeamId;
    const hasPen = slot.homePen !== null && slot.homePen !== undefined;

    return (
        <div
            className={`
                w-full overflow-hidden rounded-lg border transition-all
                ${hasWinner
                    ? "border-emerald-500/30 shadow-md shadow-emerald-500/5"
                    : "border-border/40 shadow-sm"}
                bg-card/80 backdrop-blur-sm
            `}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/30 bg-white/[0.02] px-3 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {slot.label}
                </span>
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                    {showLegs && (
                        <>
                            <span className="w-4 text-center">L1</span>
                            <span className="w-4 text-center">L2</span>
                        </>
                    )}
                    <span className="w-5 text-center">A</span>
                    {hasPen && (
                        <span className="w-5 text-center text-amber-400/70">P</span>
                    )}
                </div>
            </div>

            {/* Home team */}
            <TeamRow
                name={slot.homeTeamName}
                crest={slot.homeTeamCrest}
                agg={slot.homeAgg}
                isWinner={homeIsWinner}
                isEmpty={homeEmpty}
                leg1Score={slot.leg1HomeScore}
                leg2Score={slot.leg2HomeScore}
                showLegs={showLegs}
                hasPen={hasPen}
                penScore={hasPen ? (slot.homePen ?? null) : null}
            />

            {/* Divider */}
            <div className="mx-3 border-t border-border/20" />

            {/* Away team */}
            <TeamRow
                name={slot.awayTeamName}
                crest={slot.awayTeamCrest}
                agg={slot.awayAgg}
                isWinner={awayIsWinner}
                isEmpty={awayEmpty}
                leg1Score={slot.leg1AwayScore}
                leg2Score={slot.leg2AwayScore}
                showLegs={showLegs}
                hasPen={hasPen}
                penScore={hasPen ? (slot.awayPen ?? null) : null}
            />
        </div>
    );
}

/* ────────────────────────────────────────────────────────── */
/*  Main Bracket Component                                    */
/* ────────────────────────────────────────────────────────── */

interface TournamentBracketProps {

    tournamentId: string;
    /** bracket data fetched externally */
    slots?: BracketSlot[];
    /** Hide playoff round (default false) */
    hidePlayoff?: boolean;
    /** Compact mode for embedding */
    compact?: boolean;
}

export function TournamentBracket({
    tournamentId,
    slots: externalSlots,
    hidePlayoff = true,
    compact = false,
}: TournamentBracketProps) {
    const [fetchedSlots, setFetchedSlots] = useState<BracketSlot[]>([]);
    const [loading, setLoading] = useState(!externalSlots && !!tournamentId);
    const [error, setError] = useState("");
    const slots = externalSlots
        ? mapExternalAssetUrls(externalSlots)
        : fetchedSlots;

    useEffect(() => {
        if (externalSlots || !tournamentId) return;

        let cancelled = false;
        const loadBracket = async () => {
            setLoading(true);
            setError("");
            try {
                const bracketSlots =
                    await playerTournamentQueryApi.getTournamentBracket(tournamentId);
                if (cancelled) return;
                setFetchedSlots(mapExternalAssetUrls(bracketSlots as BracketSlot[]));
            } catch (error: unknown) {
                if (cancelled) return;
                setFetchedSlots([]);
                setError(getErrorMessage(error));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadBracket();

        return () => {
            cancelled = true;
        };
    }, [tournamentId, externalSlots]);

    if (!externalSlots && loading)
        return (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
                Loading bracket…
            </div>
        );
    if (!tournamentId && !externalSlots)
        return (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
                Select a tournament to view the bracket.
            </div>
        );
    if (!externalSlots && error)
        return (
            <div className="flex h-48 items-center justify-center text-red-400">
                {error}
            </div>
        );
    if (slots.length === 0)
        return (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
                No bracket data available for this tournament.
            </div>
        );

    // Filter out playoff if requested; group by stage
    const filteredSlots = hidePlayoff
        ? slots.filter((s) => s.stage !== "playoff")
        : slots;

    const stageGroups = new Map<string, BracketSlot[]>();
    for (const s of filteredSlots) {
        if (!stageGroups.has(s.stage)) stageGroups.set(s.stage, []);
        stageGroups.get(s.stage)!.push(s);
    }

    // Sort stages by order
    const orderedStages = [...stageGroups.keys()].sort(
        (a, b) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99)
    );

    // Check if tournament has legs (2-leg ties) — see if any slot has leg2
    const hasLegs = slots.some((s) => s.leg2Id !== null);

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-border/70 bg-card/40">
            <div className="overflow-x-auto">
                <div className="flex min-w-max items-stretch gap-3 p-3 sm:p-4">
                {orderedStages.map((stage) => {
                    const stageSlots = stageGroups.get(stage)!;
                    stageSlots.sort((a, b) => a.position - b.position);

                    // For final stage, don't show legs
                    const showLegs = hasLegs && stage !== "final";

                    return (
                        <div key={stage} className="flex min-w-[240px] flex-1 snap-start flex-col items-center gap-2 sm:min-w-[260px] xl:min-w-[280px]">
                            {/* Stage header */}
                            <div className="mb-2 text-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">
                                    {STAGE_LABEL[stage] ?? stage}
                                </h3>
                                <span className="text-[10px] text-muted-foreground">
                                    {stageSlots.length} tie{stageSlots.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            {/* Bracket cards for this stage */}
                            <div
                                className="flex w-full flex-col justify-center gap-3"
                                style={{
                                    minHeight: compact ? undefined : `${Math.max(stageSlots.length * 92, 220)}px`,
                                }}
                            >
                                {stageSlots.map((slot) => (
                                    <SlotCard key={slot.slotId} slot={slot} showLegs={showLegs} />
                                ))}
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>
        </div>
    );
}
 
