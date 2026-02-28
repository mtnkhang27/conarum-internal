import { NavLink, useLocation } from "react-router-dom";
import { Trophy, User, BarChart3, Home, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const worldCupRoutes = ["/available", "/completed", "/tournament-champion"];

const topNavItems = [
    {
        label: "World Cup 2026",
        to: "/available",
        icon: Trophy,
        isActive: (p: string) => worldCupRoutes.includes(p),
    },
    {
        label: "My Predictions",
        to: "/my-predictions",
        icon: BarChart3,
        isActive: (p: string) => p === "/my-predictions",
    },
    {
        label: "Leaderboard",
        to: "/leaderboard",
        icon: BarChart3,
        isActive: (p: string) => p === "/leaderboard",
    },
    {
        label: "Admin",
        to: "/admin/matches",
        icon: Settings,
        isActive: (p: string) => p.startsWith("/admin"),
    },
];

const modeTabs = [
    { label: "Match Predictions", to: "/available", isActive: (p: string) => p === "/available" || p === "/completed" },
    { label: "Tournament Champion", to: "/tournament-champion", isActive: (p: string) => p === "/tournament-champion" },
];

export function Header() {
    const { pathname } = useLocation();
    const showModeTabs = worldCupRoutes.includes(pathname);

    return (
        <header className="z-30 flex-none border-b border-border bg-surface-dark">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-4 lg:space-x-8">
                    {/* Logo */}
                    <NavLink
                        to="/available"
                        className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
                    >
                        <Home className="h-7 w-7 text-primary" />
                        <span className="hidden sm:inline">
                            <span className="text-white">WC </span>
                            <span className="text-gradient">Predictor</span>
                        </span>
                    </NavLink>

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
                                className={`font-bold shadow-lg transition-colors ${isActive
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

            {/* Mode tabs */}
            {showModeTabs && (
                <div className="no-scrollbar flex space-x-6 overflow-x-auto border-t border-border bg-surface px-4 text-sm">
                    {modeTabs.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            className={
                                item.isActive(pathname)
                                    ? "whitespace-nowrap border-b-2 border-primary py-3 font-bold text-primary"
                                    : "whitespace-nowrap border-b-2 border-transparent py-3 text-muted-foreground transition-colors hover:border-border hover:text-white"
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            )}
        </header>
    );
}
