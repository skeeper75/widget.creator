export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    // Protect all routes except login, api/auth, static files, and _next
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
