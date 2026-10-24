import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import { config } from '@repo/config';

import type { AppRouter } from '../../backend/api/routes';

/** oRPC link configured to communicate with our backend (no session, this site is public) */
const link = new RPCLink({
  url: `${config.api.url}/rpc`,
});

/** Typed oRPC client for the (public) backend endpoints this site calls */
export const api: RouterClient<AppRouter> = createORPCClient(link);
