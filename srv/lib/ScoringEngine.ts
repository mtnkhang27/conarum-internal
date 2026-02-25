/**
 * ScoringEngine — Pure stateless scoring logic.
 * No DB access, no side effects. Fully testable.
 */
export class ScoringEngine {

    /**
     * Determine match outcome from scores.
     */
    static determineOutcome(homeScore: number, awayScore: number): 'home' | 'draw' | 'away' {
        if (homeScore > awayScore) return 'home';
        if (homeScore < awayScore) return 'away';
        return 'draw';
    }

    /**
     * Score a single UC2 prediction.
     * Returns points earned based on config.
     *
     * Formula: Points = BasePoints × MatchWeight
     */
    scorePrediction(
        pick: string,
        actualOutcome: string,
        matchWeight: number,
        config: any
    ): number {
        const pointsForWin = Number(config?.pointsForWin ?? 3);
        const pointsForDraw = Number(config?.pointsForDraw ?? 1);
        const pointsForLose = Number(config?.pointsForLose ?? 0);
        const weight = Number(matchWeight) || 1;

        if (pick === actualOutcome) {
            return pointsForWin * weight;
        }

        // Partial credit: if actual is draw and user predicted something else,
        // or user predicted draw and actual is something else
        // (configurable — default: only exact match gets full points)
        if (pick === 'draw' || actualOutcome === 'draw') {
            return pointsForDraw * weight;
        }

        return pointsForLose * weight;
    }

    /**
     * Calculate UC1 score bet payout.
     *
     * Formula: Payout = BaseReward × DuplicateMultiplier × BonusMultiplier × (1 - PlatformFee/100)
     */
    calculateScoreBetPayout(
        bet: any,
        allBetsForMatch: any[],
        config: any
    ): number {
        const baseReward = Number(config?.baseReward ?? 200000);
        const bonusMultiplier = Number(config?.bonusMultiplier ?? 1.5);
        const platformFee = Number(config?.platformFee ?? 5);
        const duplicateMultiplier = Number(config?.duplicateMultiplier ?? 2.0);

        // Count how many times this player bet on the same score for this match
        const duplicateCount = allBetsForMatch.filter(
            (b: any) =>
                b.player_ID === bet.player_ID
                && b.predictedHomeScore === bet.predictedHomeScore
                && b.predictedAwayScore === bet.predictedAwayScore
        ).length;

        const effectiveMultiplier = duplicateCount > 1 ? duplicateMultiplier : 1;

        const grossPayout = baseReward * effectiveMultiplier * bonusMultiplier;
        const netPayout = grossPayout * (1 - platformFee / 100);

        return Math.round(netPayout);
    }

    /**
     * Calculate win streaks from an array of scored predictions.
     * Predictions should be sorted by match kickoff (chronologically).
     */
    calculateStreaks(predictions: any[]): { currentStreak: number; bestStreak: number } {
        // Sort by scoredAt ascending
        const sorted = [...predictions].sort((a, b) =>
            new Date(a.scoredAt || 0).getTime() - new Date(b.scoredAt || 0).getTime()
        );

        let currentStreak = 0;
        let bestStreak = 0;
        let runningStreak = 0;

        for (const pred of sorted) {
            if (pred.isCorrect) {
                runningStreak++;
                bestStreak = Math.max(bestStreak, runningStreak);
            } else {
                runningStreak = 0;
            }
        }

        // currentStreak = streak at the end (most recent)
        currentStreak = runningStreak;

        return { currentStreak, bestStreak };
    }
}
