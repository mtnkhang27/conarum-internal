import { LayoutGrid, UserRound } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AccessDenied } from '@/components/common/AccessDenied';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';
import { useUserInfo } from '@/hooks/useUserInfo';

export function AdminLayout() {
  const { t } = useTranslation();
  const { isAdmin, isLoading } = useUserInfo();
  const location = useLocation();
  const navigate = useNavigate();
  const adminNavItems = [
    {
      value: 'matches',
      to: '/admin/matches',
      label: t('admin.tabs.matches', 'Matches'),
    },
    {
      value: 'tournaments',
      to: '/admin/tournaments',
      label: t('admin.tabs.tournaments', 'Tournaments'),
    },
    {
      value: 'score-bets',
      to: '/admin/score-bets',
      label: t('admin.tabs.scoreBets', 'Score Bets'),
    },
    {
      value: 'users',
      to: '/admin/users',
      label: t('admin.tabs.users', 'Users'),
    },
  ];

  const activeTab = location.pathname.startsWith('/admin/tournaments')
    ? 'tournaments'
    : location.pathname.startsWith('/admin/score-bets')
      ? 'score-bets'
    : location.pathname.startsWith('/admin/users')
      ? 'users'
      : 'matches';

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
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-auto px-4 py-4 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('shell.adminWorkspace', 'Admin Workspace')}</p>
          <p className="text-xs text-muted-foreground">
            {t('shell.adminWorkspaceHint', 'Manage matches, tournaments, and user access.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* <LanguageSwitcher /> */}
          <Button type="button" size="sm" variant="subtle" className="rounded-full" onClick={() => navigate('/')}>
            <LayoutGrid className="h-4 w-4" />
            {t('shell.dashboard', 'Dashboard')}
          </Button>
          <Button type="button" size="sm" variant="subtle" className="rounded-full" onClick={() => navigate('/user')}>
            <UserRound className="h-4 w-4" />
            {t('shell.user', 'User')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        const target = adminNavItems.find((item) => item.value === value)?.to;
        if (target) navigate(target);
      }}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 overflow-visible bg-transparent p-0">
          {adminNavItems.map((item) => (
            <TabsTrigger key={item.to} value={item.value} className={cn('min-w-[140px] flex-none rounded-full border border-border bg-card px-4')}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
