import { useTranslation } from "react-i18next";
import { RecentPredictionsSection } from "@/pages/sport/components/RecentPredictionsSection";

export function AccountPredictionsTab() {
    const { t } = useTranslation();

    return (
        <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
                <h3 className="text-base font-bold text-white">{t("nav.myPredictions")}</h3>
                <p className="text-xs text-muted-foreground">{t("sport.sections.recentSubtitle")}</p>
            </div>
            <div className="max-h-[min(90vh,860px)] overflow-y-auto pr-1">
                <RecentPredictionsSection tournamentId="" />
            </div>
        </section>
    );
}
