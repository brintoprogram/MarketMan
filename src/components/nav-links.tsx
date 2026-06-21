'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Bell, CalendarClock, Users, MessageCircle, Sparkles, Calculator, Settings, BookOpen, Workflow, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/alerts',       icon: Bell,            label: 'Alertas' },
  { href: '/flows',        icon: Workflow,        label: 'Fluxos' },
  { href: '/reports',      icon: CalendarClock,   label: 'Relatórios' },
  { href: '/recipients',   icon: Users,           label: 'Destinatários' },
  { href: '/messages',     icon: MessageCircle,   label: 'Mensagens' },
  { href: '/templates',    icon: Sparkles,        label: 'Templates' },
  { href: '/calculator',   icon: Calculator,      label: 'Conversor' },
  { href: '/tutorial',     icon: BookOpen,        label: 'Guia' },
  { href: '/settings',     icon: Settings,        label: 'Configurações' }
];

export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      {/* Desktop: lista horizontal */}
      <div className="hidden items-center gap-1 lg:flex">
        {LINKS.map((l) => (
          <NavItem key={l.href} {...l} active={isActive(l.href)} />
        ))}
      </div>

      {/* Mobile: hamburger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition hover:bg-brand-soft hover:text-brand-ink lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[280px] border-l border-line bg-panel p-4 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-3">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-2 hover:bg-brand-soft hover:text-brand-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <NavItem key={l.href} {...l} active={isActive(l.href)} onClick={() => setOpen(false)} fullWidth />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({
  href, icon: Icon, label, active, onClick, fullWidth
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition',
        fullWidth && 'w-full',
        active
          ? 'bg-brand-soft text-brand-ink'
          : 'text-ink-2 hover:bg-brand-soft hover:text-brand-ink'
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', active ? 'text-brand-ink' : 'text-ink-3')} />
      {label}
    </Link>
  );
}
