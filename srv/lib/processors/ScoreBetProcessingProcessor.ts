import cds from '@sap/cds';

type QueryRunner = Pick<cds.Service, 'run'>;

type ScoreBetProcessingInput = {
    playerId: string;
    tournamentId: string;
    processed: boolean;
};

type ScoreBetScopeRow = {
    ID?: string | null;
    match_ID?: string | null;
    isProcessed?: boolean | null;
};

type MatchScopeRow = {
    ID?: string | null;
};

type PlayerLabelRow = {
    displayName?: string | null;
};

type TournamentLabelRow = {
    name?: string | null;
};

export type ScoreBetProcessingSummary = {
    processedCount: number;
    playerName: string | null;
    tournamentName: string | null;
    processed: boolean;
};

/**
 * Encapsulates score-bet payout processing updates so the admin handler stays
 * focused on request validation and response shaping.
 */
export class ScoreBetProcessingProcessor {
    async setPlayerScoreBetsProcessed(
        tx: QueryRunner,
        input: ScoreBetProcessingInput
    ): Promise<ScoreBetProcessingSummary> {
        const { ScoreBet, Match, Player, Tournament } = cds.entities('cnma.prediction');

        const scopedBets = await tx.run(
            SELECT.from(ScoreBet)
                .columns('ID', 'match_ID', 'isProcessed')
                .where({
                    player_ID: input.playerId,
                    isCorrect: true,
                })
        ) as ScoreBetScopeRow[];

        const candidateMatchIds = scopedBets
            .map((bet) => bet.match_ID)
            .filter((matchId): matchId is string => Boolean(matchId));

        let scopedMatchIds = new Set<string>();
        if (candidateMatchIds.length > 0) {
            const tournamentMatches = await tx.run(
                SELECT.from(Match)
                    .columns('ID')
                    .where({
                        ID: { in: candidateMatchIds },
                        tournament_ID: input.tournamentId,
                    })
            ) as MatchScopeRow[];

            scopedMatchIds = new Set(
                tournamentMatches
                    .map((match) => match.ID)
                    .filter((matchId): matchId is string => Boolean(matchId))
            );
        }

        const targetIds = scopedBets
            .filter((bet) => Boolean(bet.ID) && Boolean(bet.match_ID) && scopedMatchIds.has(bet.match_ID as string))
            .map((bet) => bet.ID as string);

        if (targetIds.length > 0) {
            await tx.run(
                UPDATE(ScoreBet)
                    .where({ ID: { in: targetIds } })
                    .set({ isProcessed: input.processed })
            );
        }

        const [player, tournament] = await Promise.all([
            tx.run(
                SELECT.one.from(Player)
                    .columns('displayName')
                    .where({ ID: input.playerId })
            ) as Promise<PlayerLabelRow | null>,
            tx.run(
                SELECT.one.from(Tournament)
                    .columns('name')
                    .where({ ID: input.tournamentId })
            ) as Promise<TournamentLabelRow | null>,
        ]);

        return {
            processedCount: targetIds.length,
            playerName: player?.displayName ?? null,
            tournamentName: tournament?.name ?? null,
            processed: input.processed,
        };
    }
}
