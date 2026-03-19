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
