import React from 'react';
import { Outlet } from 'react-router-dom';


export function MainLayout() {
  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-background">
      <main
        id="main-scroll-container"
        className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
