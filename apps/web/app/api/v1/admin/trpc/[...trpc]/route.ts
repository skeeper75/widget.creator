import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../trpc/router.js';
import { createContext } from '../../../../trpc/context.js';

/**
 * tRPC catch-all handler for Admin API (REQ-040).
 * Mounted at /api/v1/admin/trpc/*
 */
async function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/v1/admin/trpc',
    req,
    router: appRouter,
    createContext,
  });
}

export { handler as GET, handler as POST };
