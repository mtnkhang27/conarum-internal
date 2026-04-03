
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/utils/cn';

interface FieldInputProps {
    label: string;
    value: any;
    onChange: (value: any) => void;
    type?: 'text' | 'number' | 'date' | 'textarea' | 'checkbox';
    placeholder?: string;
    error?: string;
    className?: string;
    confidence?: number;
    readOnly?: boolean;
}

export function FieldInput({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    error,
    className,
    confidence,
    readOnly
}: FieldInputProps) {

    // Confidence Badge rendering logic if needed adjacent to label

    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                {confidence !== undefined && (
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        confidence >= 0.8 ? "bg-confidence-high/15 text-confidence-high" :
                            confidence >= 0.5 ? "bg-confidence-medium/15 text-confidence-medium" : "bg-confidence-low/15 text-confidence-low"
                    )}>
                        {Math.round(confidence * 100)}%
                    </span>
                )}
            </div>

            {type === 'textarea' ? (
                <Textarea
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(error && "border-destructive", "min-h-[80px] text-sm")}
                    readOnly={readOnly}
                />
            ) : (
                <Input
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(error && "border-destructive", "h-9 text-sm")}
                    readOnly={readOnly}
                />
            )}

            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    );
}
