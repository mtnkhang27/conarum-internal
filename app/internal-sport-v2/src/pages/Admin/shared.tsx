import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { formatLocalDateTime } from '@/utils/localTime';

export const ALL_OPTION = '__all__';
export const NONE_OPTION = '__none__';

export const MATCH_STAGES = [
  'group',
  'roundOf32',
  'roundOf16',
  'quarterFinal',
  'semiFinal',
  'thirdPlace',
  'final',
  'regular',
  'playoff',
  'relegation',
] as const;

export const MATCH_STATUSES = ['upcoming', 'live', 'finished', 'cancelled'] as const;
export const TOURNAMENT_STATUSES = ['upcoming', 'active', 'completed', 'cancelled'] as const;

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  roundOf32: 'Round of 32',
  roundOf16: 'Round of 16',
  quarterFinal: 'Quarter Final',
  semiFinal: 'Semi Final',
  thirdPlace: 'Third Place',
  final: 'Final',
  regular: 'Regular Season',
  playoff: 'Playoff',
  relegation: 'Relegation',
};

const PICK_LABELS: Record<'home' | 'draw' | 'away', string> = {
  home: 'Home',
  draw: 'Draw',
  away: 'Away',
};

export function formatStageLabel(stage?: string | null, leg?: number | null) {
  if (!stage) return 'Stage TBD';

  const base = STAGE_LABELS[stage] || stage;
  return leg ? `${base} - Leg ${leg}` : base;
}

export function formatCurrencyValue(value?: number | null) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatAuditTimestamp(value?: string | null) {
  if (!value) return 'Not recorded';

  return formatLocalDateTime(value, {
    dateOptions: {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
    timeOptions: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    separator: ' - ',
  });
}

export function matchStatusTone(status?: string | null) {
  switch (status) {
    case 'live':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'finished':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'cancelled':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-blue-200 bg-blue-50 text-blue-700';
  }
}

export function tournamentStatusTone(status?: string | null) {
  switch (status) {
    case 'active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'completed':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

export function pickToneClasses(tone: 'neutral' | 'correct' | 'incorrect') {
  if (tone === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (tone === 'incorrect') return 'border-red-300 bg-red-50 text-red-700';

  return 'border-border bg-background text-foreground';
}

export function formatPickLabel(pick: 'home' | 'draw' | 'away') {
  return PICK_LABELS[pick];
}

export function TeamAvatar({
  name,
  crest,
  flagCode,
  className,
}: {
  name: string;
  crest?: string | null;
  flagCode?: string | null;
  className?: string;
}) {
  const fallbackSrc = `https://flagcdn.com/24x18/${(flagCode || 'un').toLowerCase()}.png`;
  const source = crest || fallbackSrc;

  return (
    <img
      src={source}
      alt={name}
      className={cn('h-8 w-11 rounded-md border bg-muted object-cover shadow-sm', className)}
      onError={(event) => {
        const target = event.target as HTMLImageElement;

        if (target.src !== fallbackSrc) {
          target.src = fallbackSrc;
          return;
        }

        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
      }}
    />
  );
}

export function PlayerAvatar({
  name,
  avatar,
  className,
}: {
  name: string;
  avatar?: string | null;
  className?: string;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || '?';

  if (avatar) {
    return <img src={avatar} alt={name} className={cn('h-9 w-9 rounded-full border object-cover', className)} />;
  }

  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground',
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function SummaryStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: string;
}) {
  return (
    <Badge variant="outline" className={cn('font-medium', tone)}>
      {label}
    </Badge>
  );
}

export function EmptySelectionPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed border-border/80 bg-card/60">
      <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
