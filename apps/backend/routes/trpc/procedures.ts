import { t } from './init';
import { isAuthed, timeProcedure, updateAiTrace } from './middleware';

/** Our base procedure (just tracks invocation times for now) */
export const baseProcedure = t.procedure.use(timeProcedure).use(updateAiTrace);

/** Procedure that doesn't require the user to be logged in */
export const publicProcedure = baseProcedure;

/** Procedure that requires the user to be logged in */
export const protectedProcedure = baseProcedure.use(isAuthed);
