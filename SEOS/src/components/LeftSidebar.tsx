import { useState, useRef, useEffect } from 'react';
import type { NavItem, ViewId } from '../types';
import { useStore } from '../store';
import { Logo } from './Logo';

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
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  const theme = useStore(s => s.theme);
  const toggleTheme = useStore(s => s.toggleTheme);
  const projectName = useStore(s => s.projectName);
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
        title="Back to home"
        className={`flex items-center px-4 py-3 hover:opacity-80 transition-opacity ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <Logo size={32} tone={theme} showWordmark={!collapsed} className="text-seos-text" />
      </a>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2">
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
                className={`flex items-center justify-center shrink-0 ${
                  collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'
                }`}
              >
                {item.icon}
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
              className={`flex items-center justify-center shrink-0 ${
                collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'
              }`}
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
                  d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
            </span>
            {!collapsed && (
              <span className="text-sm font-medium truncate">More</span>
            )}
          </button>

          {moreMenuOpen && (
            <div
              className={`absolute bottom-full left-0 mb-1 bg-seos-surface-2 border border-seos-border rounded shadow-lg py-1 z-50 whitespace-nowrap text-sm text-seos-text ${
                collapsed ? 'ml-12' : 'w-48 ml-2'
              }`}
            >
              {['Settings', 'Keyboard Shortcuts', 'Help & Docs', 'About SEOS'].map(
                (opt) => (
                  <button
                    key={opt}
                    className="block w-full text-left px-4 py-2 hover:bg-seos-surface-3 transition-colors"
                  >
                    {opt}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className={`mt-2 flex items-center p-2 rounded transition-colors bg-seos-surface hover:bg-seos-surface-2 cursor-pointer ${collapsed ? 'justify-center' : ''}`}>
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
    </div>
  );
}
