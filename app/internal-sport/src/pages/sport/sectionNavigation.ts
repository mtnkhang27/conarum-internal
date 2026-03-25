export const SECTION = {
    leaderboard: "leaderboard",
    bracket: "bracket",
    matches: "matches",
    completed: "completed",
    recent: "recent",
} as const;

export function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
