import { useLocation } from "react-router-dom";
import { Trophy, BarChart3, Home, Clock } from "lucide-react";
import { scrollToSection, SECTION } from "@/pages/SportPage";
import { useActiveSection } from "@/hooks/useActiveSection";

const navItems = [
    { section: SECTION.leaderboard, icon: Trophy, label: "Leaders" },
    { section: SECTION.matches, icon: Home, label: "Matches" },
    { section: SECTION.completed, icon: BarChart3, label: "Results" },
    { section: SECTION.recent, icon: Clock, label: "Mine" },
];

export function MobileBottomNav() {
    const { pathname } = useLocation();
    const { activeSection, setActiveSection } = useActiveSection();
    const isOnSportPage = pathname === "/";

    const handleClick = (e: React.MouseEvent, sectionId: string) => {
        if (isOnSportPage) {
            e.preventDefault();
            scrollToSection(sectionId);
            setActiveSection(sectionId);
        }
    };

    return (
        <div className="fixed bottom-0 z-40 flex w-full items-center justify-around border-t border-border bg-surface-dark px-4 py-2 xl:hidden">
            {navItems.map((item) => {
                const isActive =
                    isOnSportPage &&
                    (activeSection === item.section ||
                        (activeSection === "" && item.section === SECTION.matches));
                return (
                    <a
                        key={item.section}
                        href={`/#${item.section}`}
                        onClick={(e) => handleClick(e, item.section)}
                        className={`relative flex flex-col items-center gap-1 ${
                            isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[9px] font-bold uppercase">{item.label}</span>
                    </a>
                );
            })}
        </div>
    );
}

