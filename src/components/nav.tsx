import Link from 'next/link';
import { LayoutDashboard, Bell, LogOut, ChevronRight, Settings, Calculator, CalendarClock, MessageCircle, Users, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

async function signOut() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function AppNav() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-40 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="transition-opacity hover:opacity-80">
            <Logo size="sm" />
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavLink>
            <NavLink href="/alerts" icon={<Bell className="h-4 w-4" />}>Alertas</NavLink>
            <NavLink href="/reports" icon={<CalendarClock className="h-4 w-4" />}>Relatórios</NavLink>
            <NavLink href="/recipients" icon={<Users className="h-4 w-4" />}>Destinatários</NavLink>
            <NavLink href="/messages" icon={<MessageCircle className="h-4 w-4" />}>Mensagens</NavLink>
            <NavLink href="/templates" icon={<Sparkles className="h-4 w-4" />}>Templates</NavLink>
            <NavLink href="/calculator" icon={<Calculator className="h-4 w-4" />}>Conversor</NavLink>
            <NavLink href="/settings" icon={<Settings className="h-4 w-4" />}>Configurações</NavLink>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user?.email && (
            <div className="hidden items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {user.email === 'demo@marketman.app' ? 'Modo demo' : user.email}
            </div>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
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
      className="group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-900 hover:shadow-soft"
    >
      <span className="text-zinc-400 transition group-hover:text-brand-600">{icon}</span>
      {children}
      <ChevronRight className="h-3 w-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-50" />
    </Link>
  );
}
