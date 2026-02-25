import type {
    Match,
    UpcomingMatch,
    LiveMatch,
    ExactScoreMatch,
    SlipItem,
    ChampionTeam,
    PredictionSummary,
    PredictionHistoryItem,
    LeaderboardEntry,
    UserProfile,
} from "@/types";

export const availableMatches: Match[] = [
    {
        id: "arg-fr",
        weight: 1.85,
        timeLabel: "Today / 22:00",
        home: { name: "Argentina", flag: "ar" },
        away: { name: "France", flag: "fr" },
        options: ["Argentina", "Draw", "France"],
        selectedOption: "Argentina",
    },
    {
        id: "bra-kor",
        weight: 1.65,
        timeLabel: "Today / 18:00",
        home: { name: "Brazil", flag: "br" },
        away: { name: "Korea Rep.", flag: "kr" },
        options: ["Brazil", "Draw", "Korea Rep."],
        selectedOption: "",
    },
    {
        id: "jpn-cro",
        weight: 2.1,
        timeLabel: "Tomorrow / 14:00",
        home: { name: "Japan", flag: "jp" },
        away: { name: "Croatia", flag: "hr" },
        options: ["Japan", "Draw", "Croatia"],
        selectedOption: "",
    },
];

export const upcomingKickoffMatches: UpcomingMatch[] = [
    {
        id: "bra-kor-upcoming",
        home: { name: "Brazil", flag: "br" },
        away: { name: "Korea Rep.", flag: "kr" },
        kickoff: "Today / 18:00",
        stage: "Round of 16",
        weight: 1.65,
        pick: "",
        isSoon: true,
    },
    {
        id: "arg-fra-upcoming",
        home: { name: "Argentina", flag: "ar" },
        away: { name: "France", flag: "fr" },
        kickoff: "Today / 22:00",
        stage: "Final",
        weight: 1.85,
        pick: "Argentina",
        isSoon: true,
    },
    {
        id: "jpn-cro-upcoming",
        home: { name: "Japan", flag: "jp" },
        away: { name: "Croatia", flag: "hr" },
        kickoff: "Tomorrow / 14:00",
        stage: "Round of 16",
        weight: 2.1,
        pick: "",
        isSoon: false,
    },
    {
        id: "eng-fra-upcoming",
        home: { name: "England", flag: "gb-eng" },
        away: { name: "France", flag: "fr" },
        kickoff: "Tomorrow / 20:00",
        stage: "Quarter Final",
        weight: 1.95,
        pick: "France",
        isSoon: false,
    },
    {
        id: "por-mar-upcoming",
        home: { name: "Portugal", flag: "pt" },
        away: { name: "Morocco", flag: "ma" },
        kickoff: "Dec 10 / 22:00",
        stage: "Quarter Final",
        weight: 2.05,
        pick: "",
        isSoon: false,
    },
];

export const completedMatches: Match[] = [
    {
        id: "qat-ecu",
        weight: 14,
        timeLabel: "Locked",
        home: { name: "Qatar", flag: "qa" },
        away: { name: "Ecuador", flag: "ec" },
        options: ["Qatar", "Draw", "Ecuador"],
        selectedOption: "Ecuador",
    },
    {
        id: "eng-irn",
        weight: 1.25,
        timeLabel: "Locked",
        home: { name: "England", flag: "gb" },
        away: { name: "Iran", flag: "ir" },
        options: ["England", "Draw", "Iran"],
        selectedOption: "England",
    },
    {
        id: "arg-fra-final",
        weight: 1.85,
        timeLabel: "Locked",
        home: { name: "Argentina", flag: "ar" },
        away: { name: "France", flag: "fr" },
        options: ["Argentina", "Draw", "France"],
        selectedOption: "Argentina",
    },
];

export const liveMatches: LiveMatch[] = [
    { match: "Qatar vs Ecuador", minute: "2H 45'", weight: 14, score: "0 - 2" },
    { match: "England vs Iran", minute: "1H 15'", weight: 1.25, score: "1 - 0" },
];

export const exactScoreMatches: ExactScoreMatch[] = [
    {
        id: "arg-fra-es",
        weight: 2.9,
        timeLabel: "Today / 22:00",
        home: { name: "Argentina", flag: "ar" },
        away: { name: "France", flag: "fr" },
        defaultScore: { home: 2, away: 1 },
    },
    {
        id: "bra-kor-es",
        weight: 2.35,
        timeLabel: "Today / 18:00",
        home: { name: "Brazil", flag: "br" },
        away: { name: "Korea Rep.", flag: "kr" },
        defaultScore: { home: 3, away: 1 },
    },
    {
        id: "jpn-cro-es",
        weight: 3.1,
        timeLabel: "Tomorrow / 14:00",
        home: { name: "Japan", flag: "jp" },
        away: { name: "Croatia", flag: "hr" },
        defaultScore: { home: 1, away: 1 },
    },
];

export const slipItems: SlipItem[] = [
    { match: "Argentina vs France", pick: "Argentina", weight: 1.85 },
    { match: "Brazil vs Korea Republic", pick: "Brazil", weight: 1.65 },
];

export const championTeams: ChampionTeam[] = [
    { name: "Brazil", flag: "br", confederation: "CONMEBOL", selected: true },
    { name: "France", flag: "fr", confederation: "UEFA", selected: false },
    { name: "Argentina", flag: "ar", confederation: "CONMEBOL", selected: false },
    { name: "England", flag: "gb-eng", confederation: "UEFA", selected: false },
    { name: "Spain", flag: "es", confederation: "UEFA", selected: false },
    { name: "Germany", flag: "de", confederation: "UEFA", selected: false },
    { name: "Netherlands", flag: "nl", confederation: "UEFA", selected: false },
    { name: "Portugal", flag: "pt", confederation: "UEFA", selected: false },
    { name: "Belgium", flag: "be", confederation: "UEFA", selected: false },
    { name: "Croatia", flag: "hr", confederation: "UEFA", selected: false },
    { name: "Denmark", flag: "dk", confederation: "UEFA", selected: false },
    { name: "Uruguay", flag: "uy", confederation: "CONMEBOL", selected: false },
    { name: "Switzerland", flag: "ch", confederation: "UEFA", selected: false },
    { name: "USA", flag: "us", confederation: "CONCACAF", selected: false },
    { name: "Senegal", flag: "sn", confederation: "CAF", selected: false },
    { name: "Mexico", flag: "mx", confederation: "CONCACAF", selected: false },
];

export const myPredictionSummary: PredictionSummary = {
    totalSubmitted: 9,
    winnerPicks: 6,
    exactScorePicks: 3,
    draftPicks: 1,
};

export const myPredictionHistory: PredictionHistoryItem[] = [
    { id: "arg-fra-final", match: "Argentina vs France", kickoff: "Dec 18 / 22:00", predictionType: "Match Winner", pick: "Argentina", weight: 1.85, submissionStatus: "submitted" },
    { id: "eng-irn", match: "England vs Iran", kickoff: "Nov 21 / 20:00", predictionType: "Match Winner", pick: "England", weight: 1.25, submissionStatus: "submitted" },
    { id: "jpn-cro", match: "Japan vs Croatia", kickoff: "Dec 05 / 22:00", predictionType: "Match Winner", pick: "Japan", weight: 2.1, submissionStatus: "submitted" },
    { id: "bra-kor", match: "Brazil vs Korea Republic", kickoff: "Dec 05 / 02:00", predictionType: "Match Winner", pick: "Brazil", weight: 1.65, submissionStatus: "submitted" },
    { id: "ned-usa", match: "Netherlands vs USA", kickoff: "Dec 03 / 22:00", predictionType: "Match Winner", pick: "Draw", weight: 1.4, submissionStatus: "submitted" },
    { id: "por-sui", match: "Portugal vs Switzerland", kickoff: "Dec 06 / 22:00", predictionType: "Match Winner", pick: "Portugal", weight: 1.5, submissionStatus: "submitted" },
    { id: "arg-fra-es", match: "Argentina vs France", kickoff: "Dec 18 / 22:00", predictionType: "Exact Score", pick: "2 - 1", weight: 2.9, submissionStatus: "submitted" },
    { id: "bra-kor-es", match: "Brazil vs Korea Republic", kickoff: "Dec 05 / 02:00", predictionType: "Exact Score", pick: "3 - 1", weight: 2.35, submissionStatus: "submitted" },
    { id: "jpn-cro-es", match: "Japan vs Croatia", kickoff: "Dec 05 / 22:00", predictionType: "Exact Score", pick: "1 - 1", weight: 3.1, submissionStatus: "draft" },
];

export const leaderboardEntries: LeaderboardEntry[] = [
    { rank: 1, name: "Alex Carter", flag: "gb", correctPicks: 34, totalPicks: 42, accuracy: 81, points: 86.75, streak: 8 },
    { rank: 2, name: "Minh Tran", flag: "vn", correctPicks: 33, totalPicks: 42, accuracy: 79, points: 84.9, streak: 6 },
    { rank: 3, name: "Sofia Rossi", flag: "it", correctPicks: 32, totalPicks: 41, accuracy: 78, points: 82.4, streak: 4 },
    { rank: 4, name: "Mateo Silva", flag: "br", correctPicks: 31, totalPicks: 41, accuracy: 76, points: 79.6, streak: 5 },
    { rank: 5, name: "Nina Muller", flag: "de", correctPicks: 30, totalPicks: 40, accuracy: 75, points: 76.85, streak: 3 },
    { rank: 6, name: "Ethan Brooks", flag: "us", correctPicks: 29, totalPicks: 40, accuracy: 73, points: 75.4, streak: 2 },
    { rank: 7, name: "You", flag: "vn", correctPicks: 17, totalPicks: 25, accuracy: 68, points: 42.8, streak: 2, isYou: true },
    { rank: 8, name: "Noah Kim", flag: "kr", correctPicks: 16, totalPicks: 25, accuracy: 64, points: 40.2, streak: 1 },
];

export const defaultProfile: UserProfile = {
    avatarUrl: "",
    displayName: "Nguyen Hien",
    firstName: "Nguyen",
    lastName: "Hien",
    email: "thien@wc-predictor.app",
    phone: "+84 912 345 678",
    country: "Vietnam",
    city: "Ho Chi Minh City",
    timezone: "UTC+07:00",
    favoriteTeam: "Argentina",
    bio: "Football fan, data-driven predictor, and always ready for knockout drama.",
};

/** Map team name → flag ISO code */
export const teamFlagMap: Record<string, string> = {
    Argentina: "ar",
    France: "fr",
    England: "gb-eng",
    Iran: "ir",
    Japan: "jp",
    Croatia: "hr",
    Brazil: "br",
    "Korea Rep.": "kr",
    "Korea Republic": "kr",
    Netherlands: "nl",
    USA: "us",
    Portugal: "pt",
    Switzerland: "ch",
    Morocco: "ma",
    Spain: "es",
    Qatar: "qa",
    Ecuador: "ec",
};
