import { toast } from "sonner";
import type { LiveMatch } from "@/types";

interface LiveMatchesTableProps {
    items: LiveMatch[];
}

export function LiveMatchesTable({ items }: LiveMatchesTableProps) {
    const onSelectLiveMatch = (match: string) => {
        toast.warning("Realtime disabled", {
            description: `Live actions for ${match} are disabled in manual mode.`,
        });
    };

    return (
        <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <span className="h-6 w-1 rounded-full bg-success" />
                Live Matches
            </h2>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-6">In-Play Match</div>
                    <div className="col-span-2 text-center">Points</div>
                    <div className="col-span-2 text-center">Score</div>
                    <div className="col-span-2 text-center">Pick</div>
                </div>

                <div className="divide-y divide-border">
                    {items.map((item) => (
                        <div
                            key={item.match}
                            className="grid grid-cols-12 items-center gap-2 px-4 py-4 transition-colors hover:bg-surface"
                        >
                            <div className="col-span-6 flex flex-col">
                                <span className="truncate text-sm font-bold text-foreground">{item.match}</span>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                                        Live
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{item.minute}</span>
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
                                <button
                                    type="button"
                                    onClick={() => onSelectLiveMatch(item.match)}
                                    className="rounded border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                                >
                                    Select
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
