import { Outlet, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bot, Sparkles, LayoutDashboard, FileText, Mic,
  Zap, Settings, ChevronLeft, ChevronRight,
  Menu, X, LogOut, Building2, User, Crown, Monitor
} from 'lucide-react';

const ALL_NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/docops', icon: FileText, label: 'DocOps', color: 'text-blue-400' },
  { to: '/meetops', icon: Mic, label: 'MeetOps', color: 'text-purple-400', orgOnly: true },
  { to: '/actions', icon: Zap, label: 'ActionOps', color: 'text-emerald-400' },
  { to: '/settings', icon: Settings, label: 'Settings', color: 'text-surface-600' },
];

const SETUP_NAV = {
  individual: { to: '/setup/companion', icon: Monitor, label: 'Companion', color: 'text-pink-400' },
  organization: { to: '/setup/bot', icon: Bot, label: 'Bot Setup', color: 'text-cyan-400' },
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, organization, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col
          bg-gradient-to-b from-surface-100/95 to-surface-50/95 backdrop-blur-xl
          border-r border-white/5 transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3">
          <Link to="/" className="flex items-center gap-3 group flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-base font-bold text-surface-950 tracking-tight truncate">
                Work<span className="gradient-text">Pilot</span> AI
              </span>
            )}
          </Link>

          {/* Close mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-200 text-surface-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {ALL_NAV_ITEMS
            .filter(item => !item.orgOnly || (user && user.account_type === 'organization'))
            .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group
                ${isActive
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-surface-700 hover:bg-surface-200/60 hover:text-surface-900 border border-transparent'
                }`
              }
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color || ''}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}

          {/* Setup nav — based on account type */}
          {user && (() => {
            const setupItem = SETUP_NAV[user.account_type] || SETUP_NAV.individual;
            return (
              <>
                <div className="my-2 border-t border-white/5" />
                <NavLink
                  to={setupItem.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group
                    ${isActive
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-surface-700 hover:bg-surface-200/60 hover:text-surface-900 border border-transparent'
                    }`
                  }
                >
                  <setupItem.icon className={`w-4 h-4 flex-shrink-0 ${setupItem.color}`} />
                  {!collapsed && <span className="truncate">{setupItem.label}</span>}
                </NavLink>
              </>
            );
          })()}
        </nav>

        {/* User / Org section */}
        {user && (
          <div className="px-3 pb-2 border-t border-white/5 pt-3">
            {!collapsed ? (
              <div className="px-3 py-2.5 rounded-xl bg-surface-200/40 border border-white/5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                    organization ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-primary-500 to-accent-500'
                  }`}>
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-surface-900 truncate">{user.name}</p>
                    <p className="text-xs text-surface-600 truncate">{user.email}</p>
                  </div>
                </div>
                {organization && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 mb-2">
                    <Building2 className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-purple-400 truncate">{organization.name}</span>
                    <span className="text-xs text-purple-400/60 ml-auto">{organization.plan_tier}</span>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-surface-600 hover:bg-surface-300/60 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2 rounded-xl text-surface-600 hover:bg-surface-200/60 hover:text-rose-400 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <div className="hidden lg:flex p-3 border-t border-white/5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-surface-600 hover:bg-surface-200/60 hover:text-surface-800 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Version badge */}
        {!collapsed && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-200/40 border border-white/5">
              <Sparkles className="w-3.5 h-3.5 text-accent-400 flex-shrink-0" />
              <span className="text-xs font-medium text-surface-600">v0.3 — Platform</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 flex items-center px-4 lg:px-6 border-b border-white/5 bg-surface-50/80 backdrop-blur-md sticky top-0 z-30">
          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-200 text-surface-700 mr-3 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Status */}
          <div className="flex items-center gap-3">
            {organization && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-400">
                <Building2 className="w-3 h-3" /> {organization.name}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-surface-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              System operational
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-4 px-6">
          <div className="flex items-center justify-between text-xs text-surface-600">
            <span>© 2026 WorkPilot AI • DocOps + MeetOps + ActionOps</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
