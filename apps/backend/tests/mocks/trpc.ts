import { router } from '@/routes';
import { Context } from '@/routes/trpc/context';

/** The test-based tRPC handler */
export const trpc = router.createCaller({} as Context);
