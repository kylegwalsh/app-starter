import { router } from "../routes";
import { createContext } from "../routes/trpc/context";
import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";

/** The main entry point for the backend APIs */
export const handler = awsLambdaRequestHandler({
  router,
  createContext,

  // Whenever an unhandled error occurs, report it
  onError: ({ error, ctx, ...other }) => {
    // Ignore UNAUTHORIZED errors (not very important and can occur in a few scenarios)
    if (error.code !== "UNAUTHORIZED") {
      /** Extract the underlying error */
      const rootError = error?.cause ?? error;

      console.error(rootError);
    }
  },
});
