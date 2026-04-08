import { useEffect, useMemo, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { playerLeaderboardApi } from "@/services/playerApi";
import type { TournamentLeaderboardItem } from "@/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeaderboardPlayerHoverCard } from "./LeaderboardPlayerHoverCard";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

function podiumIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
}

function podiumGlowClass(rank: number, isMe: boolean) {
    if (isMe) {
        return "border-yellow-400/70 ring-2 ring-yellow-400/50 bg-gradient-to-br from-yellow-400/10 to-transparent";
    }
    if (rank === 1) {
        return "border-yellow-400/50 ring-1 ring-yellow-400/30 bg-gradient-to-br from-yellow-400/5 to-transparent";
    }
    if (rank === 2) return "border-gray-300/40 ring-1 ring-gray-300/20";
    if (rank === 3) return "border-amber-600/40 ring-1 ring-amber-600/20";
    return "border-border";
}

function rowGlowClass(rank: number, isMe: boolean) {
    if (isMe) {
        return "border-l-2 border-l-yellow-400 bg-gradient-to-r from-yellow-400/10 to-transparent ring-inset ring-1 ring-yellow-400/30";
    }
    if (rank <= 3) return "border-l-2 border-l-primary/30";
    return "";
}

interface LeaderboardSectionProps {
    tournamentId: string;
}

export function LeaderboardSection({ tournamentId }: LeaderboardSectionProps) {
    const { t } = useTranslation();
    const [entries, setEntries] = useState<TournamentLeaderboardItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!tournamentId) {
            setEntries([]);
            setError("");
            return;
        }

        setLoading(true);
        setError("");
        playerLeaderboardApi
            .getByTournament(tournamentId)
            .then((data) => setEntries(Array.isArray(data) ? data : []))
            .catch((e: any) => setError(e?.message || "Failed to load leaderboard"))
            .finally(() => setLoading(false));
    }, [tournamentId]);

    const normalizedEntries = useMemo<TournamentLeaderboardItem[]>(() => {
        const sorted = [...entries].sort((a, b) => {
            const aPoints = Number(a.totalPoints || 0);
            const bPoints = Number(b.totalPoints || 0);
            if (bPoints !== aPoints) return bPoints - aPoints;

            const aCorrect = Number(a.totalCorrect || 0);
            const bCorrect = Number(b.totalCorrect || 0);
            if (bCorrect !== aCorrect) return bCorrect - aCorrect;

            const aPredictions = Number(a.totalPredictions || 0);
            const bPredictions = Number(b.totalPredictions || 0);
            if (bPredictions !== aPredictions) return bPredictions - aPredictions;

            return (a.displayName || "").localeCompare(b.displayName || "", undefined, {
                sensitivity: "base",
            });
        });

        return sorted.map((player, index) => ({
            ...player,
            rank: player.rank ?? index + 1,
        }));
    }, [entries]);

    if (!tournamentId) {
        return (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Trophy className="h-7 w-7 text-border" />
                <p className="text-sm">{t("leaderboard.selectTournament")}</p>
            </div>
        );
    }

    if (loading) {
        return <LoadingOverlay />;
    }

    if (error || normalizedEntries.length === 0) {
        return (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Trophy className="h-7 w-7 text-border" />
                <p className="text-sm">{error || t("leaderboard.noPredictions")}</p>
            </div>
        );
    }

    const topPlayers = normalizedEntries.slice(0, 3);
    const meEntry = normalizedEntries.find((e) => e.isMe);
    const meInTop5 = meEntry ? meEntry.rank <= 5 : false;
    const accuracyFor = (player: TournamentLeaderboardItem) =>
        player.totalPredictions > 0
            ? Math.round((player.totalCorrect / player.totalPredictions) * 100)
            : 0;

    return (
        <TooltipProvider delayDuration={120}>
            <div>
                <div className="hidden lg:block mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {topPlayers.map((player) => (
                        <div
                            key={player.rank}
                            className={`rounded-lg border bg-card p-4 transition-all hover:border-primary/40 ${podiumGlowClass(player.rank, !!player.isMe)}`}
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {podiumIcon(player.rank)}
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        {t("leaderboard.rank", { rank: player.rank })}
                                    </span>
                                    {player.isMe && (
                                        <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                            {t("leaderboard.you")}
                                        </span>
                                    )}
                                </div>
                                <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold text-foreground/80">
                                    {t("leaderboard.correct", { correct: player.totalCorrect, total: player.totalPredictions })}
                                </span>
                            </div>

                            <div className="mb-3 flex items-center gap-3">
                                <LeaderboardPlayerHoverCard player={player} sizeClass="h-10 w-10" iconClass="h-5 w-5" />
                                <div>
                                    <p className="text-sm font-bold text-white">{player.displayName}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t("leaderboard.accuracy")}{" "}
                                        {accuracyFor(player)}%
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-end justify-between border-t border-border pt-3">
                                <span className="text-[11px] text-muted-foreground">{t("leaderboard.totalPoints")}</span>
                                <span className="text-2xl font-extrabold text-success">
                                    {Math.floor(player.totalPoints)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="space-y-3 p-3 md:hidden">
                        {normalizedEntries.map((player) => (
                            <div
                                key={`${player.rank}-${player.playerId}`}
                                className={`rounded-xl border bg-surface/30 p-4 shadow-[0_6px_18px_rgba(10,10,30,0.18)] ${rowGlowClass(player.rank, !!player.isMe)}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-extrabold ${
                                                player.isMe
                                                    ? "border-yellow-400/60 bg-yellow-400/20 text-yellow-400"
                                                    : player.rank <= 3
                                                        ? "border-primary/40 bg-primary/20 text-primary"
                                                        : "border-border bg-surface text-foreground/80"
                                            }`}
                                        >
                                            {player.rank}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <LeaderboardPlayerHoverCard player={player} sizeClass="h-9 w-9" iconClass="h-4 w-4" />
                                                <span className="truncate text-sm font-bold text-white">{player.displayName}</span>
                                            </div>
                                            {player.isMe && (
                                                <span className="mt-2 inline-flex rounded bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                                    {t("leaderboard.you")}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                            {t("leaderboard.points")}
                                        </p>
                                        <p className="text-lg font-extrabold text-success">
                                            {Math.floor(player.totalPoints)}
                                        </p>
                                    </div>
                                </div>

                                <div className="hidden lg:block mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                            {t("account.stats.totalCorrect")}
                                        </p>
                                        <p className="mt-1 text-sm text-foreground/85">
                                            {player.totalCorrect}/{player.totalPredictions}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                            {t("leaderboard.accuracy")}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-foreground/90">
                                            {accuracyFor(player)}%
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                            {t("leaderboard.rank", { rank: "" }).replace("#", "").trim()}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-white">
                                            #{player.rank}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {meEntry && !meInTop5 && (
                            <div className="rounded-xl border border-yellow-400/35 bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent p-4 shadow-[0_0_0_1px_rgba(250,204,21,0.06)]">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400/80">
                                            {t("leaderboard.yourPosition")}
                                        </span>
                                    </div>
                                    <span className="rounded-full border border-yellow-400/25 bg-yellow-400/12 px-2 py-1 text-[10px] font-bold text-yellow-300">
                                        #{meEntry.rank}
                                    </span>
                                </div>

                                <div className={`rounded-xl border border-yellow-400/25 bg-card/40 p-4 ${rowGlowClass(meEntry.rank, true)}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <LeaderboardPlayerHoverCard player={meEntry} sizeClass="h-9 w-9" iconClass="h-4 w-4" />
                                            <div>
                                                <p className="text-sm font-bold text-white">{meEntry.displayName}</p>
                                                <span className="mt-1 inline-flex rounded bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                                    {t("leaderboard.you")}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-lg font-extrabold text-success">
                                            {Math.floor(meEntry.totalPoints)}
                                        </p>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-border/50 bg-surface/30 px-3 py-2 text-center text-sm text-foreground/85">
                                            {meEntry.totalCorrect}/{meEntry.totalPredictions}
                                        </div>
                                        <div className="rounded-lg border border-border/50 bg-surface/30 px-3 py-2 text-center text-sm font-semibold text-foreground/90">
                                            {accuracyFor(meEntry)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <div className="grid min-w-[640px] grid-cols-12 gap-2 border-b border-border bg-surface/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <div className="col-span-1 text-center">{t("leaderboard.rank", { rank: "" }).replace("#", "").trim()}</div>
                            <div className="col-span-5">{t("leaderboard.player")}</div>
                            <div className="col-span-2 text-center">{t("account.stats.totalCorrect")}</div>
                            <div className="col-span-2 text-center">{t("leaderboard.accuracy")}</div>
                            <div className="col-span-2 text-center">{t("leaderboard.points")}</div>
                        </div>

                        <div className="min-w-[640px] divide-y divide-border">
                            {normalizedEntries.map((player) => {
                                return (
                                    <div
                                        key={`${player.rank}-${player.playerId}`}
                                        className={`grid grid-cols-12 items-center gap-2 px-4 py-3.5 transition-colors hover:bg-surface ${rowGlowClass(player.rank, !!player.isMe)}`}
                                    >
                                        <div className="col-span-1 text-center">
                                            <span
                                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-extrabold ${
                                                    player.isMe
                                                        ? "border-yellow-400/60 bg-yellow-400/20 text-yellow-400"
                                                        : player.rank <= 3
                                                            ? "border-primary/40 bg-primary/20 text-primary"
                                                            : "border-border bg-surface text-foreground/80"
                                                }`}
                                            >
                                                {player.rank}
                                            </span>
                                        </div>

                                        <div className="col-span-5 flex items-center gap-3">
                                            <LeaderboardPlayerHoverCard player={player} sizeClass="h-8 w-8" iconClass="h-4 w-4" />
                                            <span className="text-sm font-bold text-white">{player.displayName}</span>
                                            {player.isMe && (
                                                <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                                    {t("leaderboard.you")}
                                                </span>
                                            )}
                                        </div>

                                        <div className="col-span-2 text-center text-sm text-foreground/80">
                                            {player.totalCorrect}/{player.totalPredictions}
                                        </div>
                                        <div className="col-span-2 text-center text-sm font-semibold text-foreground/90">
                                            {accuracyFor(player)}%
                                        </div>
                                        <div className="col-span-2 text-center text-sm font-extrabold text-success">
                                            {Math.floor(player.totalPoints)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {meEntry && !meInTop5 && (
                            <div className="min-w-[640px] border-t border-border/60 bg-surface/20 px-4 py-4">
                                <div className="overflow-hidden rounded-xl border border-yellow-400/35 bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent shadow-[0_0_0_1px_rgba(250,204,21,0.06)]">
                                    <div className="flex items-center justify-between border-b border-yellow-400/20 px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400/80">
                                                {t("leaderboard.yourPosition")}
                                            </span>
                                        </div>
                                        <span className="rounded-full border border-yellow-400/25 bg-yellow-400/12 px-2 py-1 text-[10px] font-bold text-yellow-300">
                                            #{meEntry.rank}
                                        </span>
                                    </div>
                                    <div
                                        className={`grid grid-cols-12 items-center gap-2 px-4 py-3.5 ${rowGlowClass(meEntry.rank, true)}`}
                                    >
                                        <div className="col-span-1 text-center">
                                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-yellow-400/60 bg-yellow-400/20 text-xs font-extrabold text-yellow-400">
                                                {meEntry.rank}
                                            </span>
                                        </div>
                                        <div className="col-span-5 flex items-center gap-3">
                                            <LeaderboardPlayerHoverCard player={meEntry} sizeClass="h-8 w-8" iconClass="h-4 w-4" />
                                            <span className="text-sm font-bold text-white">{meEntry.displayName}</span>
                                            <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                                {t("leaderboard.you")}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center text-sm text-foreground/80">
                                            {meEntry.totalCorrect}/{meEntry.totalPredictions}
                                        </div>
                                        <div className="col-span-2 text-center text-sm font-semibold text-foreground/90">
                                            {accuracyFor(meEntry)}%
                                        </div>
                                        <div className="col-span-2 text-center text-sm font-extrabold text-success">
                                            {Math.floor(meEntry.totalPoints)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

