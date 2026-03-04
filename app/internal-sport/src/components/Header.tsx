import { NavLink, Link, useLocation } from "react-router-dom";
import { Trophy, User, Settings, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scrollToSection, SECTION } from "@/pages/SportPage";

const topNavItems = [
    {
        label: "Predictions",
        to: "/",
        icon: Trophy,
        isActive: (p: string) => p === "/" || p === "/tournament-champion",
    },
    {
        label: "Admin",
        to: "/admin/matches",
        icon: Settings,
        isActive: (p: string) => p.startsWith("/admin"),
    },
];

const sportSections = [
    // { id: SECTION.leaderboard, label: "Leaderboard" },
    // { id: SECTION.matches, label: "Matches" },
    // { id: SECTION.completed, label: "Completed" },
    // { id: SECTION.recent, label: "My Predictions" },
    // { id: null, label: "Champion", to: "/tournament-champion" },
] as const;

export function Header() {
    const { pathname, hash } = useLocation();
    const isOnSportPage = pathname === "/";

    return (
        <header className="z-30 flex-none border-b border-border bg-surface-dark">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-4 lg:space-x-8">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
                    >
                        <Home className="h-7 w-7 text-primary" />
                        <span className="hidden sm:inline">
                            <span className="text-white">Sport </span>
                            <span className="text-gradient">Predictor</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden space-x-4 text-sm font-medium text-muted-foreground lg:flex">
                        {topNavItems.map((item) => (
                            <NavLink
                                key={item.label}
                                to={item.to}
                                className={
                                    item.isActive(pathname)
                                        ? "border-b-2 border-primary pb-0.5 font-bold text-white"
                                        : "border-b-2 border-transparent pb-0.5 transition-colors hover:text-primary"
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* Right actions */}
                <div className="flex items-center space-x-3">
                    <NavLink to="/account">
                        {({ isActive }) => (
                            <Button
                                variant={isActive ? "default" : "default"}
                                size="sm"
                                className={`font-bold shadow-lg transition-colors ${
                                    isActive
                                        ? "bg-secondary hover:bg-secondary/80"
                                        : "bg-primary hover:bg-primary/80"
                                }`}
                            >
                                <User className="mr-1 h-4 w-4" />
                                Account
                            </Button>
                        )}
                    </NavLink>
                </div>
            </div>

            {/* Section quick-nav — shown on sport page */}
            {/* {isOnSportPage && (
                <div className="no-scrollbar flex space-x-1 overflow-x-auto border-t border-border bg-surface px-4 text-sm">
                    {sportSections.map((s) => {
                        const isActive = s.id
                            ? hash === `#${s.id}` || (hash === "" && s.id === SECTION.leaderboard)
                            : pathname === s.to;
                        const cls = isActive
                            ? "whitespace-nowrap border-b-2 border-primary py-3 font-bold text-primary"
                            : "whitespace-nowrap border-b-2 border-transparent py-3 text-muted-foreground transition-colors hover:border-border hover:text-white";

                        if (s.id) {
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        scrollToSection(s.id as string);
                                        window.history.replaceState(null, "", `/#${s.id}`);
                                    }}
                                    className={cls}
                                >
                                    {s.label}
                                </button>
                            );
                        }
                        return (
                            <NavLink key={s.label} to={s.to!} className={cls}>
                                {s.label}
                            </NavLink>
                        );
                    })}
                </div>
            )} */}
        </header>
    );
}
