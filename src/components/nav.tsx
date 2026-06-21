import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { NavLinks } from '@/components/nav-links';

async function signOut() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function AppNav() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isDemo = user?.email === 'demo@marketman.app';

  return (
    <nav className="sticky top-0 z-40 glass">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="transition-opacity hover:opacity-80">
            <Logo size="sm" />
          </Link>
          <NavLinks />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user?.email && (
            <div className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 sm:inline-flex">
              {isDemo && <span className="dot-active" />}
              <span>{isDemo ? 'Modo demo' : user.email}</span>
            </div>
          )}
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sair"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-ink-2 transition hover:bg-brand-soft hover:text-brand-ink"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
