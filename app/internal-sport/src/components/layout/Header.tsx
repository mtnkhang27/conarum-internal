import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Home, Menu, Settings, Trophy, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playerProfileApi } from "@/services/playerApi";
import { isLocalDevAuthBypass } from "@/lib/authMode";

export function Header() {
    const { pathname } = useLocation();
    const [isCompactNavOpen, setIsCompactNavOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(() => {
        if (isLocalDevAuthBypass()) return true;
        return playerProfileApi.getCachedProfile()?.isAdmin ?? false;
    });

    useEffect(() => {
        if (isLocalDevAuthBypass()) {
            setIsAdmin(true);
            return;
        }

        let active = true;
        playerProfileApi
            .refreshMyProfile()
            .then((profile) => {
                if (active) setIsAdmin(profile.isAdmin);
            })
            .catch(() => {
                if (active) setIsAdmin(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        setIsCompactNavOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const mediaQuery = window.matchMedia("(min-width: 640px)");
        const handleViewportChange = (event: MediaQueryListEvent | MediaQueryList) => {
            if (event.matches) {
                setIsCompactNavOpen(false);
            }
        };

        handleViewportChange(mediaQuery);

        const listener = (event: MediaQueryListEvent) => handleViewportChange(event);
        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", listener);
            return () => mediaQuery.removeEventListener("change", listener);
        }

        mediaQuery.addListener(listener);
        return () => mediaQuery.removeListener(listener);
    }, []);

    const topNavItems = [
        {
            label: "Predictions",
            to: "/",
            icon: Trophy,
            isActive: (path: string) => path === "/" || path === "/tournament-champion",
        },
        ...(isAdmin
            ? [{
                label: "Admin",
                to: "/admin/matches",
                icon: Settings,
                isActive: (path: string) => path.startsWith("/admin"),
            }]
            : []),
    ];
    const shouldUseCompactNavToggle = topNavItems.length > 1;
    const getTopNavButtonClasses = (active: boolean, layout: "inline" | "stacked") => {
        const layoutClasses = layout === "stacked"
            ? "flex min-h-12 flex-col items-center justify-center gap-1.5 px-3 py-2 text-center text-xs"
            : "inline-flex min-h-10 items-center gap-2 px-3 py-2 text-sm";

        return `${layoutClasses} rounded-xl font-bold text-white transition-all duration-200 ease-out ${
            active
                ? "bg-gradient-to-r from-primary to-secondary shadow-[0_4px_15px_rgba(109,63,199,0.4)] hover:shadow-[0_6px_25px_rgba(109,63,199,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                : "bg-white/[0.06] text-white/35 hover:bg-white/[0.10] hover:text-white/85"
        }`;
    };

    return (
        <header className="z-30 flex-none border-b border-border bg-surface-dark/95 backdrop-blur-xl">
            <div className="px-3 sm:px-4">
                <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3 lg:gap-8">
                        {shouldUseCompactNavToggle ? (
                            <button
                                type="button"
                                aria-label={isCompactNavOpen ? "Hide navigation tabs" : "Show navigation tabs"}
                                aria-expanded={isCompactNavOpen}
                                onClick={() => setIsCompactNavOpen((prev) => !prev)}
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors shadow-[0_0_0_1px_rgba(109,63,199,0.12)_inset,0_10px_24px_rgba(8,10,28,0.22)] sm:hidden ${
                                    isCompactNavOpen
                                        ? "border-primary/45 bg-primary/15 text-white"
                                        : "border-primary/20 bg-primary/10 text-primary hover:border-primary/35 hover:bg-primary/14 hover:text-white"
                                }`}
                            >
                                {isCompactNavOpen ? (
                                    <X className="h-4 w-4" />
                                ) : (
                                    <Menu className="h-4 w-4" />
                                )}
                            </button>
                        ) : (
                            <Link
                                to="/"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(109,63,199,0.12)_inset,0_10px_24px_rgba(8,10,28,0.22)] transition-colors hover:border-primary/35 hover:bg-primary/14 hover:text-white sm:hidden"
                            >
                                <Home className="h-5 w-5" />
                            </Link>
                        )}

                        <Link
                            to="/"
                            className="hidden min-w-0 cursor-pointer items-center gap-2 whitespace-nowrap text-xl font-bold tracking-tight transition-opacity hover:opacity-80 sm:flex"
                        >
                            <Home className="h-7 w-7 flex-shrink-0 text-primary" />
                            <span>
                                <span className="text-white">Sport </span>
                                <span className="text-gradient">Predictor</span>
                            </span>
                        </Link>

                        <nav className="hidden items-center space-x-4 text-sm font-medium text-muted-foreground lg:flex">
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

                    <div className="flex items-center gap-2 sm:gap-3">
                        <NavLink to="/account">
                            {({ isActive }) => (
                                <Button
                                    size="sm"
                                    className={`h-9 gap-1.5 px-3 font-bold shadow-lg transition-colors ${
                                        isActive
                                            ? "bg-secondary hover:bg-secondary/80"
                                            : "bg-primary hover:bg-primary/80"
                                    }`}
                                >
                                    <User className="h-4 w-4" />
                                    <span className="hidden sm:inline">Account</span>
                                </Button>
                            )}
                        </NavLink>
                    </div>
                </div>

                <div className="no-scrollbar hidden gap-2 overflow-x-auto pb-3 sm:flex lg:hidden">
                    {topNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = item.isActive(pathname);

                        return (
                            <Link
                                key={item.label}
                                to={item.to}
                                className={getTopNavButtonClasses(active, "inline")}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {shouldUseCompactNavToggle && (
                    <div
                        className={`overflow-hidden transition-[max-height,opacity,padding] duration-200 sm:hidden ${
                            isCompactNavOpen ? "max-h-32 pb-3 opacity-100" : "max-h-0 opacity-0"
                        }`}
                    >
                        <div
                            className="grid gap-2 px-0.5"
                            style={{
                                gridTemplateColumns: `repeat(${topNavItems.length}, minmax(0, 1fr))`,
                            }}
                        >
                            {topNavItems.map((item) => {
                                const Icon = item.icon;
                                const active = item.isActive(pathname);

                                return (
                                    <Link
                                        key={item.label}
                                        to={item.to}
                                        className={getTopNavButtonClasses(active, "stacked")}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
