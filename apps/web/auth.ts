import NextAuth from 'next-auth';

/**
 * NextAuth.js v5 configuration stub.
 * Admin authentication is configured here.
 * Providers and adapter should be added when admin auth is fully set up.
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [],
});
