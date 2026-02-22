import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@widget-creator/shared/db';
import type { AdminUser } from '../_lib/middleware/auth.js';

export interface Session {
  user: AdminUser;
}

export interface Context {
  session: Session | null;
  db: typeof db;
  user: AdminUser | null;
}

/**
 * Create tRPC context from incoming request.
 * Integrates NextAuth.js v5 session and Drizzle DB instance.
 */
export async function createContext(
  _opts: FetchCreateContextFnOptions,
): Promise<Context> {
  let session: Session | null = null;

  try {
    const { auth } = await import('../../../../auth.js');
    const authSession = await auth();
    if (authSession?.user) {
      session = {
        user: {
          id: authSession.user.id as string,
          email: authSession.user.email as string,
          role: ((authSession.user as Record<string, unknown>).role as AdminUser['role']) || 'VIEWER',
        },
      };
    }
  } catch {
    // Auth not configured yet - session remains null
  }

  return {
    session,
    db,
    user: session?.user ?? null,
  };
}
