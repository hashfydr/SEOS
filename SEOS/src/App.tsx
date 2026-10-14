import { useState, useEffect, useRef } from 'react';
import type { ViewId } from './types';
import { NAV_ITEMS } from './mockData';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MainWorkspace from './components/MainWorkspace';
import { useStore } from './store';
import Home from './views/Home';
import PipelineStatus from './components/PipelineStatus';

const VIEW_TITLES: Record<ViewId, string> = {
  overview: 'Project Overview',
  requirements: 'Requirements Engineer',
  'user-stories': 'User Stories',
  modeling: 'System Modeling',
  architecture: 'Architecture',
  'api-designer': 'API Designer',
  documentation: 'Documentation',
  learning: 'Learning Dashboard',
};

// Routes: #/ → home, #/workspace/<view> → workspace on that view
type Route = { page: 'home' } | { page: 'workspace'; view: ViewId };

function routeFromHash(): Route {
  const m = window.location.hash.match(/^#\/workspace(?:\/([\w-]+))?/);
  if (!m) return { page: 'home' };
  const view = m[1] && m[1] in VIEW_TITLES ? (m[1] as ViewId) : 'overview';
  return { page: 'workspace', view };
}

function useViewportWidth() {
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vw;
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route.page === 'home') {
    return <Home onEnter={() => { window.location.hash = '#/workspace'; }} />;
  }
  return (
    <Workspace
      activeView={route.view}
      setActiveView={(v) => { window.location.hash = `#/workspace/${v}`; }}
    />
  );
}

function Workspace({ activeView, setActiveView }: { activeView: ViewId; setActiveView: (v: ViewId) => void }) {
  const vw = useViewportWidth();
  // Narrow screens: chat floats over the content instead of squeezing it
  const chatOverlay = vw < 1180;

  const [leftCollapsed, setLeftCollapsed] = useState(() => window.innerWidth < 1280);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('seos-chat-open');
      if (saved !== null) return saved === '1';
    } catch { /* storage unavailable */ }
    return window.innerWidth >= 1440;
  });
  const [rightWidth, setRightWidth] = useState(() => Math.round(Math.min(Math.max(window.innerWidth * 0.26, 320), 400)));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleChat = () =>
    setRightSidebarOpen((open) => {
      try { localStorage.setItem('seos-chat-open', open ? '0' : '1'); } catch { /* ignore */ }
      return !open;
    });

  const projectName = useStore((s) => s.projectName);
  const resetProject = useStore((s) => s.resetProject);
  const pipelineRunning = useStore((s) => s.pipeline.running);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = rightWidth;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = startWidth.current + (startX.current - e.clientX);
      setRightWidth(Math.min(Math.max(newWidth, 260), 600));
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-seos-bg text-seos-text transition-colors duration-200">
      <LeftSidebar 
        items={NAV_ITEMS}
        activeView={activeView} 
        onNavigate={setActiveView} 
        collapsed={leftCollapsed || vw < 900}
        onToggle={() => setLeftCollapsed(!leftCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-seos-border bg-seos-surface flex items-center justify-between gap-4 px-5 shrink-0">
          <nav className="flex items-center gap-2 min-w-0 text-sm" aria-label="Breadcrumb">
            <button
              onClick={() => setActiveView('overview')}
              className="truncate max-w-[40vw] text-seos-text-3 hover:text-seos-text transition-colors"
            >
              {projectName}
            </button>
            <span className="text-seos-border-2" aria-hidden="true">/</span>
            <span className="font-medium text-seos-text truncate">{VIEW_TITLES[activeView] || 'SEOS'}</span>
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="mr-2"><PipelineStatus /></div>
            <button
              onClick={toggleChat}
              aria-pressed={rightSidebarOpen}
              title={rightSidebarOpen ? 'Hide assistant' : 'Show assistant'}
              className={`mr-1.5 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                rightSidebarOpen
                  ? 'bg-seos-accent/12 text-seos-accent border border-seos-accent/30'
                  : 'bg-seos-accent text-white border border-seos-accent hover:bg-seos-accent-2'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="hidden sm:inline">Assistant</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-seos-surface-2 text-seos-text-2 transition-colors flex items-center justify-center"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="p-2 rounded-md hover:bg-seos-surface-2 text-seos-text-2 transition-colors flex items-center justify-center"
                title="More Actions"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-seos-surface border border-seos-border rounded-md shadow-lg z-50 py-1">
                  <button
                    disabled={pipelineRunning}
                    title={pipelineRunning ? 'Wait for generation to finish' : undefined}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      if (window.confirm('Start a new project? This clears every layer and the chat. Your API keys are kept.')) {
                        resetProject();
                        setActiveView('requirements');
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-seos-accent hover:bg-seos-surface-2 transition-colors disabled:opacity-50"
                  >
                    New project…
                  </button>
                  <div className="my-1 border-t border-seos-border" />
                  {['Export as Markdown', 'Export as PDF', 'Share Project', 'Settings', 'Reset View'].map((action) => (
                    <button
                      key={action}
                      onClick={() => {
                        console.log(action);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-seos-text hover:bg-seos-surface-2 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <MainWorkspace activeView={activeView} />
          
          {rightSidebarOpen && chatOverlay && (
            <>
              <div className="absolute inset-0 z-30 bg-black/30" onClick={toggleChat} aria-hidden="true" />
              <div
                style={{ width: Math.min(400, vw - 24) }}
                className="absolute right-0 top-0 z-40 h-full flex flex-col shadow-2xl animate-slide-right"
              >
                <RightSidebar width={Math.min(400, vw - 24)} />
              </div>
            </>
          )}

          {rightSidebarOpen && !chatOverlay && (
            <>
              <div
                className="w-1 h-full cursor-col-resize bg-transparent hover:bg-seos-accent/50 transition-colors z-10 shrink-0"
                onMouseDown={handleMouseDown}
              />
              <div style={{ width: rightWidth }} className="h-full shrink-0 flex flex-col">
                <RightSidebar width={rightWidth} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
