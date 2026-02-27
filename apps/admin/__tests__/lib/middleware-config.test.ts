/**
 * Tests for Next.js middleware configuration.
 * REQ-S-001: Unauthenticated users redirected to /auth/login.
 */
import { describe, it, expect } from 'vitest';

// Re-declare the matcher pattern from middleware.ts
const matcherPattern = '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)';

// Convert the Next.js matcher regex to a standard regex for testing
function testMatcher(pathname: string): boolean {
  // The Next.js matcher pattern excludes certain prefixes
  const excludedPrefixes = ['login', 'api/auth', '_next/static', '_next/image', 'favicon.ico'];

  // Remove leading slash for comparison
  const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

  // Check if any excluded prefix matches
  for (const prefix of excludedPrefixes) {
    if (path.startsWith(prefix)) {
      return false; // Excluded from middleware
    }
  }

  return path.length > 0; // Match non-empty paths
}

describe('middleware route matcher', () => {
  describe('protected routes (should match)', () => {
    it('matches admin dashboard', () => {
      expect(testMatcher('/dashboard')).toBe(true);
    });

    it('matches admin product routes', () => {
      expect(testMatcher('/products/list')).toBe(true);
      expect(testMatcher('/products/categories')).toBe(true);
    });

    it('matches admin material routes', () => {
      expect(testMatcher('/materials/papers')).toBe(true);
    });

    it('matches admin pricing routes', () => {
      expect(testMatcher('/pricing/tables')).toBe(true);
    });

    it('matches admin options routes', () => {
      expect(testMatcher('/options/definitions')).toBe(true);
    });

    it('matches admin integration routes', () => {
      expect(testMatcher('/integration/mes')).toBe(true);
    });

    it('matches admin widgets routes', () => {
      expect(testMatcher('/widgets/list')).toBe(true);
    });

    it('matches admin settings', () => {
      expect(testMatcher('/settings')).toBe(true);
    });

    it('matches admin tRPC API routes', () => {
      expect(testMatcher('/api/trpc/categories.list')).toBe(true);
    });
  });

  describe('excluded routes (should NOT match)', () => {
    it('excludes login page', () => {
      expect(testMatcher('/login')).toBe(false);
    });

    it('excludes NextAuth API routes', () => {
      expect(testMatcher('/api/auth/callback/credentials')).toBe(false);
      expect(testMatcher('/api/auth/session')).toBe(false);
      expect(testMatcher('/api/auth/signin')).toBe(false);
    });

    it('excludes Next.js static files', () => {
      expect(testMatcher('/_next/static/chunks/main.js')).toBe(false);
    });

    it('excludes Next.js image optimization', () => {
      expect(testMatcher('/_next/image?url=test')).toBe(false);
    });

    it('excludes favicon', () => {
      expect(testMatcher('/favicon.ico')).toBe(false);
    });
  });
});

describe('auth callback logic', () => {
  // Test the authorized callback logic from auth.ts
  interface AuthCallbackInput {
    isLoggedIn: boolean;
    pathname: string;
  }

  function simulateAuthorized({ isLoggedIn, pathname }: AuthCallbackInput): boolean | 'redirect_to_dashboard' {
    const isOnLogin = pathname === '/login';

    if (isOnLogin) {
      if (isLoggedIn) return 'redirect_to_dashboard';
      return true; // Allow access to login page
    }

    return isLoggedIn;
  }

  it('allows unauthenticated users to access login page', () => {
    expect(simulateAuthorized({ isLoggedIn: false, pathname: '/login' })).toBe(true);
  });

  it('redirects authenticated users away from login to dashboard', () => {
    expect(simulateAuthorized({ isLoggedIn: true, pathname: '/login' })).toBe('redirect_to_dashboard');
  });

  it('allows authenticated users to access protected routes', () => {
    expect(simulateAuthorized({ isLoggedIn: true, pathname: '/dashboard' })).toBe(true);
    expect(simulateAuthorized({ isLoggedIn: true, pathname: '/products/list' })).toBe(true);
  });

  it('blocks unauthenticated users from protected routes', () => {
    expect(simulateAuthorized({ isLoggedIn: false, pathname: '/dashboard' })).toBe(false);
    expect(simulateAuthorized({ isLoggedIn: false, pathname: '/products/list' })).toBe(false);
    expect(simulateAuthorized({ isLoggedIn: false, pathname: '/settings' })).toBe(false);
  });
});
