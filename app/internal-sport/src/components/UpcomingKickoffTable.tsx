import type { UpcomingMatch } from "@/types";

interface UpcomingKickoffTableProps {
    items: UpcomingMatch[];
}

export function UpcomingKickoffTable({ items }: UpcomingKickoffTableProps) {
    return (
        <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <span className="h-5 w-1 rounded-full bg-success" />
                Upcoming Kickoffs
            </h3>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="overflow-x-auto">
                    <div className="grid min-w-[560px] grid-cols-12 gap-2 border-b border-border bg-surface/50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-5">Match</div>
                        <div className="col-span-3 text-center">Kickoff</div>
                        <div className="col-span-2 text-center">Stage</div>
                        <div className="col-span-2 text-center">Points</div>
                    </div>

                    <div className="min-w-[560px] divide-y divide-border">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-surface"
                            >
                                <div className="col-span-5">
                                    <div className="flex flex-wrap items-center gap-1.5">
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

                                <div className="col-span-3 text-center">
                                    <div className="flex flex-col items-center gap-0.5">
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

                                <div className="col-span-2 text-center text-sm font-bold text-success">
                                    +1
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
