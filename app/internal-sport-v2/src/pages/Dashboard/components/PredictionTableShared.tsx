import React from 'react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';

export type WdlPick = 'home' | 'draw' | 'away';

export function determineOutcome(homeScore?: number | null, awayScore?: number | null): WdlPick | undefined {
  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') return undefined;
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}

export function pickLabel(value?: string | null) {
  if (value === 'home') return '1';
  if (value === 'draw') return 'X';
  if (value === 'away') return '2';
  return '-';
}

export function getPickToneClasses(tone: 'neutral' | 'correct' | 'incorrect') {
  if (tone === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (tone === 'incorrect') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-border bg-background text-foreground';
}

export function getScoreCellToneClasses(tone: 'neutral' | 'correct' | 'incorrect') {
  if (tone === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (tone === 'incorrect') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-border bg-white text-foreground';
}

export function TeamFlag({ code, crest, name }: { code?: string | null; crest?: string | null; name: string }) {
  const fallbackSrc = `https://flagcdn.com/24x18/${(code || 'un').toLowerCase()}.png`;
  const defaultSrc = crest || fallbackSrc;

  return (
    <img
      src={defaultSrc}
      alt={name}
      className="h-8 w-12 object-contain"
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

interface ScorePickBoxProps {
  value: string;
  tone?: 'neutral' | 'correct' | 'incorrect';
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export function ScorePickBox({ value, tone = 'neutral', disabled, onChange }: ScorePickBoxProps) {
  if (onChange) {
    return (
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 2))}
        className="h-8 w-9 rounded-md border-border bg-white px-0 text-center text-[11px] font-semibold text-foreground shadow-none focus-visible:ring-1"
        placeholder="0"
        disabled={disabled}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex h-8 w-9 items-center justify-center rounded-md border text-[11px] font-semibold',
        getScoreCellToneClasses(tone)
      )}
    >
      {value || '-'}
    </span>
  );
}

interface OutcomeOptionProps {
  selected: boolean;
  locked?: boolean;
  tone?: 'neutral' | 'correct' | 'incorrect';
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function OutcomeOption({ selected, locked, tone = 'neutral', label, onClick, disabled }: OutcomeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 w-9 items-center justify-center rounded-md border text-[11px] font-semibold transition-colors',
        selected
          ? locked
            ? getPickToneClasses(tone)
            : 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}
