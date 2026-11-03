import { useState, useRef, useEffect } from 'react';
import type { NavItem, ViewId } from '../types';
import { useStore } from '../store';
import { Logo } from './Logo';
import { ProjectManagerModal } from './ProjectManagerModal';
import { KnowledgeBaseModal } from './KnowledgeBaseModal';
import { HelpModal } from './HelpModal';
import { AboutModal } from './AboutModal';
import { exportProjectAsJSON } from '../lib/projectManager';
import { exportProjectAsMarkdown, exportProjectAsPDF } from '../lib/exportUtils';

interface Props {
  items: NavItem[];
  activeView: ViewId;
  onNavigate: (id: ViewId) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function LeftSidebar({
  items,
  activeView,
  onNavigate,
  collapsed,
  onToggle,
}: Props) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [knowledgeBaseModalOpen, setKnowledgeBaseModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  const theme = useStore(s => s.theme);
  const toggleTheme = useStore(s => s.toggleTheme);
  const projectName = useStore(s => s.projectName);
  const currentUser = useStore(s => s.currentUser);
  const setAuthModalOpen = useStore(s => s.setAuthModalOpen);
  const logout = useStore(s => s.logout);
  const initials = projectName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'P';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    }
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  return (
    <div
      className={`flex flex-col h-full bg-seos-surface-1 border-r border-seos-border transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-[220px]'
      }`}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-start p-3">
        <button
          onClick={onToggle}
          className="p-1.5 rounded text-seos-text-2 hover:bg-seos-surface-2 hover:text-seos-text transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Logo Section */}
      <a
        href="#/"
        title="SEOS — Return to Homepage (Bedrock & Strata)"
        className={`flex items-center px-4 py-3 hover:opacity-80 transition-opacity ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <Logo size={32} tone={theme} showWordmark={!collapsed} className="text-seos-text" />
      </a>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-1 px-2">
        {/* Dedicated Home / Bedrock Button */}
        <a
          href="#/"
          title={collapsed ? 'Homepage — Bedrock & Strata Cross-Section' : 'Return to Homepage'}
          className={`flex items-center transition-all rounded mb-1.5 group border ${
            collapsed ? 'justify-center p-2' : 'px-3 py-2'
          } ${
            activeView === 'home'
              ? 'bg-seos-accent/15 text-seos-accent border-seos-accent/40 font-semibold'
              : 'text-seos-text hover:bg-seos-surface-2 hover:border-seos-accent/40 border-seos-border/70 bg-seos-surface-2/40'
          }`}
        >
          <span
            className={`flex items-center justify-center shrink-0 font-mono text-[11px] font-bold ${
              collapsed
                ? 'w-7 h-6 rounded bg-seos-accent/20 border border-seos-accent/40 text-seos-accent group-hover:scale-105'
                : 'w-11 h-5 mr-2.5 rounded bg-seos-accent/15 border border-seos-accent/40 text-seos-accent group-hover:bg-seos-accent group-hover:text-white'
            } transition-all`}
          >
            {collapsed ? 'H' : '[HOM]'}
          </span>
          {!collapsed && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="text-sm font-semibold truncate text-seos-text group-hover:text-seos-accent transition-colors">
                Home
              </span>
              <span className="font-mono text-[10px] text-seos-text-3 px-1.5 py-0.5 rounded bg-seos-surface border border-seos-border/80 shrink-0">
                Bedrock
              </span>
            </div>
          )}
        </a>

        <div className="border-t border-seos-border/50 my-1 mx-1" />
        {currentUser?.role === 'mentor' && (
          <button
            onClick={() => onNavigate('mentor-roster')}
            title={collapsed ? 'Cohort Roster' : undefined}
            className={`flex items-center transition-colors rounded mb-2 ${
              collapsed ? 'justify-center p-2' : 'px-3 py-2'
            } ${
              activeView === 'mentor-roster'
                ? 'bg-seos-cyan/20 text-seos-cyan border border-seos-cyan/40 font-semibold'
                : 'text-seos-cyan hover:bg-seos-cyan/10 border border-dashed border-seos-cyan/30'
            }`}
          >
            <span className="font-mono text-xs shrink-0">{collapsed ? '[R]' : '[ROSTER]'}</span>
            {!collapsed && (
              <span className="ml-2.5 text-xs font-mono tracking-wider uppercase truncate">
                Cohort Roster
              </span>
            )}
          </button>
        )}

        {items.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center transition-colors rounded ${
                collapsed ? 'justify-center p-2' : 'px-3 py-2'
              } ${
                isActive
                  ? 'bg-seos-accent/15 text-seos-accent border border-seos-accent/30'
                  : 'text-seos-text-2 hover:bg-seos-surface-2 hover:text-seos-text border border-transparent'
              }`}
            >
              <span
                className={`flex items-center justify-center shrink-0 font-mono text-[11px] font-bold ${
                  collapsed
                    ? 'w-7 h-6 rounded bg-seos-surface-2 border border-seos-border text-seos-accent'
                    : 'w-11 h-5 mr-2.5 rounded bg-seos-surface-2/80 border border-seos-border/70 text-seos-text-3'
                }`}
              >
                [{item.icon}]
              </span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="p-2 border-t border-seos-border flex flex-col gap-2 relative">
        {/* More Button */}
        <div ref={moreMenuRef} className="relative w-full flex justify-center">
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            title={collapsed ? 'More' : undefined}
            className={`flex items-center w-full transition-colors rounded ${
              collapsed ? 'justify-center p-2' : 'px-3 py-2'
            } text-seos-text-2 hover:bg-seos-surface-2 hover:text-seos-text`}
          >
            <span
              className={`flex items-center justify-center shrink-0 font-mono text-xs font-bold text-seos-text-3 ${
                collapsed ? 'w-5 h-5' : 'mr-2.5'
              }`}
            >
              [...]
            </span>
            {!collapsed && (
              <span className="text-xs font-mono font-bold tracking-wider uppercase truncate">More</span>
            )}
          </button>

          {moreMenuOpen && (
            <div
              className={`absolute bottom-full left-0 mb-1 bg-seos-surface border border-seos-border-2 rounded-lg shadow-2xl z-50 overflow-hidden text-xs font-mono text-seos-text ${
                collapsed ? 'ml-12 w-60' : 'w-64 ml-1'
              }`}
            >
              {/* Header */}
              <div className="px-3.5 py-2 bg-seos-surface-2 border-b border-seos-border/70 flex items-center justify-between">
                <span className="font-bold text-[11px] tracking-wider text-seos-text uppercase">
                  More Options
                </span>
                <span className="text-[10px] text-seos-text-3 font-mono">v1.0</span>
              </div>

              {/* Core Features */}
              <div className="p-1 space-y-0.5">
                {/* Settings [NEW] */}
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-seos-surface-2 rounded transition-colors text-left text-xs cursor-pointer group bg-seos-accent/5 border border-seos-accent/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-seos-accent font-bold shrink-0">[CFG]</span>
                    <span className="font-semibold text-seos-accent">Settings</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-seos-accent text-white uppercase tracking-wider">
                    New
                  </span>
                </button>

                {/* Knowledge Base */}
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setKnowledgeBaseModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-seos-surface-2 rounded transition-colors text-left text-xs cursor-pointer"
                >
                  <span className="text-seos-amber font-bold shrink-0">[KNB]</span>
                  <span className="font-semibold text-seos-text">Knowledge Base &amp; RAG</span>
                </button>

                {/* Classroom */}
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    if (currentUser?.role === 'mentor') {
                      onNavigate('mentor-roster');
                    } else {
                      setAuthModalOpen(true);
                    }
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-seos-surface-2 rounded transition-colors text-left text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-seos-cyan font-bold shrink-0">[CLS]</span>
                    <span className="font-semibold text-seos-text">Classroom Cohort</span>
                  </div>
                  {currentUser?.classroom_code && (
                    <span className="text-[9px] text-seos-text-3 font-mono">{currentUser.classroom_code}</span>
                  )}
                </button>

                {/* Help */}
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setHelpModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-seos-surface-2 rounded transition-colors text-left text-xs cursor-pointer"
                >
                  <span className="text-seos-green font-bold shrink-0">[HLP]</span>
                  <span className="font-semibold text-seos-text">Help</span>
                </button>

                {/* About SEOS */}
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setAboutModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-seos-surface-2 rounded transition-colors text-left text-xs cursor-pointer"
                  title="SEOS platform overview, architecture philosophy, and contributors"
                >
                  <span className="text-seos-accent font-bold shrink-0">[ABT]</span>
                  <span className="font-semibold text-seos-text">About SEOS</span>
                </button>
              </div>

              {/* Utility Exports & Actions Divider */}
              <div className="border-t border-seos-border/70 my-1 pt-1 px-1">
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-seos-text-3">
                  Utilities &amp; Quick Export
                </div>
                <button
                  onClick={() => { setMoreMenuOpen(false); setProjectModalOpen(true); }}
                  className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 hover:bg-seos-surface-2 rounded text-[11px] text-seos-text-2 hover:text-seos-text cursor-pointer"
                >
                  <span className="text-seos-accent font-bold shrink-0">[+]</span>
                  <span className="truncate">Projects &amp; Case Studies</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); exportProjectAsMarkdown(); }}
                  className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 hover:bg-seos-surface-2 rounded text-[11px] text-seos-text-2 hover:text-seos-text cursor-pointer"
                >
                  <span className="text-seos-accent font-bold shrink-0">[↓]</span>
                  <span className="truncate">Export SRS (.md)</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); exportProjectAsPDF(); }}
                  className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 hover:bg-seos-surface-2 rounded text-[11px] text-seos-text-2 hover:text-seos-text cursor-pointer"
                >
                  <span className="text-seos-accent font-bold shrink-0">[P]</span>
                  <span className="truncate">Export Document (.pdf)</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); exportProjectAsJSON(); }}
                  className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 hover:bg-seos-surface-2 rounded text-[11px] text-seos-text-2 hover:text-seos-text cursor-pointer"
                >
                  <span className="text-seos-accent font-bold shrink-0">[{'{}'}]</span>
                  <span className="truncate">Export Project (.json)</span>
                </button>
              </div>

              {/* Account / Session Bar */}
              <div className="border-t border-seos-border bg-seos-surface-2/60 p-2 flex items-center justify-between text-xs">
                {currentUser ? (
                  <>
                    <button
                      onClick={() => { setMoreMenuOpen(false); setAuthModalOpen(true); }}
                      className="flex items-center gap-1.5 text-seos-text hover:text-seos-accent truncate px-1"
                    >
                      <span className="text-seos-accent font-bold">[&gt;]</span>
                      <span className="truncate font-semibold">{currentUser.name}</span>
                    </button>
                    <button
                      onClick={() => { setMoreMenuOpen(false); logout(); }}
                      className="text-[10px] text-seos-red hover:bg-seos-red/10 px-2 py-1 rounded font-bold cursor-pointer"
                    >
                      [SIGN OUT]
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMoreMenuOpen(false); setAuthModalOpen(true); }}
                    className="w-full text-center py-1 text-xs text-seos-accent font-bold hover:bg-seos-accent/10 rounded cursor-pointer"
                  >
                    :: SIGN IN / REGISTER ::
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auth / Account Bar */}
        <div className="mt-2">
          {currentUser ? (
            <div
              onClick={() => setAuthModalOpen(true)}
              className={`p-2 rounded border border-seos-border bg-seos-surface hover:border-seos-accent/40 transition-all cursor-pointer ${
                collapsed ? 'text-center' : ''
              }`}
              title="Click to view account and classroom details"
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                  currentUser.role === 'mentor'
                    ? 'bg-seos-cyan/15 text-seos-cyan border-seos-cyan/30'
                    : currentUser.role === 'student'
                      ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                      : 'bg-seos-accent/15 text-seos-accent border-seos-accent/30'
                }`}>
                  [{currentUser.role === 'solo_dev' ? 'SOLO' : currentUser.role.toUpperCase()}]
                </span>
                {!collapsed && currentUser.classroom_code && (
                  <span className="font-mono text-[10px] text-seos-text-3">
                    {currentUser.classroom_code}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="mt-1">
                  <div className="text-xs font-medium text-seos-text truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-seos-text-3 truncate">
                    {currentUser.email}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className={`w-full py-1.5 px-2 rounded border border-dashed border-seos-accent/40 bg-seos-accent/10 hover:bg-seos-accent/20 text-seos-accent font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                collapsed ? 'px-1 text-[10px]' : ''
              }`}
              title="Sign in or register an account"
            >
              <span>::</span>
              {!collapsed && <span>SIGN IN</span>}
            </button>
          )}
        </div>

        {/* User Profile / Current Project */}
        <div
          onClick={() => setProjectModalOpen(true)}
          title="Click to manage projects or load reference benchmarks"
          className={`mt-2 flex items-center p-2 rounded transition-colors bg-seos-surface hover:bg-seos-surface-2 cursor-pointer border border-transparent hover:border-seos-accent/40 ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="w-8 h-8 rounded-md bg-seos-accent/15 text-seos-accent border border-seos-accent/30 flex items-center justify-center shrink-0 font-display text-sm">
            {initials}
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden flex-1">
              <div className="text-sm font-medium text-seos-text truncate leading-tight">
                {projectName}
              </div>
              <div className="text-xs text-seos-text-3 truncate mt-0.5">
                Current project
              </div>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme?.();
              }}
              className="ml-auto p-1.5 rounded text-seos-text-2 hover:text-seos-text hover:bg-seos-surface-3 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
              )}
            </button>
          )}
        </div>
      </div>
      <ProjectManagerModal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
      <KnowledgeBaseModal isOpen={knowledgeBaseModalOpen} onClose={() => setKnowledgeBaseModalOpen(false)} />
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        onGoToHomepage={() => {
          setAboutModalOpen(false);
          window.location.hash = '#/';
        }}
      />
    </div>
  );
}
