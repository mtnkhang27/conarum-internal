import { NavLink } from "react-router-dom";
import { Home, BarChart3, Trophy, Clock } from "lucide-react";

const navItems = [
    { to: "/available", icon: Home, label: "Home" },
    { to: "/recent-predictions", icon: Clock, label: "Recent" },
    { to: "/leaderboard", icon: Trophy, label: "Leaders" },
    { to: "/completed", icon: BarChart3, label: "Results" },
];

export function MobileBottomNav() {
    return (
        <div className="fixed bottom-0 z-40 flex w-full items-center justify-around border-t border-border bg-surface-dark px-4 py-2 xl:hidden">
            {navItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `relative flex flex-col items-center gap-1 ${isActive ? "text-primary" : "text-muted-foreground"
                        }`
                    }
                >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[9px] font-bold uppercase">{item.label}</span>
                </NavLink>
            ))}
        </div>
    );
}
