import cds from '@sap/cds';

/**
 * BracketBuilder — Creates knockout bracket structure from imported matches.
 * Extracted from AdminHandler to reduce file size.
 *
 * Groups two-leg matches into ties, creates BracketSlot entries,
 * and links the bracket tree using externalId-based ordering.
 */
export class BracketBuilder {

    /** Determine tournament format from football-data.org competition type and code. */
    determineFormat(type: string, code: string): string {
        const leagueCodes = ['PL', 'FL1', 'BL1', 'SA', 'DED', 'PPL', 'PD', 'BSA', 'ELC', 'PPL'];
        if (leagueCodes.includes(code) || type === 'LEAGUE') return 'league';
        const groupKnockoutCodes = ['WC', 'EC', 'CLI', 'WCQ', 'ECQ', 'AFCON', 'COPA'];
        if (groupKnockoutCodes.includes(code)) return 'groupKnockout';
        // CL / EL / ECL use league phase + knockout → 'knockout'
        if (['CL', 'EL', 'ECL', 'UCOL'].includes(code)) return 'knockout';
        // Default for remaining CUP types
        return 'cup';
    }

    /**
     * Create bracket slots from knockout-stage matches already imported for this tournament.
     * Groups two-leg matches into ties, creates BracketSlot entries, and links the bracket tree.
     *
     * Bracket ordering uses externalId (from football-data.org) to preserve the actual
     * bracket structure. Team-based cross-referencing is then used when next-stage matches
     * have known team assignments to correctly link the bracket tree. Sequential pairing
     * (by externalId order) is used as a fallback for stages where teams are still TBD.
     */
    async createBracketFromMatches(
        tournamentId: string,
        knockoutStages: string[],
        format: string
    ): Promise<number> {
        const { Match, BracketSlot } = cds.entities('cnma.prediction');

        // Fetch all matches for this tournament
        const allMatches = await SELECT.from(Match).where({ tournament_ID: tournamentId });

        // Filter knockout matches
        const knockoutMatches = allMatches.filter((m: any) => knockoutStages.includes(m.stage));
        if (knockoutMatches.length === 0) return 0;

        // Group by stage
        const matchesByStage = new Map<string, any[]>();
        for (const m of knockoutMatches) {
            if (!matchesByStage.has(m.stage)) matchesByStage.set(m.stage, []);
            matchesByStage.get(m.stage)!.push(m);
        }

        const expectedTiesPerStage: Record<string, number> = {
            roundOf32: 16,
            roundOf16: 8,
            quarterFinal: 4,
            semiFinal: 2,
            final: 1,
        };

        type Tie = { leg1: any; leg2: any | null; homeTeamId: string | null; awayTeamId: string | null };
        const sortTiesByExternalOrder = (ties: Tie[]): Tie[] =>
            ties.sort((a, b) => {
                const aId = Math.min(a.leg1.externalId ?? Infinity, a.leg2?.externalId ?? Infinity);
                const bId = Math.min(b.leg1.externalId ?? Infinity, b.leg2?.externalId ?? Infinity);
                return aId - bId;
            });

        /**
         * Pair matches into bracket ties.
         * Preferred strategy is team-based (home/away swapped across legs).
         * For TBD two-leg stages, infer pairings by matchday or ordered split.
         */
        const createTiesFromMatches = (matches: any[], stage: string): Tie[] => {
            const orderedMatches = [...matches].sort((a: any, b: any) => (a.externalId ?? 0) - (b.externalId ?? 0));

            const pairByKnownTeams = (): Tie[] => {
                const ties: Tie[] = [];
                const used = new Set<string>();

                for (let i = 0; i < orderedMatches.length; i++) {
                    if (used.has(orderedMatches[i].ID)) continue;
                    const m1 = orderedMatches[i];
                    let paired = false;

                    for (let j = i + 1; j < orderedMatches.length; j++) {
                        if (used.has(orderedMatches[j].ID)) continue;
                        const m2 = orderedMatches[j];

                        if (
                            m1.homeTeam_ID && m1.awayTeam_ID &&
                            m1.homeTeam_ID === m2.awayTeam_ID &&
                            m1.awayTeam_ID === m2.homeTeam_ID
                        ) {
                            used.add(m1.ID);
                            used.add(m2.ID);
                            const [leg1, leg2] = new Date(m1.kickoff).getTime() <= new Date(m2.kickoff).getTime()
                                ? [m1, m2]
                                : [m2, m1];
                            ties.push({
                                leg1,
                                leg2,
                                homeTeamId: leg1.homeTeam_ID,
                                awayTeamId: leg1.awayTeam_ID,
                            });
                            paired = true;
                            break;
                        }
                    }

                    if (!paired) {
                        used.add(m1.ID);
                        ties.push({
                            leg1: m1,
                            leg2: null,
                            homeTeamId: m1.homeTeam_ID ?? null,
                            awayTeamId: m1.awayTeam_ID ?? null,
                        });
                    }
                }

                return sortTiesByExternalOrder(ties);
            };

            const expectedTies = expectedTiesPerStage[stage] ?? 0;
            const isLikelyTwoLegStage =
                stage !== 'final' &&
                expectedTies > 0 &&
                orderedMatches.length === expectedTies * 2;

            const teamPaired = pairByKnownTeams();
            if (!isLikelyTwoLegStage || teamPaired.length === expectedTies) {
                return teamPaired;
            }

            const byMatchday = new Map<number, any[]>();
            for (const m of orderedMatches) {
                if (m.matchday != null) {
                    if (!byMatchday.has(m.matchday)) byMatchday.set(m.matchday, []);
                    byMatchday.get(m.matchday)!.push(m);
                }
            }

            let leg1Candidates: any[] = [];
            let leg2Candidates: any[] = [];
            const matchdayKeys = Array.from(byMatchday.keys()).sort((a, b) => a - b);
            if (
                matchdayKeys.length === 2 &&
                (byMatchday.get(matchdayKeys[0])?.length ?? 0) === expectedTies &&
                (byMatchday.get(matchdayKeys[1])?.length ?? 0) === expectedTies
            ) {
                leg1Candidates = [...(byMatchday.get(matchdayKeys[0]) ?? [])]
                    .sort((a: any, b: any) => (a.externalId ?? 0) - (b.externalId ?? 0));
                leg2Candidates = [...(byMatchday.get(matchdayKeys[1]) ?? [])]
                    .sort((a: any, b: any) => (a.externalId ?? 0) - (b.externalId ?? 0));
            } else {
                const half = Math.floor(orderedMatches.length / 2);
                leg1Candidates = orderedMatches.slice(0, half);
                leg2Candidates = orderedMatches.slice(half);
            }

            const inferred: Tie[] = [];
            for (let i = 0; i < expectedTies; i++) {
                const legA = leg1Candidates[i];
                const legB = leg2Candidates[i];
                if (!legA || !legB) break;

                const [leg1, leg2] = new Date(legA.kickoff).getTime() <= new Date(legB.kickoff).getTime()
                    ? [legA, legB]
                    : [legB, legA];

                inferred.push({
                    leg1,
                    leg2,
                    homeTeamId: leg1.homeTeam_ID ?? leg2.awayTeam_ID ?? null,
                    awayTeamId: leg1.awayTeam_ID ?? leg2.homeTeam_ID ?? null,
                });
            }

            return inferred.length === expectedTies
                ? sortTiesByExternalOrder(inferred)
                : teamPaired;
        };

        // Define stages in bracket order
        const stageOrder = ['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'final']
            .filter(s => knockoutStages.includes(s));
        const stageLabels: Record<string, string> = {
            roundOf32: 'R32',
            roundOf16: 'R16',
            quarterFinal: 'QF',
            semiFinal: 'SF',
            final: 'Final',
            playoff: 'PO',
        };

        // Create bracket slots for each stage, keeping track of ties per stage for cross-referencing
        const bracketSlotsByStage = new Map<string, string[]>(); // stage → slot IDs
        const tiesByStage = new Map<string, { leg1: any; leg2: any | null; homeTeamId: string | null; awayTeamId: string | null }[]>();
        let totalCreated = 0;

        for (const stage of stageOrder) {
            const stageMatches = matchesByStage.get(stage) ?? [];
            const ties = stageMatches.length > 0 ? createTiesFromMatches(stageMatches, stage) : [];

            // Use actual tie count or expected count, whichever is larger
            // (create placeholder slots for stages where matches don't exist yet)
            const numTies = ties.length > 0 ? ties.length : (expectedTiesPerStage[stage] ?? 0);

            // Only create placeholder slots for stages that logically follow existing ones
            // e.g., if we have R16 matches, also create QF/SF/Final placeholders
            const hasEarlierStage = stageOrder.some(
                (s, idx) => idx < stageOrder.indexOf(stage) && (matchesByStage.get(s)?.length ?? 0) > 0
            );
            if (ties.length === 0 && !hasEarlierStage && stage !== 'final') continue;

            tiesByStage.set(stage, ties);
            const slotIds: string[] = [];

            for (let pos = 1; pos <= numTies; pos++) {
                const tie = ties[pos - 1] ?? null;
                const slotId = cds.utils.uuid();

                const slotData: Record<string, any> = {
                    ID: slotId,
                    tournament_ID: tournamentId,
                    stage,
                    position: pos,
                    label: stage === 'final' ? 'Final' : `${stageLabels[stage] ?? stage}-${pos}`,
                };

                if (tie) {
                    slotData.homeTeam_ID = tie.homeTeamId ?? null;
                    slotData.awayTeam_ID = tie.awayTeamId ?? null;
                    slotData.leg1_ID = tie.leg1.ID;
                    slotData.leg1ExternalId = tie.leg1.externalId ?? null;
                    if (tie.leg2) slotData.leg2_ID = tie.leg2.ID;
                    if (tie.leg2) slotData.leg2ExternalId = tie.leg2.externalId ?? null;

                    // Compute aggregate scores for finished legs
                    // In two-leg: homeAgg = leg1.homeScore + leg2.awayScore
                    //             awayAgg = leg1.awayScore + leg2.homeScore
                    let homeAgg = 0;
                    let awayAgg = 0;
                    let hasScore = false;

                    if (tie.leg1.status === 'finished' && tie.leg1.homeScore != null) {
                        homeAgg += tie.leg1.homeScore ?? 0;
                        awayAgg += tie.leg1.awayScore ?? 0;
                        hasScore = true;
                    }
                    if (tie.leg2?.status === 'finished' && tie.leg2.homeScore != null) {
                        // leg2 home is tie's away team, leg2 away is tie's home team
                        awayAgg += tie.leg2.homeScore ?? 0;
                        homeAgg += tie.leg2.awayScore ?? 0;
                        hasScore = true;
                    }

                    if (hasScore) {
                        slotData.homeAgg = homeAgg;
                        slotData.awayAgg = awayAgg;
                    }

                    // Determine winner if both legs finished (or single-leg tie)
                    const bothFinished = tie.leg2
                        ? (tie.leg1.status === 'finished' && tie.leg2.status === 'finished')
                        : (tie.leg1.status === 'finished');
                    if (bothFinished && hasScore) {
                        if (homeAgg > awayAgg) {
                            slotData.winner_ID = tie.homeTeamId;
                        } else if (awayAgg > homeAgg) {
                            slotData.winner_ID = tie.awayTeamId;
                        }
                        // Tied aggregate → admin decides (penalties)
                    }
                }

                await INSERT.into(BracketSlot).entries(slotData);
                slotIds.push(slotId);
                totalCreated++;

                // Link matches back to their bracket slot
                if (tie) {
                    await UPDATE(Match).where({ ID: tie.leg1.ID }).set({ bracketSlot_ID: slotId, leg: 1 });
                    if (tie.leg2) {
                        await UPDATE(Match).where({ ID: tie.leg2.ID }).set({ bracketSlot_ID: slotId, leg: 2 });
                    }
                }
            }

            bracketSlotsByStage.set(stage, slotIds);
        }

        // Link bracket tree: use team-based cross-referencing when next-stage ties
        // have known teams, fall back to sequential pairing (now correct due to externalId ordering).
        // This ensures the bracket matches the actual draw (e.g., PSG/Chelsea → QF-1 with
        // Galatasaray/Liverpool, not with Atalanta/Bayern).
        for (let si = 0; si < stageOrder.length - 1; si++) {
            const currentStage = stageOrder[si];
            const nextStage = stageOrder[si + 1];
            const currentSlots = bracketSlotsByStage.get(currentStage) ?? [];
            const nextSlots = bracketSlotsByStage.get(nextStage) ?? [];
            const currentTies = tiesByStage.get(currentStage) ?? [];
            const nextTies = tiesByStage.get(nextStage) ?? [];

            // Try team-based matching: for each next-stage tie that has known teams,
            // find the current-stage tie whose teams match and link them correctly.
            const linkedSlots = new Map<string, { nextSlotId: string; side: string }>();

            for (let ni = 0; ni < nextSlots.length && ni < nextTies.length; ni++) {
                const nextTie = nextTies[ni];
                const nextSlotId = nextSlots[ni];

                // Collect teams known in this next-stage tie
                const nextHomeTeam = nextTie.homeTeamId ?? nextTie.leg1.homeTeam_ID ?? null;
                const nextAwayTeam = nextTie.awayTeamId ?? nextTie.leg1.awayTeam_ID ?? null;

                // Find current-stage slots whose teams match the next-stage home/away
                for (let ci = 0; ci < currentSlots.length && ci < currentTies.length; ci++) {
                    if (linkedSlots.has(currentSlots[ci])) continue;
                    const currentTie = currentTies[ci];
                    const currentTeams = new Set<string>();
                    if (currentTie.homeTeamId) currentTeams.add(currentTie.homeTeamId);
                    if (currentTie.awayTeamId) currentTeams.add(currentTie.awayTeamId);

                    if (nextHomeTeam && currentTeams.has(nextHomeTeam)) {
                        linkedSlots.set(currentSlots[ci], { nextSlotId, side: 'home' });
                    } else if (nextAwayTeam && currentTeams.has(nextAwayTeam)) {
                        linkedSlots.set(currentSlots[ci], { nextSlotId, side: 'away' });
                    }
                }
            }

            // Apply team-based links, then sequential fallback for unmatched slots
            for (let i = 0; i < currentSlots.length; i++) {
                const link = linkedSlots.get(currentSlots[i]);
                if (link) {
                    await UPDATE(BracketSlot).where({ ID: currentSlots[i] }).set({
                        nextSlot_ID: link.nextSlotId,
                        nextSlotSide: link.side,
                    });
                } else if (Math.floor(i / 2) < nextSlots.length) {
                    // Sequential fallback (based on externalId order, which follows the bracket)
                    const nextSlotId = nextSlots[Math.floor(i / 2)];
                    const side: string = (i % 2 === 0) ? 'home' : 'away';
                    await UPDATE(BracketSlot).where({ ID: currentSlots[i] }).set({
                        nextSlot_ID: nextSlotId,
                        nextSlotSide: side,
                    });
                }
            }
        }

        return totalCreated;
    }
}
