/**
 * useConfirm Hook
 * Replaces native window.confirm() with a styled AlertDialog.
 * Returns a Promise-based confirm() function and a ConfirmDialog element to render.
 *
 * Usage:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   // In handler:
 *   const ok = await confirm({ title: 'Delete?', description: 'This cannot be undone.' });
 *   if (!ok) return;
 *   // ... proceed
 *   // In JSX:
 *   return <>{ConfirmDialog}</>
 */

import { useState, useCallback, useRef } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';

export interface ConfirmOptions {
    title?: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Apply destructive styling to the confirm button */
    destructive?: boolean;
}

interface DialogState {
    open: boolean;
    options: ConfirmOptions;
}

export function useConfirm() {
    const { t } = useTranslation();
    const [state, setState] = useState<DialogState>({
        open: false,
        options: { description: '' },
    });

    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
            setState({ open: true, options });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setState((prev) => ({ ...prev, open: false }));
        resolveRef.current?.(true);
        resolveRef.current = null;
    }, []);

    const handleCancel = useCallback(() => {
        setState((prev) => ({ ...prev, open: false }));
        resolveRef.current?.(false);
        resolveRef.current = null;
    }, []);

    const { options } = state;

    const ConfirmDialog = (
        <AlertDialog open={state.open} onOpenChange={(open) => !open && handleCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {options.title || t('common.confirm')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {options.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>
                        {options.cancelLabel || t('common.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className={options.destructive ? 'bg-destructive hover:bg-destructive/90' : ''}
                    >
                        {options.confirmLabel || t('common.confirm')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return { confirm, ConfirmDialog };
}
