import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import { AppShell } from "@/layouts/AppShell";
import { AdminLayout } from "@/layouts/AdminLayout";
import { SportPage } from "@/pages/SportPage";
import { AccountPage } from "@/pages/AccountPage";
import { MatchManagement } from "@/pages/admin/MatchManagement";
import { MatchDetail } from "@/pages/admin/MatchDetail";
import { TeamManagement } from "@/pages/admin/TeamManagement";
import { TeamDetail } from "@/pages/admin/TeamDetail";
import { TournamentManagement } from "@/pages/admin/TournamentManagement";
import { TournamentDetail } from "@/pages/admin/TournamentDetail";
import { PlayerManagement } from "@/pages/admin/PlayerManagement";
import { PayoutManagement } from "@/pages/admin/PayoutManagement";
import { TournamentChampionPage } from "./pages/TournamentChampionPage";
import { useFLPSyncDirect, getInitialFLPRoute } from "./hooks/useFLPSync";

// Component to sync React Router with FLP shell URL
function ShellSync() {
  useFLPSyncDirect();
  return null;
}

// Component to navigate to initial route from FLP hash on app load
function InitialRouteNavigator() {
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Only run once on initial mount
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    const initialRoute = getInitialFLPRoute();
    console.log("[App] Initial FLP route:", initialRoute);

    // Navigate if we have a specific route (not just "/")
    if (initialRoute && initialRoute !== "/") {
      console.log("[App] Navigating to initial route:", initialRoute);
      navigate(initialRoute, { replace: true });
    }
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <>
      <ShellSync />
      <InitialRouteNavigator />
      <Routes>
        {/* Player-facing routes */}
        <Route element={<AppShell />}>
          <Route path="/" element={<SportPage />} />
          <Route path="/tournament-champion" element={<TournamentChampionPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/matches" element={<MatchManagement />} />
          <Route path="/admin/matches/:matchId" element={<MatchDetail />} />
          <Route path="/admin/teams" element={<TeamManagement />} />
          <Route path="/admin/teams/:teamId" element={<TeamDetail />} />
          <Route path="/admin/tournaments" element={<TournamentManagement />} />
          <Route path="/admin/tournaments/:tournamentId" element={<TournamentDetail />} />
          <Route path="/admin/players" element={<PlayerManagement />} />
          <Route path="/admin/payouts" element={<PayoutManagement />} />
          <Route path="/admin" element={<Navigate to="/admin/matches" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
