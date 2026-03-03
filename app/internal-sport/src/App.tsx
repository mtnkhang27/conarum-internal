import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { AdminLayout } from "@/layouts/AdminLayout";
import { SportPage } from "@/pages/SportPage";
// import { TournamentChampionPage } from "@/pages/TournamentChampionPage";
import { AccountPage } from "@/pages/AccountPage";
import { MatchManagement } from "@/pages/admin/MatchManagement";
import { MatchDetail } from "@/pages/admin/MatchDetail";
import { TeamManagement } from "@/pages/admin/TeamManagement";
import { TeamDetail } from "@/pages/admin/TeamDetail";
import { TournamentManagement } from "@/pages/admin/TournamentManagement";
import { TournamentDetail } from "@/pages/admin/TournamentDetail";
import { PlayerManagement } from "@/pages/admin/PlayerManagement";
import { TournamentChampionPage } from "./pages/TournamentChampionPage";

export default function App() {
  return (
    <Routes>
      {/* Player-facing routes */}
      <Route element={<AppShell />}>
        <Route path="/" element={<SportPage />} />
        {/* Legacy redirects */}
        {/* <Route path="/available" element={<Navigate to="/#matches" replace />} />
        <Route path="/completed" element={<Navigate to="/#completed" replace />} />
        <Route path="/recent-predictions" element={<Navigate to="/#recent" replace />} />
        <Route path="/leaderboard" element={<Navigate to="/#leaderboard" replace />} /> */}
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
        <Route path="/admin" element={<Navigate to="/admin/matches" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
