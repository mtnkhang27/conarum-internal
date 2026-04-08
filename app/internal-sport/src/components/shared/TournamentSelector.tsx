import { useEffect, useRef, useState } from "react";
import { Trophy, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { playerTournamentsApi } from "@/services/playerApi";
import type { TournamentInfo } from "@/types";
import { Button } from "../ui/button";

interface TournamentSelectorProps {
    selectedId: string;
    onSelect: (id: string) => void;
    /** Callback to pass the selected tournament name to parent */
    onTournamentName?: (name: string) => void;
    /** If true, includes an "All Tournaments" option. */
    allowAll?: boolean;
    /** Optional preloaded tournaments to avoid duplicate page-level fetches. */
    tournaments?: TournamentInfo[];
    /** When true, prefer the admin-configured default tournament on first auto-select. */
    preferDefault?: boolean;
}

export function TournamentSelector({
    selectedId,
    onSelect,
    onTournamentName,
    allowAll = false,
    tournaments: providedTournaments,
    preferDefault = false,
}: TournamentSelectorProps) {
    const { t } = useTranslation();
    const [internalTournaments, setInternalTournaments] = useState<TournamentInfo[]>([]);
    const [open, setOpen] = useState(false);
    const hasAutoSelected = useRef(false);
    const tournaments = providedTournaments ?? internalTournaments;

    useEffect(() => {
        if (providedTournaments) {
            return;
        }

        playerTournamentsApi.getAll().then((list) => {
            setInternalTournaments(list);
        }).catch(() => { });
    }, [providedTournaments]);

    useEffect(() => {
        if (selectedId) {
            hasAutoSelected.current = true;
            return;
        }

        if (tournaments.length === 0 || hasAutoSelected.current) {
            return;
        }

        // First-load priority can be customized by the parent page.
        const preferred =
            (preferDefault ? tournaments.find((t) => t.isDefault) : undefined) ??
            tournaments.find((t) => t.status === "active") ??
            tournaments[0];

        hasAutoSelected.current = true;
        onSelect(preferred.ID);
        onTournamentName?.(preferred.name);
    }, [selectedId, tournaments, onSelect, onTournamentName, preferDefault]);

    const selected = tournaments.find((t) => t.ID === selectedId);
    const label = selected ? selected.name : allowAll ? t("tournamentSelector.allTournaments") : t("tournamentSelector.selectTournament");

    return (
        <div className="relative w-full">
            <Button
                type="button"
                onClick={() => setOpen(!open)}
                className="h-10 w-full justify-between gap-2 rounded-lg border border-border bg-surface-dark px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-surface"
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className="flex-1 truncate text-left">{label}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    {/* Dropdown */}
                    <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-full rounded-lg border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-1 sm:min-w-[260px]">
                            {tournaments.map((t) => (
                            <button
                                key={t.ID}
                                type="button"
                                onClick={() => {
                                    hasAutoSelected.current = true;
                                    onSelect(t.ID);
                                    onTournamentName?.(t.name);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface ${t.ID === selectedId ? "bg-primary/10 text-primary" : "text-foreground"}`}
                            >
                                {/* <Trophy classN  ame="h-4 w-4 text-muted-foreground" /> */}
                                <div className="flex-1">
                                    <div className="font-medium">{t.name}</div>
                                    {/* <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className="uppercase">{FORMAT_LABELS[t.format] ?? t.format}</span>
                                        <span>·</span>
                                        <span className={`font-bold ${t.status === "active" ? "text-success" : t.status === "upcoming" ? "text-warning" : "text-muted-foreground"}`}>
                                            {t.status}
                                        </span>
                                        {t.season && <><span>·</span><span>{t.season}</span></>}
                                    </div> */}
                                </div>
                                {t.ID === selectedId && (
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                            </button>
                        ))}
                        {tournaments.length === 0 && (
                            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                                {t("tournamentSelector.noTournaments")}
                            </div>
                        )}
                        {allowAll && (
                            <>
                                {tournaments.length > 0 && <div className="mx-4 border-t border-border" />}
                                <button
                                    type="button"
                                    onClick={() => {
                                        hasAutoSelected.current = true;
                                        onSelect("");
                                        onTournamentName?.("");
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface ${!selectedId ? "bg-primary/10 text-primary" : "text-foreground"}`}
                                >
                                    <Trophy className="h-4 w-4 text-muted-foreground" />
                                    <span>{t("tournamentSelector.allTournaments")}</span>
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
