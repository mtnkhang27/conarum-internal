import { useTranslation } from 'react-i18next';
import { Input } from './input';
import type { FilterComponentProps, TextFilterConfig } from '../filterbar/types';

/**
 * Text Input Filter
 * Simple text input for free text search
 */
export function TextFilter({
    config,
    value,
    onChange,
}: FilterComponentProps<TextFilterConfig>) {
    const { t } = useTranslation();

    const placeholder = config.placeholder
        ? t(config.placeholder, config.placeholder)
        : '';

    return (
        <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={config.maxLength}
            variant={"default"}
        />
    );
}
