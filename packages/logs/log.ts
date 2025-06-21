import { config } from '@repo/config';
import pino from 'pino';
import {
  GlobalContextStorageProvider,
  lambdaRequestTracker,
  pinoLambdaDestination,
} from 'pino-lambda';
import pretty from 'pino-pretty';

/** Whether we're running in an AWS deployment */
const IS_AWS = !!(process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV);

// ---------- DESTINATIONS ----------
/** Our lambda destination (ensures things are formatted for cloudwatch) */
const lambdaDest = pinoLambdaDestination();
/** Our pretty destination (ensures things are formatted for the console) */
const prettyDest = pretty({
  colorize: true,
  translateTime: 'SYS:HH:mm:ss',
  // Ignore some params that we don't care about locally
  ignore: 'env,userId,trpc,awsRequestId,apiRequestId,x-correlation-id',
});
// Note: Better Stack logging is managed by the lambda layer in sst.config.ts

// ---------- HELPERS ----------
/** Adds lambda request context to the current request context */
export const addLambdaRequestContext = lambdaRequestTracker();

/** Gets the current request context */
export const getLogMetadata = () => {
  return { ...GlobalContextStorageProvider.getContext() };
};

/** Adds metadata to the current request context */
export const addLogMetadata = (metadata: Record<string, unknown>) => {
  GlobalContextStorageProvider.updateContext(metadata);
};

// ---------- PINO ----------
/** Create a custom destination that handles all our destinations */
const customDestination = {
  write: (payload: string) => {
    try {
      // If we're running in AWS, we should structure the logs for cloudwatch
      if (IS_AWS) lambdaDest.write(payload);
      // If we're running locally, show the pretty output
      else prettyDest.write(payload);
    } catch (error) {
      console.error('[log] Failed to handle log:', error);
    }
  },
};

// Create our logging instance
export const log = pino(
  {
    // Ensure we handle levels the way that Better Stack expects
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    // Attach any global context variables
    base: {
      env: config.stage,
    },
    // Add any additional global context into our logs
    mixin: () => {
      return getLogMetadata();
    },
  },
  customDestination
);
