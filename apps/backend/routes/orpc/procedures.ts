import { ORPCError } from '@orpc/server';

import { base } from './base';
import { withAuth } from './context';
import { timeProcedure, updateAiTrace } from './middleware';

/** Our base procedure (tracks invocation times and AI traces) */
const baseProcedure = base.use(withAuth).use(timeProcedure).use(updateAiTrace);

/** Procedure that doesn't require the user to be logged in */
export const publicProcedure = baseProcedure;

/** Procedure that requires the user to be logged in */
export const protectedProcedure = baseProcedure.use(({ context, next }) => {
  if (!(context.user && context.organization)) {
    throw new ORPCError('UNAUTHORIZED');
  }

  return next({
    context: {
      user: context.user,
      organization: context.organization,
    },
  });
});
