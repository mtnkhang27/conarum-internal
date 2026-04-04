import { Routes, Route, HashRouter, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { MainLayout } from './components/layouts';
import { Dashboard } from './pages/Dashboard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SessionTimeoutProvider } from './components/providers/SessionTimeoutProvider';
import { useFLPSyncDirect, getInitialFLPRoute } from './hooks/useFLPSync';
import { useRef, useEffect } from 'react';
import { AdminLayout } from './pages/Admin/AdminLayout';
import { MatchManagementPage } from './pages/Admin/MatchManagementPage';
import { TournamentManagementPage } from './pages/Admin/TournamentManagementPage';

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
        <SessionTimeoutProvider>
            <HashRouter>
                <ShellSync />
                <InitialRouteNavigator />
                <div className="min-h-screen bg-background">
                    <ErrorBoundary>
                        <Routes>
                            <Route element={<MainLayout />}>
                                <Route path="/" element={<Dashboard />} />
                            </Route>
                            <Route element={<AdminLayout />}>
                                <Route path="/admin/matches" element={<MatchManagementPage />} />
                                <Route path="/admin/matches/:matchId" element={<MatchManagementPage />} />
                                <Route path="/admin/tournaments" element={<TournamentManagementPage />} />
                                <Route path="/admin/tournaments/:tournamentId" element={<TournamentManagementPage />} />
                                <Route path="/admin" element={<Navigate to="/admin/matches" replace />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </ErrorBoundary>
                    <Toaster />
                </div>
            </HashRouter>
        </SessionTimeoutProvider>
    );
}
