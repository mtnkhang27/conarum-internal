import { Link, useLocation } from "react-router-dom";
import {
    BarChart3,
    Calendar,
    Clock,
    Home,
    Shield,
    Trophy,
    Users,
} from "lucide-react";
import { scrollToSection, SECTION } from "@/pages/sport/sectionNavigation";
import { useActiveSection } from "@/hooks/useActiveSection";

const sportNavItems = [
    { section: SECTION.matches, icon: Home, label: "Matches" },
    { section: SECTION.leaderboard, icon: Trophy, label: "Leaders" },
    { section: SECTION.recent, icon: Clock, label: "Mine" },
    { section: SECTION.completed, icon: BarChart3, label: "Results" },
];

const adminNavItems = [
    { to: "/admin/tournaments", icon: Trophy, label: "Tours" },
    { to: "/admin/teams", icon: Shield, label: "Teams" },
    { to: "/admin/matches", icon: Calendar, label: "Matches" },
    { to: "/admin/players", icon: Users, label: "Players" },
];

export function MobileBottomNav() {
    const { pathname } = useLocation();
    const { activeSection, setActiveSection } = useActiveSection();
    const isOnSportPage = pathname === "/";
    const isAdminRoute = pathname.startsWith("/admin");

    if (!isOnSportPage && !isAdminRoute) {
        return null;
    }

    const handleSportClick = (e: React.MouseEvent, sectionId: string) => {
        if (!isOnSportPage) return;
        e.preventDefault();
        scrollToSection(sectionId);
        setActiveSection(sectionId);
    };

    return (
        <div className="mobile-nav-shell fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-dark/95 backdrop-blur-xl xl:hidden">
            <div
                className="mx-auto grid max-w-screen-xl gap-1 px-2 pt-2"
                style={{
                    gridTemplateColumns: `repeat(${isAdminRoute ? adminNavItems.length : sportNavItems.length}, minmax(0, 1fr))`,
                }}
            >
                {isAdminRoute
                    ? adminNavItems.map((item) => {
                        const isActive =
                            pathname === item.to || pathname.startsWith(`${item.to}/`);

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-center transition-colors ${
                                    isActive
                                        ? "bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(109,63,199,0.18)_inset]"
                                        : "text-muted-foreground hover:bg-surface/70 hover:text-white"
                                }`}
                            >
                                <item.icon className="h-5 w-5" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })
                    : sportNavItems.map((item) => {
                        const isActive =
                            activeSection === item.section ||
                            (activeSection === "" && item.section === SECTION.matches);

                        return (
                            <a
                                key={item.section}
                                href={`/#${item.section}`}
                                onClick={(e) => handleSportClick(e, item.section)}
                                className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-center transition-colors ${
                                    isActive
                                        ? "bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(109,63,199,0.18)_inset]"
                                        : "text-muted-foreground hover:bg-surface/70 hover:text-white"
                                }`}
                            >
                                <item.icon className="h-5 w-5" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                    {item.label}
                                </span>
                            </a>
                        );
                    })}
            </div>
        </div>
    );
}
