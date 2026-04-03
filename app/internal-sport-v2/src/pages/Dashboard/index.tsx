import React from "react";
import { UserPredictionTable } from "./components/UserPredictionTable";
import { LeaderboardCard } from "./components/LeaderboardCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, CalendarCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Dashboard() {
  const { t } = useTranslation();
  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Predictions Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your match predictions, track your ranking, and view latest results.
        </p>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 relative">
          <div className="xl:col-span-3 space-y-6">
              {/* Main predictions table */}
              <UserPredictionTable />

              {/* Placeholder for Recent Predictions */}
              <Card className="w-full shadow-sm border-muted/60 bg-card">
                  <CardHeader className="bg-muted/10 border-b pb-4 px-6">
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-primary" />
                          {t('predictionDashboard.recentPredictions', 'Recent Predictions')}
                      </CardTitle>
                      <CardDescription>{t('predictionDashboard.recentPredictionsSubtitle', 'Review your latest submitted and locked predictions.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col items-center justify-center h-48">
                      <Trophy className="h-10 w-10 text-border mb-2" />
                      <p className="text-muted-foreground">{t('predictionDashboard.noPredictionsYet', 'No predictions available.')}</p>
                  </CardContent>
              </Card>

              {/* Placeholder for Completed Matches */}
              <Card className="w-full shadow-sm border-muted/60 bg-card">
                  <CardHeader className="bg-muted/10 border-b pb-4 px-6">
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <CalendarCheck className="w-5 h-5 text-primary" />
                          {t('predictionDashboard.completedMatches', 'Completed Matches')}
                      </CardTitle>
                      <CardDescription>{t('predictionDashboard.completedMatchesSubtitle', 'View finalized match results and points earned.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col items-center justify-center h-48">
                      <p className="text-muted-foreground">{t('predictionDashboard.noCompleted', 'No completed matches.')}</p>
                  </CardContent>
              </Card>
          </div>
          
          <div className="xl:col-span-1 hidden xl:block">
              <LeaderboardCard />
          </div>
      </div>
    </div>
  );
}
