'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/admin/Sidebar';
import { Toaster } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 md:pt-8 md:p-8 overflow-auto min-w-0">
        {children}
      </main>
      <Toaster position="top-center" richColors dir="rtl" />
    </div>
  );
}
