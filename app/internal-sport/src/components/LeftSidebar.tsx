import { NavLink, useLocation } from "react-router-dom";
import { Trophy, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { playerTournamentsApi } from "@/services/playerApi";
import type { TournamentInfo } from "@/types";

function statusClass(active: boolean) {
    return active
        ? "block w-full border-l-4 border-primary px-4 py-2 text-sm text-foreground"
        : "block w-full border-l-4 border-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface";
}

export function LeftSidebar() {
    const { pathname } = useLocation();
    const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);

    useEffect(() => {
        playerTournamentsApi.getAll()
            .then(setTournaments)
            .catch(() => {});
    }, []);

    const infoMessages: Record<string, string> = {
        "/tournament-champion": "Admin managed rewards.",
        "/my-predictions": "Track submitted and draft picks without live result comparison.",
        "/recent-predictions": "Your most recent predictions across all tournaments.",
        "/leaderboard": "Leaderboard can be updated manually by admin.",
        default: "Realtime results are hidden in manual mode.",
    };

    return (
        <aside className="hidden w-[240px] flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-dark lg:flex">
            {/* Tournament Focus */}
            <div className="border-b border-border p-4">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Tournaments
                </h3>
                <ul className="space-y-1 text-sm">
                    {tournaments.map((t) => (
                        <li key={t.ID}>
                            <a href="#" className="group flex items-center rounded px-2 py-2 text-muted-foreground transition-colors hover:bg-surface hover:text-white">
                                <Trophy className="mr-3 h-4 w-4 text-primary" />
                                <div className="flex-1 min-w-0">
                                    <span className="block truncate text-xs font-medium">{t.name}</span>
                                    <span className={`text-[9px] font-bold uppercase ${t.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                                        {t.status}
                                    </span>
                                </div>
                            </a>
                        </li>
                    ))}
                    {tournaments.length === 0 && (
                        <li className="px-2 py-2 text-xs text-muted-foreground">Loading…</li>
                    )}
                </ul>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto">
                <div className="py-2">
                    <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Navigation
                    </div>

                    <NavLink to="/available" className={statusClass(pathname === "/available")}>
                        <span className="truncate">Available Matches</span>
                    </NavLink>
                    <NavLink to="/completed" className={statusClass(pathname === "/completed")}>
                        <span className="truncate">Completed Matches</span>
                    </NavLink>
                    <NavLink to="/recent-predictions" className={statusClass(pathname === "/recent-predictions")}>
                        <span className="truncate">Recent Predictions</span>
                    </NavLink>
                    <NavLink to="/leaderboard" className={statusClass(pathname === "/leaderboard")}>
                        <span className="truncate">Leaderboard</span>
                    </NavLink>
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
