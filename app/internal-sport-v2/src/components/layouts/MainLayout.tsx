import React from 'react';
import { Outlet } from 'react-router-dom';

export function MainLayout() {
  return (
    <div className="h-screen overflow-auto bg-background w-full flex flex-col pt-4">
      <main id="main-scroll-container" className="mx-auto flex min-h-0 w-full flex-1 flex-col px-4 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
