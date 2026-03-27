import {
    playerProfileApi,
    playerTeamsApi,
    playerTournamentQueryApi,
} from "@/services/playerApi";
import { composeDisplayName, toCountryCode } from "@/utils/accountProfile";
import type { UserProfile } from "@/types";

export async function getMyPredictionCount(): Promise<number> {
    const { totalCount } = await playerTournamentQueryApi.getMyRecentPredictionsPaged(undefined, 1, 1);
    return totalCount;
}

export async function loadMyProfileBundle(): Promise<{ profile: UserProfile; favoriteTeamOptions: string[] }> {
    const [loaded, teams] = await Promise.all([
        playerProfileApi.getMyProfile(),
        playerTeamsApi.getAll().catch(() => []),
    ]);

    const profile: UserProfile = {
        ...loaded,
        country: toCountryCode(loaded.country || ""),
        displayName: composeDisplayName(loaded.firstName || "", loaded.lastName || "", loaded.displayName || ""),
    };

    const favoriteTeamOptions = [...new Set(teams.map((team) => team.name).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
    );

    return { profile, favoriteTeamOptions };
}

export async function saveMyProfile(draft: UserProfile): Promise<UserProfile> {
    const payload: UserProfile = {
        ...draft,
        country: toCountryCode(draft.country || ""),
        displayName: composeDisplayName(draft.firstName, draft.lastName, draft.displayName),
    };

    const saved = await playerProfileApi.updateMyProfile(payload);

    return {
        ...saved,
        country: toCountryCode(saved.country || ""),
        displayName: composeDisplayName(saved.firstName || "", saved.lastName || "", saved.displayName || ""),
    };
}
