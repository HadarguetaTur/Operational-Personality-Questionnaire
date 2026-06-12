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
  BookOpen,
  Activity,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const navGroups: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: React.ElementType }>;
}> = [
  {
    label: 'סקירה',
    items: [
      { href: '/admin', label: 'דאשבורד', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'אנליטיקה', icon: TrendingUp },
    ],
  },
  {
    label: 'לידים ושיווק',
    items: [
      { href: '/admin/leads', label: 'לידים', icon: Users },
      { href: '/admin/funnels', label: 'משפכים', icon: GitBranch },
      { href: '/admin/bot', label: 'סוכן הבוט', icon: Activity },
      { href: '/admin/guides', label: 'מדריכים', icon: BookOpen },
    ],
  },
  {
    label: 'דיוור',
    items: [
      { href: '/admin/templates', label: 'תבניות מייל', icon: Mail },
      { href: '/admin/mailing', label: 'שליחת דיוור', icon: Send },
    ],
  },
  {
    label: 'מערכת',
    items: [
      { href: '/admin/documents', label: 'מסמכים', icon: FileText },
      { href: '/admin/users', label: 'ניהול משתמשים', icon: ShieldCheck },
      { href: '/admin/settings', label: 'הגדרות', icon: Settings },
    ],
  },
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
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-[0_4px_14px_rgba(20,184,166,0.35)]">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold leading-tight text-white">
            הדר אוטומציות
          </h1>
          <p className="text-xs text-sidebar-muted">מערכת ניהול</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider text-sidebar-muted/80">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
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
                      'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
                      isActive
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.04]'
                    )}
                  >
                    {isActive && (
                      <span className="absolute start-0 inset-y-1.5 w-[3px] rounded-full bg-sidebar-accent" />
                    )}
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                        isActive ? 'text-sidebar-accent' : 'text-sidebar-muted'
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        {userEmail && (
          <p className="text-[11px] text-sidebar-muted/70 mb-2 truncate px-3" dir="ltr">
            {userEmail}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-sidebar-muted hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
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
        className="fixed top-4 right-4 z-[90] md:hidden p-2.5 bg-card rounded-xl shadow-card border border-border text-foreground"
        aria-label="תפריט"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Sheet sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="p-0 w-72 border-0 bg-sidebar text-sidebar-foreground" dir="rtl">
          <SheetTitle className="sr-only">תפריט ניווט</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 flex-col h-screen sticky top-0 border-l border-sidebar-border"
        dir="rtl"
      >
        <SidebarContent />
      </aside>
    </>
  );
}
