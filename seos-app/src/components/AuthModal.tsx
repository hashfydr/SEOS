import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { api, setAuthToken } from '../lib/api';

const AuthDialogContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearCloseTimer();
    };
  }, [onClose, clearCloseTimer]);

  const scheduleClose = (delayMs: number) => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, delayMs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCloseTimer();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const payload = {
          name: name.trim() || 'Software Engineer',
          email: email.trim().toLowerCase(),
          password,
          role: 'solo_dev' as const,
        };

        try {
          const newUser = await api.register(payload);
          const tokenData = await api.login({ email: payload.email, password });
          setAuthToken(tokenData.access_token);
          setCurrentUser(newUser);

          setSuccessMsg(`Welcome, ${newUser.name}! Account registered.`);
          scheduleClose(1200);
        } catch (regErr: any) {
          if (regErr.message && regErr.message.toLowerCase().includes('already exists')) {
            setMode('login');
            throw new Error("An account with this email address already exists. Please enter your password to sign in.");
          }
          throw regErr;
        }
      } else {
        const tokenData = await api.login({ email: email.trim().toLowerCase(), password });
        setAuthToken(tokenData.access_token);
        const me = await api.getMe();
        setCurrentUser(me);

        setSuccessMsg(`Logged in as ${me.name}.`);
        scheduleClose(1000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials or network.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    clearCloseTimer();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const target = {
      email: `demo.${suffix}@seos.dev`,
      pass: `Demo-${suffix}-9x!`,
      name: 'Demo Engineer',
    };

    try {
      const newUser = await api.register({
        name: target.name,
        email: target.email,
        password: target.pass,
        role: 'solo_dev',
      });
      const tokenData = await api.login({ email: target.email, password: target.pass });
      setAuthToken(tokenData.access_token);
      setCurrentUser(newUser);
      setSuccessMsg(`Isolated demo session active: ${newUser.name}`);
      scheduleClose(800);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize demo session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in cursor-pointer font-mono text-xs"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-seos-surface border border-seos-border rounded-xl w-full max-w-sm overflow-hidden shadow-2xl cursor-default"
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-seos-border flex items-center justify-between bg-seos-surface-2/40">
          <div className="flex items-center gap-2">
            <span className="text-seos-accent font-bold">::</span>
            <span id="auth-modal-title" className="font-bold text-seos-text uppercase tracking-wider">
              {mode === 'register' ? '[CREATE ACCOUNT]' : '[SIGN IN]'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-seos-text-3 hover:text-seos-text font-mono text-xs px-1.5 py-0.5 rounded transition-colors cursor-pointer"
          >
            [X]
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mx-5 mt-4 p-2.5 rounded bg-seos-red/15 border border-seos-red/30 text-seos-red text-[11px]">
            [ERROR] {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-2.5 rounded bg-seos-green/15 border border-seos-green/30 text-seos-green text-[11px]">
            [SUCCESS] {successMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-[11px] text-seos-text-2 mb-1">
                Full Name
              </label>
              <input
                id="auth-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3 py-1.5 rounded bg-seos-bg border border-seos-border text-xs text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-[11px] text-seos-text-2 mb-1">
              Email Address
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dev@example.com"
              className="w-full px-3 py-1.5 rounded bg-seos-bg border border-seos-border text-xs text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-[11px] text-seos-text-2 mb-1">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-1.5 rounded bg-seos-bg border border-seos-border text-xs text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-3 rounded bg-seos-accent text-white font-bold text-xs uppercase shadow hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'PROCESSING...' : mode === 'register' ? '[CREATE ACCOUNT]' : '[SIGN IN]'}
          </button>

          <div className="text-center pt-2 border-t border-seos-border/50">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-[11px] text-seos-text-3 hover:text-seos-accent transition-colors cursor-pointer"
            >
              {mode === 'register'
                ? 'Already have an account? Sign in →'
                : 'Need a new account? Register here →'}
            </button>
          </div>

          {/* Quick 1-Click Demo Login */}
          <div className="pt-2 border-t border-seos-border/40">
            <button
              type="button"
              disabled={loading}
              onClick={handleQuickDemoLogin}
              className="w-full py-1.5 px-2 text-center text-[11px] font-bold rounded border border-seos-border bg-seos-surface-2 hover:border-seos-accent/50 text-seos-text-2 hover:text-seos-text transition-colors disabled:opacity-50 cursor-pointer"
            >
              [SIGN IN AS DEMO DEVELOPER]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AuthModal: React.FC = () => {
  const isOpen = useStore((s) => s.authModalOpen);
  const setOpen = useStore((s) => s.setAuthModalOpen);

  if (!isOpen) return null;
  return <AuthDialogContent onClose={() => setOpen(false)} />;
};

export default AuthModal;
