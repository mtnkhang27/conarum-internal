import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UpcomingMatch } from "@/types";

interface UpcomingKickoffTableProps {
    items: UpcomingMatch[];
}

export function UpcomingKickoffTable({ items }: UpcomingKickoffTableProps) {
    const [localItems, setLocalItems] = useState(items);

    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const onPickClick = (item: UpcomingMatch) => {
        if (item.pick) {
            toast.info("Pick edit shortcut", {
                description: `Open the ${item.home.name} vs ${item.away.name} card above to adjust your winner pick.`,
            });
            return;
        }

        setLocalItems((prev) =>
            prev.map((entry) =>
                entry.id === item.id ? { ...entry, pick: entry.home.name } : entry,
            ),
        );

        toast.success("Quick pick saved", {
            description: `${item.home.name} has been set as a quick draft pick.`,
        });
    };

    return (
        <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <span className="h-6 w-1 rounded-full bg-success" />
                Upcoming Kickoffs
            </h2>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="overflow-x-auto">
                    <div className="grid min-w-[860px] grid-cols-12 gap-2 border-b border-border bg-surface/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-4">Match</div>
                        <div className="col-span-2 text-center">Kickoff</div>
                        <div className="col-span-2 text-center">Stage</div>
                        <div className="col-span-1 text-center">Points</div>
                        <div className="col-span-1 text-center">Your Pick</div>
                        <div className="col-span-2 text-center">Action</div>
                    </div>

                    <div className="min-w-[860px] divide-y divide-border">
                        {localItems.map((item) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-12 items-center gap-2 px-4 py-4 transition-colors hover:bg-surface"
                            >
                                <div className="col-span-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="flex items-center gap-1 text-sm font-bold text-white">
                                            <span className={`fi fi-${item.home.flag} rounded-sm`} />
                                            {item.home.name}
                                        </span>
                                        <span className="text-[10px] font-black text-muted-foreground">VS</span>
                                        <span className="flex items-center gap-1 text-sm font-bold text-white">
                                            <span className={`fi fi-${item.away.flag} rounded-sm`} />
                                            {item.away.name}
                                        </span>
                                    </div>
                                </div>

                                <div className="col-span-2 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs font-semibold text-foreground/80">{item.kickoff}</span>
                                        {item.isSoon && (
                                            <span className="rounded border border-primary/40 bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                                                Kickoff Soon
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {item.stage}
                                </div>

                                <div className="col-span-1 text-center text-sm font-bold text-success">
                                    +1
                                </div>

                                <div className="col-span-1 text-center">
                                    <span className={`text-xs font-bold ${item.pick ? "text-success" : "text-muted-foreground"}`}>
                                        {item.pick || "-"}
                                    </span>
                                </div>

                                <div className="col-span-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => onPickClick(item)}
                                        className={`rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${item.pick
                                                ? "border-border text-foreground/80 hover:border-primary hover:text-primary"
                                                : "border-primary bg-primary/15 text-primary hover:bg-primary hover:text-white"
                                            }`}
                                    >
                                        {item.pick ? "Edit Pick" : "Pick Now"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
