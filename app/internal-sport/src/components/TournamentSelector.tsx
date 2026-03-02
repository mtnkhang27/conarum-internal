import { useEffect, useState } from "react";
import { Trophy, ChevronDown } from "lucide-react";
import { playerTournamentsApi } from "@/services/playerApi";
import type { TournamentInfo } from "@/types";

interface TournamentSelectorProps {
    selectedId: string;
    onSelect: (id: string) => void;
    /** If true, includes an "All Tournaments" option. */
    allowAll?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
    knockout: "Knockout",
    league: "League",
    groupKnockout: "Group + Knockout",
    cup: "Cup",
};

export function TournamentSelector({ selectedId, onSelect, allowAll = false }: TournamentSelectorProps) {
    const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        playerTournamentsApi.getAll().then((list) => {
            setTournaments(list);
            // Auto-select first active tournament if nothing selected
            if (!selectedId && list.length > 0 && !allowAll) {
                const active = list.find((t) => t.status === "active") ?? list[0];
                onSelect(active.ID);
            }
        }).catch(() => { });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const selected = tournaments.find((t) => t.ID === selectedId);
    const label = selected ? selected.name : allowAll ? "All Tournaments" : "Select Tournament";

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-surface"
            >
                <Trophy className="h-4 w-4 text-primary" />
                <span className="max-w-[200px] truncate">{label}</span>
                {selected && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {FORMAT_LABELS[selected.format] ?? selected.format}
                    </span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    {/* Dropdown */}
                    <div className="absolute left-0 top-full z-50 mt-1 min-w-[260px] rounded-lg border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-1">
                        {allowAll && (
                            <button
                                type="button"
                                onClick={() => { onSelect(""); setOpen(false); }}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface ${!selectedId ? "bg-primary/10 text-primary" : "text-foreground"}`}
                            >
                                <Trophy className="h-4 w-4 text-muted-foreground" />
                                <span>All Tournaments</span>
                            </button>
                        )}
                        {tournaments.map((t) => (
                            <button
                                key={t.ID}
                                type="button"
                                onClick={() => { onSelect(t.ID); setOpen(false); }}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface ${t.ID === selectedId ? "bg-primary/10 text-primary" : "text-foreground"}`}
                            >
                                <Trophy className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                    <div className="font-medium">{t.name}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className="uppercase">{FORMAT_LABELS[t.format] ?? t.format}</span>
                                        <span>·</span>
                                        <span className={`font-bold ${t.status === "active" ? "text-success" : t.status === "upcoming" ? "text-warning" : "text-muted-foreground"}`}>
                                            {t.status}
                                        </span>
                                        {t.season && <><span>·</span><span>{t.season}</span></>}
                                    </div>
                                </div>
                                {t.ID === selectedId && (
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                            </button>
                        ))}
                        {tournaments.length === 0 && (
                            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                                No tournaments available
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
