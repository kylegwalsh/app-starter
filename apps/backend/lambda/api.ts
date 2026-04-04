import { handle } from 'hono/aws-lambda';

import { app } from '@/api';
import { withLambdaContext } from '@/core';

/** The main entry point for all API routes */
export const handler = withLambdaContext<'api'>(handle(app));
