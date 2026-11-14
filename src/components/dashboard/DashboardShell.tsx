import React, { useState } from 'react';
import {
  BarChart3,
  Bot,
  Compass,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Shield,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { DashboardTab, StudentProfile } from '../../types/skillpath';
import { Button, ResilientImage } from '../ui/DesignSystem';

interface DashboardShellProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  profile: StudentProfile;
  isDemo: boolean;
  isAdminAuthorized: boolean;
  isSigningOut?: boolean;
  onSignOut: () => void;
  onBackToHome: () => void;
  onSwitchToAuth: () => void;
  children: React.ReactNode;
}

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: 'Overview',
  skills: 'Skill Analysis',
  careers: 'Career Explorer',
  roadmap: 'Learning Roadmap',
  mentor: 'AI Mentor',
  profile: 'Profile & Settings',
  admin: 'Admin Console',
};

export function DashboardShell({
  activeTab,
  onSelectTab,
  profile,
  isDemo,
  isAdminAuthorized,
  isSigningOut = false,
  onSignOut,
  onBackToHome,
  onSwitchToAuth,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'skills', label: 'Skill Analysis', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'careers', label: 'Career Explorer', icon: <Compass className="h-4 w-4" /> },
    { id: 'roadmap', label: 'Learning Roadmap', icon: <Map className="h-4 w-4" /> },
    { id: 'mentor', label: 'AI Mentor', icon: <Bot className="h-4 w-4" /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon className="h-4 w-4" /> },
  ];

  if (isAdminAuthorized) {
    navItems.push({
      id: 'admin',
      label: 'Admin Console',
      icon: <Shield className="h-4 w-4" />,
    });
  }

  const handleNavClick = (tab: DashboardTab) => {
    onSelectTab(tab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#11121A] border-r border-[rgba(212,175,112,0.16)] p-5">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="font-display text-lg font-bold tracking-tight text-[#F7F3EA] hover:text-[#F5D78E] transition-colors"
          >
            SkillPath AI
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation drawer"
            className="rounded-lg p-1.5 text-[#AAA6A0] hover:bg-[#20212B] hover:text-[#F7F3EA] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Workspace navigation" className="space-y-1">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#171821] text-[#F5D78E] border border-[rgba(212,175,112,0.28)]'
                    : 'text-[#AAA6A0] border border-transparent hover:bg-[#171821]/60 hover:text-[#F7F3EA]'
                }`}
              >
                <span className={active ? 'text-[#D4AF70]' : 'text-[#7D7973]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 border-t border-[rgba(212,175,112,0.14)] pt-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[rgba(212,175,112,0.28)] bg-[#171821]">
            <ResilientImage
              src={profile.photoURL || '/src/assets/images/avatar_student_default_1794636560220.jpg'}
              alt={`${profile.displayName} profile portrait`}
              fallbackTitle={profile.displayName.slice(0, 2).toUpperCase()}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#F7F3EA]">
              {profile.displayName}
            </p>
            <p className="truncate text-xs text-[#7D7973]">
              {isDemo ? 'Demo Mode' : isAdminAuthorized ? 'Administrator' : 'Student Account'}
            </p>
          </div>
        </div>

        {isDemo ? (
          <div className="grid grid-cols-1 gap-2">
            <Button size="sm" onClick={onSwitchToAuth} className="w-full">
              Sign In with Google
            </Button>
            <Button size="sm" variant="ghost" onClick={onSignOut} className="w-full">
              Exit Demo
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            loading={isSigningOut}
            disabled={isSigningOut}
            onClick={onSignOut}
            className="w-full justify-center"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative z-10 flex min-h-screen bg-[#090A0F]/80">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden w-[260px] shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#090A0F]/75 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full w-[272px] max-w-[85vw]">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] bg-[#090A0F]/90 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(212,175,112,0.2)] text-[#F7F3EA] hover:bg-[#171821] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-[#7D7973] sm:inline">Workspace</span>
              <span className="hidden text-[#7D7973] sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-display font-semibold text-[#F7F3EA]">
                {TAB_LABELS[activeTab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeTab !== 'mentor' && (
              <Button size="sm" variant="secondary" onClick={() => onSelectTab('mentor')}>
                Ask AI Mentor
              </Button>
            )}
          </div>
        </header>

        {isDemo && (
          <div className="border-b border-[rgba(212,175,112,0.18)] bg-[#11121A] px-4 py-2.5 text-xs text-[#AAA6A0] sm:px-8">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2">
              <span>
                <strong className="font-medium text-[#F5D78E]">Demo Mode Active:</strong> Displaying sample academic progression and telemetry. Sign in with Google for persistent Firestore records.
              </span>
              <button
                type="button"
                onClick={onSwitchToAuth}
                className="font-medium text-[#D4AF70] underline underline-offset-4 hover:text-[#F5D78E]"
              >
                Switch to Live Account
              </button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
