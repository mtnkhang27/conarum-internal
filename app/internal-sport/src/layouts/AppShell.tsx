import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ActiveSectionProvider } from "@/hooks/useActiveSection";

export function AppShell() {
    const { pathname } = useLocation();
    const isAccountPage = pathname === "/account";

    return (
        <ActiveSectionProvider>
            <div className="app-frame flex flex-col bg-background">
                <Header />

                <div className="flex flex-1 overflow-hidden">
                    {!isAccountPage && <LeftSidebar />}

                    <main className="app-scroll-area min-w-0 flex-1 overflow-y-auto bg-background">
                        <Outlet />
                    </main>
                </div>

                <MobileBottomNav />
            </div>
        </ActiveSectionProvider>
    );
}
