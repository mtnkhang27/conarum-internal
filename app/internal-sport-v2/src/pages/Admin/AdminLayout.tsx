import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, Table2, Trophy, LayoutPanelLeft } from 'lucide-react';
import { AccessDenied } from '@/components/common/AccessDenied';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { useUserInfo } from '@/hooks/useUserInfo';

const adminNavItems = [
  {
    to: '/admin/matches',
    label: 'Matches',
    description: 'Score rules, outcome points, winners, and audit.',
    icon: Table2,
  },
  {
    to: '/admin/tournaments',
    label: 'Tournaments',
    description: 'Outcome rewards, champion config, and tournament locks.',
    icon: Trophy,
  },
];

export function AdminLayout() {
  const { isAdmin, isLoading } = useUserInfo();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Checking admin access...
      </div>
    );
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6 py-6">
      <Card className="overflow-hidden border-border/80 bg-gradient-to-r from-card to-muted/30 shadow-sm">
        <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Workspace
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground">Internal Prediction V2 Admin</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Worklist-style management for matches and tournaments, with flexible detail panes for live configuration,
                audit context, and winner tracking.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-2xl border p-4 transition-all',
                      isActive
                        ? 'border-primary/25 bg-primary/10 shadow-sm'
                        : 'border-border/80 bg-background/80 hover:border-primary/20 hover:bg-muted/40',
                    )
                  }
                >
                  {({ isActive }) => (
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'rounded-xl border p-2.5',
                          isActive
                            ? 'border-primary/20 bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{item.label}</span>
                          {isActive ? <LayoutPanelLeft className="h-4 w-4 text-primary" /> : null}
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Outlet />
    </div>
  );
}
