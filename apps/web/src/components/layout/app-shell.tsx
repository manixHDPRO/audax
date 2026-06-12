'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Radio,
  Users,
  Calendar,
  FileText,
  Bell,
  Settings,
  Shield,
  Plus,
  ChevronRight,
  Hexagon,
  X,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuthStore, canAccessCommandCenter, canViewAudit, canCreateAudience, isWaitingRoomRole } from '@/stores/auth-store';
import { useAudiencesStore } from '@/stores/audiences-store';
import { isApiConfigured } from '@/lib/api-config';
import { ROLE_LABELS } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
  permission?: string;
  accent?: boolean;
}

function isWaitingRoomPath(pathname: string) {
  return (
    pathname === '/audiences' ||
    pathname === '/audiences/new' ||
    pathname === '/profile'
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/command-center', label: 'Command Center', icon: Radio, roles: ['ADMIN', 'CHEF', 'CEMG'], accent: true },
  { href: '/audiences', label: 'Audiences', icon: FileText },
  { href: '/audiences/new', label: 'Nouvelle', icon: Plus, permission: 'CREATE_AUDIENCE' },
  { href: '/calendar', label: 'Agenda', icon: Calendar },
  { href: '/visitors', label: 'Visiteurs', icon: Users },
  { href: '/reports', label: 'Rapports', icon: FileText },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Paramètres', icon: Settings },
  { href: '/audit', label: 'Audit', icon: Shield, roles: ['ADMIN'] },
];

function filterNav(role?: string, permissions?: string[]) {
  if (isWaitingRoomRole(role)) {
    return NAV_ITEMS.filter((item) => isWaitingRoomPath(item.href));
  }

  return NAV_ITEMS.filter((item) => {
    if (item.href === '/command-center' && !canAccessCommandCenter(role, permissions)) return false;
    if (item.href === '/audit' && !canViewAudit(role, permissions)) return false;
    if (item.permission && !canCreateAudience(role, permissions)) return false;
    if (item.roles && role && !item.roles.includes(role)) return false;
    return true;
  });
}

/* ─── Orbital Command Menu — innovation principale ─── */
function OrbitalMenu({
  items,
  isOpen,
  onClose,
  activePath,
}: {
  items: NavItem[];
  isOpen: boolean;
  onClose: () => void;
  activePath: string;
}) {
  const radius = 140;
  const centerAngle = -90;
  const spread = 160;
  const startAngle = centerAngle - spread / 2;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            {/* Orbital ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="relative w-[320px] h-[320px]"
            >
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
                <motion.circle
                  cx="160"
                  cy="160"
                  r={radius}
                  fill="none"
                  stroke="rgba(74, 124, 74, 0.2)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                />
                <motion.circle
                  cx="160"
                  cy="160"
                  r={radius + 20}
                  fill="none"
                  stroke="rgba(201, 162, 39, 0.08)"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
              </svg>

              {items.slice(0, 8).map((item, i) => {
                const angle = startAngle + (spread / Math.max(items.slice(0, 8).length - 1, 1)) * i;
                const rad = (angle * Math.PI) / 180;
                const x = 160 + radius * Math.cos(rad) - 28;
                const y = 160 + radius * Math.sin(rad) - 28;
                const isActive = activePath.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.href}
                    initial={{ scale: 0, x: 132, y: 132 }}
                    animate={{ scale: 1, x, y }}
                    exit={{ scale: 0, x: 132, y: 132 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.04 }}
                    className="absolute pointer-events-auto"
                  >
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex flex-col items-center gap-1',
                        item.accent && 'relative',
                      )}
                    >
                      <div
                        className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border',
                          isActive
                            ? 'bg-military-600 border-military-400 glow-green scale-110'
                            : 'glass border-military-800/50 hover:border-military-500 hover:glow-green hover:scale-105',
                          item.accent && !isActive && 'border-gold-500/30 hover:border-gold-500/50',
                        )}
                      >
                        <Icon className={cn('w-5 h-5', item.accent ? 'text-gold-400' : 'text-military-400')} />
                      </div>
                      <span className="text-[10px] font-medium text-cream/70 uppercase tracking-wider whitespace-nowrap">
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}

              {/* Center hub */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              >
                <button
                  onClick={onClose}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-military-700 to-military-900 border-2 border-military-500 flex items-center justify-center glow-green cursor-pointer"
                >
                  <Hexagon className="w-7 h-7 text-gold-400" />
                </button>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Sidebar rail (desktop) ─── */
function SidebarRail({ items, activePath }: { items: NavItem[]; activePath: string }) {
  return (
    <aside className="hidden lg:flex flex-col w-[72px] glass-strong border-r border-military-800/30 py-6 items-center gap-2 shrink-0">
      <Link href="/dashboard" className="mb-4 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-military-600 to-military-800 flex items-center justify-center glow-green group-hover:scale-105 transition-transform">
          <Hexagon className="w-5 h-5 text-gold-400" />
        </div>
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePath.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group',
                isActive
                  ? 'bg-military-700 text-gold-400 glow-green'
                  : 'text-cream/40 hover:text-cream hover:bg-carbon-700',
              )}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute -left-[13px] w-1 h-6 bg-gold-500 rounded-r-full"
                />
              )}
              <span className="absolute left-full ml-3 px-2 py-1 rounded-md glass text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/* ─── Top command bar ─── */
function TopBar({ onOpenOrbital }: { onOpenOrbital: () => void }) {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 glass-strong border-b border-military-800/30 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenOrbital}
          className="lg:hidden w-10 h-10 rounded-xl glass flex items-center justify-center hover:glow-green transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5 text-military-400" />
        </button>
        <div>
          <h1 className="text-sm font-bold tracking-[0.2em] text-military-400 uppercase">AUDAX</h1>
          <p className="text-[10px] text-cream/40 tracking-wider hidden sm:block">Cabinet Chef EMG — FARDC</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative w-10 h-10 rounded-xl glass flex items-center justify-center hover:glow-green transition-all"
        >
          <Bell className="w-4 h-4 text-cream/60" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center font-bold">2</span>
        </Link>

        <Link href="/profile" className="flex items-center gap-3 glass rounded-xl px-3 py-2 hover:border-military-600 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-military-700 flex items-center justify-center text-xs font-bold text-gold-400">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-cream">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-cream/40">{user?.role && ROLE_LABELS[user.role]}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-cream/30 hidden md:block" />
        </Link>

        <button onClick={() => void logout()} className="text-xs text-cream/40 hover:text-red-400 transition-colors cursor-pointer px-2">
          Déconnexion
        </button>
      </div>
    </header>
  );
}

/* ─── Bottom command dock (desktop + mobile trigger) ─── */
function CommandDock({ onOpenOrbital, activePath, items }: { onOpenOrbital: () => void; activePath: string; items: NavItem[] }) {
  const quickItems = items.filter((i) =>
    ['/dashboard', '/audiences', '/calendar', '/command-center'].includes(i.href),
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 hidden sm:flex">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.3 }}
        className="flex items-center gap-1 glass-strong rounded-2xl px-3 py-2 border border-military-700/30 shadow-2xl"
      >
        {quickItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200',
                isActive ? 'bg-military-600 text-gold-400 glow-green' : 'text-cream/50 hover:text-cream hover:bg-carbon-700',
              )}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}

        <div className="w-px h-8 bg-military-800/50 mx-1" />

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenOrbital}
          className="w-14 h-14 -my-1 rounded-2xl bg-gradient-to-br from-military-600 via-military-700 to-military-900 border border-military-500/50 flex items-center justify-center glow-green cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gold-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Hexagon className="w-6 h-6 text-gold-400 relative z-10" />
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-gold-500/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </motion.button>
      </motion.div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, permissions, isAuthenticated, accessToken } = useAuthStore();
  const syncFromApi = useAudiencesStore((s) => s.syncFromApi);
  const syncWaitingRoomToday = useAudiencesStore((s) => s.syncWaitingRoomToday);
  const clearAllAudiences = useAudiencesStore((s) => s.clearAllAudiences);
  const [orbitalOpen, setOrbitalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isAuthenticated || !isWaitingRoomRole(user?.role)) return;
    if (!isWaitingRoomPath(pathname)) router.replace('/audiences');
  }, [isAuthenticated, user?.role, pathname, router]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !isApiConfigured()) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const sync = isWaitingRoomRole(user?.role) ? syncWaitingRoomToday : syncFromApi;

    const runSync = async (attempt = 0) => {
      const ok = await sync(accessToken);
      if (cancelled || ok || attempt >= 5) return;
      retryTimer = setTimeout(() => void runSync(attempt + 1), 2000);
    };

    void runSync();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isAuthenticated, accessToken, user?.role, syncFromApi, syncWaitingRoomToday]);

  useEffect(() => {
    if (!isAuthenticated) clearAllAudiences();
  }, [isAuthenticated, clearAllAudiences]);

  if (!mounted) return null;

  const items = filterNav(user?.role, permissions);

  return (
    <div className="min-h-screen flex bg-carbon-950 bg-command-grid">
      {isAuthenticated && <SidebarRail items={items} activePath={pathname} />}

      <div className="flex-1 flex flex-col min-h-screen">
        {isAuthenticated && <TopBar onOpenOrbital={() => setOrbitalOpen(true)} />}

        <main className={cn('flex-1 overflow-auto', isAuthenticated && 'pb-28')}>
          {children}
        </main>

        {isAuthenticated && (
          <>
            <CommandDock onOpenOrbital={() => setOrbitalOpen(true)} activePath={pathname} items={items} />
            <OrbitalMenu
              items={items}
              isOpen={orbitalOpen}
              onClose={() => setOrbitalOpen(false)}
              activePath={pathname}
            />
          </>
        )}
      </div>
    </div>
  );
}
