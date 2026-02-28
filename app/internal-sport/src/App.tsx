import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AvailableMatchesPage } from "@/pages/AvailableMatchesPage";
import { CompletedMatchesPage } from "@/pages/CompletedMatchesPage";
import { TournamentChampionPage } from "@/pages/TournamentChampionPage";
import { MyPredictionsPage } from "@/pages/MyPredictionsPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { AccountPage } from "@/pages/AccountPage";
import { MatchManagement } from "@/pages/admin/MatchManagement";
import { TeamManagement } from "@/pages/admin/TeamManagement";
import { TournamentManagement } from "@/pages/admin/TournamentManagement";
import { PlayerManagement } from "@/pages/admin/PlayerManagement";
import { UseCaseConfig } from "@/pages/admin/UseCaseConfig";

export default function App() {
  return (
    <Routes>
      {/* Player-facing routes */}
      <Route element={<AppShell />}>
        <Route path="/available" element={<AvailableMatchesPage />} />
        <Route path="/completed" element={<CompletedMatchesPage />} />
        <Route path="/tournament-champion" element={<TournamentChampionPage />} />
        <Route path="/my-predictions" element={<MyPredictionsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>

      {/* Admin routes */}
      <Route element={<AdminLayout />}>
        <Route path="/admin/matches" element={<MatchManagement />} />
        <Route path="/admin/teams" element={<TeamManagement />} />
        <Route path="/admin/tournaments" element={<TournamentManagement />} />
        <Route path="/admin/players" element={<PlayerManagement />} />
        <Route path="/admin/config" element={<UseCaseConfig />} />
        <Route path="/admin" element={<Navigate to="/admin/matches" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/available" replace />} />
    </Routes>
  );
}
