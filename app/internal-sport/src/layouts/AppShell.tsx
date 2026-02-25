import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { PredictionSlip } from "@/components/PredictionSlip";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function AppShell() {
    const { pathname } = useLocation();
    const isAccountPage = pathname === "/account";

    return (
        <div className="flex h-screen flex-col">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {!isAccountPage && <LeftSidebar />}

                <main className="min-w-0 flex-1 overflow-y-auto bg-background">
                    <Outlet />
                </main>

                {!isAccountPage && <PredictionSlip />}
            </div>

            <MobileBottomNav />
        </div>
    );
}
