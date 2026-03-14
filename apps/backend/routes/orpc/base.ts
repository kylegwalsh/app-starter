import { os } from '@orpc/server';

/** Initial context type — provided by the handler at request time */
export type InitialContext = {
  headers: Headers;
};

/** Base oRPC builder with initial context */
export const base = os.$context<InitialContext>();
