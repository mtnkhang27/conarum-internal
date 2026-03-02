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
        timeLabel: "Today / 22:00",
        home: { name: "Argentina", flag: "ar" },
        away: { name: "France", flag: "fr" },
        options: ["Argentina", "Draw", "France"],
        selectedOption: "Argentina",
    },
    {
        id: "bra-kor",
        timeLabel: "Today / 18:00",
        home: { name: "Brazil", flag: "br" },
        away: { name: "Korea Rep.", flag: "kr" },
        options: ["Brazil", "Draw", "Korea Rep."],
        selectedOption: "",
    },
    {
        id: "jpn-cro",
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
        pick: "",
        isSoon: true,
    },
    {
        id: "arg-fra-upcoming",
        home: { name: "Argentina", flag: "ar" },
        away: { name: "France", flag: "fr" },
        kickoff: "Today / 22:00",
        stage: "Final",
        pick: "Argentina",
        isSoon: true,
    },
    {
        id: "jpn-cro-upcoming",
        home: { name: "Japan", flag: "jp" },
        away: { name: "Croatia", flag: "hr" },
        kickoff: "Tomorrow / 14:00",
        stage: "Round of 16",
        pick: "",
        isSoon: false,
    },
    {
        id: "eng-fra-upcoming",
        home: { name: "England", flag: "gb-eng" },
        away: { name: "France", flag: "fr" },
        kickoff: "Tomorrow / 20:00",
        stage: "Quarter Final",
        pick: "France",
        isSoon: false,
    },
    {
        id: "por-mar-upcoming",
        home: { name: "Portugal", flag: "pt" },
        away: { name: "Morocco", flag: "ma" },
        kickoff: "Dec 10 / 22:00",
        stage: "Quarter Final",
        pick: "",
        isSoon: false,
    },
];

export const completedMatches: Match[] = [
    {
        id: "qat-ecu",
        timeLabel: "Locked",
        home: { name: "Qatar", flag: "qa" },
        away: { name: "Ecuador", flag: "ec" },
        options: ["Qatar", "Draw", "Ecuador"],
        selectedOption: "Ecuador",
    },
    {
        id: "eng-irn",
        timeLabel: "Locked",
        home: { name: "England", flag: "gb" },
        away: { name: "Iran", flag: "ir" },
        options: ["England", "Draw", "Iran"],
        selectedOption: "England",
    },
    {
        id: "arg-fra-final",
        timeLabel: "Locked",
        home: { name: "Argentina", flag: "ar" },
        away: { name: "France", flag: "fr" },
        options: ["Argentina", "Draw", "France"],
        selectedOption: "Argentina",
    },
];

export const liveMatches: LiveMatch[] = [
    { match: "Qatar vs Ecuador", minute: "2H 45'", score: "0 - 2" },
    { match: "England vs Iran", minute: "1H 15'", score: "1 - 0" },
];

export const exactScoreMatches: ExactScoreMatch[] = [
    {
        id: "arg-fra-es",
        timeLabel: "Today / 22:00",
        home: { name: "Argentina", flag: "ar" },
        away: { name: "France", flag: "fr" },
        defaultScore: { home: 2, away: 1 },
    },
    {
        id: "bra-kor-es",
        timeLabel: "Today / 18:00",
        home: { name: "Brazil", flag: "br" },
        away: { name: "Korea Rep.", flag: "kr" },
        defaultScore: { home: 3, away: 1 },
    },
    {
        id: "jpn-cro-es",
        timeLabel: "Tomorrow / 14:00",
        home: { name: "Japan", flag: "jp" },
        away: { name: "Croatia", flag: "hr" },
        defaultScore: { home: 1, away: 1 },
    },
];

export const slipItems: SlipItem[] = [
    { match: "Argentina vs France", pick: "Argentina" },
    { match: "Brazil vs Korea Republic", pick: "Brazil" },
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
    { id: "arg-fra-final", match: "Argentina vs France", kickoff: "Dec 18 / 22:00", predictionType: "Match Winner", pick: "Argentina", submissionStatus: "submitted" },
    { id: "eng-irn", match: "England vs Iran", kickoff: "Nov 21 / 20:00", predictionType: "Match Winner", pick: "England", submissionStatus: "submitted" },
    { id: "jpn-cro", match: "Japan vs Croatia", kickoff: "Dec 05 / 22:00", predictionType: "Match Winner", pick: "Japan", submissionStatus: "submitted" },
    { id: "bra-kor", match: "Brazil vs Korea Republic", kickoff: "Dec 05 / 02:00", predictionType: "Match Winner", pick: "Brazil", submissionStatus: "submitted" },
    { id: "ned-usa", match: "Netherlands vs USA", kickoff: "Dec 03 / 22:00", predictionType: "Match Winner", pick: "Draw", submissionStatus: "submitted" },
    { id: "por-sui", match: "Portugal vs Switzerland", kickoff: "Dec 06 / 22:00", predictionType: "Match Winner", pick: "Portugal", submissionStatus: "submitted" },
    { id: "arg-fra-es", match: "Argentina vs France", kickoff: "Dec 18 / 22:00", predictionType: "Exact Score", pick: "2 - 1", submissionStatus: "submitted" },
    { id: "bra-kor-es", match: "Brazil vs Korea Republic", kickoff: "Dec 05 / 02:00", predictionType: "Exact Score", pick: "3 - 1", submissionStatus: "submitted" },
    { id: "jpn-cro-es", match: "Japan vs Croatia", kickoff: "Dec 05 / 22:00", predictionType: "Exact Score", pick: "1 - 1", submissionStatus: "draft" },
];

export const leaderboardEntries: LeaderboardEntry[] = [
    { rank: 1, name: "Alex Carter", flag: "gb", correctPicks: 34, totalPicks: 42, accuracy: 81, points: 34, streak: 8 },
    { rank: 2, name: "Minh Tran", flag: "vn", correctPicks: 33, totalPicks: 42, accuracy: 79, points: 33, streak: 6 },
    { rank: 3, name: "Sofia Rossi", flag: "it", correctPicks: 32, totalPicks: 41, accuracy: 78, points: 32, streak: 4 },
    { rank: 4, name: "Mateo Silva", flag: "br", correctPicks: 31, totalPicks: 41, accuracy: 76, points: 31, streak: 5 },
    { rank: 5, name: "Nina Muller", flag: "de", correctPicks: 30, totalPicks: 40, accuracy: 75, points: 30, streak: 3 },
    { rank: 6, name: "Ethan Brooks", flag: "us", correctPicks: 29, totalPicks: 40, accuracy: 73, points: 29, streak: 2 },
    { rank: 7, name: "You", flag: "vn", correctPicks: 17, totalPicks: 25, accuracy: 68, points: 17, streak: 2, isYou: true },
    { rank: 8, name: "Noah Kim", flag: "kr", correctPicks: 16, totalPicks: 25, accuracy: 64, points: 16, streak: 1 },
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
