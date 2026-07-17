'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Search, Scissors, Users } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/dashboard/search', label: 'البحث عن العملاء', icon: Search },
  { href: '/dashboard/leads', label: 'العملاء المحتملون', icon: Users },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#050505] text-white" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <Link href="/dashboard" className="flex items-center gap-3 font-black">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-500 text-black"><Scissors size={21} /></span>
            <span className="text-xl text-yellow-500">Salon Agent</span>
          </Link>
          <nav className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {links.map(({ href, label, icon: Icon }) => {
              const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${active ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>
                  <Icon size={16} /> {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">{children}</div>
    </div>
  );
}
