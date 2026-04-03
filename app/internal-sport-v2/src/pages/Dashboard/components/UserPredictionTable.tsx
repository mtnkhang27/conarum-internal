import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/services/core/axiosInstance';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, CalendarClock, Activity, CalendarDays, CheckCircle2, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

type PaginationItem = number | 'dots-left' | 'dots-right';

function buildPaginationItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 'dots-right', totalPages];
  if (page >= totalPages - 3) return [1, 'dots-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, 'dots-left', page - 1, page, page + 1, 'dots-right', totalPages];
}

// Aligning with the provided mockup terminology
type MatchStatus = 'upcoming' | 'live' | 'finished';
type WdlPick = 'home' | 'draw' | 'away';

interface ScorePick {
  id: string; // Internal id for React key mapping
  home: string;
  away: string;
}

interface MatchPrediction {
  id: string;
  matchId: string; // Ma Tran
  kickoff: string; // Ngay
  stage: string;   // Giao
  homeTeam: { name: string; countryCode: string; crest?: string };
  awayTeam: { name: string; countryCode: string; crest?: string };
  status: MatchStatus; // Status: Sap(upcoming), Inprocess(live), Closed(finished)
  
  // User Prediction
  maxBets?: number; 
  scorePicks: ScorePick[];
  predictedWdl?: WdlPick;
  
  // Actual Result (if finished or live)
  actualHomeScore?: number;
  actualAwayScore?: number;
  actualWdl?: WdlPick;
  
  pointsEarned?: number; // Ket qua cua ban (+1 diem)
}

// Map the backend status to our frontend semantic status
const getStatus = (status: string, isKickoffPast: boolean): MatchStatus => {
  if (status === 'finished') return 'finished';
  if (status === 'live' || isKickoffPast) return 'live';
  return 'upcoming';
};

const FlagIcon = ({ code, crest }: { code: string, crest?: string }) => {
  const fallbackSrc = `https://flagcdn.com/24x18/${(code || 'un').toLowerCase()}.png`;
  const defaultSrc = crest && !crest.startsWith('http') ? fallbackSrc : crest || fallbackSrc;

  return (
    <img 
      src={defaultSrc} 
      alt={code} 
      className="w-6 h-4 object-cover rounded-sm border shadow-sm bg-muted"
      onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.src.includes(fallbackSrc)) {
             target.src = fallbackSrc;
          } else {
             target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"; // empty placeholder
          }
      }}
    />
  );
};

export function UserPredictionTable() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchPrediction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Debounce search input so we don't spam OData calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['availableMatches', page, debouncedSearch],
    queryFn: async () => {
      let filterStr = '';
      if (debouncedSearch) {
        // Case-insensitive matching via tolower if supported, else just contains
        filterStr = `&$filter=contains(tolower(homeTeamName),tolower('${debouncedSearch}')) or contains(tolower(awayTeamName),tolower('${debouncedSearch}'))`;
      }
      const skip = (page - 1) * pageSize;
      const response = await axiosInstance.get(`/api/player/AvailableMatchesView?$expand=myScores($select=betId,matchId,predictedHomeScore,predictedAwayScore,status,isCorrect)&$orderby=kickoff asc&$top=${pageSize}&$skip=${skip}&$count=true${filterStr}`);
      return {
        items: response.data?.value || response.data || [],
        totalCount: response.data?.['@odata.count'] || 0
      };
    },
    placeholderData: (prev) => prev
  });

  useEffect(() => {
    if (data?.items && Array.isArray(data.items)) {
      const mappedMatches: MatchPrediction[] = data.items.map((row: any) => {
        const isKickoffPast = new Date(row.kickoff) < new Date();
        const mappedStatus = getStatus(row.status || 'upcoming', isKickoffPast);
        
        return {
          id: row.ID,
          matchId: row.ID.substring(0, 8),
          kickoff: row.kickoff,
          stage: row.stage || "Group Stage",
          homeTeam: { name: row.homeTeamName || "TBD", countryCode: row.homeTeamFlag || "UN", crest: row.homeTeamCrest },
          awayTeam: { name: row.awayTeamName || "TBD", countryCode: row.awayTeamFlag || "UN", crest: row.awayTeamCrest },
          status: mappedStatus,
          maxBets: row.maxBets || 3,
          predictedWdl: row.myPick || undefined,
          scorePicks: (row.myScores || []).map((ms: any) => ({
            id: ms.betId || Math.random().toString(36).substr(2, 9),
            home: String(ms.predictedHomeScore),
            away: String(ms.predictedAwayScore)
          })),
          actualHomeScore: row.status === 'finished' ? row.homeScore : undefined,
          actualAwayScore: row.status === 'finished' ? row.awayScore : undefined,
          pointsEarned: row.outcomePoints || undefined
        };
      });
      setMatches(mappedMatches);
    }
  }, [data]);

  const handleScoreChange = (matchId: string, pickId: string, type: 'home' | 'away', value: string) => {
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        scorePicks: m.scorePicks.map(p => p.id === pickId ? { ...p, [type]: value } : p)
      };
    }));
  };

  const handleAddScorePick = (matchId: string) => {
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;
      if (m.scorePicks.length >= (m.maxBets || 1)) return m;
      return {
        ...m,
        scorePicks: [...m.scorePicks, { id: Math.random().toString(36).substr(2, 9), home: '', away: '' }]
      };
    }));
  };

  const handleRemoveScorePick = (matchId: string, pickId: string) => {
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        scorePicks: m.scorePicks.filter(p => p.id !== pickId)
      };
    }));
  };

  const handleWdlChange = (id: string, wdl: WdlPick) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, predictedWdl: wdl } : m));
  };
  
  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'upcoming': return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200"><CalendarClock className="w-3 h-3 mr-1"/>{t('predictionDashboard.statusUpcoming')}</Badge>;
      case 'live': return <Badge variant="destructive" className="animate-pulse shadow-sm"><Activity className="w-3 h-3 mr-1"/>{t('predictionDashboard.statusInProcess')}</Badge>;
      case 'finished': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1"/>{t('predictionDashboard.statusClosed')}</Badge>;
    }
  };

  const columns: DataTableColumn<MatchPrediction>[] = useMemo(() => [
    {
      key: 'matchId',
      labelKey: 'predictionDashboard.columns.matchId',
      width: 100,
      render: (val, match) => (
        <div className="font-mono text-xs text-muted-foreground align-top pt-2">
          {match.matchId}
        </div>
      )
    },
    {
      key: 'kickoff',
      labelKey: 'predictionDashboard.columns.dateStage',
      width: 160,
      render: (val, match) => (
        <div className="flex flex-col gap-1 align-top pt-2">
          <span className="text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/70" />
            {new Date(match.kickoff).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
          </span>
          <span className="text-[11px] text-muted-foreground bg-muted/50 inline-flex w-fit px-1.5 py-0.5 rounded">
            {match.stage}
          </span>
        </div>
      )
    },
    {
      key: 'teams',
      labelKey: 'predictionDashboard.columns.teams',
      width: 240,
      render: (val, match) => {
        const isLocked = match.status !== 'upcoming';
        return (
          <div className="flex flex-col gap-2 align-top pt-2">
            <div className="flex items-center gap-2">
               <FlagIcon code={match.homeTeam.countryCode} />
               <span className={cn("text-sm font-medium", isLocked && match.actualHomeScore !== undefined && match.actualAwayScore !== undefined && (match.actualHomeScore > match.actualAwayScore) ? "font-bold text-foreground" : "text-foreground/80")}>{match.homeTeam.name}</span>
            </div>
            <div className="flex items-center gap-2">
               <FlagIcon code={match.awayTeam.countryCode} />
               <span className={cn("text-sm font-medium", isLocked && match.actualAwayScore !== undefined && match.actualHomeScore !== undefined && (match.actualAwayScore > match.actualHomeScore) ? "font-bold text-foreground" : "text-foreground/80")}>{match.awayTeam.name}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'scorePicks',
      labelKey: 'predictionDashboard.columns.scorePick',
      width: 200,
      render: (val, match) => {
        const isLocked = match.status !== 'upcoming';
        const maxBets = match.maxBets || 1;
        return (
          <div className="flex flex-col gap-1.5 items-center justify-center relative align-top pt-2">
            {match.scorePicks.length === 0 && isLocked ? (
               <span className="text-muted-foreground/50 text-xs mt-2">-</span>
            ) : (
              match.scorePicks.map((pick, i) => (
                <div key={pick.id} className="flex items-center gap-1.5 relative group/pick w-fit">
                  <Input 
                    type="number" 
                    disabled={isLocked}
                    value={pick.home}
                    onChange={(e) => handleScoreChange(match.id, pick.id, 'home', e.target.value)}
                    className="w-[42px] h-8 text-center px-1 font-semibold focus-visible:ring-1 bg-background"
                    placeholder="-"
                  />
                  <span className="text-muted-foreground font-semibold text-xs">:</span>
                  <Input 
                    type="number" 
                    disabled={isLocked}
                    value={pick.away}
                    onChange={(e) => handleScoreChange(match.id, pick.id, 'away', e.target.value)}
                    className="w-[42px] h-8 text-center px-1 font-semibold focus-visible:ring-1 bg-background"
                    placeholder="-"
                  />
                  {!isLocked && (
                    <button 
                      onClick={() => handleRemoveScorePick(match.id, pick.id)}
                      className="opacity-0 group-hover/pick:opacity-100 absolute -right-6 text-muted-foreground hover:text-destructive w-5 h-5 flex items-center justify-center transition-opacity"
                      title="Remove Pick"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
            {!isLocked && match.scorePicks.length < maxBets && (
              <div className={cn("w-full flex justify-center", match.scorePicks.length > 0 && "mt-1")}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAddScorePick(match.id)}
                  className="h-6 px-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-primary hover:bg-muted/50"
                >
                  <Plus size={12} className="mr-1" /> {t('predictionDashboard.addPick', { current: match.scorePicks.length, max: maxBets })}
                </Button>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'wdl',
      labelKey: 'predictionDashboard.columns.wdlPick',
      width: 200,
      render: (val, match) => {
        const isLocked = match.status !== 'upcoming';
        return (
           <div className="flex flex-col items-center gap-2 align-top pt-2">
             <div className="flex items-center justify-center bg-muted/30 rounded-md p-1 border">
               {(['home', 'draw', 'away'] as const).map(wdl => (
                 <Button
                   key={wdl}
                   variant="ghost"
                   size="sm"
                   disabled={isLocked}
                   onClick={() => handleWdlChange(match.id, wdl)}
                   className={cn(
                     "h-7 px-3 text-xs font-semibold rounded-sm transition-all",
                     match.predictedWdl === wdl 
                       ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
                       : "text-muted-foreground hover:text-foreground hover:bg-background"
                   )}
                 >
                   {wdl === 'home' ? '1' : wdl === 'draw' ? 'X' : '2'}
                 </Button>
               ))}
             </div>
           </div>
        );
      }
    },
    {
      key: 'status',
      labelKey: 'predictionDashboard.columns.status',
      width: 130,
      render: (val, match) => (
        <div className="align-top text-center pt-2 w-full flex justify-center">
           {getStatusBadge(match.status)}
        </div>
      )
    },
    {
      key: 'result',
      labelKey: 'predictionDashboard.columns.result',
      width: 120,
      render: (val, match) => (
        <div className="align-top text-center pt-2">
          {match.actualHomeScore !== undefined && match.actualAwayScore !== undefined ? (
            <div className="flex flex-col items-center gap-1">
               <span className="font-bold text-sm bg-muted/60 px-2 py-0.5 rounded-md border text-foreground">
                 {match.actualHomeScore} - {match.actualAwayScore}
               </span>
               {match.actualWdl && (
                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Result: {match.actualWdl === 'home' ? '1' : match.actualWdl === 'draw' ? 'X' : '2'}</span>
               )}
            </div>
          ) : (
            <span className="text-muted-foreground/50 text-sm font-medium mt-1 w-full text-center inline-block">-</span>
          )}
        </div>
      )
    },
    {
      key: 'points',
      labelKey: 'predictionDashboard.columns.points',
      width: 100,
      render: (val, match) => (
        <div className="align-top pt-2 flex justify-end">
          {match.pointsEarned !== undefined ? (
            <span className={cn(
              "inline-flex font-bold text-sm justify-center items-center px-2.5 py-1 rounded-full",
              match.pointsEarned > 0 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
            )}>
              +{match.pointsEarned} pts
            </span>
          ) : (
            <span className="text-muted-foreground/40 text-sm font-medium mt-1 block pr-2">-</span>
          )}
        </div>
      )
    }
  ], [matches, t]);

  const paginationConfig = {
    page,
    pageSize,
    totalCount: data?.totalCount || 0,
    onPageChange: (newPage: number) => setPage(newPage)
  };

  return (
    <Card className="w-full shadow-sm border-muted/60 bg-gradient-to-b from-card to-background gap-0 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-4 px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              {t('predictionDashboard.myPredictions')}
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm">
              {t('predictionDashboard.myPredictionsSubtitle')}
            </CardDescription>
          </div>
          <div className="flex flex-1 max-w-sm ml-auto items-center">
             <Input 
                 placeholder={t('predictionDashboard.searchByTeam')}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="bg-background"
             />
          </div>
        </div>
      </CardHeader>
      
      
      <CardContent className="p-0 relative flex flex-col [&>div>div.overflow-x-auto]:![scrollbar-width:auto] [&>div>div.overflow-x-auto::-webkit-scrollbar]:!block">
           <DataTable 
               variant="borderless"
               data={matches} 
               columns={columns}
               isLoading={isLoading}
               error={error as Error}
               emptyMessageKey="predictionDashboard.noMatchesFound"
               errorMessageKey="predictionDashboard.loadError"
               showFooter={false}
           />
           {matches.length > 0 && (
               <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/10">
                 <p className="text-xs text-muted-foreground">
                   {t('predictionDashboard.showing', { 
                     from: ((page - 1) * pageSize) + 1, 
                     to: Math.min(page * pageSize, data?.totalCount || 0), 
                     total: data?.totalCount || 0 
                   })}
                 </p>
                 <div className="flex items-center gap-1">
                   <button
                     onClick={() => setPage(p => Math.max(1, p - 1))}
                     disabled={page <= 1}
                     className="inline-flex h-8 items-center rounded border border-border bg-card px-3 text-xs font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                   >
                     <ChevronLeft className="w-3.5 h-3.5 mr-1" /> {t('predictionDashboard.prev')}
                   </button>
                   <div className="inline-flex items-center rounded border border-border bg-card/80 p-0.5">
                     {buildPaginationItems(page, Math.ceil((data?.totalCount || 0) / pageSize)).map((item, idx) =>
                       item === 'dots-left' || item === 'dots-right' ? (
                         <span key={item + String(idx)} className="inline-flex h-7 min-w-[28px] items-center justify-center px-1 text-xs text-muted-foreground">…</span>
                       ) : (
                         <button
                           key={String(item)}
                           onClick={() => setPage(item as number)}
                           className={cn(
                             "inline-flex h-7 min-w-[28px] items-center justify-center rounded px-2 text-xs font-semibold transition-colors",
                             page === item
                               ? "bg-primary text-primary-foreground shadow-sm"
                               : "text-foreground/70 hover:bg-muted hover:text-primary"
                           )}
                         >
                           {item}
                         </button>
                       )
                     )}
                   </div>
                   <button
                     onClick={() => setPage(p => Math.min(Math.ceil((data?.totalCount || 0) / pageSize), p + 1))}
                     disabled={page >= Math.ceil((data?.totalCount || 0) / pageSize)}
                     className="inline-flex h-8 items-center rounded border border-border bg-card px-3 text-xs font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                   >
                     {t('predictionDashboard.next')} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                   </button>
                 </div>
               </div>
           )}
      </CardContent>
    </Card>

  );
}
