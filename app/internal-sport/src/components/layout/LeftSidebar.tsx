import { Link, NavLink, useLocation } from "react-router-dom";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { scrollToSection, SECTION } from "@/pages/sport/sectionNavigation";
import { useActiveSection } from "@/hooks/useActiveSection";

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

export function LeftSidebar() {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { activeSection, setActiveSection } = useActiveSection();
    const isOnSportPage = pathname === "/";

    const SECTIONS = [
        { id: SECTION.matches, label: t("nav.matchesAndLive"), dot: "bg-primary" },
        { id: SECTION.leaderboard, label: t("nav.leaderboard"), dot: "bg-yellow-400" },
        { id: SECTION.recent, label: t("nav.myPredictions"), dot: "bg-secondary" },
        { id: SECTION.bracket, label: t("nav.tournamentBracket"), dot: "bg-secondary" },
        { id: SECTION.completed, label: t("nav.completedMatches"), dot: "bg-foreground/30" },
    ] as const;

    const INFO: Record<string, string> = {
        "/tournament-champion": t("nav.adminManagedRewards"),
        default: t("nav.realtimeHidden"),
    };

    return (
        <aside className="hidden w-[240px] flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-dark lg:flex">
            <div className="flex-1 overflow-y-auto">
                <div className="py-2">
                    <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {t("nav.navigation")}
                    </div>

                    {/* Sport page sections */}
                    {SECTIONS.map((s) => {
                        const isActive = isOnSportPage && (activeSection === s.id || (activeSection === "" && s.id === SECTION.matches));
                        return (
                            <Link
                                key={s.id}
                                to={`/#${s.id}`}
                                onClick={(e) => {
                                    if (isOnSportPage) {
                                        e.preventDefault();
                                        scrollToSection(s.id);
                                        setActiveSection(s.id);
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
                        <span className="truncate">{t("nav.tournamentChampion")}</span>
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

