import cds from '@sap/cds';

type MaterializeResult = {
    slotId: string | null;
    movedPredictions: number;
    movedScoreBets: number;
};

/**
 * Moves unresolved slot-based bets into concrete match-based bets once the match exists.
 * The operation is idempotent and safe to call multiple times.
 */
export async function materializeSlotBetsForMatch(matchId: string): Promise<MaterializeResult> {
    const {
        Match,
        Prediction,
        ScoreBet,
        MatchScoreBetConfig,
        SlotPrediction,
        SlotScoreBet,
    } = cds.entities('cnma.prediction') as any;

    if (!matchId) {
        return { slotId: null, movedPredictions: 0, movedScoreBets: 0 };
    }

    const match = await SELECT.one.from(Match).where({ ID: matchId });
    const slotId = match?.bracketSlot_ID ?? null;
    if (!slotId) {
        return { slotId: null, movedPredictions: 0, movedScoreBets: 0 };
    }

    const [slotPredictions, slotScoreBets] = await Promise.all([
        SELECT.from(SlotPrediction).where({ slot_ID: slotId }),
        SELECT.from(SlotScoreBet).where({ slot_ID: slotId }),
    ]);

    if ((slotPredictions?.length ?? 0) === 0 && (slotScoreBets?.length ?? 0) === 0) {
        return { slotId, movedPredictions: 0, movedScoreBets: 0 };
    }

    let movedPredictions = 0;
    let movedScoreBets = 0;
    const nowIso = new Date().toISOString();

    for (const sp of slotPredictions ?? []) {
        const existing = await SELECT.one.from(Prediction).where({
            player_ID: sp.player_ID,
            match_ID: matchId,
        });

        if (!existing) {
            await INSERT.into(Prediction).entries({
                player_ID: sp.player_ID,
                match_ID: matchId,
                tournament_ID: match.tournament_ID ?? sp.tournament_ID ?? null,
                pick: sp.pick,
                status: 'submitted',
                submittedAt: sp.submittedAt ?? nowIso,
            });
            movedPredictions++;
        }
    }

    const scoreBetCfg = await SELECT.one.from(MatchScoreBetConfig).where({ match_ID: matchId });
    const materializableSlotScoreBets = scoreBetCfg?.enabled ? slotScoreBets ?? [] : [];

    const scoreBetsByPlayer = new Map<string, any[]>();
    for (const sb of materializableSlotScoreBets) {
        const list = scoreBetsByPlayer.get(sb.player_ID) ?? [];
        list.push(sb);
        scoreBetsByPlayer.set(sb.player_ID, list);
    }

    for (const [playerId, bets] of scoreBetsByPlayer.entries()) {
        const existing = await SELECT.from(ScoreBet)
            .columns('ID')
            .where({ player_ID: playerId, match_ID: matchId });

        if ((existing?.length ?? 0) > 0) continue;

        for (const sb of bets) {
            await INSERT.into(ScoreBet).entries({
                player_ID: playerId,
                match_ID: matchId,
                predictedHomeScore: sb.predictedHomeScore,
                predictedAwayScore: sb.predictedAwayScore,
                status: 'pending',
                submittedAt: sb.submittedAt ?? nowIso,
                isCorrect: sb.isCorrect ?? null,
            });
            movedScoreBets++;
        }
    }

    await Promise.all([
        DELETE.from(SlotPrediction).where({ slot_ID: slotId }),
        DELETE.from(SlotScoreBet).where({ slot_ID: slotId }),
    ]);

    return { slotId, movedPredictions, movedScoreBets };
}
