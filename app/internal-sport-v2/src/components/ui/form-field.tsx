import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/utils';

interface FormFieldProps {
    label: string;
    value: string | number;
    onChange?: (value: any) => void;
    type?: 'text' | 'number' | 'date';
    variant?: 'default' | 'info' | 'success' | 'warning' | 'destructive' | 'readonly';
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    placeholder?: string;
    className?: string;
    labelClassName?: string;
    /** Layout: 'stacked' = label on top (2 lines), 'inline' = label and input side by side (1 line) */
    layout?: 'stacked' | 'inline';
    /** Width of label in inline layout (e.g., '200px', '30%') */
    labelWidth?: string;
    /** Custom tooltip text to show on hover */
    tooltip?: string;
    /** Enable tooltip to show the field value (only works for readonly/disabled fields) */
    showTooltip?: boolean;
}

/**
 * A reusable form field component that combines Label and Input/DatePicker
 * This eliminates repetitive div/Label/Input patterns
 * 
 * @param layout - 'stacked' (default): label on top, input below | 'inline': label and input side by side
 * @param labelWidth - Width of label in inline layout (default: '200px')
 */
export function FormField({
    label,
    value,
    onChange,
    type = 'text',
    variant,
    disabled = false,
    readOnly = false,
    required = false,
    placeholder,
    className,
    labelClassName,
    layout = 'stacked',
    labelWidth = '200px',
    tooltip,
    showTooltip = false,
}: FormFieldProps) {
    const isInline = layout === 'inline';

    const inputElement = type === 'date' ? (
        <DatePicker
            value={value as string}
            onChange={onChange}
            disabled={disabled}
            readOnly={readOnly}
            variant={variant}
        />
    ) : (
        <Input
            type={type}
            value={value}
            onChange={onChange}
            variant={variant}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={placeholder}
        />
    );

    // Show tooltip if:
    // 1. Custom tooltip is provided, OR
    // 2. showTooltip is enabled AND field is readonly/disabled (shows the value)
    const shouldShowTooltip = tooltip || (showTooltip && (disabled || readOnly) && value);
    const tooltipText = tooltip || (showTooltip ? String(value) : '');

    const wrappedInput = shouldShowTooltip ? (
        <Tooltip>
            <TooltipTrigger asChild>
                <div>{inputElement}</div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{tooltipText}</p>
            </TooltipContent>
        </Tooltip>
    ) : inputElement;

    return (
        <div className={cn(
            isInline ? 'flex items-center gap-3' : 'space-y-2',
            className
        )}>
            <Label
                className={cn(
                    isInline && 'shrink-0',
                    labelClassName
                )}
                style={isInline ? { width: labelWidth } : undefined}
            >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>

            <div className={isInline ? 'flex-1' : undefined}>
                {wrappedInput}
            </div>
        </div>
    );
}
