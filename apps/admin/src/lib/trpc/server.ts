import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * tRPC server context.
 * Provides session and database access to all procedures.
 */
export async function createContext() {
  const session = await auth();
  return { session, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Protected procedure middleware.
 * Ensures user is authenticated before allowing access (REQ-N-005).
 */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
