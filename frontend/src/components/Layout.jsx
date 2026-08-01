import { Outlet, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, FileText, Mic,
  Zap, Settings, ChevronLeft, ChevronRight,
  Menu, X, Plug, Sun, Moon, Sparkles, BookOpen, Bug
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import logoWDark from '../assets/logo-w-dark.svg';
import logoWLight from '../assets/logo-w-light.svg';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/docops', icon: FileText, label: 'DocOps' },
  { to: '/meetops', icon: Mic, label: 'MeetOps' },
  { to: '/actions', icon: Zap, label: 'ActionOps' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
  { to: '/docs', icon: BookOpen, label: 'Docs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const logoSrc = theme === 'dark' ? logoWDark : logoWDark; // SVG logo works in both or can invert

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex transition-colors duration-200">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col
          bg-[var(--bg-sidebar)] backdrop-blur-xl
          border-r border-[var(--border-subtle)] transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo & Brand Header */}
        <div className="h-16 flex items-center px-4 border-b border-[var(--border-subtle)] gap-3">
          <Link to="/" className="flex items-center gap-2.5 group flex-1 min-w-0">
            <img
              src={logoWDark}
              alt="WorkPilot AI Logo"
              className={`w-7 h-7 object-contain flex-shrink-0 transition-transform group-hover:scale-105 ${
                theme === 'light' ? 'filter invert opacity-90' : 'opacity-90'
              }`}
            />
            {!collapsed && (
              <span className="font-heading font-normal text-2xl tracking-tight text-[var(--text-primary)]">
                WorkPilot <span className="font-sans text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">AI</span>
              </span>
            )}
          </Link>

          {/* Close mobile menu button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-sans font-medium transition-all duration-200 group
                ${
                  isActive
                    ? 'bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Theme Toggle & Collapse Controls */}
        <div className="p-3 border-t border-[var(--border-subtle)] space-y-1">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-stone-700" />
              )}
              {!collapsed && (
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              )}
            </div>
            {!collapsed && (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                {theme}
              </span>
            )}
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>

        {/* App Version Badge */}
        {!collapsed && (
          <div className="px-4 pb-4 pt-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">v1.0 — Desktop Companion</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 flex items-center px-4 lg:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur-md sticky top-0 z-30 justify-between">
          {/* Mobile menu trigger button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-heading text-xl text-[var(--text-primary)] hidden sm:inline-block">
              WorkPilot AI
            </span>
          </div>

          {/* Right Status & Theme Controls */}
          <div className="flex items-center gap-4">
            {/* System Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Local Agent Ready</span>
            </div>

            {/* Quick Theme Toggle Icon */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-sm"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-stone-800" />
              )}
            </button>
          </div>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--border-subtle)] py-4 px-6 lg:px-8 bg-[var(--bg-primary)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-muted)] max-w-7xl mx-auto">
            <span className="font-sans">© 2026 WorkPilot AI — On-Device Intelligence Suite</span>
            <div className="flex items-center gap-4 font-sans">
              <Link to="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link>
              <a
                href="https://github.com/teenybopper/workpilotAI/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
              >
                <Bug className="w-3 h-3" /> Feedback
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
