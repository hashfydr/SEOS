import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api, type UserRole, setAuthToken } from '../lib/api';

export const AuthModal: React.FC = () => {
  const isOpen = useStore((s) => s.authModalOpen);
  const setOpen = useStore((s) => s.setAuthModalOpen);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [role, setRole] = useState<UserRole>('solo_dev');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mentorPasscode, setMentorPasscode] = useState('SEOS-MENTOR-INVITE-2026');
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
          role,
          join_code: role === 'student' ? joinCode.trim().toUpperCase() : undefined,
          mentor_passcode: role === 'mentor' ? mentorPasscode.trim() : undefined,
        };

        try {
          const newUser = await api.register(payload);
          const tokenData = await api.login({ email: payload.email, password });
          setAuthToken(tokenData.access_token);
          setCurrentUser(newUser);

          setSuccessMsg(`Welcome, ${newUser.name}! Account registered as [${newUser.role.toUpperCase()}].`);
          setTimeout(() => setOpen(false), 1200);
        } catch (regErr: any) {
          if (regErr.message && regErr.message.toLowerCase().includes('already exists')) {
            setMode('login');
            throw new Error("An account with this email address already exists. Please enter your existing password to sign in.");
          }
          throw regErr;
        }
      } else {
        const tokenData = await api.login({ email: email.trim().toLowerCase(), password });
        setAuthToken(tokenData.access_token);
        const me = await api.getMe();
        setCurrentUser(me);

        setSuccessMsg(`Logged in as ${me.name} [${me.role.toUpperCase()}].`);
        setTimeout(() => setOpen(false), 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials or network.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoRole: UserRole) => {
    setError(null);
    setLoading(true);
    const demoCreds = {
      solo_dev: { email: 'demo.solo@seos.dev', pass: 'demo1234', name: 'Dev Solo' },
      student: { email: 'demo.student@seos.dev', pass: 'demo1234', name: 'Demo Student' },
      mentor: { email: 'demo.mentor@seos.dev', pass: 'demo1234', name: 'Prof. Demo Mentor' },
    };

    const target = demoCreds[demoRole];
    try {
      // Try login first
      try {
        const tokenData = await api.login({ email: target.email, password: target.pass });
        setAuthToken(tokenData.access_token);
        const me = await api.getMe();
        setCurrentUser(me);
        setSuccessMsg(`Demo session active: ${me.name} [${me.role.toUpperCase()}]`);
        setTimeout(() => setOpen(false), 800);
        return;
      } catch {
        // If demo user doesn't exist yet, register it
        const newUser = await api.register({
          name: target.name,
          email: target.email,
          password: target.pass,
          role: demoRole,
          mentor_passcode: demoRole === 'mentor' ? 'SEOS-MENTOR-INVITE-2026' : undefined,
        });
        const tokenData = await api.login({ email: target.email, password: target.pass });
        setAuthToken(tokenData.access_token);
        setCurrentUser(newUser);
        setSuccessMsg(`Demo account created: ${newUser.name} [${newUser.role.toUpperCase()}]`);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-seos-surface border border-seos-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl cursor-default"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-seos-border flex items-center justify-between bg-seos-surface-2/40">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-seos-accent font-bold px-2 py-0.5 rounded bg-seos-accent/15 border border-seos-accent/30">
              :: AUTH ::
            </span>
            <span className="text-sm font-semibold text-seos-text">
              {mode === 'register' ? 'Create SEOS Account' : 'Sign In to Workspace'}
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-seos-text-3 hover:text-seos-text font-mono text-sm px-1.5 py-0.5 rounded transition-colors"
          >
            [X]
          </button>
        </div>

        {/* Role Selector Tabs (Registration only) */}
        {mode === 'register' && (
          <div className="p-4 pb-0">
            <div className="text-xs uppercase tracking-wider text-seos-text-3 font-mono mb-2">
              Select Your Role:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('solo_dev')}
                className={`py-2 px-1 text-center font-mono text-xs rounded-lg border transition-all ${
                  role === 'solo_dev'
                    ? 'bg-seos-accent/15 border-seos-accent text-seos-accent font-bold shadow-sm'
                    : 'bg-seos-surface-2/60 border-seos-border text-seos-text-3 hover:text-seos-text'
                }`}
              >
                [SOLO DEV]
                <span className="block text-[10px] text-seos-text-3 font-sans mt-0.5">Build freely</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2 px-1 text-center font-mono text-xs rounded-lg border transition-all ${
                  role === 'student'
                    ? 'bg-seos-accent/15 border-seos-accent text-seos-accent font-bold shadow-sm'
                    : 'bg-seos-surface-2/60 border-seos-border text-seos-text-3 hover:text-seos-text'
                }`}
              >
                [STUDENT]
                <span className="block text-[10px] text-seos-text-3 font-sans mt-0.5">Join course</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('mentor')}
                className={`py-2 px-1 text-center font-mono text-xs rounded-lg border transition-all ${
                  role === 'mentor'
                    ? 'bg-seos-accent/15 border-seos-accent text-seos-accent font-bold shadow-sm'
                    : 'bg-seos-surface-2/60 border-seos-border text-seos-text-3 hover:text-seos-text'
                }`}
              >
                [MENTOR]
                <span className="block text-[10px] text-seos-text-3 font-sans mt-0.5">Audit & code</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-seos-red/15 border border-seos-red/30 text-seos-red text-xs font-mono">
            [ERROR] {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-seos-green/15 border border-seos-green/30 text-seos-green text-xs font-mono">
            [SUCCESS] {successMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono text-seos-text-2 mb-1.5">
                Full Name:
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Harshit Garg"
                className="w-full px-3.5 py-2 rounded-lg bg-seos-surface-2 border border-seos-border text-sm text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-seos-text-2 mb-1.5">
              Email Address:
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dev@thapar.edu"
              className="w-full px-3.5 py-2 rounded-lg bg-seos-surface-2 border border-seos-border text-sm text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-seos-text-2 mb-1.5">
              Password:
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-lg bg-seos-surface-2 border border-seos-border text-sm text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
            />
          </div>

          {/* Join Code (for Student role during registration) */}
          {mode === 'register' && role === 'student' && (
            <div className="p-3 rounded-lg bg-seos-surface-2/70 border border-seos-accent/30">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-seos-accent font-semibold">
                  Course Join Code:
                </label>
                <span className="text-[10px] text-seos-text-3 font-mono">(optional)</span>
              </div>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. SEOS-503L2"
                className="w-full px-3 py-1.5 uppercase font-mono tracking-wider rounded bg-seos-surface border border-seos-border text-sm text-seos-text focus:outline-none focus:border-seos-accent"
              />
              <p className="text-[11px] text-seos-text-3 mt-1.5">
                Provided by your course faculty/mentor. You can also join a classroom later in Settings.
              </p>
            </div>
          )}

          {/* Mentor Verification Key (for Mentor role during registration) */}
          {mode === 'register' && role === 'mentor' && (
            <div className="p-3 rounded-lg bg-seos-surface-2/70 border border-seos-accent/30">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-seos-accent font-semibold">
                  Institutional Mentor Key:
                </label>
                <span className="text-[10px] text-seos-accent font-mono font-bold">[REQUIRED]</span>
              </div>
              <input
                type="password"
                required
                value={mentorPasscode}
                onChange={(e) => setMentorPasscode(e.target.value)}
                placeholder="SEOS-MENTOR-INVITE-2026"
                className="w-full px-3 py-1.5 font-mono tracking-wider rounded bg-seos-surface border border-seos-border text-sm text-seos-text focus:outline-none focus:border-seos-accent"
              />
              <p className="text-[11px] text-seos-text-3 mt-1.5">
                Required institutional secret to provision faculty privileges and prevent privilege escalation.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-seos-accent text-seos-bg font-mono font-semibold text-xs tracking-wider uppercase shadow-md hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : mode === 'register' ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </button>

          <div className="text-center pt-2 border-t border-seos-border/50">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-seos-text-3 hover:text-seos-accent font-mono transition-colors"
            >
              {mode === 'register'
                ? 'Already have an account? Sign in →'
                : 'Need a new account? Register here →'}
            </button>
          </div>

          {/* Quick Evaluation Demo Buttons */}
          <div className="pt-3 border-t border-seos-border/40">
            <div className="text-[10px] uppercase font-mono text-seos-text-3 text-center mb-2">
              ⚡ Instant 1-Click Evaluation Login:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('solo_dev')}
                className="py-1 px-1.5 text-center font-mono text-[10px] rounded border border-seos-border bg-seos-surface-2 hover:border-seos-accent/50 text-seos-text-2 hover:text-seos-text transition-colors"
              >
                Solo Dev
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('student')}
                className="py-1 px-1.5 text-center font-mono text-[10px] rounded border border-seos-border bg-seos-surface-2 hover:border-seos-accent/50 text-seos-text-2 hover:text-seos-text transition-colors"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('mentor')}
                className="py-1 px-1.5 text-center font-mono text-[10px] rounded border border-seos-border bg-seos-surface-2 hover:border-seos-accent/50 text-seos-text-2 hover:text-seos-text transition-colors"
              >
                Mentor
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AuthModal;
