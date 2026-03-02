/**
 * ScoringEngine — Pure stateless scoring logic.
 * No DB access, no side effects. Fully testable.
 *
 * UC2 scoring: correct prediction = 1 point, wrong = 0 (no weight).
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
     * Returns 1 if correct, 0 if wrong. Simple, no weight.
     */
    scorePrediction(
        pick: string,
        actualOutcome: string,
        config: any
    ): number {
        const pointsForCorrect = Number(config?.pointsForCorrect ?? 1);

        if (pick === actualOutcome) {
            return pointsForCorrect;
        }

        return 0;
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
