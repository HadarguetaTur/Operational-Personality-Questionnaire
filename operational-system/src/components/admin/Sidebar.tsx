'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Mail,
  FileText,
  Settings,
  LogOut,
  Menu,
  Send,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const navItems = [
  { href: '/admin', label: 'דאשבורד', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'אנליטיקה', icon: TrendingUp },
  { href: '/admin/funnels', label: 'משפכים', icon: GitBranch },
  { href: '/admin/leads', label: 'לידים', icon: Users },
  { href: '/admin/templates', label: 'תבניות מייל', icon: Mail },
  { href: '/admin/mailing', label: 'שליחת דיוור', icon: Send },
  { href: '/admin/documents', label: 'מסמכים', icon: FileText },
  { href: '/admin/users', label: 'ניהול משתמשים', icon: ShieldCheck },
  { href: '/admin/settings', label: 'הגדרות', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '');
    });
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">ניהול מערכת</h1>
        <p className="text-sm text-gray-500 mt-1">ארכיטקטורת סקייל</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        {userEmail && (
          <p className="text-xs text-gray-400 mb-3 truncate px-3">{userEmail}</p>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>יציאה</span>
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-[90] md:hidden p-2 bg-white rounded-lg shadow-md border border-gray-200"
        aria-label="תפריט"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile Sheet sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="p-0 w-72" dir="rtl">
          <SheetTitle className="sr-only">תפריט ניווט</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-l border-gray-200 flex-col h-screen sticky top-0" dir="rtl">
        <SidebarContent />
      </aside>
    </>
  );
}
