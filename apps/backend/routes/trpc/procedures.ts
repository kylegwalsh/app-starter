import { t } from './init';
import { isAuthed, timeProcedure } from './middleware';

/** Our base procedure (just tracks invocation times for now) */
export const baseProcedure = t.procedure.use(timeProcedure);

/** Procedure that doesn't require the user to be logged in */
export const publicProcedure = baseProcedure;

/** Procedure that requires the user to be logged in */
export const protectedProcedure = baseProcedure.use(isAuthed);
