import { Config } from 'sst/node/config';

/** Defines environment variables from SST secrets */
export const env = {
  ...Config,
};
