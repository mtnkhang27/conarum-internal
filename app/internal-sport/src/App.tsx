import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { AvailableMatchesPage } from "@/pages/AvailableMatchesPage";
import { CompletedMatchesPage } from "@/pages/CompletedMatchesPage";
import { ExactScorePage } from "@/pages/ExactScorePage";
import { TournamentChampionPage } from "@/pages/TournamentChampionPage";
import { MyPredictionsPage } from "@/pages/MyPredictionsPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { AccountPage } from "@/pages/AccountPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/available" element={<AvailableMatchesPage />} />
        <Route path="/completed" element={<CompletedMatchesPage />} />
        <Route path="/exact-score" element={<ExactScorePage />} />
        <Route path="/tournament-champion" element={<TournamentChampionPage />} />
        <Route path="/my-predictions" element={<MyPredictionsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/available" replace />} />
      </Route>
    </Routes>
  );
}
