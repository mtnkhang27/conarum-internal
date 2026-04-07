import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useFioriTheme } from '@/contexts/FioriThemeContext';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
  { value: 'ja', label: 'JP' },
] as const;

function normalizeLanguage(language: string | null | undefined) {
  const normalized = language?.trim().toLowerCase() || 'en';

  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('ja') || normalized.startsWith('jp')) return 'ja';

  return 'en';
}

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useFioriTheme();
  const activeLanguage = normalizeLanguage(language);

  return (
    <div className={cn('flex items-center gap-1 rounded-full border border-border/80 bg-card/90 p-1', className)}>
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('shell.language', 'Language')}
      </span>
      {LANGUAGE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={activeLanguage === option.value ? 'default' : 'ghost'}
          className="h-7 min-w-11 rounded-full px-2 text-[11px] font-semibold"
          onClick={() => setLanguage(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
