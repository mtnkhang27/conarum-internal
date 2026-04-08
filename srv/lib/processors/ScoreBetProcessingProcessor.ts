import cds from '@sap/cds';

type QueryRunner = Pick<cds.Service, 'run'>;

type ScoreBetProcessingInput = {
    matchId: string;
    tournamentId: string;
    playerId?: string;
    processed: boolean;
};

type ScoreBetScopeRow = {
    ID?: string | null;
};

type MatchScopeRow = {
    homeTeam_ID?: string | null;
    awayTeam_ID?: string | null;
};

type TeamLabelRow = {
    name?: string | null;
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
    matchLabel: string | null;
    processed: boolean;
};

/**
 * Encapsulates score-bet payout processing updates so the admin handler stays
 * focused on request validation and response shaping.
 */
export class ScoreBetProcessingProcessor {
    async setScoreBetProcessingStatus(
        tx: QueryRunner,
        input: ScoreBetProcessingInput
    ): Promise<ScoreBetProcessingSummary> {
        const { Match, Player, ScoreBet, Team, Tournament } = cds.entities('cnma.prediction');

        const match = await tx.run(
            SELECT.one.from(Match)
                .columns('homeTeam_ID', 'awayTeam_ID')
                .where({ ID: input.matchId })
        ) as MatchScopeRow | null;

        const whereClause: Record<string, string | boolean> = {
            match_ID: input.matchId,
            isCorrect: true,
        };

        if (input.playerId) {
            whereClause.player_ID = input.playerId;
        }

        const scopedBets = await tx.run(
            SELECT.from(ScoreBet)
                .columns('ID')
                .where(whereClause)
        ) as ScoreBetScopeRow[];

        const targetIds = scopedBets
            .map((bet) => bet.ID)
            .filter((betId): betId is string => Boolean(betId));

        if (targetIds.length > 0) {
            await tx.run(
                UPDATE(ScoreBet)
                    .where({ ID: { in: targetIds } })
                    .set({ isProcessed: input.processed })
            );
        }

        const [player, tournament, homeTeam, awayTeam] = await Promise.all([
            input.playerId
                ? tx.run(
                    SELECT.one.from(Player)
                        .columns('displayName')
                        .where({ ID: input.playerId })
                ) as Promise<PlayerLabelRow | null>
                : Promise.resolve(null),
            tx.run(
                SELECT.one.from(Tournament)
                    .columns('name')
                    .where({ ID: input.tournamentId })
            ) as Promise<TournamentLabelRow | null>,
            match?.homeTeam_ID
                ? tx.run(
                    SELECT.one.from(Team)
                        .columns('name')
                        .where({ ID: match.homeTeam_ID })
                ) as Promise<TeamLabelRow | null>
                : Promise.resolve(null),
            match?.awayTeam_ID
                ? tx.run(
                    SELECT.one.from(Team)
                        .columns('name')
                        .where({ ID: match.awayTeam_ID })
                ) as Promise<TeamLabelRow | null>
                : Promise.resolve(null),
        ]);

        const homeTeamName = homeTeam?.name?.trim();
        const awayTeamName = awayTeam?.name?.trim();

        return {
            processedCount: targetIds.length,
            playerName: player?.displayName ?? null,
            tournamentName: tournament?.name ?? null,
            matchLabel: homeTeamName && awayTeamName
                ? `${homeTeamName} vs ${awayTeamName}`
                : null,
            processed: input.processed,
        };
    }
}
