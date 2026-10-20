import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* WCAG 2.2 Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#2563EB] focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB]"
      >
        Skip to main content
      </a>

      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
