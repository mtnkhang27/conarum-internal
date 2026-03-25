import { useTranslation } from "react-i18next";
import type { LiveMatch } from "@/types";

interface LiveMatchesTableProps {
    items: LiveMatch[];
}

export function LiveMatchesTable({ items }: LiveMatchesTableProps) {
    const { t } = useTranslation();
    const getFallbackNames = (matchLabel: string): { home: string; away: string } => {
        const [home = "Home", away = "Away"] = matchLabel.split(/\s+vs\s+/i);
        return { home, away };
    };

    const getTeamName = (item: LiveMatch, side: "home" | "away"): string => {
        const team = side === "home" ? item.home : item.away;
        if (team?.name) return team.name;
        const fallback = getFallbackNames(item.match);
        return side === "home" ? fallback.home : fallback.away;
    };

    const pickLabel = (item: LiveMatch): string => {
        if (item.pick === "home") return `${getTeamName(item, "home")} Win`;
        if (item.pick === "away") return `${getTeamName(item, "away")} Win`;
        if (item.pick === "draw") return t("sport.picks.draw");
        return t("sport.picks.noPick");
    };

    return (
        <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <span className="h-6 w-1 rounded-full bg-success" />
                {t("sport.liveMatches")}
            </h2>

            <div className="space-y-3 md:hidden">
                {items.map((item) => (
                    <div
                        key={item.id || item.match}
                        className="rounded-xl border border-border bg-card p-4 shadow-[0_6px_18px_rgba(10,10,30,0.22)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="space-y-2">
                                    {(["home", "away"] as const).map((side) => {
                                        const team = side === "home" ? item.home : item.away;
                                        return (
                                            <div key={side} className="flex items-center gap-2">
                                                {team?.crest ? (
                                                    <img src={team.crest} alt={getTeamName(item, side)} className="h-5 w-5 object-contain" />
                                                ) : team?.flag ? (
                                                    <span className={`fi fi-${team.flag} rounded-sm`} />
                                                ) : (
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-dark text-[9px] font-black text-muted-foreground">?</span>
                                                )}
                                                <span className="truncate text-sm font-bold text-white">
                                                    {getTeamName(item, side)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-destructive">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                                    {t("common.status.live")}
                                </div>
                            </div>

                            <div className="rounded-lg border border-border bg-surface-dark px-3 py-2 font-mono text-base font-bold text-success">
                                {item.score}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border/60 bg-surface/45 px-3 py-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                    {t("sport.points")}
                                </p>
                                <p className="mt-1 text-sm font-bold text-success">+1</p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-surface/45 px-3 py-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                    {t("sport.pick")}
                                </p>
                                <span
                                    className={`mt-1 inline-flex rounded border px-2 py-1 text-[10px] font-bold ${
                                        item.pick
                                            ? "border-primary/40 bg-primary/15 text-primary"
                                            : "border-border bg-surface text-muted-foreground"
                                    }`}
                                >
                                    {pickLabel(item)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
                <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-6">{t("sport.inPlayMatch")}</div>
                    <div className="col-span-2 text-center">{t("sport.points")}</div>
                    <div className="col-span-2 text-center">{t("sport.score")}</div>
                    <div className="col-span-2 text-center">{t("sport.pick")}</div>
                </div>

                <div className="divide-y divide-border">
                    {items.map((item) => (
                        <div
                            key={item.id || item.match}
                            className="grid grid-cols-12 items-center gap-2 px-4 py-4 transition-colors hover:bg-surface"
                        >
                            <div className="col-span-6 flex flex-col">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="flex items-center gap-1 text-sm font-bold text-white">
                                        {item.home?.crest ? (
                                            <img src={item.home.crest} alt={getTeamName(item, "home")} className="h-4 w-4 object-contain" />
                                        ) : item.home?.flag ? (
                                            <span className={`fi fi-${item.home.flag} rounded-sm`} />
                                        ) : (
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface-dark text-[9px] font-black text-muted-foreground">?</span>
                                        )}
                                        {getTeamName(item, "home")}
                                    </span>
                                    <span className="text-[10px] font-black text-muted-foreground">{t("common.vs")}</span>
                                    <span className="flex items-center gap-1 text-sm font-bold text-white">
                                        {item.away?.crest ? (
                                            <img src={item.away.crest} alt={getTeamName(item, "away")} className="h-4 w-4 object-contain" />
                                        ) : item.away?.flag ? (
                                            <span className={`fi fi-${item.away.flag} rounded-sm`} />
                                        ) : (
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface-dark text-[9px] font-black text-muted-foreground">?</span>
                                        )}
                                        {getTeamName(item, "away")}
                                    </span>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                                        {t("common.status.live")}
                                    </span>
                                </div>
                            </div>

                            <div className="col-span-2 text-center">
                                <span className="text-sm font-bold text-success">+1</span>
                            </div>

                            <div className="col-span-2 text-center">
                                <div className="inline-flex flex-col rounded border border-border bg-surface-dark px-3 py-1 font-mono text-sm font-bold text-success">
                                    {item.score}
                                </div>
                            </div>

                            <div className="col-span-2 text-center">
                                <span
                                    className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${
                                        item.pick
                                            ? "border-primary/40 bg-primary/15 text-primary"
                                            : "border-border bg-surface text-muted-foreground"
                                    }`}
                                >
                                    {pickLabel(item)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
