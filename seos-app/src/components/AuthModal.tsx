import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api, setAuthToken } from '../lib/api';

export const AuthModal: React.FC = () => {
  const isOpen = useStore((s) => s.authModalOpen);
  const setOpen = useStore((s) => s.setAuthModalOpen);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          setTimeout(() => setOpen(false), 1200);
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
        setTimeout(() => setOpen(false), 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials or network.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setLoading(true);
    const target = { email: 'demo.developer@seos.dev', pass: 'demo1234', name: 'Demo Engineer' };

    try {
      // Try login first
      try {
        const tokenData = await api.login({ email: target.email, password: target.pass });
        setAuthToken(tokenData.access_token);
        const me = await api.getMe();
        setCurrentUser(me);
        setSuccessMsg(`Demo session active: ${me.name}`);
        setTimeout(() => setOpen(false), 800);
        return;
      } catch {
        // If demo user doesn't exist yet, register it
        const newUser = await api.register({
          name: target.name,
          email: target.email,
          password: target.pass,
          role: 'solo_dev',
        });
        const tokenData = await api.login({ email: target.email, password: target.pass });
        setAuthToken(tokenData.access_token);
        setCurrentUser(newUser);
        setSuccessMsg(`Demo account created: ${newUser.name}`);
        setTimeout(() => setOpen(false), 800);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize demo session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in cursor-pointer font-mono text-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-seos-surface border border-seos-border rounded-xl w-full max-w-sm overflow-hidden shadow-2xl cursor-default"
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-seos-border flex items-center justify-between bg-seos-surface-2/40">
          <div className="flex items-center gap-2">
            <span className="text-seos-accent font-bold">::</span>
            <span className="font-bold text-seos-text uppercase tracking-wider">
              {mode === 'register' ? '[CREATE ACCOUNT]' : '[SIGN IN]'}
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
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
              <label className="block text-[11px] text-seos-text-2 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3 py-1.5 rounded bg-seos-bg border border-seos-border text-xs text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-seos-text-2 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dev@example.com"
              className="w-full px-3 py-1.5 rounded bg-seos-bg border border-seos-border text-xs text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] text-seos-text-2 mb-1">
              Password
            </label>
            <input
              type="password"
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
              onClick={handleQuickDemoLogin}
              className="w-full py-1.5 px-2 text-center text-[11px] font-bold rounded border border-seos-border bg-seos-surface-2 hover:border-seos-accent/50 text-seos-text-2 hover:text-seos-text transition-colors cursor-pointer"
            >
              [SIGN IN AS DEMO DEVELOPER]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
