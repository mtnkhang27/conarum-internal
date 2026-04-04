import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CompletedMatchesCard() {
  const { t } = useTranslation();

  return (
    <Card className="w-full shadow-sm border-muted/60 bg-card">
      <CardHeader className="bg-muted/10 border-b pb-4 px-6">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          {t("predictionDashboard.completedMatches", "Completed Matches")}
        </CardTitle>
        <CardDescription>
          {t(
            "predictionDashboard.completedMatchesSubtitle",
            "View finalized match results and points earned."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 flex flex-col items-center justify-center h-48">
        <p className="text-muted-foreground">
          {t("predictionDashboard.noCompleted", "No completed matches.")}
        </p>
      </CardContent>
    </Card>
  );
}
