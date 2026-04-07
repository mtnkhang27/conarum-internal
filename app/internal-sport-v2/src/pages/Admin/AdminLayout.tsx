import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AccessDenied } from '@/components/common/AccessDenied';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';
import { useUserInfo } from '@/hooks/useUserInfo';

const adminNavItems = [
  {
    value: 'matches',
    to: '/admin/matches',
    label: 'Matches',
  },
  {
    value: 'tournaments',
    to: '/admin/tournaments',
    label: 'Tournaments',
  },
  {
    value: 'users',
    to: '/admin/users',
    label: 'Users',
  },
];

export function AdminLayout() {
  const { isAdmin, isLoading } = useUserInfo();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.startsWith('/admin/tournaments')
    ? 'tournaments'
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
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-3">
      <Tabs value={activeTab} onValueChange={(value) => {
        const target = adminNavItems.find((item) => item.value === value)?.to;
        if (target) navigate(target);
      }}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {adminNavItems.map((item) => (
            <TabsTrigger key={item.to} value={item.value} className={cn('min-w-[140px]')}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
