import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Token } from '@/components/ui/token';

export interface SelectedItemCardProps<T> {
  items: T[];
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => { primary: string; secondary?: string };
  onRemove: (id: string) => void;
  onClearAll: () => void;
  maxWidth?: string;
}

export function SelectedItemCard<T>({
  items,
  getItemId,
  getItemLabel,
  onRemove,
  onClearAll,
  maxWidth = '300px',
}: SelectedItemCardProps<T>) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <div className="px-6 py-3">
      <div className="bg-card rounded-lg border border-border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {t('common.selected', 'Selected')} ({items.length})
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
            {t('common.clearAll', 'Clear All')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
          {items.map((item) => {
            const id = getItemId(item);
            const label = getItemLabel(item);
            return (
              <Token
                key={id}
                onRemove={() => onRemove(id)}
                style={{ maxWidth }}
              >
                <span className="font-medium">{label.primary}</span>
                {label.secondary && (
                  <>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className="truncate">{label.secondary}</span>
                  </>
                )}
              </Token>
            );
          })}
        </div>
      </div>
    </div>
  );
}
