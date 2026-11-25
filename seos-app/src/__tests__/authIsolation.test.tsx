import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthModal from '../components/AuthModal';
import { api, getAuthToken, setAuthToken } from '../lib/api';
import { exportProjectAsPDF } from '../lib/exportUtils';
import { useStore } from '../store';

function setControlledInput(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Cross-Account & Session Isolation', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    sessionStorage.clear();
    setAuthToken(null);
    useStore.getState().resetProject();
    useStore.setState({ currentUser: null, authModalOpen: false });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    container?.remove();
    container = null;
    vi.restoreAllMocks();
  });

  it('wipes active project artifacts and auth state on logout', () => {
    setAuthToken('jwt-user-a-token');
    useStore.setState({
      currentUser: {
        id: 'user-a',
        name: 'Audit User A',
        email: 'usera@example.com',
        role: 'solo_dev',
        created_at: '2026-11-25T10:00:00Z',
      },
      projectName: 'FoodDash',
      productIdea: 'On-demand delivery platform',
      requirements: [
        { id: 'REQ-01', type: 'Functional', priority: 'High', description: 'Cart checkout', status: 'approved' },
      ],
      userStories: [
        { id: 'US-01', role: 'Customer', action: 'checkout', benefit: 'receive order', criteria: ['total > 0'], status: 'approved', reqId: 'REQ-01' },
      ],
      umlNodes: [{ id: 'n1', name: 'Order', type: 'entity', x: 0, y: 0, fields: [{ name: 'id', type: 'UUID', pk: true }] }],
      umlEdges: [{ id: 'e1', from: 'n1', to: 'n1', label: '1:N' }],
      openapiYaml: 'openapi: "3.1.0"',
      docs: [{ id: 'srs', title: 'SRS', type: 'SRS', content: '# FoodDash' }],
    });

    useStore.getState().logout();

    const state = useStore.getState();
    expect(getAuthToken()).toBeNull();
    expect(localStorage.getItem('seos_auth_token')).toBeNull();
    expect(state.currentUser).toBeNull();
    expect(state.projectName).toBe('New Project');
    expect(state.productIdea).toBe('');
    expect(state.requirements).toEqual([]);
    expect(state.userStories).toEqual([]);
    expect(state.umlNodes).toEqual([]);
    expect(state.umlEdges).toEqual([]);
    expect(state.openapiYaml).toBe('');
    expect(state.docs).toEqual([]);
  });

  it('clears prior user inputs and banners when AuthModal closes and reopens, with proper form labels', async () => {
    vi.spyOn(api, 'register').mockResolvedValue({
      id: 'u-1',
      name: 'Audit User A',
      email: 'usera@test.dev',
      role: 'solo_dev',
      created_at: '2026-11-25T10:00:00Z',
    });
    vi.spyOn(api, 'login').mockResolvedValue({
      access_token: 'tok-user-a',
      token_type: 'bearer',
      role: 'solo_dev',
      name: 'Audit User A',
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useStore.getState().setAuthModalOpen(true);
    await act(async () => {
      root?.render(<AuthModal />);
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    const nameInput = container.querySelector('#auth-name') as HTMLInputElement;
    const emailInput = container.querySelector('#auth-email') as HTMLInputElement;
    const passInput = container.querySelector('#auth-password') as HTMLInputElement;
    expect(container.querySelector('label[for="auth-name"]')).not.toBeNull();
    expect(container.querySelector('label[for="auth-email"]')).not.toBeNull();
    expect(container.querySelector('label[for="auth-password"]')).not.toBeNull();

    await act(async () => {
      setControlledInput(nameInput, 'Audit User A');
      setControlledInput(emailInput, 'usera@test.dev');
      setControlledInput(passInput, 'Password123!');
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Welcome, Audit User A! Account registered.');

    // Close modal -> sign out -> reopen modal
    await act(async () => {
      useStore.getState().setAuthModalOpen(false);
    });
    useStore.getState().logout();
    await act(async () => {
      useStore.getState().setAuthModalOpen(true);
    });

    expect(container.textContent).not.toContain('Welcome, Audit User A!');
    expect((container.querySelector('#auth-name') as HTMLInputElement).value).toBe('');
    expect((container.querySelector('#auth-email') as HTMLInputElement).value).toBe('');
    expect((container.querySelector('#auth-password') as HTMLInputElement).value).toBe('');
  });

  it('auto-closes AuthModal after registration and demo login even across parent re-renders', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(api, 'register').mockImplementation(async (payload) => ({
        id: `id-${payload.email}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        created_at: '2026-11-25T10:00:00Z',
      }));
      vi.spyOn(api, 'login').mockResolvedValue({
        access_token: 'demo-jwt',
        token_type: 'bearer',
        role: 'solo_dev',
        name: 'Demo Engineer',
      });

      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);

      useStore.getState().setAuthModalOpen(true);
      await act(async () => {
        root?.render(<AuthModal />);
      });

      const demoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('[SIGN IN AS DEMO DEVELOPER]')
      );
      await act(async () => {
        demoBtn?.click();
      });

      // Simulate parent re-render right after auth state updates
      await act(async () => {
        root?.render(<AuthModal />);
      });
      expect(useStore.getState().authModalOpen).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(900);
      });
      expect(useStore.getState().authModalOpen).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('provisions isolated ephemeral demo users instead of shared demo.developer@seos.dev', async () => {
    const registerSpy = vi.spyOn(api, 'register').mockImplementation(async (payload) => ({
      id: `demo-${payload.email}`,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      created_at: '2026-11-25T10:00:00Z',
    }));
    const loginSpy = vi.spyOn(api, 'login').mockResolvedValue({
      access_token: 'demo-jwt',
      token_type: 'bearer',
      role: 'solo_dev',
      name: 'Demo Engineer',
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useStore.getState().setAuthModalOpen(true);
    await act(async () => {
      root?.render(<AuthModal />);
    });

    const demoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('[SIGN IN AS DEMO DEVELOPER]')
    );
    expect(demoBtn).toBeDefined();

    await act(async () => {
      demoBtn?.click();
    });

    expect(registerSpy).toHaveBeenCalledTimes(1);
    const registeredPayload = registerSpy.mock.calls[0][0];
    expect(registeredPayload.email).toMatch(/^demo\.[a-z0-9]+-[a-z0-9]+@seos\.dev$/);
    expect(registeredPayload.email).not.toBe('demo.developer@seos.dev');
    expect(loginSpy).toHaveBeenCalledWith({
      email: registeredPayload.email,
      password: registeredPayload.password,
    });
  });

  it('escapes HTML and avoids inline scripts in exportProjectAsPDF', () => {
    let writtenHtml = '';
    const fakePopup = {
      document: {
        write: vi.fn((html: string) => {
          writtenHtml = html;
        }),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
      onafterprint: null as (() => void) | null,
    };
    vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window);

    useStore.getState().setProjectName('<script>alert(1)</script>');
    useStore.getState().setProductIdea('Idea with <img src=x onerror=alert(2)>');

    exportProjectAsPDF();

    expect(writtenHtml).not.toContain('<script>');
    expect(writtenHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(writtenHtml).toContain('&lt;img src=x onerror=alert(2)&gt;');
    expect(fakePopup.document.close).toHaveBeenCalledTimes(1);
    expect(fakePopup.print).toHaveBeenCalledTimes(1);
  });
});
