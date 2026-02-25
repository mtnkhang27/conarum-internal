import { NavLink, useLocation } from "react-router-dom";
import { Trophy, Info, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

function statusClass(active: boolean) {
    return active
        ? "block w-full border-l-4 border-primary px-4 py-2 text-sm text-foreground"
        : "block w-full border-l-4 border-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface";
}

interface FilterCheckboxProps {
    label: string;
}

function FilterCheckbox({ label }: FilterCheckboxProps) {
    return (
        <label className="flex cursor-pointer items-center space-x-2">
            <Checkbox className="h-3 w-3 border-border bg-surface data-[state=checked]:bg-primary" />
            <span className="text-xs text-muted-foreground">{label}</span>
        </label>
    );
}

export function LeftSidebar() {
    const { pathname } = useLocation();
    const isChampionPage = pathname === "/tournament-champion";
    const isExactScorePage = pathname === "/exact-score";
    const isMyPredictionsPage = pathname === "/my-predictions";
    const isLeaderboardPage = pathname === "/leaderboard";

    const filterOptions: Record<string, string[]> = {
        "/tournament-champion": ["UEFA (Europe)", "CONMEBOL (S. America)", "CAF (Africa)", "AFC (Asia)"],
        "/exact-score": ["High Weight Matches", "Both Teams to Score", "Clean Sheet Picks"],
        "/my-predictions": ["Submitted Picks", "Draft Picks", "Winner Picks"],
        "/leaderboard": ["Overall Rank", "Friends League", "Weekly Form"],
        default: ["Group Stage", "Knockout Stage"],
    };

    const currentFilters = filterOptions[pathname] || filterOptions.default;

    const infoMessages: Record<string, string> = {
        "/tournament-champion": "Admin managed rewards.",
        "/exact-score": "Only saved score picks are shown. Final-score comparison is disabled.",
        "/my-predictions": "Track submitted and draft picks without live result comparison.",
        "/leaderboard": "Leaderboard can be updated manually by admin.",
        default: "Realtime results are hidden in manual mode.",
    };

    return (
        <aside className="hidden w-[240px] flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-dark lg:flex">
            {/* Tournament Focus */}
            <div className="border-b border-border p-4">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Tournament Focus
                </h3>
                <ul className="space-y-1 text-sm">
                    <li>
                        <a href="#" className="group flex items-center rounded bg-surface px-2 py-2 text-white transition-colors">
                            <Trophy className="mr-3 h-4 w-4 text-yellow-500" />
                            <span className="truncate">World Cup 2026</span>
                        </a>
                    </li>
                </ul>
            </div>

            {/* Status & Filters */}
            <div className="flex-1 overflow-y-auto">
                <div className="py-2">
                    <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Prediction Status
                    </div>

                    {isChampionPage ? (
                        <div className={statusClass(true)}>
                            <span className="truncate">Select Champion</span>
                        </div>
                    ) : isExactScorePage ? (
                        <NavLink to="/exact-score" className={statusClass(true)}>
                            <span className="truncate">Exact Score Picks</span>
                        </NavLink>
                    ) : isMyPredictionsPage ? (
                        <NavLink to="/my-predictions" className={statusClass(true)}>
                            <span className="truncate">My Predictions</span>
                        </NavLink>
                    ) : isLeaderboardPage ? (
                        <NavLink to="/leaderboard" className={statusClass(true)}>
                            <span className="truncate">Top Players</span>
                        </NavLink>
                    ) : (
                        <>
                            <NavLink to="/available" className={statusClass(pathname === "/available")}>
                                <span className="truncate">Available Matches</span>
                            </NavLink>
                            <NavLink to="/completed" className={statusClass(pathname === "/completed")}>
                                <span className="truncate">Submitted Picks</span>
                            </NavLink>
                        </>
                    )}

                    <div className="mt-4 flex items-center gap-1 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Filter className="h-3 w-3" />
                        Filters
                    </div>

                    <div className="space-y-2 px-4">
                        {currentFilters.map((label) => (
                            <FilterCheckbox key={label} label={label} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer info */}
            <div className="border-t border-border bg-surface/50 p-4">
                <p className="flex items-start gap-1 text-[9px] italic text-muted-foreground">
                    <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    {infoMessages[pathname] || infoMessages.default}
                </p>
            </div>
        </aside>
    );
}
