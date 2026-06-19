import Link from 'next/link';
import { Coffee, LayoutDashboard, Bell, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function AppNav() {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
          <Coffee className="h-5 w-5 text-emerald-600" />
          MarketMan
        </Link>
        <div className="flex items-center gap-1">
          <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavLink>
          <NavLink href="/alerts" icon={<Bell className="h-4 w-4" />}>Alertas</NavLink>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
    >
      {icon}
      {children}
    </Link>
  );
}

async function signOut() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
