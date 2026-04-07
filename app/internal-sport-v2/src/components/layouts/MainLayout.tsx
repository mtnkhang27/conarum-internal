import { LayoutGrid, ShieldCheck, UserRound } from 'lucide-react';
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { useUserInfo } from '@/hooks/useUserInfo';

export function MainLayout() {
  const { t } = useTranslation();
  const { isAdmin } = useUserInfo();

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <LayoutGrid className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {t('shell.appTitle', 'Internal Sport Prediction')}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {t('shell.appSubtitle', 'Predict, track, and manage your tournament access in one place.')}
              </p>
            </div>
          </NavLink>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* <LanguageSwitcher /> */}

            <Button asChild type="button" size="sm" variant="subtle" className="rounded-full">
              <NavLink to="/user">
                <UserRound className="h-4 w-4" />
                {t('shell.user', 'User')}
              </NavLink>
            </Button>

            {isAdmin ? (
              <Button asChild type="button" size="sm" variant="subtle" className="rounded-full">
                <NavLink to="/admin">
                  <ShieldCheck className="h-4 w-4" />
                  {t('shell.admin', 'Admin')}
                </NavLink>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main
        id="main-scroll-container"
        className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 py-4 lg:px-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
