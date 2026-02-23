import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        // Simple credentials check against env vars for admin access
        if (
          email === process.env.ADMIN_EMAIL &&
          password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: '1',
            name: 'Admin',
            email,
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isOnLogin = nextUrl.pathname === '/login';

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
});
