import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context.js';

/**
 * tRPC initialization for the Widget Creator Admin API.
 * Uses superjson for Date/BigInt serialization.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Router factory.
 */
export const router = t.router;

/**
 * Public procedure - no auth required.
 * Used for read-only list/getById operations.
 */
export const publicProcedure = t.procedure;

/**
 * Auth middleware - requires valid admin session.
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin authentication required' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});

/**
 * Protected procedure - requires authenticated admin user.
 */
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Role-restricted middleware factory.
 */
export function withRole(...roles: ('ADMIN' | 'MANAGER' | 'VIEWER')[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin authentication required' });
    }
    const userRole = ctx.session.user.role;
    if (!roles.includes(userRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Role '${userRole}' does not have access. Required: ${roles.join(', ')}`,
      });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.session.user,
      },
    });
  });
}

export { t };
