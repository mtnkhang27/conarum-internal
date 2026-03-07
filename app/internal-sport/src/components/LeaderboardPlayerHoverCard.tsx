import { User } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TournamentLeaderboardItem } from "@/types";

type LeaderboardPlayerHoverCardProps = {
    player: TournamentLeaderboardItem;
    sizeClass: string;
    iconClass: string;
};

const valueOrDefault = (value: string | undefined, fallback = "-"): string => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed.length > 0 ? trimmed : fallback;
};

const createRegionDisplayNames = (locale: string): Intl.DisplayNames | null => {
    try {
        return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
        return null;
    }
};

const REGION_NAMES_VI = createRegionDisplayNames("vi");
const REGION_NAMES_EN = createRegionDisplayNames("en");

const toCountryName = (value: string | undefined): string => {
    const codeOrName = valueOrDefault(value, "").trim();
    if (!codeOrName) return "-";

    const normalizedCode = codeOrName.toUpperCase();
    const resolved =
        REGION_NAMES_VI?.of(normalizedCode) ||
        REGION_NAMES_EN?.of(normalizedCode) ||
        "";

    return resolved.trim() || codeOrName;
};

export function LeaderboardPlayerHoverCard({
    player,
    sizeClass,
    iconClass,
}: LeaderboardPlayerHoverCardProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex cursor-pointer">
                    {player.avatarUrl ? (
                        <img
                            src={player.avatarUrl}
                            alt={player.displayName}
                            className={`${sizeClass} rounded-full border border-border object-cover`}
                        />
                    ) : (
                        <span
                            className={`inline-flex ${sizeClass} items-center justify-center rounded-full border border-border bg-surface text-muted-foreground`}
                        >
                            <User className={iconClass} />
                        </span>
                    )}
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                align="start"
                sideOffset={10}
                className="w-[320px] overflow-hidden rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl [&>svg]:fill-card [&>svg]:bg-card"
            >
                <div className="bg-gradient-to-br from-primary/20 via-surface to-card p-4">
                    <div className="flex items-center gap-4">
                        {player.avatarUrl ? (
                            <img
                                src={player.avatarUrl}
                                alt={player.displayName}
                                className="h-16 w-16 rounded-2xl border border-border object-cover shadow-md"
                            />
                        ) : (
                            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface text-muted-foreground shadow-md">
                                <User className="h-7 w-7" />
                            </span>
                        )}
                        <div className="min-w-0 space-y-1">
                            <p className="truncate text-base font-extrabold text-white">
                                {valueOrDefault(player.displayName, "-")}
                            </p>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                Rank #{player.rank}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border border-border/70 bg-surface/40 p-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Favorite Team</p>
                            <p className="truncate text-xs font-medium text-foreground/90">{valueOrDefault(player.favoriteTeam, "-")}</p>
                        </div>
                        <div className="rounded-md border border-border/70 bg-surface/40 p-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Country</p>
                            <p className="text-xs font-medium text-foreground/90">{toCountryName(player.country)}</p>
                        </div>
                        <div className="rounded-md border border-border/70 bg-surface/40 p-2 col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</p>
                            <p className="truncate text-xs font-medium text-foreground/90">{valueOrDefault(player.email, "-")}</p>
                        </div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-surface/40 p-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bio</p>
                        <p className="max-h-20 overflow-y-auto whitespace-pre-wrap text-xs font-medium text-foreground/90">
                            {valueOrDefault(player.bio, "-")}
                        </p>
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
