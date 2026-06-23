'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Radio,
  Crown,
  Briefcase,
  ClipboardList,
  Eye,
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
import {
  useAuthStore,
  canAccessMenu,
  isWaitingRoomRole,
  receivesLiveAudienceUpdates,
  getMonitoringRoute,
  getDefaultAppRoute,
} from '@/stores/auth-store';
import { useAudiencesStore } from '@/stores/audiences-store';
import { isApiConfigured } from '@/lib/api-config';
import { subscribeAudienceSync } from '@/lib/audience-sync-bus';
import { ROLE_LABELS } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  menuPermission: string;
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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, menuPermission: 'MENU_DASHBOARD' },
  { href: '/protocol', label: 'Suivi Protocol', icon: Shield, menuPermission: 'MENU_PROTOCOL' },
  { href: '/command-center', label: 'Command Center', icon: Radio, menuPermission: 'MENU_COMMAND_CENTER', accent: true },
  { href: '/cemg-monitoring', label: 'Pilotage CEMG', icon: Crown, menuPermission: 'MENU_CEMG_PILOTAGE', accent: true },
  { href: '/cabinet-monitoring', label: 'Pilotage Cabinet', icon: Briefcase, menuPermission: 'MENU_CABINET_PILOTAGE', accent: true },
  { href: '/secretariat', label: 'Secrétariat', icon: ClipboardList, menuPermission: 'MENU_SECRETARIAT', accent: true },
  { href: '/consultation', label: 'Consultation', icon: Eye, menuPermission: 'MENU_CONSULTATION' },
  { href: '/audiences', label: 'Audiences', icon: FileText, menuPermission: 'MENU_AUDIENCES' },
  { href: '/audiences/new', label: 'Nouvelle', icon: Plus, menuPermission: 'MENU_NEW_AUDIENCE' },
  { href: '/calendar', label: 'Agenda', icon: Calendar, menuPermission: 'MENU_CALENDAR' },
  { href: '/visitors', label: 'Visiteurs', icon: Users, menuPermission: 'MENU_VISITORS' },
  { href: '/reports', label: 'Rapports', icon: FileText, menuPermission: 'MENU_REPORTS' },
  { href: '/notifications', label: 'Notifications', icon: Bell, menuPermission: 'MENU_NOTIFICATIONS' },
  { href: '/settings', label: 'Paramètres', icon: Settings, menuPermission: 'MENU_SETTINGS' },
  { href: '/audit', label: 'Audit', icon: Shield, menuPermission: 'MENU_AUDIT' },
];

function filterNav(role?: string, permissions?: string[]) {
  if (isWaitingRoomRole(role)) {
    return NAV_ITEMS.filter(
      (item) =>
        isWaitingRoomPath(item.href) &&
        canAccessMenu(item.menuPermission, role, permissions),
    );
  }

  return NAV_ITEMS.filter((item) => canAccessMenu(item.menuPermission, role, permissions));
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

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              >
                <button
                  onClick={onClose}
                  aria-label="Fermer le menu"
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
function SidebarRail({ items, activePath, homeHref }: { items: NavItem[]; activePath: string; homeHref: string }) {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-30 h-screen flex-col w-[80px] glass-strong border-r border-military-800/30 py-8 items-center gap-4 shrink-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-military-900/20 to-transparent pointer-events-none" />
      
      <Link href={homeHref} className="mb-6 group relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-military-600 to-military-900 flex items-center justify-center glow-green group-hover:scale-110 transition-all duration-500 border border-military-500/30">
          <Hexagon className="w-6 h-6 text-gold-400" />
        </div>
        <div className="absolute -inset-2 bg-gold-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>

      <nav className="flex flex-col gap-2 flex-1 relative z-10">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePath.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group',
                isActive
                  ? 'bg-military-700/50 text-gold-400 glow-green border border-military-500/30'
                  : 'text-cream/30 hover:text-military-400 hover:bg-military-900/30 border border-transparent hover:border-military-800/50',
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute -left-[14px] w-1.5 h-8 bg-gold-500 rounded-r-full shadow-[0_0_10px_rgba(201,162,39,0.5)]"
                />
              )}
              <span className="absolute left-full ml-4 px-3 py-1.5 rounded-lg glass-strong text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50 border border-military-700/30">
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
    <header className="sticky top-0 z-20 h-20 glass-strong border-b border-military-800/30 flex items-center justify-between px-6 lg:px-10 shrink-0">
      <div className="flex items-center gap-6">
        <button
          onClick={onOpenOrbital}
          aria-label="Ouvrir le menu"
          className="lg:hidden w-12 h-12 rounded-2xl glass flex items-center justify-center hover:glow-green transition-all cursor-pointer border border-military-800/50"
        >
          <Menu className="w-6 h-6 text-military-400" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-4 bg-military-500 rounded-full" />
            <h1 className="text-lg font-black tracking-[0.3em] text-cream uppercase font-display">AUDAX</h1>
          </div>
          <p className="text-[10px] text-military-500 font-mono tracking-[0.2em] uppercase mt-0.5 ml-4 hidden sm:block">
            Command & Control Interface
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden xl:flex items-center gap-8 mr-8">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono text-military-500 uppercase tracking-widest">System Time</span>
            <span className="text-xs font-mono text-cream/60">12:44:32 UTC</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono text-military-500 uppercase tracking-widest">Network</span>
            <span className="text-xs font-mono text-military-400">ENCRYPTED</span>
          </div>
        </div>

        <Link
          href="/notifications"
          className="relative w-11 h-11 rounded-2xl glass flex items-center justify-center hover:glow-green transition-all border border-military-800/50 group"
        >
          <Bell className="w-5 h-5 text-cream/40 group-hover:text-military-400 transition-colors" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-lg bg-red-600 text-[10px] flex items-center justify-center font-bold border-2 border-carbon-950 shadow-[0_0_10px_rgba(220,38,38,0.5)]">2</span>
        </Link>

        <Link href="/profile" className="flex items-center gap-4 glass rounded-2xl px-4 py-2 hover:border-military-600 transition-all duration-300 group border border-military-800/30">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-military-700 to-military-900 flex items-center justify-center text-sm font-bold text-gold-400 border border-military-500/30 group-hover:glow-green transition-all">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-carbon-950" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-cream group-hover:text-military-300 transition-colors">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-military-500 font-mono uppercase tracking-wider">{user?.role && ROLE_LABELS[user.role]}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-cream/20 group-hover:text-military-500 transition-colors hidden md:block" />
        </Link>

        <button 
          onClick={() => void logout()} 
          className="w-11 h-11 rounded-2xl glass flex items-center justify-center hover:bg-red-900/20 hover:border-red-500/50 transition-all group border border-military-800/30 cursor-pointer"
          title="Déconnexion"
        >
          <X className="w-5 h-5 text-cream/20 group-hover:text-red-500 transition-colors" />
        </button>
      </div>
    </header>
  );
}

/* ─── Bottom command dock (desktop + mobile trigger) ─── */
function CommandDock({
  onOpenOrbital,
  activePath,
  items,
  monitoringHref,
}: {
  onOpenOrbital: () => void;
  activePath: string;
  items: NavItem[];
  monitoringHref?: string | null;
}) {
  const quickHrefs = ['/dashboard', '/audiences', '/calendar', ...(monitoringHref ? [monitoringHref] : [])];
  const quickItems = items.filter((i) => quickHrefs.includes(i.href));

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
  const { user, permissions, isAuthenticated, accessToken, refreshUser } = useAuthStore();
  const syncFromApi = useAudiencesStore((s) => s.syncFromApi);
  const syncWaitingRoomToday = useAudiencesStore((s) => s.syncWaitingRoomToday);
  const clearAllAudiences = useAudiencesStore((s) => s.clearAllAudiences);
  const [orbitalOpen, setOrbitalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !isApiConfigured()) return;
    void refreshUser();
  }, [isAuthenticated, accessToken, refreshUser]);

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
    if (!isAuthenticated || !accessToken || !isApiConfigured()) return;
    if (!receivesLiveAudienceUpdates(user?.role)) return;

    const interval = setInterval(() => {
      void syncFromApi(accessToken, { silent: true });
    }, 5000);

    const unsubscribe = subscribeAudienceSync((event) => {
      if (
        event.type === 'reception-completed' ||
        event.type === 'confirmed' ||
        event.type === 'accompaniment-completed' ||
        event.type === 'updated'
      ) {
        void syncFromApi(accessToken, { silent: true });
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [isAuthenticated, accessToken, user?.role, syncFromApi]);

  useEffect(() => {
    if (!isAuthenticated) clearAllAudiences();
  }, [isAuthenticated, clearAllAudiences]);

  if (!mounted) return null;

  const items = filterNav(user?.role, permissions);
  const monitoringHref = getMonitoringRoute(user?.role, permissions);
  const homeHref = getDefaultAppRoute(user?.role, permissions);

  return (
    <div className="h-screen flex overflow-hidden bg-carbon-950 bg-command-grid">
      {isAuthenticated && <SidebarRail items={items} activePath={pathname} homeHref={homeHref} />}

      <div className={cn('flex-1 flex flex-col min-h-0 min-w-0', isAuthenticated && 'lg:ml-[80px]')}>
        {isAuthenticated && <TopBar onOpenOrbital={() => setOrbitalOpen(true)} />}

        <main className={cn('flex-1 min-h-0 overflow-y-auto', isAuthenticated && 'pb-28')}>
          {children}
        </main>

        {isAuthenticated && (
          <>
            <CommandDock
              onOpenOrbital={() => setOrbitalOpen(true)}
              activePath={pathname}
              items={items}
              monitoringHref={monitoringHref}
            />
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
