import { Api } from 'sst/node/api';
import { NextjsSite } from 'sst/node/site';

/**
 * A reference to the resources deployed by SST and their associated parameters.
 *
 * _Types will error until `sst dev` or `sst deploy` generates them._
 */
export const resources = {
  api: Api.api,
  web: NextjsSite.web,
  docs: NextjsSite.docs,
} as const;
