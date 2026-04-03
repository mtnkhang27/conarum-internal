import { Routes, Route, HashRouter, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/sonner';
import { queryClient } from './queryClient';
import { MainLayout } from './components/layouts';
import { Dashboard } from './pages/Dashboard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SessionTimeoutProvider } from './components/providers/SessionTimeoutProvider';
import { useFLPSyncDirect, getInitialFLPRoute } from './hooks/useFLPSync';
import { useRef, useEffect } from 'react';

// Component to sync React Router with FLP shell URL
function ShellSync() {
    useFLPSyncDirect();
    return null;
}

// Component to navigate to initial route from FLP hash on app load
function InitialRouteNavigator() {
    const navigate = useNavigate();
    const hasNavigated = useRef(false);

    useEffect(() => {
        if (hasNavigated.current) return;
        hasNavigated.current = true;

        const initialRoute = getInitialFLPRoute();
        console.log("[App] Initial FLP route:", initialRoute);

        if (initialRoute && initialRoute !== "/") {
            console.log("[App] Navigating to initial route:", initialRoute);
            navigate(initialRoute, { replace: true });
        }
    }, [navigate]);

    return null;
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <HashRouter>
                <ShellSync />
                <InitialRouteNavigator />
                <div className="min-h-screen bg-background">
                    <ErrorBoundary>
                        <Routes>
                            {/* Main application routes with layout */}
                            <Route element={<MainLayout />}>
                                <Route path="/" element={<Dashboard />} />
                            </Route>
                        </Routes>
                    </ErrorBoundary>
                    <Toaster />
                </div>
            </HashRouter>
        </QueryClientProvider>
    );
}
