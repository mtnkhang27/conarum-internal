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
        <div className="mx-auto flex w-full items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
          <NavLink to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary sm:h-10 sm:w-10 sm:rounded-2xl">
              <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                {t('shell.appTitle', 'Internal Sport Prediction')}
              </p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {t('shell.appSubtitle', 'Predict, track, and manage your tournament access in one place.')}
              </p>
            </div>
          </NavLink>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* <LanguageSwitcher /> */}

            <Button asChild type="button" size="sm" variant="subtle" className="rounded-full">
              <NavLink to="/user">
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">{t('shell.user', 'User')}</span>
              </NavLink>
            </Button>

            {isAdmin ? (
              <Button asChild type="button" size="sm" variant="subtle" className="rounded-full">
                <NavLink to="/admin">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('shell.admin', 'Admin')}</span>
                </NavLink>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main
        id="main-scroll-container"
        className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
