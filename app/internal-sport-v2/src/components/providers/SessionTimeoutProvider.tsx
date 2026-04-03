import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

// ─── Configuration ────────────────────────────────────────────────
// Idle timeout: how long before showing the warning dialog
const IDLE_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes

// Countdown: seconds shown in the warning dialog before auto-logout
const COUNTDOWN_SECONDS = 60;

// Events that count as "user activity"
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

// ─── Context ──────────────────────────────────────────────────────
interface SessionTimeoutContextType {
    /** Call this from the 401 interceptor to show a "Session Expired" dialog */
    triggerSessionExpired: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType>({
    triggerSessionExpired: () => { },
});

export const useSessionTimeout = () => useContext(SessionTimeoutContext);

// ─── Global ref for axiosInstance (outside React tree) ────────────
let globalTrigger: (() => void) | null = null;

/**
 * Call this from axiosInstance.ts when a 401 is received.
 * It will show the "Session Expired" dialog if the provider is mounted.
 */
export function triggerSessionExpiredGlobal() {
    if (globalTrigger) {
        globalTrigger();
    } else {
        // Fallback if provider not mounted yet
        window.location.href = '/do/logout';
    }
}

// ─── Provider Component ───────────────────────────────────────────
type DialogState = 'hidden' | 'warning' | 'expired';

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
    const [dialogState, setDialogState] = useState<DialogState>('hidden');
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastActivityRef = useRef(Date.now());

    // ── Logout ──
    const handleLogout = useCallback(() => {
        window.location.href = '/do/logout';
    }, []);

    // ── Clear all timers ──
    const clearAllTimers = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }, []);

    // ── Start countdown (warning phase) ──
    const startCountdown = useCallback(() => {
        console.log('[SessionTimeout] Idle timeout reached — showing warning dialog.');
        setDialogState('warning');
        setCountdown(COUNTDOWN_SECONDS);

        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Time's up → auto-logout
                    clearAllTimers();
                    handleLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearAllTimers, handleLogout]);

    // ── Start idle timer ──
    const startIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(() => {
            startCountdown();
        }, IDLE_TIMEOUT_MS);
    }, [startCountdown]);

    // ── "Continue Working" handler ──
    const handleContinueWorking = useCallback(() => {
        console.log('[SessionTimeout] User clicked Continue Working — resetting timer.');
        clearAllTimers();
        setDialogState('hidden');
        setCountdown(COUNTDOWN_SECONDS);
        lastActivityRef.current = Date.now();
        startIdleTimer();
    }, [clearAllTimers, startIdleTimer]);

    // ── "Session Expired" trigger (from 401 interceptor) ──
    const triggerSessionExpired = useCallback(() => {
        console.log('[SessionTimeout] Session expired (401) — showing expired dialog.');
        clearAllTimers();
        setDialogState('expired');
    }, [clearAllTimers]);

    // Register global trigger for axiosInstance
    useEffect(() => {
        globalTrigger = triggerSessionExpired;
        return () => { globalTrigger = null; };
    }, [triggerSessionExpired]);

    // ── Activity event listeners + initial timer ──
    useEffect(() => {
        console.log('[SessionTimeout] Provider mounted. Idle timeout:', IDLE_TIMEOUT_MS / 1000, 'seconds');

        // Throttle activity events (fire at most once per 30s to avoid performance issues)
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastActivityRef.current > 30000) {
                lastActivityRef.current = now;
                // Only reset if dialog is hidden (user is actively working, not in warning/expired state)
                if (dialogState === 'hidden') {
                    startIdleTimer();
                }
            }
        };

        ACTIVITY_EVENTS.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true });
        });

        // Start initial idle timer
        startIdleTimer();

        return () => {
            ACTIVITY_EVENTS.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
            clearAllTimers();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogState]);

    return (
        <SessionTimeoutContext.Provider value={{ triggerSessionExpired }}>
            {children}

            {/* ── Warning / Expired Dialog ── */}
            {dialogState !== 'hidden' && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
                >
                    <div
                        className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-border"
                        style={{
                            animation: 'fadeInScale 0.2s ease-out',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 pt-6 pb-3">
                            <div
                                className="p-2.5 rounded-xl"
                                style={{ backgroundColor: dialogState === 'expired' ? 'hsl(var(--destructive) / 0.1)' : '#fef3c7' }}
                            >
                                <AlertTriangle
                                    size={22}
                                    style={{ color: dialogState === 'expired' ? 'hsl(var(--destructive))' : '#d97706' }}
                                />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {dialogState === 'expired' ? 'Session Expired' : 'Attention'}
                            </h3>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border mx-6" />

                        {/* Body */}
                        <div className="px-6 py-5">
                            {dialogState === 'warning' ? (
                                <p className="text-sm text-muted-foreground">
                                    Due to inactivity, you are going to be signed out in{' '}
                                    <span className="font-bold text-foreground text-base">{countdown}</span>{' '}
                                    Second{countdown !== 1 ? 's' : ''}.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Your session has expired. Please sign in again to continue working.
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div
                            className="flex items-center justify-center gap-3 px-6 py-4 border-t border-border"
                            style={{ backgroundColor: 'hsl(var(--muted) / 0.5)' }}
                        >
                            {dialogState === 'warning' ? (
                                <>
                                    <button
                                        onClick={handleContinueWorking}
                                        className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
                                    >
                                        <RefreshCw size={15} />
                                        Continue Working
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleLogout}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
                                >
                                    <LogOut size={15} />
                                    Sign In Again
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Inline animation keyframes */}
            <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
        </SessionTimeoutContext.Provider>
    );
}
