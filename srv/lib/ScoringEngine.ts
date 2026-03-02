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
     * Simple: if correct, payout = prize from config.
     */
    calculateScoreBetPayout(config: any): number {
        return Number(config?.prize ?? 200000);
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
