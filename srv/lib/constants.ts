/**
 * Shared mapping constants for football-data.org API integration.
 * Used by both syncMatchResults and importTournament in AdminHandler.
 */

/** football-data.org stage → schema stage */
export const STAGE_MAP: Record<string, string> = {
    LEAGUE_STAGE: 'regular',
    GROUP_STAGE: 'group',
    REGULAR_SEASON: 'regular',
    LAST_32: 'roundOf32',
    LAST_16: 'roundOf16',
    QUARTER_FINALS: 'quarterFinal',
    SEMI_FINALS: 'semiFinal',
    THIRD_PLACE: 'thirdPlace',
    FINAL: 'final',
    PLAY_OFF_ROUND: 'playoff',
    REGULAR: 'regular',
    PLAYOFF: 'playoff',
    RELEGATION: 'relegation',
};

/** football-data.org status → schema status */
export const STATUS_MAP: Record<string, string> = {
    SCHEDULED: 'upcoming',
    TIMED: 'upcoming',
    IN_PLAY: 'live',
    PAUSED: 'live',
    HALFTIME: 'live',
    EXTRA_TIME: 'live',
    PENALTY_SHOOTOUT: 'live',
    FINISHED: 'finished',
    AWARDED: 'finished',
    INTERRUPTED: 'live',
    SUSPENDED: 'cancelled',
    POSTPONED: 'cancelled',
    CANCELLED: 'cancelled',
};

/** football-data.org winner → schema outcome */
export const OUTCOME_MAP: Record<string, string> = {
    HOME_TEAM: 'home',
    AWAY_TEAM: 'away',
    DRAW: 'draw',
};
