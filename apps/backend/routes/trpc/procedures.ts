import { t } from "./init";
import { timeProcedure } from "./middleware";

/** Our base procedure (just tracks invocation times for now) */
export const baseProcedure = t.procedure.use(timeProcedure);

/** Don't require the user to be logged in */
export const publicProcedure = baseProcedure;
