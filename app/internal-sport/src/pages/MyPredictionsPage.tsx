import { ClipboardCheck, Trophy, Target, FileEdit } from "lucide-react";
import { myPredictionHistory, myPredictionSummary, teamFlagMap } from "@/data/mockData";

function statusClass(status: string) {
    if (status === "submitted") {
        return "bg-success/20 text-success border-success/40";
    }
    return "bg-primary/15 text-primary border-primary/40";
}

function statusLabel(status: string) {
    if (status === "submitted") return "Submitted";
    return "Draft";
}

function getTeams(match: string) {
    const [homeTeam, awayTeam] = match.split(" vs ");
    return { homeTeam, awayTeam };
}

const cards = [
    { id: "submitted", label: "Submitted Picks", value: myPredictionSummary.totalSubmitted, icon: ClipboardCheck, color: "text-primary" },
    { id: "winner", label: "Winner Picks", value: myPredictionSummary.winnerPicks, icon: Trophy, color: "text-success" },
    { id: "exact-score", label: "Exact Score Picks", value: myPredictionSummary.exactScorePicks, icon: Target, color: "text-white" },
    { id: "draft", label: "Draft Picks", value: myPredictionSummary.draftPicks, icon: FileEdit, color: "text-muted-foreground" },
];

export function MyPredictionsPage() {
    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="h-6 w-1 rounded-full bg-primary" />
                    My Predictions
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Manage submitted picks and drafts. Live result comparison is currently disabled.
                </p>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <div
                        key={card.id}
                        className="rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-primary/40"
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                        </div>
                        <p className={`text-xl font-extrabold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="overflow-x-auto">
                    <div className="grid min-w-[780px] grid-cols-12 gap-2 border-b border-border bg-surface/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-4">Match</div>
                        <div className="col-span-2">Kickoff</div>
                        <div className="col-span-2">Prediction Type</div>
                        <div className="col-span-2">Your Pick</div>
                        <div className="col-span-1 text-center">Weight</div>
                        <div className="col-span-1 text-center">State</div>
                    </div>

                    <div className="max-h-[520px] min-w-[780px] divide-y divide-border overflow-y-auto">
                        {myPredictionHistory.map((item) => {
                            const { homeTeam, awayTeam } = getTeams(item.match);
                            const homeFlag = teamFlagMap[homeTeam] || "";
                            const awayFlag = teamFlagMap[awayTeam] || "";

                            return (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-12 items-center gap-2 px-4 py-4 transition-colors hover:bg-surface"
                                >
                                    <div className="col-span-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="flex items-center gap-1 text-sm font-bold text-white">
                                                {homeFlag && <span className={`fi fi-${homeFlag} rounded-sm`} />}
                                                {homeTeam}
                                            </span>
                                            <span className="text-[10px] font-black text-muted-foreground">VS</span>
                                            <span className="flex items-center gap-1 text-sm font-bold text-white">
                                                {awayFlag && <span className={`fi fi-${awayFlag} rounded-sm`} />}
                                                {awayTeam}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-span-2 text-xs text-muted-foreground">{item.kickoff}</div>
                                    <div className="col-span-2 text-xs font-bold uppercase tracking-wide text-foreground/80">
                                        {item.predictionType}
                                    </div>
                                    <div className="col-span-2 text-sm font-semibold text-primary">{item.pick}</div>
                                    <div className="col-span-1 text-center text-sm font-bold text-primary">
                                        {item.weight.toFixed(2)}
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <span
                                            className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(item.submissionStatus)}`}
                                        >
                                            {statusLabel(item.submissionStatus)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
                Picks are stored without realtime scoring until an official data source is connected.
            </p>
        </div>
    );
}
