import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { playerProfileApi } from "@/services/playerApi";
import { isLocalDevAuthBypass } from "@/lib/authMode";
import {
    Banknote,
    Calendar,
    Shield,
    Trophy,
    Users,
} from "lucide-react";

const adminNavItems = [
    { label: "Tournaments", to: "/admin/tournaments", icon: Trophy },
    { label: "Teams", to: "/admin/teams", icon: Shield },
    { label: "Matches", to: "/admin/matches", icon: Calendar },
    { label: "Players", to: "/admin/players", icon: Users },
    { label: "Payouts", to: "/admin/payouts", icon: Banknote },
];

export function AdminLayout() {
    const { pathname } = useLocation();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(() => {
        if (isLocalDevAuthBypass()) return true;
        const cached = playerProfileApi.getCachedProfile();
        return cached ? cached.isAdmin : null;
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

    if (isAdmin === null) {
        return (
            <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
                Checking admin access...
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="flex h-screen flex-col">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {/* Admin Sidebar */}
                <aside className="hidden w-[220px] flex-shrink-0 flex-col border-r border-border bg-surface-dark lg:flex">
                    <div className="border-b border-border p-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Admin Panel
                        </h3>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-2">
                        {adminNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.to || pathname.startsWith(item.to + "/");
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={
                                        isActive
                                            ? "flex items-center gap-3 border-l-4 border-primary bg-surface px-4 py-2.5 text-sm font-medium text-white"
                                            : "flex items-center gap-3 border-l-4 border-transparent px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-white"
                                    }
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </nav>

                    <div className="border-t border-border p-4">
                        <NavLink
                            to="/"
                            className="text-xs text-muted-foreground transition-colors hover:text-primary"
                        >
                            Back to Player View
                        </NavLink>
                    </div>
                </aside>

                {/* Main content - full width */}
                <main className="min-w-0 flex-1 overflow-y-auto bg-background">
                    <Outlet />
                </main>
            </div>

            <MobileBottomNav />
        </div>
    );
}
