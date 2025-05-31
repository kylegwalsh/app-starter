import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from '../../backend/routes';

export const trpc = createTRPCReact<AppRouter>();
