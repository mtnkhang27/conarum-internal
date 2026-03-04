import { Link, NavLink, useLocation } from "react-router-dom";
import { Info } from "lucide-react";
import { scrollToSection, SECTION } from "@/pages/SportPage";

function sectionLinkClass(active: boolean) {
    return active
        ? "flex w-full items-center border-l-4 border-primary px-4 py-2 text-sm text-foreground"
        : "flex w-full items-center border-l-4 border-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground";
}

function pageLink(active: boolean) {
    return active
        ? "block w-full border-l-4 border-secondary px-4 py-2 text-sm text-foreground"
        : "block w-full border-l-4 border-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground";
}

const SECTIONS = [
    { id: SECTION.leaderboard, label: "Leaderboard", dot: "bg-yellow-400" },
    { id: SECTION.bracket, label: "Tournament Bracket", dot: "bg-secondary" },
    { id: SECTION.matches, label: "Matches & Live", dot: "bg-primary" },
    { id: SECTION.completed, label: "Completed Matches", dot: "bg-foreground/30" },
    { id: SECTION.recent, label: "My Predictions", dot: "bg-secondary" },
] as const;

const INFO: Record<string, string> = {
    "/tournament-champion": "Admin managed rewards.",
    default: "Realtime results are hidden in manual mode.",
};

export function LeftSidebar() {
    const { pathname, hash } = useLocation();
    const isOnSportPage = pathname === "/";

    return (
        <aside className="hidden w-[240px] flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-dark lg:flex">
            <div className="flex-1 overflow-y-auto">
                <div className="py-2">
                    <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Navigation
                    </div>

                    {/* Sport page sections */}
                    {SECTIONS.map((s) => {
                        const isActive = isOnSportPage && (hash === `#${s.id}` || (hash === "" && s.id === SECTION.leaderboard));
                        return (
                            <Link
                                key={s.id}
                                to={`/#${s.id}`}
                                onClick={(e) => {
                                    if (isOnSportPage) {
                                        e.preventDefault();
                                        scrollToSection(s.id);
                                        // Update hash without full navigation
                                        window.history.replaceState(null, "", `/#${s.id}`);
                                    }
                                }}
                                className={sectionLinkClass(isActive)}
                            >
                                <span className={`mr-2.5 h-2 w-2 flex-shrink-0 rounded-full ${s.dot}`} />
                                <span className="truncate">{s.label}</span>
                            </Link>
                        );
                    })}

                    {/* Divider */}
                    <div className="mx-4 my-2 border-t border-border" />

                    {/* Separate pages */}
                    <NavLink to="/tournament-champion" className={pageLink(pathname === "/tournament-champion")}>
                        <span className="truncate">Tournament Champion</span>
                    </NavLink>
                </div>
            </div>

            {/* Footer info */}
            <div className="border-t border-border bg-surface/50 p-4">
                <p className="flex items-start gap-1 text-[9px] italic text-muted-foreground">
                    <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    {INFO[pathname] ?? INFO.default}
                </p>
            </div>
        </aside>
    );
}
